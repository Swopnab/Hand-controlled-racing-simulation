const assert = require("node:assert/strict"),
  path = require("node:path");
const { chromium } = require("playwright"),
  { serve } = require("./server.cjs");
(async () => {
  const s = await serve(path.resolve(__dirname, "..")),
    b = await chromium.launch();
  try {
    const p = await b.newPage();
    await p.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
    });
    await p.goto(s.url);
    await p.locator("#btn-play-keyboard").click();
    const actual = await p.evaluate(() => {
      enemySpawnTimer = -100000;
      coinSpawnTimer = -100000;
      const start = { mph: currentSpeedMph, speed: ROAD.speed };
      for (let i = 0; i < 60; i++) updateGame();
      const normal = {
        distance: ROAD.distance,
        speed: ROAD.speed,
        interval: enemySpawnInterval,
      };
      enemies = [
        {
          x: ROAD.lanes[0] - 16,
          y: -100,
          width: 32,
          height: 62,
          relativeSpeed: 1,
          lane: 0,
          type: "BIKE",
          color: "#fff",
        },
      ];
      for (let i = 0; i < 20; i++) updateGame();
      const low = enemies[0].y;
      currentSpeedMph = 200;
      targetSpeedMph = 200;
      for (let i = 0; i < 20; i++) updateGame();
      const high = enemies[0].y;
      enemies = [];
      const before = ROAD.distance;
      for (let i = 0; i < 60; i++) updateGame();
      return {
        start,
        normal,
        trafficLow: low + 100,
        trafficHigh: high - low,
        topDistance: ROAD.distance - before,
        max: ROAD.speed,
        hud: document.getElementById("hud-speed").textContent,
        meter: document.getElementById("speed-fill").style.width,
      };
    });
    assert.deepEqual(actual.start, { mph: 100, speed: 10 });
    assert.equal(actual.normal.distance, 600);
    assert.equal(actual.normal.interval, 60);
    assert.equal(actual.trafficLow, 200);
    assert.equal(actual.trafficHigh, 400);
    assert.equal(actual.topDistance, 1200);
    assert.equal(actual.max, 20);
    assert.equal(actual.hud, "200 mph");
    assert.equal(actual.meter, "100%");
    const lanes = await p.evaluate(() => {
      enemies = [];
      coins = [];
      for (let i = 0; i < 100; i++) spawnEnemy();
      return enemies.every(
        (e) =>
          Math.abs(e.x + e.width / 2 - CyberRoad.LANE_CENTERS[e.lane]) < 1e-9,
      );
    });
    assert(lanes, "All spawned traffic is centered in a painted driving lane");
    console.log(
      "PASS actual doubled road/traffic displacement at 100/200 mph, faster spawn cadence, speed HUD and lane-centered traffic",
    );
  } finally {
    await b.close();
    s.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
