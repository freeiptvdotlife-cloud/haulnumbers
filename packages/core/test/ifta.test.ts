import { describe, expect, it } from "vitest";
import {
  calculateIfta,
  getIftaRateTable,
  listIftaQuarters,
  validateIfta,
  type IftaInput,
  type IftaRateTable,
} from "../src";

/** Synthetic table with round rates so every expected figure below can be checked by hand. */
const table: IftaRateTable = {
  quarter: "2099Q1",
  status: "final",
  finalDate: null,
  source: "test",
  sourceUrl: "https://www.iftach.org/taxmatrix4/Taxmatrix.php?QY=1Q2099",
  retrievedAt: "2099-01-01",
  fuel: "special diesel",
  unit: "USD per US gallon",
  blankDiesel: ["OR"],
  rates: {
    TX: { base: 0.2, surcharge: 0 },
    KY: { base: 0.22, surcharge: 0.105 },
    CA: { base: 0.979, surcharge: 0 },
    OR: { base: 0, surcharge: 0 },
  },
};

const row = (code: string, miles: number, taxPaidGallons: number, exemptMiles = 0) => ({
  code, miles, taxPaidGallons, exemptMiles,
});
const input = (jurisdictions: IftaInput["jurisdictions"], untaxedGallons = 0): IftaInput => ({
  quarter: "2099Q1", jurisdictions, untaxedGallons,
});
function ok(i: IftaInput) {
  const r = calculateIfta(i, table);
  if (!r.ok) throw new Error("expected ok: " + JSON.stringify(r.errors));
  return r.value;
}

describe("calculateIfta: hand-computed three-state return", () => {
  // 10,000 miles / 1,250 gallons = 8.00 MPG.
  const v = ok(input([row("TX", 6000, 900), row("KY", 2000, 100), row("CA", 2000, 250)]));

  it("computes fleet MPG from total miles and total gallons", () => {
    expect(v.totalMiles).toBe(10000);
    expect(v.totalGallons).toBe(1250);
    expect(v.fleetMpg).toBe(8);
  });

  it("gives Texas a credit (bought more than burned): 750 - 900 = -150 gal x $0.20", () => {
    const tx = v.jurisdictions[0]!;
    expect(tx.taxableGallons).toBe(750);
    expect(tx.netTaxableGallons).toBe(-150);
    expect(tx.tax).toBe(-30);
  });

  it("charges Kentucky base tax plus a separate surcharge on all taxable gallons", () => {
    const ky = v.jurisdictions[1]!;
    expect(ky.taxableGallons).toBe(250);
    expect(ky.tax).toBe(33); // (250 - 100) x 0.22
    expect(ky.surcharge).toBe(26.25); // 250 x 0.105, tax-paid gallons NOT deducted
    expect(ky.total).toBe(59.25);
  });

  it("owes nothing where taxable and tax-paid gallons match", () => {
    expect(v.jurisdictions[2]!.total).toBe(0);
  });

  it("sums credits and dues: -30 + 33 + 26.25 + 0 = 29.25", () => {
    expect(v.netTax).toBe(29.25);
  });
});

describe("calculateIfta: surcharge is never a credit", () => {
  it("still owes the surcharge when Kentucky purchases exceed consumption", () => {
    const v = ok(input([row("TX", 8000, 100), row("KY", 2000, 900)]));
    const ky = v.jurisdictions[1]!;
    expect(ky.netTaxableGallons).toBeLessThan(0);
    expect(ky.tax).toBeLessThan(0); // base is a credit
    expect(ky.surcharge).toBeGreaterThan(0); // surcharge still due
  });
});

describe("calculateIfta: rounding follows the paper return", () => {
  it("rounds fleet MPG half up: 5.765 -> 5.77 (float math would give 5.76)", () => {
    const v = ok(input([row("TX", 5765, 1000)]));
    expect(v.fleetMpg).toBe(5.77);
    // 5765 / 5.77 = 999.13 -> 999 gallons; 999 - 1000 = -1 gal x 0.20
    expect(v.jurisdictions[0]!.taxableGallons).toBe(999);
    expect(v.jurisdictions[0]!.tax).toBe(-0.2);
  });

  it("rounds taxable gallons half up: 0.5 -> 1 and 1249.5 -> 1250", () => {
    const v = ok(input([row("TX", 4, 0), row("CA", 9996, 1250)]));
    expect(v.fleetMpg).toBe(8);
    expect(v.jurisdictions[0]!.taxableGallons).toBe(1);
    expect(v.jurisdictions[1]!.taxableGallons).toBe(1250);
  });

  it("rounds each tax line to the cent, half away from zero", () => {
    // 1 gallon x $0.979 = $0.979 -> $0.98 due; the mirror case is a $0.98 credit.
    const due = ok(input([row("CA", 8, 0), row("TX", 992, 125)])); // 1000 mi / 125 gal = 8.00 MPG
    expect(due.jurisdictions[0]!.netTaxableGallons).toBe(1);
    expect(due.jurisdictions[0]!.tax).toBe(0.98);
    const credit = ok(input([row("CA", 0, 1), row("TX", 1000, 124)]));
    expect(credit.jurisdictions[0]!.netTaxableGallons).toBe(-1);
    expect(credit.jurisdictions[0]!.tax).toBe(-0.98);
  });

  it("rounds entered miles and gallons to whole numbers first", () => {
    const v = ok(input([row("TX", 1000.5, 200.4)]));
    expect(v.totalMiles).toBe(1001);
    expect(v.totalGallons).toBe(200);
  });
});

describe("calculateIfta: exempt miles, untaxed fuel and blank rates", () => {
  it("counts exempt miles in fleet MPG but not in taxable gallons", () => {
    const v = ok(input([row("TX", 6000, 900, 1000), row("KY", 2000, 100), row("CA", 2000, 250)]));
    expect(v.fleetMpg).toBe(8); // still 10,000 total miles
    expect(v.jurisdictions[0]!.taxableMiles).toBe(5000);
    expect(v.jurisdictions[0]!.taxableGallons).toBe(625);
  });

  it("counts untaxed (e.g. bulk) gallons in the MPG denominator only", () => {
    const v = ok(input([row("TX", 10000, 1000)], 250));
    expect(v.totalGallons).toBe(1250);
    expect(v.fleetMpg).toBe(8);
    expect(v.jurisdictions[0]!.netTaxableGallons).toBe(1250 - 1000);
  });

  it("counts Oregon miles for MPG but owes no diesel tax there", () => {
    const v = ok(input([row("TX", 6000, 1000), row("OR", 2000, 0)]));
    expect(v.fleetMpg).toBe(8);
    const or = v.jurisdictions[1]!;
    expect(or.taxableGallons).toBe(250);
    expect(or.total).toBe(0);
  });
});

describe("calculateIfta: warnings and result metadata", () => {
  it("warns when fleet MPG looks wrong, e.g. miles and gallons swapped", () => {
    expect(ok(input([row("TX", 100, 5000)])).warnings).toHaveLength(1);
    expect(ok(input([row("TX", 60000, 1000)])).warnings).toHaveLength(1);
    expect(ok(input([row("TX", 6500, 1000)])).warnings).toEqual([]);
  });

  it("reports the rate table's status and retrieval date", () => {
    const v = ok(input([row("TX", 800, 100)]));
    expect(v).toMatchObject({ quarter: "2099Q1", rateStatus: "final", rateFinalDate: null, ratesRetrievedAt: "2099-01-01" });
  });

  it("uses the shipped table when none is passed", () => {
    const r = calculateIfta({ quarter: "2026Q3", jurisdictions: [row("CA", 800, 100)], untaxedGallons: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.jurisdictions[0]!.baseRate).toBe(0.979);
  });
});

describe("validateIfta: error handling", () => {
  it("rejects an unknown quarter", () => {
    const r = calculateIfta({ quarter: "1999Q1", jurisdictions: [row("TX", 1, 1)], untaxedGallons: 0 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]!.field).toBe("quarter");
  });

  it("rejects empty and oversized state lists", () => {
    expect(validateIfta(input([]), table)[0]!.field).toBe("jurisdictions");
    const many = Array.from({ length: 49 }, () => row("TX", 1, 1));
    expect(validateIfta(input(many), table)[0]!.field).toBe("jurisdictions");
    expect(validateIfta({ ...input([]), jurisdictions: undefined as unknown as [] }, table)[0]!.field).toBe("jurisdictions");
  });

  it("rejects unknown and duplicate states, indexed to the offending row", () => {
    const errs = validateIfta(input([row("TX", 1, 1), row("ZZ", 1, 1), row("TX", 1, 1)]), table);
    expect(errs).toEqual([
      { field: "jurisdictions[1].code", message: "Choose a state." },
      { field: "jurisdictions[2].code", message: "Each state can only be listed once." },
    ]);
  });

  it("rejects negative, NaN, non-number and huge values", () => {
    const errs = validateIfta(
      input([{ code: "TX", miles: -1, exemptMiles: Number.NaN, taxPaidGallons: 10_000_001 }], -5),
      table,
    );
    expect(errs.map((e) => e.field)).toEqual([
      "untaxedGallons",
      "jurisdictions[0].miles",
      "jurisdictions[0].exemptMiles",
      "jurisdictions[0].taxPaidGallons",
    ]);
    expect(validateIfta(input([{ code: "TX", miles: "5" as unknown as number, exemptMiles: 0, taxPaidGallons: 1 }]), table)).toHaveLength(1);
  });

  it("rejects exempt miles above miles", () => {
    const errs = validateIfta(input([row("TX", 100, 10, 101)]), table);
    expect(errs).toEqual([{ field: "jurisdictions[0].exemptMiles", message: "Exempt miles cannot exceed the miles driven." }]);
    expect(validateIfta(input([row("TX", 100, 10, 100)]), table)).toEqual([]);
  });

  it("rejects zero total miles and zero total gallons instead of dividing by zero", () => {
    const noMiles = calculateIfta(input([row("TX", 0, 100)]), table);
    const noGallons = calculateIfta(input([row("TX", 100, 0)]), table);
    for (const r of [noMiles, noGallons]) {
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.errors[0]!.field).toBe("jurisdictions");
    }
  });

  it("rejects an MPG that rounds to zero", () => {
    const r = calculateIfta(input([row("TX", 1, 1000)]), table);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]!.message).toMatch(/below 0\.01/);
  });

  it("never throws on a missing row", () => {
    const bad = input([undefined as unknown as IftaInput["jurisdictions"][number]]);
    expect(() => calculateIfta(bad, table)).not.toThrow();
    expect(calculateIfta(bad, table).ok).toBe(false);
  });
});

describe("shipped rate tables", () => {
  it("lists newest quarter first and finds each table", () => {
    const quarters = listIftaQuarters();
    expect(quarters[0]).toBe("2026Q4");
    for (const q of quarters) expect(getIftaRateTable(q)?.quarter).toBe(q);
    expect(getIftaRateTable("1999Q1")).toBeUndefined();
  });

  it("matches rates confirmed independently for 2026Q3", () => {
    const t = getIftaRateTable("2026Q3")!;
    expect(t.rates.CA!.base).toBe(0.979); // also reported as up from 0.971 on 2026-07-01
    expect(t.rates.PA!.base).toBe(0.741);
    expect(t.rates.TX!.base).toBe(0.2);
    expect(getIftaRateTable("2026Q2")!.rates.CA!.base).toBe(0.971);
  });
});

describe("worked example on the IFTA calculator page", () => {
  it("gives $29.25 net with the real 2026Q3 rates (same numbers as the hand-computed return)", () => {
    const r = calculateIfta({
      quarter: "2026Q3",
      untaxedGallons: 0,
      jurisdictions: [row("TX", 6000, 900), row("KY", 2000, 100), row("CA", 2000, 250)],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.netTax).toBe(29.25);
    expect(r.value.jurisdictions.map((j) => j.total)).toEqual([-30, 59.25, 0]);
  });
});
