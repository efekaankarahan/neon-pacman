/* Robust Game with Error Handling */
window.onerror = function (msg, url, line) {
    const errorBox = document.createElement('div');
    errorBox.style.position = 'fixed';
    errorBox.style.top = '0';
    errorBox.style.left = '0';
    errorBox.style.width = '100%';
    errorBox.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    errorBox.style.color = 'white';
    errorBox.style.padding = '10px';
    errorBox.style.zIndex = '10000';
    errorBox.style.fontFamily = 'monospace';
    errorBox.innerText = 'JS Error: ' + msg + ' (Line ' + line + ')';
    document.body.appendChild(errorBox);
    console.error(msg);
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const winScreen = document.getElementById('win-screen');
const finalScoreEl = document.getElementById('final-score');
const winScoreEl = document.getElementById('win-score');
const livesEl = document.getElementById('lives');

const TILE_SIZE = 16;
const ROWS = 31;
const COLS = 28;

// 1: Wall, 0: Dot, 2: Power Pellet, 3: Empty (Pacman spawn), 4: Ghost House
const mapLayout = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 2, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 2, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 2, 2, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 2, 2, 2, 2, 2, 2, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1, 2, 2, 2, 2, 2, 2, 1, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 2, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 2, 1],
    [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1],
    [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };
const LEFT = { x: -1, y: 0 };
const RIGHT = { x: 1, y: 0 };
const STOP = { x: 0, y: 0 };

let score = 0;
let lives = 3;
let gameRunning = false;
let gameLoopId;
let pelletsRemaining = 0;

class Wall {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
    }
    draw() {
        ctx.fillStyle = '#1919A6';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#6666FF';
        ctx.strokeRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);
    }
}

class Pellet {
    constructor(x, y, isPower) {
        this.x = x + TILE_SIZE / 2;
        this.y = y + TILE_SIZE / 2;
        this.radius = isPower ? 7 : 3;
        this.isPower = isPower;
        this.value = isPower ? 50 : 10;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffb8ae';
        ctx.fill();
        ctx.closePath();
    }
}

class Pacman {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = TILE_SIZE / 2 - 2;
        this.dir = STOP;
        this.nextDir = STOP;
        this.speed = 2;
        this.x = x * TILE_SIZE + TILE_SIZE / 2;
        this.y = y * TILE_SIZE + TILE_SIZE / 2;
        this.frame = 0;
        this.mouthOpen = 0.2;
    }

    update(walls) {
        if (this.canMove(this.nextDir, walls)) {
            this.dir = this.nextDir;
        }

        if (this.canMove(this.dir, walls)) {
            this.x += this.dir.x * this.speed;
            this.y += this.dir.y * this.speed;
        }

        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;

        this.frame++;
        this.mouthOpen = 0.2 * Math.sin(this.frame * 0.2) + 0.2;
    }

    canMove(direction, walls) {
        let nextX = this.x + direction.x * this.speed;
        let nextY = this.y + direction.y * this.speed;

        let r = this.radius;
        let points = [
            { x: nextX - r, y: nextY - r },
            { x: nextX + r, y: nextY - r },
            { x: nextX - r, y: nextY + r },
            { x: nextX + r, y: nextY + r }
        ];

        for (let p of points) {
            let col = Math.floor(p.x / TILE_SIZE);
            let row = Math.floor(p.y / TILE_SIZE);
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
                if (mapLayout[row][col] === 1) return false;
            }
        }
        return true;
    }

    draw() {
        ctx.beginPath();
        let angle = 0;
        if (this.dir === RIGHT) angle = 0;
        if (this.dir === DOWN) angle = Math.PI / 2;
        if (this.dir === LEFT) angle = Math.PI;
        if (this.dir === UP) angle = -Math.PI / 2;

        ctx.arc(this.x, this.y, this.radius, angle + this.mouthOpen, angle + 2 * Math.PI - this.mouthOpen);
        ctx.lineTo(this.x, this.y);
        ctx.fillStyle = '#ffee00';
        ctx.fill();
        ctx.closePath();
    }

    reset(x, y) {
        this.x = x * TILE_SIZE + TILE_SIZE / 2;
        this.y = y * TILE_SIZE + TILE_SIZE / 2;
        this.dir = STOP;
        this.nextDir = STOP;
    }
}

class Ghost {
    constructor(x, y, color) {
        this.initialX = x;
        this.initialY = y;
        this.color = color;
        this.reset();
        this.speed = 1.8;
        this.radius = TILE_SIZE / 2 - 2;
    }

    reset() {
        this.x = this.initialX * TILE_SIZE + TILE_SIZE / 2;
        this.y = this.initialY * TILE_SIZE + TILE_SIZE / 2;
        this.dir = [UP, DOWN, LEFT, RIGHT][Math.floor(Math.random() * 4)];
    }

    update(walls) {
        if (!this.canMove(this.dir, walls)) {
            this.changeDirection(walls);
        } else if (Math.random() < 0.02) {
            this.changeDirection(walls);
        }

        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;

        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
    }

    changeDirection(walls) {
        let options = [];
        if (this.canMove(UP, walls) && this.dir !== DOWN) options.push(UP);
        if (this.canMove(DOWN, walls) && this.dir !== UP) options.push(DOWN);
        if (this.canMove(LEFT, walls) && this.dir !== RIGHT) options.push(LEFT);
        if (this.canMove(RIGHT, walls) && this.dir !== LEFT) options.push(RIGHT);

        if (options.length > 0) {
            this.dir = options[Math.floor(Math.random() * options.length)];
        } else {
            if (this.dir === UP) this.dir = DOWN;
            else if (this.dir === DOWN) this.dir = UP;
            else if (this.dir === LEFT) this.dir = RIGHT;
            else if (this.dir === RIGHT) this.dir = LEFT;
        }
    }

    canMove(direction, walls) {
        let nextX = this.x + direction.x * this.speed;
        let nextY = this.y + direction.y * this.speed;

        let r = this.radius;
        let points = [
            { x: nextX - r, y: nextY - r },
            { x: nextX + r, y: nextY - r },
            { x: nextX - r, y: nextY + r },
            { x: nextX + r, y: nextY + r }
        ];

        for (let p of points) {
            let col = Math.floor(p.x / TILE_SIZE);
            let row = Math.floor(p.y / TILE_SIZE);
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
                if (mapLayout[row][col] === 1) return false;
            }
        }
        return true;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, Math.PI, 0);
        ctx.lineTo(this.x + this.radius, this.y + this.radius);
        ctx.lineTo(this.x - this.radius, this.y + this.radius);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

let walls = [];
let pellets = [];
let pacman;
let ghosts = [];

function init() {
    walls = [];
    pellets = [];
    ghosts = [];
    pelletsRemaining = 0;

    const ghostColors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let type = mapLayout[r][c];
            if (type === 1) {
                walls.push(new Wall(c * TILE_SIZE, r * TILE_SIZE));
            } else if (type === 0) {
                pellets.push(new Pellet(c * TILE_SIZE, r * TILE_SIZE, false));
                pelletsRemaining++;
            } else if (type === 2) {
                pellets.push(new Pellet(c * TILE_SIZE, r * TILE_SIZE, true));
                pelletsRemaining++;
            } else if (type === 3) {
                if (!pacman) pacman = new Pacman(c, r);
            }
        }
    }

    // Explicitly add ghosts
    ghosts.push(new Ghost(13, 13, ghostColors[0]));
    ghosts.push(new Ghost(14, 13, ghostColors[1]));
    ghosts.push(new Ghost(13, 14, ghostColors[2]));
    ghosts.push(new Ghost(14, 14, ghostColors[3]));

    if (!pacman) pacman = new Pacman(1, 1);
}

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    walls.forEach(w => w.draw());
    pellets.forEach(p => p.draw());
    if (pacman) pacman.draw();
    ghosts.forEach(g => g.draw());
}

function gameLoop() {
    if (!gameRunning) return;

    try {
        pacman.update(walls);
        ghosts.forEach(g => g.update(walls));

        // Collisions
        for (let i = pellets.length - 1; i >= 0; i--) {
            let p = pellets[i];
            let dx = pacman.x - p.x;
            let dy = pacman.y - p.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < pacman.radius + p.radius) {
                score += p.value;
                scoreEl.innerText = score;
                pellets.splice(i, 1);
                pelletsRemaining--;
                if (pelletsRemaining === 0) {
                    win();
                    return;
                }
            }
        }

        for (let g of ghosts) {
            let dx = pacman.x - g.x;
            let dy = pacman.y - g.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < pacman.radius + g.radius) {
                handleDeath();
                return;
            }
        }

        draw();
        gameLoopId = requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error("Game Loop Error", e);
        // Show error on screen
        const errDiv = document.createElement('div');
        errDiv.innerText = "GAME CRASH: " + e.message;
        errDiv.style.color = "red";
        errDiv.style.position = "absolute";
        errDiv.style.top = "50%";
        errDiv.style.left = "50%";
        errDiv.style.background = "black";
        document.body.appendChild(errDiv);
    }
}

function handleDeath() {
    lives--;
    livesEl.innerText = lives;
    if (lives <= 0) {
        gameOver();
    } else {
        // Reset positions
        // Find safe spor
        pacman.reset(13, 20);
        ghosts.forEach(g => g.reset());
        draw();
    }
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(gameLoopId);
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.innerText = score;
}

function win() {
    gameRunning = false;
    cancelAnimationFrame(gameLoopId);
    winScreen.classList.remove('hidden');
    winScoreEl.innerText = score;
}

function startGame() {
    score = 0;
    lives = 3;
    scoreEl.innerText = '0';
    livesEl.innerText = '3';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    winScreen.classList.add('hidden');

    init();

    // Correct spawn
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (mapLayout[r][c] === 3) {
                if (pacman) pacman.reset(c, r);
            }
        }
    }

    gameRunning = true;
    gameLoop();
}

function handleInput(e) {
    if (e.type === 'keydown') {
        if (e.code === 'Space') {
            if (!gameRunning) startGame();
            e.preventDefault();
        }
        if (!gameRunning) return;
        if (!pacman) return;

        switch (e.code) {
            case 'ArrowUp': pacman.nextDir = UP; break;
            case 'ArrowDown': pacman.nextDir = DOWN; break;
            case 'ArrowLeft': pacman.nextDir = LEFT; break;
            case 'ArrowRight': pacman.nextDir = RIGHT; break;
        }
    } else if (e.type === 'click' || e.type === 'touchstart') {
        if (!gameRunning) startGame();
    }
}

window.addEventListener('keydown', handleInput);
startScreen.addEventListener('click', handleInput);
startScreen.addEventListener('touchstart', handleInput);
gameOverScreen.addEventListener('click', handleInput);
gameOverScreen.addEventListener('touchstart', handleInput);
winScreen.addEventListener('click', handleInput);
winScreen.addEventListener('touchstart', handleInput);

window.addEventListener('load', () => {
    init();

    // Fix initial pacman position for visual before start
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (mapLayout[r][c] === 3) {
                if (pacman) pacman.reset(c, r);
            }
        }
    }

    draw();
});
