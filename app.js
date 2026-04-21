/* === CONFIG & STATE === */
let state = {
    category: null, mode: null, data: [], currentIdx: 0,
    lives: 3, streak: 0, jokerUsed: false, inputText: ""
};

const AppDirector = {
    changeScreen(screen) {
        document.querySelectorAll('.blueprint-screen').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-screen="${screen}"]`).classList.add('active');
        
        document.getElementById('stats-bar').classList.toggle('hidden', screen === 'menu');
        document.getElementById('btn-back').classList.toggle('hidden', screen === 'menu' || screen === 'playing');
        document.getElementById('thumb-zone').classList.toggle('hidden', screen !== 'playing');
    },
    goBack() {
        this.changeScreen('menu');
        state.category = null;
    }
};

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
        const cacheBusterUrl = file + '?v=' + new Date().getTime(); 
        const response = await fetch(cacheBusterUrl);
        const all = await response.json();
        
        state.data = all.filter(d => state.category.includes(d.type.toString()));
        state.data = state.data.sort(() => Math.random() - 0.5).slice(0, 20); 
        
        AppDirector.changeScreen('playing');
        loadNext(true);
    } catch(e) { 
        alert("Fehler beim Laden der Fragen. Überprüfe den Dateinamen auf GitHub!"); 
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

    if (state.mode === 'quickie') renderQuickie(q);
    else renderTest(q);
}

function renderQuickie(q) {
    const cont = document.getElementById('quickie-controls');
    cont.classList.remove('hidden');
    document.getElementById('ap-controls').classList.add('hidden');
    cont.innerHTML = "";

    const safeDistractors = q.distractors || ["Fehler: Keine Distraktoren", "Bitte Cache leeren"];
    let options = [q.solution, ...safeDistractors].sort(() => 0.5 - Math.random());

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

function checkAnswer() {
    const q = state.data[state.currentIdx];
    const input = WordValidator.sanitize(state.inputText);

    const sanitizedSolutions = q.solutions.map(s => WordValidator.sanitize(s));
    if (sanitizedSolutions.includes(input)) return handleCorrect();

    let isTypo = false;
    let targetForTypo = q.solutions[0];

    for (let sol of q.solutions) {
        const result = WordValidator.check(input, sol);
        if (result.status === 'typo') {
            isTypo = true; targetForTypo = sol; break;
        }
    }

    if (isTypo && !state.jokerUsed) {
        state.jokerUsed = true;
        showFlash("Tippfehler korrigiert!", "flash-orange");
        state.inputText = targetForTypo;
        document.getElementById('ap-input-display').textContent = state.inputText + "_";
        setTimeout(handleCorrect, 1200); 
    } else {
        handleWrong(input, null, q.solutions[0]); 
    }
}

/* === FEEDBACK LOGIC === */
function handleCorrect() {
    // Der neue grüne Blitz auf der Glas-Box!
    const glassBox = document.getElementById('playing-glass-box');
    glassBox.classList.add('flash-success-box');
    
    // Nach 500ms das Grün wieder wegnehmen
    setTimeout(() => {
        glassBox.classList.remove('flash-success-box');
    }, 500);

    state.streak++;
    StreakManager.add();
    
    // Nach 1 Sekunde automatisch zum nächsten Satz
    setTimeout(loadNext, 1000);
}

function handleWrong(val, btn, correct) {
    if (!state.jokerUsed && state.mode === 'quickie') {
        state.jokerUsed = true;
        if(btn) btn.classList.add('disabled');
        showFlash("Joker genutzt!", "flash-orange");
    } else {
        state.lives--;
        updateStats();
        state.streak = 0; 
        showFlash(`Falsch! Lösung:\n${correct}`, "flash-red", 3000);
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
    init() { document.getElementById('streak-count').textContent = localStorage.getItem('iffy_streak') || 0; },
    add() { 
        let s = (parseInt(localStorage.getItem('iffy_streak')) || 0) + 1;
        localStorage.setItem('iffy_streak', s);
        this.init();
    }
};

function updateStats() { document.getElementById('lives').textContent = "❤️".repeat(state.lives); }
function showFlash(m, c, d=1500) {
    const f = document.getElementById('feedback-flash');
    f.textContent = m; f.className = c; f.classList.remove('hidden');
    if(d < 3000) setTimeout(() => f.classList.add('hidden'), d);
}
function finishGame() { alert("Super! Training abgeschlossen."); AppDirector.changeScreen('menu'); }
function gameOver() { 
    document.getElementById('game-over-screen').classList.remove('hidden'); 
    setTimeout(() => location.reload(), 3000); 
}

window.onload = () => { StreakManager.init(); };
