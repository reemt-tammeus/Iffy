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
        state.streak = 0;
        this.changeScreen('menu'); 
    },
    continueGame() {
        state.blockCounter = 0;
        state.lives = state.maxLives;
        updateStats();
        this.changeScreen('playing');
        loadNext();
    }
};

function selectCategory(cat) { 
    state.category = cat; 
    if (cat.length === 3) document.body.classList.add('hardcore');
    else document.body.classList.remove('hardcore');
    AppDirector.changeScreen('modes'); 
}

async function selectMode(mode) {
    state.mode = mode;
    state.maxLives = (mode === 'quickie') ? 2 : 3;
    state.blockLimit = (mode === 'quickie') ? 5 : 10;
    state.lives = state.maxLives;
    state.streak = 0;
    state.blockCounter = 0;

    const file = (mode === 'quickie') ? 'data_quickie.json' : 'data_ap.json';
    try {
        const response = await fetch(file);
        const data = await response.json();

        // PÄDAGOGISCHE FIREWALL
        state.rawPool = data.filter(q => {
            const tStr = q.type.toString();
            if (!state.category.includes(tStr)) return false;

            if (state.category.length === 3) {
                if (q.type === 1) return q.isMaster === true;
                return true; 
            }
            if (state.category.includes("1")) {
                if (q.type === 1) return q.isStandard === true;
                return true;
            }
            return true;
        });

        reshuffle();
        updateStats();
        AppDirector.changeScreen('playing');
        loadNext();
    } catch(e) { console.error("Ladefehler!"); }
}

function reshuffle() {
    state.activeQueue = [...state.rawPool].sort(() => 0.5 - Math.random());
}

function loadNext() {
    if (state.activeQueue.length === 0) reshuffle();
    if (state.blockCounter >= state.blockLimit) return AppDirector.changeScreen('continue');

    state.jokerUsed = false; state.inputText = "";
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('feedback-flash').classList.add('hidden');
    
    const q = state.activeQueue.shift();
    state.currentQuestion = q;
    document.getElementById('text-display').innerText = q.text;
    updateProgress();

    if (state.mode === 'quickie') renderQuickie(q); else renderTest();
}

function renderQuickie(q) {
    const box = document.getElementById('quickie-controls');
    box.classList.remove('hidden'); document.getElementById('ap-controls').classList.add('hidden');
    box.innerHTML = "";
    const opts = [q.solution, ...q.distractors].sort(() => 0.5 - Math.random());
    opts.forEach(o => {
        const b = document.createElement('button'); b.textContent = o;
        b.onclick = () => (o === q.solution) ? handleCorrect() : handleWrong(o, b, q.solution);
        box.appendChild(b);
    });
}

function renderTest() {
    const box = document.getElementById('ap-controls');
    box.classList.remove('hidden'); document.getElementById('quickie-controls').classList.add('hidden');
    const kb = document.getElementById('keyboard'); kb.innerHTML = "";
    const layout = [['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l'],['z','x','c','v','b','n','m',"'"],['SPACE','DEL']];
    layout.forEach(row => {
        const rDiv = document.createElement('div'); rDiv.className = 'keyboard-row';
        row.forEach(key => {
            const k = document.createElement('div'); k.className = `key ${key==='SPACE'?'key-space':''} ${key==='DEL'?'key-del':''}`;
            k.textContent = (key==='DEL') ? '⌫' : key.toUpperCase();
            k.onclick = () => {
                if(key==='SPACE') state.inputText += " "; else if(key==='DEL') state.inputText = state.inputText.slice(0, -1); else state.inputText += key;
                document.getElementById('ap-input-display').textContent = state.inputText + "_";
            };
            rDiv.appendChild(k);
        });
        kb.appendChild(rDiv);
    });
}

function checkAnswer() {
    const q = state.currentQuestion;
    const input = state.inputText.toLowerCase().trim().replace(/[’´`‘]/g, "'");
    if (q.solutions.map(s => s.toLowerCase().trim()).includes(input)) return handleCorrect();
    
    let isTypo = q.solutions.some(sol => {
        let s = sol.toLowerCase().trim();
        return input.length > 3 && Math.abs(input.length - s.length) <= 1;
    });

    if (isTypo && !state.jokerUsed) {
        state.jokerUsed = true; showFlash("Tippfehler!", "flash-orange");
    } else handleWrong(input, null, q.solutions[0]);
}

function handleCorrect() {
    state.streak++; state.blockCounter++; updateStats();
    showFlash("Richtig! 🌟", "flash-green");
    setTimeout(loadNext, 1200);
}

function handleWrong(val, btn, correct) {
    state.lives--; state.streak = 0; state.blockCounter++; updateStats();
    if(btn) btn.style.opacity = "0.3";
    showFlash(`Falsch!\nLösung: ${correct}`, "flash-red", 3000);
    if (state.lives <= 0) return gameOver();
    document.getElementById('next-btn').classList.remove('hidden');
}

function updateStats() { 
    document.getElementById('lives').textContent = "❤️".repeat(state.lives); 
    document.getElementById('streak-count').textContent = state.streak;
    document.getElementById('streak-display').classList.toggle('streak-gray', state.streak === 0);
}

function updateProgress() {
    document.getElementById('progress-bar').style.width = (state.blockCounter / state.blockLimit) * 100 + "%";
}

function showFlash(m, c, d=1500) {
    const f = document.getElementById('feedback-flash');
    f.innerText = m; f.className = `feedback ${c}`; f.classList.remove('hidden');
    if(d < 3000) setTimeout(() => f.classList.add('hidden'), d);
}

function gameOver() { 
    document.getElementById('game-over-screen').classList.remove('hidden'); 
    setTimeout(()=>location.reload(), 3500); 
}
