// db.js
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("FATAL ERROR: DATABASE_URL environment variable is not set.");
}

const pool = new pg.Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

// Test connection
pool.query('SELECT 1 + 1 AS result', (err, res) => {
    if (err) {
        console.error('Database connection test failed:', err.stack);
    } else {
        console.log('Database connection successful. Test result:', res.rows[0].result);
    }
});

export default pool;
