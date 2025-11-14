// db.js (PostgreSQL সংযোগের জন্য)

import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("FATAL ERROR: DATABASE_URL environment variable is not set.");
}

const pool = new pg.Pool({
  connectionString: connectionString,
  // Render এবং ক্লাউড হোস্টিং এর জন্য SSL বাধ্যতামূলক।
  ssl: {
    rejectUnauthorized: false, 
  },
});

// সংযোগ সফল হয়েছে কিনা তা নিশ্চিত করার জন্য একটি ছোট টেস্ট রান
pool.query('SELECT 1 + 1 AS result', (err, res) => {
    if (err) {
        console.error('Database connection test failed:', err.stack);
        console.error('ACTION REQUIRED: Please check your DATABASE_URL in Render Environment Variables.');
    } else {
        console.log('Database connection successful. Test result:', res.rows[0].result);
    }
});

export default pool;
