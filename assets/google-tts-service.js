// ========================================
// GOOGLE CLOUD TEXT-TO-SPEECH SERVICE
// Natural TTS dengan limit 1 juta karakter/bulan
// ========================================

// API Configuration
const GOOGLE_TTS_CONFIG = {
    apiKey: 'AIzaSyC7frwHrfuh_4QmBbpaevvcw0EIN5jQbN0', // API key dengan TTS enabled
    // Voice settings
    arabicVoice: {
        languageCode: 'ar-XA',
        name: 'ar-XA-Wavenet-A', // Female Arabic WaveNet
        ssmlGender: 'FEMALE'
    },
    indonesianVoice: {
        languageCode: 'id-ID',
        name: 'id-ID-Wavenet-A', // Female Indonesian WaveNet
        ssmlGender: 'FEMALE'
    }
};

/**
 * Speak text using Google Cloud TTS
 * @param {string} text - Text to speak
 * @param {string} language - 'ar' for Arabic, 'id' for Indonesian (default)
 * @returns {Promise<void>}
 */
async function speakWithGoogleTTS(text, language = 'id') {
    // Try Gemini API key first if Google TTS key not set
    const apiKey = GOOGLE_TTS_CONFIG.apiKey || (typeof GEMINI_CONFIG !== 'undefined' ? GEMINI_CONFIG.apiKey : '');

    if (!apiKey) {
        console.error('Google TTS API Key belum diisi!');
        return speakWithWebSpeech(text, language === 'ar' ? 'ar-SA' : 'id-ID');
    }

    const voice = language === 'ar' ? GOOGLE_TTS_CONFIG.arabicVoice : GOOGLE_TTS_CONFIG.indonesianVoice;

    console.log(`🔊 Google TTS: "${text.substring(0, 50)}..." (${language})`);

    try {
        const response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input: { text: text },
                    voice: voice,
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: language === 'ar' ? 0.85 : 1.1, // Arab lebih pelan untuk kejelasan tajwid
                        pitch: 0
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google TTS error:', errorText);
            throw new Error(`Google TTS error: ${response.status}`);
        }

        const data = await response.json();
        const audioContent = data.audioContent;

        // Convert base64 to audio
        const audioBlob = base64ToBlob(audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);

        return new Promise((resolve, reject) => {
            const audio = new Audio(audioUrl);
            audio.playbackRate = 1.0; // Kecepatan normal
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };
            audio.onerror = (e) => {
                URL.revokeObjectURL(audioUrl);
                reject(e);
            };
            audio.play();
        });
    } catch (error) {
        console.error('❌ Google TTS gagal, fallback ke Web Speech:', error);
        return speakWithWebSpeech(text, language === 'ar' ? 'ar-SA' : 'id-ID');
    }
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

/**
 * Fallback: Web Speech API
 */
function speakWithWebSpeech(text, lang = 'id-ID') {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            console.error('Web Speech API tidak didukung');
            resolve();
            return;
        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = lang === 'ar-SA' ? 0.7 : 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        speechSynthesis.speak(utterance);
    });
}

/**
 * Main speak function - use this in voice-quiz.js
 * Automatically detects Arabic text
 */
async function speak(text) {
    // Detect if text contains Arabic characters
    const isArabic = /[\u0600-\u06FF]/.test(text);
    return speakWithGoogleTTS(text, isArabic ? 'ar' : 'id');
}
