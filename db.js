// db.js
import pkg from 'pg';
const { Pool } = pkg;

// Production (Render) পরিবেশে SSL ব্যবহার করা আবশ্যক
const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
    // Render-এ সেট করা DATABASE_URL ভ্যারিয়েবল ব্যবহার করা হচ্ছে
    connectionString: process.env.DATABASE_URL, 
    // SSL কনফিগারেশন যোগ করা হলো (Render-এর জন্য আবশ্যক)
    ssl: isProduction ? { rejectUnauthorized: false } : false, 
};

// Neon pooler ব্যবহার করার সময় pg-pool-এর কনফিগারেশন Override করা প্রয়োজন
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('pooler')) {
  // সর্বোচ্চ ১টি সংযোগ সেট করা হলো, কারণ Neon pooler নিজেই সংযোগ পরিচালনা করে
  connectionConfig.max = 1; 
}

const pool = new Pool(connectionConfig);

// সংযোগ ত্রুটিগুলির জন্য লিসেনার
pool.on('error', (err) => {
    console.error('❌ Unexpected DB error: Database connection failed. Please check DATABASE_URL in Render.', err.message);
    // সার্ভারকে বন্ধ করে দিন যাতে Render এটি পুনরায় চালু করে
    process.exit(1); 
});

export default pool;
