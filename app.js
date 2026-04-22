let allData = { ap: [], quickie: [] };
let state = {
    pool: [],
    index: 0,
    score: 0,
    lives: 3,
    isHardcore: false,
    mode: '' // 'quickie' oder 'test'
};

// AppDirector gemäß index.html
const AppDirector = {
    goBack: () => location.reload(),
    continueGame: () => location.reload()
};

async function init() {
    try {
        const [resAp, resQ] = await Promise.all([fetch('data_ap.json'), fetch('data_quickie.json')]);
        allData.ap = await resAp.json();
        allData.quickie = await resQ.json();
    } catch(e) { console.error("Datenfehler!"); }
}

function selectCategory(types) {
    state.selectedTypes = types;
    state.isHardcore = (types.length === 3); // MIX I-III = Hardcore
    
    document.body.className = state.isHardcore ? 'hardcore' : '';
    switchScreen('modes');
}

function selectMode(mode) {
    state.mode = mode;
    const source = (mode === 'test') ? allData.ap : allData.quickie;
    
    // DIE PÄDAGOGISCHE FIREWALL
    state.pool = source.filter(q => {
        const t = q.type.toString();
        if (!state.selectedTypes.includes(t)) return false;

        // Regel: Im Hardcore-Mix nur Master-Sätze für Typ 1
        if (state.isHardcore && q.type === 1) return q.isMaster;
        
        // Regel: Im Standard-Typ-1-Training nur Standard-Sätze
        if (state.selectedTypes.length === 1 && q.type === 1) return q.isStandard;

        return true; 
    }).sort(() => 0.5 - Math.random()).slice(0, 10);

    startSession();
}

function startSession() {
    state.index = 0; state.score = 0; state.lives = 3;
    updateStats();
    switchScreen('playing');
    renderQuestion();
}

function renderQuestion() {
    const q = state.pool[state.index];
    document.getElementById('text-display').innerText = q.text;
    document.getElementById('thumb-zone').classList.remove('hidden');

    const quickieBox = document.getElementById('quickie-controls');
    const apBox = document.getElementById('ap-controls');

    if (state.mode === 'quickie') {
        quickieBox.classList.remove('hidden');
        apBox.classList.add('hidden');
        renderQuickie(q);
    } else {
        apBox.classList.remove('hidden');
        quickieBox.classList.add('hidden');
        document.getElementById('ap-input-display').innerText = '_';
    }
}

function renderQuickie(q) {
    const box = document.getElementById('quickie-controls');
    box.innerHTML = '';
    // Distraktoren-Logik
    const opts = [q.solution, ...q.distractors].sort(() => 0.5 - Math.random());
    opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(opt);
        box.appendChild(btn);
    });
}

function checkAnswer(val) {
    const q = state.pool[state.index];
    // In einer echten App hier die Logik für AP-Mode vervollständigen
    const correct = (state.mode === 'quickie') ? (val === q.solution) : false;

    if (correct) {
        state.score++;
        showFlash("Korrekt! 🔥", "success");
        next();
    } else {
        state.lives--;
        updateStats();
        if (state.lives <= 0 && state.isHardcore) {
            document.getElementById('game-over-screen').classList.remove('hidden');
        } else {
            showFlash(`Falsch! Lösung: ${q.solution}`, "error");
            next();
        }
    }
}

function next() {
    state.index++;
    if (state.index < 10) setTimeout(renderQuestion, 1500);
    else switchScreen('continue');
}

function updateStats() {
    document.getElementById('stats-bar').classList.remove('hidden');
    document.getElementById('lives').innerText = "❤️".repeat(state.lives);
    document.getElementById('streak-count').innerText = state.score;
}

function switchScreen(id) {
    document.querySelectorAll('.blueprint-screen').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-screen="${id}"]`).classList.add('active');
}

function showFlash(m, c) {
    const f = document.getElementById('feedback-flash');
    f.innerText = m;
    f.className = `feedback ${c}`;
    f.classList.remove('hidden');
    setTimeout(() => f.classList.add('hidden'), 1400);
}

window.onload = init;
