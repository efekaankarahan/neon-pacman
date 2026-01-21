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
let gameLoopId;
let speed = 2000; // ms per frame (2 seconds per block)

let snake = [];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;

document.addEventListener('keydown', keyDownEvent);
playBtn.addEventListener('click', startGame);

function resetGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ]; // Head is index 0
    dx = 0;
    dy = -1; // Moving Up initially
    nextDx = 0;
    nextDy = -1;
    score = 0;
    scoreEl.innerText = score;
    placeFood();
    gameOverScreen.classList.add('hidden');
    gameRunning = true;
    gameLoop();
}

function startGame() {
    startScreen.classList.add('hidden');
    resetGame();
}

function keyDownEvent(e) {
    // Left
    if ((e.keyCode === 37 || e.key === 'ArrowLeft') && dy !== 0) {
        nextDx = -1; nextDy = 0;
    }
    // Up
    else if ((e.keyCode === 38 || e.key === 'ArrowUp') && dx !== 0) {
        nextDx = 0; nextDy = -1;
    }
    // Right
    else if ((e.keyCode === 39 || e.key === 'ArrowRight') && dy !== 0) {
        nextDx = 1; nextDy = 0;
    }
    // Down
    else if ((e.keyCode === 40 || e.key === 'ArrowDown') && dx !== 0) {
        nextDx = 0; nextDy = 1;
    }
}

function placeFood() {
    food.x = Math.floor(Math.random() * TILE_COUNT);
    food.y = Math.floor(Math.random() * TILE_COUNT);

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

    // Check Wall Collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
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

    snake.unshift(head); // Add new head

    // Check Food Collision
    if (head.x === food.x && head.y === food.y) {
        score += 1; // Count items eaten
        scoreEl.innerText = score;
        placeFood();
        // Speed up slightly every 5 points
        // Speed up slightly every 5 points
        // Removed dynamic speed up to keep it slow on purpose
        // if (score % 5 === 0 && speed > 50) speed -= 5;
    } else {
        snake.pop(); // Remove tail
    }
}

function draw() {
    // Clear Screen
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Subtle)
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

    // Draw Food
    ctx.fillStyle = '#ff4500'; // Orange Red Food (Contrast)
    ctx.shadowBlur = 0; // No Neon
    ctx.fillRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);

    // Draw Snake
    ctx.fillStyle = '#00BFFF'; // Pro Blue
    ctx.shadowBlur = 0; // No Neon
    snake.forEach((part, index) => {
        // Head is slightly brighter?
        if (index === 0) ctx.fillStyle = '#fff';
        else ctx.fillStyle = '#00BFFF';

        ctx.fillRect(part.x * GRID_SIZE + 1, part.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    ctx.shadowBlur = 0;
}

function gameLoop() {
    if (!gameRunning) return;

    update();
    if (!gameRunning) return; // double check after update
    draw();

    setTimeout(gameLoop, speed);
}

function endGame() {
    gameRunning = false;
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}
