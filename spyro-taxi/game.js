// 3D Spyro Taxi Game using Three.js

// --- CONFIGURATION ---
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x34495e); // Sky color

// Camera (Perspective)
// FOV, Aspect Ratio, Near, Far
const camera = new THREE.PerspectiveCamera(75, 800 / 400, 0.1, 1000);
// Position camera for a side-scroller 3D view
camera.position.set(0, 5, 10);
camera.lookAt(0, 2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(800, 400);
renderer.shadowMap.enabled = true;
// Insert renderer canvas before UI
const uiLayer = document.getElementById('ui-layer');
container.insertBefore(renderer.domElement, uiLayer);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

// --- ASSETS ---
const textureLoader = new THREE.TextureLoader();
// Use existing files (Note: these are huge, might be slow to load, but we use what we have)
const spyroTexture = textureLoader.load('spyro.png');
const taxiTexture = textureLoader.load('taxi.png');

// --- GAME OBJECTS ---

// Ground (The Road)
const roadGeometry = new THREE.PlaneGeometry(100, 20);
const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2; // Flat on ground
road.receiveShadow = true;
scene.add(road);

// Road Markings (Simple white stripes to show movement)
const stripeGeometry = new THREE.PlaneGeometry(2, 0.5);
const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const stripes = [];

for (let i = -50; i < 50; i += 10) {
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(i, 0.01, 0); // Slightly above road
    scene.add(stripe);
    stripes.push(stripe);
}

// Spyro (The Player) - Textured Box
const playerGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const playerMaterial = new THREE.MeshLambertMaterial({ map: spyroTexture, transparent: true });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(-5, 0.75, 0); // Start position
player.castShadow = true;
scene.add(player);

// Collision Box (for logic)
const playerBox = new THREE.Box3();

// Obstacles
let obstacles = [];
const obstacleGeometry = new THREE.BoxGeometry(2, 1.5, 1.5); // Taxi shape
const obstacleMaterial = new THREE.MeshLambertMaterial({ map: taxiTexture, transparent: true });

// --- GAME LOGIC ---
let frame = 0;
let score = 0;
let gameSpeed = 0.2;
let isGameOver = false;
let isPlaying = false;
let velocityY = 0;
let isJumping = false;

// Configs
const GRAVITY = -0.015;
const JUMP_FORCE = 0.4;
const GROUND_Y = 0.75; // Half height of player

// UI Elements
const scoreEl = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');

function spawnObstacle() {
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.set(20, 0.75, 0); // Spawn off-screen right
    obstacle.castShadow = true;
    scene.add(obstacle);
    // Add collision box helper
    obstacle.box = new THREE.Box3();
    obstacles.push(obstacle);
}

function updateGame() {
    if (!isPlaying || isGameOver) return;

    // Move Road Markings (Simulate speed)
    stripes.forEach(stripe => {
        stripe.position.x -= gameSpeed;
        if (stripe.position.x < -15) {
            stripe.position.x = 25; // Loop back
        }
    });

    // Player Physics (Jump)
    if (isJumping) {
        player.position.y += velocityY;
        velocityY += GRAVITY;

        if (player.position.y <= GROUND_Y) {
            player.position.y = GROUND_Y;
            isJumping = false;
            velocityY = 0;
        }
    }

    // Obstacles Logic
    // Spawn
    if (frame % 150 === 0) { // Frequency
        if (Math.random() > 0.3) {
            spawnObstacle();
        }
    }

    // Move & Collide
    playerBox.setFromObject(player); // Update player collider
    // Shrink collision box slightly to be forgiving
    playerBox.expandByScalar(-0.3);

    obstacles.forEach((obstacle, index) => {
        obstacle.position.x -= gameSpeed;
        obstacle.box.setFromObject(obstacle);
        obstacle.box.expandByScalar(-0.2); // Shrink obstacle collider too

        // Check Collision
        if (playerBox.intersectsBox(obstacle.box)) {
            gameOver();
        }

        // Remove if off screen
        if (obstacle.position.x < -15) {
            scene.remove(obstacle);
            obstacles.splice(index, 1);
            score++;
            scoreEl.innerText = 'Score: ' + score;
            // Increase speed
            if (score % 5 === 0) gameSpeed += 0.02;
        }
    });

    frame++;
}

function animate() {
    requestAnimationFrame(animate);
    updateGame();
    renderer.render(scene, camera);
}

function startGame() {
    if (isPlaying) return;

    // Reset State
    score = 0;
    frame = 0;
    gameSpeed = 0.2;
    isPlaying = true;
    isGameOver = false;
    scoreEl.innerText = 'Score: 0';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Remove old obstacles
    obstacles.forEach(o => scene.remove(o));
    obstacles = [];

    player.position.y = GROUND_Y;
    velocityY = 0;
}

function gameOver() {
    isGameOver = true;
    isPlaying = false;
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.innerText = score;
}

// Input Handling
function handleInput(e) {
    if ((e.code === 'Space' || e.code === 'ArrowUp')) {
        if (isPlaying && !isGameOver && !isJumping) {
            isJumping = true;
            velocityY = JUMP_FORCE;
        } else if (!isPlaying && !isGameOver && startScreen.classList.contains('hidden') === false) {
            startGame();
        }
    }

    if (e.code === 'Enter' && !isPlaying) {
        // Handle Game Over restart or initial start
        if (isGameOver) {
            location.reload(); // Simple reload for restart
        } else {
            startGame();
        }
    }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('click', () => {
    if (isPlaying && !isGameOver && !isJumping) {
        isJumping = true;
        velocityY = JUMP_FORCE;
    } else if (!isPlaying && !isGameOver) {
        startGame();
    }
});

// Start loop
animate();
