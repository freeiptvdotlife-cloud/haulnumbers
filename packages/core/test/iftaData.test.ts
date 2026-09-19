import { describe, expect, it } from "vitest";
import { IFTA_RATE_TABLES, IFTA_STATE_NAMES, getIftaRateTable } from "../src";
import { US_STATES, validateRateFile } from "../tools/iftaMatrix.mjs";

describe("IFTA rate data integrity", () => {
  it.each(IFTA_RATE_TABLES.map((t) => t.quarter))("%s passes the pipeline's own validation", (quarter) => {
    const table = getIftaRateTable(quarter)!;
    expect(validateRateFile(table as never)).toEqual([]);
  });

  it("has a name for every jurisdiction and no extras", () => {
    expect(Object.keys(IFTA_STATE_NAMES).sort()).toEqual([...US_STATES].sort());
  });

  it("only lists surcharges in jurisdictions that really have them (KY, VA)", () => {
    for (const t of IFTA_RATE_TABLES) {
      const withSurcharge = Object.entries(t.rates).filter(([, r]) => r.surcharge > 0).map(([c]) => c);
      expect(withSurcharge.sort()).toEqual(["KY", "VA"]);
    }
  });

  it("marks only not-yet-final quarters as preliminary, with a final date", () => {
    for (const t of IFTA_RATE_TABLES) {
      expect(t.status === "preliminary").toBe(t.finalDate !== null);
    }
  });
});

describe("IFTA rate freshness policy (fails when the current quarter's rates are missing)", () => {
  it("has a rate table for the current calendar quarter", () => {
    const now = new Date();
    const quarter = `${now.getUTCFullYear()}Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
    expect(
      getIftaRateTable(quarter),
      `No IFTA rates for ${quarter}. Run: node packages/core/tools/updateIftaRates.mjs ${quarter}`,
    ).toBeDefined();
  });
});
