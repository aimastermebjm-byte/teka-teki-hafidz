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
                // User is signed in
                checkUserRole(user);
            } else {
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

        showChildGame();
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

function showChildGame() {
    showScreen('child-game-screen');

    // Update display
    document.getElementById('display-child-name').textContent = currentChild.name;
    document.getElementById('child-avatar').textContent = currentChild.avatar || '👶';

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

    // Update difficulty based on total score
    updateDifficultyDisplay();

    showGameCard('game-start');
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

function showGameStart() {
    resetGameState();
    showGameCard('game-start');
    updateDifficultyDisplay();
}

function updateDifficultyDisplay() {
    const totalScore = getTotalScore();
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

function getTotalScore() {
    if (!currentChild) return 0;

    const scores = JSON.parse(localStorage.getItem('tekateki_scores') || '[]');
    const childScores = scores.filter(s => s.childId === currentChild.id);

    return childScores.reduce((total, s) => total + s.score, 0);
}

function startGame() {
    resetGameState();
    generateQuestions();

    if (gameState.questions.length === 0) {
        showToast('Tidak ada soal tersedia untuk juz yang dipilih!', 'error');
        return;
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
    const allAyahs = [];

    // Collect all ayahs from assigned juz
    assignedJuz.forEach(juzNum => {
        const juz = quranData[juzNum];
        if (juz) {
            juz.surahs.forEach(surah => {
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
            });
        }
    });

    // Shuffle and pick questions based on difficulty
    shuffleArray(allAyahs);

    let questionCount = 5;
    if (gameState.difficulty === 'medium') questionCount = 8;
    if (gameState.difficulty === 'hard') questionCount = 10;

    const selectedQuestions = allAyahs.slice(0, Math.min(questionCount, allAyahs.length));

    // Generate options for each question
    gameState.questions = selectedQuestions.map(q => {
        const options = [q.answer];

        // Add wrong options from other ayahs
        const wrongOptions = allAyahs
            .filter(a => a.answer.text !== q.answer.text)
            .map(a => a.answer);

        shuffleArray(wrongOptions);

        // Number of wrong options based on difficulty
        let wrongCount = 2;
        if (gameState.difficulty === 'medium') wrongCount = 3;
        if (gameState.difficulty === 'hard') wrongCount = 3;

        for (let i = 0; i < wrongCount && i < wrongOptions.length; i++) {
            options.push(wrongOptions[i]);
        }

        shuffleArray(options);

        return {
            surah: q.surah,
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
        btn.textContent = option.text;
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

    // Timer based on difficulty
    gameState.timeLeft = 30;
    if (gameState.difficulty === 'medium') gameState.timeLeft = 25;
    if (gameState.difficulty === 'hard') gameState.timeLeft = 20;

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

        showFeedback(true, getCorrectMessage());
    } else {
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
        message = 'Hafalan kamu sangat lancar!';
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
        // Save to Firebase
        db.collection('scores').add(scoreData).catch(console.error);
    }

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

    // Reset checkboxes
    document.querySelectorAll('#new-child-juz input').forEach(cb => {
        cb.checked = cb.value === '30';
    });

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

    // Get selected juz
    const selectedJuz = [];
    document.querySelectorAll('#new-child-juz input:checked').forEach(cb => {
        selectedJuz.push(parseInt(cb.value));
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
            assignedJuz: selectedJuz,
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
        loadDashboardData();
        loadChildrenList();
    } catch (error) {
        console.error('Add child error:', error);
        showToast('Terjadi kesalahan!', 'error');
    }

    showLoading(false);
}

async function editChildJuz(childId) {
    editingChildId = childId;

    const children = await getChildren();
    const child = children.find(c => c.id === childId);

    if (!child) return;

    document.getElementById('edit-child-name').textContent = child.name;

    // Set checkboxes
    document.querySelectorAll('#edit-child-juz input').forEach(cb => {
        cb.checked = (child.assignedJuz || []).includes(parseInt(cb.value));
    });

    document.getElementById('edit-juz-modal').classList.remove('hidden');
}

async function saveChildJuz() {
    const selectedJuz = [];
    document.querySelectorAll('#edit-child-juz input:checked').forEach(cb => {
        selectedJuz.push(parseInt(cb.value));
    });

    if (selectedJuz.length === 0) {
        showToast('Pilih minimal 1 juz!', 'error');
        return;
    }

    showLoading(true);

    try {
        if (typeof db !== 'undefined' && db) {
            await db.collection('children').doc(editingChildId).update({
                assignedJuz: selectedJuz
            });
        } else {
            const children = JSON.parse(localStorage.getItem('tekateki_children') || '[]');
            const index = children.findIndex(c => c.id === editingChildId);
            if (index !== -1) {
                children[index].assignedJuz = selectedJuz;
                localStorage.setItem('tekateki_children', JSON.stringify(children));
            }
        }

        closeModal('edit-juz-modal');
        showToast('Setting juz berhasil disimpan!', 'success');
        loadChildrenList();
        loadChildSettings();
    } catch (error) {
        console.error('Save juz error:', error);
        showToast('Terjadi kesalahan!', 'error');
    }

    showLoading(false);
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
        loadDashboardData();
        loadChildrenList();
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
    // TODO: Implement score filtering
    loadScoresTable();
}
