import { sanitizeIftaState } from "./iftaState";

const good = { quarter: "2026Q3", untaxed: "10", rows: [{ id: 9, code: "TX", miles: "6000", exempt: "0", gallons: "900" }, { id: 4, code: "KY", miles: "2000", exempt: "5", gallons: "100" }] };

describe("sanitizeIftaState", () => {
  it("restores a valid snapshot and renumbers the rows", () => {
    const s = sanitizeIftaState(good, "2026Q3");
    expect(s.quarter).toBe("2026Q3");
    expect(s.untaxed).toBe("10");
    expect(s.rows.map((r) => [r.id, r.code, r.miles, r.exempt, r.gallons])).toEqual([[1, "TX", "6000", "0", "900"], [2, "KY", "2000", "5", "100"]]);
  });
  it("falls back to the given quarter when the saved one is unknown", () => {
    expect(sanitizeIftaState({ ...good, quarter: "1999Q1" }, "2026Q3").quarter).toBe("2026Q3");
    expect(sanitizeIftaState({ ...good, quarter: 7 }, "2026Q2").quarter).toBe("2026Q2");
  });
  it("blanks an unknown or malicious state code but keeps the row", () => {
    const s = sanitizeIftaState({ rows: [{ code: "ZZ", miles: "1" }, { code: "__proto__", miles: "2" }, { code: 5 }] }, "2026Q3");
    expect(s.rows.map((r) => r.code)).toEqual(["", "", ""]);
  });
  it("replaces wrong-typed or oversized fields with defaults", () => {
    const s = sanitizeIftaState({ untaxed: 5, rows: [{ code: "TX", miles: 100, exempt: null, gallons: "x".repeat(40) }] }, "2026Q3");
    expect(s.untaxed).toBe("0");
    expect(s.rows[0]).toEqual({ id: 1, code: "TX", miles: "", exempt: "0", gallons: "" });
  });
  it("caps the number of rows at 48", () => {
    const rows = Array.from({ length: 80 }, () => ({ code: "TX", miles: "1" }));
    expect(sanitizeIftaState({ rows }, "2026Q3").rows).toHaveLength(48);
  });
  it("always leaves at least one blank row, whatever it is given", () => {
    for (const bad of [null, undefined, 5, "x", [], {}, { rows: [] }, { rows: "no" }]) {
      const s = sanitizeIftaState(bad, "2026Q3");
      expect(s.rows).toHaveLength(1);
      expect(s.rows[0]).toEqual({ id: 1, code: "", miles: "", exempt: "0", gallons: "" });
    }
  });
});
