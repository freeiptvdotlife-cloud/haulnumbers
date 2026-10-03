import { roundCents, roundFraction } from "./money";
import { type FieldError, type Result, isFinitePositive } from "./result";

export interface FreightFactoringInput {
  /** Face value of the invoice, USD. */
  invoiceAmount: number;
  /** Percentage of the invoice the factor advances today (e.g. 95 means 95%). */
  advanceRatePct: number;
  /** Percentage of the invoice charged as the factoring fee (e.g. 3 means 3%). */
  factoringFeePct: number;
  /** Calendar days until the debtor would pay if you waited (net terms). */
  daysToPayment: number;
}

export interface FreightFactoringResult {
  /** Cash received today. */
  advanceAmount: number;
  /** Total fee paid to the factor. */
  feeAmount: number;
  /** Cash returned when the debtor pays (= invoice × (1 − advance_rate) − fee; 0 when fee exceeds reserve). */
  reserveRelease: number;
  /** Total received across both disbursements (= invoice − fee). */
  netReceived: number;
  /** Fee ÷ advance, annualised by days (simple interest): (fee/advance) × (365/days). */
  effectiveAnnualRate: number;
  /** Daily dollar cost of factoring (fee ÷ days), for quick comparison against a credit line. */
  dailyCost: number;
}

export function validateFreightFactoring(input: FreightFactoringInput): FieldError[] {
  const errors: FieldError[] = [];
  if (!isFinitePositive(input.invoiceAmount) || input.invoiceAmount > 500_000) {
    errors.push({ field: "invoiceAmount", message: "Enter an invoice amount between $1 and $500,000." });
  }
  if (
    typeof input.advanceRatePct !== "number" ||
    !Number.isFinite(input.advanceRatePct) ||
    input.advanceRatePct < 50 ||
    input.advanceRatePct > 100
  ) {
    errors.push({ field: "advanceRatePct", message: "Advance rate must be between 50% and 100%." });
  }
  if (
    typeof input.factoringFeePct !== "number" ||
    !Number.isFinite(input.factoringFeePct) ||
    input.factoringFeePct <= 0 ||
    input.factoringFeePct > 20
  ) {
    errors.push({ field: "factoringFeePct", message: "Factoring fee must be between 0.01% and 20%." });
  }
  if (
    !Number.isInteger(input.daysToPayment) ||
    input.daysToPayment < 1 ||
    input.daysToPayment > 180
  ) {
    errors.push({ field: "daysToPayment", message: "Days to payment must be a whole number between 1 and 180." });
  }
  return errors;
}

export function calculateFreightFactoring(input: FreightFactoringInput): Result<FreightFactoringResult> {
  const errors = validateFreightFactoring(input);
  if (errors.length > 0) return { ok: false, errors };

  const { invoiceAmount, advanceRatePct, factoringFeePct, daysToPayment } = input;

  const advanceAmount = roundCents(invoiceAmount * (advanceRatePct / 100));
  const feeAmount = roundCents(invoiceAmount * (factoringFeePct / 100));
  const reserve = roundCents(invoiceAmount - advanceAmount);
  const reserveRelease = roundCents(Math.max(0, reserve - feeAmount));
  const netReceived = roundCents(invoiceAmount - feeAmount);

  // Simple annualised rate: (fee / advance) × (365 / days). Industry standard for factoring.
  const effectiveAnnualRate = roundFraction((feeAmount / advanceAmount) * (365 / daysToPayment));
  const dailyCost = roundCents(feeAmount / daysToPayment);

  return {
    ok: true,
    value: {
      advanceAmount,
      feeAmount,
      reserveRelease,
      netReceived,
      effectiveAnnualRate,
      dailyCost,
    },
  };
}
