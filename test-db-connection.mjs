import pg from 'pg';

async function testConnection() {
  const connectionString = "postgresql://user_mscode:B47054ii%21%23%24@49.128.186.89:4825/smartfarmdb";
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });

  try {
    console.log("Connecting directly to PostgreSQL...");
    const client = await pool.connect();
    console.log("Connected! Running SELECT 1...");
    const res = await client.query("SELECT 1;");
    console.log("Success! Query result:", res.rows);
    client.release();
  } catch (err) {
    console.error("Database connection or query failed:", err);
  } finally {
    await pool.end();
  }
}

testConnection();
