import express from "express";
import cors from "cors";
import pool from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_ID = 8145444675;
const AD_REWARD = 10;
const REF_BONUS = 250;
const DAILY_BONUS = 10;
const WITHDRAW_POINTS = 5000;

function pointsToTaka(points){ return Number(((points/5000)*20).toFixed(2)); }

// --- Register / Referral Verification ---
app.post("/register", async (req,res)=>{
  const {userId,name,referral} = req.body;
  if(!userId) return res.status(400).json({error:"No userId"});
  const r = await pool.query("SELECT id FROM users WHERE id=$1",[userId]);
  if(r.rowCount===0){
    await pool.query("INSERT INTO users (id,name,balance,referrer) VALUES($1,$2,0,$3)",[userId,name||null,referral||null]);
    if(referral && Number(referral)!==Number(userId)){
      await pool.query("UPDATE users SET balance=balance+$1 WHERE id=$2",[REF_BONUS,referral]);
    }
    return res.json({ok:true,message:"User registered & referral processed"});
  } else return res.json({ok:false,message:"User exists"});
});

// Watch Ad
app.post("/watch-ad", async (req,res)=>{
  const {userId}=req.body;
  await pool.query("INSERT INTO users(id) VALUES($1) ON CONFLICT(id) DO NOTHING",[userId]);
  await pool.query("UPDATE users SET balance=balance+$1 WHERE id=$2",[AD_REWARD,userId]);
  const r = await pool.query("SELECT balance FROM users WHERE id=$1",[userId]);
  res.json({balance:r.rows[0].balance});
});

// Daily Bonus
app.post("/claim-daily", async (req,res)=>{
  const {userId}=req.body;
  const r = await pool.query("SELECT last_daily FROM users WHERE id=$1",[userId]);
  const lastDaily=r.rows[0]?.last_daily; const now=new Date();
  if(lastDaily && now-new Date(lastDaily)<24*60*60*1000) return res.json({ok:false,message:"Already claimed"});
  await pool.query("UPDATE users SET balance=balance+$1,last_daily=NOW() WHERE id=$2",[DAILY_BONUS,userId]);
  res.json({ok:true,bonus:DAILY_BONUS});
});

// Withdraw
app.post("/withdraw", async (req,res)=>{
  const {userId}=req.body;
  const r = await pool.query("SELECT balance FROM users WHERE id=$1",[userId]);
  const balance=r.rows[0]?.balance||0;
  if(balance<WITHDRAW_POINTS) return res.json({ok:false,message:`Minimum ${WITHDRAW_POINTS} points required`});
  const taka=pointsToTaka(WITHDRAW_POINTS);
  await pool.query("INSERT INTO withdraws(user_id,amount_points,amount_taka,status) VALUES($1,$2,$3,'pending')",[userId,WITHDRAW_POINTS,taka]);
  res.json({ok:true,amount_points:WITHDRAW_POINTS,amount_taka:taka,message:"Withdraw request submitted (Bkash, Nagad, Rocket, Crypto)"});
});

// Headline
app.get("/headline", async (req,res)=>{
  const r=await pool.query("SELECT text FROM headlines ORDER BY updated_at DESC LIMIT 1");
  res.json(r.rows[0] || {text:"Earn 10 Coins Per Ad | 250 Coins Referral | Daily Bonus 10 Coins | 5000 Coins = 20৳"});
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
