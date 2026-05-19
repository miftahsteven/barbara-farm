async function run() {
  try {
    console.log("Logging in as admin...");
    const loginRes = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "admin@smartfarm.com",
        password: "password123",
        captchaToken: "development_bypass"
      })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error("Login failed:", loginData);
      return;
    }

    const token = loginData.token;
    console.log("Login successful!");

    console.log("Fetching /api/gps/gpsid/devices with Bearer token...");
    const devicesRes = await fetch("http://localhost:3001/api/gps/gpsid/devices", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });

    console.log("Response Status:", devicesRes.status);
    const body = await devicesRes.text();
    console.log("Response Body:", body);
  } catch (error) {
    console.error("Diagnostic execution failed:", error);
  }
}
run();
