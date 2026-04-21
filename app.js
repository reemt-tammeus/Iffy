/* === CONFIG & STATE === */
let state = {
    category: null, mode: null, data: [], currentIdx: 0,
    lives: 3, streak: 0, jokerUsed: false, inputText: ""
};

const AppDirector = {
    changeScreen(screen) {
        document.querySelectorAll('.blueprint-screen').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-screen="${screen}"]`).classList.add('active');
        document.getElementById('btn-back').classList.toggle('hidden', screen === 'menu');
        document.getElementById('thumb-zone').classList.toggle('hidden', screen !== 'playing');
        document.getElementById('game-progress').classList.toggle('hidden', screen !== 'playing');
    },
    goBack() {
        const current = document.querySelector('.blueprint-screen.active').dataset.screen;
        if (current === 'modes') this.changeScreen('menu');
        else if (current === 'playing') {
            if(confirm("Abbrechen? Dein Fortschritt geht verloren.")) this.changeScreen('modes');
        }
    }
};

/* === DATA LOADING === */
function selectCategory(cat) {
    state.category = cat;
    AppDirector.changeScreen('modes');
}

async function selectMode(mode) {
    state.mode = mode;
    state.currentIdx = 0; state.lives = 3; state.streak = 0;
    updateStats();
    
    const file = (mode === 'quickie') ? 'data_quickie.json' : 'data_ap.json';
    try {
        const response = await fetch(file);
        const all = await response.json();
        
        // Filtern und Mischen
        state.data = all.filter(d => state.category.includes(d.type.toString()));
        state.data = state.data.sort(() => Math.random() - 0.5).slice(0, 20); // 20 Fragen pro Runde
        
        AppDirector.changeScreen('playing');
        loadNext(true);
    } catch(e) { 
        alert("JSON Dateien konnten nicht geladen werden! Läuft die App auf einem Server?"); 
        console.error(e);
    }
}

/* === GAME CORE === */
function loadNext(first = false) {
    if (!first) state.currentIdx++;
    if (state.currentIdx >= state.data.length) return finishGame();

    state.jokerUsed = false; 
    state.inputText = "";
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('feedback-flash').classList.add('hidden');
    
    const q = state.data[state.currentIdx];
    document.getElementById('text-display').innerHTML = q.text;
    updateProgress();

    if (state.mode === 'quickie') renderQuickie(q);
    else renderTest(q);
}

// NEUE LOGIK: Zieht Distraktoren direkt aus der JSON
function renderQuickie(q) {
    const cont = document.getElementById('quickie-controls');
    cont.classList.remove('hidden');
    document.getElementById('ap-controls').classList.add('hidden');
    cont.innerHTML = "";

    // Fügt Lösung und Distraktoren zusammen und mischt sie
    let options = [q.solution, ...q.distractors].sort(() => 0.5 - Math.random());

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = () => {
            if (opt === q.solution) handleCorrect();
            else handleWrong(opt, btn, q.solution);
        };
        cont.appendChild(btn);
    });
}

function renderTest() {
    const cont = document.getElementById('ap-controls');
    cont.classList.remove('hidden');
    document.getElementById('quickie-controls').classList.add('hidden');
    document.getElementById('ap-input-display').textContent = "_";
    
    const kb = document.getElementById('keyboard');
    kb.innerHTML = "";
    const rows = [['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l'],['z','x','c','v','b','n','m',"'"],['SPACE','DEL']];
    rows.forEach(r => {
        const rowDiv = document.createElement('div'); rowDiv.className = 'keyboard-row';
        r.forEach(key => {
            const k = document.createElement('div');
            k.className = `key ${key==='SPACE'?'key-space':''} ${key==='DEL'?'key-del':''}`;
            k.textContent = key === 'DEL' ? '⌫' : key;
            k.onclick = () => {
                if(key==='SPACE') state.inputText += " ";
                else if(key==='DEL') state.inputText = state.inputText.slice(0, -1);
                else state.inputText += key;
                document.getElementById('ap-input-display').textContent = state.inputText + "_";
            };
            rowDiv.appendChild(k);
        });
        kb.appendChild(rowDiv);
    });
}

// NEUE LOGIK: Loopt durch alle Lösungen für die Typo-Erkennung
function checkAnswer() {
    const q = state.data[state.currentIdx];
    const input = WordValidator.sanitize(state.inputText);

    // 1. Ist die Eingabe exakt in den Lösungen?
    const sanitizedSolutions = q.solutions.map(s => WordValidator.sanitize(s));
    if (sanitizedSolutions.includes(input)) {
        return handleCorrect();
    }

    // 2. Prüfe auf Tippfehler gegen ALLE erlaubten Lösungen
    let isTypo = false;
    let targetForTypo = q.solutions[0]; // Fallback

    for (let sol of q.solutions) {
        const result = WordValidator.check(input, sol);
        if (result.status === 'typo') {
            isTypo = true;
            targetForTypo = sol; // Merke das richtige Wort
            break;
        }
    }

    // 3. Auswertung
    if (isTypo && !state.jokerUsed) {
        state.jokerUsed = true;
        showFlash("Tippfehler korrigiert!", "flash-orange");
        state.inputText = targetForTypo;
        document.getElementById('ap-input-display').textContent = state.inputText + "_";
        setTimeout(handleCorrect, 1000); // Geht automatisch weiter
    } else {
        handleWrong(input, null, q.solutions[0]); // q.solutions[0] als Hauptlösung anzeigen
    }
}

/* === FEEDBACK & GAMIFICATION === */
function handleCorrect() {
    showFlash("RICHTIG!", "flash-green");
    state.streak++;
    if (state.streak >= 3) FireworksEngine.launch();
    StreakManager.add();
    setTimeout(loadNext, 800);
}

function handleWrong(val, btn, correct) {
    if (!state.jokerUsed && state.mode === 'quickie') {
        state.jokerUsed = true;
        if(btn) btn.classList.add('disabled');
        showFlash("Joker genutzt!", "flash-orange");
    } else {
        state.lives--;
        updateStats();
        state.streak = 0; // Streak bricht bei Fehler ab
        showFlash(`Falsch! Lösung: ${correct}`, "flash-red", 3000);
        if (state.lives <= 0) return gameOver();
        document.getElementById('next-btn').classList.remove('hidden');
    }
}

const WordValidator = {
    sanitize: s => s.toLowerCase().trim().replace(/[’´`‘]/g, "'"),
    check(i, t) {
        if(i === t) return {status:'perfect'};
        return (i.length > 3 && Math.abs(i.length - t.length) <= 1) ? {status:'typo'} : {status:'wrong'};
    }
};

const StreakManager = {
    init() { document.getElementById('blueprint-streak-count').textContent = localStorage.getItem('iffy_streak') || 0; },
    add() { 
        let s = (parseInt(localStorage.getItem('iffy_streak')) || 0) + 1;
        localStorage.setItem('iffy_streak', s);
        this.init();
    }
};

const FireworksEngine = {
    init() { this.canvas = document.getElementById('blueprint-fireworks'); this.ctx = this.canvas.getContext('2d'); },
    launch() { 
        this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight;
        this.ctx.fillStyle = "yellow"; this.ctx.fillRect(Math.random()*this.canvas.width, 100, 50, 50);
        setTimeout(() => this.ctx.clearRect(0,0,9999,9999), 600);
    }
};

function updateStats() { document.getElementById('lives').textContent = "❤️".repeat(state.lives); }
function updateProgress() { document.getElementById('blueprint-progress-fill').style.width = `${((state.currentIdx+1)/state.data.length)*100}%`; }
function showFlash(m, c, d=1500) {
    const f = document.getElementById('feedback-flash');
    f.textContent = m; f.className = c; f.classList.remove('hidden');
    if(d < 3000) setTimeout(() => f.classList.add('hidden'), d);
}
function finishGame() { AppDirector.changeScreen('menu'); alert("Super! Training abgeschlossen."); }
function gameOver() { 
    document.getElementById('game-over-screen').classList.remove('hidden'); 
    setTimeout(() => location.reload(), 3000); 
}

window.onload = () => { StreakManager.init(); FireworksEngine.init(); };
