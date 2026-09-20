/** A saved snapshot is untrusted input: take only known keys with the right type, fall back to defaults. */
export function pickStrings<T extends Record<string, string>>(defaults: T, loaded: unknown): T {
  const src = typeof loaded === "object" && loaded !== null ? (loaded as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const key of Object.keys(defaults)) {
    const v = src[key];
    out[key] = typeof v === "string" && v.length <= 32 ? v : (defaults[key] as string);
  }
  return out as T;
}

export function pickOneOf<T extends string>(loaded: unknown, allowed: readonly T[], fallback: T): T {
  return typeof loaded === "string" && (allowed as readonly string[]).includes(loaded) ? (loaded as T) : fallback;
}

export const asRecord = (x: unknown): Record<string, unknown> => (typeof x === "object" && x !== null ? (x as Record<string, unknown>) : {});
