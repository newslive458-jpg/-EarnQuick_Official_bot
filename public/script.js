// public/script.js
const tg = window.Telegram.WebApp;
tg.expand();

const ADMIN_ID = 8145444675;
const AD_REWARD = 10;
const DAILY_BONUS = 10;
const REFERRAL_BONUS = 250;
const WITHDRAW_POINTS = 5000;

const user = tg.initDataUnsafe?.user || { id: null, first_name: "Guest" };
const userId = user.id || `guest_${Math.floor(Math.random()*1000000)}`;
const userName = user.first_name || "Guest";
const params = new URLSearchParams(window.location.search);
let referralParam = params.get("ref") || null;

// DOM
const balanceEl = document.getElementById("balance");
const greetEl = document.getElementById("greet");
const watchAdBtn = document.getElementById("watchAdBtn");
const dailyBtn = document.getElementById("dailyBtn");
const referBtn = document.getElementById("referBtn");
const withdrawBtn = document.getElementById("withdrawBtn");
const adminCard = document.getElementById("adminCard");
const loadAdminBtn = document.getElementById("loadAdmin");
const adminOutput = document.getElementById("adminOutput");
const headlineDiv = document.getElementById("headline");
const setHeadlineBtn = document.getElementById("setHeadlineBtn");
const headlineInput = document.getElementById("headlineInput");

// greeting
greetEl.innerText = `স্বাগতম, ${userName}`;

// show admin panel if admin
if (userId && Number(userId) === ADMIN_ID) adminCard.style.display = "block";

// load headline
fetch("/headline").then(r => r.json()).then(h => {
  headlineDiv.innerText = h.text || "";
});

// register user (handle referral credit once)
fetch("/register", {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({ userId, name: userName, referral: referralParam })
}).then(()=> loadUser());

// load user info
function loadUser() {
  fetch(`/user/${userId}`)
    .then(r => r.json())
    .then(data => {
      balanceEl.innerText = data.balance || 0;
    });
}

// watch ad
watchAdBtn.addEventListener("click", async () => {
  try {
    // Monetag global function (libtl) defines show_XXX; typical name: show_10070523
    if (typeof window.show_10070523 === "function") {
      await window.show_10070523();
    } else {
      // fallback simulate or notify
      if (!confirm("Ad SDK not loaded — simulate watch ad?")) throw new Error("no ad");
    }

    // on success, call server to add AD_REWARD points
    await fetch("/watch-ad", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ userId, name: userName, referral: referralParam })
    }).then(r => r.json()).then(data => {
      balanceEl.innerText = data.balance;
      alert(`আপনি পেয়েছেন ${AD_REWARD} পয়েন্ট`);
    });
  } catch (err) {
    alert("Ad failed or skipped");
    console.error(err);
  }
});

// daily login
dailyBtn.addEventListener("click", async () => {
  const res = await fetch("/claim-daily", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ userId, name: userName, referral: referralParam })
  }).then(r => r.json());

  if (res.ok) {
    alert(`Daily bonus: ${DAILY_BONUS} পয়েন্ট পেয়েছেন`);
  } else {
    alert(res.message || "Already claimed today");
  }
  loadUser();
});

// copy referral
referBtn.addEventListener("click", () => {
  // referral link points to this web app, with ?ref=userId so when new user opens register picks it up
  const link = `${window.location.origin}${window.location.pathname}?ref=${userId}`;
  navigator.clipboard.writeText(link);
  alert("Referral link copied!");
});

// withdraw
withdrawBtn.addEventListener("click", async () => {
  const res = await fetch("/withdraw", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ userId })
  }).then(r => r.json());

  if (res.ok) {
    alert(`Withdraw requested: ${res.amount_points} পয়েন্ট = ${res.amount_taka} টাকা`);
  } else {
    alert(res.message || "Withdraw failed");
  }
  loadUser();
});

// admin load data
loadAdminBtn?.addEventListener("click", async () => {
  const r = await fetch(`/admin-data?adminId=${ADMIN_ID}`).then(r => r.json());
  // render users and withdraws
  const usersHtml = r.users.map(u => `ID: ${u.id} — ${u.name || '-'} — ${u.balance} pts — ref: ${u.referrer || '-'} — last_daily: ${u.last_daily || '-'} `).join("\n");
  const withdrawsHtml = r.withdraws.map(w => `WD ID:${w.id} — user:${w.user_id} — ${w.amount_points} pts — ${w.amount_taka}৳ — status:${w.status} — at:${w.created_at}`).join("\n");
  adminOutput.innerHTML = `<h4>Users</h4><pre>${usersHtml}</pre><h4>Withdraws</h4><pre>${withdrawsHtml}</pre>`;

  // add Approve buttons after listing withdraws
  let approveButtons = '';
  r.withdraws.forEach(w => {
    if (w.status === 'pending') {
      approveButtons += `<div style="margin:8px;"><button data-wid="${w.id}" class="approveBtn">Approve WD#${w.id} (user ${w.user_id})</button></div>`;
    }
  });
  adminOutput.innerHTML += `<h4>Approve Withdraws</h4>${approveButtons}`;

  // attach click handlers
  document.querySelectorAll('.approveBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const wid = e.target.getAttribute('data-wid');
      const res = await fetch("/admin/approve-withdraw", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ adminId: ADMIN_ID, withdrawId: Number(wid) })
      }).then(r => r.json());
      if (res.ok) {
        alert("Withdraw approved");
        loadAdminBtn.click();
      } else {
        alert(res.message || "Approve failed");
      }
    });
  });
});

// admin set headline
setHeadlineBtn?.addEventListener("click", async () => {
  const txt = headlineInput.value.trim();
  if (!txt) return alert("Headline লিখুন");
  const r = await fetch("/headline", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ adminId: ADMIN_ID, text: txt })
  }).then(r => r.json());
  if (r.ok) {
    alert("Headline updated");
    fetch("/headline").then(r=>r.json()).then(h=> headlineDiv.innerText = h.text);
  } else {
    alert("Headline set failed");
  }
});
