# CyberSteer

CyberSteer is a browser-based hand-controlled racing game built with HTML, CSS, and JavaScript. The player can control a car using hand movements through a webcam or use keyboard and on-screen touch controls instead.

## Features

- Real-time hand tracking using Google MediaPipe Hands
- Webcam-based steering
- Keyboard control mode
- Touch controls for phones and tablets
- Responsive canvas in portrait, landscape, and split-screen layouts
- Three-lane highway gameplay
- Cars, SUVs, pickup trucks, and semi-trucks as obstacles
- Speed progression from 50 to 100 mph
- Collision detection and particle effects
- Score and high-score system
- High score saved using LocalStorage
- Pause, resume, restart, and quit options
- Live webcam preview
- Hand skeleton and steering zone visualization
- Retro arcade-style interface

## Technologies Used

- HTML5
- CSS3
- JavaScript ES6+
- HTML5 2D Canvas API
- Google MediaPipe Hands ML
- MediaPipe CameraUtils CDN
- Browser LocalStorage

## How Hand Control Works

MediaPipe Hands uses the webcam to detect 21 landmarks on the player's hand. CyberSteer uses landmark 9, located near the center of the palm, to determine the horizontal position of the hand.

The camera coordinates are mirrored so moving your hand right moves the car right.

The camera is divided into three steering zones:

- LEFT: below 0.38
- CENTER: 0.38 to 0.62
- RIGHT: above 0.62

Moving your hand between these zones moves the car between the three highway lanes. A small hysteresis buffer is used to prevent unwanted lane switching when the hand is close to a zone boundary.

## Controls

### Touch Mode (phones and tablets)

- Select **Play Touch**; no camera access is needed.
- Tap Left or Right to move one lane per press.
- Tap Pause, then Resume to continue.
- Rotate the device freely. Rotation pauses an active run and preserves the score.
- The game also pauses when the browser loses focus or goes into the background.

### Hand Mode

- Move hand left: Left lane
- Keep hand centered: Center lane
- Move hand right: Right lane

### Keyboard Mode

- A or Left Arrow: Move left
- D or Right Arrow: Move right
- P or Escape: Pause or resume

## Game System

The HTML5 Canvas API is used to draw and animate the road, player car, traffic, lane markings, and collision effects.

The game uses `requestAnimationFrame()` for its main animation loop and updates the game at a fixed 60 Hz so 30, 60, and 120 Hz displays keep the same gameplay speed. It has four main states: MENU, PLAYING, PAUSED, and GAMEOVER.

Traffic is generated automatically while the game is running. The player earns one point whenever an obstacle vehicle is successfully avoided.

## Speed Progression

The game starts at 50 mph and gradually increases:

`50 -> 75 -> 90 -> 100 mph`

The speed increases approximately every 15 seconds until reaching 100 mph, where it stays for the rest of the game.

## Project Structure

- `index.html` - Main page structure, game canvas, menus, and webcam elements
- `style.css` - Game interface, layout, and visual styling
- `game.js` - Main game engine, traffic, scoring, collisions, and speed
- `handControl.js` - MediaPipe hand tracking and steering system

## Running Locally

Start a local web server:

`python3 -m http.server 8080`

Then open:

`http://localhost:8080`

Allow camera access when prompted to use Hand Mode. Touch and Keyboard Mode work without camera access or MediaPipe. Hand Mode downloads the existing MediaPipe libraries only when selected. If the camera or download is unavailable, the menu keeps Touch and Keyboard available.

The project runs entirely in the browser and does not require a backend or database.

## Browser regression checks

The development-only browser checks use free Playwright; it is not a game dependency:

```sh
npm ci
npx playwright install chromium --only-shell
npm test
npm run test:browser
```

The checks cover nine phone, tablet, and desktop viewport sizes from 320x568 to 1366x900; touch steering; pause/resume; rotation and resizing; keyboard controls; collisions, scores, and restart; unavailable camera/CDN/storage; and 30/60/120 Hz game pacing. Hand steering is checked with camera/MediaPipe adapters, so physical webcam recognition and real iOS/Android devices still need a manual check.

Set `CYBERSTEER_SCREENSHOTS` to a directory outside the repository to save layout screenshots.

## Steering and performance evidence

`steering.js` separates landmark validation and lane hysteresis from the MediaPipe adapter. Invalid/incomplete landmarks are ignored. Unit fixtures cover mirroring, boundary jitter, deliberate lane changes, out-of-frame coordinates, and loss/reacquisition. They test steering logic, not recognition accuracy. CI runs these tests and the browser checks.

```sh
CYBERSTEER_BENCHMARK_OUTPUT=evaluation/render-benchmark.json node tests/render-benchmark.cjs
```

The saved benchmark measures Canvas JavaScript command submission for a paused synthetic scene with ten vehicles at three viewport sizes. It excludes GPU completion, simulation, camera inference and camera-to-control delay. Measurements near zero reflect browser timer resolution; they do not establish frame rate.

### Physical-device check protocol

1. Record device, OS, browser, viewport/orientation, camera resolution, and lighting. Run Touch, Keyboard, and Hand modes where available.
2. Play for two minutes, rotate twice, pause/resume, hide/restore the tab, and restart after collision. Confirm the HUD and touch buttons stay reachable.
3. Record frame intervals with browser developer tools; report p50/p95 and dropped frames with the device details. Use an external high-frame-rate recording to measure movement-to-visible-lane delay.
4. Repeat center-boundary movements and hand loss/reacquisition under good and dim lighting. Count unintended lane switches and recognition failures. Do not label synthetic landmark tests as webcam accuracy.

Real-device results have not been collected in this repository. No physical camera footage or personal video is included.
