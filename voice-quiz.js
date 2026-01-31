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
    // Check if running on Android Native via Interface
    if (window.AndroidInterface) {
        console.log("Using Android Native Speech Recognition");
        return { isNative: true };
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech Recognition tidak didukung di browser ini');
        return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'ar-SA'; 
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    return recognition;
}

/**
 * Start Voice Quiz Mode
 */
async function startVoiceMode() {
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

    // Generate questions
    generateVoiceQuestions();

    // Show Voice Quiz UI
    showGameCard('voice-quiz-screen');

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

    shuffleArray(allAyahs);
    const questionCount = 5;
    voiceQuizState.questions = allAyahs.slice(0, questionCount);
}

/**
 * Greet the child
 */
async function greetChild() {
    const childName = currentChild?.name || 'Ananda';
    updateVoiceStatus('Menyapa...');
    await speak(`Assalamualaikum ${childName}! Mari sambung ayatnya ya.`);
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

    document.getElementById('voice-surah-name').textContent = question.surah;
    document.getElementById('voice-ayah-text').textContent = question.question.text;
    document.getElementById('voice-progress').textContent =
        `${voiceQuizState.currentIndex + 1}/${voiceQuizState.questions.length}`;

    updateVoiceStatus('Membaca ayat...');

    // Play Ayah Audio (Mishary Rashid Alafasy)
    await playQariAudio(question.surahNumber, question.question.num);

    await delay(500);
    await speak("Silahkan lanjutkan");

    // Start listening
    listenForAnswer();
}

/**
 * Play Quran Audio from Qari (Mishary Rashid Alafasy)
 */
function playQariAudio(surahNum, ayahNum) {
    return new Promise((resolve) => {
        const s = surahNum.toString().padStart(3, '0');
        const a = ayahNum.toString().padStart(3, '0');
        const url = `https://everyayah.com/data/Alafasy_128kbps/${s}${a}.mp3`;

        const audio = new Audio(url);
        audio.onended = () => resolve();
        audio.onerror = () => resolve(); // Skip if error
        audio.play().catch(() => resolve());
    });
}

/**
 * Listen for child's answer
 */
function listenForAnswer() {
    updateVoiceStatus('Mendengarkan...');
    showMicActive(true);
    voiceQuizState.isListening = true;

    // Use Native Android Interface if available
    if (window.AndroidInterface) {
        window.AndroidInterface.startSpeechRecognition();
    } else {
        // Fallback to Web Speech API
        if (voiceQuizState.recognition) {
            voiceQuizState.recognition.start();
            
            voiceQuizState.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                onAndroidSpeechResult(transcript);
            };

            voiceQuizState.recognition.onerror = (event) => {
                onAndroidSpeechError(event.error);
            };
        }
    }
}

// Global functions called by Android Native
window.onAndroidSpeechResult = function(transcript) {
    showMicActive(false);
    voiceQuizState.isListening = false;
    updateVoiceStatus('Memproses...');
    verifyVoiceAnswer(transcript);
};

window.onAndroidSpeechError = function(error) {
    showMicActive(false);
    voiceQuizState.isListening = false;
    updateVoiceStatus('Klik mik untuk ulang');
    console.error("Speech Error:", error);
};

/**
 * Verify the spoken answer
 */
async function verifyVoiceAnswer(spokenText) {
    const question = voiceQuizState.questions[voiceQuizState.currentIndex];
    const expectedAyah = question.answer.text;

    document.getElementById('voice-spoken-text').textContent = spokenText;

    // Simple Arabic Normalization for comparison
    const normalize = (txt) => txt.replace(/[\u064B-\u0652]/g, "").trim();
    
    const isCorrect = normalize(spokenText).includes(normalize(expectedAyah)) || 
                      normalize(expectedAyah).includes(normalize(spokenText));

    if (isCorrect) {
        voiceQuizState.score += 20;
        voiceQuizState.correctCount++;
        showVoiceFeedback(true, "Maa Syaa Allah Benar!");
        await speak("Maa syaa Allah benar");
    } else {
        showVoiceFeedback(false, "Coba lagi ya");
        document.getElementById('voice-correct-ayah').textContent = expectedAyah;
        document.getElementById('voice-correct-container').classList.remove('hidden');
        await speak("Hampir tepat, terus semangat ya");
    }

    await delay(2000);
    nextVoiceQuestion();
}

/**
 * Move to next question
 */
async function nextVoiceQuestion() {
    voiceQuizState.currentIndex++;
    document.getElementById('voice-feedback').classList.add('hidden');
    document.getElementById('voice-correct-container').classList.add('hidden');
    await showVoiceQuestion();
}

/**
 * End Voice Quiz
 */
async function endVoiceQuiz() {
    voiceQuizState.isActive = false;
    showGameCard('voice-result-screen');
    document.getElementById('voice-final-score').textContent = voiceQuizState.score;
    await speak("Alhamdulillah latihan selesai");
}

function updateVoiceStatus(status) {
    const el = document.getElementById('voice-status');
    if (el) el.textContent = status;
}

function showMicActive(active) {
    const el = document.getElementById('voice-mic-indicator');
    if (el) el.classList.toggle('active', active);
}

function showVoiceFeedback(isCorrect, message) {
    const feedback = document.getElementById('voice-feedback');
    const text = document.getElementById('voice-feedback-text');
    text.textContent = message;
    feedback.className = `voice-feedback ${isCorrect ? 'correct' : 'wrong'}`;
    feedback.classList.remove('hidden');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
