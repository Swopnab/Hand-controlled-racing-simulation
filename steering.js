// Pure steering rules shared by the browser and deterministic fixture tests.
(function (root) {
  const DEFAULT_THRESHOLDS = Object.freeze({
    leftBound: 0.38,
    rightBound: 0.62,
    hysteresis: 0.03,
  });
  function calculateZone(
    x,
    previousZone = "CENTER",
    thresholds = DEFAULT_THRESHOLDS,
  ) {
    if (!Number.isFinite(x)) return "CENTER";
    const { leftBound, rightBound, hysteresis } = thresholds;
    if (previousZone === "LEFT")
      return x > leftBound + hysteresis
        ? x > rightBound
          ? "RIGHT"
          : "CENTER"
        : "LEFT";
    if (previousZone === "RIGHT")
      return x < rightBound - hysteresis
        ? x < leftBound
          ? "LEFT"
          : "CENTER"
        : "RIGHT";
    return x < leftBound - hysteresis
      ? "LEFT"
      : x > rightBound + hysteresis
        ? "RIGHT"
        : "CENTER";
  }
  function mirroredPalm(landmarks) {
    if (
      !Array.isArray(landmarks) ||
      landmarks.length < 21 ||
      landmarks.some(
        (point) =>
          !point || !Number.isFinite(point.x) || !Number.isFinite(point.y),
      )
    )
      return null;
    const palm = landmarks[9];
    return {
      x: 1 - Math.min(1, Math.max(0, palm.x)),
      y: Math.min(1, Math.max(0, palm.y)),
    };
  }
  const api = { DEFAULT_THRESHOLDS, calculateZone, mirroredPalm };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CyberSteering = api;
})(typeof globalThis === "object" ? globalThis : this);

// Calibrated fingertip displacement: the palm can stay anywhere in the frame.
(function (root) {
  const FINGERS = Object.freeze({
    Index: { base: 5, tip: 8 },
    Middle: { base: 9, tip: 12 },
    Ring: { base: 13, tip: 16 },
    Little: { base: 17, tip: 20 },
    Thumb: { base: 1, tip: 4 },
  });
  function fingerOffset(landmarks, finger = "Index", aspect = 4 / 3) {
    if (
      !FINGERS[finger] ||
      !Number.isFinite(aspect) ||
      aspect <= 0 ||
      !Array.isArray(landmarks) ||
      landmarks.length < 21 ||
      landmarks.some(
        (p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y),
      )
    )
      return null;
    const point = (i) => ({ x: landmarks[i].x * aspect, y: landmarks[i].y });
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const palm = dist(point(0), point(9));
    if (palm < 0.025 || dist(point(5), point(17)) < 0.02) return null;
    const { base, tip } = FINGERS[finger],
      b = point(base),
      t = point(tip);
    // Allow relaxed and bent fingers; do not require a rigid straight pointing pose.
    if (dist(b, t) < palm * 0.25) return null;
    return { offset: (b.x - t.x) / palm, tip, finger };
  }
  function createFingerTracker(finger = "Index") {
    let samples = [],
      neutral = null,
      smoothed = 0,
      zone = "CENTER";
    function reset() {
      samples = [];
      neutral = null;
      smoothed = 0;
      zone = "CENTER";
    }
    function read(landmarks, aspect = 4 / 3) {
      const signal = fingerOffset(landmarks, finger, aspect);
      if (!signal) {
        if (neutral === null) samples = [];
        return {
          tracked: false,
          ready: neutral !== null,
          zone,
          progress: 0,
          finger,
          tip: FINGERS[finger]?.tip,
        };
      }
      if (neutral === null) {
        samples.push(signal.offset);
        if (Math.max(...samples) - Math.min(...samples) > 0.12)
          samples = [signal.offset];
        if (samples.length >= 5) {
          neutral = samples.reduce((a, b) => a + b, 0) / samples.length;
          smoothed = 0;
        }
        return {
          ...signal,
          tracked: true,
          ready: neutral !== null,
          zone: "CENTER",
          progress: samples.length,
        };
      }
      const delta = signal.offset - neutral;
      smoothed += (delta - smoothed) * 0.55;
      const enter = 0.18,
        exit = 0.1;
      if (zone === "LEFT")
        zone =
          smoothed > enter ? "RIGHT" : smoothed > -exit ? "CENTER" : "LEFT";
      else if (zone === "RIGHT")
        zone =
          smoothed < -enter ? "LEFT" : smoothed < exit ? "CENTER" : "RIGHT";
      else
        zone =
          smoothed < -enter ? "LEFT" : smoothed > enter ? "RIGHT" : "CENTER";
      return {
        ...signal,
        tracked: true,
        ready: true,
        zone,
        delta: smoothed,
        progress: 5,
      };
    }
    return { read, reset };
  }
  const api =
    typeof module === "object" && module.exports
      ? module.exports
      : root.CyberSteering;
  Object.assign(api, { FINGERS, fingerOffset, createFingerTracker });
})(typeof globalThis === "object" ? globalThis : this);
