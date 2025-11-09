// server.js (চূড়ান্তভাবে সংশোধিত: নতুন হেডলাইন ও অ্যাডমিন প্যানেল লজিক যুক্ত)
import express from "express";
import cors from "cors";
import pool from "./db.js"; 
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// CORS কনফিগারেশন: আপনার ব্লগার ডোমেইন এবং Render ডোমেইন উভয়কে অনুমোদন করা হয়েছে
const allowedOrigins = ['https://earnquickofficial.blogspot.com', 'https://earnquick-official-bot.onrender.com'];
app.use(cors({
    origin: function(origin, callback){
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json());

// Path কনফিগারেশন
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
    res.send("EarnQuick API Server is running. Access the Mini App via Telegram/BlogSpot.");
});


// ----- CONFIG (আপনার সেট করা অ্যাডমিন আইডি) -----
const ADMIN_ID = 8145444675; // <-- আপনার টেলিগ্রাম ইউজার আইডি
const AD_REWARD = 10;
const REF_BONUS = 250;
const DAILY_BONUS = 10;
const WITHDRAW_POINTS = 5000;

function pointsToTaka(points) {
  return Number(((points / 5000) * 20).toFixed(2));
}

// ----- Initialize tables if not exist -----
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        name TEXT,
        balance BIGINT DEFAULT 0,
        referrer BIGINT,
        last_daily TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        ref_clicks BIGINT DEFAULT 0,
        ref_success BIGINT DEFAULT 0
      );
  
      CREATE TABLE IF NOT EXISTS withdraws (
        id SERIAL PRIMARY KEY,
        user_id BIGINT,
        amount_points BIGINT,
        amount_taka NUMERIC(10,2),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
  
      CREATE TABLE IF NOT EXISTS headlines (
        id SERIAL PRIMARY KEY,
        text TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  
    // নতুন হেডলাইন যোগ করা হচ্ছে 
    const NEW_HEADLINE = "চলমান হেডলাইন: উইথড্র ইনফরমেশন সকাল ৬টা থেকে রাত ৮টা পর্যন্ত। রেফার করুন ২৫০ পয়েন্ট। কোনো সমস্যা হলে যোগাযোগ করুন ০১৯১৩৬২১৫১০ / najmulh219653@gmail.com";
    
    const r = await pool.query("SELECT count(*) FROM headlines");
    if (Number(r.rows[0].count) === 0) {
      await pool.query(
        "INSERT INTO headlines (text) VALUES ($1)",
        [NEW_HEADLINE] // প্রথমবার সার্ভার স্টার্ট হলে নতুন হেডলাইন যুক্ত হবে
      );
    }
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("DB init error: Database connection failed.", err.message);
    process.exit(1); 
  }
})();

// ----------------- API ROUTES -----------------

// ... (অন্যান্য API রুটগুলি পূর্বের মতো থাকবে, যেমন: /register, /watch-ad, /claim-daily, /withdraw, /user/:id)

// get latest headline
app.get("/headline", async (req, res) => {
  try {
    const r = await pool.query("SELECT text, updated_at FROM headlines ORDER BY updated_at DESC LIMIT 1");
    res.json(r.rows[0] || { text: "" });
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

// ***************************************************************
// ******************* ADMIN PANEL ROUTES START ********************
// ***************************************************************

// Admin data (users + withdraws + monitoring stats)
// এটি সমস্ত ইউজার ডেটা এবং উইথড্র রিকোয়েস্ট ফেরত দেবে
app.get("/admin-data", async (req, res) => {
  try {
    const adminId = req.query.adminId;
    // সিকিউরিটি চেক: নিশ্চিত করুন যে রিকোয়েস্টটি শুধুমাত্র অ্যাডমিনের কাছ থেকে আসছে
    if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden: You are not the admin." });

    // 1. All Users and Balances
    const users = (await pool.query("SELECT id, name, balance, ref_clicks, ref_success, created_at FROM users ORDER BY balance DESC")).rows;
    
    // 2. All Withdraws (Pending, Approved)
    const withdraws = (await pool.query("SELECT * FROM withdraws ORDER BY created_at DESC")).rows;

    // 3. Monitoring Stats (নতুন)
    const totalUsers = (await pool.query("SELECT count(*) FROM users")).rows[0].count;
    const pendingWithdraws = (await pool.query("SELECT count(*) FROM withdraws WHERE status = 'pending'")).rows[0].count;
    const totalBalance = (await pool.query("SELECT sum(balance) FROM users")).rows[0].sum || 0;
    const totalTaka = pointsToTaka(Number(totalBalance));


    res.json({ 
        users, 
        withdraws,
        stats: {
            totalUsers,
            pendingWithdraws,
            totalBalance: Number(totalBalance),
            totalTaka
        }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error fetching admin data" });
  }
});

// admin: set headline (অ্যাডমিন প্যানেল থেকে হেডলাইন পরিবর্তন করা যাবে)
app.post("/headline", async (req, res) => {
  const { adminId, text } = req.body;
  if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });
  if (!text || !text.trim()) return res.status(400).json({ error: "Empty text" });
  await pool.query("INSERT INTO headlines (text) VALUES ($1)", [text]);
  res.json({ ok: true });
});

// admin: approve withdraw
app.post("/admin/approve-withdraw", async (req, res) => {
  try {
    const { adminId, withdrawId } = req.body;
    if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });

    const r = await pool.query("SELECT * FROM withdraws WHERE id = $1", [withdrawId]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Withdraw not found" });
    const wd = r.rows[0];
    if (wd.status !== "pending") return res.json({ ok: false, message: "Already processed" });

    // deduct points & mark approved
    await pool.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [wd.amount_points, wd.user_id]);
    await pool.query("UPDATE withdraws SET status = 'approved' WHERE id = $1", [withdrawId]);

    res.json({ ok: true, message: "Withdrawal approved and balance deducted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error approving withdraw" });
  }
});

// admin: cancel withdraw (নতুন)
app.post("/admin/cancel-withdraw", async (req, res) => {
  try {
    const { adminId, withdrawId } = req.body;
    if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });

    const r = await pool.query("SELECT * FROM withdraws WHERE id = $1", [withdrawId]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Withdraw not found" });
    const wd = r.rows[0];
    if (wd.status !== "pending") return res.json({ ok: false, message: "Already processed" });

    // শুধু স্ট্যাটাস ক্যানসেল করবে, ব্যালান্স ফেরত দেবে না (কারণ ব্যালান্স উইথড্র রিকোয়েস্ট করার সময় কাটা হয়নি)
    await pool.query("UPDATE withdraws SET status = 'cancelled' WHERE id = $1", [withdrawId]); 

    res.json({ ok: true, message: "Withdrawal cancelled." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error cancelling withdraw" });
  }
});


// ***************************************************************
// ******************* ADMIN PANEL ROUTES END **********************
// ***************************************************************

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
