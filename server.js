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

function pointsToTaka(points){ return Number(((points/WITHDRAW_POINTS)*20).toFixed(2)); }

app.get("/", (req,res)=>res.send("EarnQuick API Server Running"));

// Register user
app.post("/register", async (req,res)=>{
  try{
    const {id,name,referrer} = req.body;
    await pool.query("INSERT INTO users (id,name,referrer) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",[id,name,referrer]);
    if(referrer && Number(referrer)!==id){
      await pool.query("UPDATE users SET ref_clicks=ref_clicks+1 WHERE id=$1",[referrer]);
      const exist=await pool.query("SELECT id FROM users WHERE id=$1",[referrer]);
      if(exist.rowCount>0){
        await pool.query("UPDATE users SET balance=balance+$1,ref_success=ref_success+1 WHERE id=$2",[REF_BONUS,referrer]);
      }
    }
    res.json({ok:true});
  }catch(e){res.status(500).json({error:"Registration failed"});}
});

// Watch Ad
app.post("/watch-ad", async (req,res)=>{
  try{
    const {userId}=req.body;
    const r=await pool.query("UPDATE users SET balance=balance+$1 WHERE id=$2 RETURNING balance",[AD_REWARD,userId]);
    if(r.rowCount===0) return res.status(404).json({error:"User not found"});
    res.json({ok:true,newBalance:r.rows[0].balance});
  }catch(e){res.status(500).json({error:"Ad reward failed"});}
});

// Claim Daily
app.post("/claim-daily", async (req,res)=>{
  try{
    const {userId}=req.body;
    const check=await pool.query("SELECT last_daily,balance FROM users WHERE id=$1",[userId]);
    if(check.rowCount===0) return res.status(404).json({error:"User not found"});
    const last=new Date(check.rows[0].last_daily);
    const now=new Date();
    if(last && (now-last)<24*60*60*1000) return res.status(400).json({error:"Already claimed today"});
    const update=await pool.query("UPDATE users SET balance=balance+$1,last_daily=NOW() WHERE id=$2 RETURNING balance",[DAILY_BONUS,userId]);
    res.json({ok:true,newBalance:update.rows[0].balance});
  }catch(e){res.status(500).json({error:"Daily claim failed"});}
});

// Withdraw
app.post("/withdraw", async (req,res)=>{
  try{
    const {userId,amountPoints,method,number}=req.body;
    if(amountPoints<WITHDRAW_POINTS) return res.status(400).json({error:`Minimum ${WITHDRAW_POINTS}`});
    const u=await pool.query("SELECT balance FROM users WHERE id=$1",[userId]);
    if(u.rowCount===0) return res.status(404).json({error:"User not found"});
    if(u.rows[0].balance<amountPoints) return res.status(400).json({error:"Insufficient balance"});
    const amountTaka=pointsToTaka(amountPoints);
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await client.query("UPDATE users SET balance=balance-$1 WHERE id=$2",[amountPoints,userId]);
      await client.query("INSERT INTO withdraws (user_id,amount_points,amount_taka,method,number) VALUES ($1,$2,$3,$4,$5)",[userId,amountPoints,amountTaka,method,number]);
      await client.query('COMMIT');
      res.json({ok:true});
    }catch(e){await client.query('ROLLBACK'); throw e;}finally{client.release();}
  }catch(e){res.status(500).json({error:"Withdraw failed"});}
});

// Start server
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
