// db.js
import pkg from 'pg';
const { Pool } = pkg;

// Neon-এর SSL প্রয়োজন মেটাতে এটি সেট করা আবশ্যক
const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
};

// যখন সংযোগ স্ট্রিং এ 'pooler' থাকে, তখন এই কনফিগারেশন প্রয়োজন
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('pooler')) {
  // 'pg' লাইব্রেরি যখন pooler ব্যবহার করে, তখন connection pooling বন্ধ রাখতে হয়,
  // কারণ Neon pooler নিজেই connection pool পরিচালনা করে।
  connectionConfig.max = 1; 
}


const pool = new Pool(connectionConfig);

// সংযোগ ত্রুটিগুলির জন্য একটি লিসেনার যুক্ত করা হলো
pool.on('error', (err) => {
    console.error('Unexpected error on idle client:', err.message);
    // সার্ভারকে বন্ধ করে দিন যাতে Render এটি পুনরায় চালু করে
    process.exit(1); 
});

export default pool;
