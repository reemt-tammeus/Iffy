/* === STATE === */
let state = { category: null, mode: null, data: [], currentIdx: 0, lives: 3, streak: 0, jokerUsed: false, inputText: "" };

const AppDirector = {
    changeScreen(screen) {
        document.querySelectorAll('.blueprint-screen').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-screen="${screen}"]`).classList.add('active');
        document.getElementById('stats-bar').classList.toggle('hidden', screen === 'menu');
        document.getElementById('btn-back').classList.toggle('hidden', screen === 'playing');
        document.getElementById('thumb-zone').classList.toggle('hidden', screen !== 'playing');
    },
    goBack() { this.changeScreen('menu'); }
};

/* === CORE LOGIC === */
function selectCategory(cat) { state.category = cat; AppDirector.changeScreen('modes'); }

async function selectMode(mode) {
    state.mode = mode; state.currentIdx = 0; state.lives = 3; state.streak = 0;
    updateStats();
    const file = (mode === 'quickie') ? 'data_quickie.json' : 'data_ap.json';
    try {
        const response = await fetch(file + '?v=' + new Date().getTime());
        const all = await response.json();
        state.data = all.filter(d => state.category.includes(d.type.toString())).sort(() => 0.5 - Math.random()).slice(0, 20);
        AppDirector.changeScreen('playing');
        loadNext(true);
    } catch(e) { console.error(e); }
}

function loadNext(first = false) {
    if (!first) state.currentIdx++;
    if (state.currentIdx >= state.data.length) return finishGame();
    state.jokerUsed = false; state.inputText = "";
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('feedback-flash').classList.add('hidden');
    const q = state.data[state.currentIdx];
    document.getElementById('text-display').innerHTML = q.text;
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
    const q = state.data[state.currentIdx];
    const input = state.inputText.toLowerCase().trim().replace(/[’´`‘]/g, "'");
    if (q.solutions.map(s => s.toLowerCase().trim()).includes(input)) return handleCorrect();
    
    // Typo Joker Logik
    let isTypo = false;
    for (let sol of q.solutions) {
        let s = sol.toLowerCase().trim();
        if (input.length > 3 && Math.abs(input.length - s.length) <= 1) { isTypo = true; break; }
    }

    if (isTypo && !state.jokerUsed) {
        state.jokerUsed = true; showFlash("Tippfehler erkannt!", "flash-orange");
    } else handleWrong(input, null, q.solutions[0]);
}

function handleCorrect() {
    const box = document.getElementById('playing-glass-box');
    box.classList.add('success-flash'); // Der Grüne Blitz
    state.streak++;
    StreakManager.update();
    setTimeout(() => { box.classList.remove('success-flash'); loadNext(); }, 600);
}

function handleWrong(val, btn, correct) {
    if (!state.jokerUsed && state.mode === 'quickie') {
        state.jokerUsed = true; if(btn) btn.style.opacity = "0.3"; showFlash("Joker genutzt!", "flash-orange");
    } else {
        state.lives--; updateStats(); state.streak = 0;
        showFlash(`Falsch!\nLösung: ${correct}`, "flash-red", 3000);
        if (state.lives <= 0) return gameOver();
        document.getElementById('next-btn').classList.remove('hidden');
    }
}

/* === UTILS === */
function updateStats() { document.getElementById('lives').textContent = "❤️".repeat(state.lives); }
const StreakManager = {
    update() { document.getElementById('streak-count').textContent = state.streak; }
};
function showFlash(m, c, d=1500) {
    const f = document.getElementById('feedback-flash');
    f.innerText = m; f.className = c; f.classList.remove('hidden');
    if(d<3000) setTimeout(() => f.classList.add('hidden'), d);
}
function finishGame() { alert("Training beendet!"); AppDirector.goBack(); }
function gameOver() { document.getElementById('game-over-screen').classList.remove('hidden'); setTimeout(()=>location.reload(), 3000); }

window.onload = () => { StreakManager.update(); };
