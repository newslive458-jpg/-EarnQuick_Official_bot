// db.js
import pg from 'pg';
import 'dotenv/config'; // Make sure you have dotenv installed if running locally

// Use connection pooling to manage database connections efficiently
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    // Add SSL configuration for Render/Neon if necessary
    ssl: {
        rejectUnauthorized: false 
    }
});

export default pool;
