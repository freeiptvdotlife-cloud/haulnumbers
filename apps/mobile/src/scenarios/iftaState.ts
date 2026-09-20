import { IFTA_STATE_NAMES, listIftaQuarters } from "@haulnumbers/core";
import { asRecord } from "./snapshot";

export interface IftaRow { id: number; code: string; miles: string; exempt: string; gallons: string }
export interface IftaSnapshot { quarter: string; untaxed: string; rows: IftaRow[] }

const MAX_ROWS = 48;
const str = (x: unknown, fallback: string) => (typeof x === "string" && x.length <= 32 ? x : fallback);

/** Rebuilds an IFTA screen state from an untrusted saved snapshot. Never throws. */
export function sanitizeIftaState(loaded: unknown, fallbackQuarter: string): IftaSnapshot {
  const src = asRecord(loaded);
  const quarter = typeof src.quarter === "string" && listIftaQuarters().includes(src.quarter) ? src.quarter : fallbackQuarter;
  const rows: IftaRow[] = [];
  if (Array.isArray(src.rows)) {
    for (const raw of src.rows.slice(0, MAX_ROWS)) {
      const r = asRecord(raw);
      const code = typeof r.code === "string" && Object.prototype.hasOwnProperty.call(IFTA_STATE_NAMES, r.code) ? r.code : "";
      rows.push({ id: rows.length + 1, code, miles: str(r.miles, ""), exempt: str(r.exempt, "0"), gallons: str(r.gallons, "") });
    }
  }
  if (rows.length === 0) rows.push({ id: 1, code: "", miles: "", exempt: "0", gallons: "" });
  return { quarter, untaxed: str(src.untaxed, "0"), rows };
}
