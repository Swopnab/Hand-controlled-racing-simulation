const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  WORLD,
  VIEW,
  ROUTES,
  COURSE,
  courseTurn,
  roadPoint,
  project,
} = require("../road-renderer.js");
test("world and rendering sizes stay independent", () => {
  assert.equal(WORLD.height, 630);
  assert.equal(VIEW.width, 960);
  assert.equal(VIEW.height, 600);
  assert.deepEqual(Object.keys(ROUTES), ["mountain", "coast", "desert"]);
});
test("traffic approaches continuously and lane ordering cannot reverse on bends", () => {
  for (const distance of [0, 1200, 9000]) {
    let previous = VIEW.horizon;
    for (let y = -80; y <= 630; y += 10) {
      const left = project(128, y, distance),
        center = project(235, y, distance),
        right = project(342, y, distance);
      assert(left.x < center.x && center.x < right.x);
      assert(center.y > previous);
      assert(Number.isFinite(center.scale) && center.scale > 0);
      previous = center.y;
    }
  }
});
test("adjacent steering lanes remain visually distinct at the collision plane", () => {
  for (const distance of [0, 1200, 9000]) {
    const left = project(128, 572, distance),
      center = project(235, 572, distance),
      right = project(342, 572, distance);
    assert(center.x - left.x > 32 * 3.5 * center.scale);
    assert(right.x - center.x > 32 * 3.5 * center.scale);
    assert(center.y < VIEW.height && center.y > VIEW.height * 0.75);
  }
});

// Long rests are truly straight, rather than a perpetual sinusoidal sway.
test("course alternates straight sections and smooth left/right bends", () => {
  let start = 0;
  const total = COURSE.reduce((sum, s) => sum + s.length, 0);
  for (const section of COURSE) {
    assert(Math.abs(courseTurn(start)) < 1e-10);
    assert(Math.abs(courseTurn(start + section.length - 0.001)) < 0.00001);
    const middle = start + section.length / 2;
    assert(Math.abs(courseTurn(middle) - section.turn) < 1e-10);
    assert(Math.abs(courseTurn(middle + total) - courseTurn(middle)) < 1e-10);
    if (section.turn === 0)
      for (const offset of [0, 100, 500])
        assert.equal(courseTurn(start + offset), 0);
    start += section.length;
  }
  for (const t of [0, 0.25, 0.5, 0.75, 1]) assert.equal(roadPoint(t, 0).x, 480);
  assert(roadPoint(0.25, 3600).x > 480);
  assert(roadPoint(0.25, 9000).x < 480);
});
test("wide road keeps nearby actors finite beyond the bottom edge", () => {
  assert(roadPoint(0.5, 0).half > 290);
  assert(roadPoint(1, 0).half > 600);
  for (const distance of [0, 3600, 9000])
    for (const y of [630, 650, 710]) {
      const p = project(235, y, distance);
      assert(
        Number.isFinite(p.x) &&
          Number.isFinite(p.y) &&
          Number.isFinite(p.scale),
      );
    }
});
