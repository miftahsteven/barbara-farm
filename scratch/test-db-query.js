import pg from 'pg';
import 'dotenv/config';

async function testQuery() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Connecting using:", connectionString);
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });

  try {
    console.log("Connecting to PG pool...");
    const client = await pool.connect();
    
    console.log("Success! Running SELECT COUNT(*) FROM \"Cattle\"...");
    const start = Date.now();
    const res = await client.query('SELECT COUNT(*) FROM "Cattle";');
    const duration = Date.now() - start;
    console.log(`Query succeeded in ${duration}ms! Result:`, res.rows);
    
    client.release();
  } catch (err) {
    console.error("Direct PG query failed:", err);
  } finally {
    await pool.end();
  }
}

testQuery();
