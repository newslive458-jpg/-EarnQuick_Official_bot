// server.js
import express from "express";
import cors from "cors";
import pool from "./db.js"; 
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin Config
const ADMIN_ID = 8145444675;
const AD_REWARD = 10;
const REF_BONUS = 250;
const DAILY_BONUS = 10;
const WITHDRAW_POINTS = 5000;

function pointsToTaka(points) {
  return Number(((points / WITHDRAW_POINTS) * 20).toFixed(2));
}

// Initialize tables
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
        method TEXT,
        number TEXT,
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
      await pool.query(
        "INSERT INTO headlines (text) VALUES ($1)",
        ["চলমান হেডলাইন: EarnQuick Official - বিজ্ঞাপন দেখুন এবং ইনকাম করুন!"]
      );
    }
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("DB init error:", err.message);
  }
})();

// --- API Routes ---

// Root
app.get("/", (req, res) => {
    res.send("EarnQuick API Server is running. Open Mini App via Telegram.");
});

// Get user
app.get("/user/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "server error fetching user data" });
    }
});

// Register user
app.post("/register", async (req, res) => {
    try {
        const { id, name, referrer } = req.body;
        await pool.query(
            "INSERT INTO users (id,name,referrer) VALUES($1,$2,$3) ON CONFLICT (id) DO NOTHING",
            [id, name, referrer]
        );

        if (referrer && Number(referrer) !== id) {
            const refId = Number(referrer);
            await pool.query("UPDATE users SET ref_clicks = ref_clicks+1 WHERE id=$1", [refId]);
            const exists = await pool.query("SELECT id FROM users WHERE id=$1", [refId]);
            if (exists.rowCount>0) {
                await pool.query("UPDATE users SET balance = balance+$1, ref_success = ref_success+1 WHERE id=$2", [REF_BONUS, refId]);
            }
        }
        res.json({ ok:true });
    } catch(err) {
        res.status(500).json({ error:"Registration failed." });
    }
});

// Watch ad
app.post("/watch-ad", async (req,res)=>{
    try{
        const { userId } = req.body;
        const r = await pool.query("UPDATE users SET balance=balance+$1 WHERE id=$2 RETURNING balance",[AD_REWARD,userId]);
        if(r.rowCount===0) return res.status(404).json({error:"User not found"});
        res.json({ok:true,newBalance:r.rows[0].balance});
    }catch(err){ res.status(500).json({error:"Ad reward failed."}) }
});

// Daily bonus
app.post("/claim-daily", async (req,res)=>{
    try{
        const { userId } = req.body;
        const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate()-1);
        const r = await pool.query("SELECT last_daily FROM users WHERE id=$1",[userId]);
        if(r.rowCount===0) return res.status(404).json({error:"User not found"});
        const lastDaily = r.rows[0].last_daily;
        if(lastDaily && new Date(lastDaily) > oneDayAgo) return res.status(400).json({error:"Already claimed"});
        const u = await pool.query("UPDATE users SET balance=balance+$1,last_daily=NOW() WHERE id=$2 RETURNING balance",[DAILY_BONUS,userId]);
        res.json({ok:true,newBalance:u.rows[0].balance});
    }catch(err){res.status(500).json({error:"Daily claim failed"})}
});

// Withdraw request
app.post("/withdraw", async(req,res)=>{
    try{
        const { userId, amountPoints, method, number } = req.body;
        if(amountPoints<WITHDRAW_POINTS) return res.status(400).json({error:`Minimum withdraw ${WITHDRAW_POINTS} points`});
        const r = await pool.query("SELECT balance FROM users WHERE id=$1",[userId]);
        if(r.rowCount===0) return res.status(404).json({error:"User not found"});
        if(r.rows[0].balance<amountPoints) return res.status(400).json({error:"Insufficient balance"});
        const amountTaka = pointsToTaka(amountPoints);
        const client = await pool.connect();
        try{
            await client.query('BEGIN');
            await client.query("UPDATE users SET balance=balance-$1 WHERE id=$2",[amountPoints,userId]);
            await client.query("INSERT INTO withdraws(user_id,amount_points,amount_taka,method,number) VALUES($1,$2,$3,$4,$5)",
            [userId,amountPoints,amountTaka,method,number]);
            await client.query('COMMIT'); res.json({ok:true});
        }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
    }catch(err){res.status(500).json({error:"Withdraw failed"})}
});

// Get headline
app.get("/headline", async(req,res)=>{
    try{
        const r = await pool.query("SELECT text FROM headlines ORDER BY updated_at DESC LIMIT 1");
        if(r.rowCount===0) return res.json({text:"No headline"});
        res.json({text:r.rows[0].text});
    }catch(err){res.status(500).json({error:"DB error"})}
});

// Admin: headline update
app.post("/headline", async(req,res)=>{
    const { adminId, text } = req.body;
    if(Number(adminId)!==ADMIN_ID) return res.status(403).json({error:"Forbidden"});
    if(!text || !text.trim()) return res.status(400).json({error:"Empty text"});
    await pool.query("DELETE FROM headlines");
    await pool.query("INSERT INTO headlines(text) VALUES($1)",[text]);
    res.json({ok:true});
});

// Admin: data + withdraw status
app.get("/admin-data", async(req,res)=>{
    try{
        const adminId = req.query.adminId;
        if(Number(adminId)!==ADMIN_ID) return res.status(403).json({error:"Forbidden"});
        const users = (await pool.query("SELECT id,name,balance,ref_clicks,ref_success,created_at FROM users ORDER BY balance DESC")).rows;
        const withdraws = (await pool.query("SELECT id,user_id,amount_points,amount_taka,status,method,number,created_at FROM withdraws ORDER BY created_at DESC")).rows;
        const totalUsers = (await pool.query("SELECT count(*) FROM users")).rows[0].count;
        const pendingWithdraws = (await pool.query("SELECT count(*) FROM withdraws WHERE status='pending'")).rows[0].count;
        const totalBalance = (await pool.query("SELECT sum(balance) FROM users")).rows[0].sum||0;
        const totalTaka = pointsToTaka(Number(totalBalance));
        res.json({users,withdraws,stats:{totalUsers,pendingWithdraws,totalBalance:Number(totalBalance),totalTaka}});
    }catch(err){res.status(500).json({error:"server error fetching admin data"})}
});

app.post("/withdraw/status", async(req,res)=>{
    try{
        const { adminId, withdrawId, status } = req.body;
        if(Number(adminId)!==ADMIN_ID) return res.status(403).json({error:"Forbidden"});
        if(status!=='approved' && status!=='rejected') return res.status(400).json({error:"Invalid status"});
        const r = await pool.query("UPDATE withdraws SET status=$1 WHERE id=$2 RETURNING *",[status,withdrawId]);
        if(r.rowCount===0) return res.status(404).json({error:"Withdraw not found"});
        if(status==='rejected'){
            const w = r.rows[0];
            await pool.query("UPDATE users SET balance=balance+$1 WHERE id=$2",[w.amount_points,w.user_id]);
        }
        res.json({ok:true,updatedWithdraw:r.rows[0]});
    }catch(err){res.status(500).json({error:"Failed to update withdraw status"})}
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
