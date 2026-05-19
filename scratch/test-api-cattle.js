import jwt from 'jsonwebtoken';
import 'dotenv/config';

async function testApiCattle() {
  const secret = process.env.JWT_SECRET || 'your_super_secret_key';
  const testToken = jwt.sign({ userId: 'test-user-id', role: 'admin' }, secret, { expiresIn: '1h' });

  const url = `http://localhost:3001/api/cattle`;
  console.log(`Testing GET ${url}...`);

  try {
    const start = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Accept': 'application/json'
      }
    });

    const duration = Date.now() - start;
    console.log(`API response status: ${response.status} (Fetched in ${duration}ms)`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Success! Retrieved ${data.length} cattle records.`);
    } else {
      const errorText = await response.text();
      console.error(`API returned error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error("API call failed:", error);
  }
}

testApiCattle();
