import 'dotenv/config';
import prisma from './prisma.js';

// In-memory token cache
let cachedToken: string | null = null;
let cachedTokenExpiry: number | null = null;
let cachedOwnerId: string | null = null;

// In-memory vehicle overview cache (TTL: 65 seconds to satisfy 5 attempts per 5 minutes)
let cachedDevices: any[] | null = null;
let cachedDevicesTime = 0;
const DEVICES_CACHE_TTL = 65000; // 65 seconds

// In-memory single device detail cache (TTL: 30 seconds to prevent rate-limiting)
let cachedDeviceDetails: Record<string, { data: any, timestamp: number }> = {};
const DETAIL_CACHE_TTL = 30000; // 30 seconds

// Failure cache state (to prevent spamming vendor API during rate-limits/blocks)
let lastLoginError: string | null = null;
let lastLoginErrorTime = 0;
const FAILURE_CACHE_TTL = 300000; // 5 minutes failure cache (300 seconds)

// Local login rate-limit state (Cooldown: 125 seconds to satisfy 5 attempts per 10 minutes)
let lastLoginAttemptTime = 0;
const LOGIN_COOLDOWN_MS = 125000; // 125 seconds cooldown

// Helper to decode JWT payload without external library
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1]!, 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Gets valid GPS.id Porta M20 credentials (token and owner id).
 * It will try to use the in-memory cache, then the database setting,
 * and if expired or not found, it will authenticate with the GPS.id API.
 */
export async function getGPSIDCredentials(forceRefresh = false): Promise<{ token: string; id: string }> {
  const now = Date.now();

  // 1. Try to use in-memory cached credentials if valid
  if (!forceRefresh && cachedToken && cachedOwnerId && cachedTokenExpiry && cachedTokenExpiry > now + 60000) {
    return { token: cachedToken, id: cachedOwnerId };
  }

  // 2. Try to fetch from database SystemSetting if in-memory cache is empty
  if (!forceRefresh && (!cachedToken || !cachedOwnerId)) {
    try {
      const dbTokenSetting = await prisma.systemSetting.findUnique({
        where: { key: 'gpsid_porta_token' }
      });
      const dbOwnerSetting = await prisma.systemSetting.findUnique({
        where: { key: 'gpsid_porta_owner_id' }
      });

      if (dbTokenSetting && dbTokenSetting.value) {
        const token = dbTokenSetting.value;
        const decoded = decodeJWT(token);
        if (decoded && decoded.exp) {
          const expiryMs = decoded.exp * 1000;
          if (expiryMs > now + 60000) {
            cachedToken = token;
            cachedTokenExpiry = expiryMs;
            cachedOwnerId = dbOwnerSetting?.value || '';
            console.log('GPS.id credentials retrieved from database cache and are valid.');
            return { token: cachedToken, id: cachedOwnerId };
          }
        }
      }
    } catch (dbError) {
      console.error('Error fetching GPS.id credentials from database:', dbError);
    }
  }

  // 3. Failure cache guard: If we recently got rate-limited (429) or failed, cache that error for 5 mins
  const nowMs = Date.now();
  if (lastLoginError && (nowMs - lastLoginErrorTime < FAILURE_CACHE_TTL)) {
    const remainingSeconds = Math.ceil((FAILURE_CACHE_TTL - (nowMs - lastLoginErrorTime)) / 1000);
    console.warn(`[GPS.id Guard] Failure cache active. Returning cached error to prevent spamming vendor. Sisa waktu: ${remainingSeconds}s.`);

    if (lastLoginError.includes('429')) {
      throw new Error(`[Rate Limit Vendor] Akun Anda sedang ditangguhkan sementara oleh vendor (Error 429). Untuk mencegah perpanjangan blokir, server menolak panggilan selama ${remainingSeconds} detik lagi.`);
    } else {
      throw new Error(`[Autentikasi Gagal] Percobaan login sebelumnya gagal. Menunggu cooldown error selama ${remainingSeconds} detik.`);
    }
  }

  // 4. Rate-limit cooldown guard (125 seconds)
  const timeSinceLastAttempt = nowMs - lastLoginAttemptTime;
  if (timeSinceLastAttempt < LOGIN_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((LOGIN_COOLDOWN_MS - timeSinceLastAttempt) / 1000);
    console.warn(`GPS.id login attempt rate-limited locally. Cooldown active. Waiting ${waitSeconds}s.`);
    throw new Error(`Login cooldown aktif (Aturan Vendor: Maksimal 5x login per 10 menit). Silakan tunggu ${waitSeconds} detik sebelum mencoba menghubungkan ulang.`);
  }

  // Record login attempt timestamp
  lastLoginAttemptTime = nowMs;

  // 5. Authenticate with the GPS.id vendor API
  console.log('Authenticating with GPS.id API (Username: barbarafarm)...');
  try {
    const response = await fetch('https://portal.gps.id/backend/seen/public/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: 'barbarafarm',
        password: 'GPSid789'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Cache this failed login attempt
      lastLoginError = `${response.status} - ${errorText}`;
      lastLoginErrorTime = Date.now();
      throw new Error(`GPS.id authentication failed: ${response.status} - ${errorText}`);
    }

    const result: any = await response.json();
    if (!result.status || !result.message?.data?.token) {
      // Cache this malformed response as a failure
      lastLoginError = `Invalid response format: ${JSON.stringify(result)}`;
      lastLoginErrorTime = Date.now();
      throw new Error(`GPS.id authentication response format is invalid: ${JSON.stringify(result)}`);
    }

    const token = result.message.data.token;
    const decoded = decodeJWT(token);
    const ownerId = String(result.message.data.id || result.message.data.owner_id || result.message.data.user_id || (decoded ? decoded.sub : '') || '');

    // Clear any active failure cache on success
    lastLoginError = null;
    lastLoginErrorTime = 0;

    // Set in-memory cache
    cachedToken = token;
    cachedOwnerId = ownerId;
    if (decoded && decoded.exp) {
      cachedTokenExpiry = decoded.exp * 1000;
    } else {
      cachedTokenExpiry = now + 3600 * 1000;
    }

    // Save/Upsert to database SystemSetting for persistence
    try {
      await prisma.systemSetting.upsert({
        where: { key: 'gpsid_porta_token' },
        update: { value: token },
        create: { key: 'gpsid_porta_token', value: token }
      });
      await prisma.systemSetting.upsert({
        where: { key: 'gpsid_porta_owner_id' },
        update: { value: ownerId },
        create: { key: 'gpsid_porta_owner_id', value: ownerId }
      });
      console.log('Successfully updated GPS.id credentials in database.');
    } catch (dbError) {
      console.error('Failed to save GPS.id credentials to database:', dbError);
    }

    return { token, id: ownerId };
  } catch (error: any) {
    // Ensure the error details are cached as a login failure to prevent further hits
    lastLoginError = error.message || String(error);
    lastLoginErrorTime = Date.now();
    console.error('Failed to authenticate with GPS.id:', error);
    throw error;
  }
}

/**
 * Fetch all GPS devices/vehicles registered under the GPS.id account,
 * adhering to the rate limit of 5 attempts per 5 minutes using a 65s in-memory cache.
 */
export async function getGPSIDDevicesFromVendor(forceRefresh = false): Promise<any[]> {
  const now = Date.now();

  // 1. Check in-memory cache (TTL: 65 seconds) to comply with rate limits
  if (!forceRefresh && cachedDevices && (now - cachedDevicesTime < DEVICES_CACHE_TTL)) {
    console.log('Returning cached GPS devices to respect rate limit (5 attempts per 5 minutes)');
    return cachedDevices!;
  }

  // 2. Fetch fresh credentials
  const { token, id } = await getGPSIDCredentials(forceRefresh);

  console.log(`Fetching devices from GPS.id (Owner ID: ${id})...`);

  const url = `https://portal.gps.id/backend/seen/public/vehicle?id=${id}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'id': id,
      'X-ID': id,
      'Accept': 'application/json'
    }
  });

  if (response.status === 401) {
    console.warn("Unauthorized (401) received from GPS.id. Force refreshing credentials...");
    const { token: newToken, id: newId } = await getGPSIDCredentials(true);

    const retryUrl = `https://portal.gps.id/backend/seen/public/vehicle?id=${newId}`;
    const retryResponse = await fetch(retryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'id': newId,
        'X-ID': newId,
        'Accept': 'application/json'
      }
    });

    if (!retryResponse.ok) {
      const errorText = await retryResponse.text();
      throw new Error(`Failed to fetch vehicles from GPS.id on retry: ${retryResponse.status} - ${errorText}`);
    }

    const result = await retryResponse.json() as any;
    if (result.status && result.message?.data) {
      cachedDevices = result.message.data;
      cachedDevicesTime = Date.now();
      return cachedDevices!;
    }
    throw new Error(`Invalid response format from GPS.id retry: ${JSON.stringify(result)}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch vehicles from GPS.id: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as any;
  if (result.status && result.message?.data) {
    cachedDevices = result.message.data;
    cachedDevicesTime = Date.now();
    return cachedDevices!;
  }

  throw new Error(`Invalid response format from GPS.id: ${JSON.stringify(result)}`);
}

/**
 * Fetch a single GPS device detail from the GPS.id vendor API by IMEI.
 */
export async function getGPSIDDeviceDetailFromVendor(imei: string, forceRefresh = false): Promise<any> {
  // Check in-memory cache first if not forced
  if (!forceRefresh && cachedDeviceDetails[imei]) {
    const cached = cachedDeviceDetails[imei]!;
    if (Date.now() - cached.timestamp < DETAIL_CACHE_TTL) {
      console.log(`Returning cached GPS.id detail for IMEI: ${imei} (Age: ${Math.round((Date.now() - cached.timestamp)/1000)}s)`);
      return cached.data;
    }
  }

  const { token, id } = await getGPSIDCredentials(forceRefresh);

  console.log(`Fetching device detail for IMEI: ${imei} from GPS.id (Owner: ${id})...`);

  const url = `https://portal.gps.id/backend/seen/public/vehicle/detail/${imei}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'id': id,
      'X-ID': id,
      'Accept': 'application/json'
    }
  });

  if (response.status === 401) {
    console.warn("Unauthorized (401) received from GPS.id on detail fetch. Force refreshing credentials...");
    const { token: newToken, id: newId } = await getGPSIDCredentials(true);

    const retryUrl = `https://portal.gps.id/backend/seen/public/vehicle/detail/${imei}`;
    const retryResponse = await fetch(retryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'id': newId,
        'X-ID': newId,
        'Accept': 'application/json'
      }
    });

    if (!retryResponse.ok) {
      const errorText = await retryResponse.text();
      throw new Error(`Failed to fetch vehicle detail from GPS.id on retry: ${retryResponse.status} - ${errorText}`);
    }

    const result = await retryResponse.json() as any;
    if (result.status && result.message?.data) {
      // Store in cache
      cachedDeviceDetails[imei] = { data: result.message.data, timestamp: Date.now() };
      return result.message.data;
    }
    throw new Error(`Invalid response format from GPS.id retry: ${JSON.stringify(result)}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch vehicle detail from GPS.id: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as any;
  if (result.status && result.message?.data) {
    // Store in cache
    cachedDeviceDetails[imei] = { data: result.message.data, timestamp: Date.now() };
    return result.message.data;
  }

  throw new Error(`Invalid response format from GPS.id: ${JSON.stringify(result)}`);
}

