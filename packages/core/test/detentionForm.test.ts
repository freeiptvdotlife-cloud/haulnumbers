import { describe, expect, it } from "vitest";
import { calculateDetentionFromTimes, type DetentionFormInput } from "../src";

const stop = (key: string, name: string, arrival = "", departure = "", extraDays = 0) => ({ key, name, arrival, departure, extraDays });
const base: DetentionFormInput = {
  stops: [stop("pickup", "Pickup", "08:00", "11:15"), stop("delivery", "Delivery")],
  freeMinutes: 120,
  hourlyRate: 50,
  billingIncrement: 60,
  layoverDays: 0,
  layoverRatePerDay: 0,
};

function ok(input: DetentionFormInput) {
  const r = calculateDetentionFromTimes(input);
  if (!r.ok) throw new Error("expected ok: " + JSON.stringify(r.problems));
  return r;
}
function problems(input: DetentionFormInput) {
  const r = calculateDetentionFromTimes(input);
  if (r.ok) throw new Error("expected problems");
  return r.problems;
}

describe("calculateDetentionFromTimes", () => {
  it("prices a same-day stop and skips a blank stop", () => {
    const r = ok(base);
    expect(r.used).toEqual([{ key: "pickup", name: "Pickup", minutes: 195 }]);
    expect(r.value.totalPay).toBe(100); // 195 - 120 = 75 min -> started hour x2 = 120 min x $50/h
  });

  it("handles a wait past midnight", () => {
    const r = ok({ ...base, stops: [stop("pickup", "Pickup", "22:30", "01:15")] });
    expect(r.used[0]!.minutes).toBe(165);
    expect(r.value.totalPay).toBe(50);
  });

  it("applies free time to each stop separately", () => {
    const r = ok({ ...base, stops: [stop("pickup", "Pickup", "08:00", "11:00"), stop("delivery", "Delivery", "13:00", "14:00")] });
    expect(r.value.stops.map((s) => s.pay)).toEqual([50, 0]);
  });

  it("trims whitespace around typed times", () => {
    expect(ok({ ...base, stops: [stop("pickup", "Pickup", " 08:00 ", " 11:15 ")] }).value.totalPay).toBe(100);
  });

  it("supports a stay of a day or more via extraDays", () => {
    const r = ok({ ...base, stops: [stop("pickup", "Pickup", "08:00", "08:00", 1)] });
    expect(r.used[0]!.minutes).toBe(1440);
  });

  it("includes layover in the total", () => {
    expect(ok({ ...base, layoverDays: 2, layoverRatePerDay: 150 }).value.totalPay).toBe(400);
  });
});

describe("problems name the stop and the field", () => {
  it("a half-filled stop points at the blank time", () => {
    expect(problems({ ...base, stops: [stop("pickup", "Pickup", "08:00", "11:15"), stop("delivery", "Delivery", "13:00", "")] })).toEqual([
      { stopKey: "delivery", field: "departure", message: "Enter both arrival and departure, or leave both blank to skip this stop." },
    ]);
    expect(problems({ ...base, stops: [stop("pickup", "Pickup", "", "11:15")] })[0]).toMatchObject({ stopKey: "pickup", field: "arrival" });
  });

  it("no stops entered asks for at least one, on the first stop's arrival", () => {
    expect(problems({ ...base, stops: [stop("pickup", "Pickup"), stop("delivery", "Delivery")] })).toEqual([
      { stopKey: "pickup", field: "arrival", message: "Enter arrival and departure times for at least one stop." },
    ]);
  });

  it("no stop list at all still reports a problem instead of throwing", () => {
    expect(problems({ ...base, stops: [] })).toEqual([{ stopKey: null, field: "arrival", message: "Enter arrival and departure times for at least one stop." }]);
  });

  it("malformed times and bad days-later name each field", () => {
    const p = problems({ ...base, stops: [stop("pickup", "Pickup", "24:00", "9:30", -1)] });
    expect(p.map((x) => [x.stopKey, x.field])).toEqual([["pickup", "arrival"], ["pickup", "departure"], ["pickup", "days"]]);
  });

  it("a blank days-later (NaN) is an error on the days field", () => {
    expect(problems({ ...base, stops: [stop("pickup", "Pickup", "08:00", "09:00", Number.NaN)] })[0]).toMatchObject({ stopKey: "pickup", field: "days" });
  });

  it("more than 7 days on site is reported on the days field of that stop", () => {
    expect(problems({ ...base, stops: [stop("pickup", "Pickup", "08:00", "09:00", 8)] })[0]).toMatchObject({ stopKey: "pickup", field: "days" });
  });

  it("top-level problems have no stop", () => {
    expect(problems({ ...base, hourlyRate: Number.NaN })).toEqual([{ stopKey: null, field: "hourlyRate", message: "Must be 0 or more." }]);
    expect(problems({ ...base, freeMinutes: -5 })[0]).toMatchObject({ stopKey: null, field: "freeMinutes" });
  });

  it("does not compute a result while any stop has a problem", () => {
    const r = calculateDetentionFromTimes({ ...base, stops: [stop("pickup", "Pickup", "08:00", "11:15"), stop("delivery", "Delivery", "13:00", "")] });
    expect(r.ok).toBe(false);
  });
});
