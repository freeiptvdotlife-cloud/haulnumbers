// Usage (after `npm run build:web`, with the SAME environment variables as the build):
//   PUBLIC_ADSENSE_CLIENT=... PUBLIC_CONTACT_EMAIL=... npm run check:compliance
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDist } from "./complianceCheck.mjs";

// Optional first argument: a different build output folder.
const dist = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const problems = checkDist(dist, process.env);
if (problems.length > 0) {
  console.error(`Compliance check FAILED (${problems.length}):\n` + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log(`Compliance check passed${process.env.PUBLIC_ADSENSE_CLIENT ? " (monetised build)" : " (ad-free build)"}.`);
