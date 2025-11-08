// server.js
import express from "express";
import cors from "cors";
import pool from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// --- Config ---
const ADMIN_ID = 8145444675;
const AD_REWARD_POINTS = 10;
const REFERRAL_BONUS = 250;
const DAILY_BONUS = 10;
const WITHDRAW_POINTS = 5000;

function pointsToTaka(points) {
  return Number(((points / 5000) * 20).toFixed(2));
}

// --- Initialize DB ---
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      name TEXT,
      balance BIGINT DEFAULT 0,
      referrer BIGINT,
      last_daily TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
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

  const r = await pool.query("SELECT count(*) FROM headlines");
  if (Number(r.rows[0].count) === 0) {
    await pool.query("INSERT INTO headlines (text) VALUES ($1)", [
      "Earn 10 Points Per Ad | 250 Points Per Referral | Daily Bonus 10 Points | Withdraw 5000 Points = 20 টাকা"
    ]);
  }
})();

// --- Routes ---

// headline
app.get("/headline", async (req, res) => {
  const r = await pool.query("SELECT * FROM headlines ORDER BY updated_at DESC LIMIT 1");
  res.json(r.rows[0] || { text: "" });
});

// set headline (admin)
app.post("/headline", async (req, res) => {
  const { adminId, text } = req.body;
  if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });
  await pool.query("INSERT INTO headlines (text) VALUES ($1)", [text]);
  res.json({ ok: true });
});

// --- Register / Referral ---
app.post("/register", async (req, res) => {
  const { userId, name, referral } = req.body;
  if (!userId) return res.status(400).json({ error: "No userId" });

  const r = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
  if (r.rowCount === 0) {
    // new user
    await pool.query(
      "INSERT INTO users (id, name, balance, referrer) VALUES ($1, $2, 0, $3)",
      [userId, name || null, referral || null]
    );

    // give referral bonus if valid
    if (referral && Number(referral) !== Number(userId)) {
      await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [REFERRAL_BONUS, referral]);
    }
    return res.json({ ok: true, message: "New user registered & referral processed" });
  } else {
    return res.json({ ok: false, message: "User already exists" });
  }
});

// watch ad
app.post("/watch-ad", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "No userId" });

  await pool.query(
    `INSERT INTO users (id) VALUES ($1)
     ON CONFLICT (id) DO NOTHING`,
    [userId]
  );

  await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [AD_REWARD_POINTS, userId]);

  const r = await pool.query("SELECT balance FROM users WHERE id = $1", [userId]);
  res.json({ balance: r.rows[0].balance });
});

// daily bonus
app.post("/claim-daily", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "No userId" });

  const r = await pool.query("SELECT last_daily FROM users WHERE id = $1", [userId]);
  const lastDaily = r.rows[0]?.last_daily;
  const now = new Date();

  if (lastDaily && now - new Date(lastDaily) < 24 * 60 * 60 * 1000) {
    return res.json({ ok: false, message: "Daily bonus already claimed" });
  }

  await pool.query("UPDATE users SET balance = balance + $1, last_daily = NOW() WHERE id = $2", [DAILY_BONUS, userId]);
  res.json({ ok: true, bonus: DAILY_BONUS });
});

// withdraw
app.post("/withdraw", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "No userId" });

  const r = await pool.query("SELECT balance FROM users WHERE id = $1", [userId]);
  const balance = r.rows[0]?.balance || 0;

  if (balance < WITHDRAW_POINTS) {
    return res.json({ ok: false, message: `Minimum ${WITHDRAW_POINTS} points required` });
  }

  const taka = pointsToTaka(WITHDRAW_POINTS);
  await pool.query(
    "INSERT INTO withdraws (user_id, amount_points, amount_taka) VALUES ($1, $2, $3)",
    [userId, WITHDRAW_POINTS, taka]
  );

  res.json({ ok: true, message: "Withdraw request submitted", amount_points: WITHDRAW_POINTS, amount_taka: taka });
});

// admin: list users + withdraws
app.get("/admin-data", async (req, res) => {
  const adminId = req.query.adminId;
  if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });

  const users = (await pool.query("SELECT id, name, balance, referrer, last_daily FROM users")).rows;
  const withdraws = (await pool.query("SELECT * FROM withdraws")).rows;

  res.json({ users, withdraws });
});

// admin approve withdraw
app.post("/admin/approve-withdraw", async (req, res) => {
  const { adminId, withdrawId } = req.body;
  if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });

  const r = await pool.query("SELECT * FROM withdraws WHERE id = $1", [withdrawId]);
  if (r.rowCount === 0) return res.status(404).json({ error: "Withdraw not found" });

  const wd = r.rows[0];
  if (wd.status !== "pending") return res.json({ ok: false, message: "Already processed" });

  // deduct points & mark approved
  await pool.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [wd.amount_points, wd.user_id]);
  await pool.query("UPDATE withdraws SET status = 'approved' WHERE id = $1", [withdrawId]);

  res.json({ ok: true });
});

// get user info
app.get("/user/:id", async (req, res) => {
  const { id } = req.params;
  const r = await pool.query("SELECT id, name, balance, referrer, last_daily FROM users WHERE id = $1", [id]);
  if (r.rowCount === 0) return res.json({ id, balance: 0 });
  res.json(r.rows[0]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
