import p2025 from "./perDiem/2025-2026.json";

/**
 * IRS special M&IE per diem rates for the transportation industry, one file per federal fiscal
 * year (Oct 1 - Sep 30), transcribed from the annual IRS notice. There is no scraper: each year,
 * read the new notice's "Special M&IE rates for transportation industry" section, add a file,
 * and register it below (see docs/06). Never estimate a rate.
 */
export interface PerDiemTable {
  /** e.g. "2025-2026" */
  period: string;
  effectiveFrom: string;
  effectiveThrough: string;
  notice: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  /** USD per full day: continental U.S. and outside it. */
  transportation: { conus: number; oconus: number };
}

export const PER_DIEM_TABLES: readonly PerDiemTable[] = [p2025] as PerDiemTable[];

export function getPerDiemTable(period: string): PerDiemTable | undefined {
  return PER_DIEM_TABLES.find((t) => t.period === period);
}

/** Newest first, for menus. */
export function listPerDiemPeriods(): string[] {
  return PER_DIEM_TABLES.map((t) => t.period).sort().reverse();
}

/**
 * Share of meal costs deductible, from IRS Publication 463 (2025). The general limit is 50%.
 * Interstate truck operators under Department of Transportation "hours of service" limits
 * deduct 80% instead, for meals during or incident to a period subject to those limits.
 */
export const MEAL_DEDUCTIBLE_PERCENT = { hoursOfService: 80, other: 50 } as const;

/**
 * Publication 463: on the day you depart and the day you return you must prorate the allowance;
 * Method 1 claims 3/4 of the daily rate. (Method 2, any consistent reasonable proration, is not modelled.)
 */
export const PARTIAL_DAY_QUARTERS = 3;
