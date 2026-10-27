const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");
const { serve } = require("./server.cjs");
async function wait(page, condition) {
  await page.waitForFunction(condition, null, { polling: 50 });
}
(async () => {
  const site = await serve(path.resolve(__dirname, ".."));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    await context.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(site.url);
    await page.evaluate(() => document.fonts.ready);
    assert(
      await page.evaluate(() => document.fonts.check("16px CyberPixel")),
      "Local pixel font loads",
    );
    await page.locator("#btn-play-keyboard").click();
    await page.evaluate(() => {
      player.score = 12;
      player.lane = 2;
      updateScoreHUD();
    });
    await page.locator("#fullscreen-toggle").check();
    await wait(page, () => document.fullscreenElement?.id === "app-container");
    assert(await page.locator("#fullscreen-toggle").isChecked());
    assert.equal(await page.evaluate(() => player.score), 12);
    assert.equal(await page.evaluate(() => player.lane), 2);
    await page.locator("#btn-garage").click();
    assert(
      await page.locator("#garage-dialog").isVisible(),
      "Garage remains accessible within fullscreen",
    );
    await page.locator("#btn-close-garage").click();
    assert(await page.locator("#fullscreen-toggle").isChecked());
    // Native Escape exits use the same fullscreenchange path, including browser UI exits.
    await page.evaluate(() => document.exitFullscreen());
    await wait(
      page,
      () =>
        !document.fullscreenElement &&
        !document.querySelector("#fullscreen-toggle").checked,
    );
    await page.locator("#fullscreen-toggle").check();
    await wait(page, () => !!document.fullscreenElement);
    await page.locator("#fullscreen-toggle").uncheck();
    await wait(page, () => !document.fullscreenElement);
    // Every displayed canvas pixel is an integer 3x3 source block, including actors.
    for (const distance of [0, 3600, 9000]) {
      const pixelResult = await page.evaluate((distance) => {
        ROAD.distance = distance;
        draw();
        const { width, height } = canvas,
          data = ctx.getImageData(0, 0, width, height).data;
        for (let y = 0; y < height; y += 3)
          for (let x = 0; x < width; x += 3) {
            const first = (y * width + x) * 4;
            for (let dy = 0; dy < 3; dy++)
              for (let dx = 0; dx < 3; dx++)
                for (let c = 0; c < 4; c++)
                  if (
                    data[first + c] !==
                    data[((y + dy) * width + x + dx) * 4 + c]
                  )
                    return false;
          }
        return true;
      }, distance);
      assert(
        pixelResult,
        "Canvas retains solid pixel blocks on straights and bends",
      );
      if (process.env.CYBERSTEER_SCREENSHOTS) {
        await fs.mkdir(process.env.CYBERSTEER_SCREENSHOTS, { recursive: true });
        await page.screenshot({
          path: path.join(
            process.env.CYBERSTEER_SCREENSHOTS,
            `pixel-course-${distance}.png`,
          ),
        });
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
    for (const support of ["missing", "denied"]) {
      const fallback = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      await fallback.addInitScript((support) => {
        window.requestAnimationFrame = () => 0;
        Element.prototype.requestFullscreen =
          support === "missing"
            ? undefined
            : () => Promise.reject(new Error("Denied"));
        Element.prototype.webkitRequestFullscreen = undefined;
      }, support);
      const p = await fallback.newPage();
      await p.goto(site.url);
      await p.locator("#btn-play-touch").tap();
      await p.locator("#btn-touch-pause").tap();
      await p.locator("#fullscreen-toggle").check();
      await wait(p, () =>
        document.querySelector("#app-container").classList.contains("expanded"),
      );
      assert.equal(
        await p.locator("#fullscreen-label").textContent(),
        "Expanded view",
      );
      for (const [width, height] of [
        [390, 844],
        [844, 390],
        [768, 1024],
      ]) {
        await p.setViewportSize({ width, height });
        await p.evaluate(() => resizeLayout());
        for (const selector of [
          "#gameCanvas",
          "#fullscreen-toggle",
          "#touch-controls",
        ]) {
          const b = await p.locator(selector).boundingBox();
          assert(
            b &&
              b.x >= 0 &&
              b.y >= 0 &&
              b.x + b.width <= width + 1 &&
              b.y + b.height <= height + 1,
            `${support} fallback ${selector} fits ${width}x${height}`,
          );
        }
      }
      await p.locator("#btn-garage").click();
      await p.keyboard.press("Escape");
      assert(
        await p.locator("#fullscreen-toggle").isChecked(),
        "Garage Escape does not exit expanded view",
      );
      await p.keyboard.press("Escape");
      assert.equal(await p.locator("#fullscreen-toggle").isChecked(), false);
      assert.equal(
        await p.evaluate(() => gameState),
        "PAUSED",
        "Exiting expanded view never resumes a paused run",
      );
      await p.locator("#fullscreen-toggle").check();
      await p.locator("#fullscreen-toggle").uncheck();
      assert.equal(
        await p
          .locator("#app-container")
          .evaluate((e) => e.classList.contains("expanded")),
        false,
      );
      await fallback.close();
    }
    console.log(
      "PASS local pixel font, integer pixel rendering, native fullscreen/exit sync, unsupported/denied fullscreen fallback and responsive expanded view",
    );
  } finally {
    await browser.close();
    site.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
