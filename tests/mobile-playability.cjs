// Development-only checks: npm install --no-save playwright && npx playwright install chromium
// Run: node tests/mobile-playability.cjs (no runtime dependencies are added to the game).
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const screenshotDir = process.env.CYBERSTEER_SCREENSHOTS;
const server = http.createServer(async (req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
    try {
        const target = file === root ? path.join(root, 'index.html') : file;
        const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg' };
        res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
        res.end(await fs.readFile(target));
    } catch { res.writeHead(404).end(); }
});
const sizes = [[320,568], [360,640], [390,844], [412,915], [568,320], [844,390], [768,1024], [1024,768], [1366,900]];
async function state(page) { return page.evaluate(() => ({ state: gameState, mode: controlMode, lane: player.lane, score: player.score })); }
async function fits(page, selector, width, height) {
    const box = await page.locator(selector).boundingBox();
    assert(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1,
        `${selector} must fit ${width}x${height}: ${JSON.stringify(box)}`);
}
async function screenshot(page, name) {
    if (!screenshotDir) return;
    await fs.mkdir(screenshotDir, {recursive:true});
    await page.screenshot({path:path.join(screenshotDir, name + '.png')});
}
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({headless:true});
    try {
        for (const [width,height] of sizes) {
            const context = await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width < 1000});
            const page = await context.newPage();
            const errors = [];
            const cameraRequests = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('request', request => { if (request.url().includes('mediapipe')) cameraRequests.push(request.url()); });
            // Verify touch/keyboard still work with the hand-tracking CDN offline.
            await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
            await page.goto(url);
            await page.evaluate(() => document.fonts.ready);
            await fits(page, '#gameCanvas', width, height);
            for (const id of ['btn-play-touch','btn-play-hand','btn-play-keyboard']) {
                await page.locator('#'+id).scrollIntoViewIfNeeded();
                await fits(page, '#'+id, width, height);
            }
            await screenshot(page, `${width}x${height}-menu`);
            await page.locator('#btn-play-touch').tap();
            assert.equal((await state(page)).mode, 'TOUCH');
            // Disable random spawns only while exercising UI to avoid nondeterministic collisions.
            await page.evaluate(() => { enemySpawnTimer = -100000; });
            await fits(page, '#gameCanvas', width, height);
            for (const id of ['btn-steer-left','btn-steer-right','btn-touch-pause']) {
                await fits(page, '#'+id, width, height);
                const box = await page.locator('#'+id).boundingBox();
                assert(box.width >= 44 && box.height >= 44, 'Touch targets are at least 44px');
            }
            await page.locator('#btn-steer-left').tap();
            assert.equal((await state(page)).lane, 0);
            await page.locator('#btn-steer-left').tap();
            assert.equal((await state(page)).lane, 0, 'Cannot steer beyond left lane');
            await page.locator('#btn-steer-right').tap();
            assert.equal((await state(page)).lane, 1, 'One tap moves exactly one lane');
            await page.locator('#btn-steer-right').tap();
            await page.locator('#btn-steer-right').tap();
            assert.equal((await state(page)).lane, 2);
            assert.equal(await page.locator('.pressed').count(), 0, 'Touch release clears visual state');
            await page.locator('#btn-touch-pause').tap();
            assert.equal((await state(page)).state, 'PAUSED');
            const pausedRoad = await page.evaluate(() => ROAD.offset);
            await page.waitForTimeout(80);
            assert.equal(await page.evaluate(() => ROAD.offset), pausedRoad);
            await screenshot(page, `${width}x${height}-paused`);
            await page.locator('#btn-resume').tap();
            await page.locator('#btn-touch-pause').tap();
            await page.locator('#btn-touch-pause').tap();
            assert.equal((await state(page)).state, 'PLAYING');
            await screenshot(page, `${width}x${height}-playing`);
            // Resize preserves the world and score; orientation additionally pauses it.
            await page.evaluate(() => { player.score = 7; updateScoreHUD(); });
            await page.setViewportSize({width:height,height:width});
            await page.evaluate(() => onOrientationChange());
            assert.equal((await state(page)).state, 'PAUSED');
            assert.equal((await state(page)).score, 7);
            assert.equal((await state(page)).lane, 2);
            await fits(page, '#gameCanvas', height, width);
            await fits(page, '#touch-controls', height, width);
            assert.deepEqual(await page.evaluate(() => [CyberRoad.WORLD.width,CyberRoad.WORLD.height]), [470,630]);
            await page.locator('#btn-resume').tap();
            await page.evaluate(() => window.dispatchEvent(new Event('blur')));
            assert.equal((await state(page)).state, 'PAUSED');
            await page.locator('#btn-pause-quit').tap();
            assert.equal((await state(page)).state, 'MENU');
            await page.locator('#btn-play-keyboard').click();
            await page.evaluate(() => { enemySpawnTimer = -100000; });
            await page.keyboard.press('ArrowLeft');
            assert.equal((await state(page)).lane, 0);
            await page.keyboard.press('KeyD');
            assert.equal((await state(page)).lane, 1);
            await page.keyboard.press('KeyP');
            assert.equal((await state(page)).state, 'PAUSED');
            await page.keyboard.press('Escape');
            assert.equal((await state(page)).state, 'PLAYING');
            assert.equal(cameraRequests.length, 0, 'Touch and keyboard never load camera dependencies');
            // Exercise real collision, game over, restart and persistent score.
            await page.evaluate(() => {
                player.score = 11;
                enemies = [{x:player.x,y:player.y,width:32,height:62,color:'#ef4444',speed:0,type:'CAR'}];
                updateGame();
            });
            assert.equal((await state(page)).state, 'GAMEOVER');
            await page.locator('#btn-restart').waitFor({state:'visible'});
            await page.locator('#btn-restart').click();
            assert.equal((await state(page)).state, 'PLAYING');
            assert.equal((await state(page)).score, 0);
            assert.equal(await page.evaluate(() => localStorage.getItem('carDodgerHighScore')), '11');
            assert.deepEqual(errors, []);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
            await context.close();
            console.log(`PASS touch, menus, layout, rotation, keyboard, collision/restart: ${width}x${height}`);
        }
        const page = await browser.newPage({viewport:{width:1366,height:900}});
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
        await page.goto(url);
        await page.locator('#btn-play-hand').click();
        await page.locator('#camera-status').filter({hasText:'Camera unavailable'}).waitFor();
        assert.equal((await state(page)).state, 'MENU', 'Unavailable tracking keeps playable mode choices');
        // Exercise desktop Hand Mode with MediaPipe/camera adapters, without requesting a physical camera.
        await page.evaluate(() => {
            window.Hands = class { setOptions() {} onResults(callback) { this.callback = callback; } async send() {} };
            window.Camera = class { async start() {} stop() {} };
        });
        await page.locator('#btn-play-hand').click();
        assert.equal((await state(page)).mode, 'HAND');
        assert.equal(await page.evaluate(() => handControl.isActive), true);
        await page.evaluate(() => {
            enemySpawnTimer = -100000;
            const landmarks = Array.from({length:21}, () => ({x:0.9,y:0.5}));
            handControl.onResults({image:canvas,multiHandLandmarks:[landmarks]});
            handleHandSteering();
        });
        assert.equal((await state(page)).lane, 0);
        await page.evaluate(() => { handControl.currentZone='RIGHT'; handleHandSteering(); });
        assert.equal((await state(page)).lane, 2);
        await fits(page, '#webcam-preview-container', 1366, 900);
        await screenshot(page, 'desktop-hand');
        await page.keyboard.press('Escape');
        await page.locator('#btn-pause-quit').click();
        assert.equal(await page.evaluate(() => handControl.isActive), false);
        await page.evaluate(() => { window.Camera = class { async start() {throw new Error('Permission denied');} stop() {} }; });
        await page.locator('#btn-play-hand').click();
        await page.locator('#camera-status').filter({hasText:'Camera unavailable'}).waitFor();
        assert.equal((await state(page)).state, 'MENU');
        await page.locator('#btn-play-touch').click();
        assert.equal((await state(page)).state, 'PLAYING');
        // Cancelled pointers and loss of visibility do not leave active input.
        const leftButton = await page.locator('#btn-steer-left').boundingBox();
        await page.mouse.move(leftButton.x + 10, leftButton.y + 10);
        await page.mouse.down();
        assert.equal(await page.locator('.pressed').count(), 1);
        await page.locator('#btn-steer-left').dispatchEvent('pointercancel', {pointerId:1});
        assert.equal(await page.locator('.pressed').count(), 0);
        await page.mouse.move(0, 0);
        await page.mouse.up();
        // Simulate browser/device safe-area padding and a shrinking browser viewport.
        await page.setViewportSize({width:390,height:600});
        await page.evaluate(() => {
            document.getElementById('app-container').style.padding = '44px 12px 34px';
            resizeLayout();
        });
        await fits(page, '#gameCanvas', 390, 600);
        await fits(page, '#touch-controls', 390, 600);
        await page.evaluate(() => {
            Object.defineProperty(document, 'hidden', {configurable:true,get:()=>true});
            document.dispatchEvent(new Event('visibilitychange'));
        });
        assert.equal((await state(page)).state, 'PAUSED');
        assert.deepEqual(errors, []);
        console.log('PASS desktop hand adapter, CDN/permission failures, pointer cancellation, background pause');
        await page.close();
        // Drive the same elapsed time at different display refresh rates.
        for (const fps of [30,60,120]) {
            const timingPage = await browser.newPage();
            await timingPage.addInitScript(() => { window.requestAnimationFrame = callback => {window.nextFrame=callback;}; });
            await timingPage.goto(url);
            const timer = await timingPage.evaluate(fps => {
                setControlMode('TOUCH'); startGame(); enemySpawnTimer = -100000;
                for (let i=0; i<=fps*10; i++) nextFrame(i*1000/fps);
                return stageTimer;
            },fps);
            assert(Math.abs(timer-10) < 0.02, `${fps} Hz must preserve 10 seconds of game progression: ${timer}`);
            await timingPage.close();
        }
        console.log('PASS consistent game pacing at 30/60/120 Hz');
        const storagePage = await browser.newPage();
        await storagePage.addInitScript(() => {
            Object.defineProperty(window,'localStorage',{get:()=>{throw new Error('Storage blocked');}});
        });
        await storagePage.goto(url);
        await storagePage.locator('#btn-play-touch').click();
        await storagePage.evaluate(() => {player.score=1;triggerGameOver({x:0,y:0,width:32,height:62,color:'#fff'});});
        assert.equal((await state(storagePage)).state, 'GAMEOVER');
        await storagePage.close();
        console.log('PASS play and game over with blocked browser storage');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
