# CyberSteer — Open Road Arcade

A retro highway racer with a rear-view motorcycle/car camera, winding roads, three scenic locations, collectible coins and a vehicle garage. Play with touch controls, a keyboard, or webcam hand steering.

**[Play CyberSteer](https://swopnab.github.io/Hand-controlled-racing-simulation/)**

## The open road

Choose a location on the starting screen:

- **Mountain pass:** alpine peaks, pine trees and green roadside hills.
- **Coastal run:** ocean views, palms and a blue coastal sky.
- **Canyon route:** warm desert terrain, mesas and cacti.

The road, scenery and rear-view vehicles use original procedural pixel artwork in `road-renderer.js`, inspired by classic 1990s road racers. There are no copied Road Rash assets or new asset-service dependencies. Graphics are generated and cached locally; no image download is needed for the landscape or vehicles.

## Coins and the garage

Drive into gold coins to collect them. Each coin adds **one** coin to your wallet and is removed immediately. Coin trails and new traffic avoid spawning on top of each other. The HUD shows coins collected this run; the header/garage shows the saved wallet. Collected coins remain in your wallet after a wreck or restart.

Open **Garage** to unlock and equip a ride:

| Ride | Cost |
|---|---:|
| Street rider motorcycle | Free starter |
| Rally coupe | 40 coins |
| Midnight GT | 100 coins |
| Coast roadster | 180 coins |

Unlocking deducts coins once and equips the vehicle. Re-equipping an owned ride is free. These unlocks change the vehicle's appearance; all rides retain the same speed progression, steering and collision footprint. The garage explains this before purchase. Opening the garage during a run pauses it; closing the garage leaves the run paused until you explicitly resume.

Coins, owned vehicles and equipped vehicle are saved under `cybersteerProgressV1` in this browser's localStorage. Existing high scores keep their original `carDodgerHighScore` key. There are no accounts, cross-device sync, real-money purchases, payment APIs or paid services. Clearing browser data clears saved progress. If storage is blocked/full, the current tab remains playable with an explicit message that progress is temporary. This is a local arcade economy, not a server-verified competitive balance.

## Controls

### Touch

Choose **Touch**. Tap Left or Right to change one steering lane per press; the middle button pauses/resumes. Rotate freely: rotation pauses the run and preserves its state. The camera adapts to portrait and landscape while the simulation stays unchanged. The game also pauses when the tab is hidden or loses focus.

### Keyboard

- **A / Left Arrow:** steer left.
- **D / Right Arrow:** steer right.
- **P / Escape:** pause/resume.
- **Tab / Enter:** navigate and activate menu/garage controls.
- **Escape inside Garage:** close the dialog while keeping the run paused.

### Hand camera

Choose **Hand cam**, allow the webcam, and move your hand left, center or right. The small live preview shows mirrored video, landmarks and steering zones. Camera/MediaPipe access is requested only for Hand mode; Touch and Keyboard work without them. If camera access or the model download fails, other modes stay available.

The existing MediaPipe detector uses 21 landmarks, mirrored palm landmark 9, thresholds 0.38/0.62 and a 0.03 hysteresis buffer. Steering fixtures validate mirroring, boundary jitter, lane changes, malformed coordinates and tracking loss/reacquisition. They do not measure webcam-recognition accuracy.

## Game rules

Avoid motorcycles, cars, SUVs, pickups and trucks. Passing a traffic vehicle earns one score point; coin collection is counted separately. A collision ends the run and shows score, high score and collected coins. Speed progresses automatically from **50 → 75 → 90 → 100 mph**, changing approximately every 15 seconds. All locations use the same rules.

The simulation runs at a fixed 60 Hz, independent of the display refresh rate. The original 470×630 driving world handles steering, collisions and spawning; a separate perspective renderer draws it into a 960-pixel-wide canvas. Portrait mode increases the rendering height to use phone screens more effectively without stretching the actors or changing collision coordinates. Road curves are a visual projection over the existing three steering lanes.

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
- Three distinct locations, actual coin pickup collisions, wrong-lane non-pickups, earning/unlocking/equipping a car, saved progress through reload and wreck/restart, garage dialog bounds and temporary progress when storage is unavailable.

Set `CYBERSTEER_SCREENSHOTS` to a directory outside the repo to save visual-review screenshots.

```sh
CYBERSTEER_BENCHMARK_OUTPUT=evaluation/render-benchmark.json node tests/render-benchmark.cjs
```

The benchmark is a paused synthetic scene with ten vehicles at three viewport sizes. It records native rendering dimensions and Canvas JavaScript command-submission timings; it excludes GPU completion, physics and camera inference. It is not evidence of physical-device frame rate or camera-to-control latency.

## Project layout

- `index.html`, `style.css`: responsive cabinet, menus, HUD, touch controls and garage.
- `game.js`: fixed-step simulation, inputs, traffic/coin collisions, lifecycle and UI wiring.
- `road-renderer.js`: road projection and cached original scenery/vehicle artwork.
- `progression.js`: validated local wallet, unlocks and equipped-vehicle storage.
- `steering.js`, `handControl.js`: pure steering rules and MediaPipe adapter.
- `tests/`: unit, mobile/control, coin/garage and rendering checks.

`documentation.html` and `CyberSteer_Documentation.pdf` are historical documentation snapshots that predate this road/coin/garage update; this README describes the current game.

### Physical-device check protocol

Record device, OS, browser, orientation, camera resolution and lighting. Play each route for two minutes, collect coins, unlock/equip a ride, rotate twice, background/restore the tab, and restart after a collision. Check that menus, HUD, garage and controls remain reachable. Measure frame intervals with developer tools and camera-to-visible-steering delay with external high-frame-rate footage. Repeat hand boundary movements and hand loss/reacquisition in different lighting.

Automated browser emulation and landmark fixtures do not establish support or recognition accuracy on every real iOS/Android device. No physical webcam footage or personal video is committed.
