export type FieldError = { field: string; message: string };

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldError[] };

export function isFiniteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export function isFinitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}
