import { extractJson, parseFeed, rankCandidates, slugify, toMarkdown, validateArticle } from "./lib.mjs";

const PLAN_SYSTEM = "You are the editor of Haul Numbers, a site with money calculators for owner-operator truck drivers. You choose what to write about. Reply with one JSON object and nothing else.";
const WRITE_SYSTEM = `You write a short daily digest for owner-operator truck drivers, in plain, warm, direct English, like a knowledgeable dispatcher explaining the news over coffee. Second person ("you") where natural.
Hard rules:
- Use ONLY facts, names and figures that appear in the SOURCE material. Do not add numbers, dates, quotes or claims from memory. If the sources do not say, do not say.
- Put your own words around it: explain what the items mean together and what a driver running their own authority should do or watch. Never copy sentences from a source.
- Attribute plainly ("Land Line reports...") and link the publisher name to its source with a markdown link, exactly the given URL. Cite every source you use.
- Structure: a two- or three-sentence opening, then 2-4 sections with ## headings, then a final "## What it means for your numbers" section. No H1.
- No hype, no filler, no stock phrases. Short paragraphs. Where a Haul Numbers calculator fits, link it once using the given path.
Reply with one JSON object: {"title": string (20-90 chars), "description": string (80-170 chars, plain), "body": string (markdown)} and nothing else.`;

function planPrompt(cands, tools, cfg) {
  const list = cands.map((c, i) => `${i + 1}. [${c.publisher}] ${c.title} — ${c.summary.slice(0, 260)}`).join("\n");
  return `Candidate stories from the last few days:\n${list}\n\nCalculators we can link: ${tools.map((t) => `${t.path} (${t.name})`).join("; ")}\n\nPick ${cfg.minSources}-${cfg.maxSources} stories that belong together under ONE theme a working owner-operator would care about (costs, rates, fuel, rules, taxes, paperwork). Prefer stories from different publishers. Skip anything unrelated to running a small trucking business.\nReply as {"theme": string, "angle": string (one sentence: what the reader should take away), "picks": [story numbers], "tools": [0-2 calculator paths from the list]}`;
}

function writePrompt(plan, picked, tools) {
  const src = picked.map((s, i) => `SOURCE ${i + 1}\nPublisher: ${s.publisher}\nURL: ${s.url}\nHeadline: ${s.title}\nSummary: ${s.summary}`).join("\n\n");
  return `Theme: ${plan.theme}\nAngle: ${plan.angle}\n\n${src}\n\nCalculators you may link (path only): ${tools.map((t) => `${t.path} (${t.name})`).join("; ")}`;
}

export async function runDigest({ cfg, feeds, fetchText, ai, now, used, tools, log = () => {} }) {
  const settled = await Promise.allSettled(feeds.map(async (f) => parseFeed(await fetchText(f.url), f.publisher)));
  const items = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") items.push(...r.value);
    else log(`feed failed: ${feeds[i].publisher}: ${r.reason?.message ?? r.reason}`);
  });
  if (settled.every((r) => r.status === "rejected")) throw new Error("every feed failed");

  const cands = rankCandidates(items, cfg, used, now).slice(0, 14);
  log(`${items.length} items, ${cands.length} candidates`);
  if (cands.length < cfg.minSources) return { status: "skipped", reason: `only ${cands.length} relevant fresh stories` };

  let plan;
  for (let attempt = 0; attempt < 2 && !plan; attempt++) {
    try {
      const p = extractJson(await ai([{ role: "system", content: PLAN_SYSTEM }, { role: "user", content: planPrompt(cands, tools, cfg) }], { max_tokens: 500, temperature: 0.2 }));
      const picks = [...new Set((p.picks ?? []).map(Number))];
      const ok = picks.length >= cfg.minSources && picks.length <= cfg.maxSources && picks.every((n) => Number.isInteger(n) && n >= 1 && n <= cands.length);
      if (ok && typeof p.theme === "string" && typeof p.angle === "string") plan = { ...p, picks, tools: (p.tools ?? []).filter((t) => tools.some((x) => x.path === t)).slice(0, 2) };
    } catch (e) {
      log(`plan attempt ${attempt + 1}: ${e.message}`);
    }
  }
  if (!plan) return { status: "skipped", reason: "the model did not return a usable plan" };

  const picked = plan.picks.map((n) => cands[n - 1]);
  const internal = tools.map((t) => t.path);
  const messages = [{ role: "system", content: WRITE_SYSTEM }, { role: "user", content: writePrompt(plan, picked, tools) }];
  let problems = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    let article;
    try {
      article = extractJson(await ai(messages, { max_tokens: 1800, temperature: 0.6 }));
      problems = validateArticle(article, picked, cfg, internal);
    } catch (e) {
      problems = [`output was not valid JSON (${e.message})`];
    }
    if (!problems.length) {
      const date = now.toISOString().slice(0, 10);
      return {
        status: "published",
        filename: `${date}-${slugify(article.title)}.md`,
        sources: picked,
        markdown: toMarkdown({ ...article, date, sources: picked, tools: plan.tools, model: ai.model ?? "unknown" }),
      };
    }
    log(`draft ${attempt} rejected: ${problems.join(" | ")}`);
    messages.push({ role: "assistant", content: JSON.stringify(article ?? {}) }, { role: "user", content: `Rejected. Fix every problem and reply with the full JSON again:\n- ${problems.join("\n- ")}` });
  }
  return { status: "skipped", reason: `no draft passed the checks: ${problems.join("; ")}` };
}
