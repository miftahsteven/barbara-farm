import type { Request, Response } from 'express';
import { getGPSIDCredentials, getGPSIDDevicesFromVendor, getGPSIDDeviceDetailFromVendor } from '../lib/gpsid.js';

/**
 * Endpoint to test authentication and get the GPS.id credentials.
 * Adheres to login cooldown limits (5 attempts per 10 minutes).
 */
export const checkGPSIDAuth = async (req: Request, res: Response) => {
  try {
    const { token, id } = await getGPSIDCredentials(false);
    
    // Decode token payload
    const parts = token.split('.');
    let tokenPayload = null;
    if (parts.length === 3) {
      tokenPayload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString('utf-8'));
    }

    return res.json({
      success: true,
      message: 'Koneksi ke GPS.id API berhasil!',
      data: {
        token: token,
        id: id,
        expiresAt: tokenPayload?.exp ? new Date(tokenPayload.exp * 1000).toISOString() : null,
        payload: tokenPayload
      }
    });
  } catch (error: any) {
    console.error('Error checking GPS.id Auth:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal melakukan autentikasi ke GPS.id API',
      error: error.message || error
    });
  }
};

/**
 * Endpoint to force-refresh the GPS.id authentication credentials.
 * Adheres to login cooldown limits.
 */
export const refreshGPSIDAuth = async (req: Request, res: Response) => {
  try {
    const { token, id } = await getGPSIDCredentials(true);
    
    const parts = token.split('.');
    let tokenPayload = null;
    if (parts.length === 3) {
      tokenPayload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString('utf-8'));
    }

    return res.json({
      success: true,
      message: 'Token GPS.id berhasil diperbarui secara manual!',
      data: {
        token: token,
        id: id,
        expiresAt: tokenPayload?.exp ? new Date(tokenPayload.exp * 1000).toISOString() : null
      }
    });
  } catch (error: any) {
    console.error('Error refreshing GPS.id Auth:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui token GPS.id API',
      error: error.message || error
    });
  }
};

/**
 * Fetch all GPS devices/vehicles registered under the GPS.id account.
 * Adheres to the 5 attempts per 5 minutes rate limit by using the 65s in-memory cache.
 */
export const getGPSIDDevices = async (req: Request, res: Response) => {
  try {
    const devices = await getGPSIDDevicesFromVendor(false);
    
    // Return standard response structure that matches frontend expects
    return res.json({
      status: true,
      message: {
        total: devices.length,
        data: devices
      }
    });
  } catch (error: any) {
    console.error('Error fetching GPS.id devices:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data perangkat dari GPS.id',
      error: error.message || error
    });
  }
};

/**
 * Fetch a single GPS device detail from GPS.id by its IMEI.
 */
export const getGPSIDDeviceDetail = async (req: Request, res: Response) => {
  try {
    const imei = req.params.imei as string;
    if (!imei) {
      return res.status(400).json({ success: false, message: 'IMEI parameter is required' });
    }

    const deviceDetail = await getGPSIDDeviceDetailFromVendor(imei, false);
    
    return res.json({
      status: true,
      message: {
        data: deviceDetail
      }
    });
  } catch (error: any) {
    console.error(`Error fetching GPS.id device detail for ${req.params.imei}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail perangkat dari GPS.id',
      error: error.message || error
    });
  }
};
