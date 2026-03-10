const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score-value');
const coinElement = document.getElementById('coin-value');
const finalScoreElement = document.getElementById('final-score-value');
const coinsEarnedElement = document.getElementById('coins-earned-value');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const shopScreen = document.getElementById('shop-screen');
const levelsScreen = document.getElementById('levels-screen');
const levelWinScreen = document.getElementById('level-win-screen');
const startButton = document.getElementById('start-button');
const levelsButton = document.getElementById('levels-button');
const restartButton = document.getElementById('restart-button');
const shopButton = document.getElementById('shop-button');
const homeShopButton = document.getElementById('home-shop-button');
const closeShopButton = document.getElementById('close-shop');
const closeLevelsButton = document.getElementById('close-levels');
const skinListContainer = document.getElementById('skin-list');
const levelListContainer = document.getElementById('level-list');
const shopCoinValue = document.getElementById('shop-coin-value');
const winScoreValue = document.getElementById('win-score-value');
const winCoinsValue = document.getElementById('win-coins-value');
const nextLevelButton = document.getElementById('next-level-button');
const winHomeButton = document.getElementById('win-home-button');

// Game State
let isPlaying = false;
let isLevelMode = false;
let currentLevelIndex = 0;
let score = 0;
let coins = parseInt(localStorage.getItem('carRunCoins')) || 0;
let coinsInMatch = 0;
let animationId;
let speed = 4;
let obstacles = [];
let targetCoins = []; 
let particles = [];
let frameCount = 0;

// Physics
const baseGravity = 0.3;
const baseJumpForce = -7;
let currentGravity = baseGravity;
let currentJumpForce = baseJumpForce;

const levels = [
    { name: 'Nível 1', target: 5, pipeSpeed: 4, gap: 260, reward: 50 },
    { name: 'Nível 2', target: 10, pipeSpeed: 4.5, gap: 240, reward: 100 },
    { name: 'Nível 3', target: 15, pipeSpeed: 5, gap: 220, reward: 150 },
    { name: 'Nível 4', target: 20, pipeSpeed: 5.5, gap: 200, reward: 200 },
    { name: 'Nível 5', target: 30, pipeSpeed: 6, gap: 180, reward: 500 }
];

let unlockedLevel = parseInt(localStorage.getItem('carRunUnlockedLevel')) || 0;

const skins = [
    { id: 'default', name: 'NEON CHICK', color: '#00f2ff', price: 0, owned: true, desc: 'Padrão', gravityMult: 1, jumpMult: 1, coinLuck: 0.3 },
    { id: 'agile', name: 'FAST SWIFT', color: '#ff007f', price: 30, owned: false, desc: 'Leve', gravityMult: 0.8, jumpMult: 1, coinLuck: 0.3 },
    { id: 'heavy', name: 'POWER OWL', color: '#aaff00', price: 80, owned: false, desc: 'Forte', gravityMult: 1.1, jumpMult: 1.3, coinLuck: 0.3 },
    { id: 'lucky', name: 'GOLDEN PHOENIX', color: '#ffcc00', price: 150, owned: false, desc: 'Sorte', gravityMult: 1, jumpMult: 1, coinLuck: 0.6 },
    { id: 'ghost', name: 'VOID RAVEN', color: '#bc13fe', price: 210, owned: false, desc: 'Mestre', gravityMult: 0.7, jumpMult: 1.2, coinLuck: 0.4 }
];

let ownedSkins = JSON.parse(localStorage.getItem('carRunOwnedSkins')) || ['default'];
let activeSkinId = localStorage.getItem('carRunActiveSkin') || 'default';

const player = { x: 150, y: 100, velocity: 0, size: 40, color: '#00f2ff', trail: [] };

function applySkinStats(skinId) {
    const skin = skins.find(s => s.id === skinId) || skins[0];
    currentGravity = baseGravity * skin.gravityMult;
    currentJumpForce = baseJumpForce * skin.jumpMult;
    player.color = skin.color;
}

function resize() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function jump() { if (isPlaying) player.velocity = currentJumpForce; }

window.addEventListener('keydown', (e) => { if (e.key === ' ') { jump(); e.preventDefault(); } });
window.addEventListener('mousedown', jump);
window.addEventListener('resize', resize);

class PipeObstacle {
    constructor() {
        this.width = 90;
        this.gap = isLevelMode ? levels[currentLevelIndex].gap : 210;
        this.x = canvas.width;
        const minH = 60;
        const maxH = canvas.height - this.gap - minH;
        this.topHeight = Math.random() * (maxH - minH) + minH;
        this.bottomY = this.topHeight + this.gap;
        this.passed = false;
    }
    update() { this.x -= speed; }
    draw() {
        ctx.save();
        ctx.fillStyle = '#ff007f';
        ctx.shadowBlur = 15; ctx.shadowColor = '#ff007f';
        ctx.beginPath(); ctx.roundRect(this.x, 0, this.width, this.topHeight, [0, 0, 10, 10]); ctx.fill();
        ctx.beginPath(); ctx.roundRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY, [10, 10, 0, 0]); ctx.fill();
        ctx.restore();
    }
}

class Coin {
    constructor(x, y) { this.x = x + 40; this.y = y; this.size = 25; }
    update() { this.x -= speed; }
    draw() {
        ctx.save();
        ctx.fillStyle = '#f8ff00'; ctx.shadowBlur = 20; ctx.shadowColor = '#f8ff00';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size/2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'center'; ctx.fillText('$', this.x, this.y+4);
        ctx.restore();
    }
}

function startGame(mode = 'free', levelIdx = 0) {
    isPlaying = true; isLevelMode = mode === 'level'; currentLevelIndex = levelIdx;
    score = 0; frameCount = 0; coinsInMatch = 0; obstacles = []; targetCoins = [];
    player.y = canvas.height / 2; player.velocity = 0;
    speed = isLevelMode ? levels[currentLevelIndex].pipeSpeed : 4;
    applySkinStats(activeSkinId);
    scoreElement.innerText = '0000';
    [startScreen, gameOverScreen, shopScreen, levelsScreen, levelWinScreen].forEach(s => s.classList.add('hidden'));
    resize();
    if (!animationId) gameLoop();
}

function gameLoop() {
    if (!isPlaying) { animationId = null; return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    for(let i=0; i<canvas.width; i+=50) { ctx.moveTo(i,0); ctx.lineTo(i, canvas.height); }
    ctx.stroke();

    player.velocity += currentGravity; player.y += player.velocity;
    if (player.y > canvas.height || player.y < 0) return gameOver();

    // Draw Player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.velocity * 0.05);
    ctx.fillStyle = player.color; ctx.shadowBlur = 20; ctx.shadowColor = player.color;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(10, -5, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    if (frameCount % 100 === 0) obstacles.push(new PipeObstacle());

    obstacles.forEach((obs, i) => {
        obs.update(); obs.draw();
        if (player.x + 15 > obs.x && player.x - 15 < obs.x + obs.width) {
            if (player.y - 15 < obs.topHeight || player.y + 15 > obs.bottomY) gameOver();
        }
        if (!obs.passed && obs.x + obs.width < player.x) {
            obs.passed = true; score++; scoreElement.innerText = score.toString().padStart(4, '0');
            if (isLevelMode && score >= levels[currentLevelIndex].target) levelWin();
        }
    });

    frameCount++;
    animationId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    isPlaying = false;
    finalScoreElement.innerText = score;
    coinsEarnedElement.innerText = coinsInMatch;
    gameOverScreen.classList.remove('hidden');
}

function levelWin() {
    isPlaying = false;
    const reward = levels[currentLevelIndex].reward;
    coins += reward; localStorage.setItem('carRunCoins', coins);
    if (currentLevelIndex === unlockedLevel) { unlockedLevel++; localStorage.setItem('carRunUnlockedLevel', unlockedLevel); }
    winScoreValue.innerText = score; winCoinsValue.innerText = reward;
    levelWinScreen.classList.remove('hidden');
    coinElement.innerText = coins;
}

function updateShop() {
    shopCoinValue.innerText = coins;
    skinListContainer.innerHTML = '';
    skins.forEach(s => {
        const owned = ownedSkins.includes(s.id);
        const active = activeSkinId === s.id;
        skinListContainer.innerHTML += `
            <div class="skin-item">
                <div class="skin-preview" style="background:${s.color}"></div>
                <span>${s.name}</span>
                <span class="skin-price">${owned ? 'OK' : s.price}</span>
                <button onclick="buySkin('${s.id}')">${active ? 'USANDO' : (owned ? 'USAR' : 'COMPRAR')}</button>
            </div>`;
    });
}

window.buySkin = (id) => {
    const s = skins.find(x => x.id === id);
    if (ownedSkins.includes(id)) { activeSkinId = id; localStorage.setItem('carRunActiveSkin', id); }
    else if (coins >= s.price) { coins -= s.price; ownedSkins.push(id); localStorage.setItem('carRunCoins', coins); localStorage.setItem('carRunOwnedSkins', JSON.stringify(ownedSkins)); }
    updateShop(); applySkinStats(activeSkinId);
};

function updateLevels() {
    levelListContainer.innerHTML = '';
    levels.forEach((l, i) => {
        const locked = i > unlockedLevel;
        levelListContainer.innerHTML += `
            <div class="level-item ${locked ? 'locked' : ''}" onclick="${locked ? '' : `startGame('level', ${i})`}">
                <span>${l.name}</span>
                <small>Meta: ${l.target}</small>
            </div>`;
    });
}

startButton.onclick = () => startGame('free');
levelsButton.onclick = () => { startScreen.classList.add('hidden'); levelsScreen.classList.remove('hidden'); updateLevels(); };
homeShopButton.onclick = () => { startScreen.classList.add('hidden'); shopScreen.classList.remove('hidden'); updateShop(); };
shopButton.onclick = () => { gameOverScreen.classList.add('hidden'); shopScreen.classList.remove('hidden'); updateShop(); };
closeShopButton.onclick = () => { shopScreen.classList.add('hidden'); startScreen.classList.remove('hidden'); };
closeLevelsButton.onclick = () => { levelsScreen.classList.add('hidden'); startScreen.classList.remove('hidden'); };
winHomeButton.onclick = () => { levelWinScreen.classList.add('hidden'); startScreen.classList.remove('hidden'); };
nextLevelButton.onclick = () => { if (currentLevelIndex + 1 < levels.length) startGame('level', currentLevelIndex + 1); };
restartButton.onclick = () => startGame(isLevelMode ? 'level' : 'free', currentLevelIndex);

// Init
resize(); applySkinStats(activeSkinId); coinElement.innerText = coins;
