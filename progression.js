// Browser-local arcade progress; no accounts, real-money purchases or external services.
(function (root) {
  const KEY = "cybersteerProgressV1";
  const VEHICLES = Object.freeze([
    {
      id: "street-bike",
      name: "Street rider",
      kind: "BIKE",
      color: "#cf426d",
      cost: 0,
      description: "Your original highway ride.",
    },
    {
      id: "rally-car",
      name: "Rally coupe",
      kind: "CAR",
      color: "#ee7839",
      cost: 40,
      description: "A sunburst rally-car body.",
    },
    {
      id: "midnight-gt",
      name: "Midnight GT",
      kind: "CAR",
      color: "#6376cd",
      cost: 100,
      description: "An indigo grand tourer.",
    },
    {
      id: "coast-roadster",
      name: "Coast roadster",
      kind: "CAR",
      color: "#52b7ad",
      cost: 180,
      description: "A seafoam open-road cruiser.",
    },
  ]);
  const initial = () => ({
    coins: 0,
    owned: ["street-bike"],
    equipped: "street-bike",
  });
  function validate(value) {
    if (
      !value ||
      !Number.isSafeInteger(value.coins) ||
      value.coins < 0 ||
      value.coins > 10000000 ||
      !Array.isArray(value.owned)
    )
      return initial();
    const owned = [
      ...new Set([
        "street-bike",
        ...value.owned.filter((id) => VEHICLES.some((v) => v.id === id)),
      ]),
    ];
    return {
      coins: value.coins,
      owned,
      equipped: owned.includes(value.equipped) ? value.equipped : "street-bike",
    };
  }
  function createStore(storage) {
    let state = initial(),
      persistent = Boolean(storage),
      memoryOnly = !storage;
    function read() {
      if (memoryOnly) return state;
      try {
        const value = storage.getItem(KEY);
        state = value ? validate(JSON.parse(value)) : initial();
      } catch {
        persistent = false;
        memoryOnly = true;
      }
      return state;
    }
    function write(next) {
      state = validate(next);
      try {
        if (memoryOnly) throw new Error("No storage");
        storage.setItem(KEY, JSON.stringify(state));
      } catch {
        persistent = false;
        memoryOnly = true;
      }
      return snapshot();
    }
    function snapshot() {
      return { ...state, owned: [...state.owned], persistent };
    }
    read();
    return {
      snapshot,
      refresh() {
        read();
        return snapshot();
      },
      award(amount) {
        if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000)
          throw new Error("Invalid coin award");
        read();
        return write({
          ...state,
          coins: Math.min(10000000, state.coins + amount),
        });
      },
      purchase(id) {
        read();
        const v = VEHICLES.find((v) => v.id === id);
        if (!v) throw new Error("Unknown vehicle");
        if (state.owned.includes(id)) return snapshot();
        if (state.coins < v.cost) throw new Error("Not enough coins");
        return write({
          ...state,
          coins: state.coins - v.cost,
          owned: [...state.owned, id],
          equipped: id,
        });
      },
      equip(id) {
        read();
        if (!state.owned.includes(id))
          throw new Error("Unlock this vehicle first");
        return write({ ...state, equipped: id });
      },
    };
  }
  const api = { KEY, VEHICLES, validate, createStore };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CyberProgress = api;
})(typeof globalThis === "object" ? globalThis : this);
