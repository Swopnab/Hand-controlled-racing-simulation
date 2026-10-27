// CyberSteer: fixed-step driving world, projected through the scenic arcade camera.

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const renderer = CyberRoad.createRenderer();
let routeId = "mountain";
let storage;
try {
  storage = window.localStorage;
} catch (_) {}
const progress = CyberProgress.createStore(storage);
let activeRide = CyberProgress.VEHICLES.find(
  (v) => v.id === progress.snapshot().equipped,
);
let runCoins = 0,
  coins = [],
  coinSpawnTimer = 0,
  coinId = 0;

// Game State Constants
const STATES = {
  MENU: "MENU",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  GAMEOVER: "GAMEOVER",
};

let gameState = STATES.MENU;

// Speed Progression (50 -> 75 -> 90 -> 100 mph max)
const SPEED_STAGES = [50, 75, 90, 100];
let currentSpeedMph = 50;
let targetSpeedMph = 50;
let speedStage = 0;
let stageTimer = 0;

// High Score management
let highScore = 0;
try {
  highScore =
    parseInt(localStorage.getItem("carDodgerHighScore") || "0", 10) || 0;
} catch (_) {
  /* Play still works when browser storage is unavailable. */
}

// Input Settings
let controlMode = "KEYBOARD"; // 'KEYBOARD', 'HAND' or 'TOUCH'
let gameOverTimer;
const touchControls = document.getElementById("touch-controls");

// Road Design (Scaled for 470x630 canvas)
const ROAD = {
  x: 75,
  width: 320,
  lanes: [128, 235, 342], // Center X of each lane
  laneWidth: 107,
  speed: 5,
  maxSpeed: 10,
  offset: 0,
  distance: 0,
};

// Player Object (Slightly smaller, centered)
const player = {
  lane: 1, // Start in Center lane
  x: ROAD.lanes[1] - 16,
  targetX: ROAD.lanes[1] - 16,
  y: 510,
  width: 32,
  height: 62,
  color: "#00f2fe",
  lerpSpeed: 0.18, // Smoothness of steering
  score: 0,
  reset() {
    this.lane = 1;
    this.targetX = ROAD.lanes[1] - this.width / 2;
    this.x = this.targetX;
    this.y = 510;
    this.score = 0;
  },
};

// Enemies List
let enemies = [];
let enemySpawnTimer = 0;
let enemySpawnInterval = 120;
const minSpawnInterval = 45;

// Particle Explosions
let particles = [];

// Keyboard and touch share the existing one-lane steering actions.
window.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return;
  const drivingKey = [
    "ArrowLeft",
    "ArrowRight",
    "KeyA",
    "KeyD",
    "KeyP",
    "Escape",
  ].includes(e.code);
  if (
    !drivingKey ||
    (gameState !== STATES.PLAYING && gameState !== STATES.PAUSED)
  )
    return;
  e.preventDefault();
  if (e.code === "KeyP" || e.code === "Escape") {
    if (!e.repeat) togglePause();
  } else if (gameState === STATES.PLAYING && controlMode !== "HAND") {
    if (e.code === "ArrowLeft" || e.code === "KeyA") steerLeft();
    if (e.code === "ArrowRight" || e.code === "KeyD") steerRight();
  }
});

function pauseGame() {
  if (gameState !== STATES.PLAYING) return;
  gameState = STATES.PAUSED;
  showUIOverlay("paused-screen");
  resetTouchInput();
  syncTouchControls();
}

function resumeGame() {
  if (gameState !== STATES.PAUSED) return;
  gameState = STATES.PLAYING;
  hideUIOverlays();
  syncTouchControls();
}

function togglePause() {
  if (gameState === STATES.PLAYING) pauseGame();
  else resumeGame();
}

function resetTouchInput() {
  touchControls
    .querySelectorAll("button")
    .forEach((button) => button.classList.remove("pressed"));
}

function syncTouchControls() {
  touchControls.hidden =
    gameState === STATES.MENU || gameState === STATES.GAMEOVER;
  document.getElementById("btn-steer-left").disabled =
    gameState !== STATES.PLAYING;
  document.getElementById("btn-steer-right").disabled =
    gameState !== STATES.PLAYING;
  document.getElementById("btn-touch-pause").textContent =
    gameState === STATES.PAUSED ? "Resume" : "Pause";
}

for (const [id, steer] of [
  ["btn-steer-left", steerLeft],
  ["btn-steer-right", steerRight],
]) {
  const button = document.getElementById(id);
  button.addEventListener("pointerdown", (e) => {
    if (
      e.button !== 0 ||
      gameState !== STATES.PLAYING ||
      controlMode === "HAND"
    )
      return;
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    button.classList.add("pressed");
    steer();
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(event, () => button.classList.remove("pressed"));
  }
  // Keyboard/assistive activation produces a click without a pointer press.
  button.addEventListener("click", (e) => {
    if (
      e.detail === 0 &&
      gameState === STATES.PLAYING &&
      controlMode !== "HAND"
    )
      steer();
  });
  button.addEventListener("contextmenu", (e) => e.preventDefault());
}
document
  .getElementById("btn-touch-pause")
  .addEventListener("click", togglePause);
window.addEventListener("blur", pauseGame);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseGame();
});

// Browser chrome, split-screen and rotation change display size, never physics coordinates.
function resizeLayout() {
  const app = document.getElementById("app-container");
  const padding = getComputedStyle(app);
  const viewport = window.visualViewport;
  const width = Math.min(
    viewport ? viewport.width : innerWidth,
    document.documentElement.clientWidth || innerWidth,
  );
  const height = viewport ? viewport.height : innerHeight;
  const horizontalPadding =
    parseFloat(padding.paddingLeft) + parseFloat(padding.paddingRight);
  const verticalPadding =
    parseFloat(padding.paddingTop) + parseFloat(padding.paddingBottom);
  const sideways = matchMedia(
    "(max-height: 500px) and (orientation: landscape)",
  ).matches;
  const headerHeight = document
    .querySelector(".masthead")
    .getBoundingClientRect().height;
  const footerHeight = sideways ? 0 : 24;
  const hudHeight = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--hud-height"),
  );
  const availableWidth =
    Math.min(1232, width - horizontalPadding) - (sideways ? 116 : 0);
  const availableHeight =
    height -
    verticalPadding -
    headerHeight -
    footerHeight -
    hudHeight -
    (sideways ? 18 : 102);
  const renderHeight =
    !sideways && width <= 600
      ? Math.round(
          Math.min(
            1050,
            Math.max(
              600,
              (Math.max(100, availableHeight) * 960) / availableWidth,
            ),
          ),
        )
      : 600;
  CyberRoad.VIEW.height = renderHeight;
  CyberRoad.VIEW.horizon = Math.round(renderHeight * 0.31);
  if (canvas.height !== renderHeight) canvas.height = renderHeight;
  const gameWidth = Math.max(
    1,
    Math.min(
      availableWidth,
      (Math.max(100, availableHeight) * 960) / renderHeight,
    ),
  );
  document.documentElement.style.setProperty("--game-width", gameWidth + "px");
  document.documentElement.style.setProperty(
    "--game-height",
    (gameWidth * renderHeight) / 960 + "px",
  );
  document.documentElement.style.setProperty(
    "--play-width",
    gameWidth + (sideways ? 116 : 0) + "px",
  );
}
window.addEventListener("resize", resizeLayout);
window.visualViewport?.addEventListener("resize", resizeLayout);
const onOrientationChange = () => {
  pauseGame();
  resizeLayout();
};
if (window.screen.orientation?.addEventListener) {
  window.screen.orientation.addEventListener("change", onOrientationChange);
} else {
  window.addEventListener("orientationchange", onOrientationChange);
}
resizeLayout();

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
  if (
    window.handControl &&
    window.handControl.isActive &&
    window.handControl.handDetected
  ) {
    const zone = window.handControl.currentZone;
    let targetLane = player.lane;

    if (zone === "LEFT") {
      targetLane = 0;
    } else if (zone === "CENTER") {
      targetLane = 1;
    } else if (zone === "RIGHT") {
      targetLane = 2;
    }

    if (targetLane !== player.lane) {
      player.lane = targetLane;
      player.targetX = ROAD.lanes[player.lane] - player.width / 2;
    }
  }
}

// Traffic vehicles and rival riders share the existing obstacle physics.
function spawnEnemy() {
  const freeLanes = [0, 1, 2].filter(
    (lane) => !coins.some((coin) => coin.lane === lane && coin.y < 80),
  );
  if (!freeLanes.length) return;
  const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];

  const types = ["BIKE", "CAR", "SUV", "PICKUP", "TRUCK"];
  const type = types[Math.floor(Math.random() * types.length)];

  let width, height;
  if (type === "CAR" || type === "BIKE") {
    width = 32;
    height = 62;
  } else if (type === "SUV") {
    width = 36;
    height = 68;
  } else if (type === "PICKUP") {
    width = 36;
    height = 78;
  } else {
    // TRUCK
    width = 42;
    height = 105;
  }
  const x = ROAD.lanes[lane] - width / 2;

  // Randomize colors
  const colors = [
    "#ef4444",
    "#a855f7",
    "#f59e0b",
    "#3b82f6",
    "#10b981",
    "#ec4899",
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const speedOffset = type === "TRUCK" ? -1 : type === "CAR" ? 0.5 : 0;

  enemies.push({
    x: x,
    y: -height - 20,
    width: width,
    height: height,
    color: color,
    speed: ROAD.speed + speedOffset + (Math.random() * 1.5 - 0.5),
    lane: lane,
    type: type,
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
      color: color,
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

// Collision helper using Axis-Aligned Bounding Box (AABB)
function checkCollision(r1, r2) {
  const padding = 3;
  return (
    r1.x + padding < r2.x + r2.width - padding &&
    r1.x + r1.width - padding > r2.x + padding &&
    r1.y + padding < r2.y + r2.height - padding &&
    r1.y + r1.height - padding > r2.y + padding
  );
}

// Original procedural artwork is cached in the scene renderer.
function drawRoad() {
  renderer.drawRoad(ctx, routeId, ROAD.distance);
}
function drawPlayerCar() {
  const lean =
    activeRide.kind === "BIKE"
      ? Math.max(-0.2, Math.min(0.2, (player.targetX - player.x) * 0.007))
      : 0;
  renderer.vehicle(
    ctx,
    { ...player, color: activeRide.color, type: activeRide.kind },
    ROAD.distance,
    lean,
  );
}
function drawEnemyCar(enemy) {
  renderer.vehicle(ctx, enemy, ROAD.distance);
}

function spawnCoins() {
  const lanes = [0, 1, 2].filter(
    (lane) => !enemies.some((enemy) => enemy.lane === lane && enemy.y < 130),
  );
  if (!lanes.length) return;
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  for (let i = 0; i < 3; i++)
    coins.push({
      id: ++coinId,
      lane,
      x: ROAD.lanes[lane] - 10,
      y: -30 - i * 42,
      width: 20,
      height: 24,
      collected: false,
    });
}
function updateCoins() {
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.y += ROAD.speed;
    if (!coin.collected && checkCollision(player, coin)) {
      coin.collected = true;
      runCoins++;
      progress.award(1);
      coins.splice(i, 1);
      updateProgressHUD();
    } else if (coin.y > CyberRoad.WORLD.height) coins.splice(i, 1);
  }
}
// Update loop logic
function updateGame() {
  if (gameState !== STATES.PLAYING) return;

  // 1. Move road to simulate speed
  ROAD.offset = (ROAD.offset + ROAD.speed) % 70;
  ROAD.distance += ROAD.speed;

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
  enemySpawnInterval = Math.max(
    minSpawnInterval,
    120 - Math.floor(player.score / 5),
  );

  // 3. Interpolate player steering
  player.x += (player.targetX - player.x) * player.lerpSpeed;

  // 4. Hand gesture steering
  if (controlMode === "HAND") {
    handleHandSteering();
  }

  coinSpawnTimer++;
  if (coinSpawnTimer >= 90) {
    spawnCoins();
    coinSpawnTimer = 0;
  }
  updateCoins();

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
    if (enemy.y > CyberRoad.WORLD.height) {
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
  document.getElementById("hud-score").textContent = player.score;
  document.getElementById("hud-speed").textContent =
    Math.round(currentSpeedMph) + " mph";
  document.getElementById("speed-fill").style.width = currentSpeedMph + "%";
  document.getElementById("hud-coins").textContent = runCoins;
}

// End game logic
function triggerGameOver(collidedEnemy) {
  gameState = STATES.GAMEOVER;
  resetTouchInput();
  syncTouchControls();
  createExplosion(
    player.x + player.width / 2,
    player.y + player.height / 2,
    player.color,
  );
  createExplosion(
    collidedEnemy.x + collidedEnemy.width / 2,
    collidedEnemy.y + collidedEnemy.height / 2,
    collidedEnemy.color,
  );

  // Save High Score
  if (player.score > highScore) {
    highScore = player.score;
    try {
      localStorage.setItem("carDodgerHighScore", highScore.toString());
    } catch (_) {
      /* Keep the score in memory when storage is blocked. */
    }
  }

  gameOverTimer = setTimeout(() => {
    document.getElementById("over-score").textContent = player.score;
    document.getElementById("over-highscore").textContent = highScore;
    document.getElementById("over-coins").textContent = runCoins;
    showUIOverlay("gameover-screen");
  }, 1000);
}

// Master Render loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();
  if (gameState === STATES.MENU) {
    renderer.vehicle(
      ctx,
      {
        ...player,
        x: ROAD.lanes[0] - 16,
        type: activeRide.kind,
        color: activeRide.color,
      },
      ROAD.distance,
    );
    renderer.vehicle(
      ctx,
      {
        x: ROAD.lanes[1] - 18,
        y: 220,
        width: 36,
        height: 68,
        type: "SUV",
        color: "#d6c7b8",
      },
      ROAD.distance,
    );
    renderer.vehicle(
      ctx,
      {
        x: ROAD.lanes[0] - 16,
        y: 60,
        width: 32,
        height: 62,
        type: "BIKE",
        color: "#6c6da8",
      },
      ROAD.distance,
    );
    return;
  }
  const actors = [
    ...enemies.map((entity) => ({ entity, kind: "vehicle" })),
    ...coins.map((entity) => ({ entity, kind: "coin" })),
  ];
  if (gameState !== STATES.GAMEOVER)
    actors.push({ entity: player, kind: "player" });
  actors.sort(
    (a, b) => a.entity.y + a.entity.height - (b.entity.y + b.entity.height),
  );
  for (const actor of actors) {
    if (actor.kind === "player") drawPlayerCar();
    else if (actor.kind === "coin")
      renderer.coin(ctx, actor.entity, ROAD.distance);
    else drawEnemyCar(actor.entity);
  }
  renderer.particles(ctx, particles, ROAD.distance);
}

// Fixed 60 Hz updates preserve desktop pacing on 30/60/120 Hz devices.
let lastFrameTime;
let frameAccumulator = 0;
function frame(timestamp) {
  const elapsed =
    lastFrameTime === undefined ? 0 : Math.min(50, timestamp - lastFrameTime);
  lastFrameTime = timestamp;
  if (gameState === STATES.PLAYING) {
    frameAccumulator += elapsed;
    while (frameAccumulator >= 1000 / 60) {
      updateGame();
      frameAccumulator -= 1000 / 60;
    }
  } else {
    if (gameState === STATES.GAMEOVER) {
      frameAccumulator += elapsed;
      while (frameAccumulator >= 1000 / 60) {
        updateParticles();
        frameAccumulator -= 1000 / 60;
      }
    } else frameAccumulator = 0;
  }
  draw();
  requestAnimationFrame(frame);
}

// UI Modals triggers
function showUIOverlay(overlayId) {
  document.querySelectorAll(".menu-overlay").forEach((el) => {
    el.classList.remove("active");
  });
  document.getElementById(overlayId).classList.add("active");
}

function hideUIOverlays() {
  document.querySelectorAll(".menu-overlay").forEach((el) => {
    el.classList.remove("active");
  });
}

// Camera access is requested only for Hand Mode.
function setControlMode(mode) {
  controlMode = mode;
  document.body.dataset.mode = mode;
  const badge = document.getElementById("control-mode-badge");
  badge.textContent =
    mode === "HAND" ? "Hand Mode" : mode === "TOUCH" ? "Touch" : "Keyboard";
  badge.className = "badge " + mode.toLowerCase();
}

function playWithoutCamera(mode) {
  window.handControl?.stop();
  setControlMode(mode);
  startGame();
}
document
  .getElementById("btn-play-touch")
  .addEventListener("click", () => playWithoutCamera("TOUCH"));
document
  .getElementById("btn-play-keyboard")
  .addEventListener("click", () => playWithoutCamera("KEYBOARD"));

document.getElementById("btn-play-hand").addEventListener("click", async () => {
  const modeButtons = document.querySelectorAll("#start-screen button");
  const status = document.getElementById("camera-status");
  modeButtons.forEach((button) => {
    button.disabled = true;
  });
  status.hidden = false;
  status.textContent = "Starting camera…";
  try {
    const ready = await window.handControl.init(
      document.getElementById("webcam-video"),
      document.getElementById("webcam-overlay"),
    );
    if (!ready) throw new Error("Hand tracking is unavailable");
    await window.handControl.start();
    setControlMode("HAND");
    status.hidden = true;
    startGame();
  } catch (_) {
    window.handControl?.stop();
    status.textContent =
      "Camera unavailable. Choose Play Touch or Play Keyboard.";
  } finally {
    modeButtons.forEach((button) => {
      button.disabled = false;
    });
  }
});

document.getElementById("btn-restart").addEventListener("click", () => {
  startGame();
});

document.getElementById("btn-resume").addEventListener("click", resumeGame);

function quitToMenu() {
  clearTimeout(gameOverTimer);
  gameState = STATES.MENU;
  resetTouchInput();
  syncTouchControls();
  if (window.handControl) {
    window.handControl.stop();
  }

  // Switch sidebar back to How to Play menu mode
  const sidebar = document.getElementById("control-sidebar");
  if (sidebar) sidebar.classList.remove("in-game");
  const sidebarTitle = document.getElementById("sidebar-title");
  if (sidebarTitle) sidebarTitle.textContent = "How to Play";

  document.getElementById("webcam-preview-container").style.display = "none";
  document.getElementById("control-mode-badge").textContent = "Keyboard";
  document.getElementById("control-mode-badge").className = "badge keyboard";

  enemies = [];
  coins = [];
  particles = [];
  player.reset();
  runCoins = 0;
  updateScoreHUD();
  updateProgressHUD();

  document.getElementById("camera-status").hidden = true;
  showUIOverlay("start-screen");
}

document.querySelectorAll(".btn-quit-action").forEach((btn) => {
  btn.addEventListener("click", quitToMenu);
});

function startGame() {
  clearTimeout(gameOverTimer);
  frameAccumulator = 0;
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
  ROAD.distance = 0;
  ROAD.offset = 0;
  coins = [];
  runCoins = 0;
  coinSpawnTimer = 0;
  updateProgressHUD();

  // Show the camera preview in Hand Mode and the controls guide otherwise.
  const sidebar = document.getElementById("control-sidebar");
  if (sidebar) sidebar.classList.add("in-game");
  const sidebarTitle = document.getElementById("sidebar-title");
  if (sidebarTitle)
    sidebarTitle.textContent =
      controlMode === "HAND" ? "Hand Control" : "Driving Controls";

  const webcamContainer = document.getElementById("webcam-preview-container");
  if (webcamContainer)
    webcamContainer.style.display = controlMode === "HAND" ? "block" : "none";

  updateScoreHUD();
  hideUIOverlays();
  gameState = STATES.PLAYING;
  syncTouchControls();
}

// Real-time hook inside MediaPipe frame processor (Safely checking elements)
window.handControl.onFrame = () => {
  const valEl = document.getElementById("hand-pos-val");
  const zoneEl = document.getElementById("hand-zone-badge");
  const indEl = document.getElementById("hand-status-indicator");
  const statusEl = document.getElementById("hand-status-text");

  if (valEl)
    valEl.textContent = (window.handControl.rawX * 100).toFixed(0) + "%";
  if (zoneEl) zoneEl.textContent = window.handControl.currentZone;
  if (indEl && statusEl) {
    if (window.handControl.handDetected) {
      indEl.className = "status-light detected";
      statusEl.textContent = "Hand Tracking Active";
    } else {
      indEl.className = "status-light lost";
      statusEl.textContent = "Searching for Hand...";
    }
  }
};

// Persistent wallet and vehicle garage. Storage failure keeps this tab playable.
function updateProgressHUD() {
  const saved = progress.snapshot();
  activeRide = CyberProgress.VEHICLES.find((v) => v.id === saved.equipped);
  player.color = activeRide.color;
  document.getElementById("wallet-coins").textContent = saved.coins;
  document.getElementById("garage-coins").textContent = saved.coins;
  document.getElementById("hud-ride").textContent = activeRide.name;
  document.getElementById("progress-status").textContent = saved.persistent
    ? "Coins & rides saved on this device."
    : "Storage unavailable. Progress lasts in this tab.";
}
function renderGarage() {
  const saved = progress.refresh();
  document.getElementById("garage-vehicles").innerHTML =
    CyberProgress.VEHICLES.map((v) => {
      const owned = saved.owned.includes(v.id),
        selected = saved.equipped === v.id;
      return `<article class="garage-card${selected ? " selected" : ""}"><h3>${v.name}</h3><canvas width="150" height="90" class="vehicle-preview" data-preview="${v.id}" aria-label="${v.name} preview"></canvas><p>${v.description}</p><button class="cyber-btn ${selected ? "secondary" : "primary"}" data-vehicle="${v.id}" ${selected || (!owned && saved.coins < v.cost) ? "disabled" : ""}>${selected ? "Equipped" : owned ? "Equip ride" : "Unlock · " + v.cost + " coins"}</button></article>`;
    }).join("");
  document.querySelectorAll("[data-preview]").forEach((c) =>
    renderer.preview(
      c,
      CyberProgress.VEHICLES.find((v) => v.id === c.dataset.preview),
    ),
  );
  updateProgressHUD();
}
document.getElementById("btn-garage").addEventListener("click", () => {
  pauseGame();
  document.getElementById("garage-message").textContent = "";
  renderGarage();
  document.getElementById("garage-dialog").showModal();
});
document
  .getElementById("btn-close-garage")
  .addEventListener("click", () =>
    document.getElementById("garage-dialog").close(),
  );
document
  .getElementById("garage-vehicles")
  .addEventListener("click", (event) => {
    const button = event.target.closest("[data-vehicle]");
    if (!button || button.disabled) return;
    const ride = CyberProgress.VEHICLES.find(
      (v) => v.id === button.dataset.vehicle,
    );
    try {
      const owned = progress.snapshot().owned.includes(ride.id);
      if (owned) progress.equip(ride.id);
      else progress.purchase(ride.id);
      renderGarage();
      document.getElementById("garage-message").textContent =
        ride.name + (owned ? " equipped." : " unlocked and equipped.");
      document.getElementById("btn-close-garage").focus();
    } catch (error) {
      document.getElementById("garage-message").textContent = error.message;
    }
  });
window.addEventListener("storage", (event) => {
  if (event.key === CyberProgress.KEY) {
    progress.refresh();
    updateProgressHUD();
    if (document.getElementById("garage-dialog").open) renderGarage();
  }
});
document.querySelectorAll("[data-route]").forEach((button) =>
  button.addEventListener("click", () => {
    if (gameState !== STATES.MENU || !CyberRoad.ROUTES[button.dataset.route])
      return;
    routeId = button.dataset.route;
    document.querySelectorAll("[data-route]").forEach((choice) => {
      choice.classList.toggle("active", choice === button);
      choice.setAttribute("aria-pressed", String(choice === button));
    });
    document.getElementById("route-caption").textContent =
      CyberRoad.ROUTES[routeId].name.toUpperCase();
    document.getElementById("hud-route").textContent =
      CyberRoad.ROUTES[routeId].name;
  }),
);
updateProgressHUD();

// Fire master loop
requestAnimationFrame(frame);
