// Daily digest bot. Usage: node scripts/digest/run.mjs [--dry] [--force]
//   --dry    fetch and rank only; no AI call, nothing written
//   --force  write even if today's post already exists
// Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (Workers AI), DIGEST_MODEL (optional)
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rankCandidates, parseFeed } from "./lib.mjs";
import { runDigest } from "./pipeline.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..", "..");
const newsDir = join(web, "src", "content", "news");
const statePath = join(here, "state.json");
const MODEL = process.env.DIGEST_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const args = new Set(process.argv.slice(2));
const cfg = JSON.parse(readFileSync(join(here, "feeds.json"), "utf8"));

const toolsSrc = readFileSync(join(web, "src", "data", "tools.ts"), "utf8");
const tools = [...toolsSrc.matchAll(/path:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"/g)].map((m) => ({ path: m[1], name: m[2] }));
if (!tools.length) throw new Error("could not read calculator paths from src/data/tools.ts");

const now = new Date();
const today = now.toISOString().slice(0, 10);
if (!args.has("--force") && !args.has("--dry") && existsSync(newsDir) && readdirSync(newsDir).some((f) => f.startsWith(today))) {
  console.log(`A digest for ${today} already exists; nothing to do.`);
  process.exit(0);
}

const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { usedUrls: [] };
const used = new Set(state.usedUrls);

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "HaulNumbersDigest/1.0 (+https://haulnumbers.com)" }, signal: AbortSignal.timeout(20000), redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

if (args.has("--dry")) {
  const all = [];
  for (const f of cfg.feeds) {
    try { all.push(...parseFeed(await fetchText(f.url), f.publisher)); } catch (e) { console.log(`feed failed: ${f.publisher}: ${e.message}`); }
  }
  for (const c of rankCandidates(all, cfg, used, now).slice(0, 14)) console.log(`${String(c.score).padStart(3)}  [${c.publisher}] ${c.title}`);
  process.exit(0);
}

const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
if (!account || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (a token with Workers AI: Read/Edit).");

const ai = async (messages, opts) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...opts }),
    signal: AbortSignal.timeout(120000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(`Workers AI ${res.status}: ${JSON.stringify(json.errors ?? json).slice(0, 300)}`);
  const r = json.result ?? {};
  return r.response ?? r.choices?.[0]?.message?.content ?? r.output_text ?? "";
};
ai.model = MODEL;

const result = await runDigest({ cfg, feeds: cfg.feeds, fetchText, ai, now, used, tools, log: (m) => console.log(m) });
if (result.status !== "published") {
  console.log(`No post today: ${result.reason}`);
  process.exit(0);
}
writeFileSync(join(newsDir, result.filename), result.markdown);
writeFileSync(statePath, `${JSON.stringify({ usedUrls: [...state.usedUrls, ...result.sources.map((s) => s.url)].slice(-400) }, null, 2)}\n`);
console.log(`Wrote src/content/news/${result.filename}`);
