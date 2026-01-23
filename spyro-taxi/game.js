const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let frame = 0;
let score = 0;
let gameSpeed = 5;
let isGameOver = false;
let isPlaying = false;
let obstacles = [];

// Assets
const spyroImg = new Image();
spyroImg.src = 'spyro_v2.png';

const taxiImg = new Image();
taxiImg.src = 'taxi_v2.png';

// Physics Constants
const GRAVITY = 0.6;
const JUMP_FORCE = -15; // Increased jumping power for bigger sprites
const GROUND_Y = 300; // Floor level

class Spyro {
    constructor() {
        this.width = 100;
        this.height = 100;
        this.x = 100;
        this.y = GROUND_Y - this.height;
        this.dy = 0;
        this.isJumping = false;
    }

    update() {
        // Jump Physics
        if (this.isJumping) {
            this.dy += GRAVITY;
            this.y += this.dy;

            // Land Logic
            if (this.y > GROUND_Y - this.height) {
                this.y = GROUND_Y - this.height;
                this.isJumping = false;
                this.dy = 0;
            }
        }
    }

    jump() {
        if (!this.isJumping) {
            this.dy = JUMP_FORCE;
            this.isJumping = true;
        }
    }

    draw() {
        // Draw Spyro
        if (spyroImg.complete) {
            ctx.drawImage(spyroImg, this.x, this.y, this.width, this.height);
        } else {
            // Fallback placeholder
            ctx.fillStyle = 'purple';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

class Obstacle {
    constructor() {
        this.width = 120; // Bigger taxi
        this.height = 70;
        this.x = canvas.width;
        this.y = GROUND_Y - this.height;
        this.markedForDeletion = false;
    }

    update() {
        this.x -= gameSpeed;
        if (this.x < -this.width) {
            this.markedForDeletion = true;
            score++;
            document.getElementById('score').innerText = 'Score: ' + score;
            // Increase speed slightly
            if (score % 5 === 0) gameSpeed += 0.5;
        }
    }

    draw() {
        if (taxiImg.complete) {
            ctx.drawImage(taxiImg, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

const spyro = new Spyro();

function handleInput(e) {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && isPlaying && !isGameOver) {
        spyro.jump();
    }
    if ((e.code === 'Space' || e.code === 'Enter') && !isPlaying && !isGameOver) {
        startGame();
    }
}

function startGame() {
    isPlaying = true;
    document.getElementById('start-screen').classList.add('hidden');
    animate();
}

function gameOver() {
    isGameOver = true;
    isPlaying = false;
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
}

function animate() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ground
    ctx.fillStyle = '#2c3e50'; // Road color
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    // Road Line
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([20, 20]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 50);
    ctx.lineTo(canvas.width, GROUND_Y + 50);
    ctx.stroke();

    spyro.update();
    spyro.draw();

    // Span Obstacles (Taxis)
    if (frame % 100 === 0 || (frame % 60 === 0 && gameSpeed > 10)) {
        // Random chance to spawn
        if (Math.random() > 0.4) {
            obstacles.push(new Obstacle());
        }
    }

    obstacles.forEach(obstacle => {
        obstacle.update();
        obstacle.draw();

        // Collision Detection
        if (
            spyro.x < obstacle.x + obstacle.width &&
            spyro.x + spyro.width > obstacle.x &&
            spyro.y < obstacle.y + obstacle.height &&
            spyro.y + spyro.height > obstacle.y
        ) {
            gameOver();
        }
    });

    obstacles = obstacles.filter(o => !o.markedForDeletion);

    frame++;
    requestAnimationFrame(animate);
}

// Event Listeners
window.addEventListener('keydown', handleInput);
window.addEventListener('click', () => {
    if (isPlaying) spyro.jump();
    else if (!isGameOver) startGame();
});

// Initial Draw
// Draw background once
ctx.fillStyle = '#34495e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = 'white';
ctx.font = '20px Arial';
ctx.fillText('Loading assets...', 10, 30);
