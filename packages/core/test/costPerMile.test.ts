import { describe, expect, it } from "vitest";
import { calculateCostPerMile, type CostPerMileInput } from "../src";

const base: CostPerMileInput = {
  miles: 10000,
  fixed: { truckPayment: 2000, insurance: 1500, permitsAndFees: 300, other: 200 },
  variable: {
    mpg: 6.5,
    fuelPricePerGallon: 3.9,
    maintenancePerMile: 0.15,
    tiresPerMile: 0.05,
    otherPerMile: 0,
  },
  driverPayPerMile: 0,
  targetProfitMargin: 0.1,
};

describe("calculateCostPerMile", () => {
  it("computes fixed, fuel and total cost per mile", () => {
    const r = calculateCostPerMile(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.fixedTotal).toBe(4000);
    expect(r.value.fixedPerMile).toBe(0.4);
    expect(r.value.fuelPerMile).toBe(0.6);
    // 0.4 fixed + 0.6 fuel + 0.15 maint + 0.05 tires
    expect(r.value.costPerMile).toBe(1.2);
    expect(r.value.totalCost).toBe(12000);
    expect(r.value.breakEvenRatePerMile).toBe(1.2);
  });

  it("derives target rate from margin on revenue, not markup", () => {
    const r = calculateCostPerMile(base);
    if (!r.ok) throw new Error("expected ok");
    // 1.2 / 0.9 = 1.3333 -> 1.333
    expect(r.value.targetRatePerMile).toBe(1.333);
    // 13333.33 revenue - 12000 cost
    expect(r.value.targetProfit).toBe(1333.33);
  });

  it("includes driver pay in variable cost", () => {
    const r = calculateCostPerMile({ ...base, driverPayPerMile: 0.5 });
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.costPerMile).toBe(1.7);
  });

  it("rejects zero miles and zero mpg without dividing by zero", () => {
    const r = calculateCostPerMile({ ...base, miles: 0, variable: { ...base.variable, mpg: 0 } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.field)).toEqual(["miles", "variable.mpg"]);
  });

  it("rejects negatives, NaN and out-of-range margin", () => {
    const r = calculateCostPerMile({
      ...base,
      fixed: { ...base.fixed, insurance: -1 },
      driverPayPerMile: Number.NaN,
      targetProfitMargin: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.field)).toEqual([
      "fixed.insurance",
      "driverPayPerMile",
      "targetProfitMargin",
    ]);
  });

  it("allows zero margin (break-even only)", () => {
    const r = calculateCostPerMile({ ...base, targetProfitMargin: 0 });
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.targetRatePerMile).toBe(r.value.breakEvenRatePerMile);
    expect(r.value.targetProfit).toBe(0);
  });
});
