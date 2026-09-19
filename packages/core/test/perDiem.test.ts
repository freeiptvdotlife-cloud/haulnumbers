import { describe, expect, it } from "vitest";
import {
  MEAL_DEDUCTIBLE_PERCENT,
  PER_DIEM_TABLES,
  calculatePerDiem,
  getPerDiemTable,
  listPerDiemPeriods,
  validatePerDiem,
  type PerDiemInput,
  type PerDiemTable,
} from "../src";

const base: PerDiemInput = {
  period: "2025-2026",
  area: "conus",
  fullDays: 10,
  partialDays: 2,
  subjectToHoursOfService: true,
  marginalTaxRatePercent: 25,
};
function ok(input: PerDiemInput, table?: PerDiemTable) {
  const r = calculatePerDiem(input, table);
  if (!r.ok) throw new Error("expected ok: " + JSON.stringify(r.errors));
  return r.value;
}
const oddTable: PerDiemTable = {
  period: "2099-2100", effectiveFrom: "2099-10-01", effectiveThrough: "2100-09-30", notice: "Test", source: "test",
  sourceUrl: "https://www.irs.gov/x", retrievedAt: "2099-09-01", transportation: { conus: 80.33, oconus: 86 },
};

describe("calculatePerDiem: hand-computed", () => {
  it("10 full + 2 partial days at $80, 80% deductible, 25% rate", () => {
    const v = ok(base);
    expect(v.dailyRate).toBe(80);
    expect(v.partialDayRate).toBe(60); // 3/4 of 80
    expect(v.dayEquivalents).toBe(11.5); // 10 + 2 x 0.75
    expect(v.perDiemTotal).toBe(920); // 11.5 x 80
    expect(v.deductiblePercent).toBe(80);
    expect(v.deductibleAmount).toBe(736);
    expect(v.estimatedTaxSavings).toBe(184); // 736 x 25%
  });

  it("uses the outside-continental-U.S. rate", () => {
    const v = ok({ ...base, area: "oconus" });
    expect(v.dailyRate).toBe(86);
    expect(v.partialDayRate).toBe(64.5);
    expect(v.perDiemTotal).toBe(989); // 11.5 x 86
    expect(v.deductibleAmount).toBe(791.2);
  });

  it("deducts only 50% when not subject to hours-of-service limits", () => {
    const v = ok({ ...base, subjectToHoursOfService: false });
    expect(v.deductiblePercent).toBe(50);
    expect(v.deductibleAmount).toBe(460);
    expect(v.estimatedTaxSavings).toBe(115);
  });

  it("handles only partial days, only full days, and a zero tax rate", () => {
    expect(ok({ ...base, fullDays: 0, partialDays: 2 }).perDiemTotal).toBe(120);
    expect(ok({ ...base, fullDays: 3, partialDays: 0 }).perDiemTotal).toBe(240);
    expect(ok({ ...base, marginalTaxRatePercent: 0 }).estimatedTaxSavings).toBe(0);
  });

  it("keeps a fractional tax rate exact (22.5% of $736 = $165.60)", () => {
    expect(ok({ ...base, marginalTaxRatePercent: 22.5 }).estimatedTaxSavings).toBe(165.6);
  });

  it("rounds to the cent, half up, when a rate is not a multiple of 4 cents", () => {
    const v = ok({ ...base, fullDays: 0, partialDays: 1 }, oddTable);
    expect(v.partialDayRate).toBe(60.25); // 80.33 x 0.75 = 60.2475
    expect(v.perDiemTotal).toBe(60.25);
    expect(ok({ ...base, fullDays: 1, partialDays: 0 }, oddTable).perDiemTotal).toBe(80.33);
  });

  it("reports the source and rate date with the result", () => {
    const v = ok(base);
    expect(v).toMatchObject({ period: "2025-2026", notice: "Notice 2025-54", ratesRetrievedAt: "2026-09-19" });
    expect(v.sourceUrl).toContain("irs.gov");
  });

  it("allows a full year of days", () => {
    expect(ok({ ...base, fullDays: 366, partialDays: 0 }).perDiemTotal).toBe(29280);
  });
});

describe("validatePerDiem: error handling", () => {
  it("rejects zero days and more than a year", () => {
    expect(validatePerDiem({ ...base, fullDays: 0, partialDays: 0 }, getPerDiemTable("2025-2026"))).toEqual([
      { field: "fullDays", message: "Enter at least one day away from home." },
    ]);
    expect(validatePerDiem({ ...base, fullDays: 300, partialDays: 100 }, getPerDiemTable("2025-2026"))[0]!.message).toMatch(/cannot exceed 366/);
  });

  it("rejects fractional, negative, NaN, non-number and huge day counts", () => {
    for (const bad of [1.5, -1, Number.NaN, "3" as unknown as number, 367]) {
      const errs = validatePerDiem({ ...base, fullDays: bad }, getPerDiemTable("2025-2026"));
      expect(errs.map((e) => e.field)).toEqual(["fullDays"]);
    }
    expect(validatePerDiem({ ...base, partialDays: 1.2 }, getPerDiemTable("2025-2026")).map((e) => e.field)).toEqual(["partialDays"]);
  });

  it("rejects an unknown period and area", () => {
    const r = calculatePerDiem({ ...base, period: "1999-2000", area: "mars" as never });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.field)).toEqual(["period", "area"]);
  });

  it("rejects out-of-range and non-numeric tax rates", () => {
    for (const bad of [-1, 100.01, Number.NaN, "25" as unknown as number]) {
      expect(validatePerDiem({ ...base, marginalTaxRatePercent: bad }, getPerDiemTable("2025-2026")).map((e) => e.field)).toEqual(["marginalTaxRatePercent"]);
    }
    expect(validatePerDiem({ ...base, marginalTaxRatePercent: 100 }, getPerDiemTable("2025-2026"))).toEqual([]);
  });

  it("rejects a non-boolean hours-of-service answer", () => {
    expect(validatePerDiem({ ...base, subjectToHoursOfService: "yes" as never }, getPerDiemTable("2025-2026")).map((e) => e.field)).toEqual(["subjectToHoursOfService"]);
  });
});

describe("IRS per diem data", () => {
  it("has the transportation rates from Notice 2025-54 ($80 continental, $86 outside)", () => {
    const t = getPerDiemTable("2025-2026")!;
    expect(t.transportation).toEqual({ conus: 80, oconus: 86 });
    expect(t.effectiveFrom).toBe("2025-10-01");
    expect(t.effectiveThrough).toBe("2026-09-30");
  });

  it("lists periods newest first and returns undefined for unknown ones", () => {
    expect(listPerDiemPeriods()[0]).toBe("2025-2026");
    expect(getPerDiemTable("nope")).toBeUndefined();
  });

  it("uses Publication 463's 80% (hours of service) and 50% meal percentages", () => {
    expect(MEAL_DEDUCTIBLE_PERCENT).toEqual({ hoursOfService: 80, other: 50 });
  });

  it.each(PER_DIEM_TABLES.map((t) => t.period))("%s is complete, sourced and internally consistent", (period) => {
    const t = getPerDiemTable(period)!;
    expect(t.sourceUrl.startsWith("https://www.irs.gov/")).toBe(true);
    expect(t.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(t.effectiveFrom < t.effectiveThrough).toBe(true);
    expect(t.effectiveFrom.slice(5)).toBe("10-01");
    expect(t.effectiveThrough.slice(5)).toBe("09-30");
    expect(t.transportation.conus).toBeGreaterThan(0);
    expect(t.transportation.oconus).toBeGreaterThanOrEqual(t.transportation.conus);
  });
});

describe("per diem freshness policy (fails when no table covers today)", () => {
  it("has a rate table whose dates include today", () => {
    const today = new Date().toISOString().slice(0, 10);
    const covering = PER_DIEM_TABLES.find((t) => t.effectiveFrom <= today && today <= t.effectiveThrough);
    expect(
      covering,
      `No IRS per diem rates cover ${today}. Add the new annual notice's transportation rates (see docs/06).`,
    ).toBeDefined();
  });
});
