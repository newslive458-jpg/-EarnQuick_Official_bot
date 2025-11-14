// server.js (চূড়ান্ত সংশোধিত কোড)
import express from "express";
import cors from "cors";
import pool from "./db.js"; 
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// **FINAL CORS CONFIGURATION: Allow all origins to prevent 'Failed to fetch' error**
app.use(cors()); 

app.use(express.json());

// Path configuration 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------- Root Route: Prevent Front-end File Search -----------------
app.get("/", (req, res) => {
    // নিশ্চিত করুন যে সার্ভারটি লাইভ (Live) আছে 
    res.send("EarnQuick API Server is running. Access the Mini App via Telegram.");
});
// -----------------------------------------------------------------------------


// ----- CONFIG (Your Admin ID and Rewards) -----
const ADMIN_ID = 8145444675; // আপনার Telegram User ID
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
  
    // Insert initial headline if none exists
    const NEW_HEADLINE = "💰 বর্তমান আপডেট: প্রতি রেফারে ২৫০ পয়েন্ট নিশ্চিত। দৈনিক বোনাস সক্রিয়! উইথড্রয়াল প্রসেসিং (সকাল ৬টা - রাত ৮টা)। সহায়তার জন্য যোগাযোগ: 01913621510।";
    
    const r = await pool.query("SELECT count(*) FROM headlines");
    if (Number(r.rows[0].count) === 0) {
      await pool.query(
        "INSERT INTO headlines (text) VALUES ($1)",
        [NEW_HEADLINE] 
      );
    }
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("DB init error: DATABASE CONNECTION FAILED. Check DATABASE_URL in Render.", err.message);
  }
})();

// ----------------- API ROUTES START -----------------

// R1: User Data (GET)
app.get("/user/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("User Data DB Error:", err);
        res.status(500).json({ error: "server error fetching user data" }); 
    }
});

// R2: Register User (POST)
app.post("/register", async (req, res) => {
    try {
        const { id, name, referrer } = req.body;
        
        await pool.query(
            "INSERT INTO users (id, name, referrer) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
            [id, name, referrer]
        );

        if (referrer && Number(referrer) !== id) {
            const referrerId = Number(referrer);
            
            await pool.query(
                "UPDATE users SET ref_clicks = ref_clicks + 1 WHERE id = $1", 
                [referrerId]
            );

            const referrerExists = await pool.query("SELECT id FROM users WHERE id = $1", [referrerId]);

            if (referrerExists.rowCount > 0) {
                 await pool.query(
                    "UPDATE users SET balance = balance + $1, ref_success = ref_success + 1 WHERE id = $2",
                    [REF_BONUS, referrerId]
                );
            }
        }

        res.json({ ok: true, message: "User registered/verified." });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Registration failed." });
    }
});

// R3: Watch Ad (POST)
app.post("/watch-ad", async (req, res) => {
    try {
        const { userId } = req.body;
        const result = await pool.query(
            "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
            [AD_REWARD, userId]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
        res.json({ ok: true, newBalance: result.rows[0].balance });
    } catch (err) {
        res.status(500).json({ error: "Ad reward failed." });
    }
});

// R4: Claim Daily Bonus (POST)
app.post("/claim-daily", async (req, res) => {
    try {
        const { userId } = req.body;
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const checkResult = await pool.query("SELECT last_daily FROM users WHERE id = $1", [userId]);
        
        if (checkResult.rowCount === 0) return res.status(404).json({ error: "User not found" });

        const lastDaily = checkResult.rows[0].last_daily;
        
        if (lastDaily && new Date(lastDaily) > oneDayAgo) {
            return res.status(400).json({ error: "Daily bonus already claimed within 24 hours." });
        }

        const updateResult = await pool.query(
            "UPDATE users SET balance = balance + $1, last_daily = NOW() WHERE id = $2 RETURNING balance",
            [DAILY_BONUS, userId]
        );

        res.json({ ok: true, newBalance: updateResult.rows[0].balance });
    } catch (err) {
        res.status(500).json({ error: "Daily claim failed." });
    }
});


// R5: Withdraw Request (POST)
app.post("/withdraw", async (req, res) => {
    try {
        const { userId, amountPoints, method, number } = req.body;
        
        if (amountPoints < WITHDRAW_POINTS) return res.status(400).json({ error: `Minimum withdrawal is ${WITHDRAW_POINTS} points.` });

        const userResult = await pool.query("SELECT balance FROM users WHERE id = $1", [userId]);
        if (userResult.rowCount === 0) return res.status(404).json({ error: "User not found" });
        if (userResult.rows[0].balance < amountPoints) return res.status(400).json({ error: "Insufficient balance." });

        const amountTaka = pointsToTaka(amountPoints);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            await client.query(
                "UPDATE users SET balance = balance - $1 WHERE id = $2", 
                [amountPoints, userId]
            );

            await client.query(
                "INSERT INTO withdraws (user_id, amount_points, amount_taka, method, number) VALUES ($1, $2, $3, $4, $5)",
                [userId, amountPoints, amountTaka, method, number]
            );

            await client.query('COMMIT');
            res.json({ ok: true });

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Withdraw Error:", err);
        res.status(500).json({ error: "Withdrawal request failed." });
    }
});


// R6: Get Headline (GET)
app.get("/headline", async (req, res) => {
    try {
        const result = await pool.query("SELECT text FROM headlines ORDER BY updated_at DESC LIMIT 1");
        if (result.rowCount === 0) {
             return res.json({ text: "কোনো হেডলাইন নেই।" });
        }
        res.json({ text: result.rows[0].text });
    } catch (err) {
        res.status(500).json({ error: "DB error" });
    }
});


// ----------------- ADMIN PANEL ROUTES START -----------------

// Admin data (users + withdraws + monitoring stats)
app.get("/admin-data", async (req, res) => {
  try {
    const adminId = req.query.adminId;
    if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden: You are not the admin." });

    const users = (await pool.query("SELECT id, name, balance, ref_clicks, ref_success, created_at FROM users ORDER BY balance DESC")).rows;
    const withdraws = (await pool.query("SELECT id, user_id, amount_points, amount_taka, status, method, number, created_at FROM withdraws ORDER BY created_at DESC")).rows;

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
    console.error("ADMIN DATA FETCH ERROR: ", err);
    res.status(500).json({ error: "server error fetching admin data" }); 
  }
});

// admin: set headline 
app.post("/headline", async (req, res) => {
  const { adminId, text } = req.body;
  if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });
  if (!text || !text.trim()) return res.status(400).json({ error: "Empty text" });
  
  await pool.query("DELETE FROM headlines");
  await pool.query("INSERT INTO headlines (text) VALUES ($1)", [text]);
  res.json({ ok: true });
});

// admin: update withdraw status
app.post("/withdraw/status", async (req, res) => {
    try {
        const { adminId, withdrawId, status } = req.body;
        if (Number(adminId) !== ADMIN_ID) return res.status(403).json({ error: "Forbidden" });
        if (status !== 'approved' && status !== 'rejected') return res.status(400).json({ error: "Invalid status." });

        const result = await pool.query(
            "UPDATE withdraws SET status = $1 WHERE id = $2 RETURNING *",
            [status, withdrawId]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: "Withdraw request not found." });

        if (status === 'rejected') {
            const withdraw = result.rows[0];
            await pool.query(
                "UPDATE users SET balance = balance + $1 WHERE id = $2",
                [withdraw.amount_points, withdraw.user_id]
            );
        }

        res.json({ ok: true, updatedWithdraw: result.rows[0] });

    } catch (err) {
        console.error("Status update error:", err);
        res.status(500).json({ error: "Failed to update withdraw status." });
    }
});


// ----------------- ADMIN PANEL ROUTES END -----------------


// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
