// Usage (after `npm run build:web`, with the SAME environment variables as the build):
//   PUBLIC_ADSENSE_CLIENT=... PUBLIC_CONTACT_EMAIL=... npm run check:compliance
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDist } from "./complianceCheck.mjs";

// Optional first argument: a different build output folder.
const args = process.argv.slice(2);
const dist = args.find((a) => !a.startsWith("--")) ?? join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
// --allow-preview: tolerate the ad PREVIEW placeholder for local layout review. Never use it for a deploy check.
const env = { ...process.env, ALLOW_PREVIEW: args.includes("--allow-preview") ? "1" : "" };
const problems = checkDist(dist, env);
if (problems.length > 0) {
  console.error(`Compliance check FAILED (${problems.length}):\n` + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log(`Compliance check passed${process.env.PUBLIC_ADSENSE_CLIENT ? " (monetised build)" : env.ALLOW_PREVIEW ? " (PREVIEW build: not deployable)" : " (ad-free build)"}.`);
