const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game Constants
const GRAVITY = 0.8;
const FRICTION = 0.8;
const MOVE_SPEED = 0.5; // Acceleration
const MAX_SPEED = 5;
const JUMP_FORCE = 14;
const TILE_SIZE = 32;

// Assets
const marioImg = new Image();
marioImg.src = 'assets/mario.png';
const tilesImg = new Image();
tilesImg.src = 'assets/tiles.png';
const enemyImg = new Image();
enemyImg.src = 'assets/enemy.png';
const flagImg = new Image(); // Placeholder, will reuse tiles or simple rect if no asset
// Actually, let's just make a simple colored rect for now if we can't gen another image quickly, or use tile.
// Better: Create a procedural flag pole in draw or add to Tile class.
// We'll treat Flag as a special Tile type.

// Input Handling
const keys = {
    right: false,
    left: false,
    up: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
});

class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
    }

    follow(target) {
        // Center the target
        this.x = target.x - this.width / 2 + target.width / 2;

        // Clamp to level bounds (0 start)
        if (this.x < 0) this.x = 0;
        // logic for max width would go here if we had level width
    }
}

class Entity {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.velX = 0;
        this.velY = 0;
        this.dead = false;
    }

    draw(ctx, camera) {
        // Override
    }

    update() {
        // Override
    }
}

class Player extends Entity {
    constructor() {
        super(100, 100, TILE_SIZE, TILE_SIZE);
        this.grounded = false;
        this.facingRight = true;
        this.frame = 0;
        this.animTimer = 0;
        this.state = 'idle';
        this.invulnerable = false;
    }

    update(mapEntities) {
        // Movement Physics
        if (keys.right) {
            this.velX += MOVE_SPEED;
            this.facingRight = true;
            this.state = 'run';
        } else if (keys.left) {
            this.velX -= MOVE_SPEED;
            this.facingRight = false;
            this.state = 'run';
        } else {
            this.velX *= FRICTION;
            if (Math.abs(this.velX) < 0.1) this.state = 'idle';
        }

        // Clamp speed
        if (this.velX > MAX_SPEED) this.velX = MAX_SPEED;
        if (this.velX < -MAX_SPEED) this.velX = -MAX_SPEED;

        // Jump
        if (keys.up && this.grounded) {
            this.velY = -JUMP_FORCE;
            this.grounded = false;
            this.state = 'jump';
        }

        this.velY += GRAVITY;

        // Resolve X Collision
        this.x += this.velX;
        this.checkCollision(mapEntities, 'x');

        // Resolve Y Collision
        this.y += this.velY;
        this.grounded = false; // Assume falling until collision proves otherwise
        this.checkCollision(mapEntities, 'y');

        if (this.y > canvas.height + 200) {
            game.handleDeath();
        }

        // Animation
        if (!this.grounded) this.state = 'jump';

        this.animTimer++;
        if (Math.abs(this.velX) > 0.1) {
            if (this.animTimer > 10 - Math.abs(this.velX)) { // Speed up anim with speed
                this.frame = (this.frame + 1) % 3;
                this.animTimer = 0;
            }
        } else {
            this.frame = 0;
        }
    }

    checkCollision(entities, axis) {
        for (let e of entities) {
            if (e instanceof Tile) {
                if (
                    this.x < e.x + e.width &&
                    this.x + this.width > e.x &&
                    this.y < e.y + e.height &&
                    this.y + this.height > e.y
                ) {
                    if (axis === 'x') {
                        if (this.velX > 0) this.x = e.x - this.width;
                        else if (this.velX < 0) this.x = e.x + e.width;
                        this.velX = 0;
                    } else {
                        if (this.velY > 0) { // Falling
                            this.y = e.y - this.height;
                            this.grounded = true;
                            this.velY = 0;
                        } else if (this.velY < 0) { // Hitting head
                            this.y = e.y + e.height;
                            this.velY = 0;
                            if (e.type === 'question' || e.type === 'brick') {
                                // Trigger block bump animation or logic here
                            }
                        }
                    }
                    if (e.type === 'flag_pole') {
                        game.completeLevel();
                    }
                }
            }
        }
    }

    draw(ctx, camera) {
        const sSize = 32;
        let sx = 0;
        let sy = 0;

        if (this.state === 'idle') {
            sx = 0;
            sy = 0;
        } else if (this.state === 'run') {
            sx = (this.frame + 1) * sSize;
            sy = 0;
        } else if (this.state === 'jump') {
            sx = 0;
            sy = sSize;
        }

        const renderX = Math.floor(this.x - camera.x);
        const renderY = Math.floor(this.y - camera.y);

        ctx.save();
        if (!this.facingRight) {
            ctx.scale(-1, 1);
            // When flipping, we need to adjust the x position logic
            ctx.drawImage(marioImg, sx, sy, sSize, sSize, -renderX - this.width, renderY, this.width, this.height);
        } else {
            ctx.drawImage(marioImg, sx, sy, sSize, sSize, renderX, renderY, this.width, this.height);
        }
        ctx.restore();
    }
}

class Tile extends Entity {
    constructor(x, y, type) {
        super(x, y, TILE_SIZE, TILE_SIZE);
        this.type = type;
    }

    draw(ctx, camera) {
        let sx = 0;
        const sSize = 32;

        if (this.type === 'brick') sx = 0;
        if (this.type === 'question') sx = sSize;
        if (this.type === 'ground') sx = sSize * 2;
        if (this.type === 'pipe_top_left') sx = 0; // Placeholder logic

        // Simple culling
        if (this.x - camera.x < -TILE_SIZE || this.x - camera.x > canvas.width) return;

        if (this.type === 'flag_pole') {
            ctx.fillStyle = 'green'; // Pole
            ctx.fillRect(Math.floor(this.x - camera.x) + 12, Math.floor(this.y - camera.y), 8, TILE_SIZE);
            if (this.y % 64 === 0) { // Top of pole logic visually... rough
                ctx.fillStyle = 'red'; // Flag
                ctx.beginPath();
                ctx.moveTo(Math.floor(this.x - camera.x) + 20, Math.floor(this.y - camera.y));
                ctx.lineTo(Math.floor(this.x - camera.x) + 50, Math.floor(this.y - camera.y) + 10);
                ctx.lineTo(Math.floor(this.x - camera.x) + 20, Math.floor(this.y - camera.y) + 20);
                ctx.fill();
            }
            return;
        }

        ctx.drawImage(tilesImg, sx, 0, sSize, sSize, Math.floor(this.x - camera.x), Math.floor(this.y - camera.y), TILE_SIZE, TILE_SIZE);
    }
}

class Enemy extends Entity {
    constructor(x, y) {
        super(x, y, TILE_SIZE, TILE_SIZE);
        this.velX = -1; // Move left initially
        this.frame = 0;
        this.animTimer = 0;
    }

    update(mapEntities) {
        if (this.dead) return;

        this.velY += GRAVITY;
        this.x += this.velX;

        // X Collision (Turn around on walls)
        for (let e of mapEntities) {
            if (e instanceof Tile) {
                if (this.checkAABB(e)) {
                    if (this.velX > 0) {
                        this.x = e.x - this.width;
                        this.velX = -1;
                    } else {
                        this.x = e.x + e.width;
                        this.velX = 1;
                    }
                }
            }
        }

        this.y += this.velY;
        // Y Collision
        for (let e of mapEntities) {
            if (e instanceof Tile) {
                if (this.checkAABB(e)) {
                    if (this.velY > 0) {
                        this.y = e.y - this.height;
                        this.velY = 0;
                    }
                }
            }
        }

        // Animation
        this.animTimer++;
        if (this.animTimer > 15) {
            this.frame = (this.frame + 1) % 2;
            this.animTimer = 0;
        }
    }

    checkAABB(other) {
        return (
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }

    draw(ctx, camera) {
        if (this.dead) return; // Or draw flattened

        // Culling
        if (this.x - camera.x < -TILE_SIZE || this.x - camera.x > canvas.width) return;

        const sSize = 32;
        let sx = this.frame * sSize;
        let sy = 0; // Row 1

        ctx.drawImage(enemyImg, sx, sy, sSize, sSize, Math.floor(this.x - camera.x), Math.floor(this.y - camera.y), TILE_SIZE, TILE_SIZE);
    }
}

class Game {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.currentLevelIdx = 1;
        this.gameOver = false;
        this.levelUnlocking = false;
        this.resetLevel();
    }

    resetLevel() {
        this.player = new Player();
        this.camera = new Camera(canvas.width, canvas.height);
        this.entities = [];
        this.generateLevel(this.currentLevelIdx);
        this.gameOver = false;
        this.levelUnlocking = false;
    }

    handleDeath() {
        if (this.player.dead || this.levelUnlocking) return;
        this.player.dead = true;
        this.lives--;
        if (this.lives > 0) {
            setTimeout(() => {
                this.resetLevel();
            }, 1000);
        } else {
            this.gameOver = true;
        }
    }

    completeLevel() {
        if (this.levelUnlocking) return;
        this.levelUnlocking = true;
        this.score += 1000; // Level finish bonus

        setTimeout(() => {
            if (this.currentLevelIdx < 2) {
                this.currentLevelIdx++;
                this.resetLevel();
            } else {
                // Game Win!
                alert("YOU WIN THE GAME!");
                this.currentLevelIdx = 1;
                this.score = 0;
                this.lives = 3;
                this.resetLevel();
            }
        }, 2000);
    }

    generateLevel(levelNum) {
        if (levelNum === 1) this.generateLevel1();
        if (levelNum === 2) this.generateLevel2();
    }

    generateLevel1() {
        // Floor - Extended to 200 tiles
        for (let i = 0; i < 200; i++) {
            // Gaps
            if ((i > 20 && i < 23) || (i > 50 && i < 55) || (i > 100 && i < 105)) continue;

            this.entities.push(new Tile(i * TILE_SIZE, canvas.height - TILE_SIZE, 'ground'));
            this.entities.push(new Tile(i * TILE_SIZE, canvas.height - TILE_SIZE * 2, 'ground')); // Double thick for aesthetics
        }

        // Structures
        this.addPlatform(10, 5, 3, 'brick');
        this.entities.push(new Tile(14 * TILE_SIZE, canvas.height - 5 * TILE_SIZE, 'question'));
        this.addPlatform(20, 7, 5, 'brick'); // High platform

        // Pipe-like structures (using bricks/pipes if available)
        this.entities.push(new Tile(28 * TILE_SIZE, canvas.height - 3 * TILE_SIZE, 'pipe_top_left')); // Placeholder visual
        this.entities.push(new Tile(28 * TILE_SIZE, canvas.height - 4 * TILE_SIZE, 'pipe_top_left'));

        this.addPlatform(35, 5, 2, 'question');
        this.addPlatform(40, 9, 8, 'brick');

        this.addPlatform(60, 4, 3, 'brick');
        this.entities.push(new Tile(65 * TILE_SIZE, canvas.height - 8 * TILE_SIZE, 'question'));

        this.addPlatform(80, 6, 10, 'brick');

        // Final stairs
        for (let j = 0; j < 8; j++) {
            this.addPlatform(130 + j, 3 + j, 1, 'brick');
        }

        // Flag Pole at End (approx tile 190)
        for (let j = 0; j < 10; j++) {
            this.entities.push(new Tile(190 * TILE_SIZE, canvas.height - (3 + j) * TILE_SIZE, 'flag_pole'));
        }
        this.entities.push(new Tile(190 * TILE_SIZE, canvas.height - 3 * TILE_SIZE, 'brick')); // Base

        // Enemies
        this.entities.push(new Enemy(400, 300));
        this.entities.push(new Enemy(800, 300)); // Near first gap
        this.entities.push(new Enemy(1200, 300));
        this.entities.push(new Enemy(1500, 300)); // On platform section
        this.entities.push(new Enemy(2000, 300));
        this.entities.push(new Enemy(2500, 300));
        this.entities.push(new Enemy(3000, 300));
    }

    generateLevel2() {
        // Harder Level
        // Floor
        for (let i = 0; i < 250; i++) {
            // More Gaps
            if (i > 10 && i < 15) continue;
            if (i > 30 && i < 35) continue;
            if (i > 60 && i < 70) continue; // Large gap
            if (i > 120 && i < 130) continue;

            this.entities.push(new Tile(i * TILE_SIZE, canvas.height - TILE_SIZE, 'ground'));
        }

        this.addPlatform(62, 5, 3, 'brick'); // Help crossing large gap

        // Lots of enemies
        for (let i = 0; i < 15; i++) {
            this.entities.push(new Enemy((400 + i * 400), 300));
        }

        // Flag Pole index 240
        for (let j = 0; j < 10; j++) {
            this.entities.push(new Tile(240 * TILE_SIZE, canvas.height - (3 + j) * TILE_SIZE, 'flag_pole'));
        }
        this.entities.push(new Tile(240 * TILE_SIZE, canvas.height - 3 * TILE_SIZE, 'brick'));
    }

    addPlatform(xTiles, yTilesFromBottom, width, type) {
        for (let i = 0; i < width; i++) {
            this.entities.push(new Tile((xTiles + i) * TILE_SIZE, canvas.height - yTilesFromBottom * TILE_SIZE, type));
        }
    }

    update() {
        if (this.gameOver) return;

        this.player.update(this.entities);
        this.camera.follow(this.player);

        // Update Enemies
        for (let i = this.entities.length - 1; i >= 0; i--) {
            let e = this.entities[i];
            if (e instanceof Enemy) {
                e.update(this.entities);

                // Player vs Enemy
                if (!e.dead && !this.player.dead && this.player.checkCollisionWithEntity(e)) {
                    // Check stomp
                    if (this.player.velY > 0 && this.player.y < e.y + e.height / 2) {
                        e.dead = true;
                        this.player.velY = -8; // Bounce
                        this.score += 100;
                        // Remove enemy? Or keep dead body
                        // this.entities.splice(i, 1);
                    } else {
                        this.handleDeath();
                    }
                }
            }
        }
    }

    draw() {
        // Clear with Sky Blue
        ctx.fillStyle = '#5c94fc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.entities.forEach(e => e.draw(ctx, this.camera));
        this.player.draw(ctx, this.camera);

        // UI
        this.drawUI();
    }

    drawUI() {
        ctx.fillStyle = 'white';
        ctx.font = '20px "Press Start 2P"'; // using CSS font
        ctx.fillText(`SCORE: ${this.score.toString().padStart(6, '0')}`, 20, 40);
        ctx.fillText(`LIVES: ${this.lives}`, 20, 70);
        ctx.fillText(`LEVEL: ${this.currentLevelIdx}`, 20, 100);

        if (this.levelUnlocking) {
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText("LEVEL COMPLETE!", canvas.width / 2, canvas.height / 2);
            ctx.textAlign = 'left';
        }

        if (this.gameOver) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
            ctx.fillText(`FINAL SCORE: ${this.score}`, canvas.width / 2, canvas.height / 2 + 40);
            ctx.fillText("Press F5 to Restart", canvas.width / 2, canvas.height / 2 + 80);
            ctx.textAlign = 'left';
        }
    }
}

// Helper for collision with non-tiles
Player.prototype.checkCollisionWithEntity = function (other) {
    return (
        this.x < other.x + other.width &&
        this.x + this.width > other.x &&
        this.y < other.y + other.height &&
        this.y + this.height > other.y
    );
};

let game = new Game();

// function resetGame() {
//    game = new Game();
// }

function gameLoop() {
    game.update();
    game.draw();
    requestAnimationFrame(gameLoop);
}

// Wait for images
let loadedCount = 0;
const totalImages = 3;
function checkLoad() {
    loadedCount++;
    if (loadedCount >= 2) { // Allow starting without enemy image if it fails? No, wait for all.
        if (loadedCount === totalImages) gameLoop();
    }
}

marioImg.onload = checkLoad;
tilesImg.onload = checkLoad;
enemyImg.onload = checkLoad;
// Fallback if one image fails to load?
setTimeout(() => {
    if (loadedCount < totalImages) {
        console.warn("Some images didn't load, starting anyway");
        gameLoop();
    }
}, 3000);
