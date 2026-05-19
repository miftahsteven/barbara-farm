import prisma from './src/lib/prisma.js';

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    return null;
  }
}

async function run() {
  try {
    console.log("Checking SystemSetting table for gpsid_porta_token...");
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'gpsid_porta_token' }
    });

    if (setting && setting.value) {
      const token = setting.value;
      console.log("Found token in database!");
      console.log("Token sample:", token.substring(0, 30) + "...");
      const decoded = decodeJWT(token);
      console.log("Decoded Payload:", decoded);
      if (decoded && decoded.exp) {
        const expiryDate = new Date(decoded.exp * 1000);
        console.log("Token Expiration Date:", expiryDate.toISOString());
        console.log("Is Token Expired?", expiryDate.getTime() < Date.now());
      }
    } else {
      console.log("No gpsid_porta_token found in database.");
    }
  } catch (err) {
    console.error("Failed to query database:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
