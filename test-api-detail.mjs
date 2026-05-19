import 'dotenv/config';
import jwt from 'jsonwebtoken';

async function testEndpoint() {
  const secret = process.env.JWT_SECRET || 'your_super_secret_key';
  const testToken = jwt.sign({ userId: 'test-user-id', role: 'admin' }, secret, { expiresIn: '1h' });

  const imei = '353549093255916';
  const url = `http://localhost:3001/api/gps/gpsid/devices/${imei}`;

  console.log(`Testing GET ${url} with local generated JWT token...`);

  try {
    console.log("\n>>> Call 1: Fetching (should fetch from vendor)...");
    const response1 = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Call 1 Status: ${response1.status}`);
    const data1 = await response1.json();
    console.log(`Call 1 Latitude: ${data1.message?.data?.latitude}, Longitude: ${data1.message?.data?.longitude}`);

    console.log("\n>>> Call 2: Subsequent request (should return cache immediately)...");
    const startTime = Date.now();
    const response2 = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Accept': 'application/json'
      }
    });
    const duration = Date.now() - startTime;
    console.log(`Call 2 Status: ${response2.status} (Fetched in ${duration}ms)`);
    const data2 = await response2.json();
    console.log(`Call 2 Latitude: ${data2.message?.data?.latitude}, Longitude: ${data2.message?.data?.longitude}`);

  } catch (error) {
    console.error("API request failed:", error);
  }
}

testEndpoint();
