import test from "node:test";
import assert from "node:assert/strict";
import { parseFeed, rankCandidates, validateArticle, countWords, toMarkdown, extractJson } from "./digest/lib.mjs";
import { runDigest } from "./digest/pipeline.mjs";

const NOW = new Date("2026-09-20T12:00:00Z");
const rss = (items) => `<?xml version="1.0"?><rss><channel><title>x</title>${items}</channel></rss>`;
const item = (t, l, d, desc) => `<item><title><![CDATA[${t}]]></title><link>${l}</link><pubDate>${d}</pubDate><description><![CDATA[<p>${desc}</p>]]></description></item>`;
const cfg = { keywords: { diesel: 2, "owner-operator": 4, ifta: 4 }, minScore: 4, maxAgeHours: 96, minSources: 3, maxSources: 5, minWords: 60, maxWords: 800 };

test("parseFeed handles RSS, CDATA, entities and skips non-https links", () => {
  const xml = rss(item("Diesel &#8216;up&#8217; &amp; more", "https://a.test/1", "Sat, 19 Sep 2026 10:00:00 +0000", "Diesel rose 4 cents.") + item("Bad", "http://a.test/2", "Sat, 19 Sep 2026 10:00:00 +0000", "x"));
  const out = parseFeed(xml, "A");
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "Diesel ‘up’ & more");
  assert.equal(out[0].summary, "Diesel rose 4 cents.");
});

test("parseFeed handles Atom", () => {
  const xml = `<feed><entry><title>T</title><link rel="alternate" href="https://b.test/x"/><updated>2026-09-19T10:00:00Z</updated><summary>S</summary></entry></feed>`;
  assert.deepEqual(parseFeed(xml, "B").map((i) => i.url), ["https://b.test/x"]);
});

test("rankCandidates drops stale, used, irrelevant and duplicate-title items", () => {
  const mk = (title, url, d, summary = "") => ({ publisher: "P", title, url, date: new Date(d), summary });
  const items = [
    mk("Owner-operator diesel costs", "https://p/1", "2026-09-19T00:00:00Z"),
    mk("Owner-operator diesel costs", "https://q/1", "2026-09-19T00:00:00Z"),
    mk("IFTA update", "https://p/2", "2026-09-10T00:00:00Z"),
    mk("IFTA used", "https://p/3", "2026-09-19T00:00:00Z"),
    mk("Celebrity news", "https://p/4", "2026-09-19T00:00:00Z"),
  ];
  const out = rankCandidates(items, cfg, new Set(["https://p/3"]), NOW);
  assert.deepEqual(out.map((i) => i.url), ["https://p/1"]);
});

const sources = [
  { publisher: "A", title: "Diesel rose to 3.90 a gallon", url: "https://a/1", summary: "Average diesel climbed four cents to 3.90 a gallon this week according to the survey." },
  { publisher: "B", title: "Spot rates firm", url: "https://b/1", summary: "Dry van spot rates held near 2.10 per mile as capacity tightened across the Midwest." },
  { publisher: "C", title: "IFTA filing reminder", url: "https://c/1", summary: "Quarterly returns are due at the end of the month for every licensed carrier." },
];
const body = `Fuel and rates moved together this week, and that matters when you run your own truck.\n\n## Fuel\n\n[A](https://a/1) says diesel is now 3.90 a gallon after a small climb.\n\n## Rates\n\n[B](https://b/1) puts dry van spot near 2.10 per mile, a little firmer than before.\n\n## Paperwork\n\n[C](https://c/1) is nudging carriers about filing dates.\n\n## What it means for your numbers\n\nRe-run your cost per mile with the new fuel price in the [cost per mile calculator](/cost-per-mile-calculator/) before you quote your next load.`;
const good = { title: "Diesel edges up while spot rates firm up", description: "Fuel climbed a little, dry van rates held firm and filing dates are close. Here is what that does to your margin.", body };

test("validateArticle accepts a grounded draft", () => {
  assert.deepEqual(validateArticle(good, sources, cfg, ["/cost-per-mile-calculator/"]), []);
});

test("validateArticle rejects invented figures, foreign links, missing citations and stock phrases", () => {
  const p = (b) => validateArticle({ ...good, body: b }, sources, cfg, ["/cost-per-mile-calculator/"]).join(" | ");
  assert.match(p(body + " Fuel is up 12.5% too."), /figures not found/);
  assert.match(p(body + " See [x](https://evil.test/)."), /link not allowed/);
  assert.match(p(body.replace(/\(https:\/\/c\/1\)/, "(https://a/1)").replace(/\(https:\/\/b\/1\)/, "(https://a/1)")), /cite at least 3/);
  assert.match(p(body + "\n\nIn conclusion, buckle up."), /avoid the phrase/);
  assert.match(p(body + "\n\nAverage diesel climbed four cents to 3.90 a gallon this week according to the survey."), /copies a source verbatim/);
  assert.match(p("Short.\n\n## H"), /words/);
});

test("countWords ignores link targets", () => assert.equal(countWords("a [b c](https://x/y/z) d"), 4));
test("extractJson tolerates prose around the object", () => assert.deepEqual(extractJson('Sure! {"a":1} done'), { a: 1 }));

test("toMarkdown emits quoted, parseable front matter", () => {
  const md = toMarkdown({ ...good, title: 'He said "go"', date: "2026-09-20", sources: [sources[0]], tools: ["/x/"], model: "m" });
  assert.match(md, /^---\ntitle: "He said \\"go\\""/);
  assert.match(md, /sources:\n {2}- publisher: "A"/);
});

const feeds = [{ publisher: "A", url: "f://a" }, { publisher: "B", url: "f://b" }];
const feedXml = rss(
  item("Owner-operator diesel costs", "https://a/1", "Sat, 19 Sep 2026 10:00:00 +0000", sources[0].summary) +
  item("Owner-operator spot rates", "https://b/1", "Sat, 19 Sep 2026 10:00:00 +0000", sources[1].summary) +
  item("Owner-operator IFTA filing", "https://c/1", "Sat, 19 Sep 2026 10:00:00 +0000", sources[2].summary),
);
const tools = [{ path: "/cost-per-mile-calculator/", name: "Cost per mile" }];
const deps = (ai) => ({ cfg, feeds, fetchText: async () => feedXml, ai, now: NOW, used: new Set(), tools });

test("pipeline publishes after the model fixes a rejected draft", async () => {
  const replies = [
    JSON.stringify({ theme: "Costs", angle: "Watch fuel", picks: [1, 2, 3], tools: ["/cost-per-mile-calculator/", "/nope/"] }),
    JSON.stringify({ ...good, body: body + " Up 99% overall." }),
    JSON.stringify(good),
  ];
  const ai = async () => replies.shift();
  const r = await runDigest(deps(ai));
  assert.equal(r.status, "published");
  assert.match(r.filename, /^2026-09-20-diesel-edges-up/);
  assert.match(r.markdown, /tools: \["\/cost-per-mile-calculator\/"\]/);
  assert.equal(replies.length, 0);
});

test("pipeline skips rather than publishing a draft that never passes", async () => {
  const plan = JSON.stringify({ theme: "t", angle: "a", picks: [1, 2, 3], tools: [] });
  const bad = JSON.stringify({ ...good, body: "Too short." });
  let n = 0;
  const r = await runDigest(deps(async () => (n++ === 0 ? plan : bad)));
  assert.equal(r.status, "skipped");
  assert.equal(n, 4);
});

test("pipeline skips when too few relevant stories exist, and fails loudly when every feed fails", async () => {
  const few = await runDigest({ ...deps(async () => ""), fetchText: async () => rss(item("Owner-operator news", "https://a/1", "Sat, 19 Sep 2026 10:00:00 +0000", "x")) });
  assert.equal(few.status, "skipped");
  await assert.rejects(runDigest({ ...deps(async () => ""), fetchText: async () => { throw new Error("down"); } }), /every feed failed/);
});
