// Synthetic 21-landmark hand: folded fingers except one straight, raised finger.
exports.hand = (
  finger = "Index",
  direction = "CENTER",
  dx = 0,
  dy = 0,
  scale = 1,
) => {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7 }));
  points[0] = { x: 0.5, y: 0.82 };
  const bases = [
    [5, 0.44, 0.56],
    [9, 0.5, 0.52],
    [13, 0.55, 0.55],
    [17, 0.6, 0.6],
  ];
  for (const [base, x, y] of bases) {
    points[base] = { x, y };
    points[base + 1] = { x, y: y + 0.04 };
    points[base + 2] = { x, y: y + 0.09 };
    points[base + 3] = { x, y: y + 0.06 };
  }
  points[1] = { x: 0.43, y: 0.74 };
  points[2] = { x: 0.4, y: 0.7 };
  points[3] = { x: 0.42, y: 0.68 };
  points[4] = { x: 0.44, y: 0.72 };
  const base = { Index: 5, Middle: 9, Ring: 13, Little: 17, Thumb: 1 }[finger];
  if (base) {
    const origin = points[base];
    const vx = direction === "LEFT" ? 0.24 : direction === "RIGHT" ? -0.24 : 0,
      vy = direction === "CENTER" ? -0.26 : -0.04;
    for (let j = 1; j <= 3; j++)
      points[base + j] = {
        x: origin.x + (vx * j) / 3,
        y: origin.y + (vy * j) / 3,
      };
  }
  return points.map((p) => ({
    x: 0.5 + (p.x - 0.5) * scale + dx,
    y: 0.5 + (p.y - 0.5) * scale + dy,
  }));
};
