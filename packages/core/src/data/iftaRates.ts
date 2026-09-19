import q2025q4 from "./ifta/2025q4.json";
import q2026q1 from "./ifta/2026q1.json";
import q2026q2 from "./ifta/2026q2.json";
import q2026q3 from "./ifta/2026q3.json";
import q2026q4 from "./ifta/2026q4.json";

/**
 * Diesel rates for the 48 IFTA member U.S. states, copied from IFTA, Inc.'s official matrix by
 * `tools/updateIftaRates.mjs`. Never edit the JSON by hand: rerun the tool and review the diff.
 */
export interface IftaRateTable {
  /** e.g. "2026Q3" */
  quarter: string;
  /** "preliminary" until IFTA, Inc. finalises the matrix (see finalDate). */
  status: "final" | "preliminary";
  finalDate: string | null;
  source: string;
  sourceUrl: string;
  /** Date the rates were downloaded, YYYY-MM-DD. */
  retrievedAt: string;
  fuel: string;
  unit: string;
  /** Jurisdictions with no diesel rate in the matrix (stored as 0). Their miles still count. */
  blankDiesel: string[];
  /** USD per U.S. gallon. `surcharge` is owed on taxable gallons and is never a credit. */
  rates: Record<string, { base: number; surcharge: number }>;
}

export const IFTA_RATE_TABLES: readonly IftaRateTable[] = [
  q2025q4,
  q2026q1,
  q2026q2,
  q2026q3,
  q2026q4,
] as unknown as IftaRateTable[];

export function getIftaRateTable(quarter: string): IftaRateTable | undefined {
  return IFTA_RATE_TABLES.find((t) => t.quarter === quarter);
}

/** Newest quarter first, for menus. */
export function listIftaQuarters(): string[] {
  return IFTA_RATE_TABLES.map((t) => t.quarter).sort().reverse();
}

export const IFTA_STATE_NAMES: Readonly<Record<string, string>> = {
  AL: "Alabama", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska",
  NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
