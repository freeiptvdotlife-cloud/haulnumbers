import {
  MEAL_DEDUCTIBLE_PERCENT,
  PARTIAL_DAY_QUARTERS,
  getPerDiemTable,
  type PerDiemTable,
} from "./data/perDiemRates";
import { type FieldError, type Result, isFiniteNonNegative } from "./result";

/**
 * Per diem meal deduction for a self-employed owner-operator using the IRS special transportation
 * rate. Departure and return days use Method 1 (3/4 of the daily rate). Amounts are exact integer
 * cents. This is an estimate and does not decide whether a user is eligible to deduct at all.
 */
export type PerDiemArea = "conus" | "oconus";

export interface PerDiemInput {
  /** Rate period, e.g. "2025-2026". */
  period: string;
  area: PerDiemArea;
  /** Whole days away from home, not counting the departure and return days below. */
  fullDays: number;
  /** Departure and return days, each counted at 3/4 of the daily rate. */
  partialDays: number;
  /** True for interstate truck operators under DOT hours-of-service limits (80% deductible). */
  subjectToHoursOfService: boolean;
  /** Your combined marginal tax rate as a percent, 0-100 (include self-employment tax if it applies). */
  marginalTaxRatePercent: number;
}

export interface PerDiemResult {
  period: string;
  area: PerDiemArea;
  notice: string;
  sourceUrl: string;
  ratesRetrievedAt: string;
  dailyRate: number;
  /** 3/4 of the daily rate, rounded to the cent. */
  partialDayRate: number;
  /** fullDays + 0.75 x partialDays. */
  dayEquivalents: number;
  perDiemTotal: number;
  deductiblePercent: number;
  deductibleAmount: number;
  marginalTaxRatePercent: number;
  estimatedTaxSavings: number;
}

export const MAX_DAYS = 366;

const isWholeDays = (n: unknown): n is number =>
  isFiniteNonNegative(n) && Number.isInteger(n) && n <= MAX_DAYS;

/** floor(a / b + 1/2) for non-negative integers, exactly. */
const divRoundHalfUp = (a: number, b: number) => Math.floor((2 * a + b) / (2 * b));

export function validatePerDiem(input: PerDiemInput, table: PerDiemTable | undefined): FieldError[] {
  const errors: FieldError[] = [];
  if (!table) errors.push({ field: "period", message: "No IRS rates are available for that period." });
  if (input.area !== "conus" && input.area !== "oconus") {
    errors.push({ field: "area", message: "Choose the continental U.S. or outside it." });
  }
  for (const key of ["fullDays", "partialDays"] as const) {
    if (!isWholeDays(input[key])) {
      errors.push({ field: key, message: `Enter a whole number of days, 0 to ${MAX_DAYS}.` });
    }
  }
  if (isWholeDays(input.fullDays) && isWholeDays(input.partialDays)) {
    if (input.fullDays + input.partialDays === 0) {
      errors.push({ field: "fullDays", message: "Enter at least one day away from home." });
    } else if (input.fullDays + input.partialDays > MAX_DAYS) {
      errors.push({ field: "fullDays", message: `Days away cannot exceed ${MAX_DAYS} in a year.` });
    }
  }
  if (typeof input.subjectToHoursOfService !== "boolean") {
    errors.push({ field: "subjectToHoursOfService", message: "Choose yes or no." });
  }
  const r = input.marginalTaxRatePercent;
  if (typeof r !== "number" || !Number.isFinite(r) || r < 0 || r > 100) {
    errors.push({ field: "marginalTaxRatePercent", message: "Tax rate must be between 0% and 100%." });
  }
  return errors;
}

export function calculatePerDiem(
  input: PerDiemInput,
  table: PerDiemTable | undefined = getPerDiemTable(input?.period),
): Result<PerDiemResult> {
  const errors = validatePerDiem(input, table);
  if (errors.length > 0 || !table) return { ok: false, errors };

  const rateCents = Math.round(table.transportation[input.area] * 100);
  const quarters = 4 * input.fullDays + PARTIAL_DAY_QUARTERS * input.partialDays;
  const totalCents = divRoundHalfUp(rateCents * quarters, 4);
  const percent = input.subjectToHoursOfService
    ? MEAL_DEDUCTIBLE_PERCENT.hoursOfService
    : MEAL_DEDUCTIBLE_PERCENT.other;
  const deductibleCents = divRoundHalfUp(totalCents * percent, 100);
  // Tax rate held in hundredths of a percent so a rate such as 22.5% stays exact.
  const rateBp = Math.round(input.marginalTaxRatePercent * 100);
  const savingsCents = divRoundHalfUp(deductibleCents * rateBp, 10000);

  return {
    ok: true,
    value: {
      period: table.period,
      area: input.area,
      notice: table.notice,
      sourceUrl: table.sourceUrl,
      ratesRetrievedAt: table.retrievedAt,
      dailyRate: rateCents / 100,
      partialDayRate: divRoundHalfUp(rateCents * PARTIAL_DAY_QUARTERS, 4) / 100,
      dayEquivalents: quarters / 4,
      perDiemTotal: totalCents / 100,
      deductiblePercent: percent,
      deductibleAmount: deductibleCents / 100,
      marginalTaxRatePercent: input.marginalTaxRatePercent,
      estimatedTaxSavings: savingsCents / 100,
    },
  };
}
