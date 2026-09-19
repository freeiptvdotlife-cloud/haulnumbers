// Parser and validator for IFTA, Inc.'s official fuel tax matrix (https://www.iftach.org/taxmatrix4/).
// Build-time tooling only: it is not part of the runtime bundle. It refuses to guess: any row or
// cell it does not understand throws, because a silently wrong tax rate is worse than no data.

export const SOURCE_NAME = "IFTA, Inc. Fuel Tax Matrix";
export const MATRIX_URL = "https://www.iftach.org/taxmatrix4/Taxmatrix.php";

/** The 48 IFTA member states in the contiguous U.S. (Alaska, Hawaii and DC are not members). */
export const US_STATES = [
  "AL", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
  "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

/**
 * Jurisdictions whose diesel cell is legitimately blank in the official matrix (Oregon's row is
 * empty for every fuel). They are stored with a 0 rate and listed in `blankDiesel`. Any OTHER blank
 * is treated as a parse error. Miles there still count toward fleet MPG.
 */
export const EXPECTED_BLANK_DIESEL = ["OR"];

/** Column order in the matrix: index 1 is the "Special Diesel" column. */
const FUEL_COLUMNS = 15;
const DIESEL_COLUMN = 1;
const MIN_RATE = 0.1; // $/gal. Lowest U.S. diesel rates are well above this; guards against parse slips.
const MAX_RATE = 1.5; // $/gal. Highest are below $1; a value above this is a parse error.

/** "2026Q3" -> the matrix's "3Q2026". */
export function siteQuarter(quarter) {
  const m = /^(\d{4})Q([1-4])$/.exec(quarter);
  if (!m) throw new Error(`Bad quarter "${quarter}", expected like 2026Q3`);
  return `${m[2]}Q${m[1]}`;
}

export function matrixUrl(quarter) {
  return `${MATRIX_URL}?QY=${siteQuarter(quarter)}`;
}

const ORDINAL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

function parseRate(text, where) {
  if (!/^\d+\.\d{4}$/.test(text)) throw new Error(`${where}: unparseable rate "${text}"`);
  return Number(text);
}

/**
 * The diesel rate shown in a cell, or null when the cell is blank.
 * The site uses two layouts: unchanged cells show "rate<br>litre-rate", while cells whose rate
 * changed wrap that in a tooltip container (`change-preview-wrap`) that also holds the
 * rate-change note. Removing the note box first makes both layouts read the same way.
 */
function dieselValue(cellHtml, where) {
  const tip = /Current Rate:<\/strong>\s*(\d+\.\d{4})/.exec(cellHtml);
  const shown = cellHtml
    .replace(/<div class="change-preview-box">[\s\S]*?<\/div>\s*<\/div>/, "")
    .replace(/<img[^>]*>/g, "")
    .replace(/<br\s*\/?>/g, "|")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (shown === "") {
    if (tip) throw new Error(`${where}: diesel cell has a rate-change note but no displayed rate`);
    return null;
  }
  const m = /^(\d+\.\d{4})(?:\|\d+\.\d{4})?$/.exec(shown); // Canadian per-litre part is optional and unused
  if (!m) throw new Error(`${where}: unexpected diesel cell content "${shown.slice(0, 60)}"`);
  const rate = Number(m[1]);
  // Independent cross-check: the note states the same current rate as the displayed one.
  if (tip && Number(tip[1]) !== rate) {
    throw new Error(`${where}: displayed rate ${rate} disagrees with rate-change note ${tip[1]}`);
  }
  return rate;
}

/**
 * Parse one quarter's matrix page. Returns diesel base and surcharge rates for the 48 U.S. states.
 * @param {string} html
 * @param {string} quarter e.g. "2026Q3"; the page must say it is that quarter.
 */
export function parseMatrix(html, quarter) {
  const [, year, q] = /^(\d{4})Q([1-4])$/.exec(quarter) ?? [];
  if (!year) throw new Error(`Bad quarter "${quarter}"`);
  // The heading reads "3rd Quarter 2026 Fuel <a>Tax Rates</a>", so match only the stable prefix.
  const heading = `${ORDINAL[q]} Quarter ${year} Fuel`;
  if (!html.includes(heading)) {
    throw new Error(`Page does not say "${heading}"; refusing to read a different quarter's rates`);
  }
  // Second guard: every rate-change note on the page names the same quarter.
  const tipQuarters = new Set([...html.matchAll(/Current Quarter:<\/strong>\s*(\d Q?\d{4}|\dQ\d{4})/g)].map((m) => m[1]));
  if (tipQuarters.size > 1 || (tipQuarters.size === 1 && !tipQuarters.has(siteQuarter(quarter)))) {
    throw new Error(`Rate-change notes name ${[...tipQuarters].join(", ")}, not ${siteQuarter(quarter)}`);
  }
  const finalMatch = /not final until\s*<strong>([A-Za-z]+ \d{1,2}, \d{4})<\/strong>/i.exec(html);
  const finalDate = finalMatch ? new Date(`${finalMatch[1]} UTC`).toISOString().slice(0, 10) : null;

  const table = /<table id="rwd-table-large">[\s\S]*?<\/table>/.exec(html);
  if (!table) throw new Error("Rate table not found; the page layout may have changed");

  const base = new Map();
  const surcharge = new Map();
  for (const row of table[0].matchAll(/<tr id="row-([A-Z]{2})"[\s\S]*?<\/tr>/g)) {
    const code = row[1];
    if (!US_STATES.includes(code)) continue; // Canadian provinces are out of scope
    const cells = [...row[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    if (cells.length !== 2 + FUEL_COLUMNS) {
      throw new Error(`${code}: expected ${2 + FUEL_COLUMNS} cells, found ${cells.length}`);
    }
    const isSurcharge = cells[0].includes("(Surcharge)");
    const target = isSurcharge ? surcharge : base;
    if (target.has(code)) throw new Error(`${code}: duplicate ${isSurcharge ? "surcharge" : "base"} row`);
    target.set(code, dieselValue(cells[2 + DIESEL_COLUMN], `${code}${isSurcharge ? " surcharge" : ""}`));
  }

  const rates = {};
  const blankDiesel = [];
  for (const code of US_STATES) {
    const b = base.get(code);
    if (b === undefined) throw new Error(`${code}: base row missing`);
    if (b === null) {
      if (!EXPECTED_BLANK_DIESEL.includes(code)) throw new Error(`${code}: no diesel rate in the base row`);
      blankDiesel.push(code);
    }
    rates[code] = { base: b ?? 0, surcharge: surcharge.get(code) ?? 0 };
  }
  return { finalDate, rates, blankDiesel };
}

/** Throws unless a rate file is complete and plausible. Used by the CLI and by the test suite. */
export function validateRateFile(file) {
  const problems = [];
  if (!/^\d{4}Q[1-4]$/.test(file.quarter)) problems.push(`bad quarter ${file.quarter}`);
  if (!["final", "preliminary"].includes(file.status)) problems.push(`bad status ${file.status}`);
  if (file.status === "preliminary" && !/^\d{4}-\d{2}-\d{2}$/.test(file.finalDate ?? "")) {
    problems.push("preliminary file needs finalDate");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(file.retrievedAt)) problems.push("bad retrievedAt");
  if (!String(file.sourceUrl).startsWith(MATRIX_URL)) problems.push("sourceUrl is not the IFTA matrix");
  const codes = Object.keys(file.rates ?? {});
  for (const code of US_STATES) if (!codes.includes(code)) problems.push(`missing ${code}`);
  const blank = file.blankDiesel ?? [];
  for (const code of blank) {
    if (!EXPECTED_BLANK_DIESEL.includes(code)) problems.push(`${code} may not have a blank diesel rate`);
  }
  for (const code of codes) {
    if (!US_STATES.includes(code)) problems.push(`unexpected jurisdiction ${code}`);
    const r = file.rates[code];
    if (blank.includes(code)) {
      if (r.base !== 0 || r.surcharge !== 0) problems.push(`${code} is listed blank but has a rate`);
      continue;
    }
    if (!(r.base >= MIN_RATE && r.base <= MAX_RATE)) problems.push(`${code} base ${r.base} out of range`);
    if (!(r.surcharge >= 0 && r.surcharge <= MAX_RATE)) problems.push(`${code} surcharge ${r.surcharge} out of range`);
  }
  return problems;
}

export function buildRateFile({ quarter, html, retrievedAt }) {
  const { finalDate, rates, blankDiesel } = parseMatrix(html, quarter);
  const file = {
    quarter,
    status: finalDate ? "preliminary" : "final",
    finalDate,
    source: SOURCE_NAME,
    sourceUrl: matrixUrl(quarter),
    retrievedAt,
    fuel: "special diesel",
    unit: "USD per US gallon",
    blankDiesel,
    rates,
  };
  const problems = validateRateFile(file);
  if (problems.length > 0) throw new Error(`Rate file failed validation: ${problems.join("; ")}`);
  return file;
}
