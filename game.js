// Game Engine Logic for Hand-Controlled Car Dodger

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State Constants
const STATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

let gameState = STATES.MENU;

// Speed Progression (50 -> 75 -> 90 -> 100 mph max)
const SPEED_STAGES = [50, 75, 90, 100];
let currentSpeedMph = 50;
let targetSpeedMph = 50;
let speedStage = 0;
let stageTimer = 0;

// High Score management
let highScore = parseInt(localStorage.getItem('carDodgerHighScore') || '0');

// Input Settings
let controlMode = 'KEYBOARD'; // 'KEYBOARD' or 'HAND'

// Road Design (Scaled for 470x630 canvas)
const ROAD = {
    x: 75,
    width: 320,
    lanes: [128, 235, 342], // Center X of each lane
    laneWidth: 107,
    speed: 5,
    maxSpeed: 10,
    offset: 0
};

// Player Object (Slightly smaller, centered)
const player = {
    lane: 1, // Start in Center lane
    x: ROAD.lanes[1] - 16,
    targetX: ROAD.lanes[1] - 16,
    y: 510,
    width: 32,
    height: 62,
    color: '#00f2fe',
    lerpSpeed: 0.18, // Smoothness of steering
    score: 0,
    reset() {
        this.lane = 1;
        this.targetX = ROAD.lanes[1] - this.width / 2;
        this.x = this.targetX;
        this.y = 510;
        this.score = 0;
    }
};

// Enemies List
let enemies = [];
let enemySpawnTimer = 0;
let enemySpawnInterval = 120;
const minSpawnInterval = 45;

// Particle Explosions
let particles = [];

// Keyboard listener setup
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // State-independent hotkeys
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === STATES.PLAYING) {
            gameState = STATES.PAUSED;
            showUIOverlay('paused-screen');
        } else if (gameState === STATES.PAUSED) {
            gameState = STATES.PLAYING;
            hideUIOverlays();
        }
    }
    
    // Quick steering tests (Keyboard fallback)
    if (gameState === STATES.PLAYING && controlMode === 'KEYBOARD') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            steerLeft();
        }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            steerRight();
        }
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Steering logic
function steerLeft() {
    if (player.lane > 0) {
        player.lane--;
        player.targetX = ROAD.lanes[player.lane] - player.width / 2;
    }
}

function steerRight() {
    if (player.lane < 2) {
        player.lane++;
        player.targetX = ROAD.lanes[player.lane] - player.width / 2;
    }
}

// Map detected hand zone to lane selection
function handleHandSteering() {
    if (window.handControl && window.handControl.isActive && window.handControl.handDetected) {
        const zone = window.handControl.currentZone;
        let targetLane = player.lane;
        
        if (zone === 'LEFT') {
            targetLane = 0;
        } else if (zone === 'CENTER') {
            targetLane = 1;
        } else if (zone === 'RIGHT') {
            targetLane = 2;
        }

        if (targetLane !== player.lane) {
            player.lane = targetLane;
            player.targetX = ROAD.lanes[player.lane] - player.width / 2;
        }
    }
}

// Enemy Spawning and management (Cars, SUVs, Pickups, Trucks - No motorcycles)
function spawnEnemy() {
    const lane = Math.floor(Math.random() * 3);
    
    const types = ['CAR', 'SUV', 'PICKUP', 'TRUCK'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let width, height;
    if (type === 'CAR') {
        width = 32;
        height = 62;
    } else if (type === 'SUV') {
        width = 36;
        height = 68;
    } else if (type === 'PICKUP') {
        width = 36;
        height = 78;
    } else { // TRUCK
        width = 42;
        height = 105;
    }
    const x = ROAD.lanes[lane] - width / 2;
    
    // Randomize colors
    const colors = ['#ef4444', '#a855f7', '#f59e0b', '#3b82f6', '#10b981', '#ec4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const speedOffset = (type === 'TRUCK') ? -1 : ((type === 'CAR') ? 0.5 : 0);

    enemies.push({
        x: x,
        y: -height - 20,
        width: width,
        height: height,
        color: color,
        speed: ROAD.speed + speedOffset + (Math.random() * 1.5 - 0.5),
        lane: lane,
        type: type
    });
}

// Particle System for collision explosions
function createExplosion(x, y, color) {
    const count = 30;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 4 + 2,
            alpha: 1,
            decay: Math.random() * 0.03 + 0.01,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Collision helper using Axis-Aligned Bounding Box (AABB)
function checkCollision(r1, r2) {
    const padding = 3;
    return r1.x + padding < r2.x + r2.width - padding &&
           r1.x + r1.width - padding > r2.x + padding &&
           r1.y + padding < r2.y + r2.height - padding &&
           r1.y + r1.height - padding > r2.y + padding;
}

// Main Draw Functions
function drawRoad() {
    // Green grass backgrounds
    ctx.fillStyle = '#1e3a1f';
    ctx.fillRect(0, 0, ROAD.x, canvas.height);
    ctx.fillRect(ROAD.x + ROAD.width, 0, canvas.width - (ROAD.x + ROAD.width), canvas.height);

    // Asphalt
    ctx.fillStyle = '#22252a';
    ctx.fillRect(ROAD.x, 0, ROAD.width, canvas.height);

    // Shoulders (white lines)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ROAD.x - 2, 0, 4, canvas.height);
    ctx.fillRect(ROAD.x + ROAD.width - 2, 0, 4, canvas.height);

    // Animated dashed lane lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 40]);
    ctx.lineDashOffset = -ROAD.offset;

    // Left Divider
    const div1 = ROAD.x + ROAD.laneWidth;
    ctx.beginPath();
    ctx.moveTo(div1, 0);
    ctx.lineTo(div1, canvas.height);
    ctx.stroke();

    // Right Divider
    const div2 = ROAD.x + ROAD.laneWidth * 2;
    ctx.beginPath();
    ctx.moveTo(div2, 0);
    ctx.lineTo(div2, canvas.height);
    ctx.stroke();
    ctx.restore();
}

function drawPlayerCar(x, y, w, h) {
    ctx.save();
    
    // Shadows
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 242, 254, 0.45)';
    
    // Main body gradient (Cyan sports car)
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
    bodyGrad.addColorStop(0, '#00f2fe');
    bodyGrad.addColorStop(1, '#0284c7');

    // Wheels (4 corners)
    ctx.fillStyle = '#0b0f19';
    ctx.beginPath();
    ctx.roundRect(x - 3, y + 6, 4, 13, 2);
    ctx.roundRect(x + w - 1, y + 6, 4, 13, 2);
    ctx.roundRect(x - 3, y + h - 19, 4, 13, 2);
    ctx.roundRect(x + w - 1, y + h - 19, 4, 13, 2);
    ctx.fill();

    // Main Chassis
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    // Windshield (Dark glossy cockpit)
    ctx.fillStyle = '#0b1329';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 16, w - 8, h - 38, [5, 5, 2, 2]);
    ctx.fill();

    // Glare on windshield
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 19);
    ctx.lineTo(x + w - 9, y + 27);
    ctx.stroke();

    // Headlight glowing bulbs
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(x + 6, y + 2, 2.5, 0, Math.PI * 2);
    ctx.arc(x + w - 6, y + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Headlight Beams (translucent polygons)
    const beamGrad = ctx.createLinearGradient(x, y, x, y - 50);
    beamGrad.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
    beamGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');
    ctx.fillStyle = beamGrad;
    ctx.shadowBlur = 0;
    
    // Left beam
    ctx.beginPath();
    ctx.moveTo(x + 3, y);
    ctx.lineTo(x - 12, y - 50);
    ctx.lineTo(x + 16, y - 50);
    ctx.closePath();
    ctx.fill();

    // Right beam
    ctx.beginPath();
    ctx.moveTo(x + w - 3, y);
    ctx.lineTo(x + w - 16, y - 50);
    ctx.lineTo(x + w + 12, y - 50);
    ctx.closePath();
    ctx.fill();

    // Spoiler / Rear Wing
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 2, y + h - 5, w + 4, 3);
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(x - 2, y + h - 5, 2.5, 5);
    ctx.fillRect(x + w - 0.5, y + h - 5, 2.5, 5);
    
    ctx.restore();
}

function drawEnemyCar(enemy) {
    const { x, y, width, height, color, type } = enemy;
    ctx.save();
    
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';

    // Wheels for all 4-wheel vehicles
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(x - 3, y + 7, 4, 13, 2);
    ctx.roundRect(x + width - 1, y + 7, 4, 13, 2);
    ctx.roundRect(x - 3, y + height - 20, 4, 13, 2);
    ctx.roundRect(x + width - 1, y + height - 20, 4, 13, 2);
    ctx.fill();

    if (type === 'TRUCK') {
        // Truck Extra Middle Wheels
        ctx.beginPath();
        ctx.roundRect(x - 3, y + height - 42, 4, 13, 2);
        ctx.roundRect(x + width - 1, y + height - 42, 4, 13, 2);
        ctx.fill();

        // Semi Cabin
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(x, y + height - 32, width, 32, 3);
        ctx.fill();

        // Cargo Trailer
        const trailerGrad = ctx.createLinearGradient(x, y + height - 34, x, y);
        trailerGrad.addColorStop(0, color);
        trailerGrad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = trailerGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height - 36, 2);
        ctx.fill();

        // Red Tail lights
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.arc(x + 7, y + height - 2, 3, 0, Math.PI * 2);
        ctx.arc(x + width - 7, y + height - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'PICKUP') {
        // Pickup Body
        const bodyGrad = ctx.createLinearGradient(x, y + height, x, y);
        bodyGrad.addColorStop(0, color);
        bodyGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 5);
        ctx.fill();

        // Open Bed
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 4, width - 6, height - 38, 2);
        ctx.fill();

        // Cabin Windshield
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(x + 4, y + height - 32, width - 8, 24, [2, 2, 4, 4]);
        ctx.fill();

        // Tail lights
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.arc(x + 5, y + height - 2, 2.5, 0, Math.PI * 2);
        ctx.arc(x + width - 5, y + height - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'SUV') {
        // SUV Body (boxy, taller roof)
        const bodyGrad = ctx.createLinearGradient(x, y + height, x, y);
        bodyGrad.addColorStop(0, color);
        bodyGrad.addColorStop(1, '#18181b');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 6);
        ctx.fill();

        // Roof rack
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + 4, y + 10, 2, height - 24);
        ctx.fillRect(x + width - 6, y + 10, 2, height - 24);

        // Windshield
        ctx.fillStyle = '#0b1329';
        ctx.beginPath();
        ctx.roundRect(x + 4, y + height - 34, width - 8, height - 44, [2, 2, 4, 4]);
        ctx.fill();

        // Tail lights
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.arc(x + 5, y + height - 2, 2.5, 0, Math.PI * 2);
        ctx.arc(x + width - 5, y + height - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
    } else { // Standard CAR
        const bodyGrad = ctx.createLinearGradient(x, y + height, x, y);
        bodyGrad.addColorStop(0, color);
        bodyGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 6);
        ctx.fill();

        // Windshield
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(x + 4, y + height - 34, width - 8, height - 42, [2, 2, 4, 4]);
        ctx.fill();

        // Tail Lights
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.arc(x + 5, y + height - 2, 2.5, 0, Math.PI * 2);
        ctx.arc(x + width - 5, y + height - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// Update loop logic
function updateGame() {
    if (gameState !== STATES.PLAYING) return;

    // 1. Move road to simulate speed
    ROAD.offset = (ROAD.offset + ROAD.speed) % 70;

    // 2. Gradual Speed Progression (50 -> 75 -> 90 -> 100 mph max)
    if (speedStage < 3) {
        stageTimer += 1 / 60;
        if (stageTimer >= 15) {
            speedStage++;
            stageTimer = 0;
            targetSpeedMph = SPEED_STAGES[speedStage];
        }
    }

    // Smooth transition between speed levels
    currentSpeedMph += (targetSpeedMph - currentSpeedMph) * 0.015;
    if (currentSpeedMph > 100) currentSpeedMph = 100;

    // Map current mph to road speed (50 mph = 5, 100 mph = 10)
    ROAD.speed = (currentSpeedMph / 50) * 5;

    // Dynamic spawn interval based on score
    enemySpawnInterval = Math.max(minSpawnInterval, 120 - Math.floor(player.score / 5));

    // 3. Interpolate player steering
    player.x += (player.targetX - player.x) * player.lerpSpeed;

    // 4. Hand gesture steering
    if (controlMode === 'HAND') {
        handleHandSteering();
    }

    // 5. Spawn enemies
    enemySpawnTimer++;
    if (enemySpawnTimer >= enemySpawnInterval) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }

    // 6. Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.y += enemy.speed;

        // Collision Check
        if (checkCollision(player, enemy)) {
            triggerGameOver(enemy);
            return;
        }

        // Delete passed enemies, increment score
        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            player.score++;
            updateScoreHUD();
        }
    }

    // Update HUD speed continuously for smooth numbers
    updateScoreHUD();

    // Update particles
    updateParticles();
}

// Handle Game HUD rendering
function updateScoreHUD() {
    document.getElementById('hud-score').textContent = player.score;
    document.getElementById('hud-speed').textContent = Math.round(currentSpeedMph) + ' mph';
}

// End game logic
function triggerGameOver(collidedEnemy) {
    gameState = STATES.GAMEOVER;
    createExplosion(player.x + player.width / 2, player.y + player.height / 2, player.color);
    createExplosion(collidedEnemy.x + collidedEnemy.width / 2, collidedEnemy.y + collidedEnemy.height / 2, collidedEnemy.color);

    // Save High Score
    if (player.score > highScore) {
        highScore = player.score;
        localStorage.setItem('carDodgerHighScore', highScore.toString());
    }

    setTimeout(() => {
        document.getElementById('over-score').textContent = player.score;
        document.getElementById('over-highscore').textContent = highScore;
        showUIOverlay('gameover-screen');
    }, 1000);
}

// Master Render loop
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === STATES.PLAYING || gameState === STATES.PAUSED || gameState === STATES.GAMEOVER) {
        drawRoad();
        
        // Draw enemies
        enemies.forEach(drawEnemyCar);

        // Draw player (skip on gameover if exploded)
        if (gameState !== STATES.GAMEOVER || particles.length > 0) {
            drawPlayerCar(player.x, player.y, player.width, player.height);
        }

        // Draw particle explosion
        drawParticles();
    } else {
        // Draw clean road under menu for visuals
        drawRoad();
        ctx.fillStyle = 'rgba(10, 15, 26, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Master Frame loop
function frame() {
    updateGame();
    draw();
    requestAnimationFrame(frame);
}

// UI Modals triggers
function showUIOverlay(overlayId) {
    document.querySelectorAll('.menu-overlay').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(overlayId).classList.add('active');
}

function hideUIOverlays() {
    document.querySelectorAll('.menu-overlay').forEach(el => {
        el.classList.remove('active');
    });
}

// Button Events / Action Links
document.getElementById('btn-play-keyboard').addEventListener('click', async () => {
    controlMode = 'KEYBOARD';
    document.getElementById('control-mode-badge').textContent = 'Keyboard';
    document.getElementById('control-mode-badge').className = 'badge keyboard';
    
    // Optional webcam background initialization for camera feed
    const video = document.getElementById('webcam-video');
    const overlay = document.getElementById('webcam-overlay');
    if (window.handControl && video && overlay) {
        window.handControl.init(video, overlay).then(ready => {
            if (ready) window.handControl.start();
        }).catch(() => {});
    }
    
    startGame();
});

document.getElementById('btn-play-hand').addEventListener('click', async () => {
    controlMode = 'HAND';
    document.getElementById('control-mode-badge').textContent = 'Hand Mode';
    document.getElementById('control-mode-badge').className = 'badge hand';
    
    const video = document.getElementById('webcam-video');
    const overlay = document.getElementById('webcam-overlay');
    
    const ready = await window.handControl.init(video, overlay);
    if (ready) {
        window.handControl.start();
        startGame();
    } else {
        alert('Webcam hand-tracking could not start. Reverting to keyboard control.');
        controlMode = 'KEYBOARD';
        document.getElementById('control-mode-badge').textContent = 'Keyboard';
        document.getElementById('control-mode-badge').className = 'badge keyboard';
        startGame();
    }
});

document.getElementById('btn-restart').addEventListener('click', () => {
    startGame();
});

document.getElementById('btn-resume').addEventListener('click', () => {
    gameState = STATES.PLAYING;
    hideUIOverlays();
});

function quitToMenu() {
    gameState = STATES.MENU;
    if (window.handControl) {
        window.handControl.stop();
    }
    
    // Switch sidebar back to How to Play menu mode
    const sidebar = document.getElementById('control-sidebar');
    if (sidebar) sidebar.classList.remove('in-game');
    const sidebarTitle = document.getElementById('sidebar-title');
    if (sidebarTitle) sidebarTitle.textContent = 'How to Play';
    
    document.getElementById('webcam-preview-container').style.display = 'none';
    document.getElementById('control-mode-badge').textContent = 'Keyboard';
    document.getElementById('control-mode-badge').className = 'badge keyboard';
    
    enemies = [];
    particles = [];
    player.reset();
    
    showUIOverlay('start-screen');
}

document.querySelectorAll('.btn-quit-action').forEach(btn => {
    btn.addEventListener('click', quitToMenu);
});

function startGame() {
    player.reset();
    enemies = [];
    particles = [];
    enemySpawnTimer = 0;
    enemySpawnInterval = 120;
    
    currentSpeedMph = 50;
    targetSpeedMph = 50;
    speedStage = 0;
    stageTimer = 0;
    ROAD.speed = 5;
    
    // Switch right sidebar to full in-game camera mode (hide instructions)
    const sidebar = document.getElementById('control-sidebar');
    if (sidebar) sidebar.classList.add('in-game');
    const sidebarTitle = document.getElementById('sidebar-title');
    if (sidebarTitle) sidebarTitle.textContent = (controlMode === 'HAND') ? 'Hand Control' : 'Camera Feed';
    
    const webcamContainer = document.getElementById('webcam-preview-container');
    if (webcamContainer) webcamContainer.style.display = 'block';
    
    updateScoreHUD();
    hideUIOverlays();
    gameState = STATES.PLAYING;
}

// Real-time hook inside MediaPipe frame processor (Safely checking elements)
window.handControl.onFrame = () => {
    const valEl = document.getElementById('hand-pos-val');
    const zoneEl = document.getElementById('hand-zone-badge');
    const indEl = document.getElementById('hand-status-indicator');
    const statusEl = document.getElementById('hand-status-text');
    
    if (valEl) valEl.textContent = (window.handControl.rawX * 100).toFixed(0) + '%';
    if (zoneEl) zoneEl.textContent = window.handControl.currentZone;
    if (indEl && statusEl) {
        if (window.handControl.handDetected) {
            indEl.className = 'status-light detected';
            statusEl.textContent = 'Hand Tracking Active';
        } else {
            indEl.className = 'status-light lost';
            statusEl.textContent = 'Searching for Hand...';
        }
    }
};

// Fire master loop
frame();
