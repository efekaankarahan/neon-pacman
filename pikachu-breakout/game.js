const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const gameOverScreen = document.getElementById('game-over');
const gameOverText = document.getElementById('game-over-text');
const restartBtn = document.getElementById('restart-btn');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');

// Game Variables
let score = 0;
let lives = 3;
let animationId;
let gameRunning = false;

// Paddle
const paddle = {
    width: 100,
    height: 15,
    x: canvas.width / 2 - 50,
    y: canvas.height - 30,
    speed: 8,
    dx: 0,
    color: '#FFDE00' // Pikachu Yellow
};

// Ball
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    size: 8,
    speed: 5,
    dx: 5,
    dy: -5,
    color: '#CC0000' // Cheek Red
};

// Bricks
const brickRowCount = 5;
const brickColumnCount = 9;
const brickPadding = 10;
const brickOffsetTop = 50;
const brickOffsetLeft = 35;
const brickWidth = 75;
const brickHeight = 20;

const bricks = [];
function initBricks() {
    bricks.length = 0;
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            // Colors: Yellow, Black, Red pattern
            let color = '#FFDE00';
            if (r === 0) color = '#CC0000'; // Top row Red
            else if (r === 1) color = '#333'; // Second row Black

            bricks[c][r] = { x: 0, y: 0, status: 1, color: color };
        }
    }
}

// Input handling
let rightPressed = false;
let leftPressed = false;

document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);

// Touch/Mouse controls for mobile buttons
function addTouchListeners(btn, isRight) {
    const start = (e) => {
        e.preventDefault();
        if (isRight) rightPressed = true;
        else leftPressed = true;
    };
    const end = (e) => {
        e.preventDefault();
        if (isRight) rightPressed = false;
        else leftPressed = false;
    };

    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end);
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
}

addTouchListeners(leftBtn, false);
addTouchListeners(rightBtn, true);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

// Drawing Functions
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
    // Pokeball detail (line)
    ctx.beginPath();
    ctx.moveTo(ball.x - ball.size, ball.y);
    ctx.lineTo(ball.x + ball.size, ball.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
    // Pokeball detail (center)
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = paddle.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
    // Tail stripes detail
    ctx.fillStyle = '#654321'; // Brown
    ctx.fillRect(paddle.x + 10, paddle.y, 15, paddle.height);
    ctx.fillRect(paddle.x + paddle.width - 25, paddle.y, 15, paddle.height);
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;

                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = bricks[c][r].color;
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.stroke();
                ctx.closePath();
            }
        }
    }
}

// Logic
function movePaddle() {
    if (rightPressed) {
        paddle.x += paddle.speed;
    } else if (leftPressed) {
        paddle.x -= paddle.speed;
    }

    // Wall detection
    if (paddle.x < 0) {
        paddle.x = 0;
    }
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision (left/right)
    if (ball.x + ball.size > canvas.width || ball.x - ball.size < 0) {
        ball.dx *= -1;
    }

    // Wall collision (top)
    if (ball.y - ball.size < 0) {
        ball.dy *= -1;
    }

    // Paddle collision
    if (
        ball.y + ball.size > paddle.y &&
        ball.y - ball.size < paddle.y + paddle.height &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width
    ) {
        // Simple bounce: reverse Y
        // Optional: Add English/spin based on where it hit the paddle
        ball.dy = -ball.speed;
        // Speed up slightly
        ball.speed += 0.1;
        // make sure it goes up
        if (ball.dy > 0) ball.dy = -ball.speed;
        else ball.dy = (ball.dy / Math.abs(ball.dy)) * ball.speed;
    }

    // Bottom collision (Loss)
    if (ball.y + ball.size > canvas.height) {
        lives--;
        livesEl.innerText = lives;
        if (!lives) {
            endGame(false);
        } else {
            resetBall();
        }
    }
}

function collisionDetection() {
    let activeBricks = 0;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                activeBricks++;
                if (
                    ball.x > b.x &&
                    ball.x < b.x + brickWidth &&
                    ball.y > b.y &&
                    ball.y < b.y + brickHeight
                ) {
                    ball.dy *= -1;
                    b.status = 0;
                    score += 10;
                    scoreEl.innerText = score;
                }
            }
        }
    }
    if (activeBricks === 0) {
        endGame(true);
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 30;
    ball.dx = 5 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -5;
    paddle.x = canvas.width / 2 - paddle.width / 2;
}

function endGame(win) {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    gameOverText.innerText = win ? "YOU WIN! PIKA PIKA!" : "GAME OVER";
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('visible');
}

function draw() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBricks();
    drawBall();
    drawPaddle();

    collisionDetection();
    moveBall();
    movePaddle();

    animationId = requestAnimationFrame(draw);
}

function startGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    scoreEl.innerText = score;
    livesEl.innerText = lives;
    gameOverScreen.classList.add('hidden');
    gameOverScreen.classList.remove('visible');
    initBricks();
    resetBall();
    draw();
}

restartBtn.addEventListener('click', startGame);

// Initial Start
initBricks();
resetBall();
// Draw one frame to show initial state
drawBricks();
drawBall();
drawPaddle();
// Wait for click to start or just start? Let's wait or show "Ready"
// For now, let's just start or show a "Start" overlay.
// Actually, let's just show the Game Over screen with "Play" initially?
// Or just let it sit there.
// Let's autopause and wait for user to click "Try Again" which acts as Start.
gameOverText.innerText = "Ready?";
gameOverScreen.classList.remove('hidden');
gameOverScreen.classList.add('visible');
