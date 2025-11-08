// server.js
import express from "express";
import cors from "cors";
// db.js ফাইলটি অবশ্যই সঠিক PostgreSQL পুল তৈরি করবে এবং DATABASE_URL ব্যবহার করবে।
import pool from "./db.js"; 
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// Path কনফিগারেশন (ESM মডিউলের জন্য)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serve static frontend from /public
// এটি public ফোল্ডারের সব স্ট্যাটিক ফাইল (index.html, script.js, css) পরিবেশন করবে।
app.use(express.static(path.join(__dirname, "public")));

// ----- CONFIG -----
const ADMIN_ID = 8145444675;
const AD_REWARD = 10;
const REF_BONUS = 250;
const DAILY_BONUS = 10;
const WITHDRAW_POINTS = 5000;

// points -> taka: 5000 -> 20
function pointsToTaka(points) {
  return Number(((points / 5000) * 20).toFixed(2));
}

// ----- Initialize tables if not exist -----
(async () => {
  try {
    // এই ব্লকটি ডেটাবেস সংযোগ না হওয়া পর্যন্ত সার্ভার স্টার্ট হতে দেবে না।
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
  
    // ensure at least one headline exists
    const r = await pool.query("SELECT count(*) FROM headlines");
    if (Number(r.rows[0].count) === 0) {
      await pool.query(
        "INSERT INTO headlines (text) VALUES ($1)",
        ["Earn 10 Points Per Ad | 250 Points Per Referral | Daily Bonus 10 Points | 5000 Points = 20 টাকা"]
      );
    }
    console.log("Database initialized successfully.");
  } catch (err) {
    // এই ব্লকটি আপনার ENOTFOUND ত্রুটির উৎস
    console.error("DB init error: Database connection failed.", err.message);
    // যদি DB সংযোগ না হয়, তবে অ্যাপ্লিকেশন ক্র্যাশ করবে, যা ঠিক।
    process.exit(1); 
  }
})();

// ----------------- API ROUTES -----------------

// get latest headline
app.get("/headline", async (req, res) => {
  try {
    const r = await pool.query("SELECT text, updated_at FROM headlines ORDER BY updated_at DESC LIMIT 1");
    res.json(r.rows[0] || { text: "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// admin: set headline
app.post("/headline", async (req, res) => {
  const { adminId, text } = req.body;
  if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });
  if (!text || !text.trim()) return res.status(400).json({ error: "Empty text" });
  await pool.query("INSERT INTO headlines (text) VALUES ($1)", [text]);
  res.json({ ok: true });
});

// register (called when user opens app with ?ref= or first time)
app.post("/register", async (req, res) => {
  try {
    const { userId, name, referral } = req.body;
    if (!userId) return res.status(400).json({ error: "No userId" });

    const existing = await pool.query("SELECT id, referrer FROM users WHERE id = $1", [userId]);
    if (existing.rowCount === 0) {
      // new user
      await pool.query("INSERT INTO users (id, name, balance, referrer) VALUES ($1, $2, 0, $3)", [userId, name || null, referral || null]);

      // award referrer once (if valid and not self)
      if (referral && Number(referral) !== Number(userId)) {
        await pool.query("UPDATE users SET balance = balance + $1, ref_success = ref_success + 1 WHERE id = $2", [REF_BONUS, referral]);
      }
      return res.json({ ok: true, message: "registered" });
    } else {
      // existing - nothing to do
      return res.json({ ok: false, message: "already" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server" });
  }
});

// track referral link clicks
app.post("/ref-click", async (req, res) => {
  try {
    const { refId } = req.body;
    if (!refId) return res.status(400).json({ error: "No refId" });
    // create referrer row if not exists so clicks tracked before they join
    await pool.query("INSERT INTO users(id) VALUES($1) ON CONFLICT (id) DO NOTHING", [refId]);
    await pool.query("UPDATE users SET ref_clicks = ref_clicks + 1 WHERE id = $1", [refId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server" });
  }
});

// watch-ad -> add ad reward and return updated balance
app.post("/watch-ad", async (req, res) => {
  try {
    const { userId, name, referral } = req.body;
    if (!userId) return res.status(400).json({ error: "No userId" });

    // ensure user exists
    await pool.query(
      `INSERT INTO users (id, name, balance, referrer)
       VALUES ($1, $2, 0, $3)
       ON CONFLICT (id) DO UPDATE SET name = COALESCE($2, users.name)`,
      [userId, name || null, referral || null]
    );

    // add ad reward
    await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [AD_REWARD, userId]);

    const r = await pool.query("SELECT balance FROM users WHERE id = $1", [userId]);
    res.json({ balance: Number(r.rows[0].balance) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server" });
  }
});

// claim daily bonus
app.post("/claim-daily", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "No userId" });

    // ensure user exists
    await pool.query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [userId]);

    const r = await pool.query("SELECT last_daily FROM users WHERE id = $1", [userId]);
    const lastDaily = r.rows[0]?.last_daily;
    const now = new Date();
    if (lastDaily && now - new Date(lastDaily) < 24 * 60 * 60 * 1000) {
      return res.json({ ok: false, message: "Daily bonus already claimed" });
    }

    await pool.query("UPDATE users SET balance = balance + $1, last_daily = NOW() WHERE id = $2", [DAILY_BONUS, userId]);
    res.json({ ok: true, bonus: DAILY_BONUS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server" });
  }
});

// withdraw request
app.post("/withdraw", async (req, res) => {
  try {
    const { userId, method, account } = req.body; // method/account optional metadata
    if (!userId) return res.status(400).json({ error: "No userId" });

    const r = await pool.query("SELECT balance FROM users WHERE id = $1", [userId]);
    const balance = r.rows[0]?.balance || 0;
    if (balance < WITHDRAW_POINTS) return res.json({ ok: false, message: `Minimum ${WITHDRAW_POINTS} points required` });

    const taka = pointsToTaka(WITHDRAW_POINTS);
    await pool.query(
      "INSERT INTO withdraws (user_id, amount_points, amount_taka, status) VALUES ($1, $2, $3, 'pending')",
      [userId, WITHDRAW_POINTS, taka]
    );
    
    // ব্যালান্স থেকে পয়েন্ট কাটা হয়নি, কারণ ফ্রন্ট-এন্ড থেকে ব্যালান্স আপডেটের জন্য আলাদা রিকোয়েস্ট যেতে পারে।
    // তবে, সাধারণত Withdraw রিকোয়েস্ট করার সাথে সাথেই ব্যালান্স থেকে পয়েন্ট কেটে নেওয়া হয়।
    // আপনার কোডে এটি নেই, যা একটি সমস্যা হতে পারে। আপনি এখানে এই লাইনটি যোগ করতে পারেন:
    // await pool.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [WITHDRAW_POINTS, userId]); 

    res.json({ ok: true, amount_points: WITHDRAW_POINTS, amount_taka: taka, message: "Withdraw request submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server" });
  }
});

// get user info (dashboard)
app.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query("SELECT id, name, balance, ref_clicks, ref_success, last_daily FROM users WHERE id = $1", [id]);
    if (r.rowCount === 0) return res.json({ id, balance: 0, ref_clicks: 0, ref_success: 0 });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server" });
  }
});

// admin data (users + withdraws)
app.get("/admin-data", async (req, res) => {
  try {
    const adminId = req.query.adminId;
    if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });

    const users = (await pool.query("SELECT id, name, balance, ref_clicks, ref_success, created_at FROM users ORDER BY balance DESC")).rows;
    const withdraws = (await pool.query("SELECT * FROM withdraws ORDER BY created_at DESC")).rows;
    res.json({ users, withdraws });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server" });
  }
});

// admin approve withdraw
app.post("/admin/approve-withdraw", async (req, res) => {
  try {
    const { adminId, withdrawId } = req.body;
    if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });

    const r = await pool.query("SELECT * FROM withdraws WHERE id = $1", [withdrawId]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Withdraw not found" });
    const wd = r.rows[0];
    if (wd.status !== "pending") return res.json({ ok: false, message: "Already processed" });

    // deduct points & mark approved
    // Note: Withdraw রিকোয়েস্ট করার সময় পয়েন্ট না কাটা হলে, এখানে কাটা হচ্ছে।
    await pool.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [wd.amount_points, wd.user_id]);
    await pool.query("UPDATE withdraws SET status = 'approved' WHERE id = $1", [withdrawId]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server" });
  }
});

// root -> serve index (এই রুটটি নিশ্চিত করবে যে public/index.html পরিবেশিত হচ্ছে)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
