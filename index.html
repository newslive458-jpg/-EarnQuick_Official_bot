<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>EarnQuick Mini App — @EarnQuick_Official_bot</title>

<script src="https://telegram.org/js/telegram-web-app.js"></script>

<script src='//libtl.com/sdk.js' data-zone='10070523' data-sdk='show_10070523'></script>

<style>
  /* Responsive, mobile friendly styles */
  body { font-family: 'Noto Sans', Arial, sans-serif; margin:0; background:#f3f6fb; color:#222; }
  header { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#007bff; color:#fff; position:sticky; top:0; z-index:10; }
  .brand { font-weight:700; font-size:18px; }
  .conversion { background:rgba(255,255,255,0.12); padding:6px 10px; border-radius:6px; font-weight:600; font-size:13px; }
  .headline-wrap { background:#fff3cd; padding:8px 0; overflow:hidden; border-bottom:1px solid #f0e6b8; }
  .headline { display:inline-block; white-space:nowrap; padding-left:100%; animation: ticker 18s linear infinite; font-weight:600; font-size:14px; color:#1565c0; }
  @keyframes ticker { 0% { transform: translateX(100%);} 100% { transform: translateX(-100%);} }
  main { padding:14px; max-width:720px; margin:10px auto; }
  .card { background:#fff; padding:16px; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.06); margin-bottom:12px; }
  .row { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
  .btn { flex:1 1 100%; padding:12px; border-radius:10px; border:none; font-size:16px; color:#fff; background:linear-gradient(90deg,#3498db,#1abc9c); cursor:pointer; }
  .btn.secondary { background:#6c757d; }
  .stats { display:flex; gap:12px; justify-content:center; margin-top:8px; font-weight:600; }
  .banner-ad { text-align:center; margin-top:12px; }
  footer { text-align:center; padding:10px; color:#666; font-size:13px; margin-bottom:20px; }
  /* admin output */
  #adminOutput pre { white-space:pre-wrap; font-size:13px; background:#f8f9fb; padding:8px; border-radius:6px; }
  @media(min-width:600px){ .btn { flex:1 1 45%; } }

  /* *** নতুন অ্যাড স্টাইল *** */
  /* এই স্টাইলটি নিশ্চিত করবে যে অ্যাডটি স্ক্রিনের প্রস্থের সাথে মানিয়ে যাবে */
  .adsterra-banner { max-width: 100%; overflow: hidden; } 
  .adsterra-banner iframe { max-width: 100% !important; height: auto !important; }

</style>
</head>
<body>
<header>
  <div class="brand">💰 EarnQuickOfficial</div>
  <div class="conversion">5000 পয়েন্ট = 20 টাকা</div>
</header>

<div class="headline-wrap"><div id="headline" class="headline">Loading headline...</div></div>

<main>
  <div class="banner-ad" id="topBanner">
    <div class="adsterra-banner">
      <script type="text/javascript">
        // Ad Options পরিবর্তন করে 320x50 (মোবাইল সাইজ) বা 728x90 (ডেস্কটপ) করা হয়েছে
        // আপনি যদি Adsterra থেকে "Responsive" বা "Native Banner" কোড নেন, তাহলে আরও ভালো হবে।
        // আপাতত ফিক্সড কোডের মধ্যে পরিবর্তন করা হলো:
        atOptions = {'key':'00605022df81b880d400151bfc7c2185','format':'iframe','height':50,'width':320,'params':{}};
      </script>
      <script type="text/javascript" src="//brillianceremisswhistled.com/00605022df81b880d400151bfc7c2185/invoke.js"></script>
    </div>
  </div>

  <div class="card">
    <h3 id="greet">স্বাগতম</h3>
    <p>তোমার ব্যালান্স: <b id="balance">0</b> পয়েন্ট</p>

    <div class="row">
      <button id="watchAdBtn" class="btn">🎬 Watch Ad (+10)</button>
      <button id="dailyBtn" class="btn secondary">📅 Daily (+10)</button>
      <button id="referBtn" class="btn">🔗 Copy Referral</button>
      <button id="withdrawBtn" class="btn">💸 Withdraw</button>
    </div>

    <div class="stats">
      <div>Referrals: <span id="refSuccess">0</span></div>
      <div>Clicks: <span id="refClicks">0</span></div>
    </div>
  </div>

  <div id="adminCard" class="card" style="display:none">
    <h3>⚙️ Admin Panel</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button id="loadAdmin" class="btn">🔁 Load Data</button>
      <button id="refreshHeadline" class="btn secondary">🔄 Reload Headline</button>
    </div>

    <div style="margin-top:12px">
      <input id="headlineInput" placeholder="নতুন হেডলাইন লিখুন" style="width:70%;padding:8px;border-radius:6px;border:1px solid #ddd" />
      <button id="setHeadlineBtn" class="btn">📝 Set Headline</button>
    </div>

    <div id="adminOutput" style="margin-top:12px"></div>
  </div>

  <div class="banner-ad" id="bottomBanner">
    <div class="adsterra-banner">
      <script type="text/javascript">
        atOptions = {'key':'00605022df81b880d400151bfc7c2185','format':'iframe','height':50,'width':320,'params':{}};
      </script>
      <script type="text/javascript" src="//brillianceremisswhistled.com/00605022df81b880d400151bfc7c2185/invoke.js"></script>
    </div>
  </div>
</main>

<footer>© 2025 EarnQuickOfficial — Bot: @EarnQuick_Official_bot</footer>

<script>
/* Frontend logic */
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.setText("📋 Menu");
tg.MainButton.show();

const ADMIN_ID = 8145444675;
const AD_REWARD = 10;

const user = tg.initDataUnsafe?.user || { id: null, first_name: "Guest" };
const userId = user.id || `guest_${Math.floor(Math.random()*1000000)}`;
const userName = user.first_name || "Guest";

const balanceEl = document.getElementById("balance");
const greetEl = document.getElementById("greet");
const refSuccessEl = document.getElementById("refSuccess");
const refClicksEl = document.getElementById("refClicks");
const adminCard = document.getElementById("adminCard");

greetEl.innerText = `স্বাগতম, ${userName}`;
if (user.id && Number(user.id) === ADMIN_ID) adminCard.style.display = "block";

// load headline
async function loadHeadline(){
  try {
    const r = await fetch("/headline");
    const j = await r.json();
    document.getElementById("headline").innerText = j.text || "";
  } catch (e) { console.error(e); }
}
loadHeadline();

// load user info
async function loadUser(){
  try {
    const r = await fetch(`/user/${userId}`);
    const j = await r.json();
    balanceEl.innerText = j.balance || 0;
    refSuccessEl.innerText = j.ref_success || 0;
    refClicksEl.innerText = j.ref_clicks || 0;
  } catch (e) { console.error(e); }
}
loadUser();

// register (if referral present)
(function tryRegisterFromUrl(){
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") || null;
  if (ref) {
    // track click immediately and call register when app opens (server-side)
    fetch("/ref-click", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ refId: ref }) }).catch(()=>{});
    // store ref in localStorage so when user completes register flow we can send it
    localStorage.setItem("ref_from", ref);
  }

  // call register on server to process new user and referral once
  const storedRef = localStorage.getItem("ref_from");
  fetch("/register", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId, name: userName, referral: storedRef }) })
    .then(()=> {
      localStorage.removeItem("ref_from");
      loadUser();
    }).catch(()=>{});
})();

// watch ad button
document.getElementById("watchAdBtn").addEventListener("click", async () => {
  try {
    // call Monetag SDK; expected function name show_10070523
    if (typeof window.show_10070523 === "function") {
      await window.show_10070523();
    } else {
      // fallback: open confirm if SDK missing
      if (!confirm("Ad SDK not loaded — simulate ad watch?")) throw new Error("no ad");
    }

    // after ad success -> notify server
    const res = await fetch("/watch-ad", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId, name: userName }) });
    const json = await res.json();
    if (json.balance !== undefined) {
      balanceEl.innerText = json.balance;
      alert(`✅ You earned ${AD_REWARD} points`);
    } else {
      alert("⚠️ Coin update failed");
    }
  } catch (err) {
    console.error(err);
    alert("Ad failed or skipped");
  }
});

// daily button
document.getElementById("dailyBtn").addEventListener("click", async () => {
  const res = await fetch("/claim-daily", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId })});
  const j = await res.json();
  if (j.ok) { alert(`Daily bonus ${j.bonus} added`); loadUser(); } else alert(j.message || "Failed");
});

// copy referral
document.getElementById("referBtn").addEventListener("click", () => {
  const refLink = `${window.location.origin}${window.location.pathname}?ref=${userId}`;
  navigator.clipboard.writeText(refLink);
  alert("Referral link copied — others must open this link to count as referral");
});

// withdraw
document.getElementById("withdrawBtn").addEventListener("click", async () => {
  const res = await fetch("/withdraw", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId })});
  const j = await res.json();
  if (j.ok) { alert(`Withdraw requested: ${j.amount_points} points = ${j.amount_taka}৳`); loadUser(); }
  else alert(j.message || "Withdraw failed");
});

// Admin: load data & approve withdraws & set headline
document.getElementById("loadAdmin")?.addEventListener("click", async () => {
  const r = await fetch(`/admin-data?adminId=${ADMIN_ID}`);
  if (!r.ok) return alert("Forbidden or server error");
  const j = await r.json();
  // show users & withdraws
  let out = "<h4>Users</h4><pre>";
  out += j.users.map(u => `ID:${u.id} — ${u.name||'-'} — ${u.balance} pts — clicks:${u.ref_clicks} — success:${u.ref_success}`).join("\n");
  out += "</pre><h4>Withdraws</h4><pre>";
  out += j.withdraws.map(w => `WD#${w.id} — user:${w.user_id} — ${w.amount_points} pts — ${w.amount_taka}৳ — status:${w.status}`).join("\n");
  out += "</pre>";

  // generate approve buttons for pending withdraws
  let approveHtml = "";
  j.withdraws.forEach(w => {
    if (w.status === "pending") approveHtml += `<div style="margin:8px 0"><button class="btn approveBtn" data-id="${w.id}">Approve WD#${w.id} (user ${w.user_id})</button></div>`;
  });

  document.getElementById("adminOutput").innerHTML = out + approveHtml;

  // attach approve handlers
  document.querySelectorAll(".approveBtn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const wid = e.target.getAttribute("data-id");
      const res = await fetch("/admin/approve-withdraw", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ adminId: ADMIN_ID, withdrawId: Number(wid) })});
      const j2 = await res.json();
      if (j2.ok) { alert("Approved"); document.getElementById("loadAdmin").click(); } else alert(j2.message || "Failed");
    });
  });
});

// set headline
document.getElementById("setHeadlineBtn")?.addEventListener("click", async () => {
  const txt = document.getElementById("headlineInput").value.trim();
  if (!txt) return alert("Headline লিখুন");
  const r = await fetch("/headline", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ adminId: ADMIN_ID, text: txt })});
  const j = await r.json();
  if (j.ok) { alert("Headline set"); loadHeadline(); } else alert(j.error || "Failed");
});

// refresh headline
document.getElementById("refreshHeadline")?.addEventListener("click", loadHeadline);

</script>
</body>
</html>
