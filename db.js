// db.js (আপনার GitHub রিপোজিটরিতে)
import pg from 'pg';
import 'dotenv/config'; // <-- এটি প্যাকেজটি ব্যবহার করার জন্য

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    // Render/Neon এর জন্য SSL কনফিগারেশন
    ssl: {
        rejectUnauthorized: false 
    }
});

export default pool;
