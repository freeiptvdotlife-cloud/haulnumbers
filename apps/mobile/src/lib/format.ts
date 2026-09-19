/**
 * Number formatting without Intl, so results look the same on every device and JS engine.
 * Matches the website: "$1,266.62", "-$314.38", "$1.267" (3 digits for per-mile figures).
 */
export function usd(n: number, digits = 2): string {
  const neg = n < 0 && Number(Math.abs(n).toFixed(digits)) !== 0; // never "-$0.00"
  const [whole = "0", frac] = Math.abs(n).toFixed(digits).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}$${grouped}${frac !== undefined ? "." + frac : ""}`;
}

export const int = (n: number): string => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** A blank field is NaN so core validation rejects it; Number("") would silently be 0. */
export const num = (text: string): number => (text.trim() === "" ? Number.NaN : Number(text));

/** Blank means "none" for optional fields such as exempt miles. */
export const numOr0 = (text: string): number => (text.trim() === "" ? 0 : Number(text));

export const pct = (fraction: number): string =>
  `${(Math.round(fraction * 1000) / 10).toString()}%`;
