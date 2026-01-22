const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const healthFill = document.getElementById('health-fill');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const winScreen = document.getElementById('win-screen');
const finalScoreEl = document.getElementById('final-score');
const winScoreEl = document.getElementById('win-score');
const playBtn = document.getElementById('play-btn');
const restartBtn = document.getElementById('restart-btn');
const restartWinBtn = document.getElementById('restart-win-btn');

// Game State
let gameRunning = false;
let score = 0;
let frame = 0;
let lastTime = 0;

// Input State
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    Space: false
};

// Touch Input State
let touchX = null;
let touchY = null;

// Game Objects
let player;
let projectiles = [];
let enemies = [];
let particles = [];
let stars = [];
let boss = null;
let bossSpawned = false;

// Game Constants
const MOVEMENT_SPEED = 300; // pixels per second
const FIRE_RATE = 200; // ms between shots

class Star {
    constructor() {
        this.reset(true);
    }

    reset(randomY = false) {
        this.x = Math.random() * canvas.width;
        this.y = randomY ? Math.random() * canvas.height : -10;
        this.size = Math.random() * 2 + 0.5;
        this.speed = Math.random() * 2 + 0.5; // Parallax effect
        this.opacity = Math.random();
    }

    update(dt) {
        this.y += this.speed * (60 * dt); // frame-rate independent
        if (this.y > canvas.height) this.reset();
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 100;
        this.hp = 100;
        this.lastShot = 0;
    }

    update(dt) {
        // Movement
        let dx = 0;
        let dy = 0;

        if (keys.ArrowLeft || keys.a) dx = -1;
        if (keys.ArrowRight || keys.d) dx = 1;
        if (keys.ArrowUp || keys.w) dy = -1;
        if (keys.ArrowDown || keys.s) dy = 1;

        // Touch follow logic (if active)
        if (touchX !== null && touchY !== null) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;

            // Simple ease-to position
            const diffX = touchX - centerX;
            const diffY = touchY - centerY;

            if (Math.abs(diffX) > 5) dx = Math.sign(diffX);
            if (Math.abs(diffY) > 5) dy = Math.sign(diffY);
        }

        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        this.x += dx * MOVEMENT_SPEED * dt;
        this.y += dy * MOVEMENT_SPEED * dt;

        // Boundaries
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));

        // Shooting (Auto-shoot always on for simplicity or Space)
        const now = Date.now();
        if (now - this.lastShot > FIRE_RATE) {
            this.shoot();
            this.lastShot = now;
        }
    }

    shoot() {
        projectiles.push(new Projectile(this.x + this.width / 2 - 2, this.y));
    }

    draw() {
        // Simple shape for now
        ctx.fillStyle = '#00BFFF';

        // Triangle Ship
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 10);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Engine glow
        ctx.fillStyle = `rgba(255, 100, 0, ${0.5 + Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2 - 5, this.y + this.height - 5);
        ctx.lineTo(this.x + this.width / 2 + 5, this.y + this.height - 5);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height + 15 + Math.random() * 10);
        ctx.fill();
    }
}

class Projectile {
    constructor(x, y, speed = 600, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 15;
        this.speed = speed;
        this.isEnemy = isEnemy;
        this.active = true;
    }

    update(dt) {
        if (this.isEnemy) {
            this.y += this.speed * dt;
            if (this.y > canvas.height) this.active = false;
        } else {
            this.y -= this.speed * dt;
            if (this.y < -this.height) this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = this.isEnemy ? '#ff00ff' : '#FFD700'; // Enemy shots are purple
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -50;
        this.speed = 150 + Math.random() * 100;
        this.hp = 1;
        this.active = true;
        this.color = '#FF4500';
    }

    update(dt) {
        this.y += this.speed * dt;
        if (this.y > canvas.height) this.active = false;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.fill();
    }
}

function init() {
    // Resize canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create stars
    stars = [];
    for (let i = 0; i < 50; i++) {
        stars.push(new Star());
    }

    player = new Player();
    projectiles = [];
    enemies = [];
    particles = [];
    score = 0;
    frame = 0;
    boss = null;
    bossSpawned = false;
    updateUI();
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    if (player) {
        player.x = Math.min(player.x, canvas.width - player.width);
        player.y = Math.min(player.y, canvas.height - player.height);
    }
}


class Boss {
    constructor() {
        this.width = 100;
        this.height = 100;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = -120;
        this.hp = 50; // Boss HP
        this.maxHp = 50;
        this.active = true;
        this.color = '#800080'; // Purple
        this.speed = 50;
        this.dir = 1;
        this.lastShot = 0;
        this.lastMove = 0;
    }

    update(dt) {
        // Entrance
        if (this.y < 50) {
            this.y += 30 * dt;
        } else {
            // Side to side movement
            this.x += this.speed * this.dir * dt;
            if (this.x <= 0 || this.x + this.width >= canvas.width) {
                this.dir *= -1;
            }
        }

        // Shoot logic
        const now = Date.now();
        if (now - this.lastShot > 1000) { // Shoot every second
            // Boss shoots 3 projectiles
            projectiles.push(new Projectile(this.x + this.width / 2, this.y + this.height, 400, true)); // middle
            projectiles.push(new Projectile(this.x, this.y + this.height, 350, true)); // left
            projectiles.push(new Projectile(this.x + this.width, this.y + this.height, 350, true)); // right
            this.lastShot = now;
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        // Simple shape for Boss
        ctx.beginPath();
        ctx.moveTo(this.x, this.y); // Top left
        ctx.lineTo(this.x + this.width, this.y); // Top right
        ctx.lineTo(this.x + this.width / 2, this.y + this.height); // Bottom center
        ctx.fill();

        // Boss Eyes
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x + 30, this.y + 40, 10, 0, Math.PI * 2);
        ctx.arc(this.x + this.width - 30, this.y + 40, 10, 0, Math.PI * 2);
        ctx.fill();

        // Boss HP Bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 15, this.width, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y - 15, this.width * (this.hp / this.maxHp), 5);
        ctx.restore();
    }
}

// Modify Projectile to handle enemy headers (passed down from Boss)
// But Projectile class is separate. I need to update Projectile to support owner/enemy shots.

// Updating Projectile class first as Helper
// I will just overload the existing Projectile class in next step if needed, 
// for now let's use a flag in existing Projectile or create EnemyProjectile
// Actually, I can reuse Projectile but I need to modify it.

// Let's modify logic in `spawnEnemy` first
function spawnEnemy() {
    // Check for Boss Spawn
    if (score >= 500 && !bossSpawned) {
        enemies.forEach(e => e.active = false); // Clear screen
        boss = new Boss();
        enemies.push(boss); // Add boss to enemies list for drawing/updates? 
        // Better to have separate variable 'boss' to track him easily for logic
        // But for update loop, putting him in enemies array is easier if I distinguish by type.
        // Let's keep separate `boss` variable but ALSO handle update manually or put in loop.
        // Actually, let's put boss in enemies list but flag it.
        bossSpawned = true;
        return;
    }

    if (bossSpawned && boss && boss.active) return; // Don't spawn minions during boss?

    if (Math.random() < 0.02 + (score * 0.0001)) { // Increase difficulty logic
        enemies.push(new Enemy());
    }
}


function checkCollisions() {
    // Projectiles hit Enemies
    projectiles.forEach(p => {
        if (!p.active) return;

        // Check player bullets vs Enemies or Boss
        if (!p.isEnemy) {
            enemies.forEach(e => {
                if (!e.active) return;

                if (rectIntersect(p, e)) {
                    p.active = false;
                    e.hp--;

                    if (e.hp <= 0) {
                        e.active = false;
                        spawnExplosion(e.x + e.width / 2, e.y + e.height / 2);

                        // Handle Boss Death
                        if (e instanceof Boss) {
                            score += 500;
                            updateUI();
                            winGame();
                        } else {
                            score += 10;
                            updateUI();
                            if (score >= 1000) winGame();
                        }
                    }
                }
            });
        }
        // Check Enemy bullets vs Player
        else {
            if (rectIntersect(p, player)) {
                p.active = false;
                player.hp -= 10;
                updateUI();
                if (player.hp <= 0) {
                    gameOver(true); // Killed by boss projectile
                }
            }
        }
    });

    // Enemy body hit Player
    enemies.forEach(e => {
        if (!e.active) return;
        if (rectIntersect(e, player)) {

            if (e instanceof Boss) {
                player.hp = 0; // Instant death
            } else {
                e.active = false;
                player.hp -= 20;
            }

            spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, '#00BFFF');
            updateUI();

            if (player.hp <= 0) {
                gameOver(e instanceof Boss);
            }
        }
    });
}

function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
        r2.x + r2.width < r1.x ||
        r2.y > r1.y + r1.height ||
        r2.y + r2.height < r1.y);
}

function spawnExplosion(x, y, color = '#FF4500') {
    // Simple particle effect
    // To be implemented fully in polish phase
}

function updateUI() {
    scoreEl.innerText = score;
    healthFill.style.width = Math.max(0, player.hp) + '%';
    if (player.hp > 50) healthFill.style.backgroundColor = '#00ff00';
    else if (player.hp > 20) healthFill.style.backgroundColor = '#ffff00';
    else healthFill.style.backgroundColor = '#ff0000';
}

function gameLoop(timestamp) {
    if (!gameRunning) return;

    const dt = (timestamp - lastTime) / 1000 || 0;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update Stars
    stars.forEach(s => { s.update(dt); s.draw(); });

    // Spawn
    spawnEnemy();

    // Update Entities
    player.update(dt);
    projectiles.forEach(p => p.update(dt));
    enemies.forEach(e => e.update(dt));

    // Cleanup
    projectiles = projectiles.filter(p => p.active);
    enemies = enemies.filter(e => e.active);

    // Collisions
    checkCollisions();

    // Draw Entities
    enemies.forEach(e => e.draw());
    projectiles.forEach(p => p.draw());
    player.draw();

    requestAnimationFrame(gameLoop);
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    init();
    gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver(isBossDeath = false) {
    gameRunning = false;
    finalScoreEl.innerText = score;
    const title = gameOverScreen.querySelector('h1');
    if (isBossDeath) {
        title.innerText = "LOOOOOOSER";
    } else {
        title.innerText = "LOSER";
    }
    gameOverScreen.classList.remove('hidden');
}

function winGame() {
    gameRunning = false;
    winScoreEl.innerText = score;
    winScreen.classList.remove('hidden');
}

// Event Listeners
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// Touch Controls
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
});
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touch = e.touches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
});
canvas.addEventListener('touchend', e => {
    e.preventDefault();
    touchX = null;
    touchY = null;
});

playBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
if (restartWinBtn) restartWinBtn.addEventListener('click', startGame);

// Initial Load
resizeCanvas();
for (let i = 0; i < 50; i++) stars.push(new Star());  // Draw static stars for bg
stars.forEach(s => s.draw());
player = new Player(); // Show player for title screen
player.draw();
