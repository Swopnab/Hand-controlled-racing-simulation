const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs/promises");
const { chromium } = require("playwright");
const { serve } = require("./server.cjs");
(async () => {
  const site = await serve(path.resolve(__dirname, ".."));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      hasTouch: true,
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://**/*", (r) => r.abort());
    await page.goto(site.url);
    assert.equal(await page.locator("#wallet-coins").textContent(), "0");
    await page.locator("#btn-garage").click();
    assert.equal(await page.locator(".garage-card").count(), 4);
    assert.equal(
      await page.locator('[data-vehicle="rally-car"]').isDisabled(),
      true,
    );
    await page.keyboard.press("Escape");
    const images = new Set();
    for (const route of ["mountain", "coast", "desert"]) {
      await page.locator(`[data-route="${route}"]`).click();
      await page.locator("#btn-play-touch").click();
      await page.evaluate(() => {
        gameState = STATES.PAUSED;
        enemySpawnTimer = -100000;
        coins = [300, 350, 400].map((y, i) => ({
          id: 2000 + i,
          lane: 1,
          x: ROAD.lanes[1] - 10,
          y,
          width: 20,
          height: 24,
        }));
        enemies = [
          {
            x: ROAD.lanes[0] - 16,
            y: 365,
            width: 32,
            height: 62,
            type: "BIKE",
            color: "#d35c3c",
          },
          {
            x: ROAD.lanes[2] - 21,
            y: 175,
            width: 42,
            height: 105,
            type: "TRUCK",
            color: "#b5c0c2",
          },
        ];
        draw();
      });
      images.add(
        await page.locator("#gameCanvas").evaluate((c) => c.toDataURL()),
      );
      if (process.env.CYBERSTEER_SCREENSHOTS) {
        await fs.mkdir(process.env.CYBERSTEER_SCREENSHOTS, { recursive: true });
        await page.screenshot({
          path: path.join(
            process.env.CYBERSTEER_SCREENSHOTS,
            `route-${route}-desktop.png`,
          ),
        });
      }
      await page.evaluate(() => {
        quitToMenu();
      });
    }
    assert.equal(
      images.size,
      3,
      "Each location has a distinct rendered landscape",
    );
    await page.locator("#btn-play-touch").click();
    // Real pickup collision and removal pay once; a different lane never pays.
    await page.evaluate(() => {
      enemySpawnTimer = -100000;
      enemies = [];
      coins = [
        {
          id: 1,
          lane: 1,
          x: player.x + 5,
          y: player.y,
          width: 20,
          height: 24,
          collected: false,
        },
      ];
      updateCoins();
    });
    await page.evaluate(() => {
      updateScoreHUD();
      updateCoins();
    });
    assert.equal(await page.locator("#hud-coins").textContent(), "1");
    assert.equal(await page.locator("#wallet-coins").textContent(), "1");
    await page.evaluate(() => {
      coins = [
        {
          id: 2,
          lane: 0,
          x: ROAD.lanes[0] - 10,
          y: player.y,
          width: 20,
          height: 24,
          collected: false,
        },
      ];
      updateCoins();
    });
    assert.equal(await page.locator("#wallet-coins").textContent(), "1");
    // Earn the remaining purchase balance through actual pickup collision, not by seeding storage.
    await page.evaluate(() => {
      coins = [];
      for (let i = 0; i < 39; i++)
        coins.push({
          id: 100 + i,
          lane: 1,
          x: player.x + 5,
          y: player.y,
          width: 20,
          height: 24,
          collected: false,
        });
      updateCoins();
      updateScoreHUD();
    });
    assert.equal(await page.locator("#wallet-coins").textContent(), "40");
    await page.locator("#btn-garage").click();
    assert.equal(await page.evaluate(() => gameState), "PAUSED");
    await page.locator('[data-vehicle="rally-car"]').click();
    await page
      .getByText("Rally coupe unlocked and equipped.", { exact: true })
      .waitFor();
    assert.equal(await page.locator("#garage-coins").textContent(), "0");
    assert.equal(
      await page.locator('[data-vehicle="rally-car"]').isDisabled(),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.evaluate(() => gameState),
      "PAUSED",
      "Closing the garage never resumes unexpectedly",
    );
    await page.reload();
    assert.equal(await page.locator("#wallet-coins").textContent(), "0");
    assert.equal(await page.locator("#hud-ride").textContent(), "Rally coupe");
    await page.locator("#btn-garage").click();
    await page.locator('[data-vehicle="street-bike"]').click();
    assert.equal(
      await page.locator("#garage-coins").textContent(),
      "0",
      "Re-equipping is free",
    );
    await page.locator("#btn-close-garage").click();
    await page.locator("#btn-play-touch").click();
    await page.evaluate(() => {
      enemySpawnTimer = -100000;
      enemies = [];
      coins = [
        {
          id: 900,
          lane: 1,
          x: player.x + 5,
          y: player.y,
          width: 20,
          height: 24,
          collected: false,
        },
      ];
      updateCoins();
      triggerGameOver({
        x: player.x,
        y: player.y,
        width: 32,
        height: 62,
        color: "#fff",
      });
    });
    await page.locator("#over-coins").filter({ hasText: "1" }).waitFor();
    assert.equal(await page.locator("#wallet-coins").textContent(), "1");
    await page.locator("#btn-restart").click();
    assert.equal(await page.locator("#hud-coins").textContent(), "0");
    assert.equal(
      await page.locator("#wallet-coins").textContent(),
      "1",
      "Earned coins survive a wreck/restart",
    );
    const safeRows = await page.evaluate(() => {
      coins = [];
      enemies = [];
      spawnCoins();
      for (let i = 0; i < 20; i++) {
        spawnEnemy();
        spawnCoins();
      }
      return {
        coins: coins.length,
        enemies: enemies.length,
        safe: coins.every(
          (c) =>
            !enemies.some((e) => e.lane === c.lane && e.y < 130 && c.y < 80),
        ),
      };
    });
    assert(
      safeRows.coins > 0 && safeRows.enemies > 0 && safeRows.safe,
      "New coin trails and incoming traffic cannot spawn on top of each other",
    );
    // Pause freezes coins, camera distance and simulation counters.
    await page.locator("#btn-touch-pause").click();
    const before = await page.evaluate(() =>
      JSON.stringify({ coins, distance: ROAD.distance, runCoins }),
    );
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() =>
        JSON.stringify({ coins, distance: ROAD.distance, runCoins }),
      ),
      before,
    );
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [568, 320],
      [768, 1024],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => onOrientationChange());
      await page.locator("#btn-garage").click();
      assert(await page.locator("#garage-dialog").isVisible());
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const box = await page.locator("#garage-dialog").boundingBox();
      assert(
        box.x >= 0 &&
          box.x + box.width <= width + 1 &&
          box.y >= 0 &&
          box.y + box.height <= height + 1,
      );
      if (process.env.CYBERSTEER_SCREENSHOTS)
        await page.screenshot({
          path: path.join(
            process.env.CYBERSTEER_SCREENSHOTS,
            `garage-${width}.png`,
          ),
        });
      await page.keyboard.press("Escape");
    }
    assert.deepEqual(errors, []);
    await context.close();
    // Missing storage permits play, earning multiple coins, and in-memory unlocks.
    const blocked = await browser.newContext();
    await blocked.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("Blocked");
        },
      }),
    );
    const p = await blocked.newPage();
    await p.goto(site.url);
    await p.locator("#btn-play-touch").click();
    await p.evaluate(() => {
      enemySpawnTimer = -100000;
      enemies = [];
      for (let j = 0; j < 2; j++) {
        coins = Array.from({ length: 20 }, (_, i) => ({
          id: j * 20 + i,
          lane: 1,
          x: player.x + 5,
          y: player.y,
          width: 20,
          height: 24,
          collected: false,
        }));
        updateCoins();
      }
      updateScoreHUD();
    });
    assert.equal(await p.locator("#wallet-coins").textContent(), "40");
    await p.locator("#btn-garage").click();
    await p.locator('[data-vehicle="rally-car"]').click();
    assert.equal(await p.locator("#garage-coins").textContent(), "0");
    assert.match(
      await p.locator("#progress-status").textContent(),
      /Storage unavailable/,
    );
    await blocked.close();
    console.log(
      "PASS 3 routes, real coin collision/pay-once, wallet persistence, car unlock/equip, crash/restart, garage pause, 5 garage viewports and blocked storage",
    );
  } finally {
    await browser.close();
    site.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
