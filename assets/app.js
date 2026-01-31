/* ========================================
   TEKA-TEKI HAFIDZ - MAIN APPLICATION
   Islamic Quiz Game for Children
======================================== */

// ========================================
// STATE MANAGEMENT
// ========================================

let currentUser = null;
let currentRole = null;
let currentChild = null;
let currentParent = null;
let gameState = {
    questions: [],
    currentIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    timer: null,
    timeLeft: 30,
    difficulty: 'easy'
};

// ========================================
// GAMIFICATION - SOUNDS, COMBO, MESSAGES
// ========================================

// Sound Effects (using Web Audio API for child-friendly sounds)
const gameSounds = {
    correct: null,
    combo: null,
    levelUp: null,
    wrong: null
};

// Initialize sounds with base64 encoded short beeps (no external files needed)
function initSounds() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gameSounds.audioContext = audioContext;
        gameSounds.initialized = true;
    } catch (e) {
        console.log('Audio not supported');
        gameSounds.initialized = false;
    }
}

function playSound(type) {
    if (!gameSounds.initialized) initSounds();
    if (!gameSounds.audioContext) return;

    const ctx = gameSounds.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Different sounds for different events
    switch (type) {
        case 'correct':
            oscillator.frequency.value = 523.25; // C5
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.3);
            break;
        case 'combo':
            // Ascending notes for combo
            [523, 659, 784].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.15);
                osc.start(ctx.currentTime + i * 0.1);
                osc.stop(ctx.currentTime + i * 0.1 + 0.15);
            });
            break;
        case 'levelUp':
            // Celebratory ascending scale
            [261, 329, 392, 523, 659, 784].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
                osc.start(ctx.currentTime + i * 0.08);
                osc.stop(ctx.currentTime + i * 0.08 + 0.2);
            });
            break;
        case 'wrong':
            oscillator.frequency.value = 200;
            gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.2);
            break;
    }
}

// Motivational Messages (Islami & Personal)
const motivationalMessages = {
    correct: [
        "MasyaAllah, hebat sekali! 🌟",
        "SubhanAllah! Hafalanmu mantap! 💪",
        "Allahu Akbar! Terus semangat! 🚀",
        "Tabarakallah! Lanjutkan! ⭐",
        "Barakallah! Kamu pintar! 🎉",
        "MasyaAllah, luar biasa! 🏆",
        "Alhamdulillah, benar! 😊",
        "Keren banget! Ayo terus! 🔥",
        "Hafalan kamu bagus sekali! 💫",
        "Semangat terus ya! 🌈"
    ],
    combo: [
        "COMBO x{streak}! 🔥",
        "WOW! {streak}x COMBO! ⚡",
        "ON FIRE! 🔥🔥🔥",
        "LUAR BIASA! COMBO {streak}! 💥",
        "AMAZING! {streak} BERTURUT! ⭐"
    ],
    levelUp: [
        "SELAMAT! Level naik! 🎉",
        "HEBAT! Kamu naik level! 🏆",
        "MANTAP! Level baru! 🚀"
    ]
};

function getMotivationalMessage(type, streak = 0) {
    const messages = motivationalMessages[type];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Replace placeholders
    let message = randomMessage.replace('{streak}', streak);
    if (currentChild && currentChild.name) {
        message = message.replace('{name}', currentChild.name);
    }
    return message;
}

// Show Combo Popup
function showComboPopup(streak) {
    if (streak < 3) return; // Only show for streak 3+

    playSound('combo');

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'combo-popup';

    let comboClass = 'combo-3';
    let comboText = `COMBO x${streak}! 🔥`;

    if (streak >= 10) {
        comboClass = 'combo-10';
        comboText = `🔥 ON FIRE x${streak}! 🔥`;
    } else if (streak >= 5) {
        comboClass = 'combo-5';
        comboText = `⚡ COMBO x${streak}! ⚡`;
    }

    popup.innerHTML = `<div class="combo-text ${comboClass}">${comboText}</div>`;
    document.body.appendChild(popup);

    // Screen shake for high combo
    if (streak >= 5) {
        document.body.classList.add('screen-shake');
        setTimeout(() => document.body.classList.remove('screen-shake'), 400);
    }

    // Remove popup after animation
    setTimeout(() => popup.remove(), 800);
}

// Create Confetti
function createConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        container.appendChild(confetti);
    }

    // Remove after animation
    setTimeout(() => container.remove(), 4000);
}

// Show Level Up Modal
function showLevelUpModal(newLevel, badgeName = null) {
    playSound('levelUp');
    createConfetti();

    const modal = document.createElement('div');
    modal.className = 'level-up-modal';
    modal.onclick = () => modal.remove();

    let badgeHTML = '';
    if (badgeName) {
        badgeHTML = `<div class="level-up-badge">${badgeName}</div>`;
    }

    modal.innerHTML = `
        <div class="level-up-content" onclick="event.stopPropagation()">
            <h2>🎉 LEVEL UP! 🎉</h2>
            <div class="level-number">Level ${newLevel}</div>
            ${badgeHTML}
            <p>${getMotivationalMessage('levelUp')}</p>
            <button class="btn-play" onclick="this.closest('.level-up-modal').remove()">
                <i class="fas fa-check"></i> Mantap!
            </button>
        </div>
    `;

    document.body.appendChild(modal);
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupAvatarSelector();
});

function initApp() {
    // Check if user is already logged in
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in (Parent)
                checkUserRole(user);
            } else {
                // No Firebase user. Check if we have a local child session
                const savedSession = localStorage.getItem('tekateki_session');
                if (savedSession) {
                    const session = JSON.parse(savedSession);
                    if (session.role === 'child') {
                        // Restore child session
                        reloadChildSession(session.data);
                        return;
                    }
                }
                showScreen('login-screen');
            }
        });
    } else {
        // Firebase not configured, use local storage
        const savedSession = localStorage.getItem('tekateki_session');
        if (savedSession) {
            const session = JSON.parse(savedSession);
            if (session.role === 'child') {
                currentChild = session.data;
                currentRole = 'child';
                showChildGame();
            } else if (session.role === 'parent') {
                currentParent = session.data;
                currentRole = 'parent';
                showParentDashboard();
            }
        } else {
            showScreen('login-screen');
        }
    }
}

async function checkUserRole(user) {
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const userData = doc.data();
            if (userData.role === 'parent') {
                currentParent = { uid: user.uid, ...userData };
                currentRole = 'parent';
                showParentDashboard();
            }
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        showScreen('login-screen');
    }
}

// ========================================
// SCREEN MANAGEMENT
// ========================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function selectRole(role) {
    const childForm = document.getElementById('child-login-form');
    const parentForm = document.getElementById('parent-login-form');
    const registerForm = document.getElementById('parent-register-form');
    const roleSelector = document.querySelector('.role-selector');

    // Reset all forms
    childForm.classList.add('hidden');
    parentForm.classList.add('hidden');
    registerForm.classList.add('hidden');

    // Remove active class from buttons
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));

    if (role === 'child') {
        roleSelector.style.display = 'none';
        childForm.classList.remove('hidden');
        document.getElementById('btn-role-child').classList.add('active');
    } else if (role === 'parent') {
        roleSelector.style.display = 'none';
        parentForm.classList.remove('hidden');
        document.getElementById('btn-role-parent').classList.add('active');
    } else {
        roleSelector.style.display = 'grid';
    }
}

function showRegisterParent() {
    document.getElementById('parent-login-form').classList.add('hidden');
    document.getElementById('parent-register-form').classList.remove('hidden');
}

function showLoginParent() {
    document.getElementById('parent-register-form').classList.add('hidden');
    document.getElementById('parent-login-form').classList.remove('hidden');
}

// ========================================
// AUTHENTICATION - CHILD
// ========================================

async function loginChild() {
    const username = document.getElementById('child-username').value.trim();
    const pin = document.getElementById('child-pin').value.trim();

    if (!username || !pin) {
        showToast('Masukkan username dan PIN!', 'error');
        return;
    }

    showLoading(true);

    try {
        if (typeof db !== 'undefined' && db) {
            // Firebase login
            const snapshot = await db.collection('children')
                .where('username', '==', username)
                .where('pin', '==', pin)
                .get();

            if (snapshot.empty) {
                showToast('Username atau PIN salah!', 'error');
                showLoading(false);
                return;
            }

            const childDoc = snapshot.docs[0];
            currentChild = { id: childDoc.id, ...childDoc.data() };
        } else {
            // Local storage
            const children = JSON.parse(localStorage.getItem('tekateki_children') || '[]');
            const child = children.find(c => c.username === username && c.pin === pin);

            if (!child) {
                showToast('Username atau PIN salah!', 'error');
                showLoading(false);
                return;
            }

            currentChild = child;
        }

        currentRole = 'child';

        // Save session
        localStorage.setItem('tekateki_session', JSON.stringify({
            role: 'child',
            data: currentChild
        }));

        await showChildGame();
        showToast('Assalamualaikum, ' + currentChild.name + '! 👋', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showToast('Terjadi kesalahan. Coba lagi!', 'error');
    }

    showLoading(false);
}

function logoutChild() {
    currentChild = null;
    currentRole = null;
    localStorage.removeItem('tekateki_session');
    resetGameState();
    showScreen('login-screen');
    selectRole(null);

    // Clear form
    document.getElementById('child-username').value = '';
    document.getElementById('child-pin').value = '';
}

async function showChildGame() {
    showScreen('child-game-screen');

    // Update display
    document.getElementById('display-child-name').textContent = currentChild.name;
    document.getElementById('child-avatar').textContent = currentChild.avatar || '👶';

    // Update Level in Header
    const currentLevel = currentChild.level || 1;
    document.getElementById('current-level').textContent = currentLevel;

    // Calculate and Update Total Score in Header (async)
    let totalScore = 0;
    if (typeof db !== 'undefined' && db && currentChild.id) {
        try {
            const scoresSnapshot = await db.collection('scores')
                .where('childId', '==', currentChild.id)
                .get();
            scoresSnapshot.forEach(doc => {
                totalScore += doc.data().score || 0;
            });
        } catch (error) {
            console.error('Error loading total score:', error);
            // Fallback to localStorage
            const scores = JSON.parse(localStorage.getItem('tekateki_scores') || '[]');
            totalScore = scores.filter(s => s.childId === currentChild.id)
                .reduce((total, s) => total + s.score, 0);
        }
    } else {
        // Local storage
        const scores = JSON.parse(localStorage.getItem('tekateki_scores') || '[]');
        totalScore = scores.filter(s => s.childId === currentChild.id)
            .reduce((total, s) => total + s.score, 0);
    }
    const totalScoreElement = document.getElementById('total-score-header');
    totalScoreElement.textContent = totalScore;
    totalScoreElement.setAttribute('data-previous-total', totalScore); // Save untuk realtime update

    // Show assigned juz
    const juzBadges = document.getElementById('juz-badges');
    juzBadges.innerHTML = '';

    const assignedJuz = currentChild.assignedJuz || [30];
    assignedJuz.forEach(juz => {
        const badge = document.createElement('span');
        badge.className = 'juz-badge';
        badge.textContent = `Juz ${juz}`;
        juzBadges.appendChild(badge);
    });

    // Display Level in card
    document.getElementById('difficulty-info').innerHTML =
        `<span class="badge badge-level">Level ${currentLevel}</span>`;

    // Show Badges/Achievements
    checkAndShowBadges(); // Tampilkan badge level (tanpa button riwayat)
    // renderAchievements(); // CONFLICT: Overwrites Level Badges. Disabled to show 3D Level Badges.

    // Show/hide Voice Mode button based on child setting
    const voiceModeBtn = document.getElementById('voice-mode-btn');
    if (voiceModeBtn) {
        // Show if voiceEnabled is true, otherwise hide
        voiceModeBtn.style.display = currentChild?.voiceEnabled ? 'flex' : 'none';
    }

    showGameCard('game-mode-select');
}

function renderAchievements() {
    const list = document.getElementById('achievements-list');
    if (!list) return; // Guard clause

    if (!currentChild || !currentChild.hafalanProgress) {
        list.innerHTML = '<p class="empty-state-small">Belum ada surah yang hafal lengkap. Ayo main!</p>';
        return;
    }

    const attempts = currentChild.hafalanProgress;
    let badges = [];

    for (const [surahNum, data] of Object.entries(attempts)) {
        if (data.isCompleted) {
            badges.push(data);
        }
    }

    if (badges.length === 0) {
        list.innerHTML = '<p class="empty-state-small">Belum ada surah yang hafal lengkap. Ayo main!</p>';
        return;
    }

    list.innerHTML = badges.map(b => `
        <div class="achievement-badge unlocked">
            <i class="fas fa-medal"></i>
            <span>${b.surahName}</span>
        </div>
    `).join('');
}

async function reloadChildSession(childData) {
    // Reload fresh data from DB if possible
    if (typeof db !== 'undefined' && db && childData.id) {
        try {
            const doc = await db.collection('children').doc(childData.id).get();
            if (doc.exists) {
                currentChild = { id: doc.id, ...doc.data() };
            } else {
                currentChild = childData;
            }
        } catch (e) {
            currentChild = childData;
        }
    } else {
        currentChild = childData;
    }
    currentRole = 'child';
    showChildGame();
    showToast('Selamat datang kembali, ' + currentChild.name + '!', 'success');
}

function checkAndShowBadges() {
    const level = currentChild.level || 1;

    // Use the existing Achievements Grid Container from HTML
    // (This container is defined in index.html with id='achievements-list')
    let levelBadgesContainer = document.getElementById('achievements-list');

    // Safety fallback: if for some reason the HTML doesn't have it (e.g. cache issue), create it
    if (!levelBadgesContainer) {
        // Try to find the section wrapper
        const section = document.getElementById('achievements-section');
        if (section) {
            levelBadgesContainer = document.createElement('div');
            levelBadgesContainer.id = 'achievements-list';
            levelBadgesContainer.className = 'achievements-list';
            section.appendChild(levelBadgesContainer);
        } else {
            // Last resort: append to juz info (old behavior fallback)
            const juzInfo = document.querySelector('.juz-info');
            if (juzInfo) {
                levelBadgesContainer = document.createElement('div');
                levelBadgesContainer.id = 'achievements-list';
                levelBadgesContainer.className = 'achievements-list';
                // Add margins if appending here
                levelBadgesContainer.style.marginTop = "20px";
                if (juzInfo.parentElement) juzInfo.parentElement.appendChild(levelBadgesContainer);
            } else {
                return; // Can't render
            }
        }
    }

    // Clear existing badges to re-render
    levelBadgesContainer.innerHTML = '';

    // Render Badges as 3D Cards
    if (level >= 3) {
        const b = document.createElement('div');
        b.className = 'unlocked-badge';
        b.innerHTML = '<i class="fas fa-star" style="color: #F59E0B;"></i><span>Bintang<br>Hafalan</span>';
        levelBadgesContainer.appendChild(b);
    }
    if (level >= 5) {
        const b = document.createElement('div');
        b.className = 'unlocked-badge';
        b.innerHTML = '<i class="fas fa-trophy" style="color: #D97706;"></i><span>Pejuang<br>Hafalan</span>';
        levelBadgesContainer.appendChild(b);
    }
    if (level >= 10) {
        const b = document.createElement('div');
        b.className = 'unlocked-badge';
        b.innerHTML = '<i class="fas fa-crown" style="color: #B45309;"></i><span>Hafidz<br>Cilik</span>';
        levelBadgesContainer.appendChild(b);
    }
    if (level >= 15) {
        const b = document.createElement('div');
        b.className = 'unlocked-badge';
        b.innerHTML = '<i class="fas fa-gem" style="color: #059669;"></i><span>Master<br>Quran</span>';
        levelBadgesContainer.appendChild(b);
    }

    // Empty State
    if (levelBadgesContainer.children.length === 0) {
        levelBadgesContainer.innerHTML = '<p class="empty-state-small" style="grid-column: span 2;">Belum ada lencana. Ayo main!</p>';
    }
}

function showChildScoreHistory() {
    // Get score from the header which is already loaded from Firebase
    const totalScoreElement = document.getElementById('total-score-header');
    const totalScore = totalScoreElement ? totalScoreElement.textContent : '0';

    const modalHTML = `
        <div id="child-score-modal" class="modal active">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏆 Riwayat Skor Saya</h3>
                    <button class="btn-close" onclick="closeModal('child-score-modal'); this.closest('.modal').remove();">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Total Skor: <strong>${totalScore}</strong></p>
                    <p>Level Saat Ini: <strong>${currentChild.level || 1}</strong></p>
                    <hr style="margin: 10px 0; opacity: 0.2">
                    <small>Terus bermain untuk menaikkan level!</small>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ========================================
// AUTHENTICATION - PARENT
// ========================================

async function loginParent() {
    const email = document.getElementById('parent-email').value.trim();
    const password = document.getElementById('parent-password').value;

    if (!email || !password) {
        showToast('Masukkan email dan password!', 'error');
        return;
    }

    showLoading(true);

    try {
        if (typeof auth !== 'undefined' && auth) {
            // Firebase login
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists && doc.data().role === 'parent') {
                currentParent = { uid: user.uid, ...doc.data() };
                currentRole = 'parent';
                showParentDashboard();
            } else {
                showToast('Akun ini bukan akun orang tua!', 'error');
                await auth.signOut();
            }
        } else {
            // Local storage demo
            const parents = JSON.parse(localStorage.getItem('tekateki_parents') || '[]');
            const parent = parents.find(p => p.email === email && p.password === password);

            if (!parent) {
                showToast('Email atau password salah!', 'error');
                showLoading(false);
                return;
            }

            currentParent = parent;
            currentRole = 'parent';

            localStorage.setItem('tekateki_session', JSON.stringify({
                role: 'parent',
                data: currentParent
            }));

            showParentDashboard();
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/user-not-found') {
            showToast('Email tidak terdaftar!', 'error');
        } else if (error.code === 'auth/wrong-password') {
            showToast('Password salah!', 'error');
        } else {
            showToast('Terjadi kesalahan. Coba lagi!', 'error');
        }
    }

    showLoading(false);
}

async function registerParent() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        showToast('Lengkapi semua data!', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password minimal 6 karakter!', 'error');
        return;
    }

    showLoading(true);

    try {
        if (typeof auth !== 'undefined' && auth) {
            // Firebase register
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                role: 'parent',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            currentParent = { uid: user.uid, name, email, role: 'parent' };
            currentRole = 'parent';
            showParentDashboard();
            showToast('Pendaftaran berhasil!', 'success');
        } else {
            // Local storage demo
            const parents = JSON.parse(localStorage.getItem('tekateki_parents') || '[]');

            if (parents.find(p => p.email === email)) {
                showToast('Email sudah terdaftar!', 'error');
                showLoading(false);
                return;
            }

            const newParent = {
                id: 'parent_' + Date.now(),
                name,
                email,
                password,
                role: 'parent',
                createdAt: new Date().toISOString()
            };

            parents.push(newParent);
            localStorage.setItem('tekateki_parents', JSON.stringify(parents));

            currentParent = newParent;
            currentRole = 'parent';

            localStorage.setItem('tekateki_session', JSON.stringify({
                role: 'parent',
                data: currentParent
            }));

            showParentDashboard();
            showToast('Pendaftaran berhasil!', 'success');
        }
    } catch (error) {
        console.error('Register error:', error);
        if (error.code === 'auth/email-already-in-use') {
            showToast('Email sudah terdaftar!', 'error');
        } else {
            showToast('Terjadi kesalahan. Coba lagi!', 'error');
        }
    }

    showLoading(false);
}

function logoutParent() {
    if (typeof auth !== 'undefined' && auth) {
        auth.signOut();
    }

    currentParent = null;
    currentRole = null;
    localStorage.removeItem('tekateki_session');
    showScreen('login-screen');
    selectRole(null);

    // Clear forms
    document.getElementById('parent-email').value = '';
    document.getElementById('parent-password').value = '';
}

// ========================================
// GAME LOGIC
// ========================================

function showGameCard(cardId) {
    document.querySelectorAll('.game-card').forEach(card => {
        card.classList.remove('visible');
    });
    document.getElementById(cardId).classList.add('visible');
}

/**
 * Show Mode Selection Screen
 */
function showModeSelect() {
    showGameCard('game-mode-select');
}

/**
 * Show Teka-Teki Start Screen
 */
function showGameStart() {
    resetGameState();
    showGameCard('game-start');
    updateDifficultyDisplay();
}

function updateDifficultyDisplay() {
    // FIX: Get score from UI (Firebase Source of Truth) instead of LocalStorage
    const totalScoreElement = document.getElementById('total-score-header');
    const totalScore = totalScoreElement ? parseInt(totalScoreElement.textContent.replace(/\./g, '') || '0') : getTotalScore();
    let difficulty = 'easy';
    let label = 'Mudah';
    let badgeClass = 'badge-easy';

    if (totalScore >= 500) {
        difficulty = 'hard';
        label = 'Sulit';
        badgeClass = 'badge-hard';
    } else if (totalScore >= 200) {
        difficulty = 'medium';
        label = 'Sedang';
        badgeClass = 'badge-medium';
    }

    gameState.difficulty = difficulty;

    const difficultyInfo = document.getElementById('difficulty-info');
    difficultyInfo.innerHTML = `<span class="badge ${badgeClass}">Level: ${label}</span>`;
}

/**
 * Get total score from DOM element (which is already loaded from Firebase)
 * This ensures consistency across all score displays
 */
function getTotalScore() {
    // Always get score from the header element which is the source of truth (loaded from Firebase)
    const totalScoreElement = document.getElementById('total-score-header');
    if (totalScoreElement) {
        return parseInt(totalScoreElement.textContent.replace(/\./g, '') || '0');
    }

    // Fallback: if header not available, return 0 (should not happen normally)
    console.warn('getTotalScore: Header element not found, returning 0');
    return 0;
}

function startGame() {
    resetGameState();
    generateQuestions();

    if (gameState.questions.length === 0) {
        showToast('Tidak ada soal tersedia untuk juz yang dipilih!', 'error');
        return;
    }

    // Reset total score tracking untuk game baru
    const totalScoreElement = document.getElementById('total-score-header');
    if (totalScoreElement) {
        const currentTotal = parseInt(totalScoreElement.textContent) || 0;
        totalScoreElement.setAttribute('data-previous-total', currentTotal);
    }

    showGameCard('game-quiz');
    showQuestion();
}

function resetGameState() {
    gameState = {
        questions: [],
        currentIndex: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
        correctCount: 0,
        timer: null,
        timeLeft: 30,
        difficulty: gameState.difficulty || 'easy'
    };

    document.getElementById('current-score').textContent = '0';
    document.getElementById('streak-count').textContent = '0';

    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
}

function generateQuestions() {
    const assignedJuz = currentChild?.assignedJuz || [30];
    const juzSettings = currentChild?.juzSettings || {};
    const allAyahs = [];

    // Collect all ayahs from assigned juz
    assignedJuz.forEach(juzNum => {
        const juz = quranData[juzNum];
        if (juz) {
            // Check allowed surahs for this Juz
            const allowedSurahs = juzSettings[juzNum] || ['All']; // Default to All if missing
            const isAll = allowedSurahs.includes('All');

            juz.surahs.forEach(surah => {
                // FILTER: Only include if All or specifically selected
                if (isAll || allowedSurahs.includes(surah.number)) {
                    surah.ayahs.forEach((ayah, index) => {
                        if (index < surah.ayahs.length - 1) {
                            allAyahs.push({
                                surah: surah.surah,
                                surahNumber: surah.number,
                                juz: juzNum,
                                question: ayah,
                                answer: surah.ayahs[index + 1],
                                otherAyahs: surah.ayahs.filter((_, i) => i !== index + 1)
                            });
                        }
                    });
                }
            });
        }
    });

    // Shuffle all candidates first to ensure randomness of Juz and Position
    shuffleArray(allAyahs);

    let level = currentChild.level || 1;
    let questionCount = 5 + Math.floor((level - 1) / 2); // Increase 1 question every 2 levels
    if (questionCount > 15) questionCount = 15; // Max 15 questions

    // Ensure Distinct Surahs if possible
    const selectedQuestions = [];
    const usedSurahs = new Set();

    // First pass: try to pick unique surahs
    for (const item of allAyahs) {
        if (selectedQuestions.length >= questionCount) break;
        if (!usedSurahs.has(item.surah)) {
            selectedQuestions.push(item);
            usedSurahs.add(item.surah);
        }
    }

    // Second pass: fill if not enough
    if (selectedQuestions.length < questionCount) {
        for (const item of allAyahs) {
            if (selectedQuestions.length >= questionCount) break;
            if (!selectedQuestions.includes(item)) {
                selectedQuestions.push(item);
            }
        }
    }

    // Randomize order of selected questions again
    shuffleArray(selectedQuestions);

    // Generate options for each question
    gameState.questions = selectedQuestions.map(q => {
        const options = [q.answer];

        // Add wrong options from other ayahs (Global Pool to be harder, or Local Pool?)
        // Let's use Global Pool of candidate ayahs for better distractors
        const wrongOptions = allAyahs
            .filter(a => a.answer.text !== q.answer.text)
            .map(a => a.answer);

        shuffleArray(wrongOptions);

        // Options count based on Level
        let totalOptions = 3; // Default 3 (A, B, C)
        if (level >= 5) totalOptions = 4; // A, B, C, D

        let wrongCount = totalOptions - 1;

        for (let i = 0; i < wrongCount && i < wrongOptions.length; i++) {
            options.push(wrongOptions[i]);
        }

        shuffleArray(options);

        return {
            surah: q.surah,
            surahNumber: q.surahNumber,
            ayahNumber: q.answer.num, // The ayah being guessed
            juz: q.juz,
            questionText: q.question.text,
            options: options,
            correctIndex: options.findIndex(o => o.text === q.answer.text)
        };
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function showQuestion() {
    const question = gameState.questions[gameState.currentIndex];

    // Update progress
    const progress = (gameState.currentIndex / gameState.questions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent =
        `${gameState.currentIndex + 1}/${gameState.questions.length}`;

    // Update surah
    document.getElementById('surah-name').textContent = question.surah;

    // Update question
    document.getElementById('question-text').textContent = question.questionText;

    // Generate options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';

        // Add A, B, C, D labels
        const labels = ['A', 'B', 'C', 'D', 'E'];
        const labelText = labels[index] || '';

        btn.innerHTML = `<span class="option-label">${labelText}.</span> ${option.text}`;
        btn.onclick = () => selectAnswer(index);
        optionsContainer.appendChild(btn);
    });

    // Hide feedback
    document.getElementById('feedback-overlay').classList.add('hidden');

    // Start timer
    startTimer();
}

function startTimer() {
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }

    // Timer Logic: Smart Scaling
    // Default Base: 30s (if no parent setting)
    // Custom Setting: overrides Base

    let baseTime = 30; // Default

    // 1. Check Parent Setting (Priority)
    if (currentChild && currentChild.timerDuration) {
        baseTime = parseInt(currentChild.timerDuration);
    }
    // If no parent setting, use level-based default
    else {
        const level = currentChild.level || 1;
        if (level < 5) baseTime = 30;
        else if (level < 10) baseTime = 25;
        else baseTime = 20;
    }

    // 2. Apply Difficulty Modifiers
    // Easy: Base Time
    // Medium: Base - 2s
    // Hard: Base - 5s

    if (gameState.difficulty === 'medium') {
        gameState.timeLeft = baseTime - 2;
    } else if (gameState.difficulty === 'hard') {
        gameState.timeLeft = baseTime - 5;
    } else {
        gameState.timeLeft = baseTime; // Easy
    }

    // 3. Safety Floor (Min 3 seconds)
    if (gameState.timeLeft < 3) gameState.timeLeft = 3;

    document.getElementById('timer').textContent = gameState.timeLeft;

    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        document.getElementById('timer').textContent = gameState.timeLeft;

        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            timeUp();
        }
    }, 1000);
}

function timeUp() {
    // Auto-select wrong (timeout)
    gameState.streak = 0;
    document.getElementById('streak-count').textContent = '0';

    const question = gameState.questions[gameState.currentIndex];
    const buttons = document.querySelectorAll('.option-btn');

    buttons.forEach((btn, index) => {
        btn.disabled = true;
        if (index === question.correctIndex) {
            btn.classList.add('correct');
        }
    });

    showFeedback(false, 'Waktu habis! ⏰');

    setTimeout(() => {
        nextQuestion();
    }, 1500);
}

function selectAnswer(selectedIndex) {
    clearInterval(gameState.timer);

    const question = gameState.questions[gameState.currentIndex];
    const buttons = document.querySelectorAll('.option-btn');
    const isCorrect = selectedIndex === question.correctIndex;

    // Disable all buttons
    buttons.forEach((btn, index) => {
        btn.disabled = true;
        if (index === question.correctIndex) {
            btn.classList.add('correct');
        } else if (index === selectedIndex && !isCorrect) {
            btn.classList.add('wrong');
        }
    });

    if (isCorrect) {
        // 🔊 Play correct sound
        playSound('correct');

        // Calculate points
        let points = 10;
        if (gameState.difficulty === 'medium') points = 15;
        if (gameState.difficulty === 'hard') points = 20;

        // Bonus for streak
        points += gameState.streak * 2;

        // Bonus for time remaining
        points += Math.floor(gameState.timeLeft / 5);

        gameState.score += points;
        gameState.streak++;
        gameState.correctCount++;

        if (gameState.streak > gameState.bestStreak) {
            gameState.bestStreak = gameState.streak;
        }

        document.getElementById('current-score').textContent = gameState.score;
        document.getElementById('streak-count').textContent = gameState.streak;

        // 🔥 Show Combo Popup for streak 3+
        showComboPopup(gameState.streak);

        // Update Total Score REALTIME (skor lama + skor game ini)
        const totalScoreElement = document.getElementById('total-score-header');
        if (totalScoreElement) {
            const previousTotalScore = parseInt(totalScoreElement.getAttribute('data-previous-total') || '0');
            const newTotalScore = previousTotalScore + gameState.score;
            totalScoreElement.textContent = newTotalScore;
        }

        // Update Hafalan Progress
        // Calculate time taken for this specific question
        const timeTaken = (gameState.timerDuration || 30) - gameState.timeLeft;
        updateAyahProgress(question.surahNumber, question.ayahNumber, question.surah, timeTaken);

        // 💬 Use motivational message
        showFeedback(true, getMotivationalMessage('correct'));
    } else {
        // 🔊 Play wrong sound
        playSound('wrong');

        gameState.streak = 0;
        document.getElementById('streak-count').textContent = '0';
        showFeedback(false, getWrongMessage());
    }

    setTimeout(() => {
        nextQuestion();
    }, 1500);
}

function showFeedback(isCorrect, message) {
    const overlay = document.getElementById('feedback-overlay');
    const icon = document.getElementById('feedback-icon');
    const text = document.getElementById('feedback-text');

    icon.textContent = isCorrect ? '✅' : '❌';
    text.textContent = message;

    overlay.classList.remove('hidden');
}

function getCorrectMessage() {
    const messages = [
        'Maa Syaa Allah! 🌟',
        'Benar sekali! 🎉',
        'Hebat! Lanjutkan! 💪',
        'Alhamdulillah! ✨',
        'Keren! 👏',
        'Mantap! 🔥'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function getWrongMessage() {
    const messages = [
        'Ayo coba lagi! 💪',
        'Jangan menyerah! 🌈',
        'Semangat murojaah! 📖',
        'Hampir benar! 🤏',
        'Belajar lagi ya! 📚'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function nextQuestion() {
    gameState.currentIndex++;

    if (gameState.currentIndex < gameState.questions.length) {
        showQuestion();
    } else {
        endGame();
    }
}

function endGame() {
    clearInterval(gameState.timer);

    // Save score
    saveScore();

    // Show result
    showGameCard('game-result');

    const percentage = (gameState.correctCount / gameState.questions.length) * 100;

    let emoji = '🏆';
    let title = 'Maa Syaa Allah!';
    let message = 'Hafalan kamu luar biasa!';

    if (percentage >= 80) {
        emoji = '🏆';
        title = 'Mumtaz!';
        message = 'Hafalan kamu sangat lancar! Naik Level! 🚀';

        // Level Up
        if (currentChild) {
            const oldLevel = currentChild.level || 1;
            currentChild.level = oldLevel + 1;
            saveChildProgress();

            // 🎉 Show Level Up Modal with confetti!
            let newBadge = null;
            if (currentChild.level === 3) newBadge = '🌟 Bintang Hafalan';
            else if (currentChild.level === 5) newBadge = '🏆 Pejuang Hafalan';
            else if (currentChild.level === 10) newBadge = '👑 Hafidz Cilik';
            else if (currentChild.level === 15) newBadge = '💎 Master Quran';

            setTimeout(() => {
                showLevelUpModal(currentChild.level, newBadge);
            }, 500);
        }

    } else if (percentage >= 60) {
        emoji = '🌟';
        title = 'Jayyid Jiddan!';
        message = 'Bagus! Terus berlatih ya!';
    } else if (percentage >= 40) {
        emoji = '💪';
        title = 'Jayyid!';
        message = 'Ayo perbanyak murojaah!';
    } else {
        emoji = '📖';
        title = 'Tetap Semangat!';
        message = 'Murojaah lagi yuk!';
    }

    document.getElementById('result-emoji').textContent = emoji;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-message').textContent = message;
    document.getElementById('final-score').textContent = gameState.score;
    document.getElementById('correct-count').textContent = `${gameState.correctCount}/${gameState.questions.length}`;
    document.getElementById('best-streak').textContent = gameState.bestStreak;
}

function saveScore() {
    if (!currentChild) return;

    const scoreData = {
        childId: currentChild.id,
        childName: currentChild.name,
        parentId: currentChild.parentId,
        score: gameState.score,
        correct: gameState.correctCount,
        total: gameState.questions.length,
        streak: gameState.bestStreak,
        difficulty: gameState.difficulty,
        juz: currentChild.assignedJuz,
        date: new Date().toISOString()
    };

    if (typeof db !== 'undefined' && db) {
        db.collection('scores').add(scoreData).catch(console.error);
    }
}

async function saveChildProgress() {
    if (!currentChild) return;

    // Save Level to DB
    if (typeof db !== 'undefined' && db && currentChild.id) {
        try {
            await db.collection('children').doc(currentChild.id).update({
                level: currentChild.level
            });
        } catch (e) {
            console.error(e);
        }
    }

    // Update session
    localStorage.setItem('tekateki_session', JSON.stringify({
        role: 'child',
        data: currentChild
    }));

    // Update list in local storage
    const children = JSON.parse(localStorage.getItem('tekateki_children') || '[]');
    const result = children.map(c => c.username === currentChild.username ? currentChild : c);
    localStorage.setItem('tekateki_children', JSON.stringify(result));

    // Always save to local storage as backup
    const scores = JSON.parse(localStorage.getItem('tekateki_scores') || '[]');
    scores.push(scoreData);
    localStorage.setItem('tekateki_scores', JSON.stringify(scores));
}

// ========================================
// PARENT DASHBOARD
// ========================================

// ========================================
// PARENT DASHBOARD REAL-TIME HANDLERS
// ========================================

let unsubscribeChildren = null;
let unsubscribeScores = null;

function showParentDashboard() {
    showScreen('parent-dashboard-screen');
    document.getElementById('parent-name').textContent = currentParent.name;

    // Subscribe to real-time updates
    subscribeToDashboardData();
    showDashboardTab('overview');
}

function subscribeToDashboardData() {
    if (unsubscribeChildren) unsubscribeChildren();
    if (unsubscribeScores) unsubscribeScores();

    // Listen to Children Data
    if (typeof db !== 'undefined' && db && currentParent.uid) {
        unsubscribeChildren = db.collection('children')
            .where('parentId', '==', currentParent.uid)
            .onSnapshot((snapshot) => {
                const children = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                updateChildrenUI(children);
            }, (error) => {
                console.error("Error getting children:", error);
                showToast("Gagal memuat data anak", "error");
            });

        // Listen to Scores Data - CLIENT SIDE SORTING (No Index Required)
        unsubscribeScores = db.collection('scores')
            .where('parentId', '==', currentParent.uid)
            .limit(100)
            .onSnapshot((snapshot) => {
                let scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Manual Sort (Terbaru di atas)
                scores.sort((a, b) => {
                    const dateA = a.date && a.date.toDate ? a.date.toDate() : new Date(a.date);
                    const dateB = b.date && b.date.toDate ? b.date.toDate() : new Date(b.date);
                    return dateB - dateA;
                });

                updateScoresUI(scores);
            }, (error) => {
                console.error("Error getting scores:", error);
                showToast("Gagal memuat skor: " + error.message, "error");
            });
    } else {
        // Fallback for Local Storage (No real-time listener, just load once)
        loadLocalDashboardData();
    }
}

function updateChildrenUI(children) {
    // Update Counts
    document.getElementById('total-children').textContent = children.length;

    // Update List in "Anak-anak" Tab
    const childrenList = document.getElementById('children-list');
    if (children.length === 0) {
        childrenList.innerHTML = '<p class="empty-state">Belum ada anak terdaftar. Tambahkan anak untuk memulai!</p>';
    } else {
        // We need scores to calculate stats per child, so we might need to wait for scores or store them globally
        // For now, render basic child info. Stats will update when scores load.
        renderChildrenList(children);
    }

    // Update Settings List
    const settingsList = document.getElementById('child-settings-list');
    if (children.length === 0) {
        settingsList.innerHTML = '<p class="empty-state">Belum ada anak terdaftar</p>';
    } else {
        settingsList.innerHTML = children.map(child => `
            <div class="child-setting-item">
                <div class="child-setting-info">
                    <span style="font-size: 1.5rem;">${child.avatar || '👶'}</span>
                    <span>${child.name}</span>
                </div>
                <button class="btn-primary" onclick="editChildJuz('${child.id}')" style="padding: 10px 20px;">
                    <i class="fas fa-book-quran"></i> Setting Juz
                </button>
            </div>
        `).join('');
    }

    // Update Filter Dropdown
    const filterSelect = document.getElementById('score-filter-child');
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">Semua Anak</option>';
    children.forEach(child => {
        filterSelect.innerHTML += `<option value="${child.id}">${child.name}</option>`;
    });
    filterSelect.value = currentVal;

    // Store children globally for helper functions
    window.dashboardChildren = children;

    // If scores are already loaded, re-render things that depend on both
    if (window.dashboardScores) {
        renderOverviewStats(window.dashboardScores);
        renderChildrenList(children, window.dashboardScores); // Re-render with stats
    }
}

function updateScoresUI(scores) {
    window.dashboardScores = scores; // Store globally

    // Update Overview Stats
    renderOverviewStats(scores);

    // Update Recent Activity
    loadRecentActivity(scores, window.dashboardChildren || []);

    // Update Scores Table
    renderScoresTable(scores);

    // Update Children List stats if children are loaded
    if (window.dashboardChildren) {
        renderChildrenList(window.dashboardChildren, scores);
    }
}

function renderOverviewStats(scores) {
    document.getElementById('total-games').textContent = scores.length;

    const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length)
        : 0;
    document.getElementById('avg-score').textContent = avgScore;

    const highestStreak = scores.length > 0
        ? Math.max(...scores.map(s => s.streak || 0))
        : 0;
    document.getElementById('highest-streak').textContent = highestStreak;
}

function renderChildrenList(children, scores = []) {
    const childrenList = document.getElementById('children-list');

    childrenList.innerHTML = children.map(child => {
        const childScores = scores.filter(s => s.childId === child.id);
        const totalGames = childScores.length;
        const totalScore = childScores.reduce((a, b) => a + b.score, 0);
        const juzBadges = (child.assignedJuz || [30]).map(j =>
            `<span class="child-juz-badge">Juz ${j}</span>`
        ).join('');
        const voiceEnabled = child.voiceEnabled || false;

        return `
            <div class="child-card">
                <div class="child-card-header">
                    <div class="child-avatar">${child.avatar || '👶'}</div>
                    <div class="child-info">
                        <h4>${child.name}</h4>
                        <small>@${child.username}</small>
                    </div>
                </div>
                <div class="child-stats">
                    <div class="child-stat">
                        <span>${totalGames}</span>
                        <small>Permainan</small>
                    </div>
                    <div class="child-stat">
                        <span>${totalScore}</span>
                        <small>Total Skor</small>
                    </div>
                </div>
                <div class="child-juz">
                    <p><i class="fas fa-book-quran"></i> Juz yang dipelajari:</p>
                    <div class="child-juz-badges">${juzBadges}</div>
                </div>
                <div class="voice-toggle-row">
                    <span><i class="fas fa-microphone"></i> Mode Sambung Ayat (Beta)</span>
                    <label class="toggle-switch">
                        <input type="checkbox" ${voiceEnabled ? 'checked' : ''} onchange="toggleChildVoice('${child.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="child-actions">
                    <button class="btn-edit" onclick="editChildJuz('${child.id}')">
                        <i class="fas fa-cog"></i> Setting Juz
                    </button>
                    <button class="btn-delete" onclick="deleteChild('${child.id}')">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderScoresTable(scores) {
    const tbody = document.getElementById('scores-tbody');

    if (scores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada data skor</td></tr>';
        return;
    }

    tbody.innerHTML = scores.map(score => {
        let dateStr = '-';
        try {
            // Handle Firestore Timestamp or Date string
            const dateObj = score.date && score.date.toDate ? score.date.toDate() : new Date(score.date);
            dateStr = dateObj.toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { dateStr = 'Invalid Date'; }

        const juzList = (score.juz || []).join(', ');

        return `
            <tr>
                <td>${dateStr}</td>
                <td>${score.childName}</td>
                <td><strong>${score.score}</strong></td>
                <td>${score.correct}/${score.total}</td>
                <td><span class="badge badge-${score.difficulty || 'easy'}">${score.difficulty || 'Mudah'}</span></td>
                <td>${juzList || '-'}</td>
            </tr>
        `;
    }).join('');
}

function loadLocalDashboardData() {
    // Legacy local storage loading
    const children = JSON.parse(localStorage.getItem('tekateki_children') || '[]').filter(c => c.parentId === currentParent.id);
    const scores = JSON.parse(localStorage.getItem('tekateki_scores') || '[]').filter(s => s.parentId === currentParent.id).reverse();
    updateChildrenUI(children);
    updateScoresUI(scores);
}

// Remove old static loaders
// async function loadDashboardData() { ... }
// async function getChildren() { ... }
// async function getScores() { ... } 
// ... replacing these usages ...

function showDashboardTab(tabId) {
    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        }
    });

    // Update tabs
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`tab-${tabId}`).classList.add('active');

    // Load tab data (UI updates are now handled by real-time listeners)
    // We just need to ensure the global data is available for rendering if the tab is switched
    if (tabId === 'children' && window.dashboardChildren) {
        renderChildrenList(window.dashboardChildren, window.dashboardScores || []);
    } else if (tabId === 'scores' && window.dashboardScores) {
        renderScoresTable(window.dashboardScores);
    } else if (tabId === 'settings' && window.dashboardChildren) {
        // The settings list is updated by updateChildrenUI, so no explicit call needed here
    }
}

// async function loadDashboardData() {
//     const children = await getChildren();
//     const scores = await getScores();

//     // Update overview cards
//     document.getElementById('total-children').textContent = children.length;
//     document.getElementById('total-games').textContent = scores.length;

//     const avgScore = scores.length > 0
//         ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length)
//         : 0;
//     document.getElementById('avg-score').textContent = avgScore;

//     const highestStreak = scores.length > 0
//         ? Math.max(...scores.map(s => s.streak || 0))
//         : 0;
//     document.getElementById('highest-streak').textContent = highestStreak;

//     // Load recent activity
//     loadRecentActivity(scores, children);

//     // Update score filter
//     const filterSelect = document.getElementById('score-filter-child');
//     filterSelect.innerHTML = '<option value="all">Semua Anak</option>';
//     children.forEach(child => {
//         filterSelect.innerHTML += `<option value="${child.id}">${child.name}</option>`;
//     });
// }

// async function getChildren() {
//     if (typeof db !== 'undefined' && db && currentParent.uid) {
//         const snapshot = await db.collection('children')
//             .where('parentId', '==', currentParent.uid)
//             .get();
//         return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//     } else {
//         const children = JSON.parse(localStorage.getItem('tekateki_children') || '[]');
//         return children.filter(c => c.parentId === currentParent.id);
//     }
// }

// async function getScores() {
//     if (typeof db !== 'undefined' && db && currentParent.uid) {
//         const snapshot = await db.collection('scores')
//             .where('parentId', '==', currentParent.uid)
//             .orderBy('date', 'desc')
//             .limit(100)
//             .get();
//         return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//     } else {
//         const scores = JSON.parse(localStorage.getItem('tekateki_scores') || '[]');
//         return scores.filter(s => s.parentId === currentParent.id).reverse();
//     }
// }

function loadRecentActivity(scores, children) {
    const activityList = document.getElementById('activity-list');

    if (scores.length === 0) {
        activityList.innerHTML = '<p class="empty-state">Belum ada aktivitas</p>';
        return;
    }

    const recentScores = scores.slice(0, 5);

    activityList.innerHTML = recentScores.map(score => {
        const child = children.find(c => c.id === score.childId) || { avatar: '👶', name: score.childName };
        let dateStr = 'Invalid Date';
        try {
            const date = score.date && score.date.toDate ? score.date.toDate() : new Date(score.date);
            dateStr = getTimeAgo(date);
        } catch (e) { /* handled by default value */ }

        return `
            <div class="activity-item">
                <div class="activity-avatar">${child.avatar || '👶'}</div>
                <div class="activity-info">
                    <strong>${child.name}</strong>
                    <small>${dateStr} - ${score.correct}/${score.total} benar</small>
                </div>
                <div class="activity-score">${score.score} poin</div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;

    return date.toLocaleDateString('id-ID');
}

// async function loadChildrenList() {
//     const children = await getChildren();
//     const childrenList = document.getElementById('children-list');

//     if (children.length === 0) {
//         childrenList.innerHTML = '<p class="empty-state">Belum ada anak terdaftar. Tambahkan anak untuk memulai!</p>';
//         return;
//     }

//     const scores = await getScores();

//     childrenList.innerHTML = children.map(child => {
//         const childScores = scores.filter(s => s.childId === child.id);
//         const totalGames = childScores.length;
//         const totalScore = childScores.reduce((a, b) => a + b.score, 0);
//         const juzBadges = (child.assignedJuz || [30]).map(j =>
//             `<span class="child-juz-badge">Juz ${j}</span>`
//         ).join('');

//         return `
//             <div class="child-card">
//                 <div class="child-card-header">
//                     <div class="child-avatar">${child.avatar || '👶'}</div>
//                     <div class="child-info">
//                         <h4>${child.name}</h4>
//                         <small>@${child.username}</small>
//                     </div>
//                 </div>
//                 <div class="child-stats">
//                     <div class="child-stat">
//                         <span>${totalGames}</span>
//                         <small>Permainan</small>
//                     </div>
//                     <div class="child-stat">
//                         <span>${totalScore}</span>
//                         <small>Total Skor</small>
//                     </div>
//                 </div>
//                 <div class="child-juz">
//                     <p><i class="fas fa-book-quran"></i> Juz yang dipelajari:</p>
//                     <div class="child-juz-badges">${juzBadges}</div>
//                 </div>
//                 <div class="child-actions">
//                     <button class="btn-edit" onclick="editChildJuz('${child.id}')">
//                         <i class="fas fa-cog"></i> Setting Juz
//                     </button>
//                     <button class="btn-delete" onclick="deleteChild('${child.id}')">
//                         <i class="fas fa-trash"></i> Hapus
//                     </button>
//                 </div>
//             </div>
//         `;
//     }).join('');
// }

// async function loadScoresTable() {
//     const scores = await getScores();
//     const tbody = document.getElementById('scores-tbody');

//     if (scores.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada data skor</td></tr>';
//         return;
//     }

//     tbody.innerHTML = scores.map(score => {
//         const date = new Date(score.date).toLocaleDateString('id-ID', {
//             day: 'numeric',
//             month: 'short',
//             year: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit'
//         });

//         const juzList = (score.juz || []).join(', ');

//         return `
//             <tr>
//                 <td>${date}</td>
//                 <td>${score.childName}</td>
//                 <td><strong>${score.score}</strong></td>
//                 <td>${score.correct}/${score.total}</td>
//                 <td><span class="badge badge-${score.difficulty || 'easy'}">${score.difficulty || 'Mudah'}</span></td>
//                 <td>${juzList || '-'}</td>
//             </tr>
//         `;
//     }).join('');
// }

// async function loadChildSettings() {
//     const children = await getChildren();
//     const settingsList = document.getElementById('child-settings-list');

//     if (children.length === 0) {
//         settingsList.innerHTML = '<p class="empty-state">Belum ada anak terdaftar</p>';
//         return;
//     }

//     settingsList.innerHTML = children.map(child => `
//         <div class="child-setting-item">
//             <div class="child-setting-info">
//                 <span style="font-size: 1.5rem;">${child.avatar || '👶'}</span>
//                 <span>${child.name}</span>
//             </div>
//             <button class="btn-primary" onclick="editChildJuz('${child.id}')" style="padding: 10px 20px;">
//                 <i class="fas fa-book-quran"></i> Setting Juz
//             </button>
//         </div>
//     `).join('');
// }

// ========================================
// CHILD MANAGEMENT
// ========================================

let selectedAvatar = '👶';
let editingChildId = null;

function setupAvatarSelector() {
    document.querySelectorAll('.avatar-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAvatar = btn.dataset.avatar;
        });
    });
}

function showAddChildModal() {
    document.getElementById('add-child-modal').classList.remove('hidden');

    // Reset form
    document.getElementById('new-child-name').value = '';
    document.getElementById('new-child-username').value = '';
    document.getElementById('new-child-pin').value = '';
    document.getElementById('new-child-timer').value = '30';

    // Render Accordion
    renderJuzSelection('new-child-juz', { '30': ['All'] }); // Default Juz 30 Selected


    // Reset avatar
    selectedAvatar = '👶';
    document.querySelectorAll('#avatar-selector .avatar-option').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.avatar === '👶');
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

async function addChild() {
    const name = document.getElementById('new-child-name').value.trim();
    const username = document.getElementById('new-child-username').value.trim().toLowerCase();
    const pin = document.getElementById('new-child-pin').value.trim();
    const timerDuration = parseInt(document.getElementById('new-child-timer').value) || 30;

    // SCRAPE JUZ SETTINGS from UI
    const juzSettings = {};
    const selectedJuz = [];

    const container = document.getElementById('new-child-juz');
    const items = container.querySelectorAll('.juz-accordion-item');

    items.forEach(item => {
        const juzVal = item.dataset.juz;
        const mainCb = item.querySelector('.juz-main-cb');

        if (mainCb.checked) {
            // Juz is effectively selected
            selectedJuz.push(parseInt(juzVal));

            // Check specific surahs
            const surahCbs = item.querySelectorAll('.surah-cb:checked');
            const totalSurahs = item.querySelectorAll('.surah-cb').length;

            if (surahCbs.length === totalSurahs || surahCbs.length === 0) {
                // All selected or none specifically unchecked (implies all)
                juzSettings[juzVal] = ['All'];
            } else {
                // Specific surahs selected
                const selectedSurahNums = Array.from(surahCbs).map(cb => parseInt(cb.value));
                juzSettings[juzVal] = selectedSurahNums;
            }
        }
    });


    if (!name || !username || !pin) {
        showToast('Lengkapi semua data!', 'error');
        return;
    }

    if (pin.length < 4 || !/^\d+$/.test(pin)) {
        showToast('PIN harus 4-6 digit angka!', 'error');
        return;
    }

    if (selectedJuz.length === 0) {
        showToast('Pilih minimal 1 juz!', 'error');
        return;
    }

    showLoading(true);

    try {
        const childData = {
            name,
            username,
            pin,
            avatar: selectedAvatar,
            assignedJuz: selectedJuz, // Keep for backward compat
            juzSettings: juzSettings, // NEW: Granular settings
            timerDuration: timerDuration,
            parentId: currentParent.uid || currentParent.id,
            createdAt: new Date().toISOString()
        };

        if (typeof db !== 'undefined' && db) {
            // Check if username exists
            const existing = await db.collection('children')
                .where('username', '==', username)
                .get();

            if (!existing.empty) {
                showToast('Username sudah digunakan!', 'error');
                showLoading(false);
                return;
            }

            await db.collection('children').add(childData);
        } else {
            // Local storage
            const children = JSON.parse(localStorage.getItem('tekateki_children') || '[]');

            if (children.find(c => c.username === username)) {
                showToast('Username sudah digunakan!', 'error');
                showLoading(false);
                return;
            }

            childData.id = 'child_' + Date.now();
            children.push(childData);
            localStorage.setItem('tekateki_children', JSON.stringify(children));
        }

        closeModal('add-child-modal');
        showToast('Anak berhasil ditambahkan!', 'success');
        // Data will auto-refresh via real-time listener
    } catch (error) {
        console.error('Add child error:', error);
        showToast('Terjadi kesalahan!', 'error');
    }

    showLoading(false);
}

async function editChildJuz(childId) {
    editingChildId = childId;

    // Use cached data from real-time listener instead of deprecated getChildren()
    const children = window.dashboardChildren || [];
    const child = currentRole === 'parent'
        ? children.find(c => c.id === childId)
        : currentChild;

    if (!child) return;

    document.getElementById('edit-child-timer').value = child.timerDuration || 30;

    // Prepare Settings for Renderer
    let settings = child.juzSettings || {};
    // Fallback for legacy data (assignedJuz array only)
    if (Object.keys(settings).length === 0 && child.assignedJuz) {
        child.assignedJuz.forEach(juz => {
            settings[juz] = ['All'];
        });
    }

    renderJuzSelection('edit-child-juz', settings);

    document.getElementById('edit-juz-modal').classList.remove('hidden');
}

async function saveChildJuz() {
    // SCRAPE JUZ SETTINGS from UI
    const juzSettings = {};
    const selectedJuz = [];

    const container = document.getElementById('edit-child-juz');
    const items = container.querySelectorAll('.juz-accordion-item');

    items.forEach(item => {
        const juzVal = item.dataset.juz;
        const mainCb = item.querySelector('.juz-main-cb');

        if (mainCb.checked) {
            // Juz is effectively selected
            selectedJuz.push(parseInt(juzVal));

            // Check specific surahs
            const surahCbs = item.querySelectorAll('.surah-cb:checked');
            const totalSurahs = item.querySelectorAll('.surah-cb').length;

            if (surahCbs.length === totalSurahs || surahCbs.length === 0) { // 0 checked but parent checked usually means UI glitch or init, treat as All for safety if UI forces checked? Or actually if 0 checked, technically none selected? 
                // Logic check: if parent is checked, usually we auto-check all children. 
                // If user unchecked all children, parent should uncheck.
                // So if parent is checked, we assume at least one is checked or all.
                // Let's rely on what's checked.
                if (surahCbs.length === totalSurahs) {
                    juzSettings[juzVal] = ['All'];
                } else {
                    const selectedSurahNums = Array.from(surahCbs).map(cb => parseInt(cb.value));
                    // If really 0, but parent checked, this is weird state. Treat as none? 
                    // But let's assume valid state.
                    if (selectedSurahNums.length > 0) {
                        juzSettings[juzVal] = selectedSurahNums;
                    } else {
                        // User checked header but unchecked all surah? 
                        // Remove from selectedJuz to be safe? 
                        // For now, let's assume 'All' if header checked but logic missed.
                        // Better: just save what is explicitly checked.
                        juzSettings[juzVal] = ['All']; // Fallback
                    }
                }
            } else {
                const selectedSurahNums = Array.from(surahCbs).map(cb => parseInt(cb.value));
                juzSettings[juzVal] = selectedSurahNums;
            }
        }
    });

    const timerDuration = parseInt(document.getElementById('edit-child-timer').value) || 30;

    if (selectedJuz.length === 0) {
        showToast('Pilih minimal 1 juz!', 'error');
        return;
    }

    showLoading(true);

    try {
        if (typeof db !== 'undefined' && db) {
            await db.collection('children').doc(editingChildId).update({
                assignedJuz: selectedJuz,
                juzSettings: juzSettings,
                timerDuration: timerDuration
            });
        } else {
            const children = JSON.parse(localStorage.getItem('tekateki_children') || '[]');
            const index = children.findIndex(c => c.id === editingChildId);
            if (index !== -1) {
                children[index].assignedJuz = selectedJuz;
                children[index].juzSettings = juzSettings;
                children[index].timerDuration = timerDuration;
                localStorage.setItem('tekateki_children', JSON.stringify(children));
            }
        }

        closeModal('edit-juz-modal');
        showToast('Setting juz berhasil disimpan!', 'success');
        // Data will auto-refresh via real-time listener
    } catch (error) {
        console.error('Save juz error:', error);
        showToast('Terjadi kesalahan!', 'error');
    }

    showLoading(false);
}

// ----------------------------------------------------
// UI RENDER HELPER: JUZ SELECTION Accordion
// ----------------------------------------------------
function renderJuzSelection(containerId, savedSettings = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    // Available Juz (Dynamically get all keys from quranData)
    // Sort them numerically to ensure order (e.g., 1, 2, 29, 30)
    const availableJuz = Object.keys(quranData).map(Number).sort((a, b) => a - b);

    availableJuz.forEach(juzNum => {
        const juzData = quranData[juzNum];
        if (!juzData) return;

        // Check Saved Status
        // savedSettings format: { "30": ["All"], "29": [1, 2] }
        // OR legacy: array [30, 29] -> convert to {30: ['All'], ...} before calling this? No, caller handles.

        let isJuzSelected = false;
        let selectedSurahs = [];
        let isAll = false;

        if (savedSettings[juzNum]) {
            isJuzSelected = true;
            selectedSurahs = savedSettings[juzNum];
            if (selectedSurahs.includes('All')) isAll = true;
        }

        // Create Item
        const item = document.createElement('div');
        item.className = 'juz-accordion-item';
        item.dataset.juz = juzNum;

        // Header
        const header = document.createElement('div');
        header.className = 'juz-accordion-header';

        // Header Content
        header.innerHTML = `
            <div class="juz-title-group">
                <input type="checkbox" class="juz-main-cb" value="${juzNum}" ${isJuzSelected ? 'checked' : ''}>
                <span>${juzData.name}</span>
            </div>
            <i class="fas fa-chevron-down"></i>
        `;

        // Surah List Container
        const surahList = document.createElement('div');
        surahList.className = 'surah-list';
        if (isJuzSelected) surahList.classList.add('active'); // Auto expand if selected

        // Populate Surahs
        juzData.surahs.forEach(surah => {
            const isChecked = isAll || selectedSurahs.includes(surah.number);

            const surahLabel = document.createElement('label');
            surahLabel.className = 'surah-checkbox';
            surahLabel.innerHTML = `
                <input type="checkbox" class="surah-cb" value="${surah.number}" ${isChecked ? 'checked' : ''}>
                ${surah.surah}
            `;
            surahList.appendChild(surahLabel);
        });

        // Event Listeners

        // 1. Accordion Toggle
        header.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                surahList.classList.toggle('active');
            }
        });

        // 2. Main Checkbox (Select All)
        const mainCb = header.querySelector('.juz-main-cb');
        mainCb.addEventListener('change', (e) => {
            const checked = e.target.checked;
            // Check/Uncheck all surahs
            surahList.querySelectorAll('.surah-cb').forEach(cb => cb.checked = checked);
            // Expand if checked
            if (checked) surahList.classList.add('active');
        });

        // 3. Child Checkbox (Update Main)
        surahList.querySelectorAll('.surah-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                const total = surahList.querySelectorAll('.surah-cb').length;
                const checkedCount = surahList.querySelectorAll('.surah-cb:checked').length;

                mainCb.checked = checkedCount > 0;
                // Optional: Indeterminate state if some checked? 
                mainCb.indeterminate = checkedCount > 0 && checkedCount < total;
            });
        });

        item.appendChild(header);
        item.appendChild(surahList);
        container.appendChild(item);
    });
}

/**
 * Toggle Voice Quiz setting for a child
 */
async function toggleChildVoice(childId, enabled) {
    try {
        if (typeof db !== 'undefined' && db) {
            // Firebase update
            await db.collection('children').doc(childId).update({
                voiceEnabled: enabled
            });
        } else {
            // Local storage update
            const children = JSON.parse(localStorage.getItem('tekateki_children') || '[]');
            const index = children.findIndex(c => c.id === childId);
            if (index !== -1) {
                children[index].voiceEnabled = enabled;
                localStorage.setItem('tekateki_children', JSON.stringify(children));
            }
        }

        showToast(enabled ? 'Mode Sambung Ayat diaktifkan!' : 'Mode Sambung Ayat dinonaktifkan', 'success');
    } catch (error) {
        console.error('Toggle voice error:', error);
        showToast('Gagal mengubah setting!', 'error');
    }
}

async function deleteChild(childId) {
    if (!confirm('Yakin ingin menghapus anak ini? Data skor juga akan terhapus.')) {
        return;
    }

    showLoading(true);

    try {
        if (typeof db !== 'undefined' && db) {
            await db.collection('children').doc(childId).delete();

            // Delete related scores
            const scoresSnapshot = await db.collection('scores')
                .where('childId', '==', childId)
                .get();

            const batch = db.batch();
            scoresSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } else {
            let children = JSON.parse(localStorage.getItem('tekateki_children') || '[]');
            children = children.filter(c => c.id !== childId);
            localStorage.setItem('tekateki_children', JSON.stringify(children));

            let scores = JSON.parse(localStorage.getItem('tekateki_scores') || '[]');
            scores = scores.filter(s => s.childId !== childId);
            localStorage.setItem('tekateki_scores', JSON.stringify(scores));
        }

        showToast('Anak berhasil dihapus!', 'success');
        // Data will auto-refresh via real-time listener
    } catch (error) {
        console.error('Delete child error:', error);
        showToast('Terjadi kesalahan!', 'error');
    }

    showLoading(false);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const text = toast.querySelector('.toast-message');

    toast.className = `toast ${type}`;
    text.textContent = message;

    if (type === 'success') {
        icon.className = 'toast-icon fas fa-check-circle';
    } else if (type === 'error') {
        icon.className = 'toast-icon fas fa-times-circle';
    } else if (type === 'warning') {
        icon.className = 'toast-icon fas fa-exclamation-circle';
    }

    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function filterScores() {
    const childId = document.getElementById('score-filter-child').value;
    const period = document.getElementById('score-filter-period').value;

    let filteredScores = window.dashboardScores || [];

    if (childId !== 'all') {
        filteredScores = filteredScores.filter(s => s.childId === childId);
    }

    if (period !== 'all') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        filteredScores = filteredScores.filter(s => {
            const date = s.date && s.date.toDate ? s.date.toDate() : new Date(s.date);
            if (period === 'today') return date >= startOfDay;
            if (period === 'week') return date >= startOfWeek;
            if (period === 'month') return date >= startOfMonth;
            return true;
        });
    }

    renderScoresTable(filteredScores);
}

// ========================================
// LEADERBOARD SYSTEM
// ========================================

function showLeaderboard(surahNumber = null) {
    console.log('Attemping to open leaderboard...');
    let modal = document.getElementById('leaderboard-modal');

    // Fallback if getElementById fails (rare but possible in some cache states)
    if (!modal) {
        console.warn('getElementById failed, trying querySelector...');
        modal = document.querySelector('#leaderboard-modal');
    }

    // Safety check: Ensure modal exists in DOM
    if (!modal) {
        console.error('CRITICAL: Leaderboard modal not found in DOM!');
        console.log('Body content:', document.body.innerHTML.slice(-500)); // Log end of body to check if modal is there
        alert('Gagal memuat modal. Mohon refresh halaman (Ctrl+R) karena ada update sistem.');
        return;
    }

    console.log('Modal found, opening...');
    modal.classList.remove('hidden');

    // Auto-detect best surah if none provided
    if (!surahNumber && currentChild && currentChild.hafalanProgress) {
        let bestSurah = 1;
        let maxCount = -1;

        Object.entries(currentChild.hafalanProgress).forEach(([surahId, data]) => {
            let count = 0;
            // Count memorized ayahs
            if (data.ayahs) {
                Object.values(data.ayahs).forEach(a => {
                    const c = typeof a === 'object' ? a.count : a;
                    if (c >= 2) count++;
                });
            }
            if (count > maxCount) {
                maxCount = count;
                bestSurah = surahId;
            }
        });
        surahNumber = bestSurah;
    } else if (!surahNumber) {
        surahNumber = 1; // Fallback
    }

    // Initialize Tabs
    setupLeaderboardTabs();

    // Set Surah Filter
    const select = document.getElementById('leaderboard-surah-select');
    if (select.options.length <= 1) {
        select.innerHTML = '';
        const allSurahs = {};
        Object.values(quranData).forEach(juz => {
            juz.surahs.forEach(s => allSurahs[s.number] = s.surah);
        });
        Object.keys(allSurahs).sort((a, b) => a - b).forEach(num => {
            const opt = document.createElement('option');
            opt.value = num;
            opt.textContent = `${num}. ${allSurahs[num]}`;
            if (num == surahNumber) opt.selected = true;
            select.appendChild(opt);
        });
    } else {
        select.value = surahNumber;
    }

    // Default to Hafalan Tab
    switchLeaderboardTab('hafalan');
    renderGlobalLeaderboard(surahNumber);
}

function setupLeaderboardTabs() {
    // Tabs are now static in HTML, no need to inject dynamically
    // Just ensure listeners or states if needed (handled by onclick)
}

function switchLeaderboardTab(tab) {
    document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.leaderboard-tabs .tab-btn[onclick*="${tab}"]`).classList.add('active');

    if (tab === 'hafalan') {
        document.getElementById('leaderboard-filters').style.display = 'block';
        document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="4" class="text-center">Memuat data hafalan...</td></tr>';
        const surahNum = document.getElementById('leaderboard-surah-select').value;
        renderGlobalLeaderboard(surahNum);
    } else {
        document.getElementById('leaderboard-filters').style.display = 'none';
        renderScoreLeaderboard();
    }
}

function renderScoreLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Memuat data skor...</td></tr>';

    if (typeof db !== 'undefined' && db) {
        // Fetch ALL children and their scores
        Promise.all([
            db.collection('children').get(),
            db.collection('scores').get()
        ])
            .then(([childrenSnapshot, scoresSnapshot]) => {
                const childrenMap = new Map();

                // Create map of all children
                childrenSnapshot.forEach(doc => {
                    const child = { id: doc.id, ...doc.data() };
                    childrenMap.set(child.id, {
                        name: child.name,
                        level: child.level || 1,
                        totalScore: 0
                    });
                });

                // Sum scores per child
                scoresSnapshot.forEach(doc => {
                    const score = doc.data();
                    const childId = score.childId;
                    if (childrenMap.has(childId)) {
                        childrenMap.get(childId).totalScore += score.score || 0;
                    }
                });

                // Convert to array and sort by total score
                const leaderboardData = Array.from(childrenMap.values())
                    .filter(child => child.totalScore > 0) // Only show children with scores
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .slice(0, 20); // Top 20

                renderScoreTableRows(leaderboardData);
            })
            .catch(err => {
                console.error("Error fetching leaderboard:", err);
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">Gagal memuat data</td></tr>';
            });
    } else {
        // Local Storage
        const children = JSON.parse(localStorage.getItem('tekateki_children') || '[]');
        const scores = JSON.parse(localStorage.getItem('tekateki_scores') || '[]');

        const childrenMap = new Map();

        // Create map of all children
        children.forEach(child => {
            childrenMap.set(child.id, {
                name: child.name,
                level: child.level || 1,
                totalScore: 0
            });
        });

        // Sum scores per child
        scores.forEach(score => {
            if (childrenMap.has(score.childId)) {
                childrenMap.get(score.childId).totalScore += score.score || 0;
            }
        });

        // Convert to array and sort
        const leaderboardData = Array.from(childrenMap.values())
            .filter(child => child.totalScore > 0)
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 20);

        renderScoreTableRows(leaderboardData);
    }
}

function renderScoreTableRows(data) {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada rekor skor</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        let badge = '';
        if (index === 0) badge = '🥇';
        else if (index === 1) badge = '🥈';
        else if (index === 2) badge = '🥉';
        else badge = index + 1;

        tr.innerHTML = `
            <td class="text-center font-bold">${badge}</td>
            <td>${item.name}</td>
            <td class="text-center font-bold text-primary">${item.totalScore}</td>
            <td class="text-center">Level ${item.level}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderGlobalLeaderboard(surahNumber) {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Memuat data...</td></tr>';

    let childrenData = [];

    // Fetch all children
    if (typeof db !== 'undefined' && db) {
        // Firestore
        db.collection('children').get().then(snapshot => {
            snapshot.forEach(doc => childrenData.push(doc.data()));
            processLeaderboardData(childrenData, surahNumber);
        });
    } else {
        // Local Storage
        childrenData = JSON.parse(localStorage.getItem('tekateki_children') || '[]');
        processLeaderboardData(childrenData, surahNumber);
    }
}

function processLeaderboardData(children, surahNumber) {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    // Sort logic
    const rankings = children.map(child => {
        let count = 0;
        let totalBestTime = 0;

        if (child.hafalanProgress && child.hafalanProgress[surahNumber]) {
            const progress = child.hafalanProgress[surahNumber];

            // Calculate Score
            Object.values(progress.ayahs).forEach(ayah => {
                const data = typeof ayah === 'object' ? ayah : { count: ayah, bestTime: 999 };
                if (data.count >= 2) {
                    count++;
                    totalBestTime += (data.bestTime === 999 ? 0 : data.bestTime);
                }
            });
        }

        return {
            name: child.name,
            avatar: child.avatar,
            count: count,
            time: totalBestTime
        };
    })
        .filter(r => r.count > 0) // Only show those who have started
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count; // Priority 1: Count DESC
            return a.time - b.time; // Priority 2: Time ASC (lower is better)
        });

    // Render Top 10
    const top10 = rankings.slice(0, 10);

    if (top10.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada data untuk surah ini</td></tr>';
        return;
    }

    top10.forEach((rank, index) => {
        const tr = document.createElement('tr');
        let badge = '';
        if (index === 0) badge = '🥇';
        else if (index === 1) badge = '🥈';
        else if (index === 2) badge = '🥉';
        else badge = index + 1;

        tr.innerHTML = `
            <td class="text-center font-bold">${badge}</td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                   <div style="font-size:1.2rem;">${rank.avatar}</div>
                   <div>${rank.name}</div>
                </div>
            </td>
            <td class="text-center">${rank.count} Ayat</td>
            <td class="text-center font-mono">${rank.time.toFixed(1)}s</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateAyahProgress(surahNumber, ayahNumber, surahName, timeTaken) {
    if (!currentChild) return;

    if (!currentChild.hafalanProgress) {
        currentChild.hafalanProgress = {};
    }

    if (!currentChild.hafalanProgress[surahNumber]) {
        currentChild.hafalanProgress[surahNumber] = {
            surahName: surahName,
            ayahs: {},
            isCompleted: false
        };
    }

    const surahProgress = currentChild.hafalanProgress[surahNumber];

    // Init ayah progress if needed
    if (!surahProgress.ayahs[ayahNumber]) {
        surahProgress.ayahs[ayahNumber] = {
            count: 0,
            bestTime: 999
        };
    }

    // Handle legacy data structure (if count was just number)
    if (typeof surahProgress.ayahs[ayahNumber] === 'number') {
        surahProgress.ayahs[ayahNumber] = {
            count: surahProgress.ayahs[ayahNumber],
            bestTime: 999
        };
    }

    // Increment correct count
    surahProgress.ayahs[ayahNumber].count++;

    // Update best time (faster is smaller number)
    if (timeTaken && timeTaken < surahProgress.ayahs[ayahNumber].bestTime) {
        surahProgress.ayahs[ayahNumber].bestTime = timeTaken;
    }

    // Check completion condition
    checkSurahCompletion(surahNumber);

    // Save progress
    saveChildProgress();
}

function checkSurahCompletion(surahNumber) {
    const progress = currentChild.hafalanProgress[surahNumber];
    if (!progress) return;

    // Get total ayahs for this surah
    let totalAyahs = 0;
    // Let's assume completion if all N-1 transitions are correct >= 2 times.

    let completedCount = 0;
    const requiredCorrect = 2; // Threshold
    const requiredTransitions = totalAyahs - 1;

    for (let i = 2; i <= totalAyahs; i++) {
        if (surahProgress.ayahs[i] && surahProgress.ayahs[i] >= requiredCorrect) {
            completedCount++;
        }
    }

    if (completedCount >= requiredTransitions && requiredTransitions > 0) {
        // SURAH COMPLETED!
        surahProgress.isCompleted = true;
        surahProgress.completedAt = new Date().toISOString();

        // Show Special Notification
        showBadgeUnlockModal(surahProgress.surahName);
    }
}

function showBadgeUnlockModal(surahName) {
    // Create and show modal
    const modalId = 'badge-unlock-modal';

    // Remove if exists
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const html = `
        <div id="${modalId}" class="modal active" style="z-index: 2000;">
            <div class="modal-content" style="text-align: center;">
                <div class="result-animation">
                    <div class="confetti"></div>
                </div>
                <div style="font-size: 5rem; margin-bottom: 20px;">🏅</div>
                <h2 class="card-title rainbow-text">Maa Syaa Allah!</h2>
                <h3 style="margin-bottom: 15px; color: var(--primary);">Hafalan Baru Selesai!</h3>
                <p style="font-size: 1.2rem; margin-bottom: 20px;">
                    Kamu sudah menghafal surat <br><strong>${surahName}</strong>
                </p>
                <button class="btn-play pulse" onclick="document.getElementById('${modalId}').remove()">
                    Alhamdulillah!
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); // Victory sound placeholder
    audio.play().catch(e => { }); // Ignore autoplay errors
}
