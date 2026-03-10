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
let speed = 5;
let obstacles = [];
let targetCoins = []; // Coletáveis
let particles = [];
let frameCount = 0;

// Skins & Shop
const skins = [
    { id: 'default', name: 'CYAN DASH', color: '#00f2ff', price: 0, owned: true },
    { id: 'pink', name: 'NEON PINK', color: '#ff007f', price: 100, owned: false },
    { id: 'lime', name: 'LIME LIGHT', color: '#aaff00', price: 250, owned: false },
    { id: 'gold', name: 'GOLD RUSH', color: '#ffcc00', price: 500, owned: false },
    { id: 'ultra', name: 'ULTRA VIOLET', color: '#bc13fe', price: 1000, owned: false }
];

// Load owned skins from localStorage
let ownedSkins = JSON.parse(localStorage.getItem('carRunOwnedSkins')) || ['default'];
let activeSkinId = localStorage.getItem('carRunActiveSkin') || 'default';

// Player Settings
const player = {
    x: 100,
    y: 100,
    size: 40,
    color: skins.find(s => s.id === activeSkinId).color,
    targetY: 100,
    trail: []
};

// Update coin displays initially
coinElement.innerText = coins;

// Resize Canvas
function resize() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

window.addEventListener('resize', resize);
resize();

// Controls
window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    const step = 80;
    if (e.key === 'ArrowUp' || e.key === 'w') player.targetY -= step;
    if (e.key === 'ArrowDown' || e.key === 's') player.targetY += step;
    player.targetY = Math.max(50, Math.min(canvas.height - 50, player.targetY));
});

class Obstacle {
    constructor() {
        this.width = 60;
        this.height = 40;
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - this.height);
        this.color = '#ff007f';
        this.movesY = Math.random() > 0.2;
        this.speedY = this.movesY ? (Math.random() > 0.5 ? 1 : -1) : 0;
    }

    update() {
        this.x -= speed;
        if (this.movesY) {
            this.y += this.speedY;
            if (this.y <= 0) { this.y = 0; this.speedY = 1; }
            else if (this.y >= canvas.height - this.height) { this.y = canvas.height - this.height; this.speedY = -1; }
        }
    }

    draw() {
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 10, this.y + 10, 15, 5);
        ctx.fillRect(this.x + 10, this.y + 25, 15, 5);
        ctx.shadowBlur = 0;
    }
}

class Coin {
    constructor() {
        this.size = 15;
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - this.size);
        this.color = '#f8ff00';
    }

    update() {
        this.x -= speed;
    }

    draw() {
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        // Círculo principal dourado
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Brilho central para destacar
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size/4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('$', this.x, this.y + 4);
        ctx.shadowBlur = 0;
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
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function spawnEntities() {
    if (frameCount % 60 === 0) obstacles.push(new Obstacle());
    // Moedas aparecem com mais frequência (a cada 45 frames)
    if (frameCount % 45 === 0) targetCoins.push(new Coin());
}

function updatePlayer() {
    player.y += (player.targetY - player.y) * 0.15;
    player.trail.unshift({ x: player.x, y: player.y });
    if (player.trail.length > 10) player.trail.pop();
}

function drawPlayer() {
    player.trail.forEach((p, i) => {
        ctx.globalAlpha = 0.4 - (i / player.trail.length) * 0.4;
        ctx.fillStyle = player.color;
        ctx.fillRect(p.x - player.size/2, p.y - player.size/4, player.size * (1 - i/10), player.size/2);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 20; ctx.shadowColor = player.color;
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.roundRect(player.x - player.size/2, player.y - player.size/4, player.size, player.size/2, 5); ctx.fill();
    ctx.fillStyle = player.color; ctx.fillRect(player.x - player.size/2, player.y - player.size/4, 5, player.size/2);
    ctx.fillStyle = '#111'; ctx.fillRect(player.x, player.y - player.size/8, 10, player.size/4);
    ctx.strokeStyle = player.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur = 0;
}

function checkCollision(obj, isCoin = false) {
    const pWidth = player.size;
    const pHeight = player.size / 2;
    const padding = isCoin ? 10 : 0;
    
    return (
        player.x - pWidth/2 < obj.x + (obj.width || obj.size) + padding &&
        player.x + pWidth/2 > obj.x - padding &&
        player.y - pHeight/4 < obj.y + (obj.height || obj.size) + padding &&
        player.y + pHeight/4 > obj.y - padding
    );
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) particles.push(new Particle(x, y, color));
}

function gameLoop() {
    if (!isPlaying) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid Lines
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    updatePlayer();
    drawPlayer();
    spawnEntities();

    obstacles.forEach((obs, index) => {
        obs.update(); obs.draw();
        if (checkCollision(obs)) gameOver();
        if (obs.x + obs.width < 0) {
            obstacles.splice(index, 1);
            score += 10;
            scoreElement.innerText = score.toString().padStart(4, '0');
            if (score % 100 === 0) speed += 0.2;
        }
    });

    targetCoins.forEach((c, index) => {
        c.update(); c.draw();
        if (checkCollision(c, true)) {
            targetCoins.splice(index, 1);
            coinsInMatch++;
            coins++;
            coinElement.innerText = coins;
            localStorage.setItem('carRunCoins', coins);
        }
        if (c.x + c.size < 0) targetCoins.splice(index, 1);
    });

    particles.forEach((p, index) => {
        p.update(); p.draw();
        if (p.life <= 0) particles.splice(index, 1);
    });

    frameCount++;
    animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
    isPlaying = true;
    score = 0; speed = 5; frameCount = 0; coinsInMatch = 0;
    obstacles = []; targetCoins = []; particles = [];
    player.y = canvas.height / 2; player.targetY = player.y;
    scoreElement.innerText = '0000';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    shopScreen.classList.add('hidden');
    resize();
    gameLoop();
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    createExplosion(player.x, player.y, player.color);
    setTimeout(() => {
        finalScoreElement.innerText = score;
        coinsEarnedElement.innerText = coinsInMatch;
        gameOverScreen.classList.remove('hidden');
    }, 500);
}

// Shop Logic
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
    } else {
        alert('Moedas insuficientes!');
    }
};

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
shopButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    shopScreen.classList.remove('hidden');
    updateShop();
});
closeShopButton.addEventListener('click', () => {
    shopScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
});
