/* Original procedural pixel art. World coordinates stay separate from the camera. */
(function (root) {
  const WORLD = { width: 470, height: 630, roadX: 75, roadWidth: 320 };
  const VIEW = { width: 960, height: 600, horizon: 186 };
  const ROUTES = Object.freeze({
    mountain: {
      name: "Mountain pass",
      subtitle: "Alpine turns",
      sky: ["#7994df", "#a5b9ed", "#d7e3f5"],
      grass: ["#708451", "#687c49"],
      mountain: "#a4a6b7",
      shoulder: "#9c8666",
      trees: "pine",
    },
    coast: {
      name: "Coastal run",
      subtitle: "Ocean highway",
      sky: ["#74b3e5", "#b1d8e9", "#deeee9"],
      grass: ["#88a76a", "#80a063"],
      mountain: "#7ca1a0",
      shoulder: "#c0aa7b",
      trees: "palm",
    },
    desert: {
      name: "Canyon route",
      subtitle: "Desert miles",
      sky: ["#82a1dd", "#bfc8e3", "#f4dec3"],
      grass: ["#b18a5b", "#aa8053"],
      mountain: "#b57d68",
      shoulder: "#d6b27c",
      trees: "cactus",
    },
  });
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  function roadCenter(t, distance = 0) {
    return (
      VIEW.width / 2 +
      (Math.sin(distance * 0.0008 + t * 4.5 + 1.1) * 190 +
        Math.sin(distance * 0.0003 + t * 9) * 38) *
        Math.pow(1 - t, 2)
    );
  }
  function roadPoint(t, distance = 0) {
    return {
      x: roadCenter(t, distance),
      y: VIEW.horizon + (VIEW.height - VIEW.horizon) * Math.pow(t, 2.1),
      half: 9 + Math.pow(t, 1.45) * 570,
    };
  }
  function project(x, y, distance = 0) {
    const t = clamp((y + 100) / (WORLD.height + 100), 0.015, 1.12),
      p = roadPoint(t, distance);
    return {
      ...p,
      t,
      x:
        p.x +
        ((x - (WORLD.roadX + WORLD.roadWidth / 2)) / (WORLD.roadWidth / 2)) *
          p.half,
      scale: 0.04 + Math.pow(t, 1.3) * 1.08,
    };
  }
  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  function polygon(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
    ctx.closePath();
    ctx.fill();
  }
  function sprite(kind, color) {
    const c = makeCanvas(48, 76),
      g = c.getContext("2d");
    const rect = (x, y, w, h, fill) => {
      g.fillStyle = fill;
      g.fillRect(x, y, w, h);
    };
    if (kind === "BIKE") {
      rect(19, 51, 11, 24, "#171b24");
      rect(21, 53, 7, 21, "#2c3040");
      rect(23, 55, 2, 17, "#414557");
      rect(12, 35, 25, 24, "#3a2442");
      rect(14, 37, 21, 17, color);
      rect(11, 44, 5, 15, "#8e294c");
      rect(34, 44, 4, 18, "#aa9ba8");
      rect(35, 47, 2, 13, "#e2e2d9");
      rect(16, 51, 17, 5, "#e94c44");
      rect(19, 52, 11, 2, "#ff9973");
      rect(18, 58, 14, 4, "#e4dfc4");
      rect(22, 59, 6, 2, "#3c4151");
      polygon(g, "#202534", [
        [15, 30],
        [21, 32],
        [18, 47],
        [14, 56],
        [8, 56],
        [11, 43],
      ]);
      polygon(g, "#30384d", [
        [30, 30],
        [36, 33],
        [36, 48],
        [40, 56],
        [34, 57],
        [29, 45],
      ]);
      polygon(g, color, [
        [16, 14],
        [31, 14],
        [35, 30],
        [30, 39],
        [17, 37],
        [12, 27],
      ]);
      rect(18, 17, 11, 5, "#ffffff33");
      rect(19, 23, 11, 10, "#00000022");
      polygon(g, "#dc596e", [
        [15, 17],
        [18, 23],
        [11, 30],
        [7, 34],
        [4, 31],
        [9, 24],
      ]);
      polygon(g, "#ed7792", [
        [31, 16],
        [35, 19],
        [37, 27],
        [44, 29],
        [43, 33],
        [34, 30],
        [29, 24],
      ]);
      rect(2, 30, 7, 4, "#222635");
      rect(40, 29, 7, 4, "#222635");
      rect(5, 34, 6, 2, "#8b929c");
      polygon(g, "#d8c49c", [
        [18, 2],
        [28, 1],
        [34, 7],
        [33, 16],
        [28, 20],
        [19, 18],
        [14, 11],
      ]);
      rect(19, 3, 10, 3, "#f8e6b6");
      rect(16, 9, 4, 7, "#989da6");
      rect(21, 7, 12, 7, "#384358");
      rect(24, 8, 8, 2, "#7c91a2");
      rect(20, 16, 9, 3, "#b3a384");
    } else {
      rect(6, 46, 7, 27, "#171b24");
      rect(36, 46, 7, 27, "#171b24");
      rect(8, 50, 3, 20, "#343741");
      rect(38, 50, 3, 20, "#343741");
      polygon(g, "#222737", [
        [8, 25],
        [14, 12],
        [33, 12],
        [40, 25],
        [44, 55],
        [41, 68],
        [7, 68],
        [4, 55],
      ]);
      polygon(g, color, [
        [9, 27],
        [15, 13],
        [32, 13],
        [39, 27],
        [42, 56],
        [40, 64],
        [8, 64],
        [6, 56],
      ]);
      polygon(g, "#b3bfcd", [
        [15, 16],
        [32, 16],
        [36, 29],
        [11, 29],
      ]);
      polygon(g, "#293b50", [
        [16, 18],
        [30, 18],
        [33, 27],
        [14, 27],
      ]);
      rect(16, 19, 13, 2, "#728da1");
      rect(10, 33, 28, 17, color);
      rect(12, 34, 3, 15, "#ffffff44");
      rect(35, 34, 3, 15, "#11182733");
      rect(7, 51, 34, 9, "#30323c");
      rect(8, 53, 9, 4, "#f05f44");
      rect(32, 53, 8, 4, "#f05f44");
      rect(20, 53, 9, 4, "#e2dec1");
      rect(5, 63, 38, 3, "#b4b8bb");
      rect(12, 67, 5, 3, "#666974");
      rect(32, 67, 5, 3, "#666974");
      if (kind === "TRUCK" || kind === "SUV") {
        rect(8, 7, 33, 42, color);
        rect(11, 11, 27, 19, "#2c4350");
        rect(14, 13, 21, 4, "#70929e");
        rect(23, 12, 2, 18, "#bcc3b6");
        rect(10, 34, 29, 2, "#ffffff55");
        rect(7, 6, 35, 4, "#d3d2c7");
      }
      if (kind === "PICKUP") {
        rect(10, 30, 29, 20, "#29323b");
        rect(12, 32, 25, 15, "#4d5960");
        rect(13, 34, 2, 10, "#77828b");
        rect(34, 34, 2, 10, "#77828b");
      }
    }
    return c;
  }
  function scenery(type) {
    const c = makeCanvas(64, 100),
      g = c.getContext("2d");
    if (type === "pine") {
      g.fillStyle = "#695c3e";
      g.fillRect(29, 49, 6, 50);
      polygon(g, "#244e35", [
        [31, 1],
        [4, 67],
        [15, 66],
        [0, 85],
        [64, 85],
        [48, 64],
        [59, 67],
      ]);
      polygon(g, "#376745", [
        [30, 2],
        [29, 69],
        [6, 78],
        [18, 55],
        [12, 57],
      ]);
      polygon(g, "#507c4d", [
        [29, 10],
        [11, 56],
        [22, 52],
        [9, 73],
        [29, 64],
      ]);
    }
    if (type === "palm") {
      polygon(g, "#7c6545", [
        [30, 20],
        [37, 21],
        [34, 100],
        [27, 100],
      ]);
      for (let i = 0; i < 6; i++) {
        const x = 32 + Math.cos(i) * 32,
          y = 24 + Math.sin(i) * 20;
        polygon(g, i % 2 ? "#2f7052" : "#3a8357", [
          [32, 25],
          [x, y],
          [x - 8, y + 20],
          [34, 29],
        ]);
      }
    }
    if (type === "cactus") {
      g.fillStyle = "#597953";
      g.fillRect(26, 12, 12, 88);
      g.fillRect(10, 33, 10, 30);
      g.fillRect(17, 55, 15, 9);
      g.fillRect(45, 20, 9, 31);
      g.fillRect(34, 42, 15, 9);
      g.fillStyle = "#739263";
      g.fillRect(28, 14, 3, 84);
      g.fillRect(12, 34, 3, 21);
    }
    return c;
  }
  function background(route) {
    const c = makeCanvas(480, 300),
      g = c.getContext("2d"),
      r = ROUTES[route];
    r.sky.forEach((color, i) => {
      g.fillStyle = color;
      g.fillRect(0, i * 34, 480, 40);
    });
    [
      [15, 20],
      [162, 10],
      [302, 32],
      [408, 14],
    ].forEach(([x, y]) => {
      g.fillStyle = "#d7e1ee";
      g.fillRect(x, y + 10, 66, 8);
      g.fillRect(x + 8, y + 6, 47, 8);
      g.fillStyle = "#f6f5e9";
      g.fillRect(x + 15, y + 1, 23, 11);
      g.fillRect(x + 3, y + 9, 56, 6);
      g.fillRect(x + 10, y + 16, 48, 3);
    });
    const mountains = [
      [0, 94],
      [0, 71],
      [29, 62],
      [46, 69],
      [72, 42],
      [92, 49],
      [115, 64],
      [146, 38],
      [169, 55],
      [192, 48],
      [218, 72],
      [250, 40],
      [281, 54],
      [308, 32],
      [333, 48],
      [355, 42],
      [390, 65],
      [422, 49],
      [446, 56],
      [480, 38],
      [480, 105],
    ];
    polygon(g, r.mountain, mountains);
    if (route === "mountain") {
      polygon(g, "#d0cfcf", [
        [34, 68],
        [72, 42],
        [91, 49],
        [114, 64],
        [85, 58],
        [75, 51],
        [61, 58],
        [52, 62],
      ]);
      polygon(g, "#d8d4cf", [
        [122, 57],
        [146, 38],
        [169, 55],
        [193, 48],
        [210, 67],
        [179, 59],
        [166, 60],
        [146, 48],
        [139, 52],
      ]);
      polygon(g, "#e2ded6", [
        [271, 52],
        [308, 32],
        [333, 48],
        [355, 42],
        [380, 61],
        [345, 53],
        [326, 54],
        [308, 44],
        [296, 45],
      ]);
    } else if (route === "desert") {
      polygon(g, "#d1a07c", [
        [45, 82],
        [53, 50],
        [81, 50],
        [85, 78],
        [112, 78],
        [120, 61],
        [144, 61],
        [157, 93],
      ]);
      polygon(g, "#d7aa83", [
        [305, 77],
        [317, 44],
        [352, 44],
        [356, 72],
        [397, 72],
        [401, 94],
      ]);
    }
    polygon(g, route === "desert" ? "#aa8260" : "#547d50", [
      [0, 88],
      [37, 81],
      [82, 91],
      [132, 77],
      [187, 87],
      [228, 76],
      [272, 85],
      [334, 74],
      [386, 81],
      [432, 72],
      [480, 82],
      [480, 110],
      [0, 110],
    ]);
    g.fillStyle = r.grass[0];
    g.fillRect(0, 94, 480, 206);
    // Fixed seeded grain gives the low-resolution landscape its own texture.
    let seed = 1937;
    for (let i = 0; i < 4200; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const x = seed % 480;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const y = 95 + (seed % 205);
      g.fillStyle = i % 3 ? "#ffffff0d" : "#142e281c";
      g.fillRect(x, y, 1 + (i % 2), 1);
    }
    if (route === "coast") {
      polygon(g, "#6ca9bd", [
        [0, 94],
        [118, 94],
        [200, 145],
        [141, 192],
        [0, 212],
      ]);
      for (let i = 0; i < 12; i++) {
        g.fillStyle = "#b1d9d1";
        g.fillRect(0, 105 + i * 7, 110 + i * 2, 1);
      }
    }
    return c;
  }
  function createRenderer() {
    const backgrounds = {},
      trees = {},
      sprites = new Map();
    for (const id of Object.keys(ROUTES)) {
      backgrounds[id] = background(id);
      trees[id] = scenery(ROUTES[id].trees);
    }
    const spriteFor = (kind, color) => {
      const key = kind + color;
      if (!sprites.has(key)) sprites.set(key, sprite(kind, color));
      return sprites.get(key);
    };
    function drawRoad(ctx, route, distance) {
      const r = ROUTES[route];
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(backgrounds[route], 0, 0, VIEW.width, VIEW.height);
      for (let i = 1; i <= 110; i++) {
        const a = roadPoint((i - 1) / 100, distance),
          b = roadPoint(i / 100, distance),
          band = Math.floor(distance / 16 + i / 3) % 2;
        a.y = Math.floor(a.y);
        b.y = Math.ceil(b.y) + 1;
        if (b.y <= VIEW.horizon) continue;
        ctx.fillStyle = band ? r.grass[1] + "38" : r.grass[0] + "16";
        ctx.fillRect(0, a.y, VIEW.width, b.y - a.y + 1);
        const shoulderA = a.half * 1.11 + 2,
          shoulderB = b.half * 1.11 + 2;
        polygon(ctx, r.shoulder, [
          [a.x - shoulderA, a.y],
          [a.x + shoulderA, a.y],
          [b.x + shoulderB, b.y],
          [b.x - shoulderB, b.y],
        ]);
        polygon(ctx, band ? "#555660" : "#585962", [
          [a.x - a.half, a.y],
          [a.x + a.half, a.y],
          [b.x + b.half, b.y],
          [b.x - b.half, b.y],
        ]);
        for (const edge of [-1, 1]) {
          const aw = Math.max(0.4, a.half * 0.007),
            bw = Math.max(0.5, b.half * 0.007);
          polygon(ctx, "#c9c7b2", [
            [a.x + edge * a.half - aw, a.y],
            [a.x + edge * a.half + aw, a.y],
            [b.x + edge * b.half + bw, b.y],
            [b.x + edge * b.half - bw, b.y],
          ]);
        }
        // Two dashed dividers retain the existing three steering lanes.
        if (Math.floor(distance / 22 + i / 5) % 2 === 0)
          for (const divider of [-1 / 3, 1 / 3]) {
            const aw = Math.max(0.4, a.half * 0.009),
              bw = Math.max(0.5, b.half * 0.009);
            polygon(ctx, "#e7c95d", [
              [a.x + divider * a.half - aw, a.y],
              [a.x + divider * a.half + aw, a.y],
              [b.x + divider * b.half + bw, b.y],
              [b.x + divider * b.half - bw, b.y],
            ]);
          }
      }
      const offset = (distance % 900) / 900;
      for (let i = 0; i < 18; i++) {
        const t = (i / 18 + offset) % 1;
        if (t < 0.1) continue;
        const p = roadPoint(t, distance),
          scale = 0.1 + t * 2.4;
        for (const side of [-1, 1]) {
          if (route === "coast" && side < 0) continue;
          const x = p.x + side * (p.half * 1.38 + 20),
            w = 45 * scale,
            h = 95 * scale;
          ctx.drawImage(
            trees[route],
            Math.round(x - w / 2),
            Math.round(p.y - h),
            Math.round(w),
            Math.round(h),
          );
        }
        // Roadside reflector posts ground the sense of speed.
        ctx.fillStyle = "#ece7c6";
        ctx.fillRect(p.x - p.half * 1.13 - 2, p.y - 18 * t, 3 * t, 18 * t);
        ctx.fillStyle = "#d67548";
        ctx.fillRect(p.x - p.half * 1.13 - 2, p.y - 18 * t, 3 * t, 5 * t);
      }
    }
    function vehicle(ctx, entity, distance, lean = 0) {
      const p = project(
          entity.x + entity.width / 2,
          entity.y + entity.height,
          distance,
        ),
        image = spriteFor(entity.type || "BIKE", entity.color),
        width = entity.width * 3.5 * p.scale,
        height =
          (entity.type === "TRUCK"
            ? entity.height * 2
            : entity.type === "BIKE"
              ? 185
              : 145) * p.scale;
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.fillStyle = "#19232770";
      ctx.beginPath();
      ctx.ellipse(
        8,
        0,
        width * 0.66,
        Math.max(2, 9 * p.scale),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.rotate(lean);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, -width / 2, -height, width, height);
      ctx.restore();
    }
    function coin(ctx, entity, distance) {
      const p = project(
          entity.x + entity.width / 2,
          entity.y + entity.height / 2,
          distance,
        ),
        radius = Math.max(2, 12 * p.scale);
      ctx.fillStyle = "#553d28";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, radius, radius * 1.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd768";
      ctx.beginPath();
      ctx.ellipse(
        p.x,
        p.y - radius * 0.1,
        radius * 0.82,
        radius,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.strokeStyle = "#b88934";
      ctx.lineWidth = Math.max(1, 2 * p.scale);
      ctx.stroke();
      ctx.fillStyle = "#fff2b6";
      ctx.fillRect(
        p.x - radius * 0.2,
        p.y - radius * 0.66,
        Math.max(1, radius * 0.23),
        radius * 1.1,
      );
    }
    function particles(ctx, items, distance) {
      for (const item of items) {
        const p = project(item.x, item.y, distance);
        ctx.globalAlpha = Math.max(0, item.alpha);
        ctx.fillStyle = item.color;
        ctx.fillRect(
          p.x,
          p.y,
          Math.max(2, item.size * p.scale * 2),
          Math.max(2, item.size * p.scale * 2),
        );
      }
      ctx.globalAlpha = 1;
    }
    function preview(canvas, ride) {
      const g = canvas.getContext("2d");
      g.clearRect(0, 0, 150, 90);
      g.fillStyle = "#152026";
      g.fillRect(0, 0, 150, 90);
      g.fillStyle = "#394649";
      g.fillRect(15, 70, 120, 2);
      g.imageSmoothingEnabled = false;
      g.drawImage(spriteFor(ride.kind, ride.color), 54, 5, 42, 72);
    }
    return { drawRoad, vehicle, coin, particles, preview };
  }
  const api = { WORLD, VIEW, ROUTES, roadPoint, project, createRenderer };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CyberRoad = api;
})(typeof globalThis === "object" ? globalThis : this);
