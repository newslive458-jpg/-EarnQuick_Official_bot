import { MONETAG_ZONE_ID, TELEGRAM_ADMIN_ID, WITHDRAW_POINTS, WITHDRAW_METHODS } from '../config/config.js';

// User data
let userId = null;
let userData = {};

// Telegram init
if (Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
    userId = Telegram.WebApp.initDataUnsafe.user.id;
    Telegram.WebApp.ready();
}

// Display error
function displayError(msg) {
    alert(msg);
}

// Points to Taka
function pointsToTaka(points) {
    return Number(((points / WITHDRAW_POINTS) * 20).toFixed(2));
}

// Monetag ad
function watchAd() {
    show_10070523().then(() => {
        console.log('User watched the ad');
        userData.balance += 10;
        updateDashboard();
        alert('বিজ্ঞাপন দেখা সফল! 10 পয়েন্ট যোগ হয়েছে।');
    }).catch(() => {
        console.log('Ad failed or skipped');
    });
}

// Update Dashboard
function updateDashboard() {
    document.getElementById('balance').textContent = userData.balance + ' পয়েন্ট';
    document.getElementById('taka-equivalent').textContent = pointsToTaka(userData.balance) + ' টাকা';
}

// Daily bonus
function claimDaily() {
    const lastDaily = userData.last_daily ? new Date(userData.last_daily) : null;
    const ONE_DAY_MS = 24*60*60*1000;
    if (lastDaily && (new Date() - lastDaily) < ONE_DAY_MS) {
        alert('দৈনিক বোনাস ইতিমধ্যেই গ্রহণ করা হয়েছে।');
        return;
    }
    userData.balance += 10;
    userData.last_daily = new Date();
    updateDashboard();
    alert('দৈনিক বোনাস সফল! 10 পয়েন্ট যোগ হয়েছে।');
}

// Withdraw
function sendWithdraw() {
    const method = document.getElementById('withdraw-method').value;
    const number = document.getElementById('withdraw-number').value;

    if (!method || !number) return alert('উইথড্র মেথড এবং নম্বর দিন।');
    if (userData.balance < WITHDRAW_POINTS) return alert(`আপনার ব্যালেন্স ${WITHDRAW_POINTS} পয়েন্টের কম।`);

    userData.balance -= WITHDRAW_POINTS;
    updateDashboard();
    alert('উইথড্র রিকোয়েস্ট পাঠানো হয়েছে।');
}

// Referral Link
function generateReferral() {
    const botUsername = Telegram.WebApp.initDataUnsafe.user.username || 'earnquick_official_bot';
    return `https://t.me/${botUsername}?start=ref${userId}`;
}

// Initialize Dashboard
function initDashboard() {
    userData = {
        balance: 0,
        last_daily: null,
        ref_clicks: 0,
        ref_success: 0,
    };
    updateDashboard();
    document.getElementById('ref-link').textContent = generateReferral();
}

// Run initialization
initDashboard();
