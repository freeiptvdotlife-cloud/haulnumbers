import { describe, expect, it } from "vitest";
import { ceilCents, ceilPerMile, roundCents, roundFraction, roundPerMile } from "../src";

describe("money rounding", () => {
  it("rounds half away from zero, symmetric for negatives", () => {
    expect(roundCents(1.005)).toBe(1.01);
    expect(roundCents(-1.005)).toBe(-1.01);
    expect(roundCents(0)).toBe(0);
    expect(roundPerMile(-0.0005)).toBe(-0.001);
    expect(roundPerMile(1.2344)).toBe(1.234);
  });

  it("rounds fractions to 4 decimals", () => {
    expect(roundFraction(0.123456)).toBe(0.1235);
    expect(roundFraction(0)).toBe(0);
  });

  it("rounds up for minimums, without float-noise cents", () => {
    expect(ceilCents(10.001)).toBe(10.01);
    expect(ceilCents(10.000000000000002)).toBe(10);
    expect(ceilCents(10)).toBe(10);
    expect(ceilPerMile(1.5751)).toBe(1.576);
    expect(ceilPerMile(1.575)).toBe(1.575);
  });
});

describe("negative zero", () => {
  it("never returns -0, which would render as -$0.00", () => {
    for (const fn of [roundCents, roundPerMile, roundFraction, ceilCents, ceilPerMile]) {
      expect(Object.is(fn(-0), 0)).toBe(true);
    }
    expect(Object.is(roundCents(-0.001), 0)).toBe(true);
    expect(Object.is(ceilCents(0), 0)).toBe(true);
    expect(Object.is(ceilCents(-0.001), 0)).toBe(true);
  });
});
