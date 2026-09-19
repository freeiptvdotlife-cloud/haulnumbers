export interface RateFile {
  quarter: string;
  status: "final" | "preliminary";
  finalDate: string | null;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  fuel: string;
  unit: string;
  blankDiesel: string[];
  rates: Record<string, { base: number; surcharge: number }>;
}
export const SOURCE_NAME: string;
export const MATRIX_URL: string;
export const US_STATES: readonly string[];
export const EXPECTED_BLANK_DIESEL: readonly string[];
export function siteQuarter(quarter: string): string;
export function matrixUrl(quarter: string): string;
export function parseMatrix(
  html: string,
  quarter: string,
): {
  finalDate: string | null;
  rates: Record<string, { base: number; surcharge: number }>;
  blankDiesel: string[];
};
export function validateRateFile(file: RateFile): string[];
export function buildRateFile(args: { quarter: string; html: string; retrievedAt: string }): RateFile;
