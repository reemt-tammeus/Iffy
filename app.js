let state = {
    pool: [], activeBlock: [], currentIndex: 0,
    lives: 3, streak: 0, locked: false, userInput: ""
};

const AppDirector = {
    changeScreen(screen) {
        document.querySelectorAll('.blueprint-screen').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-screen="${screen}"]`).classList.add('active');
        document.getElementById('stats-bar').classList.toggle('hidden', screen === 'menu');
        document.getElementById('thumb-zone').classList.toggle('hidden', screen !== 'playing');
    },
    goBack() { location.reload(); }
};

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('menu-box').classList.add('startup-fade');
    buildKeyboard();
    setupHardwareKeyboard();
    FireworksEngine.init();
    try {
        const res = await fetch('data.json');
        state.pool = await res.json();
    } catch (e) { console.error("Data load failed", e); }
});

function startBlock() {
    if(state.pool.length < 5) return;
    let shuffled = [...state.pool].sort(() => Math.random() - 0.5);
    state.activeBlock = shuffled.slice(0, 5);
    state.currentIndex = 0;
    state.lives = 3;
    updateStats();
    AppDirector.changeScreen('playing');
    loadTask();
}

function loadTask() {
    state.userInput = ""; state.locked = false;
    const task = state.activeBlock[state.currentIndex];
    document.getElementById('task-orig').innerText = `"${task.orig}"`;
    document.getElementById('task-key').innerText = task.key;
    document.getElementById('task-pre').innerText = task.pre;
    document.getElementById('task-suf').innerText = task.suf;
    document.getElementById('progress').innerText = `${state.currentIndex + 1} / 5`;
    updateInputDisplay();
}

function updateInputDisplay() {
    const display = document.getElementById('user-input-display');
    display.innerText = state.userInput === "" ? "..." : state.userInput;
}

function checkAnswer() {
    if (state.locked || state.userInput.trim() === "") return;
    state.locked = true;
    const task = state.activeBlock[state.currentIndex];
    const val = state.userInput.trim().toLowerCase().replace(/[.!?;]$/, "");
    const correct = task.ideal.some(a => a.toLowerCase().replace(/[.!?;]$/, "") === val);

    if (correct) {
        state.streak++; updateStats();
        document.getElementById('playing-glass-box').classList.add('glow-green');
        setTimeout(() => {
            document.getElementById('playing-glass-box').classList.remove('glow-green');
            advance();
        }, 1200);
    } else {
        triggerFail(task.ideal[0]);
    }
}

function triggerFail(sol) {
    state.lives--; state.streak = 0; updateStats();
    const f = document.getElementById('feedback-flash');
    f.innerHTML = `FALSCH!<br><small style="margin-top:15px; display:block;">Lösung: ${sol}</small>`;
    f.classList.remove('hidden');
    
    if (state.lives <= 0) {
        setTimeout(() => {
            f.classList.add('hidden');
            document.getElementById('game-over-screen').classList.remove('hidden');
            setTimeout(() => location.reload(), 3000);
        }, 4000);
    } else {
        setTimeout(() => { f.classList.add('hidden'); advance(); }, 4000);
    }
}

function advance() {
    state.currentIndex++;
    if (state.currentIndex >= 5) {
        FireworksEngine.launch(true);
        setTimeout(() => {
            document.getElementById('final-streak').innerText = state.streak;
            AppDirector.changeScreen('continue');
        }, 2000);
    } else { loadTask(); }
}

function updateStats() {
    document.getElementById('lives').textContent = "❤️".repeat(Math.max(0, state.lives));
    document.getElementById('streak-count').textContent = state.streak;
}

function buildKeyboard() {
    const layout = [
        ["q","w","e","r","t","z","u","i","o","p"],
        ["a","s","d","f","g","h","j","k","l"],
        ["y","x","c","v","b","n","m","'", "ENTER"],
        ["SPACE", "BACKSPACE"]
    ];
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    layout.forEach((row, i) => {
        const div = document.createElement('div');
        div.className = `kb-row row-${i+1}`;
        row.forEach(key => {
            const btn = document.createElement('div');
            btn.className = 'kb-key'; btn.dataset.key = key.toLowerCase();
            if(key === 'BACKSPACE') { btn.innerHTML = '⌫'; btn.classList.add('kb-backspace'); }
            else if(key === 'ENTER') { btn.innerHTML = '↵'; btn.classList.add('kb-check'); }
            else if(key === 'SPACE') { btn.innerHTML = 'SPACE'; btn.classList.add('kb-space'); }
            else btn.innerHTML = key;
            
            const press = () => { handleInput(key === 'SPACE' ? ' ' : key); btn.classList.add('active-hardware'); };
            const release = () => btn.classList.remove('active-hardware');
            btn.addEventListener('mousedown', press); btn.addEventListener('mouseup', release);
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); press(); });
            btn.addEventListener('touchend', release);
            div.appendChild(btn);
        });
        kb.appendChild(div);
    });
}

function handleInput(k) {
    if (state.locked) return;
    if (k === 'BACKSPACE') state.userInput = state.userInput.slice(0, -1);
    else if (k === 'ENTER') checkAnswer();
    else if (state.userInput.length < 60) state.userInput += k;
    updateInputDisplay();
}

function setupHardwareKeyboard() {
    window.addEventListener('keydown', (e) => {
        if(state.locked) return;
        let k = e.key;
        if (k === '´' || k === '`' || k === 'Dead') k = "'"; // Windows Patch
        if (k === 'Backspace') handleInput('BACKSPACE');
        else if (k === 'Enter') handleInput('ENTER');
        else if (k.match(/^[a-zA-Z' ]$/)) handleInput(k);
        
        const visualKey = k === ' ' ? 'space' : k.toLowerCase();
        const btn = document.querySelector(`[data-key="${visualKey}"]`);
        if(btn) { btn.classList.add('active-hardware'); setTimeout(() => btn.classList.remove('active-hardware'), 100); }
    });
}

const FireworksEngine = {
    canvasId: 'blueprint-fireworks', ctx: null, particles: [],
    init() {
        const c = document.getElementById(this.canvasId);
        this.ctx = c.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },
    resize() {
        const c = document.getElementById(this.canvasId);
        c.width = window.innerWidth; c.height = window.innerHeight;
    },
    launch(big) {
        for (let i = 0; i < (big ? 100 : 30); i++) {
            this.particles.push({
                x: window.innerWidth/2, y: window.innerHeight/2,
                vX: (Math.random()-0.5)*15, vY: (Math.random()-0.5)*15,
                alpha: 1, color: `hsl(${Math.random()*360},100%,60%)`, size: Math.random()*3+2
            });
        }
        if (!this.anim) this.animate();
    },
    animate() {
        this.ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
        this.particles.forEach(p => {
            p.x+=p.vX; p.y+=p.vY; p.vY+=0.15; p.alpha-=0.015;
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); this.ctx.fill();
        });
        this.particles = this.particles.filter(p => p.alpha > 0);
        if(this.particles.length > 0) this.anim = requestAnimationFrame(() => this.animate());
        else this.anim = null;
    }
};
