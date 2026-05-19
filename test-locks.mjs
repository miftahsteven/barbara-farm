import pg from 'pg';

async function checkLocks() {
  const connectionString = "postgresql://user_mscode:B47054ii%21%23%24@49.128.186.89:4825/smartfarmdb";
  const pool = new pg.Pool({ connectionString });

  try {
    console.log("Querying active locks...");
    const client = await pool.connect();
    
    // Get active queries
    const activeQueries = await client.query(`
      SELECT pid, state, query, age(clock_timestamp(), query_start) AS age
      FROM pg_stat_activity
      WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%';
    `);
    
    console.log("\n--- Active Queries ---");
    console.log(activeQueries.rows);

    // Get table locks
    const locks = await client.query(`
      SELECT 
        coalesce(blockingl.relation::regclass::text, blockingl.locktype) as locked_item,
        blockeda.pid as blocked_pid,
        blockeda.query as blocked_query,
        blockinga.pid as blocking_pid,
        blockinga.query as blocking_query
      FROM pg_catalog.pg_locks blockedl
      JOIN pg_catalog.pg_stat_activity blockeda ON blockeda.pid = blockedl.pid
      JOIN pg_catalog.pg_locks blockingl 
        ON blockingl.pid != blockedl.pid
        AND (blockingl.relation = blockedl.relation OR blockingl.relation IS NULL)
      JOIN pg_catalog.pg_stat_activity blockinga ON blockinga.pid = blockingl.pid
      WHERE NOT blockedl.granted;
    `);

    console.log("\n--- Blocked Queries (Locks) ---");
    console.log(locks.rows);

    client.release();
  } catch (err) {
    console.error("Failed to query locks:", err);
  } finally {
    await pool.end();
  }
}

checkLocks();
