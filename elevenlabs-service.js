// ========================================
// ELEVENLABS TTS SERVICE
// Text-to-Speech untuk baca ayat Arab
// ========================================

// API Configuration - User perlu isi API Key di sini
const ELEVENLABS_CONFIG = {
    apiKey: 'sk_0fdb491b1d84ec617a40262c139625b15f6f6c3264ea37f9',
    voiceId: 'gmnazjXOFoOcWA59sd5m', // Voice pilihan user
    modelId: 'eleven_multilingual_v2'
};

/**
 * Baca teks menggunakan ElevenLabs TTS
 * @param {string} text - Teks yang akan dibaca (Arabic)
 * @returns {Promise<void>}
 */
async function speakWithElevenLabs(text) {
    if (!ELEVENLABS_CONFIG.apiKey) {
        console.error('ElevenLabs API Key belum diisi!');
        // Fallback ke Web Speech API
        return speakWithWebSpeech(text, 'ar-SA');
    }

    console.log('🎤 Mencoba ElevenLabs TTS...');

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_CONFIG.voiceId}?output_format=mp3_44100_128`,
            {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_CONFIG.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: ELEVENLABS_CONFIG.modelId,
                    voice_settings: {
                        stability: 0.75,
                        similarity_boost: 0.75,
                        style: 0.3,
                        use_speaker_boost: true
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs error response:', errorText);
            throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        console.log('✅ ElevenLabs berhasil! Memainkan audio...');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        return new Promise((resolve, reject) => {
            const audio = new Audio(audioUrl);
            audio.playbackRate = 0.75; // Lebih pelan untuk bacaan yang jelas
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
        console.error('❌ ElevenLabs gagal, fallback ke Web Speech:', error);
        // Fallback ke Web Speech API
        return speakWithWebSpeech(text, 'ar-SA');
    }
}

/**
 * Fallback: Baca teks menggunakan Web Speech API
 * @param {string} text - Teks yang akan dibaca
 * @param {string} lang - Bahasa (default: id-ID)
 * @returns {Promise<void>}
 */
function speakWithWebSpeech(text, lang = 'id-ID') {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            console.error('Web Speech API tidak didukung');
            resolve();
            return;
        }

        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = lang === 'ar-SA' ? 0.8 : 1.0; // Pelan untuk Arab
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
            console.error('Speech error:', e);
            resolve(); // Resolve anyway to continue flow
        };

        speechSynthesis.speak(utterance);
    });
}

/**
 * Check apakah ElevenLabs sudah dikonfigurasi
 * @returns {boolean}
 */
function isElevenLabsConfigured() {
    return ELEVENLABS_CONFIG.apiKey && ELEVENLABS_CONFIG.apiKey.length > 0;
}
