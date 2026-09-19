// All helpers normalise -0 to 0 (the `+ 0`): Math.round/ceil of a tiny negative returns -0,
// and toLocaleString renders -0 as "-$0.00", which is wrong on a results screen.

/** Round to cents using half-away-from-zero, avoiding float artifacts like 1.005 -> 1. */
export function roundCents(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + Number.EPSILON * 100)) / 100 + 0;
}

/** Round to 3 decimals for per-mile figures (e.g. $1.234/mi) shown to drivers. */
export function roundPerMile(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 1000 + Number.EPSILON * 1000)) / 1000 + 0;
}

/** Round a 0..1 fraction to 4 decimals (0.1234 = 12.34%) for percentage display. */
export function roundFraction(value: number): number {
  return Math.round(value * 10000 + Number.EPSILON * 10000) / 10000 + 0;
}

/**
 * Round UP to cents. Use for "minimum you must ask for" figures, where rounding down
 * would leave the user a fraction of a cent below the threshold they are told to meet.
 * The 1e-9 guard stops float noise (e.g. 10.000000000000002) from adding a spurious cent.
 */
export function ceilCents(value: number): number {
  return Math.ceil(value * 100 - 1e-9) / 100 + 0;
}

/** Round UP to 3 decimals for per-mile minimums (see ceilCents). */
export function ceilPerMile(value: number): number {
  return Math.ceil(value * 1000 - 1e-9) / 1000 + 0;
}
