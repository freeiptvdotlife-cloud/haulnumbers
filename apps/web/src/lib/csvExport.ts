import type { Row } from "./toolUi";

function csvSafeCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvQuoteCell(value: string | number): string {
  const safe = csvSafeCell(value);
  return /[,"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function buildCsvString(columns: string[], rows: string[][]): string {
  const header = columns.map(csvQuoteCell).join(",");
  const body = rows.map((r) => r.map(csvQuoteCell).join(",")).join("\n");
  return body ? `${header}\n${body}` : header;
}

/** Converts the cached renderRows data into a Label/Value CSV string. */
export function buildRowsCsv(rows: Row[]): string {
  return buildCsvString(
    ["Label", "Value"],
    rows.map(([label, value]) => [label, value]),
  );
}

export function downloadCsv(content: string, filename: string): void {
  const bom = "﻿";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function csvFilename(site: string, toolId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${site}-${toolId}-${date}.csv`;
}
