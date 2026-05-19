import pg from 'pg';
import 'dotenv/config';

async function checkConnections() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });

  try {
    const client = await pool.connect();
    
    console.log("Querying database stats...");
    
    const countRes = await client.query("SELECT count(*) FROM pg_stat_activity;");
    console.log("Total active connections in DB:", countRes.rows[0].count);

    const limitRes = await client.query("SHOW max_connections;");
    console.log("Maximum connections allowed in DB (max_connections):", limitRes.rows[0].max_connections);

    const activeQueries = await client.query(`
      SELECT pid, state, age(clock_timestamp(), query_start), query 
      FROM pg_stat_activity 
      WHERE state != 'idle';
    `);
    console.log("\n--- Active Connection Breakdown ---");
    console.table(activeQueries.rows);

    client.release();
  } catch (err) {
    console.error("Diagnostic failed:", err);
  } finally {
    await pool.end();
  }
}

checkConnections();
