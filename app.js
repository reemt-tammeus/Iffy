let state = {
    mode: null, data: [], currentIndex: 0, lives: 3, streak: 0, jokerUsed: false, apInputText: ""
};

// Startet das Spiel und blendet UI ein
async function startGame(selectedMode) {
    state.mode = selectedMode;
    state.lives = 3;
    state.streak = 0;
    state.currentIndex = 0;
    updateStats();

    // Hier MOCK-Daten, später durch echtes JSON laden ersetzen
    state.data = state.mode === 'quickie' ? getQuickieData() : getAPData();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('stats-bar').classList.remove('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('thumb-zone').classList.remove('hidden');

    loadQuestion();
}

function loadQuestion() {
    if (state.currentIndex >= state.data.length) {
        alert("Glückwunsch! Alles geschafft.");
        location.reload();
        return;
    }
    state.jokerUsed = false;
    document.getElementById('next-btn').classList.add('hidden');
    const q = state.data[state.currentIndex];
    document.getElementById('text-display').innerHTML = q.text;

    if (state.mode === 'quickie') {
        document.getElementById('quickie-controls').classList.remove('hidden');
        document.getElementById('ap-controls').classList.add('hidden');
        renderQuickieButtons(q);
    } else {
        document.getElementById('quickie-controls').classList.add('hidden');
        document.getElementById('ap-controls').classList.remove('hidden');
        renderKeyboard();
    }
}

function renderQuickieButtons(q) {
    const container = document.getElementById('quickie-controls');
    container.innerHTML = '';
    let opts = [...q.options].sort(() => Math.random() - 0.5);
    opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = () => {
            if (opt === q.solution) {
                showFlash("Korrekt!", "flash-green");
                state.streak++;
                setTimeout(loadNext, 1000);
            } else {
                if (!state.jokerUsed) {
                    state.jokerUsed = true;
                    btn.style.opacity = "0.3";
                    btn.style.pointerEvents = "none";
                    showFlash("Joker! " + q.explanation, "flash-orange", 2500);
                } else {
                    loseLife(q.solution);
                }
            }
        };
        container.appendChild(btn);
    });
}

function renderKeyboard() {
    state.apInputText = "";
    document.getElementById('ap-input-display').textContent = "";
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    "abcdefghijklmnopqrstuvwxyz ".split("").forEach(l => {
        const key = document.createElement('div');
        key.className = 'key';
        key.textContent = l === " " ? "SPACE" : l;
        key.onclick = () => {
            state.apInputText += l;
            document.getElementById('ap-input-display').textContent = state.apInputText;
        };
        kb.appendChild(key);
    });
}

function checkAPAnswer() {
    const q = state.data[state.currentIndex];
    const input = state.apInputText.trim().toLowerCase();
    if (q.solution.includes(input)) {
        showFlash("Korrekt!", "flash-green");
        setTimeout(loadNext, 1000);
    } else {
        loseLife(q.solution[0]);
    }
}

function loseLife(correct) {
    state.lives--;
    updateStats();
    if (state.lives <= 0) {
        document.getElementById('game-over-screen').classList.remove('hidden');
        setTimeout(() => location.reload(), 3000);
    } else {
        showFlash("Falsch! Lösung: " + correct, "flash-red", 2000);
        document.getElementById('next-btn').classList.remove('hidden');
    }
}

function loadNext() { state.currentIndex++; loadQuestion(); }
function updateStats() {
    document.getElementById('lives').textContent = "❤️".repeat(state.lives);
    document.getElementById('streak').textContent = "🔥 " + state.streak;
}
function showFlash(m, c, d = 1000) {
    const f = document.getElementById('feedback-flash');
    f.textContent = m; f.className = c; f.classList.remove('hidden');
    setTimeout(() => f.classList.add('hidden'), d);
}

// Beispiel-Daten
function getQuickieData() {
    return [{text: "If it rains, we ___ at home.", solution: "will stay", options: ["will stay", "would stay", "would have stayed"], explanation: "Type 1: If + Present -> will-Future."}];
}
function getAPData() {
    return [{text: "If I were you, I ___ (go) now.", solution: ["would go"]}];
}
