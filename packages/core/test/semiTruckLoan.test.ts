import { describe, expect, it } from "vitest";
import {
  calculateSemiTruckLoan,
  validateSemiTruckLoan,
  type SemiTruckLoanInput,
} from "../src/semiTruckLoan";

const BASE: SemiTruckLoanInput = {
  truckPrice: 120_000,
  downPayment: 20_000,
  tradeInValue: 0,
  annualRatePct: 7,
  termMonths: 60,
};

function ok(input: SemiTruckLoanInput) {
  const r = calculateSemiTruckLoan(input);
  if (!r.ok) throw new Error("Expected ok: " + JSON.stringify(r.errors));
  return r.value;
}

describe("calculateSemiTruckLoan — loan amount", () => {
  it("subtracts down payment from truck price", () => {
    expect(ok(BASE).loanAmount).toBe(100_000);
  });

  it("subtracts trade-in value as well as down payment", () => {
    expect(ok({ ...BASE, tradeInValue: 10_000 }).loanAmount).toBe(90_000);
  });

  it("zero down payment → loan equals truck price", () => {
    expect(ok({ ...BASE, downPayment: 0 }).loanAmount).toBe(120_000);
  });
});

describe("calculateSemiTruckLoan — monthly payment", () => {
  it("calculates monthly payment for $100k at 7% for 60 months", () => {
    // Standard amortization: 100,000 × (0.07/12 × (1.07/12)^60) / ((1.07/12)^60 - 1) ≈ $1,980.12
    expect(ok(BASE).monthlyPayment).toBeCloseTo(1980.12, 0);
  });

  it("zero-rate loan divides principal evenly", () => {
    const r = ok({ ...BASE, annualRatePct: 0 });
    expect(r.monthlyPayment).toBeCloseTo(100_000 / 60, 0);
  });

  it("total payments ≈ loan + totalInterest", () => {
    const r = ok(BASE);
    expect(r.totalCost).toBeCloseTo(r.loanAmount + r.totalInterest, 0);
  });

  it("shorter term → higher payment but less total interest", () => {
    const r36 = ok({ ...BASE, termMonths: 36 });
    const r60 = ok(BASE);
    expect(r36.monthlyPayment).toBeGreaterThan(r60.monthlyPayment);
    expect(r36.totalInterest).toBeLessThan(r60.totalInterest);
  });

  it("higher rate → higher payment and more total interest", () => {
    const rLow = ok(BASE);
    const rHigh = ok({ ...BASE, annualRatePct: 12 });
    expect(rHigh.monthlyPayment).toBeGreaterThan(rLow.monthlyPayment);
    expect(rHigh.totalInterest).toBeGreaterThan(rLow.totalInterest);
  });
});

describe("calculateSemiTruckLoan — annual schedule", () => {
  it("produces the right number of annual rows for a 60-month term", () => {
    expect(ok(BASE).annualSchedule.length).toBe(5);
  });

  it("produces a partial final year row for a non-multiple-of-12 term", () => {
    // 48-month term → 4 full years
    expect(ok({ ...BASE, termMonths: 48 }).annualSchedule.length).toBe(4);
    // 50-month term → 5 rows (4 full + 1 partial)
    expect(ok({ ...BASE, termMonths: 50 }).annualSchedule.length).toBe(5);
  });

  it("final year ending balance is 0", () => {
    const rows = ok(BASE).annualSchedule;
    expect(rows[rows.length - 1]!.endingBalance).toBe(0);
  });

  it("year 1 balance is less than the original loan amount", () => {
    const rows = ok(BASE).annualSchedule;
    expect(rows[0]!.endingBalance).toBeLessThan(100_000);
  });
});

describe("validateSemiTruckLoan — validation", () => {
  it("rejects negative truck price", () => {
    const errs = validateSemiTruckLoan({ ...BASE, truckPrice: -1 });
    expect(errs.some((e) => e.field === "truckPrice")).toBe(true);
  });

  it("rejects down payment >= truck price", () => {
    const errs = validateSemiTruckLoan({ ...BASE, downPayment: 120_000 });
    expect(errs.some((e) => e.field === "downPayment")).toBe(true);
  });

  it("rejects trade-in > truck price", () => {
    const errs = validateSemiTruckLoan({ ...BASE, tradeInValue: 200_000 });
    expect(errs.some((e) => e.field === "tradeInValue")).toBe(true);
  });

  it("rejects APR above 30%", () => {
    const errs = validateSemiTruckLoan({ ...BASE, annualRatePct: 31 });
    expect(errs.some((e) => e.field === "annualRatePct")).toBe(true);
  });

  it("rejects term below 12 months", () => {
    const errs = validateSemiTruckLoan({ ...BASE, termMonths: 6 });
    expect(errs.some((e) => e.field === "termMonths")).toBe(true);
  });

  it("rejects term above 84 months", () => {
    const errs = validateSemiTruckLoan({ ...BASE, termMonths: 96 });
    expect(errs.some((e) => e.field === "termMonths")).toBe(true);
  });

  it("rejects down + trade-in >= truck price", () => {
    const errs = validateSemiTruckLoan({ ...BASE, downPayment: 60_000, tradeInValue: 60_000 });
    expect(errs.some((e) => e.field === "downPayment")).toBe(true);
  });

  it("accepts valid zero-rate input", () => {
    expect(validateSemiTruckLoan({ ...BASE, annualRatePct: 0 })).toHaveLength(0);
  });
});
