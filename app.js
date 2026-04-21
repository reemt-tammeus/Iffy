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
            if(confirm("Abbrechen?")) this.changeScreen('modes');
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
        state.data = all.filter(d => state.category.includes(d.type.toString()));
        state.data = state.data.sort(() => Math.random() - 0.5).slice(0, 20);
        AppDirector.changeScreen('playing');
        loadNext(true);
    } catch(e) { alert("JSON Dateien fehlen!"); }
}

/* === GAME CORE === */
function loadNext(first = false) {
    if (!first) state.currentIdx++;
    if (state.currentIdx >= state.data.length) return finishGame();

    state.jokerUsed = false; state.inputText = "";
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('feedback-flash').classList.add('hidden');
    
    const q = state.data[state.currentIdx];
    document.getElementById('text-display').innerHTML = q.text;
    updateProgress();

    if (state.mode === 'quickie') renderQuickie(q);
    else renderTest(q);
}

function renderQuickie(q) {
    const cont = document.getElementById('quickie-controls');
    cont.classList.remove('hidden');
    document.getElementById('ap-controls').classList.add('hidden');
    cont.innerHTML = "";

    // PÄDAGOGISCHE DISTRAKTOREN LOGIK
    let pool = [];
    if (state.category === '1') pool = ["stays", "stay", "will stay", "will stay", "can stay"];
    else if (state.category === '2') pool = ["stayed", "would stay", "will stay", "stay"];
    else pool = ["had stayed", "would have stayed", "stayed", "would stay", "will stay"];

    let filtered = [...new Set(pool.filter(p => p !== q.solution))].sort(() => 0.5 - Math.random()).slice(0, 2);
    let options = [q.solution, ...filtered].sort(() => 0.5 - Math.random());

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
    const result = WordValidator.check(input, q.solutions[0]);

    if (q.solutions.map(s => WordValidator.sanitize(s)).includes(input)) handleCorrect();
    else if (result.status === 'typo' && !state.jokerUsed) {
        state.jokerUsed = true;
        showFlash("Tippfehler korrigiert!", "flash-orange");
    } else handleWrong(input, null, q.solutions[0]);
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
function finishGame() { AppDirector.changeScreen('menu'); alert("Fertig!"); }
function gameOver() { document.getElementById('game-over-screen').classList.remove('hidden'); setTimeout(() => location.reload(), 3000); }

window.onload = () => { StreakManager.init(); FireworksEngine.init(); };
