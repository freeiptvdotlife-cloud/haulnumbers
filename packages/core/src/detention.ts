import { roundCents } from "./money";
import { type FieldError, type Result, isFiniteNonNegative } from "./result";

/** Minutes billed in blocks of this size (rounded UP). 0 bills exact minutes, prorated. */
export type BillingIncrement = 0 | 15 | 30 | 60;
export const BILLING_INCREMENTS: readonly BillingIncrement[] = [0, 15, 30, 60];

const MINUTES_PER_DAY = 1440;
/** A single stop longer than a week is almost certainly a typo, so it is rejected. */
export const MAX_MINUTES_ON_SITE = 7 * MINUTES_PER_DAY;
export const MAX_STOPS = 10;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseClock(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = TIME_RE.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Minutes between an arrival and a departure given as 24-hour "HH:MM" clock times.
 * A departure earlier than the arrival means the driver left after midnight (next day).
 * Identical times mean 0 minutes; add `extraDays` for a stay of a full day or more, which
 * removes the 0-versus-24-hours ambiguity instead of guessing.
 */
export function minutesBetween(
  arrival: string,
  departure: string,
  extraDays = 0,
): Result<number> {
  const errors: FieldError[] = [];
  const a = parseClock(arrival);
  const d = parseClock(departure);
  if (a === null) errors.push({ field: "arrival", message: "Enter a time as HH:MM (24-hour)." });
  if (d === null) errors.push({ field: "departure", message: "Enter a time as HH:MM (24-hour)." });
  if (typeof extraDays !== "number" || !Number.isInteger(extraDays) || extraDays < 0) {
    errors.push({ field: "extraDays", message: "Days later must be a whole number, 0 or more." });
  }
  if (errors.length > 0 || a === null || d === null) return { ok: false, errors };
  const sameDayOrNext = (d - a + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return { ok: true, value: sameDayOrNext + extraDays * MINUTES_PER_DAY };
}

export interface DetentionStopInput {
  /** Whole minutes between arrival and departure at this stop. */
  minutesOnSite: number;
}

export interface DetentionInput {
  /** One entry per stop (pickup, delivery, ...). Free time is applied to each stop separately. */
  stops: DetentionStopInput[];
  /** Whole minutes of unpaid waiting allowed per stop (commonly 120, but contract-specific). */
  freeMinutes: number;
  hourlyRate: number;
  billingIncrement: BillingIncrement;
  /** Flat layover: whole days held overnight x rate per day. Both 0 when unused. */
  layoverDays: number;
  layoverRatePerDay: number;
}

export interface DetentionStopResult {
  minutesOnSite: number;
  /** Minutes beyond free time (0 if within free time). */
  minutesOverFree: number;
  /** Minutes over free time after rounding up to the billing increment. */
  billableMinutes: number;
  pay: number;
}

export interface DetentionResult {
  stops: DetentionStopResult[];
  totalBillableMinutes: number;
  detentionPay: number;
  layoverPay: number;
  totalPay: number;
}

const isWhole = (n: unknown): n is number => isFiniteNonNegative(n) && Number.isInteger(n);

export function validateDetention(input: DetentionInput): FieldError[] {
  const errors: FieldError[] = [];
  if (!Array.isArray(input.stops) || input.stops.length === 0) {
    errors.push({ field: "stops", message: "Enter at least one stop." });
  } else if (input.stops.length > MAX_STOPS) {
    errors.push({ field: "stops", message: `Enter at most ${MAX_STOPS} stops.` });
  } else {
    input.stops.forEach((s, i) => {
      const v = s?.minutesOnSite;
      if (!isWhole(v)) {
        errors.push({ field: `stops[${i}].minutesOnSite`, message: "Time on site must be whole minutes, 0 or more." });
      } else if (v > MAX_MINUTES_ON_SITE) {
        errors.push({ field: `stops[${i}].minutesOnSite`, message: "Time on site cannot exceed 7 days." });
      }
    });
  }
  if (!isWhole(input.freeMinutes)) {
    errors.push({ field: "freeMinutes", message: "Free time must be whole minutes, 0 or more." });
  }
  if (!isFiniteNonNegative(input.hourlyRate)) {
    errors.push({ field: "hourlyRate", message: "Must be 0 or more." });
  }
  if (!BILLING_INCREMENTS.includes(input.billingIncrement)) {
    errors.push({ field: "billingIncrement", message: "Choose exact minutes, 15, 30 or 60." });
  }
  if (!isWhole(input.layoverDays)) {
    errors.push({ field: "layoverDays", message: "Layover days must be a whole number, 0 or more." });
  }
  if (!isFiniteNonNegative(input.layoverRatePerDay)) {
    errors.push({ field: "layoverRatePerDay", message: "Must be 0 or more." });
  }
  return errors;
}

export function calculateDetention(input: DetentionInput): Result<DetentionResult> {
  const errors = validateDetention(input);
  if (errors.length > 0) return { ok: false, errors };

  const { freeMinutes, hourlyRate, billingIncrement } = input;
  // Money is summed as whole cents so many stops can never drift by a fraction of a cent.
  let detentionCents = 0;
  let totalBillableMinutes = 0;

  const stops: DetentionStopResult[] = input.stops.map((s) => {
    const minutesOverFree = Math.max(0, s.minutesOnSite - freeMinutes);
    const billableMinutes =
      billingIncrement === 0
        ? minutesOverFree
        : Math.ceil(minutesOverFree / billingIncrement) * billingIncrement;
    const pay = roundCents((billableMinutes / 60) * hourlyRate);
    detentionCents += Math.round(pay * 100);
    totalBillableMinutes += billableMinutes;
    return { minutesOnSite: s.minutesOnSite, minutesOverFree, billableMinutes, pay };
  });

  const layoverPay = roundCents(input.layoverDays * input.layoverRatePerDay);
  const detentionPay = detentionCents / 100;
  return {
    ok: true,
    value: {
      stops,
      totalBillableMinutes,
      detentionPay,
      layoverPay,
      totalPay: roundCents(detentionPay + layoverPay),
    },
  };
}
