// db.js (চূড়ান্তভাবে সংশোধিত: Render/PostgreSQL সংযোগের জন্য)

import pg from "pg";
// Node.js এ CommonJS এর require() এর পরিবর্তে ES Modules এর import ব্যবহার করতে হবে

// DATABASE_URL Environment Variable সরাসরি Render থেকে ব্যবহার করা হচ্ছে।
// এটি সাধারণত Supabase বা ElephantSQL থেকে পাওয়া কানেকশন স্ট্রিং।
const connectionString = process.env.DATABASE_URL;

// যদি কোনো কারণে DATABASE_URL সেট না থাকে, তবে একটি ত্রুটি দেখান
if (!connectionString) {
  console.error("FATAL ERROR: DATABASE_URL environment variable is not set.");
  // Production-এ ক্র্যাশ এড়াতে সার্ভারকে চলতে দেওয়া হচ্ছে, কিন্তু লগিং খুব গুরুত্বপূর্ণ
}

const pool = new pg.Pool({
  connectionString: connectionString,
  // Render এবং অন্যান্য ক্লাউড হোস্টিং-এ SSL সংযোগ বাধ্যতামূলক।
  // rejectUnauthorized: false ব্যবহার করা হয় যখন SSL সার্টিফিকেট যাচাইয়ে সমস্যা হয়, 
  // যা সাধারণত ফ্রি PostgreSQL হোস্টিং-এ দেখা যায়।
  ssl: {
    rejectUnauthorized: false, 
  },
});

// সংযোগ সফল হয়েছে কিনা তা নিশ্চিত করার জন্য একটি ছোট টেস্ট রান (ঐচ্ছিক কিন্তু সহায়ক)
pool.query('SELECT 1 + 1 AS result', (err, res) => {
    if (err) {
        console.error('Database connection test failed:', err.stack);
    } else {
        console.log('Database connection successful. Test result:', res.rows[0].result);
    }
});

export default pool;
