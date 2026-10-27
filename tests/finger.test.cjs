const test = require("node:test"),
  assert = require("node:assert/strict");
const { fingerDirection, calculateZone } = require("../steering.js");
const { hand } = require("./fixtures/finger.cjs");
test("each raised finger can select left, center and right with a stationary palm", () => {
  for (const finger of ["Index", "Middle", "Ring", "Little", "Thumb"])
    for (const direction of ["LEFT", "CENTER", "RIGHT"]) {
      const pose = hand(finger, direction),
        signal = fingerDirection(pose);
      assert(signal, `${finger} ${direction} is detected`);
      assert.equal(signal.finger, finger);
      assert.equal(calculateZone(signal.x), direction);
      assert.deepEqual(pose[0], hand(finger, "CENTER")[0]);
    }
});
test("moving or resizing the whole hand cannot change finger steering", () => {
  for (const direction of ["LEFT", "CENTER", "RIGHT"]) {
    const expected = fingerDirection(hand("Index", direction)).x;
    for (const dx of [-0.2, 0.15])
      for (const scale of [0.5, 1.2]) {
        const actual = fingerDirection(
          hand("Index", direction, dx, -0.05, scale),
        );
        assert(actual);
        assert(Math.abs(actual.x - expected) < 1e-10);
      }
  }
});
test("active finger remains selected until folded, and invalid/closed hands return neutral", () => {
  const pose = hand("Middle", "RIGHT"),
    index = hand("Index", "LEFT");
  for (let i = 5; i <= 8; i++) pose[i] = index[i];
  assert.equal(fingerDirection(pose).finger, "Index");
  assert.equal(fingerDirection(pose, "Middle").finger, "Middle");
  assert.equal(
    fingerDirection(hand("Index", "CENTER"), "Middle").finger,
    "Index",
  );
  assert.equal(fingerDirection(hand(null)), null);
  assert.equal(fingerDirection([]), null);
  assert.equal(fingerDirection(undefined), null);
  pose[8].x = NaN;
  assert.equal(fingerDirection(pose), null);
  assert.equal(
    fingerDirection(Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }))),
    null,
  );
});
