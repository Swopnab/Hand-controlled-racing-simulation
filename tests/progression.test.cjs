const test = require("node:test"),
  assert = require("node:assert/strict");
const { KEY, VEHICLES, createStore, validate } = require("../progression.js");
function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}
test("a fresh garage has a free ride and no earned coins", () => {
  const store = createStore(memory());
  assert.equal(store.snapshot().coins, 0);
  assert.deepEqual(store.snapshot().owned, ["street-bike"]);
  assert.equal(store.snapshot().equipped, "street-bike");
});
test("earned coins and unlocks survive a new store without charging twice", () => {
  const storage = memory(),
    store = createStore(storage);
  store.award(60);
  store.purchase("rally-car");
  assert.equal(store.snapshot().coins, 20);
  store.purchase("rally-car");
  assert.equal(store.snapshot().coins, 20);
  const restored = createStore(storage);
  assert.equal(restored.snapshot().equipped, "rally-car");
  assert(restored.snapshot().owned.includes("rally-car"));
  restored.equip("street-bike");
  assert.equal(restored.snapshot().coins, 20);
  assert.equal(createStore(storage).snapshot().equipped, "street-bike");
});
test("insufficient funds, unknown rides and invalid awards never mutate a wallet", () => {
  const store = createStore(memory());
  store.award(39);
  for (const action of [
    () => store.purchase("rally-car"),
    () => store.purchase("missing"),
    () => store.equip("rally-car"),
    () => store.award(-1),
    () => store.award(1.5),
  ])
    assert.throws(action);
  assert.equal(store.snapshot().coins, 39);
  assert.deepEqual(store.snapshot().owned, ["street-bike"]);
});
test("purchasing at the exact price never makes a negative balance", () => {
  const store = createStore(memory()),
    cost = VEHICLES.find((v) => v.id === "rally-car").cost;
  store.award(cost);
  store.purchase("rally-car");
  assert.equal(store.snapshot().coins, 0);
  assert.throws(() => store.purchase("midnight-gt"));
  assert.equal(store.snapshot().coins, 0);
});
test("corrupt or unbounded saves recover safely", () => {
  for (const coins of [-1, Infinity, 4.2, 10000001, "100"])
    assert.equal(validate({ coins, owned: [] }).coins, 0);
  const value = validate({
    coins: 9,
    owned: ["missing", "rally-car", "rally-car"],
    equipped: "missing",
  });
  assert.deepEqual(value.owned, ["street-bike", "rally-car"]);
  assert.equal(value.equipped, "street-bike");
  const storage = memory();
  storage.setItem(KEY, "{bad");
  assert.equal(createStore(storage).snapshot().persistent, false);
});
test("unavailable or full storage keeps consecutive coin awards in memory", () => {
  for (const storage of [
    undefined,
    {
      getItem: () => null,
      setItem: () => {
        throw new Error("Full");
      },
    },
    {
      getItem: () => {
        throw new Error("Blocked");
      },
      setItem: () => {
        throw new Error("Blocked");
      },
    },
  ]) {
    const store = createStore(storage);
    store.award(20);
    store.award(20);
    store.purchase("rally-car");
    store.award(3);
    assert.equal(store.snapshot().coins, 3);
    assert.equal(store.snapshot().equipped, "rally-car");
    assert.equal(store.snapshot().persistent, false);
  }
});
test("sequential changes in another tab are refreshed before spending", () => {
  const storage = memory(),
    first = createStore(storage),
    second = createStore(storage);
  first.award(40);
  second.purchase("rally-car");
  assert.equal(first.refresh().coins, 0);
  assert(first.snapshot().owned.includes("rally-car"));
});
