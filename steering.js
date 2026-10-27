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

// Finger direction is relative to its base joint, independent of hand translation.
(function (root) {
  const fingers = [
    { name: "Index", base: 5, tip: 8 },
    { name: "Middle", base: 9, tip: 12 },
    { name: "Ring", base: 13, tip: 16 },
    { name: "Little", base: 17, tip: 20 },
    { name: "Thumb", base: 1, tip: 4 },
  ];
  function fingerDirection(
    landmarks,
    previousFinger = null,
    aspectRatio = 4 / 3,
  ) {
    if (
      !Array.isArray(landmarks) ||
      landmarks.length < 21 ||
      landmarks.some(
        (p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y),
      )
    )
      return null;
    const point = (i) => ({
      x: landmarks[i].x * aspectRatio,
      y: landmarks[i].y,
    });
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const wrist = point(0),
      palm = distance(wrist, point(9));
    if (palm < 0.025 || distance(point(5), point(17)) < 0.025) return null;
    const raised = fingers.filter((f) => {
      const base = point(f.base),
        tip = point(f.tip),
        length = distance(base, tip);
      let chain = 0;
      for (let i = f.base; i < f.tip; i++)
        chain += distance(point(i), point(i + 1));
      return (
        length > palm * 0.45 &&
        chain > 0 &&
        length / chain > 0.8 &&
        distance(tip, wrist) > distance(base, wrist) + palm * 0.12
      );
    });
    const finger = raised.find((f) => f.name === previousFinger) || raised[0];
    if (!finger) return null;
    const base = point(finger.base),
      tip = point(finger.tip),
      length = distance(base, tip);
    // Mirror camera coordinates: pointing left in the preview steers left.
    const horizontal = (base.x - tip.x) / length;
    return {
      finger: finger.name,
      base: finger.base,
      tip: finger.tip,
      x: 0.5 + horizontal * 0.5,
      y: landmarks[finger.tip].y,
    };
  }
  const api =
    typeof module === "object" && module.exports
      ? module.exports
      : root.CyberSteering;
  api.fingerDirection = fingerDirection;
})(typeof globalThis === "object" ? globalThis : this);
