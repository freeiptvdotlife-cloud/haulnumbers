import { describe, expect, it } from "vitest";
import { calculateLoadProfit, validateLoadProfit, type LoadProfitInput } from "../src";

/** Worked example: gross 2400, 1000 total miles (20% deadhead), 7% fees. */
const base: LoadProfitInput = {
  linehaulRevenue: 2000,
  fuelSurcharge: 300,
  accessorials: 100,
  loadedMiles: 800,
  deadheadMiles: 200,
  mpg: 6.5,
  fuelPricePerGallon: 4,
  tolls: 50,
  otherTripCosts: 0,
  nonFuelCostPerMile: 0.3,
  dispatchFeePct: 0.05,
  factoringFeePct: 0.02,
  minProfitPerMile: 0.5,
};

/** Round numbers: cost is exactly $0.50/mi, so 100 loaded miles cost exactly $50. */
const simple: LoadProfitInput = {
  linehaulRevenue: 100,
  fuelSurcharge: 0,
  accessorials: 0,
  loadedMiles: 100,
  deadheadMiles: 0,
  mpg: 10,
  fuelPricePerGallon: 2,
  tolls: 0,
  otherTripCosts: 0,
  nonFuelCostPerMile: 0.3,
  dispatchFeePct: 0,
  factoringFeePct: 0,
  minProfitPerMile: 0.5,
};

function ok(input: LoadProfitInput) {
  const r = calculateLoadProfit(input);
  if (!r.ok) throw new Error("expected ok: " + JSON.stringify(r.errors));
  return r.value;
}

describe("calculateLoadProfit: happy path", () => {
  it("computes the worked example", () => {
    const v = ok(base);
    expect(v.grossRevenue).toBe(2400);
    expect(v.totalMiles).toBe(1000);
    expect(v.fees).toBe(168); // 7% of 2400
    expect(v.fuelCost).toBe(615.38); // 1000 / 6.5 * 4
    expect(v.otherCost).toBe(350); // 1000 * 0.30 + 50 tolls
    expect(v.netProfit).toBe(1266.62);
    expect(v.allInRatePerMile).toBe(2.4);
    expect(v.profitPerMile).toBe(1.267);
    expect(v.deadheadPct).toBe(0.2);
    expect(v.verdict).toBe("TAKE");
  });

  it("scales fees with revenue when computing the minimum rate", () => {
    const v = ok(base);
    // (615.3846 fuel + 350 other + 500 required profit) / (1 - 0.07) = 1575.68 (rounded up)
    expect(v.minRateToAccept).toBe(1575.69);
    expect(v.minRatePerMile).toBe(1.576);
    expect(v.minLinehaulToAccept).toBe(1175.69); // minus 300 fsc and 100 accessorials
  });

  it("reaches the required profit when gross revenue equals minRateToAccept", () => {
    const input = { ...base, fuelSurcharge: 0, accessorials: 0 };
    const min = ok(input).minRateToAccept;
    const v = ok({ ...input, linehaulRevenue: min });
    const required = base.minProfitPerMile * v.totalMiles;
    expect(v.netProfit).toBeGreaterThanOrEqual(required);
    expect(v.netProfit - required).toBeLessThan(0.02); // only round-up slack, so fees did scale
  });

  it("handles fractional miles and keeps outputs finite", () => {
    const v = ok({ ...base, loadedMiles: 412.7, deadheadMiles: 33.3 });
    expect(v.totalMiles).toBeCloseTo(446, 10);
    for (const n of Object.values(v)) {
      if (typeof n === "number") expect(Number.isFinite(n)).toBe(true);
    }
  });
});

describe("calculateLoadProfit: zero deadhead", () => {
  it("has 0% deadhead and total miles equal to loaded miles", () => {
    const v = ok({ ...base, deadheadMiles: 0 });
    expect(v.deadheadPct).toBe(0);
    expect(v.totalMiles).toBe(800);
  });

  it("makes all-in rate equal the loaded rate when there is no deadhead", () => {
    const v = ok({ ...base, deadheadMiles: 0 });
    expect(v.allInRatePerMile).toBe(3); // 2400 / 800
  });

  it("lets deadhead outweigh loaded miles", () => {
    const v = ok({ ...base, loadedMiles: 100, deadheadMiles: 300 });
    expect(v.deadheadPct).toBe(0.75);
  });
});

describe("calculateLoadProfit: verdict boundaries", () => {
  it("is TAKE exactly at the required profit", () => {
    const v = ok(simple); // net 50.00 == required 0.50 * 100
    expect(v.netProfit).toBe(50);
    expect(v.verdict).toBe("TAKE");
  });

  it("is NEGOTIATE one cent below the required profit", () => {
    const v = ok({ ...simple, linehaulRevenue: 99.99 });
    expect(v.netProfit).toBe(49.99);
    expect(v.verdict).toBe("NEGOTIATE");
  });

  it("is SKIP when profit is exactly zero", () => {
    const v = ok({ ...simple, linehaulRevenue: 50 });
    expect(v.netProfit).toBe(0);
    expect(v.verdict).toBe("SKIP");
  });

  it("is TAKE for any positive profit when there is no minimum", () => {
    const v = ok({ ...simple, linehaulRevenue: 50.01, minProfitPerMile: 0 });
    expect(v.verdict).toBe("TAKE");
  });

  it("is SKIP for zero revenue", () => {
    const v = ok({ ...simple, linehaulRevenue: 0 });
    expect(v.grossRevenue).toBe(0);
    expect(v.allInRatePerMile).toBe(0);
    expect(v.verdict).toBe("SKIP");
  });
});

describe("calculateLoadProfit: negative profit", () => {
  it("reports a loss and SKIP", () => {
    const v = ok({ ...base, linehaulRevenue: 500, fuelSurcharge: 0, accessorials: 0 });
    expect(v.netProfit).toBeLessThan(0);
    expect(v.profitPerMile).toBeLessThan(0);
    expect(v.verdict).toBe("SKIP");
  });

  it("still returns a positive counter-offer for a losing load", () => {
    const v = ok({ ...base, linehaulRevenue: 500, fuelSurcharge: 0, accessorials: 0 });
    expect(v.minRateToAccept).toBeGreaterThan(v.grossRevenue);
    expect(v.minLinehaulToAccept).toBe(v.minRateToAccept);
  });
});

describe("calculateLoadProfit: counter-offer", () => {
  it("turns NEGOTIATE into TAKE when the counter-offer linehaul is used", () => {
    const short = { ...base, linehaulRevenue: 1000 }; // nets $336.62, below the $500 minimum
    const first = ok(short);
    expect(first.verdict).toBe("NEGOTIATE");
    const second = ok({ ...short, linehaulRevenue: first.minLinehaulToAccept });
    expect(second.verdict).toBe("TAKE");
  });

  it("clamps the counter-offer to 0 when surcharge and accessorials already cover it", () => {
    const v = ok({ ...base, fuelSurcharge: 5000 });
    expect(v.minLinehaulToAccept).toBe(0);
    expect(v.verdict).toBe("TAKE");
  });

  it("does not add a spurious cent when the minimum is an exact number of cents", () => {
    const v = ok(simple);
    expect(v.minRateToAccept).toBe(100); // (50 costs + 50 profit) / 1, exactly
    expect(v.minRatePerMile).toBe(1);
  });
});

describe("validateLoadProfit: error handling", () => {
  it("rejects zero loaded miles and zero MPG without dividing by zero", () => {
    const r = calculateLoadProfit({ ...base, loadedMiles: 0, mpg: 0 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.field)).toEqual(["loadedMiles", "mpg"]);
  });

  it("allows zero deadhead but rejects negative deadhead", () => {
    expect(validateLoadProfit({ ...base, deadheadMiles: 0 })).toEqual([]);
    const errs = validateLoadProfit({ ...base, deadheadMiles: -1 });
    expect(errs.map((e) => e.field)).toEqual(["deadheadMiles"]);
  });

  it.each([
    "linehaulRevenue",
    "fuelSurcharge",
    "accessorials",
    "fuelPricePerGallon",
    "tolls",
    "otherTripCosts",
    "nonFuelCostPerMile",
    "minProfitPerMile",
  ] as const)("rejects a negative %s", (field) => {
    const errs = validateLoadProfit({ ...base, [field]: -0.01 });
    expect(errs).toEqual([{ field, message: "Must be 0 or more." }]);
  });

  it("rejects NaN and Infinity (e.g. an empty form field)", () => {
    const nan = calculateLoadProfit({ ...base, tolls: Number.NaN });
    const inf = calculateLoadProfit({ ...base, loadedMiles: Number.POSITIVE_INFINITY });
    expect(nan.ok).toBe(false);
    expect(inf.ok).toBe(false);
    if (nan.ok || inf.ok) return;
    expect(nan.errors.map((e) => e.field)).toEqual(["tolls"]);
    expect(inf.errors.map((e) => e.field)).toEqual(["loadedMiles"]);
  });

  it("rejects a fee at or above 100% and a negative fee", () => {
    const errs = validateLoadProfit({ ...base, dispatchFeePct: 1, factoringFeePct: -0.1 });
    // Individual errors only; the combined-fee error is skipped so the user sees one message per field.
    expect(errs.map((e) => e.field)).toEqual(["dispatchFeePct", "factoringFeePct"]);
  });

  it("rejects fees that are each valid but reach 100% together", () => {
    const errs = validateLoadProfit({ ...base, dispatchFeePct: 0.6, factoringFeePct: 0.4 });
    expect(errs).toEqual([
      { field: "factoringFeePct", message: "Dispatch and factoring fees together must be below 100%." },
    ]);
  });

  it("accepts fees just below 100% together", () => {
    const r = calculateLoadProfit({ ...base, dispatchFeePct: 0.5, factoringFeePct: 0.49 });
    expect(r.ok).toBe(true);
  });

  it("reports every problem at once, in a stable order", () => {
    const errs = validateLoadProfit({
      ...base,
      loadedMiles: -5,
      mpg: -1,
      tolls: Number.NaN,
      dispatchFeePct: 2,
    });
    expect(errs.map((e) => e.field)).toEqual(["loadedMiles", "mpg", "tolls", "dispatchFeePct"]);
  });

  it("never throws on hostile input, it returns errors", () => {
    const hostile = { ...base, loadedMiles: "800" as unknown as number };
    expect(() => calculateLoadProfit(hostile)).not.toThrow();
    const r = calculateLoadProfit(hostile);
    expect(r.ok).toBe(false);
  });
});
