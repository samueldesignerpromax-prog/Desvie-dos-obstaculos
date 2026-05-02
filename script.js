/**
 * Subway Runner - Endless Runner com Coleta de Moedas e Diamantes
 * Controles: ← → (mover), ↑ (pular), ↓ (deslizar) | Swipes no mobile
 * Características: Coleta de itens, velocidade progressiva, obstáculos
 */

// ==================== CONFIGURAÇÕES DO CANVAS ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Configurações do jogo
const LANE_COUNT = 3;
const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;
const LANE_POSITIONS = [
    LANE_WIDTH / 2,
    LANE_WIDTH * 1.5,
    LANE_WIDTH * 2.5
];

// ==================== ESTADO DO JOGO ====================
let gameRunning = false;
let gameStarted = false;
let score = 0;
let coins = 0;
let diamonds = 0;
let highScore = localStorage.getItem('subwayHighScore') || 0;
let gameSpeed = 4;
let distance = 0;
let frame = 0;

// Elementos DOM
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameUI = document.getElementById('gameUI');
const scoreElement = document.getElementById('score');
const coinsElement = document.getElementById('coins');
const diamondsElement = document.getElementById('diamonds');
const speedElement = document.getElementById('speed');
const highScoreElement = document.getElementById('highScore');
const gameOverlay = document.getElementById('gameOverlay');
const finalScoreElement = document.getElementById('finalScore');
const finalCoinsElement = document.getElementById('finalCoins');
const finalDiamondsElement = document.getElementById('finalDiamonds');
const finalDistanceElement = document.getElementById('finalDistance');
const restartButton = document.getElementById('restartButton');
const mobileInstructions = document.getElementById('mobileInstructions');

highScoreElement.textContent = highScore;

// ==================== CLASSE DO PERSONAGEM ====================
class Player {
    constructor() {
        this.width = 38;
        this.height = 45;
        this.lane = 1;
        this.x = LANE_POSITIONS[this.lane] - this.width / 2;
        this.y = CANVAS_HEIGHT - 100;
        this.isJumping = false;
        this.isSliding = false;
        this.velocityY = 0;
        this.gravity = 0.8;
        this.jumpPower = -11;
        this.slideTimer = 0;
        this.animFrame = 0;
    }
    
    moveLeft() {
        if (!gameRunning) return;
        if (this.lane > 0) {
            this.lane--;
            this.updateX();
        }
    }
    
    moveRight() {
        if (!gameRunning) return;
        if (this.lane < LANE_COUNT - 1) {
            this.lane++;
            this.updateX();
        }
    }
    
    updateX() {
        this.x = LANE_POSITIONS[this.lane] - this.width / 2;
    }
    
    jump() {
        if (!gameRunning) return;
        if (!this.isJumping && !this.isSliding) {
            this.isJumping = true;
            this.velocityY = this.jumpPower;
            playJumpSound();
        }
    }
    
    slide() {
        if (!gameRunning) return;
        if (!this.isJumping && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = 18;
            this.height = 30;
            this.y = CANVAS_HEIGHT - 85;
            playSlideSound();
        }
    }
    
    update() {
        if (this.isJumping) {
            this.velocityY += this.gravity;
            this.y += this.velocityY;
            
            if (this.y >= CANVAS_HEIGHT - 100) {
                this.y = CANVAS_HEIGHT - 100;
                this.isJumping = false;
                this.velocityY = 0;
            }
        }
        
        if (this.isSliding) {
            this.slideTimer--;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.height = 45;
                this.y = CANVAS_HEIGHT - 100;
            }
        }
        
        // Animação de caminhada
        if (!this.isJumping && !this.isSliding && gameRunning) {
            this.animFrame = (this.animFrame + 0.2) % (Math.PI * 2);
        }
    }
    
    draw() {
        ctx.save();
        
        if (this.isJumping) {
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(this.velocityY * 0.03);
            ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
        }
        
        // Cor do personagem
        let mainColor = '#FF6B6B';
        if (this.isSliding) mainColor = '#FF8E8E';
        
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        
        // Corpo
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 10);
        ctx.fill();
        
        // Cabeça
        ctx.fillStyle = '#FF8E8E';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y - 5, this.width/2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Boné
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(this.x + 5, this.y - 12, this.width - 10, 8);
        
        // Olhos
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.35, this.y - 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.65, this.y - 10, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.35, this.y - 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width*0.65, this.y - 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Mochila
        ctx.fillStyle = '#4A90E2';
        ctx.beginPath();
        ctx.roundRect(this.x - 8, this.y + 8, 10, 28, 5);
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== CLASSE DO OBSTÁCULO ====================
class Obstacle {
    constructor(lane, type = 'normal') {
        this.width = 35;
        this.height = 42;
        this.lane = lane;
        this.x = LANE_POSITIONS[lane] - this.width / 2;
        this.y = -this.height;
        this.type = type;
        this.active = true;
    }
    
    update(speed) {
        this.y += speed;
        if (this.y > CANVAS_HEIGHT) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.save();
        ctx.shadowBlur = 3;
        
        // Obstáculo: caixote/barreira
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fill();
        
        // Detalhes
        ctx.fillStyle = '#A0522D';
        for(let i = 0; i < 2; i++) {
            ctx.fillRect(this.x + 5, this.y + 10 + i*15, this.width - 10, 3);
        }
        
        // Sinal de perigo
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + 5);
        ctx.lineTo(this.x + this.width - 8, this.y + 18);
        ctx.lineTo(this.x + 8, this.y + 18);
        ctx.fill();
        
        ctx.restore();
    }
    
    checkCollision(player) {
        const playerBox = {
            x: player.x,
            y: player.y,
            w: player.width,
            h: player.height
        };
        
        const obsBox = {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
        
        if (playerBox.x < obsBox.x + obsBox.w &&
            playerBox.x + playerBox.w > obsBox.x &&
            playerBox.y < obsBox.y + obsBox.h &&
            playerBox.y + playerBox.h > obsBox.y) {
            
            if (player.isSliding && this.type === 'low') {
                return false;
            }
            return true;
        }
        return false;
    }
}

// ==================== CLASSE DA MOEDA ====================
class Coin {
    constructor(lane) {
        this.width = 20;
        this.height = 20;
        this.lane = lane;
        this.x = LANE_POSITIONS[lane] - this.width / 2;
        this.y = -this.height;
        this.active = true;
        this.collected = false;
        this.rotation = 0;
    }
    
    update(speed) {
        this.y += speed;
        this.rotation += 0.1;
        if (this.y > CANVAS_HEIGHT) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width/3, this.height/3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FFD700';
        ctx.font = `${this.width}px Arial`;
        ctx.fillText('★', -8, 6);
        
        ctx.restore();
    }
    
    checkCollection(player) {
        const playerBox = {
            x: player.x,
            y: player.y,
            w: player.width,
            h: player.height
        };
        
        const coinBox = {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
        
        return (playerBox.x < coinBox.x + coinBox.w &&
                playerBox.x + playerBox.w > coinBox.x &&
                playerBox.y < coinBox.y + coinBox.h &&
                playerBox.y + playerBox.h > coinBox.y);
    }
}

// ==================== CLASSE DO DIAMANTE ====================
class Diamond {
    constructor(lane) {
        this.width = 22;
        this.height = 22;
        this.lane = lane;
        this.x = LANE_POSITIONS[lane] - this.width / 2;
        this.y = -this.height;
        this.active = true;
        this.collected = false;
        this.pulse = 0;
    }
    
    update(speed) {
        this.y += speed;
        this.pulse += 0.05;
        if (this.y > CANVAS_HEIGHT) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        const scale = 1 + Math.sin(this.pulse) * 0.1;
        ctx.scale(scale, scale);
        
        // Diamante
        ctx.fillStyle = '#00E5FF';
        ctx.beginPath();
        ctx.moveTo(0, -this.height/2);
        ctx.lineTo(this.width/2, 0);
        ctx.lineTo(0, this.height/2);
        ctx.lineTo(-this.width/2, 0);
        ctx.fill();
        
        ctx.fillStyle = '#00B8D4';
        ctx.beginPath();
        ctx.moveTo(0, -this.height/3);
        ctx.lineTo(this.width/3, 0);
        ctx.lineTo(0, this.height/3);
        ctx.lineTo(-this.width/3, 0);
        ctx.fill();
        
        // Brilho
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(0, -this.height/4, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    checkCollection(player) {
        const playerBox = {
            x: player.x,
            y: player.y,
            w: player.width,
            h: player.height
        };
        
        const diamondBox = {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
        
        return (playerBox.x < diamondBox.x + diamondBox.w &&
                playerBox.x + playerBox.w > diamondBox.x &&
                playerBox.y < diamondBox.y + diamondBox.h &&
                playerBox.y + playerBox.h > diamondBox.y);
    }
}

// ==================== GERENCIAMENTO DE ENTIDADES ====================
let player;
let obstacles = [];
let coinsList = [];
let diamondsList = [];

let lastObstacleFrame = 0;
let lastCoinFrame = 0;
let lastDiamondFrame = 0;

let obstacleInterval = 70;
let coinInterval = 30;
let diamondInterval = 120;

function generateObstacle() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    obstacles.push(new Obstacle(lane, 'normal'));
}

function generateCoin() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    coinsList.push(new Coin(lane));
}

function generateDiamond() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    diamondsList.push(new Diamond(lane));
}

function updateEntities() {
    // Gerar obstáculos
    const currentObstInterval = Math.max(35, obstacleInterval - Math.floor(gameSpeed * 1.5));
    if (frame - lastObstacleFrame > currentObstInterval) {
        generateObstacle();
        lastObstacleFrame = frame;
    }
    
    // Gerar moedas
    const currentCoinInterval = Math.max(15, coinInterval - Math.floor(gameSpeed));
    if (frame - lastCoinFrame > currentCoinInterval) {
        generateCoin();
        lastCoinFrame = frame;
    }
    
    // Gerar diamantes (mais raros)
    const currentDiamondInterval = Math.max(80, diamondInterval - Math.floor(gameSpeed));
    if (frame - lastDiamondFrame > currentDiamondInterval) {
        generateDiamond();
        lastDiamondFrame = frame;
    }
    
    // Atualizar e verificar colisões
    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        obs.update(gameSpeed);
        
        if (obs.active && obs.checkCollision(player)) {
            gameOver();
            return;
        }
        
        if (!obs.active) {
            obstacles.splice(i, 1);
            i--;
        }
    }
    
    // Moedas
    for (let i = 0; i < coinsList.length; i++) {
        const coin = coinsList[i];
        coin.update(gameSpeed);
        
        if (!coin.collected && coin.checkCollection(player)) {
            coin.collected = true;
            coins++;
            score += 10;
            coinsElement.textContent = coins;
            playCoinSound();
            createCollectEffect(coin.x + coin.width/2, coin.y + coin.height/2, '#FFD700');
        }
        
        if (!coin.active) {
            coinsList.splice(i, 1);
            i--;
        }
    }
    
    // Diamantes
    for (let i = 0; i < diamondsList.length; i++) {
        const diamond = diamondsList[i];
        diamond.update(gameSpeed);
        
        if (!diamond.collected && diamond.checkCollection(player)) {
            diamond.collected = true;
            diamonds++;
            score += 50;
            diamondsElement.textContent = diamonds;
            playDiamondSound();
            createCollectEffect(diamond.x + diamond.width/2, diamond.y + diamond.height/2, '#00E5FF');
        }
        
        if (!diamond.active) {
            diamondsList.splice(i, 1);
            i--;
        }
    }
}

// ==================== SISTEMA DE PONTUAÇÃO ====================
function updateScore() {
    // Pontos por tempo/distância
    score += Math.floor(gameSpeed * 0.3);
    distance += Math.floor(gameSpeed * 0.2);
    
    scoreElement.textContent = Math.floor(score);
    
    if (Math.floor(score) > highScore) {
        highScore = Math.floor(score);
        highScoreElement.textContent = highScore;
        localStorage.setItem('subwayHighScore', highScore);
    }
}

function updateSpeed() {
    if (gameSpeed < 14) {
        gameSpeed += 0.003;
    }
    speedElement.textContent = Math.floor(gameSpeed * 10) / 10;
}

// ==================== EFEITOS VISUAIS ====================
let particles = [];

function createCollectEffect(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 2,
            life: 20,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life--;
        
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

function drawParticles() {
    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== CENÁRIO E ANIMAÇÕES ====================
let bgOffset = 0;
let railOffset = 0;

function drawBackground() {
    // Gradiente de fundo
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Edifícios ao fundo (efeito parallax)
    ctx.fillStyle = 'rgba(30, 30, 60, 0.5)';
    for (let i = 0; i < 8; i++) {
        const x = (bgOffset * 0.5 + i * 120) % (CANVAS_WIDTH + 200) - 100;
        const w = 40;
        const h = 60 + Math.sin(i) * 20;
        ctx.fillRect(x, CANVAS_HEIGHT - 150 - h, w, h);
        ctx.fillStyle = 'rgba(50, 50, 80, 0.5)';
    }
    bgOffset += gameSpeed * 0.5;
    
    // Trilhos do metrô
    for (let i = 1; i < LANE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Linhas de velocidade no chão
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 15; i++) {
        const x = (railOffset + i * 50) % CANVAS_WIDTH;
        ctx.fillRect(x, CANVAS_HEIGHT - 45, 5, 15);
    }
    railOffset += gameSpeed;
    
    // Chão
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);
    
    ctx.fillStyle = '#34495e';
    for (let i = 0; i < LANE_COUNT; i++) {
        ctx.fillRect(LANE_POSITIONS[i] - 15, CANVAS_HEIGHT - 48, 30, 5);
    }
}

function draw() {
    drawBackground();
    
    // Desenhar moedas
    for (let coin of coinsList) {
        if (!coin.collected) coin.draw();
    }
    
    // Desenhar diamantes
    for (let diamond of diamondsList) {
        if (!diamond.collected) diamond.draw();
    }
    
    // Desenhar obstáculos
    for (let obs of obstacles) {
        obs.draw();
    }
    
    // Desenhar partículas
    drawParticles();
    
    // Desenhar personagem
    player.draw();
    
    // Efeito de velocidade extrema
    if (gameSpeed > 10) {
        ctx.fillStyle = `rgba(255, 0, 0, ${(gameSpeed - 10) / 10})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, 5);
    }
}

// ==================== SONS (Web Audio API) ====================
let audioContext = null;
let audioEnabled = false;

function initAudio() {
    if (!audioContext && !audioEnabled) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioEnabled = true;
    }
}

function playJumpSound() {
    if (!audioEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 523.25;
        gain.gain.value = 0.2;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
        osc.stop(audioContext.currentTime + 0.2);
    } catch(e) {}
}

function playSlideSound() {
    if (!audioEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 261.63;
        gain.gain.value = 0.15;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.15);
        osc.stop(audioContext.currentTime + 0.15);
    } catch(e) {}
}

function playCoinSound() {
    if (!audioEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
        osc.stop(audioContext.currentTime + 0.1);
    } catch(e) {}
}

function playDiamondSound() {
    if (!audioEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 1318.52;
        gain.gain.value = 0.2;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
        osc.stop(audioContext.currentTime + 0.2);
        
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1046.50;
        gain2.gain.value = 0.15;
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.15);
        osc2.stop(audioContext.currentTime + 0.15);
    } catch(e) {}
}

function playCrashSound() {
    if (!audioEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 150;
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
        osc.stop(audioContext.currentTime + 0.3);
    } catch(e) {}
}

// ==================== GAME OVER E REINÍCIO ====================
function gameOver() {
    if (!gameRunning) return;
    
    gameRunning = false;
    playCrashSound();
    
    finalScoreElement.textContent = Math.floor(score);
    finalCoinsElement.textContent = coins;
    finalDiamondsElement.textContent = diamonds;
    finalDistanceElement.textContent = Math.floor(distance);
    
    gameOverlay.classList.remove('hidden');
}

function restartGame() {
    gameRunning = true;
    gameStarted = true;
    score = 0;
    coins = 0;
    diamonds = 0;
    distance = 0;
    gameSpeed = 4;
    frame = 0;
    
    obstacles = [];
    coinsList = [];
    diamondsList = [];
    particles = [];
    
    lastObstacleFrame = 0;
    lastCoinFrame = 0;
    lastDiamondFrame = 0;
    
    player = new Player();
    
    scoreElement.textContent = '0';
    coinsElement.textContent = '0';
    diamondsElement.textContent = '0';
    speedElement.textContent = '4';
    
    gameOverlay.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
    
    if (window.innerWidth <= 768) {
        mobileInstructions.classList.remove('hidden');
    }
}

function startGame() {
    restartGame();
}

// ==================== CONTROLES ====================
// Teclado
document.addEventListener('keydown', (e) => {
    if (!gameStarted || !gameRunning) {
        if (e.code === 'Space' || e.code === 'Enter') {
            if (!gameStarted) startGame();
            else if (!gameRunning) restartGame();
        }
        return;
    }
    
    switch(e.key) {
        case 'ArrowLeft': case 'a': case 'A':
            player.moveLeft();
            break;
        case 'ArrowRight': case 'd': case 'D':
            player.moveRight();
            break;
        case 'ArrowUp': case 'w': case 'W':
            player.jump();
            break;
        case 'ArrowDown': case 's': case 'S':
            player.slide();
            break;
    }
    e.preventDefault();
});

// Mobile Swipes
let touchStartX = 0, touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    initAudio();
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameRunning || !gameStarted) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 20) {
        if (diffX > 0) player.moveRight();
        else player.moveLeft();
    } else if (Math.abs(diffY) > 20) {
        if (diffY < 0) player.jump();
        else player.slide();
    }
});

// Botões
startButton.addEventListener('click', () => {
    initAudio();
    startGame();
});

restartButton.addEventListener('click', () => {
    initAudio();
    restartGame();
});

canvas.addEventListener('click', () => {
    if (!audioEnabled) initAudio();
});

// ==================== LOOP PRINCIPAL ====================
function gameLoop() {
    if (gameRunning && gameStarted) {
        frame++;
        
        player.update();
        updateEntities();
        updateScore();
        updateSpeed();
        updateParticles();
        
        draw();
    } else if (gameStarted) {
        draw();
    }
    
    requestAnimationFrame(gameLoop);
}

// Helper: roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x+r, y);
        this.lineTo(x+w-r, y);
        this.quadraticCurveTo(x+w, y, x+w, y+r);
        this.lineTo(x+w, y+h-r);
        this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        this.lineTo(x+r, y+h);
        this.quadraticCurveTo(x, y+h, x, y+h-r);
        this.lineTo(x, y+r);
        this.quadraticCurveTo(x, y, x+r, y);
        return this;
    };
}

// Inicialização
player = new Player();
gameLoop();

// Prevenir scroll com setas
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
    }
});
