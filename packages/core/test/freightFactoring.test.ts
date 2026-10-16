import { describe, expect, it } from "vitest";
import {
  calculateFreightFactoring,
  validateFreightFactoring,
  type FreightFactoringInput,
} from "../src";

const base: FreightFactoringInput = {
  invoiceAmount: 5000,
  advanceRatePct: 95,
  factoringFeePct: 3,
  daysToPayment: 45,
};

function ok(input: FreightFactoringInput) {
  const r = calculateFreightFactoring(input);
  if (!r.ok) throw new Error("expected ok: " + JSON.stringify(r.errors));
  return r.value;
}

describe("calculateFreightFactoring: hand-computed", () => {
  it("$5,000 invoice, 95% advance, 3% fee, 45 days", () => {
    const v = ok(base);
    expect(v.advanceAmount).toBe(4750);           // 5000 × 0.95
    expect(v.feeAmount).toBe(150);                // 5000 × 0.03
    expect(v.reserveRelease).toBe(100);           // (5000 − 4750) − 150 = 100
    expect(v.netReceived).toBe(4850);             // 5000 − 150
    // (150/4750) × (365/45) = 0.031578… × 8.1111… ≈ 0.2561
    expect(v.effectiveAnnualRate).toBeCloseTo(0.2561, 3);
    expect(v.dailyCost).toBeCloseTo(3.33, 1);    // 150 / 45 = 3.333…
  });

  it("100% advance rate: no reserve, fee comes out of advance", () => {
    const v = ok({ ...base, advanceRatePct: 100 });
    expect(v.advanceAmount).toBe(5000);
    expect(v.reserveRelease).toBe(0);            // reserve is 0, nothing to release
    expect(v.netReceived).toBe(4850);            // still 5000 − 150
  });

  it("fee equals reserve exactly: reserveRelease is 0, not negative", () => {
    // 10% advance = $500, fee = 10% = $500, reserve = $4500
    // 3% fee on $5000 = $150; reserve = $5000 × (1 - 0.97) = $150 → reserveRelease = 0
    const v = ok({ ...base, advanceRatePct: 97, factoringFeePct: 3 });
    expect(v.advanceAmount).toBe(4850);
    expect(v.reserveRelease).toBe(0);            // reserve ($150) − fee ($150) = 0
    expect(v.netReceived).toBe(4850);
  });

  it("fee exceeds reserve: reserveRelease is 0, not negative", () => {
    // advance = 99%, fee = 3%, so reserve = $50, fee = $150 → release = 0
    const v = ok({ ...base, advanceRatePct: 99, factoringFeePct: 3 });
    expect(v.reserveRelease).toBe(0);
    expect(v.netReceived).toBe(4850);            // net is always invoice − fee
  });

  it("shorter term → higher annualised rate", () => {
    const v30 = ok({ ...base, daysToPayment: 30 });
    const v60 = ok({ ...base, daysToPayment: 60 });
    expect(v30.effectiveAnnualRate).toBeGreaterThan(v60.effectiveAnnualRate);
  });

  it("fractional fee rounds to cents", () => {
    // 2.5% of $1,000 = $25.00 exactly
    const v = ok({ ...base, invoiceAmount: 1000, factoringFeePct: 2.5 });
    expect(v.feeAmount).toBe(25);
    expect(v.netReceived).toBe(975);
  });

  it("returns dailyCost rounded to cents", () => {
    // fee = $150, days = 45 → 150/45 = 3.333… → $3.33
    expect(ok(base).dailyCost).toBe(3.33);
  });
});

describe("validateFreightFactoring: error handling", () => {
  it("rejects zero, negative, and over-range invoice amounts", () => {
    for (const bad of [0, -1, 500_001, Number.NaN]) {
      expect(validateFreightFactoring({ ...base, invoiceAmount: bad }).map((e) => e.field)).toContain("invoiceAmount");
    }
  });

  it("rejects advance rate below 50%, above 100%, and non-numeric", () => {
    for (const bad of [49.9, 100.1, Number.NaN, "95" as unknown as number]) {
      expect(validateFreightFactoring({ ...base, advanceRatePct: bad }).map((e) => e.field)).toContain("advanceRatePct");
    }
    expect(validateFreightFactoring({ ...base, advanceRatePct: 100 }).map((e) => e.field)).not.toContain("advanceRatePct");
  });

  it("rejects factoring fee of 0, above 20%, and non-numeric", () => {
    for (const bad of [0, 20.01, -1, Number.NaN]) {
      expect(validateFreightFactoring({ ...base, factoringFeePct: bad }).map((e) => e.field)).toContain("factoringFeePct");
    }
  });

  it("rejects fractional, zero, negative and over-range days", () => {
    for (const bad of [0, -1, 1.5, 181]) {
      expect(validateFreightFactoring({ ...base, daysToPayment: bad }).map((e) => e.field)).toContain("daysToPayment");
    }
    expect(validateFreightFactoring({ ...base, daysToPayment: 180 })).toHaveLength(0);
  });
});
