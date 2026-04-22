let allData = { ap: [], quickie: [] };
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let sessionMode = ''; // 'ap' oder 'quickie'

// 1. Daten beim Start laden
async function initApp() {
    try {
        const [resAp, resQuick] = await Promise.all([
            fetch('data_ap.json'),
            fetch('data_quickie.json')
        ]);
        allData.ap = await resAp.json();
        allData.quickie = await resQuick.json();
        console.log("Daten erfolgreich geladen");
    } catch (err) {
        console.error("Fehler beim Laden der JSON-Daten:", err);
    }
}

// 2. Die "Pädagogische Firewall" - Filter-Logik
function selectQuestions(mode, category) {
    const pool = allData[mode];
    document.body.classList.remove('hardcore'); // Reset Theme

    if (category === 'type1') {
        return pool.filter(q => q.type === 1 && q.isStandard);
    }
    if (category === 'type2') {
        return pool.filter(q => q.type === 2);
    }
    if (category === 'type3') {
        return pool.filter(q => q.type === 3);
    }
    if (category === 'mix12') {
        return pool.filter(q => (q.type === 2) || (q.type === 1 && q.isStandard));
    }
    if (category === 'mix13') {
        // Y10-HARDCORE MODUS
        document.body.classList.add('hardcore'); 
        return pool.filter(q => (q.type === 1 && q.isMaster) || q.type === 2 || q.type === 3);
    }
    return [];
}

// 3. Session starten
function startSession(mode, category) {
    sessionMode = mode;
    const filtered = selectQuestions(mode, category);
    
    // Zufällige Auswahl von 10 Fragen aus dem gefilterten Pool
    currentQuestions = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
    
    currentIndex = 0;
    score = 0;
    
    showScreen('game-screen');
    renderQuestion();
}

// 4. Frage anzeigen
function renderQuestion() {
    const q = currentQuestions[currentIndex];
    const container = document.getElementById('question-container');
    container.innerHTML = `<h3>Frage ${currentIndex + 1} von 10</h3><p class="question-text">${q.text}</p>`;

    if (sessionMode === 'quickie') {
        // Multiple Choice: Antworten mischen
        const options = [q.solution, ...q.distractors].sort(() => 0.5 - Math.random());
        const btnBox = document.createElement('div');
        btnBox.className = 'options-grid';
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(opt);
            btnBox.appendChild(btn);
        });
        container.appendChild(btnBox);
    } else {
        // AP Mode: Tippen
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'user-input';
        input.placeholder = 'Lösung hier tippen...';
        input.onkeyup = (e) => { if(e.key === 'Enter') checkAnswer(input.value); };
        
        const subBtn = document.createElement('button');
        subBtn.innerText = 'Prüfen';
        subBtn.onclick = () => checkAnswer(input.value);
        
        container.appendChild(input);
        container.appendChild(subBtn);
        input.focus();
    }
}

// 5. Antwort prüfen
function checkAnswer(userAnswer) {
    const q = currentQuestions[currentIndex];
    let isCorrect = false;

    if (sessionMode === 'quickie') {
        isCorrect = (userAnswer === q.solution);
    } else {
        isCorrect = q.solutions.some(s => s.toLowerCase().trim() === userAnswer.toLowerCase().trim());
    }

    if (isCorrect) {
        score++;
        alert("Richtig! 🌟");
    } else {
        const correctInfo = sessionMode === 'quickie' ? q.solution : q.solutions[0];
        alert(`Leider falsch. Korrekt wäre: ${correctInfo}`);
    }

    currentIndex++;
    if (currentIndex < 10) {
        renderQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    alert(`Training beendet! Dein Score: ${score} von 10`);
    showScreen('start-screen');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

// Start
window.onload = initApp;
