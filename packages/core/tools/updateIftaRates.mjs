// Usage: node tools/updateIftaRates.mjs 2026Q3 [2026Q4 ...]
// Downloads each quarter from IFTA, Inc., validates it, and writes src/data/ifta/<year>q<n>.json.
// Review the diff before committing: a rate change should match the matrix's own change notes.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRateFile, matrixUrl } from "./iftaMatrix.mjs";

const quarters = process.argv.slice(2);
if (quarters.length === 0) {
  console.error("Usage: node tools/updateIftaRates.mjs 2026Q3 [2026Q4 ...]");
  process.exit(2);
}
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "ifta");
await mkdir(outDir, { recursive: true });
const today = new Date().toISOString().slice(0, 10);

for (const quarter of quarters) {
  const res = await fetch(matrixUrl(quarter), { headers: { "user-agent": "haulnumbers-rate-updater" } });
  if (!res.ok) throw new Error(`${quarter}: HTTP ${res.status}`);
  const file = buildRateFile({ quarter, html: await res.text(), retrievedAt: today });
  const path = join(outDir, `${quarter.toLowerCase()}.json`);
  await writeFile(path, JSON.stringify(file, null, 2) + "\n");
  console.log(`${quarter}: ${file.status}${file.finalDate ? ` (final ${file.finalDate})` : ""} -> ${path}`);
}
