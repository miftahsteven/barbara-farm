import { getGPSIDCredentials } from './src/lib/gpsid.js';

async function run() {
  try {
    console.log("Getting active GPS.id credentials...");
    const { token, id } = await getGPSIDCredentials();
    console.log("Credentials retrieved successfully! Token starts with:", token.substring(0, 20), "ID:", id);

    console.log("Fetching raw device list from GPS.id public/vehicle endpoint...");
    const res = await fetch(`https://portal.gps.id/backend/seen/public/vehicle?id=${id}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "id": id,
        "X-ID": id,
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      console.error("Failed to fetch vehicles from vendor. Status:", res.status);
      const text = await res.text();
      console.error("Response:", text);
      return;
    }

    const json = await res.json();
    console.log("API Response Status:", json.status);
    
    if (json.status && json.message?.data) {
      const devices = json.message.data;
      console.log("Total devices owned by barbarafarm:", devices.length);
      
      if (devices.length > 0) {
        console.log("Dumping exact raw fields of the first device:");
        console.log(JSON.stringify(devices[0], null, 2));
      } else {
        console.log("No devices returned in the array!");
      }
    } else {
      console.log("Invalid API response format:", json);
    }
  } catch (error) {
    console.error("Failed to execute raw GPS diagnostic:", error);
  }
}
run();
