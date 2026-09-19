import { describe, expect, it } from "vitest";
import {
  calculateDetention,
  minutesBetween,
  validateDetention,
  type BillingIncrement,
  type DetentionInput,
} from "../src";

const base: DetentionInput = {
  stops: [{ minutesOnSite: 240 }],
  freeMinutes: 120,
  hourlyRate: 60,
  billingIncrement: 0,
  layoverDays: 0,
  layoverRatePerDay: 0,
};

function ok(input: DetentionInput) {
  const r = calculateDetention(input);
  if (!r.ok) throw new Error("expected ok: " + JSON.stringify(r.errors));
  return r.value;
}
function mins(a: string, d: string, days?: number) {
  const r = minutesBetween(a, d, days);
  if (!r.ok) throw new Error("expected ok: " + JSON.stringify(r.errors));
  return r.value;
}

describe("minutesBetween: clock times and midnight", () => {
  it("measures a same-day wait", () => {
    expect(mins("08:00", "10:30")).toBe(150);
    expect(mins("00:00", "23:59")).toBe(1439);
  });

  it("treats an earlier departure as the next day (midnight crossing)", () => {
    expect(mins("22:30", "01:15")).toBe(165);
    expect(mins("23:59", "00:00")).toBe(1);
    expect(mins("18:00", "06:00")).toBe(720);
  });

  it("treats identical times as 0, and as 24 h only with a day added", () => {
    expect(mins("08:00", "08:00")).toBe(0);
    expect(mins("08:00", "08:00", 1)).toBe(1440);
  });

  it("adds whole extra days on top of the clock difference", () => {
    expect(mins("22:00", "02:00", 1)).toBe(240 + 1440);
    expect(mins("08:00", "09:00", 2)).toBe(60 + 2880);
  });

  it.each(["", "9:30", "24:00", "12:60", "12:5", "ab:cd", "12:30:00", " 12:30"])(
    "rejects the malformed time %j",
    (bad) => {
      const r = minutesBetween(bad, "10:00");
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.errors.map((e) => e.field)).toEqual(["arrival"]);
    },
  );

  it("names both times and the days field when several are wrong", () => {
    const r = minutesBetween("x", "y", -1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.field)).toEqual(["arrival", "departure", "extraDays"]);
  });

  it("rejects non-integer, negative and non-number day counts", () => {
    for (const bad of [1.5, -1, Number.NaN, "1" as unknown as number]) {
      expect(minutesBetween("08:00", "09:00", bad).ok).toBe(false);
    }
  });

  it("rejects a non-string time without throwing", () => {
    expect(minutesBetween(null as unknown as string, "09:00").ok).toBe(false);
  });
});

describe("calculateDetention: free time boundary", () => {
  it("pays nothing exactly at the free time", () => {
    const v = ok({ ...base, stops: [{ minutesOnSite: 120 }] });
    expect(v.stops[0]?.minutesOverFree).toBe(0);
    expect(v.totalPay).toBe(0);
  });

  it("pays nothing inside the free time", () => {
    expect(ok({ ...base, stops: [{ minutesOnSite: 45 }] }).totalPay).toBe(0);
    expect(ok({ ...base, stops: [{ minutesOnSite: 0 }] }).totalPay).toBe(0);
  });

  it("pays 2 h at $60 for a 4 h stay with 2 h free", () => {
    const v = ok(base);
    expect(v.stops[0]).toEqual({ minutesOnSite: 240, minutesOverFree: 120, billableMinutes: 120, pay: 120 });
    expect(v.detentionPay).toBe(120);
    expect(v.totalPay).toBe(120);
  });

  it("supports zero free time", () => {
    expect(ok({ ...base, freeMinutes: 0, stops: [{ minutesOnSite: 60 }] }).totalPay).toBe(60);
  });
});

describe("calculateDetention: billing increments round up", () => {
  const oneMinuteOver = { ...base, stops: [{ minutesOnSite: 121 }] };
  it.each<[BillingIncrement, number, number]>([
    [0, 1, 1],
    [15, 15, 15],
    [30, 30, 30],
    [60, 60, 60],
  ])("increment %i: 1 minute over bills %i minutes ($%f)", (inc, billable, pay) => {
    const v = ok({ ...oneMinuteOver, billingIncrement: inc });
    expect(v.stops[0]?.billableMinutes).toBe(billable);
    expect(v.stops[0]?.pay).toBe(pay);
  });

  it("does not add a block when the time is an exact multiple", () => {
    for (const inc of [15, 30, 60] as const) {
      const v = ok({ ...base, billingIncrement: inc, stops: [{ minutesOnSite: 120 + 60 }] });
      expect(v.stops[0]?.billableMinutes).toBe(60);
    }
  });

  it("rounds 61 minutes over up to the next block", () => {
    const v = ok({ ...base, billingIncrement: 30, stops: [{ minutesOnSite: 120 + 61 }] });
    expect(v.stops[0]?.billableMinutes).toBe(90);
  });

  it("prorates exact minutes to the cent", () => {
    // 25 minutes at $50/h = 20.8333...
    const v = ok({ ...base, hourlyRate: 50, stops: [{ minutesOnSite: 145 }] });
    expect(v.detentionPay).toBe(20.83);
  });
});

describe("calculateDetention: several stops and layover", () => {
  it("applies free time per stop, never pooled across stops", () => {
    // Pickup 3 h (1 h over), delivery 1 h (within free): 1 h billable, not 4 h - 2 h = 2 h.
    const v = ok({ ...base, stops: [{ minutesOnSite: 180 }, { minutesOnSite: 60 }] });
    expect(v.stops.map((s) => s.billableMinutes)).toEqual([60, 0]);
    expect(v.totalBillableMinutes).toBe(60);
    expect(v.detentionPay).toBe(60);
  });

  it("sums per-stop pay in whole cents", () => {
    const v = ok({
      ...base,
      hourlyRate: 33.33,
      stops: [{ minutesOnSite: 140 }, { minutesOnSite: 140 }, { minutesOnSite: 140 }],
    });
    // Each stop: 20 min x 33.33/60 = 11.11 exactly to the cent; three stops = 33.33.
    expect(v.stops.map((s) => s.pay)).toEqual([11.11, 11.11, 11.11]);
    expect(v.detentionPay).toBe(33.33);
  });

  it("adds a flat layover on top of detention", () => {
    const v = ok({ ...base, layoverDays: 2, layoverRatePerDay: 150 });
    expect(v.layoverPay).toBe(300);
    expect(v.totalPay).toBe(420);
  });

  it("pays layover even when there is no detention", () => {
    const v = ok({ ...base, stops: [{ minutesOnSite: 30 }], layoverDays: 1, layoverRatePerDay: 200 });
    expect(v.detentionPay).toBe(0);
    expect(v.totalPay).toBe(200);
  });

  it("pays nothing at a zero rate", () => {
    expect(ok({ ...base, hourlyRate: 0 }).totalPay).toBe(0);
  });

  it("works end to end across midnight", () => {
    const m = mins("22:00", "01:30"); // 210 min
    const v = ok({ ...base, billingIncrement: 60, stops: [{ minutesOnSite: m }] });
    // 210 - 120 = 90 over free -> 2 billable hours.
    expect(v.stops[0]?.billableMinutes).toBe(120);
    expect(v.totalPay).toBe(120);
  });
});

describe("validateDetention: error handling", () => {
  it("rejects empty and oversized stop lists", () => {
    expect(validateDetention({ ...base, stops: [] })).toEqual([{ field: "stops", message: "Enter at least one stop." }]);
    const many = Array.from({ length: 11 }, () => ({ minutesOnSite: 0 }));
    expect(validateDetention({ ...base, stops: many })[0]?.field).toBe("stops");
    expect(validateDetention({ ...base, stops: undefined as unknown as [] })[0]?.field).toBe("stops");
  });

  it("indexes errors to the offending stop", () => {
    const errs = validateDetention({ ...base, stops: [{ minutesOnSite: 10 }, { minutesOnSite: -5 }] });
    expect(errs.map((e) => e.field)).toEqual(["stops[1].minutesOnSite"]);
  });

  it("rejects fractional, NaN and over-a-week time on site", () => {
    for (const bad of [1.5, Number.NaN, 10081]) {
      const errs = validateDetention({ ...base, stops: [{ minutesOnSite: bad }] });
      expect(errs.map((e) => e.field)).toEqual(["stops[0].minutesOnSite"]);
    }
    expect(validateDetention({ ...base, stops: [{ minutesOnSite: 10080 }] })).toEqual([]);
  });

  it("does not throw when a stop entry is missing", () => {
    const r = calculateDetention({ ...base, stops: [undefined as unknown as { minutesOnSite: number }] });
    expect(r.ok).toBe(false);
  });

  it("rejects bad free time, rate, increment and layover values", () => {
    const errs = validateDetention({
      ...base,
      freeMinutes: -1,
      hourlyRate: Number.NaN,
      billingIncrement: 45 as BillingIncrement,
      layoverDays: 1.5,
      layoverRatePerDay: -10,
    });
    expect(errs.map((e) => e.field)).toEqual([
      "freeMinutes",
      "hourlyRate",
      "billingIncrement",
      "layoverDays",
      "layoverRatePerDay",
    ]);
  });

  it("returns errors from calculateDetention instead of a result", () => {
    const r = calculateDetention({ ...base, hourlyRate: -1 });
    expect(r.ok).toBe(false);
  });
});
