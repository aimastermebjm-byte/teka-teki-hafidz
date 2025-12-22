// ========================================
// VOICE QUIZ - SAMBUNG AYAT
// Mode kuis suara seperti ustadz menguji hafalan
// ========================================

// Voice Quiz State
let voiceQuizState = {
    isActive: false,
    questions: [],
    currentIndex: 0,
    score: 0,
    correctCount: 0,
    isListening: false,
    recognition: null
};

// Speech Recognition setup
function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech Recognition tidak didukung di browser ini');
        return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'ar-SA'; // Arabic
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    return recognition;
}

/**
 * Start Voice Quiz Mode
 */
async function startVoiceMode() {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('Browser tidak mendukung Voice Quiz. Gunakan Chrome atau Edge.', 'error');
        return;
    }

    // Request microphone permission
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
        showToast('Izinkan akses mikrofon untuk Voice Quiz', 'error');
        return;
    }

    // Initialize
    voiceQuizState = {
        isActive: true,
        questions: [],
        currentIndex: 0,
        score: 0,
        correctCount: 0,
        isListening: false,
        recognition: initSpeechRecognition()
    };

    // Generate questions (reuse existing logic)
    generateVoiceQuestions();

    // Show Voice Quiz UI
    showGameCard('voice-quiz-screen');

    // Update header scores
    document.getElementById('current-score').textContent = '0';
    document.getElementById('streak-count').textContent = '0';

    // Start with greeting
    await greetChild();

    // Start first question
    await showVoiceQuestion();
}

/**
 * Generate questions for Voice Quiz
 */
function generateVoiceQuestions() {
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
                            answer: surah.ayahs[index + 1]
                        });
                    }
                });
            });
        }
    });

    // Shuffle and select
    shuffleArray(allAyahs);

    // Voice quiz: fewer questions (5-8) due to time
    const questionCount = Math.min(8, Math.max(5, Math.floor((currentChild?.level || 1) / 2) + 5));

    voiceQuizState.questions = allAyahs.slice(0, questionCount);
}

/**
 * Greet the child
 */
async function greetChild() {
    const childName = currentChild?.name || 'Ananda';
    const juzList = currentChild?.assignedJuz || [30];

    updateVoiceStatus('Menyapa...');

    // Generate greeting (use Gemini if available, otherwise fallback)
    let greeting;
    if (typeof generateGreeting === 'function') {
        greeting = await generateGreeting(childName, juzList);
    } else {
        greeting = `Assalamualaikum ${childName}! Hari ini kita latihan sambung ayat dari Juz ${juzList.join(' dan ')} ya. Siap?`;
    }

    // Speak greeting with ElevenLabs
    await speakWithElevenLabs(greeting);

    // Small pause
    await delay(1000);
}

/**
 * Show current voice question
 */
async function showVoiceQuestion() {
    if (voiceQuizState.currentIndex >= voiceQuizState.questions.length) {
        await endVoiceQuiz();
        return;
    }

    const question = voiceQuizState.questions[voiceQuizState.currentIndex];

    // Update UI
    document.getElementById('voice-surah-name').textContent = question.surah;
    document.getElementById('voice-ayah-text').textContent = question.question.text;
    document.getElementById('voice-progress').textContent =
        `${voiceQuizState.currentIndex + 1}/${voiceQuizState.questions.length}`;
    document.getElementById('voice-score').textContent = voiceQuizState.score;

    updateVoiceStatus('Membaca ayat...');

    // Announce surah
    await speakWithElevenLabs(`Dari Surah ${question.surah}`);
    await delay(500);

    // Read ayah with ElevenLabs (or fallback)
    if (typeof speakWithElevenLabs === 'function') {
        await speakWithElevenLabs(question.question.text);
    } else {
        await speakWithWebSpeech(question.question.text, 'ar-SA');
    }

    await delay(500);

    // Prompt to continue
    const childName = currentChild?.name || 'Ananda';
    await speakWithElevenLabs(`Silahkan ${childName} lanjutkan`);

    // Start listening
    await listenForAnswer();
}

/**
 * Listen for child's answer
 */
async function listenForAnswer() {
    const recognition = voiceQuizState.recognition;
    if (!recognition) {
        showToast('Speech recognition tidak tersedia', 'error');
        return;
    }

    updateVoiceStatus('Mendengarkan...');
    showMicActive(true);
    voiceQuizState.isListening = true;

    return new Promise((resolve) => {
        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            showMicActive(false);
            voiceQuizState.isListening = false;

            await verifyVoiceAnswer(transcript);
            resolve();
        };

        recognition.onerror = async (event) => {
            console.error('Speech recognition error:', event.error);
            showMicActive(false);
            voiceQuizState.isListening = false;

            if (event.error === 'no-speech') {
                await speakWithElevenLabs('Tidak terdengar suara. Coba lagi ya.');
                await listenForAnswer(); // Retry
            } else {
                await speakWithElevenLabs('Maaf, ada masalah. Lanjut ke ayat berikutnya.');
                nextVoiceQuestion();
            }
            resolve();
        };

        recognition.onend = () => {
            if (voiceQuizState.isListening) {
                // Restart if still listening
                recognition.start();
            }
        };

        recognition.start();

        // Timeout after 15 seconds
        setTimeout(() => {
            if (voiceQuizState.isListening) {
                recognition.stop();
                voiceQuizState.isListening = false;
                showMicActive(false);
            }
        }, 15000);
    });
}

/**
 * Verify the spoken answer
 */
async function verifyVoiceAnswer(spokenText) {
    const question = voiceQuizState.questions[voiceQuizState.currentIndex];
    const expectedAyah = question.answer.text;
    const childName = currentChild?.name || 'Ananda';

    updateVoiceStatus('Memeriksa jawaban...');
    document.getElementById('voice-spoken-text').textContent = spokenText;

    // Verify using Gemini (or fallback)
    let result;
    if (typeof verifyRecitation === 'function') {
        result = await verifyRecitation(expectedAyah, spokenText, childName);
    } else {
        // Simple fallback
        const similarity = spokenText.length > 5 ? 0.7 : 0.3;
        result = {
            benar: similarity >= 0.6,
            skor: Math.round(similarity * 100),
            feedback: similarity >= 0.6 ? 'Bagus!' : 'Coba lagi ya.'
        };
    }

    // Show result
    if (result.benar) {
        playSound('correct');
        voiceQuizState.score += result.skor;
        voiceQuizState.correctCount++;

        document.getElementById('voice-score').textContent = voiceQuizState.score;
        showVoiceFeedback(true, result.feedback);
    } else {
        playSound('wrong');
        showVoiceFeedback(false, result.feedback);

        // Show correct answer
        document.getElementById('voice-correct-ayah').textContent = expectedAyah;
        document.getElementById('voice-correct-container').classList.remove('hidden');
    }

    // Speak feedback
    await speakWithElevenLabs(result.feedback);

    await delay(2000);

    // Next question
    nextVoiceQuestion();
}

/**
 * Move to next question
 */
async function nextVoiceQuestion() {
    voiceQuizState.currentIndex++;

    // Hide feedback
    document.getElementById('voice-feedback').classList.add('hidden');
    document.getElementById('voice-correct-container').classList.add('hidden');
    document.getElementById('voice-spoken-text').textContent = '';

    await showVoiceQuestion();
}

/**
 * End Voice Quiz
 */
async function endVoiceQuiz() {
    voiceQuizState.isActive = false;

    const percentage = (voiceQuizState.correctCount / voiceQuizState.questions.length) * 100;
    const childName = currentChild?.name || 'Ananda';

    let feedback;
    if (percentage >= 80) {
        feedback = `Masyaallah ${childName}! Hafalanmu sangat lancar! Dapat ${voiceQuizState.score} poin!`;

        // Level up
        if (currentChild) {
            currentChild.level = (currentChild.level || 1) + 1;
            saveChildProgress();
        }
    } else if (percentage >= 60) {
        feedback = `Bagus ${childName}! Terus berlatih ya. Dapat ${voiceQuizState.score} poin.`;
    } else {
        feedback = `Tetap semangat ${childName}! Ayo perbanyak murojaah. Dapat ${voiceQuizState.score} poin.`;
    }

    // Save score
    saveVoiceQuizScore();

    // Show result
    showGameCard('voice-result-screen');
    document.getElementById('voice-final-score').textContent = voiceQuizState.score;
    document.getElementById('voice-correct-count').textContent =
        `${voiceQuizState.correctCount}/${voiceQuizState.questions.length}`;

    // Speak feedback
    await speakWithElevenLabs(feedback);
}

/**
 * Save Voice Quiz score
 */
function saveVoiceQuizScore() {
    if (!currentChild) return;

    const scoreData = {
        childId: currentChild.id,
        childName: currentChild.name,
        parentId: currentChild.parentId,
        score: voiceQuizState.score,
        correct: voiceQuizState.correctCount,
        total: voiceQuizState.questions.length,
        mode: 'voice', // Distinguish from regular quiz
        juz: currentChild.assignedJuz,
        date: new Date().toISOString()
    };

    if (typeof db !== 'undefined' && db) {
        db.collection('scores').add(scoreData).catch(console.error);
    }

    // Local storage backup
    const scores = JSON.parse(localStorage.getItem('tekateki_scores') || '[]');
    scores.push(scoreData);
    localStorage.setItem('tekateki_scores', JSON.stringify(scores));
}

/**
 * Stop Voice Quiz
 */
function stopVoiceQuiz() {
    if (voiceQuizState.recognition) {
        voiceQuizState.recognition.stop();
    }
    voiceQuizState.isActive = false;
    voiceQuizState.isListening = false;
    speechSynthesis.cancel();

    showGameCard('game-mode-select');
}

// ========================================
// UI HELPERS
// ========================================

function updateVoiceStatus(status) {
    const el = document.getElementById('voice-status');
    if (el) el.textContent = status;
}

function showMicActive(active) {
    const el = document.getElementById('voice-mic-indicator');
    if (el) {
        el.classList.toggle('active', active);
        el.classList.toggle('pulse', active);
    }
}

function showVoiceFeedback(isCorrect, message) {
    const feedback = document.getElementById('voice-feedback');
    const icon = document.getElementById('voice-feedback-icon');
    const text = document.getElementById('voice-feedback-text');

    icon.textContent = isCorrect ? '✅' : '❌';
    text.textContent = message;
    feedback.className = `voice-feedback ${isCorrect ? 'correct' : 'wrong'}`;
    feedback.classList.remove('hidden');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
