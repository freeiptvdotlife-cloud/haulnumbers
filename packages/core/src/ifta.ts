import { getIftaRateTable, type IftaRateTable } from "./data/iftaRates";
import { type FieldError, type Result, isFiniteNonNegative } from "./result";

/**
 * IFTA quarterly diesel tax estimate, following the standard IFTA return rules:
 *  - miles and gallons are rounded to whole numbers;
 *  - fleet MPG = total miles (every mile, including exempt and deadhead) / total gallons used,
 *    rounded to 2 decimals, half up;
 *  - taxable gallons = taxable miles / fleet MPG, rounded to whole gallons, half up;
 *  - net taxable gallons = taxable gallons - tax-paid gallons; tax or credit = net x base rate;
 *  - a surcharge (KY, VA) is taxable gallons x surcharge rate, is NEVER reduced by tax-paid
 *    gallons, and is never a credit.
 * All arithmetic after input rounding is exact integer math (rates in 1/10,000 dollar, money in
 * cents), so half-way cases match the paper return instead of drifting with floating point.
 * This is an estimate: interest, penalties and other fuel types are not included.
 */
export interface IftaJurisdictionInput {
  /** Two-letter state code, e.g. "TX". */
  code: string;
  /** All miles driven in the state, including any exempt miles. */
  miles: number;
  /** Miles not subject to that state's fuel tax (0 if none). Must not exceed `miles`. */
  exemptMiles: number;
  /** Gallons bought in the state with that state's tax included in the price. */
  taxPaidGallons: number;
}

export interface IftaInput {
  /** Rate quarter, e.g. "2026Q3". */
  quarter: string;
  jurisdictions: IftaJurisdictionInput[];
  /** Fuel put in the tank without tax paid (e.g. bulk fuel). Counts toward total gallons only. */
  untaxedGallons: number;
}

export interface IftaJurisdictionResult {
  code: string;
  miles: number;
  taxableMiles: number;
  taxPaidGallons: number;
  taxableGallons: number;
  netTaxableGallons: number;
  baseRate: number;
  surchargeRate: number;
  /** Base tax due (positive) or credit (negative), in USD. */
  tax: number;
  /** Surcharge due, in USD. Never negative. */
  surcharge: number;
  total: number;
}

export interface IftaResult {
  quarter: string;
  rateStatus: IftaRateTable["status"];
  rateFinalDate: string | null;
  ratesRetrievedAt: string;
  totalMiles: number;
  totalGallons: number;
  fleetMpg: number;
  jurisdictions: IftaJurisdictionResult[];
  /** Sum of every jurisdiction's tax and surcharge; negative means a net credit. */
  netTax: number;
  warnings: string[];
}

export const MAX_ROW_VALUE = 10_000_000;
export const MAX_JURISDICTIONS = 48;

/** Round half up for a non-negative number, as the return instructions describe. */
const roundWhole = (n: number) => Math.floor(n + 0.5);

/** floor((a / b) + 1/2) for non-negative integers, without floating point. */
const divRoundHalfUp = (a: number, b: number) => Math.floor((2 * a + b) / (2 * b));

/** 1/10,000-dollar amount to whole cents, half away from zero, for credits and dues alike. */
function tenThousandthsToCents(v: number): number {
  const cents = Math.floor((Math.abs(v) + 50) / 100);
  return v < 0 ? -cents : cents;
}

const isWholeAllowed = (n: unknown): n is number => isFiniteNonNegative(n) && n <= MAX_ROW_VALUE;

export function validateIfta(input: IftaInput, table: IftaRateTable | undefined): FieldError[] {
  const errors: FieldError[] = [];
  if (!table) errors.push({ field: "quarter", message: "No IFTA rates are available for that quarter." });
  if (!isWholeAllowed(input.untaxedGallons)) {
    errors.push({ field: "untaxedGallons", message: "Must be 0 or more and under 10 million." });
  }
  if (!Array.isArray(input.jurisdictions) || input.jurisdictions.length === 0) {
    errors.push({ field: "jurisdictions", message: "Add at least one state." });
    return errors;
  }
  if (input.jurisdictions.length > MAX_JURISDICTIONS) {
    errors.push({ field: "jurisdictions", message: `Add at most ${MAX_JURISDICTIONS} states.` });
    return errors;
  }
  const seen = new Set<string>();
  input.jurisdictions.forEach((j, i) => {
    const at = `jurisdictions[${i}]`;
    if (table && !Object.prototype.hasOwnProperty.call(table.rates, j?.code)) {
      errors.push({ field: `${at}.code`, message: "Choose a state." });
    } else if (seen.has(j?.code)) {
      errors.push({ field: `${at}.code`, message: "Each state can only be listed once." });
    }
    seen.add(j?.code);
    for (const key of ["miles", "exemptMiles", "taxPaidGallons"] as const) {
      if (!isWholeAllowed(j?.[key])) {
        errors.push({ field: `${at}.${key}`, message: "Must be 0 or more and under 10 million." });
      }
    }
    if (isWholeAllowed(j?.miles) && isWholeAllowed(j?.exemptMiles) && roundWhole(j.exemptMiles) > roundWhole(j.miles)) {
      errors.push({ field: `${at}.exemptMiles`, message: "Exempt miles cannot exceed the miles driven." });
    }
  });
  return errors;
}

export function calculateIfta(
  input: IftaInput,
  table: IftaRateTable | undefined = getIftaRateTable(input?.quarter),
): Result<IftaResult> {
  const errors = validateIfta(input, table);
  if (errors.length > 0 || !table) return { ok: false, errors };

  const rows = input.jurisdictions.map((j) => ({
    code: j.code,
    miles: roundWhole(j.miles),
    exempt: roundWhole(j.exemptMiles),
    paid: roundWhole(j.taxPaidGallons),
  }));
  const totalMiles = rows.reduce((s, r) => s + r.miles, 0);
  const totalGallons = rows.reduce((s, r) => s + r.paid, 0) + roundWhole(input.untaxedGallons);

  const totalErrors: FieldError[] = [];
  if (totalMiles === 0) totalErrors.push({ field: "jurisdictions", message: "Enter miles driven in at least one state." });
  if (totalGallons === 0) totalErrors.push({ field: "jurisdictions", message: "Enter the gallons you bought in at least one state." });
  if (totalErrors.length > 0) return { ok: false, errors: totalErrors };

  // Fleet MPG in hundredths (5.77 -> 577), exact integer half-up rounding.
  const mpgHundredths = divRoundHalfUp(totalMiles * 100, totalGallons);
  if (mpgHundredths === 0) {
    return { ok: false, errors: [{ field: "jurisdictions", message: "Fleet MPG works out below 0.01. Check that miles and gallons are not swapped." }] };
  }
  const fleetMpg = mpgHundredths / 100;

  let netCents = 0;
  const jurisdictions = rows.map((r): IftaJurisdictionResult => {
    const rate = table.rates[r.code]!;
    const taxableMiles = r.miles - r.exempt;
    const taxableGallons = divRoundHalfUp(taxableMiles * 100, mpgHundredths);
    const netTaxableGallons = taxableGallons - r.paid;
    const taxCents = tenThousandthsToCents(netTaxableGallons * Math.round(rate.base * 10000));
    const surchargeCents = tenThousandthsToCents(taxableGallons * Math.round(rate.surcharge * 10000));
    netCents += taxCents + surchargeCents;
    return {
      code: r.code,
      miles: r.miles,
      taxableMiles,
      taxPaidGallons: r.paid,
      taxableGallons,
      netTaxableGallons,
      baseRate: rate.base,
      surchargeRate: rate.surcharge,
      tax: taxCents / 100,
      surcharge: surchargeCents / 100,
      total: (taxCents + surchargeCents) / 100,
    };
  });

  const warnings: string[] = [];
  if (fleetMpg < 3 || fleetMpg > 15) {
    warnings.push(
      `Fleet MPG of ${fleetMpg.toFixed(2)} is outside the range most trucks see. Check that your miles and gallons are correct and in the right boxes.`,
    );
  }

  return {
    ok: true,
    value: {
      quarter: table.quarter,
      rateStatus: table.status,
      rateFinalDate: table.finalDate,
      ratesRetrievedAt: table.retrievedAt,
      totalMiles,
      totalGallons,
      fleetMpg,
      jurisdictions,
      netTax: netCents / 100,
      warnings,
    },
  };
}
