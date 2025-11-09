// db.js
import pkg from 'pg';
const { Pool } = pkg;

// Production (Render) পরিবেশে SSL ব্যবহার করা আবশ্যক
const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
    connectionString: process.env.DATABASE_URL, 
    // SSL কনফিগারেশন যোগ করা হলো (Render-এর জন্য আবশ্যক)
    ssl: isProduction ? { rejectUnauthorized: false } : false, 
};

// Neon pooler ব্যবহারের জন্য সংযোগ সংখ্যা ১-এ সেট করা হলো
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('pooler')) {
  connectionConfig.max = 1; 
}

const pool = new Pool(connectionConfig);

// সংযোগ ব্যর্থ হলে সার্ভার ক্র্যাশ করার জন্য লিসেনার
pool.on('error', (err) => {
    console.error('❌ Unexpected DB error: Database connection failed.', err.message);
    process.exit(1); 
});

export default pool;
