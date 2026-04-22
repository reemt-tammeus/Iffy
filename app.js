/* === STATE === */
let state = { 
    category: null, mode: null, rawPool: [], activeQueue: [], 
    currentIdx: 0, blockCounter: 0, blockLimit: 5,
    lives: 3, maxLives: 3, streak: 0, jokerUsed: false, inputText: "" 
};

const AppDirector = {
    changeScreen(screen) {
        document.querySelectorAll('.blueprint-screen').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-screen="${screen}"]`).classList.add('active');
        document.getElementById('stats-bar').classList.toggle('hidden', screen === 'menu');
        document.getElementById('btn-back').classList.toggle('hidden', screen === 'playing' || screen === 'continue');
        document.getElementById('thumb-zone').classList.toggle('hidden', screen !== 'playing');
    },
    goBack() { 
        state.streak = 0; // Streak verfällt beim Verlassen des Spiels
        this.changeScreen('menu'); 
    },
    continueGame() {
        state.blockCounter = 0;
        state.lives = state.maxLives; // Herzen auffüllen
        updateStats();
        this.changeScreen('playing');
        loadNext();
    }
};

function selectCategory(cat) { state.category = cat; AppDirector.changeScreen('modes'); }

async function selectMode(mode) {
    state.mode = mode;
    state.maxLives = (mode === 'quickie') ? 2 : 3;
    state.blockLimit = (mode === 'quickie') ? 5 : 10;
    state.lives = state.maxLives;
    state.blockCounter = 0;
    state.streak = 0;
    updateStats();

    const file = (mode === 'quickie') ? 'data_quickie.json' : 'data_ap.json';
    try {
        const response = await fetch(file + '?v=' + new Date().getTime());
        const all = await response.json();
        state.rawPool = all.filter(d => state.category.includes(d.type.toString()));
        reshuffle();
        AppDirector.changeScreen('playing');
        loadNext();
    } catch(e) { alert("Fehler beim Laden!"); }
}

function reshuffle() {
    state.activeQueue = [...state.rawPool].sort(() => 0.5 - Math.random());
    state.currentIdx = 0;
}

function loadNext() {
    // Falls Pool leer ist, neu mischen (Endlos-Loop)
    if (state.activeQueue.length === 0) reshuffle();
    
    // Prüfen ob Block zu Ende ist
    if (state.blockCounter >= state.blockLimit) {
        return AppDirector.changeScreen('continue');
    }

    state.jokerUsed = false; state.inputText = "";
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('feedback-flash').classList.add('hidden');
    
    const q = state.activeQueue.shift();
    state.currentQuestion = q;
    document.getElementById('text-display').innerHTML = q.text;
    updateProgress();

    if (state.mode === 'quickie') renderQuickie(q); else renderTest(q);
}

/* === INTERFACE === */
function renderQuickie(q) {
    const cont = document.getElementById('quickie-controls');
    cont.classList.remove('hidden'); document.getElementById('ap-controls').classList.add('hidden');
    cont.innerHTML = "";
    let opts = [q.solution, ...q.distractors].sort(() => 0.5 - Math.random());
    opts.forEach(opt => {
        const b = document.createElement('button'); b.textContent = opt;
        b.onclick = () => (opt === q.solution) ? handleCorrect() : handleWrong(opt, b, q.solution);
        cont.appendChild(b);
    });
}

function renderTest() {
    const cont = document.getElementById('ap-controls');
    cont.classList.remove('hidden'); document.getElementById('quickie-controls').classList.add('hidden');
    document.getElementById('ap-input-display').textContent = "_";
    const kb = document.getElementById('keyboard'); kb.innerHTML = "";
    const rows = [['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l'],['z','x','c','v','b','n','m',"'"],['SPACE','DEL']];
    rows.forEach(r => {
        const row = document.createElement('div'); row.className = 'keyboard-row';
        r.forEach(key => {
            const k = document.createElement('div'); k.className = `key ${key==='SPACE'?'key-space':''} ${key==='DEL'?'key-del':''}`;
            k.textContent = (key==='DEL')?'⌫':key;
            k.onclick = () => {
                if(key==='SPACE') state.inputText += " "; else if(key==='DEL') state.inputText = state.inputText.slice(0, -1); else state.inputText += key;
                document.getElementById('ap-input-display').textContent = state.inputText + "_";
            };
            row.appendChild(k);
        });
        kb.appendChild(row);
    });
}

/* === FEEDBACK === */
function checkAnswer() {
    const q = state.currentQuestion;
    const input = state.inputText.toLowerCase().trim().replace(/[’´`‘]/g, "'");
    if (q.solutions.map(s => s.toLowerCase().trim()).includes(input)) return handleCorrect();
    
    let isTypo = false;
    for (let sol of q.solutions) {
        let s = sol.toLowerCase().trim();
        if (input.length > 3 && Math.abs(input.length - s.length) <= 1) { isTypo = true; break; }
    }

    if (isTypo && !state.jokerUsed) {
        state.jokerUsed = true; showFlash("Tippfehler!", "flash-orange");
    } else handleWrong(input, null, q.solutions[0]);
}

function handleCorrect() {
    const box = document.getElementById('playing-glass-box');
    box.classList.add('success-flash');
    state.streak++;
    state.blockCounter++;
    updateStats();
    setTimeout(() => { box.classList.remove('success-flash'); loadNext(); }, 600);
}

function handleWrong(val, btn, correct) {
    if (state.mode === 'quickie') {
        processFatalError(btn, correct);
    } else {
        if (!state.jokerUsed) {
            state.jokerUsed = true; showFlash("Joker genutzt!", "flash-orange");
        } else {
            processFatalError(null, correct);
        }
    }
}

function processFatalError(btn, correct) {
    state.lives--;
    state.streak = 0; // Gnadenloser Reset
    state.blockCounter++;
    updateStats();
    if(btn) btn.style.opacity = "0.3";
    showFlash(`Falsch!\nLösung: ${correct}`, "flash-red", 3000);
    if (state.lives <= 0) return gameOver();
    document.getElementById('next-btn').classList.remove('hidden');
}

/* === UTILS === */
function updateStats() { 
    document.getElementById('lives').textContent = "❤️".repeat(state.lives); 
    const sc = document.getElementById('streak-count');
    const sd = document.getElementById('streak-display');
    sc.textContent = state.streak;
    sd.classList.toggle('streak-gray', state.streak === 0);
}

function updateProgress() {
    const p = (state.blockCounter / state.blockLimit) * 100;
    document.getElementById('progress-bar').style.width = p + "%";
}

function showFlash(m, c, d=1500) {
    const f = document.getElementById('feedback-flash');
    f.innerText = m; f.className = c; f.classList.remove('hidden');
    if(d<3000) setTimeout(() => f.classList.add('hidden'), d);
}

function gameOver() { 
    document.getElementById('game-over-screen').classList.remove('hidden'); 
    setTimeout(()=>location.reload(), 3000); 
}

window.onload = () => { updateStats(); };
