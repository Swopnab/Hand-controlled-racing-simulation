# CyberSteer — Open Road Arcade

A retro highway racer with a rear-view motorcycle/car camera, wide roads with straight sections and bends, three scenic locations, collectible coins and a vehicle garage. Play with touch controls, a keyboard, or webcam hand steering.

**[Play CyberSteer](https://swopnab.github.io/Hand-controlled-racing-simulation/)**

## The open road

Choose a location on the starting screen:

- **Mountain pass:** alpine peaks, pine trees and green roadside hills.
- **Coastal run:** ocean views, palms and a blue coastal sky.
- **Canyon route:** warm desert terrain, mesas and cacti.

The road alternates long straight stretches with right and left bends, with smooth transitions. The wider carriageway has double yellow center lines, dashed passing-lane marks and roadside posts. Its bends change the perspective over the existing three steering lanes.

The entire scene is painted on a **320-pixel-wide** offscreen canvas and enlarged with nearest-neighbor sampling. Vehicles, coins and trees use original fixed-grid sprites in `pixel-art.js`; scenery uses integer scanlines and a limited color palette in `road-renderer.js`. The original synthwave `background.jpg`, gold CyberSteer title, cyan menu styling and top-down starting-screen road are preserved. The perspective scenery is used during races. Menus, buttons and the HUD use the bundled **CyberSteer Pixel** bitmap lettering. There are no external fonts, copied Road Rash assets or artwork services.

The [provided gameplay reference](https://www.youtube.com/shorts/IRDbomUym_w) informed the wider lanes, rear-view framing, straight approaches and compact dashboard. This remains CyberSteer's traffic-dodging/coin game; it does not reproduce the reference game's combat or police mechanics.

## Coins and the garage

Drive into gold coins to collect them. Each coin adds **one** coin to your wallet and is removed immediately. Coin trails and new traffic avoid spawning on top of each other. The HUD shows coins collected this run; the header/garage shows the saved wallet. Collected coins remain in your wallet after a wreck or restart.

Open **Garage** to unlock and equip a ride:

| Ride                    |         Cost |
| ----------------------- | -----------: |
| Street rider motorcycle | Free starter |
| Rally coupe             |     40 coins |
| Midnight GT             |    100 coins |
| Coast roadster          |    180 coins |

Unlocking deducts coins once and equips the vehicle. Re-equipping an owned ride is free. These unlocks change the vehicle's appearance; all rides retain the same speed progression, steering and collision footprint. The garage explains this before purchase. Opening the garage during a run pauses it; closing the garage leaves the run paused until you explicitly resume.

Coins, owned vehicles and equipped vehicle are saved under `cybersteerProgressV1` in this browser's localStorage. Existing high scores keep their original `carDodgerHighScore` key. There are no accounts, cross-device sync, real-money purchases, payment APIs or paid services. Clearing browser data clears saved progress. If storage is blocked/full, the current tab remains playable with an explicit message that progress is temporary. This is a local arcade economy, not a server-verified competitive balance.

## Controls

### Touch

Choose **Touch**. Tap Left or Right to change one steering lane per press; the middle button pauses/resumes. Rotate freely: rotation pauses the run and preserves its state. The camera adapts to portrait and landscape while the simulation stays unchanged. The game also pauses when the tab is hidden or loses focus.

### Fullscreen

Check **Full screen** in the header to enter browser fullscreen; uncheck it to leave. The checkbox follows native fullscreen exits, including the browser's Escape action. Browsers that do not allow fullscreen use a clearly labeled **Expanded view** that fills the available browser area. Uncheck it or press Escape to close that layout. Escape inside the garage closes the garage first. Fullscreen/resizing preserves the run and wallet.

### Keyboard

- **A / Left Arrow:** steer left.
- **D / Right Arrow:** steer right.
- **P / Escape:** pause/resume.
- **Tab / Enter:** navigate and activate menu/garage controls.
- **Escape inside Garage:** close the dialog while keeping the run paused.

### Hand camera

Choose **Play Hand Mode**, allow the webcam, and keep your palm comfortably still. Raise one finger and point it **left** for the left lane, **upright** for the center lane, or **right** for the right lane. Index, middle, ring, little finger or thumb can be used; the active raised finger stays selected while extended. Fold the others when switching fingers. The preview highlights the selected tip and reports its direction. Closing the hand returns to the center lane; losing tracking holds the current lane until the hand is detected again. Touch and keyboard controls are unchanged.

Direction uses the fingertip relative to its base joint, normalized by finger length with camera-aspect correction. Translating the whole hand across the camera does not change steering. Folded fingers are excluded using joint straightness, palm-relative length and wrist distance. The existing lane hysteresis reduces boundary jitter. No camera frames leave the browser; the existing MediaPipe model/libraries load on demand. If camera access or the model download fails, Touch and Keyboard remain available.

Automated landmark fixtures check translation/scale invariance, finger selection, mirroring, folded-hand recovery and lane transitions. They do not establish physical webcam-recognition accuracy for every hand, camera or lighting condition.

## Game rules

Avoid motorcycles, cars, SUVs, pickups and trucks. Passing a traffic vehicle earns one score point; coin collection is counted separately. A collision ends the run and shows score, high score and collected coins. Speed progresses automatically from **50 → 75 → 90 → 100 mph**, changing approximately every 15 seconds. All locations use the same rules.

The simulation runs at a fixed 60 Hz, independent of the display refresh rate. The original 470×630 driving world handles steering, collisions and spawning; a separate perspective renderer paints a 320-pixel-wide scene into a 960-pixel-wide display canvas. Portrait mode increases the rendering height to use phone screens more effectively without stretching the actors or changing collision coordinates. Road curves are a visual projection over the existing three steering lanes.

## Run locally

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open **http://127.0.0.1:8080**. No backend or runtime package installation is needed. Hand mode loads the existing MediaPipe libraries/model from jsDelivr when requested. The landscapes, vehicle artwork, controls and garage use local files; no web font or third-party artwork is needed.

## Development and verification

```sh
npm ci
npx playwright install chromium --only-shell
npm test
npm run test:browser
```

Playwright is free and development-only. CI runs the same unit and browser suites. Unit checks cover steering rules, world/camera projection, wallet validation, exact-price purchases, double-charge prevention, persistence and blocked/full storage. Browser checks cover:

- Nine viewport sizes from 320×568 to 1366×900, including portrait/landscape rotation.
- Touch/keyboard steering, pause, collision, restart, score persistence and background-tab pause.
- Hand adapters, unavailable CDN/camera, pointer cancellation and 30/60/120 Hz game pacing.
- Native fullscreen and external exits, unavailable/denied fullscreen fallback, responsive expanded view, local font loading and solid 3×3 canvas pixel blocks on straight/right/left sections.
- Three distinct locations, actual coin pickup collisions, wrong-lane non-pickups, earning/unlocking/equipping a car, saved progress through reload and wreck/restart, garage dialog bounds and temporary progress when storage is unavailable.

Set `CYBERSTEER_SCREENSHOTS` to a directory outside the repo to save visual-review screenshots.

```sh
CYBERSTEER_BENCHMARK_OUTPUT=evaluation/render-benchmark.json node tests/render-benchmark.cjs
```

The benchmark is a paused synthetic scene with ten vehicles at three viewport sizes. It records native rendering dimensions and Canvas JavaScript command-submission timings; it excludes GPU completion, physics and camera inference. It is not evidence of physical-device frame rate or camera-to-control latency.

## Project layout

- `index.html`, `style.css`: responsive cabinet, menus, HUD, touch controls and garage.
- `game.js`: fixed-step simulation, inputs, traffic/coin collisions, lifecycle and UI wiring.
- `road-renderer.js`: segmented course, wide road projection and integer-resolution scenery.
- `pixel-art.js`: fixed-grid vehicles, coins and roadside sprites.
- `assets/pixel-font.json`, `assets/cybersteer-pixel.ttf`: editable bitmap glyph source and bundled local font.
- `scripts/build_pixel_font.py`: optional font rebuild using free FontTools (`pip install fonttools==4.60.1`); the checked-in font requires no build to play.
- `fullscreen.js`: fullscreen checkbox, state synchronization and expanded-view fallback.
- `progression.js`: validated local wallet, unlocks and equipped-vehicle storage.
- `steering.js`, `handControl.js`: pure steering rules and MediaPipe adapter.
- `tests/`: unit, mobile/control, coin/garage and rendering checks.

`documentation.html` and `CyberSteer_Documentation.pdf` are historical documentation snapshots that predate this road/coin/garage update; this README describes the current game.

### Physical-device check protocol

Record device, OS, browser, orientation, camera resolution and lighting. Play each route for two minutes, collect coins, unlock/equip a ride, rotate twice, background/restore the tab, and restart after a collision. Check that menus, HUD, garage and controls remain reachable. Measure frame intervals with developer tools and camera-to-visible-steering delay with external high-frame-rate footage. Repeat hand boundary movements and hand loss/reacquisition in different lighting.

Automated browser emulation and landmark fixtures do not establish support or recognition accuracy on every real iOS/Android device. No physical webcam footage or personal video is committed.
