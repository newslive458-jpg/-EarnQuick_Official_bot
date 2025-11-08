import express from "express";
import cors from "cors";
import pool from "./db.js"; // NeonDB / PostgreSQL pool

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_ID = 8145444675;
const AD_REWARD = 10;
const REF_BONUS = 250;
const DAILY_BONUS = 10;
const WITHDRAW_POINTS = 5000;

function pointsToTaka(points) {
  return Number(((points / 5000) * 20).toFixed(2));
}

// --- Register / Referral ---
app.post("/register", async (req, res) => {
  const { userId, name, referral } = req.body;
  if (!userId) return res.status(400).json({ error: "No userId" });

  const r = await pool.query("SELECT id FROM users WHERE id=$1", [userId]);
  if (r.rowCount === 0) {
    // New User
    await pool.query(
      "INSERT INTO users (id,name,balance,referrer) VALUES($1,$2,0,$3)",
      [userId, name || null, referral || null]
    );

    // Referral bonus if valid & not self-referral
    if (referral && Number(referral) !== Number(userId)) {
      await pool.query("UPDATE users SET balance=balance+$1, ref_success=ref_success+1 WHERE id=$2", [REF_BONUS, referral]);
    }
    return res.json({ ok: true, message: "User registered & referral processed" });
  } else return res.json({ ok: false, message: "User exists" });
});

// Track Referral Clicks
app.post("/ref-click", async (req,res)=>{
  const { refId } = req.body;
  if(!refId) return res.status(400).json({error:"No refId"});
  await pool.query("UPDATE users SET ref_clicks=ref_clicks+1 WHERE id=$1",[refId]);
  res.json({ok:true});
});

// Watch Ad
app.post("/watch-ad", async (req,res)=>{
  const { userId } = req.body;
  await pool.query("INSERT INTO users(id) VALUES($1) ON CONFLICT(id) DO NOTHING",[userId]);
  await pool.query("UPDATE users SET balance=balance+$1 WHERE id=$2",[AD_REWARD,userId]);
  const r = await pool.query("SELECT balance FROM users WHERE id=$1",[userId]);
  res.json({balance:r.rows[0].balance});
});

// Daily Bonus
app.post("/claim-daily", async (req,res)=>{
  const { userId } = req.body;
  const r = await pool.query("SELECT last_daily FROM users WHERE id=$1",[userId]);
  const lastDaily = r.rows[0]?.last_daily;
  const now = new Date();
  if(lastDaily && now-new Date(lastDaily) < 24*60*60*1000) return res.json({ok:false,message:"Already claimed"});
  await pool.query("UPDATE users SET balance=balance+$1,last_daily=NOW() WHERE id=$2",[DAILY_BONUS,userId]);
  res.json({ok:true,bonus:DAILY_BONUS});
});

// Withdraw
app.post("/withdraw", async (req,res)=>{
  const { userId } = req.body;
  const r = await pool.query("SELECT balance FROM users WHERE id=$1",[userId]);
  const balance = r.rows[0]?.balance || 0;
  if(balance<WITHDRAW_POINTS) return res.json({ok:false,message:`Minimum ${WITHDRAW_POINTS} points required`});
  const taka = pointsToTaka(WITHDRAW_POINTS);
  await pool.query("INSERT INTO withdraws(user_id,amount_points,amount_taka,status) VALUES($1,$2,$3,'pending')",[userId,WITHDRAW_POINTS,taka]);
  res.json({ok:true,message:"Withdraw request submitted (Bkash, Nagad, Rocket, Crypto)",amount_points:WITHDRAW_POINTS,amount_taka:taka});
});

// Get user info (for dashboard)
app.get("/user/:id", async (req,res)=>{
  const { id } = req.params;
  const r = await pool.query("SELECT id,name,balance,ref_clicks,ref_success FROM users WHERE id=$1",[id]);
  if(r.rowCount===0) return res.json({id, balance:0, ref_clicks:0, ref_success:0});
  res.json(r.rows[0]);
});

// Headlines
app.get("/headline", async (req,res)=>{
  const r = await pool.query("SELECT text FROM headlines ORDER BY updated_at DESC LIMIT 1");
  res.json(r.rows[0] || { text:"Earn 10 Coins Per Ad | 250 Coins Referral | Daily Bonus 10 Coins | 5000 Coins = 20৳" });
});

// Admin: list users & withdraws
app.get("/admin-data", async (req,res)=>{
  const adminId = req.query.adminId;
  if(Number(adminId)!==ADMIN_ID) return res.status(403).json({error:"Forbidden"});
  const users = (await pool.query("SELECT id,name,balance,ref_clicks,ref_success FROM users")).rows;
  const withdraws = (await pool.query("SELECT * FROM withdraws")).rows;
  res.json({users, withdraws});
});

// Admin approve withdraw
app.post("/admin/approve-withdraw", async (req,res)=>{
  const { adminId, withdrawId } = req.body;
  if(Number(adminId)!==ADMIN_ID) return res.status(403).json({error:"Forbidden"});
  const r = await pool.query("SELECT * FROM withdraws WHERE id=$1",[withdrawId]);
  if(r.rowCount===0) return res.status(404).json({error:"Withdraw not found"});
  const wd = r.rows[0];
  if(wd.status!=="pending") return res.json({ok:false,message:"Already processed"});
  await pool.query("UPDATE users SET balance=balance-$1 WHERE id=$2",[wd.amount_points,wd.user_id]);
  await pool.query("UPDATE withdraws SET status='approved' WHERE id=$1",[withdrawId]);
  res.json({ok:true});
});

const PORT = process.env.PORT||3000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
