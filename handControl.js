// Hand Tracking & Gesture Steering Module using MediaPipe Hands
let handLibrariesPromise;
function loadHandLibraries() {
  if (typeof Hands !== "undefined" && typeof Camera !== "undefined")
    return Promise.resolve();
  if (!handLibrariesPromise) {
    handLibrariesPromise = Promise.all(
      ["camera_utils/camera_utils.js", "hands/hands.js"].map(
        (path) =>
          new Promise((resolve, reject) => {
            const script = document.createElement("script");
            const timeout = setTimeout(() => {
              script.remove();
              reject(new Error("Hand tracking download timed out"));
            }, 10000);
            script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/" + path;
            script.crossOrigin = "anonymous";
            script.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            script.onerror = () => {
              clearTimeout(timeout);
              script.remove();
              reject(new Error("Hand tracking download failed"));
            };
            document.head.appendChild(script);
          }),
      ),
    ).catch((error) => {
      handLibrariesPromise = null;
      throw error;
    });
  }
  return handLibrariesPromise;
}

const handControl = {
  isActive: false,
  handDetected: false,
  currentZone: "CENTER", // 'LEFT', 'CENTER', 'RIGHT'
  rawX: 0.5, // Normalized finger direction; palm location does not steer
  activeFinger: "Index",
  ready: false,
  calibrationProgress: 0,
  tracker: CyberSteering.createFingerTracker("Index"),
  fingerTip: null,
  rawY: 0.5,

  // Elements
  videoElement: null,
  canvasElement: null,
  canvasCtx: null,
  hands: null,
  camera: null,
  onFrame: null,

  // Thresholds with hysteresis
  thresholds: {
    leftBound: 0.38,
    rightBound: 0.62,
    hysteresis: 0.03,
  },

  setFinger(name) {
    this.activeFinger = CyberSteering.FINGERS[name] ? name : "Index";
    this.tracker = CyberSteering.createFingerTracker(this.activeFinger);
    this.recenter();
  },
  recenter() {
    this.tracker.reset();
    this.ready = false;
    this.calibrationProgress = 0;
    this.currentZone = "CENTER";
  },

  // Initialize webcam and MediaPipe Hands
  async init(videoEl, overlayCanvasEl) {
    this.stop();
    this.videoElement = videoEl;
    this.canvasElement = overlayCanvasEl;
    this.canvasCtx = overlayCanvasEl.getContext("2d");

    try {
      await loadHandLibraries();
      this.hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      this.hands.onResults((results) => this.onResults(results));

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isActive) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 320,
        height: 240,
      });

      return true;
    } catch (err) {
      console.error("Error starting MediaPipe Hands:", err);
      return false;
    }
  },

  async start() {
    if (!this.camera) throw new Error("Camera is not initialized");
    this.isActive = true;
    try {
      await this.camera.start();
    } catch (error) {
      this.stop();
      throw error;
    }
  },

  stop() {
    this.isActive = false;
    this.handDetected = false;
    this.currentZone = "CENTER";
    this.recenter();
    this.fingerTip = null;
    if (this.camera) {
      this.camera.stop();
    }
  },

  // Process Hand Landmarks
  onResults(results) {
    const ctx = this.canvasCtx;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    ctx.clearRect(0, 0, w, h);

    // Draw camera image mirrored
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, w, h);
    ctx.restore();

    const landmarks = results.multiHandLandmarks?.[0];
    const imageWidth =
      results.image.videoWidth ||
      results.image.naturalWidth ||
      results.image.width ||
      320;
    const imageHeight =
      results.image.videoHeight ||
      results.image.naturalHeight ||
      results.image.height ||
      240;
    const direction = this.tracker.read(landmarks, imageWidth / imageHeight);
    this.handDetected = direction.tracked;
    this.ready = direction.ready;
    this.calibrationProgress = direction.progress;
    this.fingerTip = direction.tip;
    if (direction.tracked) {
      this.rawX = Math.max(0, Math.min(1, 0.5 + (direction.delta || 0)));
      this.currentZone = direction.zone;
    }
    if (this.handDetected) this.drawHandSkeleton(ctx, landmarks, w, h);
    this.drawZoneGuides(ctx, w, h);

    if (this.onFrame) {
      this.onFrame();
    }
  },

  // Calculate zone with hysteresis to prevent twitching near borders
  calculateZone(x, prevZone) {
    return CyberSteering.calculateZone(x, prevZone, this.thresholds);
  },

  // Direction feedback is independent of the hand's position on screen.
  drawZoneGuides(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.8)";
    ctx.fillRect(0, 0, w, 84);
    ctx.font = "32px CyberPixel, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#00f2fe";
    ctx.fillText(
      !this.handDetected
        ? "Show " + this.activeFinger + " finger"
        : !this.ready
          ? "Hold still " + this.calibrationProgress + "/5"
          : this.activeFinger + ": " + this.currentZone,
      w / 2,
      33,
    );
    ctx.font = "24px CyberPixel, monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      this.ready ? "Move tip left / right" : "Centering - race waits",
      w / 2,
      68,
    );
    ctx.restore();
  },

  // Draw futuristic neon cyber hand skeleton
  drawHandSkeleton(ctx, landmarks, w, h) {
    // Mirrored coordinate helper
    const getPt = (idx) => ({
      x: (1 - landmarks[idx].x) * w,
      y: landmarks[idx].y * h,
    });

    // Skeleton connections
    const connections = [
      // Palm
      [0, 1],
      [0, 5],
      [5, 9],
      [9, 13],
      [13, 17],
      [0, 17],
      // Thumb
      [1, 2],
      [2, 3],
      [3, 4],
      // Index
      [5, 6],
      [6, 7],
      [7, 8],
      // Middle
      [9, 10],
      [10, 11],
      [11, 12],
      // Ring
      [13, 14],
      [14, 15],
      [15, 16],
      // Pinky
      [17, 18],
      [18, 19],
      [19, 20],
    ];

    // Draw glowing lines
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#00f2fe";
    ctx.strokeStyle = "rgba(0, 242, 254, 0.8)";
    ctx.lineWidth = 2.5;

    connections.forEach(([i, j]) => {
      const p1 = getPt(i);
      const p2 = getPt(j);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Draw joint nodes
    ctx.fillStyle = "#ffffff";
    landmarks.forEach((_, idx) => {
      const p = getPt(idx);
      const isFingertip = idx === this.fingerTip;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isFingertip ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isFingertip ? "#00f2fe" : "#ffffff";
      ctx.fill();
    });

    // Highlight the selected fingertip instead of a palm steering target
    const centerPt = getPt(this.fingerTip ?? 8);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerPt.x, centerPt.y, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  },
};

window.handControl = handControl;

document
  .getElementById("finger-select")
  .addEventListener("change", (event) =>
    handControl.setFinger(event.target.value),
  );
document
  .getElementById("btn-center-finger")
  .addEventListener("click", () => handControl.recenter());
