// ========================================
// GEMINI AI SERVICE
// Verifikasi hafalan menggunakan Gemini API
// ========================================

// API Configuration - User perlu isi API Key di sini
const GEMINI_CONFIG = {
    apiKey: 'AIzaSyC7frwHrfuh_4QmBbpaevvcw0EIN5jQbN0',
    model: 'gemini-2.0-flash-exp',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
};

/**
 * Verifikasi hafalan santri menggunakan Gemini AI
 * @param {string} expectedAyah - Ayat yang seharusnya dibaca
 * @param {string} spokenText - Teks yang diucapkan santri
 * @param {string} childName - Nama anak
 * @returns {Promise<{benar: boolean, skor: number, feedback: string}>}
 */
async function verifyRecitation(expectedAyah, spokenText, childName) {
    if (!GEMINI_CONFIG.apiKey) {
        console.error('Gemini API Key belum diisi!');
        // Fallback: simple string comparison
        return fallbackVerification(expectedAyah, spokenText);
    }

    try {
        const prompt = `
Kamu adalah ustadz yang sedang menguji hafalan santri bernama ${childName}.

Ayat yang seharusnya dibaca:
"${expectedAyah}"

Yang dibaca santri (hasil speech-to-text, mungkin ada kesalahan transkripsi):
"${spokenText}"

Tugas:
1. Bandingkan kedua teks tersebut
2. Berikan toleransi untuk:
   - Perbedaan harakat/tanda baca
   - Perbedaan kecil akibat kesalahan speech-to-text
   - Perbedaan ejaan Arab (misal: ى vs ي)
3. Berikan skor 0-100 berdasarkan kemiripan
4. Berikan feedback natural dalam Bahasa Indonesia sebagai ustadz

PENTING: Respond HANYA dalam format JSON berikut, tanpa teks lain:
{"benar": true/false, "skor": 0-100, "feedback": "respons natural"}

Contoh feedback jika benar: "Masyaallah, hafalanmu lancar sekali!"
Contoh feedback jika salah: "Coba diulang lagi ya, ayat selanjutnya adalah..."
`;

        const response = await fetch(
            `${GEMINI_CONFIG.endpoint}/${GEMINI_CONFIG.model}:generateContent?key=${GEMINI_CONFIG.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 200
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error('Invalid response format');
    } catch (error) {
        console.error('Gemini error:', error);
        return fallbackVerification(expectedAyah, spokenText);
    }
}

/**
 * Fallback verification tanpa AI
 * @param {string} expected 
 * @param {string} spoken 
 * @returns {{benar: boolean, skor: number, feedback: string}}
 */
function fallbackVerification(expected, spoken) {
    // Normalize texts
    const normalizeArabic = (text) => {
        return text
            .replace(/[\u064B-\u065F]/g, '') // Remove harakat
            .replace(/\s+/g, ' ')
            .trim();
    };

    const normExpected = normalizeArabic(expected);
    const normSpoken = normalizeArabic(spoken);

    // Simple similarity check
    const similarity = calculateSimilarity(normExpected, normSpoken);
    const benar = similarity >= 0.7;
    const skor = Math.round(similarity * 100);

    return {
        benar,
        skor,
        feedback: benar
            ? 'Masyaallah, bagus sekali!'
            : 'Coba diulang lagi ya...'
    };
}

/**
 * Calculate string similarity (Levenshtein-based)
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} 0-1
 */
function calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longerLength - editDistance) / longerLength;
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + 1
                );
            }
        }
    }

    return dp[m][n];
}

/**
 * Generate natural greeting
 * @param {string} childName 
 * @param {string[]} juzList 
 * @returns {Promise<string>}
 */
async function generateGreeting(childName, juzList) {
    if (!GEMINI_CONFIG.apiKey) {
        return `Assalamualaikum ${childName}! Hari ini kita latihan sambung ayat dari Juz ${juzList.join(' dan ')} ya. Siap?`;
    }

    try {
        const prompt = `
Buat sapaan singkat (maksimal 2 kalimat) sebagai ustadz yang akan menguji hafalan santri bernama ${childName}.
Sebutkan bahwa hari ini akan latihan sambung ayat dari Juz ${juzList.join(' dan ')}.
Gunakan bahasa Indonesia yang ramah dan menyemangati.
Respond hanya teks sapaan saja, tanpa format apapun.
`;

        const response = await fetch(
            `${GEMINI_CONFIG.endpoint}/${GEMINI_CONFIG.model}:generateContent?key=${GEMINI_CONFIG.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 100 }
                })
            }
        );

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ||
            `Assalamualaikum ${childName}! Siap latihan sambung ayat?`;
    } catch (error) {
        return `Assalamualaikum ${childName}! Hari ini kita latihan sambung ayat dari Juz ${juzList.join(' dan ')} ya. Siap?`;
    }
}

/**
 * Check apakah Gemini sudah dikonfigurasi
 * @returns {boolean}
 */
function isGeminiConfigured() {
    return GEMINI_CONFIG.apiKey && GEMINI_CONFIG.apiKey.length > 0;
}
