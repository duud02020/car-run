const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score-value');
const finalScoreElement = document.getElementById('final-score-value');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');

// Game State
let isPlaying = false;
let score = 0;
let animationId;
let speed = 5;
let obstacles = [];
let particles = [];
let frameCount = 0;

// Player Settings
const player = {
    x: 100,
    y: 100,
    size: 30,
    color: '#00f2ff',
    targetY: 100,
    trail: []
};

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

    // Constraints
    player.targetY = Math.max(50, Math.min(canvas.height - 50, player.targetY));
});

// Touch Controls
canvas.addEventListener('touchstart', (e) => {
    if (!isPlaying) return;
    const touchY = e.touches[0].clientY - canvas.getBoundingClientRect().top;
    player.targetY = touchY;
});

canvas.addEventListener('touchmove', (e) => {
    if (!isPlaying) return;
    const touchY = e.touches[0].clientY - canvas.getBoundingClientRect().top;
    player.targetY = touchY;
    e.preventDefault();
}, { passive: false });

class Obstacle {
    constructor() {
        this.width = 40;
        this.height = 100 + Math.random() * 200;
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - this.height);
        this.color = '#ff007f';
    }

    update() {
        this.x -= speed;
    }

    draw() {
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Inner detail
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 5, this.y + 5, 2, this.height - 10);
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 1;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.color = color;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function spawnObstacle() {
    if (frameCount % 60 === 0) {
        obstacles.push(new Obstacle());
    }
}

function updatePlayer() {
    // Smooth movement
    player.y += (player.targetY - player.y) * 0.15;

    // Trail
    player.trail.unshift({ x: player.x, y: player.y });
    if (player.trail.length > 10) player.trail.pop();
}

function drawPlayer() {
    // Draw Trail
    player.trail.forEach((p, i) => {
        ctx.globalAlpha = 1 - (i / player.trail.length);
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, player.size / 2 * (1 - i / 10), 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw Main Core
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.color;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = player.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function checkCollision(obs) {
    return (
        player.x + 10 > obs.x &&
        player.x - 10 < obs.x + obs.width &&
        player.y + 10 > obs.y &&
        player.y - 10 < obs.y + obs.height
    );
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function gameLoop() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Lines
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    updatePlayer();
    drawPlayer();

    spawnObstacle();

    obstacles.forEach((obs, index) => {
        obs.update();
        obs.draw();

        if (checkCollision(obs)) {
            gameOver();
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(index, 1);
            score += 10;
            scoreElement.innerText = score.toString().padStart(4, '0');
            if (score % 100 === 0) speed += 0.5;
        }
    });

    particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(index, 1);
    });

    frameCount++;
    animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
    isPlaying = true;
    score = 0;
    speed = 5;
    obstacles = [];
    particles = [];
    player.y = canvas.height / 2;
    player.targetY = player.y;
    scoreElement.innerText = '0000';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameLoop();
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    createExplosion(player.x, player.y, player.color);

    // Small delay for explosion to be seen
    setTimeout(() => {
        finalScoreElement.innerText = score;
        gameOverScreen.classList.remove('hidden');
    }, 500);
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
