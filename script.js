// script.js (চূড়ান্ত ফ্রন্টএন্ড লজিক)
const API_URL = window.location.origin; // Dynamically gets the Render URL

// Telegram Mini App Initialization
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.MainButton.hide();

// User data retrieval from Telegram
const userId = tg.initDataUnsafe.user?.id;
const userName = tg.initDataUnsafe.user?.first_name || 'User';

// Referral Check
const urlParams = new URLSearchParams(window.location.search);
const referrerId = urlParams.get('ref');

// DOM Elements
const balanceDisplay = document.getElementById('balanceDisplay');
const headlineText = document.getElementById('headlineText');
const watchAdButton = document.getElementById('watchAdButton');
const dailyBonusButton = document.getElementById('dailyBonusButton');
const copyRefButton = document.getElementById('copyRefButton');
const withdrawButton = document.getElementById('withdrawButton');
const refSuccessDisplay = document.getElementById('refSuccess');
const refClicksDisplay = document.getElementById('refClicks');

// Helper function to update UI
function updateUI(balance, refClicks, refSuccess) {
    const taka = ((balance / 5000) * 20).toFixed(2);
    balanceDisplay.textContent = `${balance} পয়েন্ট = ${taka} টাকা`;
    refClicksDisplay.textContent = refClicks;
    refSuccessDisplay.textContent = refSuccess;
}

// 1. Initial User Registration/Load
async function initializeApp() {
    if (!userId) {
        tg.showAlert('Error: Telegram User ID not found.');
        return;
    }

    try {
        // Register/Check User
        await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, name: userName, referral: referrerId })
        });

        // Fetch User Info
        const userRes = await fetch(`${API_URL}/user/${userId}`);
        const userData = await userRes.json();
        updateUI(userData.balance || 0, userData.ref_clicks || 0, userData.ref_success || 0);

        // Fetch Headline
        const headlineRes = await fetch(`${API_URL}/headline`);
        const headlineData = await headlineRes.json();
        headlineText.textContent = headlineData.text;

        // Track Ref Click (if applicable)
        if (referrerId && String(referrerId) !== String(userId)) {
            await fetch(`${API_URL}/ref-click`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refId: referrerId })
            });
        }

    } catch (error) {
        tg.showAlert('Error: Failed to load app data. Check server connection.');
    }
}

// 2. Watch Ad Logic (Mini App Integration)
watchAdButton.addEventListener('click', async () => {
    if (!tg.isTMA) { // Check if running inside Telegram
        tg.showAlert('This action can only be performed inside Telegram Mini App.');
        return;
    }
    
    // Check if the showRewardedVideo method exists
    if (!tg.showRewardedVideo) {
        tg.showAlert('Error: Rewarded Video feature not available in this Telegram client.');
        return;
    }

    // THIS IS THE CORRECT WAY TO CALL TELEGRAM REWARDED VIDEO
    tg.showRewardedVideo(() => {
        // This callback is executed ONLY when the ad is CLOSED (skipped or watched)
    }, async (success) => {
        // This success callback is executed ONLY when the ad is SUCCESSFULLY WATCHED
        if (success) {
            try {
                const res = await fetch(`${API_URL}/watch-ad`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, name: userName, referral: referrerId })
                });
                const data = await res.json();
                if (data.balance !== undefined) {
                    // Update balance after successful watch
                    updateUI(data.balance, Number(refClicksDisplay.textContent), Number(refSuccessDisplay.textContent));
                    tg.showPopup({ message: 'Success! You earned 10 points.' });
                } else {
                    tg.showAlert('Server Error: Could not update points.');
                }
            } catch (error) {
                tg.showAlert('Network Error: Failed to award points.');
            }
        } else {
            // This is the primary reason for "Ad failed or skipped" popup
            // It means the user skipped, ad provider failed, or another issue.
            tg.showAlert('Ad failed or skipped');
        }
    });
});

// 3. Daily Bonus Logic
dailyBonusButton.addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_URL}/claim-daily`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        const data = await res.json();

        if (data.ok) {
            // Refetch user data to get updated balance and last_daily time
            const userRes = await fetch(`${API_URL}/user/${userId}`);
            const userData = await userRes.json();
            updateUI(userData.balance, userData.ref_clicks, userData.ref_success);
            tg.showPopup({ message: `Daily Bonus claimed! You earned ${data.bonus} points.` });
        } else {
            tg.showAlert(data.message);
        }
    } catch (error) {
        tg.showAlert('Network Error: Could not claim daily bonus.');
    }
});

// 4. Copy Referral Logic
copyRefButton.addEventListener('click', () => {
    const refLink = `${API_URL}/?ref=${userId}`;
    if (tg.isClipboardAvailable) {
        tg.copyText(refLink);
        tg.showPopup({ message: 'Referral link copied to clipboard!' });
    } else {
        // Fallback for older clients
        navigator.clipboard.writeText(refLink).then(() => {
            tg.showPopup({ message: 'Referral link copied to clipboard!' });
        }).catch(() => {
            tg.showAlert(`Copy manually: ${refLink}`);
        });
    }
});

// 5. Withdraw Logic
withdrawButton.addEventListener('click', () => {
    tg.showConfirm('Confirm withdrawal of 5000 points (20 Taka)?', async (confirmed) => {
        if (confirmed) {
            try {
                const res = await fetch(`${API_URL}/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId }) // Add method/account if needed later
                });
                const data = await res.json();
                
                if (data.ok) {
                    tg.showAlert(`Withdrawal requested! ${data.amount_points} points deducted. Status: Pending.`);
                    // Optionally refetch user data to update balance
                } else {
                    tg.showAlert(`Withdraw failed: ${data.message}`);
                }
            } catch (error) {
                tg.showAlert('Network Error: Could not process withdrawal.');
            }
        }
    });
});

initializeApp();
