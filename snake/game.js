const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const playBtn = document.getElementById('play-btn');

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

let score = 0;
let gameRunning = false;
let speed = 150;

let snake = [];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;

// Dynamic Area Variables
let borderOffset = 0; // 0 = normal, 1 = shrunk
let shrinkTimeout;
let restoreTimeout;

// Force D-Pad on touch devices (Safari fix)
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const dPad = document.querySelector('.d-pad');
    if (dPad) dPad.style.display = 'grid';
}

document.addEventListener('keydown', keyDownEvent);
playBtn.addEventListener('click', startGame);

// Touch Controls
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

function handleTouch(key) {
    const event = { key: key, keyCode: 0 };
    keyDownEvent(event);
}

if (btnUp) {
    btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch('ArrowUp'); });
    btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch('ArrowDown'); });
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch('ArrowLeft'); });
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch('ArrowRight'); });

    btnUp.addEventListener('mousedown', (e) => { e.preventDefault(); handleTouch('ArrowUp'); });
    btnDown.addEventListener('mousedown', (e) => { e.preventDefault(); handleTouch('ArrowDown'); });
    btnLeft.addEventListener('mousedown', (e) => { e.preventDefault(); handleTouch('ArrowLeft'); });
    btnRight.addEventListener('mousedown', (e) => { e.preventDefault(); handleTouch('ArrowRight'); });
}

function resetGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    dx = 0;
    dy = -1;
    nextDx = 0;
    nextDy = -1;
    score = 0;
    scoreEl.innerText = score;
    borderOffset = 0;

    // Clear timeouts
    clearTimeout(shrinkTimeout);
    clearTimeout(restoreTimeout);

    placeFood();
    gameOverScreen.classList.add('hidden');
    gameRunning = true;
    gameLoop();

    // Schedule first shrink
    scheduleShrink();
}

function startGame() {
    startScreen.classList.add('hidden');
    resetGame();
}

// Shrink Logic
function scheduleShrink() {
    // Random delay between 10s and 30s
    const delay = Math.floor(Math.random() * 20000) + 10000;
    shrinkTimeout = setTimeout(() => {
        if (!gameRunning) return;
        borderOffset = 1;
        // Schedule restore
        restoreTimeout = setTimeout(() => {
            if (!gameRunning) return;
            borderOffset = 0;
            scheduleShrink();
        }, 20000); // 20 seconds shrink duration
    }, delay);
}

function keyDownEvent(e) {
    if ((e.keyCode === 37 || e.key === 'ArrowLeft') && dy !== 0) {
        nextDx = -1; nextDy = 0;
    }
    else if ((e.keyCode === 38 || e.key === 'ArrowUp') && dx !== 0) {
        nextDx = 0; nextDy = -1;
    }
    else if ((e.keyCode === 39 || e.key === 'ArrowRight') && dy !== 0) {
        nextDx = 1; nextDy = 0;
    }
    else if ((e.keyCode === 40 || e.key === 'ArrowDown') && dx !== 0) {
        nextDx = 0; nextDy = 1;
    }
}

function placeFood() {
    // Food must be within playable area
    // Min: borderOffset, Max: TILE_COUNT - 1 - borderOffset
    const min = borderOffset;
    const max = TILE_COUNT - 1 - borderOffset;
    const range = max - min + 1;

    if (range <= 0) return; // Should not happen with 1 tile border

    food.x = Math.floor(Math.random() * range) + min;
    food.y = Math.floor(Math.random() * range) + min;

    // Don't spawn on snake body
    for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
            placeFood();
            break;
        }
    }
}

function update() {
    dx = nextDx;
    dy = nextDy;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Check Wall Collision with dynamic border
    // Valid X: [borderOffset, TILE_COUNT - 1 - borderOffset]
    // If head.x < borderOffset or head.x > TILE_COUNT - 1 - borderOffset => die
    // TILE_COUNT = 20. Offset 1. Valid 1..18. 
    // If head.x < 1 (0) or head.x >= 19.

    if (head.x < borderOffset || head.x >= TILE_COUNT - borderOffset ||
        head.y < borderOffset || head.y >= TILE_COUNT - borderOffset) {
        endGame();
        return;
    }

    // Check Self Collision
    for (let part of snake) {
        if (part.x === head.x && part.y === head.y) {
            endGame();
            return;
        }
    }

    snake.unshift(head);

    // Check Food Collision
    if (head.x === food.x && head.y === food.y) {
        score += 1;
        scoreEl.innerText = score;
        placeFood();
        if (speed > 80) speed -= 20;
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear Screen with Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0f0c29'); // Deep dark blue/purple
    gradient.addColorStop(1, '#302b63'); // Slightly lighter
    // Or simpler:
    // gradient.addColorStop(0, '#141414');
    // gradient.addColorStop(1, '#000000');
    // Let's go with a very subtle dark grey-blue
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#0a0a12');
    bgGradient.addColorStop(1, '#1a1a24');

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    ctx.strokeStyle = '#1a1a1a';
    for (let i = 0; i < TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }

    // Draw Danger Zone (Border) if active
    if (borderOffset > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Red tint
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;

        // Top
        ctx.fillRect(0, 0, canvas.width, GRID_SIZE);
        // Bottom
        ctx.fillRect(0, canvas.height - GRID_SIZE, canvas.width, GRID_SIZE);
        // Left
        ctx.fillRect(0, 0, GRID_SIZE, canvas.height);
        // Right
        ctx.fillRect(canvas.width - GRID_SIZE, 0, GRID_SIZE, canvas.height);

        ctx.strokeRect(GRID_SIZE, GRID_SIZE, canvas.width - 2 * GRID_SIZE, canvas.height - 2 * GRID_SIZE);
    }

    // Draw Food
    ctx.fillStyle = '#ff4500';
    ctx.shadowBlur = 0;
    ctx.fillRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);

    // Draw Snake
    ctx.fillStyle = '#00BFFF';
    ctx.shadowBlur = 0;
    snake.forEach((part, index) => {
        if (index === 0) ctx.fillStyle = '#fff';
        else ctx.fillStyle = '#00BFFF';

        ctx.fillRect(part.x * GRID_SIZE + 1, part.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    ctx.shadowBlur = 0;
}

function gameLoop() {
    if (!gameRunning) return;

    update();
    if (!gameRunning) return;
    draw();

    setTimeout(gameLoop, speed);
}

function endGame() {
    gameRunning = false;
    clearTimeout(shrinkTimeout);
    clearTimeout(restoreTimeout);
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}
