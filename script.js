const questions = [
    {
        question: "تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
        options: [
            "الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا",
            "الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا",
            "فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ"
        ],
        answer: 0
    },
    {
        question: "ن ۚ وَالْقَلَمِ وَمَا يَسْطُرُونَ",
        options: [
            "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ",
            "مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ",
            "بِأَييِّكُمُ الْمَفْتُونُ"
        ],
        answer: 1
    },
    {
        question: "الْحَاقَّةُ - مَا الْحَاقَّةُ",
        options: [
            "كَذَّبَتْ ثَمُودُ وَعَادٌ بِالْقَارِعَةِ",
            "فَأَمَّا ثَمُودُ فَأُهْلِكُوا بِالطَّاغِيَةِ",
            "وَمَا أَدْرَاكَ مَا الْحَاقَّةُ"
        ],
        answer: 2
    },
    {
        question: "يَا أَيُّهَا الْمُزَّمِّلُ",
        options: [
            "قُمِ اللَّيْلَ إِلَّا قَلِيلًا",
            "نِّصْفَهُ أَوِ انقُصْ مِنْهُ قَلِيلًا",
            "أَوْ زِدْ عَلَيْهِ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا"
        ],
        answer: 0
    },
    {
        question: "لَا أُقْسِمُ بِيَوْمِ الْقِيَامَةِ",
        options: [
            "أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ",
            "وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ",
            "بَلَىٰ قَادِرِينَ عَلَىٰ أَن نُّسَوِّيَ بَنَانَهُ"
        ],
        answer: 1
    }
];

let currentQuestionIndex = 0;
let score = 0;

const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const scoreDisplay = document.getElementById('score');
const progressDisplay = document.getElementById('progress');
const finalResultText = document.getElementById('final-resultText');

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

function startGame() {
    currentQuestionIndex = 0;
    score = 0;
    scoreDisplay.innerText = score;
    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    showQuestion();
}

function showQuestion() {
    const question = questions[currentQuestionIndex];
    questionText.innerText = question.question;
    optionsContainer.innerHTML = '';
    
    // Update Progress
    const progress = ((currentQuestionIndex) / questions.length) * 100;
    progressDisplay.style.width = `${progress}%`;

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.innerText = option;
        button.classList.add('option-btn');
        button.classList.add('arabic-option');
        button.addEventListener('click', () => selectAnswer(index));
        optionsContainer.appendChild(button);
    });
}

function selectAnswer(selectedIndex) {
    const question = questions[currentQuestionIndex];
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    
    // Disable all buttons after choice
    buttons.forEach(btn => btn.style.pointerEvents = 'none');

    const pointsPerQuestion = 100 / questions.length;

    if (selectedIndex === question.answer) {
        buttons[selectedIndex].classList.add('correct');
        score += pointsPerQuestion;
        scoreDisplay.innerText = Math.round(score);
    } else {
        buttons[selectedIndex].classList.add('wrong');
        buttons[question.answer].classList.add('correct');
    }

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            showQuestion();
        } else {
            showResult();
        }
    }, 1500);
}

function showResult() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    progressDisplay.style.width = `100%`;
    
    let message = "";
    if (score >= 100) {
        message = "Mumtaz! Hafalan Juz 29 kamu mantap!";
    } else if (score >= 60) {
        message = "Jayyid! Sedikit lagi lancar Juz 29!";
    } else {
        message = "Ayo semangat murojaah lagi Juz 29-nya!";
    }
    
    finalResultText.innerText = `Skor Kamu: ${Math.round(score)}\n${message}`;
}
