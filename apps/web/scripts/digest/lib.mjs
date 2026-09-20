// Pure helpers for the daily digest: feed parsing, ranking and the checks an AI draft must pass.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function plainText(raw) {
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const noTags = decodeEntities(unwrapped).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
  return decodeEntities(noTags).replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

/** RSS 2.0 and Atom. Returns items with plain-text title/summary, absolute https link and a Date (or null). */
export function parseFeed(xml, publisher) {
  const items = [];
  for (const [block] of xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)) {
    const title = plainText(tag(block, "title"));
    let link = plainText(tag(block, "link"));
    if (!link) link = block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "";
    const dateRaw = plainText(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date"));
    const date = dateRaw ? new Date(dateRaw) : null;
    const summary = plainText(tag(block, "description") || tag(block, "summary") || tag(block, "content:encoded") || tag(block, "content")).slice(0, 600);
    if (!title || !/^https:\/\//.test(link)) continue;
    items.push({ publisher, title, url: link, date: date && !Number.isNaN(date.getTime()) ? date : null, summary });
  }
  return items;
}

export function scoreItem(item, keywords) {
  const t = item.title.toLowerCase();
  const s = item.summary.toLowerCase();
  let score = 0;
  for (const [k, w] of Object.entries(keywords)) {
    if (t.includes(k)) score += w * 2;
    else if (s.includes(k)) score += w;
  }
  return score;
}

/** Fresh, unused, relevant items, best first; at most one item per URL and per near-identical title. */
export function rankCandidates(items, { keywords, minScore, maxAgeHours }, used, now) {
  const seen = new Set();
  return items
    .filter((i) => i.date && now - i.date <= maxAgeHours * 3600e3 && i.date.getTime() <= now.getTime() + 3600e3)
    .filter((i) => !used.has(i.url))
    .map((i) => ({ ...i, score: scoreItem(i, keywords) }))
    .filter((i) => i.score >= minScore)
    .sort((a, b) => b.score - a.score || b.date - a.date)
    .filter((i) => {
      const key = i.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function extractJson(text) {
  if (typeof text === "object" && text) return text;
  const s = String(text);
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(s.slice(start, end + 1));
}

const words = (s) => s.toLowerCase().replace(/[^a-z0-9'$%.\s-]+/g, " ").split(/\s+/).filter(Boolean);
export const countWords = (md) => words(md.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`]/g, " ")).length;

const numbersIn = (s) => new Set((s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.0+$/, "")));

const BANNED = ["in today's fast-paced", "delve", "game-changer", "game changer", "in conclusion", "it's important to note", "landscape", "navigating the", "buckle up", "look no further", "as an ai"];

/**
 * Returns a list of problems; an empty list means the draft may be published.
 * Guards: length, cited sources, links only to given sources or our own pages, no figure that is absent from the
 * sources, no long verbatim run copied from a source, no stock AI phrasing.
 */
export function validateArticle(article, sources, cfg, internalPaths) {
  const problems = [];
  const { title, description, body } = article;
  if (typeof title !== "string" || title.length < 20 || title.length > 90) problems.push("title must be 20-90 characters");
  if (typeof description !== "string" || description.length < 80 || description.length > 170) problems.push("description must be 80-170 characters");
  if (typeof body !== "string") return [...problems, "body missing"];
  const n = countWords(body);
  if (n < cfg.minWords || n > cfg.maxWords) problems.push(`body has ${n} words; need ${cfg.minWords}-${cfg.maxWords}`);
  if (/^#\s/m.test(body)) problems.push("body must not contain an H1 heading");
  if (!/^##\s/m.test(body)) problems.push("body needs at least one ## heading");

  const allowed = new Set(sources.map((s) => s.url));
  const cited = new Set();
  for (const [, url] of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (allowed.has(url)) cited.add(url);
    else if (!(url.startsWith("/") && internalPaths.includes(url))) problems.push(`link not allowed: ${url}`);
  }
  if (cited.size < Math.min(cfg.minSources, sources.length)) problems.push(`cite at least ${Math.min(cfg.minSources, sources.length)} of the given sources with inline links; cited ${cited.size}`);

  const corpus = sources.map((s) => `${s.title} ${s.summary}`).join(" ");
  const known = numbersIn(corpus);
  const stray = [...numbersIn(body.replace(/\]\([^)]*\)/g, ")"))].filter((x) => !known.has(x) && !(Number(x) >= 1 && Number(x) <= 10 && Number.isInteger(Number(x))));
  if (stray.length) problems.push(`figures not found in the sources (remove them): ${stray.join(", ")}`);

  const src = words(corpus);
  const grams = new Set();
  for (let i = 0; i + 8 <= src.length; i++) grams.add(src.slice(i, i + 8).join(" "));
  const art = words(body.replace(/\]\([^)]*\)/g, ")"));
  for (let i = 0; i + 8 <= art.length; i++) {
    if (grams.has(art.slice(i, i + 8).join(" "))) {
      problems.push(`copies a source verbatim near "${art.slice(i, i + 8).join(" ")}"; rewrite in your own words`);
      break;
    }
  }
  const lower = `${title} ${body}`.toLowerCase();
  for (const b of BANNED) if (lower.includes(b)) problems.push(`avoid the phrase "${b}"`);
  return problems;
}

export const slugify = (s) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");

const q = (s) => JSON.stringify(String(s));

export function toMarkdown({ title, description, body, date, sources, tools, model }) {
  const fm = [
    "---",
    `title: ${q(title)}`,
    `description: ${q(description)}`,
    `date: ${date}`,
    `model: ${q(model)}`,
    `tools: [${tools.map(q).join(", ")}]`,
    "sources:",
    ...sources.flatMap((s) => [`  - publisher: ${q(s.publisher)}`, `    title: ${q(s.title)}`, `    url: ${q(s.url)}`]),
    "---",
    "",
  ];
  return `${fm.join("\n")}${body.trim()}\n`;
}
