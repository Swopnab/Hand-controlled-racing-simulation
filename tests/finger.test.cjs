const test = require("node:test"),
  assert = require("node:assert/strict");
const { fingerOffset, createFingerTracker } = require("../steering.js");
const { hand } = require("./fixtures/finger.cjs");
function center(tracker, pose) {
  let state;
  for (let i = 0; i < 5; i++) state = tracker.read(pose);
  assert(state.ready);
  return state;
}
function settle(tracker, pose) {
  let state;
  for (let i = 0; i < 6; i++) state = tracker.read(pose);
  return state;
}
function wiggle(pose, finger, dx) {
  const p = structuredClone(pose),
    tip = { Index: 8, Middle: 12, Ring: 16, Little: 20, Thumb: 4 }[finger];
  p[tip].x += dx;
  return p;
}
test("every selected finger steers with small tip movements and a stationary palm", () => {
  for (const finger of ["Index", "Middle", "Ring", "Little", "Thumb"]) {
    const tracker = createFingerTracker(finger),
      pose = hand(finger, "CENTER");
    center(tracker, pose);
    assert.equal(settle(tracker, wiggle(pose, finger, 0.06)).zone, "LEFT");
    assert.equal(settle(tracker, pose).zone, "CENTER");
    assert.equal(settle(tracker, wiggle(pose, finger, -0.06)).zone, "RIGHT");
  }
});
test("relaxed bent fingers rejected by the old straightness filter can calibrate and steer", () => {
  const pose = hand();
  pose[6] = { x: 0.35, y: 0.4 };
  pose[7] = { x: 0.5, y: 0.4 };
  pose[8] = { x: 0.45, y: 0.43 };
  const tracker = createFingerTracker();
  center(tracker, pose);
  assert.equal(settle(tracker, wiggle(pose, "Index", 0.06)).zone, "LEFT");
  assert.equal(settle(tracker, wiggle(pose, "Index", -0.06)).zone, "RIGHT");
});
test("translation and scale do not steer, and an unselected finger cannot take over", () => {
  const tracker = createFingerTracker(),
    pose = hand();
  center(tracker, pose);
  for (const dx of [-0.2, 0.2])
    for (const scale of [0.6, 1.2])
      assert.equal(
        settle(tracker, hand("Index", "CENTER", dx, -0.05, scale)).zone,
        "CENTER",
      );
  const raised = hand("Middle", "RIGHT");
  for (let i = 9; i <= 12; i++) pose[i] = raised[i];
  assert.equal(settle(tracker, pose).zone, "CENTER");
});
test("unstable calibration waits, reset establishes a new neutral, and jitter stays centered", () => {
  const tracker = createFingerTracker(),
    pose = hand();
  for (let i = 0; i < 12; i++)
    assert.equal(
      tracker.read(wiggle(pose, "Index", i % 2 ? 0.08 : -0.08)).ready,
      false,
    );
  center(tracker, pose);
  for (let i = 0; i < 30; i++)
    assert.equal(
      tracker.read(wiggle(pose, "Index", i % 2 ? 0.004 : -0.004)).zone,
      "CENTER",
    );
  tracker.reset();
  center(tracker, wiggle(pose, "Index", 0.06));
  assert.equal(settle(tracker, wiggle(pose, "Index", 0.06)).zone, "CENTER");
});
test("missing or malformed tracking holds the lane and recovers without recalibrating", () => {
  const tracker = createFingerTracker(),
    pose = hand();
  center(tracker, pose);
  settle(tracker, wiggle(pose, "Index", 0.06));
  for (const bad of [
    [],
    undefined,
    hand(null),
    Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 })),
  ]) {
    const state = tracker.read(bad);
    assert.equal(state.tracked, false);
    assert.equal(state.zone, "LEFT");
  }
  const bad = structuredClone(pose);
  bad[8].x = NaN;
  assert.equal(fingerOffset(bad), null);
  assert.equal(settle(tracker, pose).zone, "CENTER");
});

test("actual detector landmarks calibrate and support small fingertip changes", () => {
  const fixture = require("./fixtures/detected-pointing-finger.json"),
    tracker = createFingerTracker();
  const aspect = fixture.width / fixture.height;
  for (let i = 0; i < 5; i++) tracker.read(fixture.landmarks, aspect);
  for (const [dx, zone] of [
    [0.07, "LEFT"],
    [0, "CENTER"],
    [-0.07, "RIGHT"],
  ]) {
    const pose = structuredClone(fixture.landmarks);
    pose[8].x += dx;
    let state;
    for (let i = 0; i < 7; i++) state = tracker.read(pose, aspect);
    assert.equal(state.zone, zone);
  }
});
