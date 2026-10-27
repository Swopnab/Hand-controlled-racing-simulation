/* Fixed-resolution arcade renderer. Driving/collision coordinates remain 470x630. */
(function (root) {
  const WORLD = { width: 470, height: 630, roadX: 75, roadWidth: 320 };
  const VIEW = { width: 960, height: 600, horizon: 186, pixelScale: 3 };
  const ROUTES = Object.freeze({
    mountain: {
      name: "Mountain pass",
      sky: "#839be7",
      skyLow: "#b2c3ef",
      grass: ["#527c3e", "#5d8848"],
      mountain: "#8a90a8",
      shoulder: "#a18b62",
      trees: "pine",
    },
    coast: {
      name: "Coastal run",
      sky: "#70a9e0",
      skyLow: "#b0d4e7",
      grass: ["#5c9753", "#70a05b"],
      mountain: "#71938e",
      shoulder: "#cfb580",
      trees: "palm",
    },
    desert: {
      name: "Canyon route",
      sky: "#889fdb",
      skyLow: "#c8cce3",
      grass: ["#b48c5a", "#c09a65"],
      mountain: "#a16d59",
      shoulder: "#d6b77d",
      trees: "cactus",
    },
  });
  // A looping course with deliberate straight rests between right and left turns.
  const COURSE = Object.freeze([
    { length: 3000, turn: 0 },
    { length: 2400, turn: 1 },
    { length: 2600, turn: 0 },
    { length: 2600, turn: -1 },
    { length: 3000, turn: 0 },
    { length: 2200, turn: 0.75 },
    { length: 2000, turn: 0 },
    { length: 2400, turn: -0.8 },
  ]);
  const courseLength = COURSE.reduce((sum, s) => sum + s.length, 0);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  function courseTurn(distance = 0) {
    let local = ((distance % courseLength) + courseLength) % courseLength;
    for (const section of COURSE) {
      if (local < section.length)
        return section.turn * Math.sin((Math.PI * local) / section.length);
      local -= section.length;
    }
    return 0;
  }
  function roadCenter(t, distance = 0) {
    const remaining = 1 - clamp(t, 0, 1),
      ahead = Math.pow(remaining, 1.4) * 2200;
    let curvature = 0;
    for (let i = 0; i < 8; i++)
      curvature += courseTurn(distance + (ahead * (i + 0.5)) / 8) / 8;
    return VIEW.width / 2 + curvature * 240 * Math.pow(remaining, 1.8);
  }
  function roadPoint(t, distance = 0) {
    return {
      x: roadCenter(t, distance),
      y: VIEW.horizon + (VIEW.height - VIEW.horizon) * Math.pow(t, 2.1),
      half: 12 + Math.pow(t, 1.05) * 590,
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
  // Integer scan conversion avoids antialiased polygon edges in the artwork.
  function polygon(g, color, points) {
    g.fillStyle = color;
    const min = Math.floor(Math.min(...points.map((p) => p[1]))),
      max = Math.ceil(Math.max(...points.map((p) => p[1])));
    for (let y = min; y < max; y++) {
      const crossings = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
          crossings.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      crossings.sort((a, b) => a - b);
      for (let i = 0; i + 1 < crossings.length; i += 2)
        g.fillRect(
          Math.ceil(crossings[i]),
          y,
          Math.floor(crossings[i + 1]) - Math.ceil(crossings[i]) + 1,
          1,
        );
    }
  }
  function bitmap(rows, palette, lean = 0) {
    const width = Math.max(...rows.map((r) => r.length)),
      c = makeCanvas(width + 8, rows.length),
      g = c.getContext("2d");
    rows.forEach((row, y) => {
      const shift = Math.round(lean * (rows.length - y) * 0.22);
      for (let x = 0; x < row.length; x++) {
        const fill = palette[row[x]];
        if (fill) {
          g.fillStyle = fill;
          g.fillRect(x + 4 + shift, y, 1, 1);
        }
      }
    });
    return c;
  }
  function createRenderer() {
    const art = root.CyberPixelArt;
    const backgrounds = {},
      grass = {},
      trees = {},
      sprites = new Map();
    let surface = makeCanvas(320, 200),
      g = surface.getContext("2d");
    const palette = {
      K: "#17212c",
      H: "#dfd3a4",
      W: "#fcf3c9",
      V: "#34495d",
      G: "#75838d",
      C: "#d24e71",
      L: "#ed8b98",
      S: "#823252",
      B: "#273145",
      T: "#222635",
      E: "#c8d2d3",
      R: "#ef6548",
    };
    function spriteFor(kind, color, lean = 0) {
      const pose = lean > 0.04 ? 1 : lean < -0.04 ? -1 : 0,
        key = kind + color + pose;
      if (!sprites.has(key)) {
        const c = bitmap(
          kind === "BIKE" ? art.RIDER : art.CAR,
          { ...palette, C: color || palette.C },
          kind === "BIKE" ? pose : 0,
        );
        if (kind === "TRUCK" || kind === "SUV") {
          const q = c.getContext("2d");
          q.fillStyle = color;
          q.fillRect(7, 0, 27, 22);
          q.fillStyle = "#243c4d";
          q.fillRect(10, 3, 21, 12);
          q.fillStyle = "#88a5b2";
          q.fillRect(11, 4, 18, 2);
          q.fillStyle = "#a8b3b5";
          q.fillRect(20, 3, 2, 12);
          q.fillRect(7, 0, 27, 2);
        }
        if (kind === "PICKUP") {
          const q = c.getContext("2d");
          q.fillStyle = "#283640";
          q.fillRect(10, 13, 21, 8);
          q.fillStyle = "#7f8b8f";
          q.fillRect(12, 15, 1, 4);
          q.fillRect(28, 15, 1, 4);
        }
        sprites.set(key, c);
      }
      return sprites.get(key);
    }
    for (const [id, r] of Object.entries(ROUTES)) {
      const sky = makeCanvas(320, 70),
        q = sky.getContext("2d");
      q.fillStyle = r.sky;
      q.fillRect(0, 0, 320, 70);
      q.fillStyle = r.skyLow;
      q.fillRect(0, 37, 320, 33);
      [
        [12, 14],
        [110, 7],
        [228, 13],
      ].forEach(([x, y]) => {
        q.fillStyle = "#cbd5e5";
        q.fillRect(x, y + 7, 48, 8);
        q.fillRect(x + 5, y + 3, 36, 11);
        q.fillStyle = "#fff9e5";
        q.fillRect(x + 12, y, 19, 11);
        q.fillRect(x + 3, y + 8, 40, 5);
      });
      const ridge = [
        [0, 57],
        [21, 47],
        [37, 52],
        [56, 32],
        [68, 39],
        [76, 34],
        [94, 50],
        [112, 28],
        [123, 40],
        [141, 37],
        [158, 50],
        [179, 34],
        [192, 42],
        [210, 26],
        [221, 36],
        [235, 31],
        [256, 45],
        [278, 38],
        [299, 45],
        [320, 29],
        [320, 70],
        [0, 70],
      ];
      polygon(q, r.mountain, ridge);
      if (id === "mountain") {
        polygon(q, "#d4d4cc", [
          [33, 51],
          [56, 32],
          [68, 39],
          [76, 34],
          [96, 52],
          [74, 44],
          [66, 43],
          [57, 38],
          [49, 46],
        ]);
        polygon(q, "#d4d4cc", [
          [96, 46],
          [112, 28],
          [123, 40],
          [140, 37],
          [155, 49],
          [132, 44],
          [121, 45],
          [112, 35],
        ]);
        polygon(q, "#eee9d6", [
          [182, 42],
          [210, 26],
          [221, 36],
          [235, 31],
          [255, 45],
          [235, 40],
          [220, 41],
          [210, 33],
          [200, 34],
        ]);
      } else if (id === "desert") {
        polygon(q, "#d1a376", [
          [25, 62],
          [32, 38],
          [57, 38],
          [64, 59],
          [87, 59],
          [94, 46],
          [109, 46],
          [120, 68],
        ]);
        polygon(q, "#d5ad7f", [
          [198, 55],
          [210, 30],
          [235, 30],
          [239, 54],
          [270, 54],
          [275, 69],
        ]);
      }
      // Sparse two-color dithering breaks the mountain planes into deliberate pixels.
      for (let y = 40; y < 66; y += 2)
        for (let x = 0; x < 320; x += 3)
          if ((x * 11 + y * 7) % 17 === 0) {
            q.fillStyle = id === "desert" ? "#bd8e6b" : "#a5a9b3";
            q.fillRect(x, y, 1, 1);
          }
      polygon(q, id === "desert" ? "#a88254" : "#386044", [
        [0, 66],
        [25, 60],
        [49, 63],
        [77, 58],
        [108, 64],
        [133, 60],
        [163, 65],
        [194, 57],
        [231, 63],
        [270, 55],
        [302, 61],
        [320, 58],
        [320, 70],
        [0, 70],
      ]);
      backgrounds[id] = sky;
      const tile = makeCanvas(8, 8),
        t = tile.getContext("2d");
      t.fillStyle = r.grass[0];
      t.fillRect(0, 0, 8, 8);
      t.fillStyle = r.grass[1];
      [
        [0, 0],
        [4, 1],
        [2, 3],
        [7, 4],
        [1, 6],
        [5, 7],
      ].forEach((p) => t.fillRect(...p, 1, 1));
      grass[id] = tile;
      trees[id] = bitmap(
        id === "coast" ? art.PALM : id === "desert" ? art.CACTUS : art.PINE,
        {
          K: id === "desert" ? "#42593e" : "#193f2c",
          G: id === "desert" ? "#52704a" : "#25643e",
          L: id === "desert" ? "#7c9456" : "#559454",
          B: "#80613f",
        },
      );
    }
    const coinImage = bitmap(art.COIN, {
      K: "#694321",
      Y: "#ffd34e",
      W: "#fff8b4",
      D: "#bd8c2b",
    });
    function ensureSurface() {
      const h = Math.ceil(VIEW.height / 3);
      if (surface.height !== h) {
        surface.height = h;
        g = surface.getContext("2d");
      }
      g.imageSmoothingEnabled = false;
    }
    function drawRoad(_, route, distance) {
      ensureSurface();
      const r = ROUTES[route],
        height = surface.height,
        horizon = Math.round(VIEW.horizon / 3);
      g.drawImage(backgrounds[route], 0, 0, 320, horizon);
      g.fillStyle = g.createPattern(grass[route], "repeat");
      g.fillRect(0, horizon, 320, height - horizon);
      if (route === "coast") {
        polygon(g, "#428ba5", [
          [0, horizon],
          [65, horizon],
          [95, height * 0.68],
          [0, height * 0.8],
        ]);
        g.fillStyle = "#83c8cd";
        for (let y = horizon + 4; y < height * 0.75; y += 6)
          g.fillRect(0, y, 45 + (y - horizon) * 0.3, 1);
      }
      for (let y = horizon; y < height; y++) {
        const t = Math.pow((y - horizon) / (height - horizon), 1 / 2.1),
          p = roadPoint(t, distance),
          center = Math.round(p.x / 3),
          half = Math.round(p.half / 3),
          edge = Math.max(2, Math.round(half * 0.085));
        const stripe = Math.floor((distance + (1 - t) * 2600) / 210) % 2;
        g.fillStyle = r.shoulder;
        g.fillRect(center - half - edge, y, half * 2 + edge * 2, 1);
        g.fillStyle = stripe ? "#494b58" : "#4b4d5a";
        g.fillRect(center - half, y, half * 2, 1);
        g.fillStyle = "#e0dfcb";
        g.fillRect(center - half, y, Math.max(1, Math.round(half * 0.006)), 1);
        g.fillRect(
          center + half - 1,
          y,
          Math.max(1, Math.round(half * 0.006)),
          1,
        );
        // Broad carriageway: a center pair, with dashed white passing-lane marks.
        const line = Math.max(1, Math.round(half * 0.008));
        g.fillStyle = "#e7cc58";
        g.fillRect(center - line * 2, y, line, 1);
        g.fillRect(center + line, y, line, 1);
        if (stripe) {
          g.fillStyle = "#dddccf";
          for (const lane of [-0.52, 0.52])
            g.fillRect(Math.round(center + lane * half), y, line, 1);
        }
      }
      const positions = Array.from(
        { length: 14 },
        (_, i) => (i / 14 + (distance % 1400) / 1400) % 1,
      )
        .filter((t) => t > 0.11)
        .sort((a, b) => a - b);
      for (const t of positions) {
        const p = roadPoint(t, distance),
          factor = 0.12 + t * 1.8;
        for (const side of [-1, 1]) {
          if (route === "coast" && side < 0) continue;
          const image = trees[route],
            w = Math.round(18 * factor),
            h = Math.round(44 * factor),
            x = Math.round((p.x + side * (p.half * 1.18 + 35)) / 3),
            y = Math.round(p.y / 3);
          g.drawImage(image, x - Math.round(w / 2), y - h, w, h);
        }
        const x = Math.round((p.x - p.half * 1.105) / 3),
          y = Math.round(p.y / 3),
          h = Math.max(1, Math.round(8 * t));
        g.fillStyle = "#eee6c1";
        g.fillRect(x, y - h, 1, h);
        g.fillStyle = "#b74932";
        g.fillRect(x, y - h, 1, Math.max(1, Math.round(h * 0.3)));
      }
    }
    function vehicle(_, entity, distance, lean = 0) {
      const p = project(
          entity.x + entity.width / 2,
          entity.y + entity.height,
          distance,
        ),
        image = spriteFor(entity.type || "BIKE", entity.color, lean),
        w = Math.max(2, Math.round((entity.width * 3.5 * p.scale) / 3)),
        h = Math.max(
          3,
          Math.round(
            ((entity.type === "TRUCK"
              ? entity.height * 2
              : entity.type === "BIKE"
                ? 185
                : 145) *
              p.scale) /
              3,
          ),
        ),
        x = Math.round(p.x / 3),
        y = Math.round(p.y / 3);
      g.fillStyle = "#252d35";
      g.fillRect(
        x - Math.round(w * 0.6),
        y,
        Math.round(w * 1.2),
        Math.max(1, Math.round(2 * p.scale)),
      );
      g.fillRect(x - Math.round(w * 0.4), y - 1, Math.round(w * 0.8), 1);
      g.drawImage(image, x - Math.round(w / 2), y - h, w, h);
    }
    function coin(_, entity, distance) {
      const p = project(
          entity.x + entity.width / 2,
          entity.y + entity.height / 2,
          distance,
        ),
        h = Math.max(3, Math.round((24 * p.scale) / 3)),
        x = Math.round(p.x / 3),
        y = Math.round(p.y / 3);
      const frame = [1, 0.75, 0.4, 0.75][Math.floor(distance / 45) % 4],
        w = Math.max(2, Math.round(h * frame));
      g.drawImage(
        coinImage,
        x - Math.round(w / 2),
        y - Math.round(h / 2),
        w,
        h,
      );
    }
    function particles(_, items, distance) {
      for (const item of items) {
        if (item.alpha <= 0) continue;
        const p = project(item.x, item.y, distance);
        g.fillStyle = item.color;
        const n = Math.max(1, Math.round((item.size * p.scale) / 3));
        g.fillRect(Math.round(p.x / 3), Math.round(p.y / 3), n, n);
      }
    }
    function present(ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(surface, 0, 0, VIEW.width, VIEW.height);
    }
    function preview(canvas, ride) {
      const q = canvas.getContext("2d"),
        image = spriteFor(ride.kind, ride.color);
      q.imageSmoothingEnabled = false;
      q.fillStyle = "#111827";
      q.fillRect(0, 0, canvas.width, canvas.height);
      q.fillStyle = "#67768b";
      q.fillRect(8, canvas.height - 8, canvas.width - 16, 1);
      const h = canvas.height - 12,
        w = Math.round((image.width / image.height) * h);
      q.drawImage(image, Math.round((canvas.width - w) / 2), 3, w, h);
    }
    return { drawRoad, vehicle, coin, particles, present, preview };
  }
  const api = {
    WORLD,
    VIEW,
    ROUTES,
    COURSE,
    courseTurn,
    roadPoint,
    project,
    createRenderer,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CyberRoad = api;
})(typeof globalThis === "object" ? globalThis : this);
