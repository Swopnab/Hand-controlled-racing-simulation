const test = require("node:test"),
  assert = require("node:assert/strict");
const { WORLD, VIEW, ROUTES, project } = require("../road-renderer.js");
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
