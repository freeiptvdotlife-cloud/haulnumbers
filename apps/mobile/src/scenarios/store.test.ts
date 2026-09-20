import { MAX_PER_TOOL, NAME_MAX_LENGTH, ScenarioStore, STORAGE_KEY, type KeyValueStore } from "./store";

function memory(initial?: string): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return {
    data,
    async getItem(k) { return data.get(k) ?? null; },
    async setItem(k, v) { data.set(k, v); },
    async removeItem(k) { data.delete(k); },
  };
}
function setup(initial?: string) {
  let t = 1_000;
  const kv = memory(initial);
  return { kv, store: new ScenarioStore(kv, () => (t += 10)) };
}

describe("ScenarioStore: saving", () => {
  it("saves and lists newest first, per calculator", async () => {
    const { store } = setup();
    await store.save("cost-per-mile", "Denver lane", { miles: "9000" });
    await store.save("cost-per-mile", "Texas lane", { miles: "11000" });
    await store.save("ifta", "Q3", { quarter: "2026Q3" });
    expect((await store.list("cost-per-mile")).map((s) => s.name)).toEqual(["Texas lane", "Denver lane"]);
    expect((await store.list("ifta")).map((s) => s.name)).toEqual(["Q3"]);
    expect(await store.list("per-diem")).toEqual([]);
  });

  it("keeps the saved state exactly", async () => {
    const { store } = setup();
    const state = { miles: "9000", nested: { a: [1, 2] } };
    await store.save("load-profit", "x", state);
    expect((await store.list("load-profit"))[0]!.state).toEqual(state);
  });

  it("trims names and rejects blank or too-long ones without storing anything", async () => {
    const { store, kv } = setup();
    expect(await store.save("ifta", "   ", {})).toEqual({ ok: false, error: "Enter a name for this scenario." });
    const long = await store.save("ifta", "x".repeat(NAME_MAX_LENGTH + 1), {});
    expect(long.ok).toBe(false);
    expect(kv.data.has(STORAGE_KEY)).toBe(false);
    const ok = await store.save("ifta", "  Q3  ", {});
    expect(ok.ok && ok.scenario.name).toBe("Q3");
  });

  it("saving under an existing name replaces it (case-insensitive) and keeps its id", async () => {
    const { store } = setup();
    const first = await store.save("detention", "Dock A", { v: 1 });
    const second = await store.save("detention", "dock a", { v: 2 });
    expect(second.ok && second.replaced).toBe(true);
    expect(first.ok && second.ok && first.scenario.id === second.scenario.id).toBe(true);
    const list = await store.list("detention");
    expect(list).toHaveLength(1);
    expect(list[0]!.state).toEqual({ v: 2 });
  });

  it("the same name may exist under different calculators", async () => {
    const { store } = setup();
    await store.save("ifta", "Test", {});
    await store.save("per-diem", "Test", {});
    expect(await store.list("ifta")).toHaveLength(1);
    expect(await store.list("per-diem")).toHaveLength(1);
  });

  it(`enforces ${MAX_PER_TOOL} per calculator, but still allows replacing an existing one`, async () => {
    const { store } = setup();
    for (let i = 0; i < MAX_PER_TOOL; i++) expect((await store.save("ifta", `s${i}`, {})).ok).toBe(true);
    const over = await store.save("ifta", "one too many", {});
    expect(over.ok).toBe(false);
    expect((await store.save("ifta", "s0", { updated: true })).ok).toBe(true);
    expect((await store.save("per-diem", "different calculator", {})).ok).toBe(true);
    expect(await store.list("ifta")).toHaveLength(MAX_PER_TOOL);
  });

  it("two saves started together are both kept (no lost update)", async () => {
    const { store } = setup();
    await Promise.all([store.save("ifta", "a", {}), store.save("ifta", "b", {}), store.save("ifta", "c", {})]);
    expect((await store.list("ifta")).map((s) => s.name).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("ScenarioStore: removing and clearing", () => {
  it("removes one scenario by id and leaves the rest", async () => {
    const { store } = setup();
    const a = await store.save("ifta", "a", {});
    await store.save("ifta", "b", {});
    if (a.ok) await store.remove(a.scenario.id);
    expect((await store.list("ifta")).map((s) => s.name)).toEqual(["b"]);
  });

  it("removing an unknown id is harmless", async () => {
    const { store } = setup();
    await store.save("ifta", "a", {});
    await store.remove("nope");
    expect(await store.list("ifta")).toHaveLength(1);
  });

  it("clearAll wipes everything, across calculators", async () => {
    const { store, kv } = setup();
    await store.save("ifta", "a", {});
    await store.save("per-diem", "b", {});
    await store.clearAll();
    expect(kv.data.has(STORAGE_KEY)).toBe(false);
    expect(await store.list("ifta")).toEqual([]);
  });
});

describe("ScenarioStore: untrusted stored data", () => {
  it("treats corrupt JSON as empty and recovers on the next save", async () => {
    const { store } = setup("{not json");
    expect(await store.list("ifta")).toEqual([]);
    expect((await store.save("ifta", "fresh", {})).ok).toBe(true);
    expect(await store.list("ifta")).toHaveLength(1);
  });

  it("ignores a stored value that is not an array", async () => {
    expect(await setup('{"a":1}').store.list("ifta")).toEqual([]);
    expect(await setup("null").store.list("ifta")).toEqual([]);
  });

  it("skips malformed entries but keeps valid ones", async () => {
    const good = { id: "1", toolId: "ifta", name: "ok", savedAt: 5, state: {} };
    const bad = [null, 7, "x", {}, { ...good, id: "" }, { ...good, toolId: "bogus" }, { ...good, name: "" }, { ...good, savedAt: "5" }, { id: "2", toolId: "ifta", name: "n", savedAt: 1 }];
    const { store } = setup(JSON.stringify([...bad, good]));
    expect((await store.list("ifta")).map((s) => s.id)).toEqual(["1"]);
  });

  it("survives a backend that throws on read", async () => {
    const kv: KeyValueStore = { getItem: async () => { throw new Error("disk"); }, setItem: async () => {}, removeItem: async () => {} };
    expect(await new ScenarioStore(kv).list("ifta")).toEqual([]);
  });
});
