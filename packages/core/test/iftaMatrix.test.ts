import { describe, expect, it } from "vitest";
import {
  EXPECTED_BLANK_DIESEL,
  US_STATES,
  buildRateFile,
  matrixUrl,
  parseMatrix,
  siteQuarter,
  validateRateFile,
} from "../tools/iftaMatrix.mjs";

// ---- Synthetic page builder: mirrors the two cell layouts seen on iftach.org ----------------------
const note = (quarter: string, rate: string) =>
  `<div class="change-preview-box"><span class="change-preview-label">Rate Change</span>` +
  `<div class="change-preview-row"><strong>Previous Quarter:</strong> 2Q2026</div>` +
  `<div class="change-preview-row"><strong>Previous Rate:</strong> 0.1000</div>` +
  `<div class="change-preview-row"><strong>Current Quarter:</strong> ${quarter}</div>` +
  `<div class="change-preview-row"><strong>Current Rate:</strong> ${rate}</div>` +
  `<div class="change-preview-row change-preview-up">Increased</div>` +
  `<div class="change-preview-row"><strong>Amount:</strong> 0.0100</div> </div>`;

type Diesel =
  | { kind: "plain"; rate: string }
  | { kind: "usOnly"; rate: string }
  | { kind: "changedInside"; rate: string; noteRate?: string; quarter?: string }
  | { kind: "changedBefore"; rate: string }
  | { kind: "blank" }
  | { kind: "blankWithNote"; rate: string }
  | { kind: "junk" };

function dieselCell(d: Diesel, quarter: string): string {
  switch (d.kind) {
    case "plain": return `${d.rate}<br>0.1000`;
    case "usOnly": return d.rate;
    case "changedInside":
      return `<div class="change-preview-wrap"><span class="highlight"><b><i>${d.rate}</i></b></span><br>0.1000 ${note(d.quarter ?? quarter, d.noteRate ?? d.rate)} </div>`;
    case "changedBefore":
      return `${d.rate}<br>0.1000 <div class="change-preview-wrap"><img src="/trans.gif" alt="Spacer1"> ${note(quarter, d.rate)} </div>`;
    case "blank": return `<img src="/trans.gif" alt="Spacer1">`;
    case "blankWithNote": return `<div class="change-preview-wrap"><img src="/trans.gif"> ${note(quarter, d.rate)} </div>`;
    case "junk": return "n/a";
  }
}

function row(code: string, diesel: Diesel, opts: { surcharge?: boolean; cells?: number; quarter: string }) {
  const name = `<td width="150"><span>${code}</span>${opts.surcharge ? " (Surcharge) " : ""}<br></td>`;
  const fuel = Array.from({ length: (opts.cells ?? 15) }, (_, i) =>
    `<td>${i === 1 ? dieselCell(diesel, opts.quarter) : "0.5000<br>0.1000"}</td>`,
  ).join("");
  return `<tr id="row-${code}" bgcolor="#f8fafc">${name}<td>U.S.<br>Can.</td>${fuel}</tr>`;
}

interface PageOpts {
  quarter?: string; // e.g. "2026Q3"
  heading?: string;
  overrides?: Record<string, Diesel>;
  omit?: string[];
  extraRows?: string[];
  notFinalUntil?: string;
  noTable?: boolean;
}
function page(o: PageOpts = {}) {
  const quarter = o.quarter ?? "2026Q3";
  const site = siteQuarter(quarter);
  const overrides = o.overrides ?? {};
  const body = US_STATES.filter((c) => !(o.omit ?? []).includes(c))
    .map((code) => {
      const d: Diesel = overrides[code] ?? (code === "OR" ? { kind: "blank" } : { kind: "plain", rate: "0.3000" });
      return row(code, d, { quarter: site });
    })
    .concat(o.extraRows ?? [])
    .join("\n");
  const canada = row("AB", { kind: "plain", rate: "0.3519" }, { quarter: site });
  const heading = o.heading ?? `3rd Quarter 2026 Fuel <a href='/taxmatrix4'>Tax Rates</a>`;
  const notice = o.notFinalUntil ? `<h4>This matrix is not final until <strong>${o.notFinalUntil}</strong>.</h4>` : "";
  const table = o.noTable ? "" : `<table id="rwd-table-large"><tr><th>State</th></tr>${canada}${body}</table>`;
  return `<html><body><h1>${heading}</h1>${notice}${table}</body></html>`;
}
const surchargeRow = (code: string, rate: string, quarter = "3Q2026") =>
  row(code, { kind: "plain", rate }, { surcharge: true, quarter });

// ---- Tests ----------------------------------------------------------------------------------------
describe("quarter helpers", () => {
  it("converts to the site's format and builds the URL", () => {
    expect(siteQuarter("2026Q3")).toBe("3Q2026");
    expect(matrixUrl("2026Q4")).toBe("https://www.iftach.org/taxmatrix4/Taxmatrix.php?QY=4Q2026");
    expect(() => siteQuarter("2026-3")).toThrow(/Bad quarter/);
    expect(() => parseMatrix("", "nope")).toThrow(/Bad quarter/);
  });
});

describe("parseMatrix: happy paths", () => {
  it("reads all 48 states, ignores Canada, and records Oregon as blank", () => {
    const { rates, blankDiesel, finalDate } = parseMatrix(page(), "2026Q3");
    expect(Object.keys(rates)).toHaveLength(48);
    expect(rates.TX).toEqual({ base: 0.3, surcharge: 0 });
    expect(rates.OR).toEqual({ base: 0, surcharge: 0 });
    expect(blankDiesel).toEqual(["OR"]);
    expect(finalDate).toBeNull();
  });

  it("reads rates from both changed-cell layouts and from cells with no Canadian value", () => {
    const { rates } = parseMatrix(
      page({
        overrides: {
          AL: { kind: "changedInside", rate: "0.3100" },
          CA: { kind: "changedBefore", rate: "0.9790" },
          TX: { kind: "usOnly", rate: "0.2000" },
        },
      }),
      "2026Q3",
    );
    expect(rates.AL!.base).toBe(0.31);
    expect(rates.CA!.base).toBe(0.979);
    expect(rates.TX!.base).toBe(0.2);
  });

  it("adds a surcharge row's diesel rate to the state", () => {
    const { rates } = parseMatrix(page({ extraRows: [surchargeRow("KY", "0.1050")] }), "2026Q3");
    expect(rates.KY).toEqual({ base: 0.3, surcharge: 0.105 });
  });

  it("captures the 'not final until' date as ISO", () => {
    const { finalDate } = parseMatrix(page({ quarter: "2026Q4", heading: "4th Quarter 2026 Fuel <a>Tax Rates</a>", notFinalUntil: "December 4, 2026" }), "2026Q4");
    expect(finalDate).toBe("2026-12-04");
  });
});

describe("parseMatrix: refuses anything it does not understand", () => {
  it("rejects a page for a different quarter (heading)", () => {
    expect(() => parseMatrix(page({ heading: "2nd Quarter 2026 Fuel Tax Rates" }), "2026Q3")).toThrow(/refusing to read a different quarter/);
  });

  it("rejects rate-change notes that name another quarter", () => {
    const html = page({ overrides: { AL: { kind: "changedInside", rate: "0.3100", quarter: "2Q2026" } } });
    expect(() => parseMatrix(html, "2026Q3")).toThrow(/Rate-change notes name/);
  });

  it("rejects notes naming two different quarters", () => {
    const html = page({ overrides: { AL: { kind: "changedInside", rate: "0.31", quarter: "3Q2026" }, AZ: { kind: "changedInside", rate: "0.32", quarter: "2Q2026" } } });
    expect(() => parseMatrix(html.replaceAll("0.31<", "0.3100<").replaceAll("0.32<", "0.3200<"), "2026Q3")).toThrow();
  });

  it("rejects a displayed rate that disagrees with its rate-change note", () => {
    const html = page({ overrides: { AL: { kind: "changedInside", rate: "0.3100", noteRate: "0.3200" } } });
    expect(() => parseMatrix(html, "2026Q3")).toThrow(/disagrees with rate-change note/);
  });

  it("rejects a blank cell that still carries a rate-change note", () => {
    const html = page({ overrides: { AL: { kind: "blankWithNote", rate: "0.3100" } } });
    expect(() => parseMatrix(html, "2026Q3")).toThrow(/no displayed rate/);
  });

  it("rejects a blank diesel rate outside the expected list", () => {
    expect(() => parseMatrix(page({ overrides: { TX: { kind: "blank" } } }), "2026Q3")).toThrow(/TX: no diesel rate/);
  });

  it("rejects unparseable cell content", () => {
    expect(() => parseMatrix(page({ overrides: { TX: { kind: "junk" } } }), "2026Q3")).toThrow(/unexpected diesel cell content/);
  });

  it("rejects a row with the wrong number of cells", () => {
    const bad = row("TX", { kind: "plain", rate: "0.2000" }, { quarter: "3Q2026", cells: 14 });
    expect(() => parseMatrix(page({ omit: ["TX"], extraRows: [bad] }), "2026Q3")).toThrow(/expected 17 cells/);
  });

  it("rejects a missing state and duplicate rows", () => {
    expect(() => parseMatrix(page({ omit: ["WY"] }), "2026Q3")).toThrow(/WY: base row missing/);
    const dup = row("WY", { kind: "plain", rate: "0.2400" }, { quarter: "3Q2026" });
    expect(() => parseMatrix(page({ extraRows: [dup] }), "2026Q3")).toThrow(/duplicate base row/);
    const dupS = [surchargeRow("KY", "0.1050"), surchargeRow("KY", "0.1050")];
    expect(() => parseMatrix(page({ extraRows: dupS }), "2026Q3")).toThrow(/duplicate surcharge row/);
  });

  it("rejects a page with no rate table", () => {
    expect(() => parseMatrix(page({ noTable: true }), "2026Q3")).toThrow(/Rate table not found/);
  });
});

describe("validateRateFile and buildRateFile", () => {
  const good = () => buildRateFile({ quarter: "2026Q3", html: page(), retrievedAt: "2026-09-19" });

  it("builds a final file with the official source URL", () => {
    const f = good();
    expect(f).toMatchObject({ quarter: "2026Q3", status: "final", finalDate: null, fuel: "special diesel", blankDiesel: ["OR"] });
    expect(f.sourceUrl).toBe(matrixUrl("2026Q3"));
    expect(validateRateFile(f)).toEqual([]);
  });

  it("builds a preliminary file when the page says it is not final", () => {
    const f = buildRateFile({ quarter: "2026Q4", html: page({ quarter: "2026Q4", heading: "4th Quarter 2026 Fuel Tax Rates", notFinalUntil: "December 4, 2026" }), retrievedAt: "2026-09-19" });
    expect(f).toMatchObject({ status: "preliminary", finalDate: "2026-12-04" });
  });

  it("refuses to build a file with an implausible rate", () => {
    const html = page({ overrides: { TX: { kind: "plain", rate: "5.0000" } } });
    expect(() => buildRateFile({ quarter: "2026Q3", html, retrievedAt: "2026-09-19" })).toThrow(/TX base 5 out of range/);
  });

  it("reports every structural problem", () => {
    const f = good();
    const broken = {
      ...f,
      quarter: "2026-3",
      status: "draft",
      retrievedAt: "yesterday",
      sourceUrl: "https://example.com/rates",
      blankDiesel: ["OR", "TX"],
      rates: { ...f.rates, ZZ: { base: 0.3, surcharge: 0 }, TX: { base: 0.2, surcharge: 0 }, OR: { base: 0.1, surcharge: 0 }, AL: { base: 0.3, surcharge: 9 } },
    } as never;
    delete (broken as { rates: Record<string, unknown> }).rates.WY;
    const problems = validateRateFile(broken).join(" | ");
    for (const expected of ["bad quarter", "bad status", "bad retrievedAt", "not the IFTA matrix", "missing WY", "unexpected jurisdiction ZZ", "TX may not have a blank", "OR is listed blank but has a rate", "AL surcharge 9 out of range"]) {
      expect(problems).toContain(expected);
    }
  });

  it("requires a final date on preliminary files", () => {
    expect(validateRateFile({ ...good(), status: "preliminary", finalDate: null })).toContain("preliminary file needs finalDate");
  });

  it("only allows Oregon to be blank", () => {
    expect([...EXPECTED_BLANK_DIESEL]).toEqual(["OR"]);
  });
});
