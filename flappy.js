const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score-value');
const coinElement = document.getElementById('coin-value');
const finalScoreElement = document.getElementById('final-score-value');
const coinsEarnedElement = document.getElementById('coins-earned-value');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const shopScreen = document.getElementById('shop-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const shopButton = document.getElementById('shop-button');
const closeShopButton = document.getElementById('close-shop');
const skinListContainer = document.getElementById('skin-list');
const shopCoinValue = document.getElementById('shop-coin-value');

// Game State
let isPlaying = false;
let score = 0;
let coins = parseInt(localStorage.getItem('carRunCoins')) || 0;
let coinsInMatch = 0;
let animationId;
let speed = 4; // Velocidade horizontal
let obstacles = [];
let targetCoins = []; 
let particles = [];
let frameCount = 0;

// Physics for Flappy Mechanics
const gravity = 0.3; // Gravidade mais forte
const jumpForce = -7; // Pulo mais forte

// Skins & Shop
const skins = [
    { id: 'default', name: 'CYAN DASH', color: '#00f2ff', price: 0, owned: true },
    { id: 'pink', name: 'NEON PINK', color: '#ff007f', price: 100, owned: false },
    { id: 'lime', name: 'LIME LIGHT', color: '#aaff00', price: 250, owned: false },
    { id: 'gold', name: 'GOLD RUSH', color: '#ffcc00', price: 500, owned: false },
    { id: 'ultra', name: 'ULTRA VIOLET', color: '#bc13fe', price: 1000, owned: false }
];

let ownedSkins = JSON.parse(localStorage.getItem('carRunOwnedSkins')) || ['default'];
let activeSkinId = localStorage.getItem('carRunActiveSkin') || 'default';

const player = {
    x: 150,
    y: 100,
    velocity: 0,
    size: 40,
    color: skins.find(s => s.id === activeSkinId).color,
    trail: []
};

coinElement.innerText = coins;

function resize() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resize);
resize();

function jump() {
    if (!isPlaying) return;
    player.velocity = jumpForce;
}

window.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        jump();
        e.preventDefault();
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (e.target.tagName !== 'BUTTON') jump();
});

canvas.addEventListener('touchstart', (e) => {
    if (e.target.tagName !== 'BUTTON') {
        jump();
        e.preventDefault();
    }
}, { passive: false });

class PipeObstacle {
    constructor() {
        this.width = 90; // Canos mais largos
        this.gap = 200; // Espaço para passar
        this.x = canvas.width;
        const minH = 60;
        const maxH = canvas.height - this.gap - minH;
        this.topHeight = Math.random() * (maxH - minH) + minH;
        this.bottomY = this.topHeight + this.gap;
        this.color = '#ff007f';
        this.passed = false;
    }

    update() {
        this.x -= speed;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        
        // Cano Superior (Pilar)
        ctx.beginPath();
        ctx.roundRect(this.x, 0, this.width, this.topHeight, [0, 0, 10, 10]);
        ctx.fill();

        // Cano Inferior (Pilar)
        ctx.beginPath();
        ctx.roundRect(this.x, this.bottomY, this.width, canvas.height - this.bottomY, [10, 10, 0, 0]);
        ctx.fill();

        // Linha branca de detalhe
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x + 15, 0, 5, this.topHeight);
        ctx.strokeRect(this.x + 15, this.bottomY, 5, canvas.height - this.bottomY);
        
        ctx.restore();
    }
}

class Coin {
    constructor(x, y) {
        this.size = 25;
        this.x = x + 45; 
        this.y = y;
        this.color = '#f8ff00';
    }
    update() { this.x -= speed; }
    draw() {
        ctx.save();
        ctx.shadowBlur = 30; ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size/4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 12px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText('$', this.x, this.y + 4);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.size = Math.random() * 4 + 1;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.color = color;
        this.life = 1;
    }
    update() { this.x += this.speedX; this.y += this.speedY; this.life -= 0.02; }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

function spawnEntities() {
    if (frameCount % 100 === 0) {
        const pipe = new PipeObstacle();
        obstacles.push(pipe);
        targetCoins.push(new Coin(pipe.x, pipe.topHeight + pipe.gap/2));
    }
}

function updatePlayer() {
    player.velocity += gravity;
    player.y += player.velocity;

    // Game Over ao bater no chão ou cair fora
    if (player.y + player.size/4 > canvas.height) {
        player.y = canvas.height - player.size/4;
        gameOver();
    }
    if (player.y - player.size/4 < 0) {
        player.y = player.size/4;
        player.velocity = gravity;
    }

    player.trail.unshift({ x: player.x, y: player.y });
    if (player.trail.length > 8) player.trail.pop();
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    // Rotação baseada na queda
    ctx.rotate(Math.min(Math.max(player.velocity * 0.06, -0.6), 0.8));
    
    player.trail.forEach((p, i) => {
        ctx.globalAlpha = 0.3 - (i / player.trail.length) * 0.3;
        ctx.fillStyle = player.color;
        ctx.fillRect(-player.size/2 - (i*4), -player.size/4, player.size, player.size/2);
    });
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 20; ctx.shadowColor = player.color;
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.roundRect(-player.size/2, -player.size/4, player.size, player.size/2, 5); ctx.fill();
    ctx.fillStyle = player.color; ctx.fillRect(-player.size/2, -player.size/4, 5, player.size/2);
    ctx.fillStyle = '#111'; ctx.fillRect(0, -player.size/8, 10, player.size/4);
    ctx.strokeStyle = player.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
}

function checkCollision(obj, isCoin = false) {
    if (isCoin) {
        return Math.hypot(player.x - obj.x, player.y - obj.y) < (player.size/2 + obj.size/2 + 10);
    } else {
        const pL = player.x - player.size/2 + 5;
        const pR = player.x + player.size/2 - 5;
        const pT = player.y - player.size/4 + 5;
        const pB = player.y + player.size/4 - 5;

        if (pR > obj.x && pL < obj.x + obj.width) {
            if (pT < obj.topHeight || pB > obj.bottomY) return true;
        }
        return false;
    }
}

function gameLoop() {
    if (!isPlaying) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    const scroll = (frameCount * speed) % 40;
    for (let i = 0; i < canvas.width + 40; i += 40) { ctx.moveTo(i - scroll, 0); ctx.lineTo(i - scroll, canvas.height); }
    for (let i = 0; i < canvas.height; i += 40) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
    ctx.stroke();

    updatePlayer();
    drawPlayer();
    spawnEntities();

    obstacles.forEach((obs, index) => {
        obs.update(); obs.draw();
        if (checkCollision(obs)) gameOver();
        if (!obs.passed && obs.x + obs.width < player.x) {
            obs.passed = true;
            score += 1;
            scoreElement.innerText = score.toString().padStart(4, '0');
        }
        if (obs.x + obs.width < 0) obstacles.splice(index, 1);
    });

    targetCoins.forEach((c, index) => {
        c.update(); c.draw();
        if (checkCollision(c, true)) {
            targetCoins.splice(index, 1);
            coinsInMatch++; coins++;
            coinElement.innerText = coins;
            localStorage.setItem('carRunCoins', coins);
        }
        if (c.x + c.size < 0) targetCoins.splice(index, 1);
    });

    particles.forEach((p, index) => { p.update(); p.draw(); if (p.life <= 0) particles.splice(index, 1); });
    frameCount++;
    animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
    isPlaying = true; score = 0; frameCount = 0; coinsInMatch = 0;
    obstacles = []; targetCoins = []; particles = [];
    player.y = canvas.height / 2; player.velocity = 0; player.trail = [];
    scoreElement.innerText = '0000';
    startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); shopScreen.classList.add('hidden');
    resize();
    gameLoop();
}

function gameOver() {
    if (!isPlaying) return;
    isPlaying = false;
    cancelAnimationFrame(animationId);
    for (let i = 0; i < 20; i++) particles.push(new Particle(player.x, player.y, player.color));
    setTimeout(() => {
        finalScoreElement.innerText = score;
        coinsEarnedElement.innerText = coinsInMatch;
        gameOverScreen.classList.remove('hidden');
    }, 500);
}

function updateShop() {
    shopCoinValue.innerText = coins;
    skinListContainer.innerHTML = '';
    skins.forEach(skin => {
        const isOwned = ownedSkins.includes(skin.id);
        const isActive = activeSkinId === skin.id;
        const item = document.createElement('div');
        item.className = 'skin-item';
        item.innerHTML = `
            <div class="skin-preview" style="background: ${skin.color}; border: 2px solid white;"></div>
            <span>${skin.name}</span>
            <span class="skin-price">${isOwned ? 'ADQUIRIDO' : skin.price + ' Moedas'}</span>
            <button class="buy-button ${isOwned ? 'owned' : ''}" onclick="processSkinAction('${skin.id}')">
                ${isActive ? 'ATIVO' : (isOwned ? 'USAR' : 'COMPRAR')}
            </button>
        `;
        skinListContainer.appendChild(item);
    });
}

window.processSkinAction = function(skinId) {
    const skin = skins.find(s => s.id === skinId);
    if (ownedSkins.includes(skinId)) {
        activeSkinId = skinId;
        player.color = skin.color;
        localStorage.setItem('carRunActiveSkin', skinId);
        updateShop();
    } else if (coins >= skin.price) {
        coins -= skin.price;
        ownedSkins.push(skinId);
        localStorage.setItem('carRunCoins', coins);
        localStorage.setItem('carRunOwnedSkins', JSON.stringify(ownedSkins));
        coinElement.innerText = coins;
        updateShop();
    } else { alert('Moedas insuficientes!'); }
};

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
shopButton.addEventListener('click', () => { gameOverScreen.classList.add('hidden'); shopScreen.classList.remove('hidden'); updateShop(); });
closeShopButton.addEventListener('click', () => { shopScreen.classList.add('hidden'); gameOverScreen.classList.remove('hidden'); });
