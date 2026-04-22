let allData = { ap: [], quickie: [] };
let gameState = {
    selectedTypes: [],
    mode: '', // 'quickie' oder 'test'
    currentPool: [],
    currentIndex: 0,
    score: 0,
    streak: 0
};

// 1. Initialisierung
async function initApp() {
    try {
        const [resAp, resQuick] = await Promise.all([
            fetch('data_ap.json'),
            fetch('data_quickie.json')
        ]);
        allData.ap = await resAp.json();
        allData.quickie = await resQuick.json();
        console.log("Iffy-Daten geladen.");
    } catch (err) {
        console.error("Ladefehler:", err);
    }
}

// 2. Kategorie-Wahl (Typ I, II, III oder Mix)
function selectCategory(types) {
    gameState.selectedTypes = types;
    // Hardcore-Check für Mix I-III
    if (types.length === 3) {
        document.body.classList.add('hardcore');
    } else {
        document.body.classList.remove('hardcore');
    }
    showScreen('modes');
}

// 3. Modus-Wahl & Spielstart
function selectMode(mode) {
    gameState.mode = mode;
    const poolSource = (mode === 'test') ? allData.ap : allData.quickie;
    
    // Filter-Logik (Pädagogische Firewall)
    gameState.currentPool = poolSource.filter(q => {
        const t = q.type.toString();
        if (!gameState.selectedTypes.includes(t)) return false;

        // Spezialregel: Mix I-III (Hardcore) nutzt bei Typ 1 NUR Master-Sätze
        if (gameState.selectedTypes.length === 3 && q.type === 1) {
            return q.isMaster;
        }
        
        // Standard-Regel: Typ 1 Einzeltraining nutzt NUR Standard-Sätze
        if (gameState.selectedTypes.length === 1 && q.type === 1) {
            return q.isStandard;
        }

        return true; // Typ 2 und 3 sind immer dabei
    });

    // Mischen und auf 10 begrenzen
    gameState.currentPool = gameState.currentPool.sort(() => 0.5 - Math.random()).slice(0, 10);
    gameState.currentIndex = 0;
    gameState.score = 0;

    showScreen('playing');
    renderQuestion();
}

// 4. Frage rendern
function renderQuestion() {
    const q = gameState.currentPool[gameState.currentIndex];
    const textDisplay = document.getElementById('text-display');
    const thumbZone = document.getElementById('thumb-zone');
    const quickieControls = document.getElementById('quickie-controls');
    const apControls = document.getElementById('ap-controls');

    textDisplay.innerText = q.text;
    thumbZone.classList.remove('hidden');

    if (gameState.mode === 'quickie') {
        quickieControls.classList.remove('hidden');
        apControls.classList.add('hidden');
        
        // Multiple Choice Buttons
        const opts = [q.solution, ...q.distractors].sort(() => 0.5 - Math.random());
        quickieControls.innerHTML = '';
        opts.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(opt);
            quickieControls.appendChild(btn);
        });
    } else {
        apControls.classList.remove('hidden');
        quickieControls.classList.add('hidden');
        // Hier müsste dein Tastatur-Code/Input-Code für den Test-Mode rein
        document.getElementById('ap-input-display').innerText = '_';
    }
}

// 5. Antwort-Check
function checkAnswer(answer) {
    const q = gameState.currentPool[gameState.currentIndex];
    let correct = false;

    if (gameState.mode === 'quickie') {
        correct = (answer === q.solution);
    } else {
        // Logik für Test-Mode (Eingabe-Feld)
        const input = document.getElementById('ap-input-display').innerText; // Beispielhaft
        correct = q.solutions.some(s => s.toLowerCase() === answer.toLowerCase());
    }

    if (correct) {
        gameState.score++;
        gameState.streak++;
        showFeedback("Richtig! 🔥", "correct");
    } else {
        gameState.streak = 0;
        const solution = (gameState.mode === 'quickie') ? q.solution : q.solutions[0];
        showFeedback(`Falsch! Richtig: ${solution}`, "wrong");
    }

    document.getElementById('streak-count').innerText = gameState.streak;
    setTimeout(nextQuestion, 1500);
}

function nextQuestion() {
    gameState.currentIndex++;
    if (gameState.currentIndex < 10) {
        renderQuestion();
    } else {
        showScreen('continue');
    }
}

// Hilfsfunktionen
function showScreen(screenId) {
    document.querySelectorAll('.blueprint-screen').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-screen="${screenId}"]`).classList.add('active');
    
    // Stats Bar Handling
    const statsBar = document.getElementById('stats-bar');
    (screenId === 'playing') ? statsBar.classList.remove('hidden') : statsBar.classList.add('hidden');
}

function showFeedback(text, type) {
    const f = document.getElementById('feedback-flash');
    f.innerText = text;
    f.className = `feedback ${type}`;
    f.classList.remove('hidden');
    setTimeout(() => f.classList.add('hidden'), 1400);
}

// AppDirector Mockup für deine Buttons
const AppDirector = {
    goBack: () => showScreen('menu'),
    continueGame: () => showScreen('menu')
};

window.onload = initApp;
