# 04 · SEO plan

## Strategy in one paragraph
Win long-tail and intent-rich queries with **tools that are better than what ranks**, backed by genuinely useful content. Competitors are mostly thin single calculators, so we differentiate with all-in math (deadhead, fees), dated rate data, documented formulas, speed and a clean mobile experience. We do **not** mass-produce near-duplicate pages.

## Keyword approach
1. **Seed list** (verify with Keyword Planner / Search Console, volumes unknown today):
   - Cost per mile: "owner operator cost per mile calculator", "trucking cost per mile", "break even rate per mile trucking"
   - Load profit: "load profit calculator trucking", "is this load worth it calculator", "deadhead miles cost"
   - Detention: "detention pay calculator trucking", "layover pay calculator"
   - IFTA: "IFTA calculator", "IFTA fuel tax by state", "IFTA rates Q[n] 20xx" (freshness-driven)
   - Per diem: "trucker per diem calculator", "per diem rate for truck drivers 20xx"
2. **Classify intent:** tool (calculator), informational (how/what), data (rates by state/quarter). Map each cluster to one primary URL to avoid cannibalization.
3. **Selection filter for new pages:** (a) evidence of demand, (b) we can add unique data or a better tool, (c) top-10 results are beatable (small domains ranking is a good sign), (d) fits ad-friendly, non-sensitive content.
4. **Record** every target keyword, URL, date published and later position in `docs/seo-tracker.csv` (create in Phase 2).

## URL and site structure
```
/                                  hub
/calculators/                      index of tools
/cost-per-mile-calculator/         tool pages (keyword-first slugs, trailing slash)
/load-profit-calculator/
/detention-pay-calculator/
/per-diem-calculator/
/ifta-calculator/
/ifta-rates/                       data hub, by quarter
/ifta-rates/[state]/               only when we add real per-state content
/guides/[slug]/                    long-form
/glossary/[term]/                  short definitions, link to tools
/about/ /privacy/ /terms/ /contact/
```
Rules: flat and short, lowercase, hyphens, no dates in slugs (keep URLs evergreen), a single canonical per page.

## On-page template (tools)
Title ≤ 60 chars with the head term first; meta description 140–160 chars with a benefit; one H1; H2s for how it works, example, FAQ; alt text for any images; JSON-LD `WebApplication` + `FAQPage` (FAQ only when visible) + `BreadcrumbList`; internal links to 2–4 related tools and 1–2 guides; "Last updated" for data-driven tools.

## Technical SEO checklist
- [x] Static HTML, canonical, sitemap, robots
- [ ] `lastmod` in the sitemap driven by content dates
- [ ] `BreadcrumbList` schema, `Organization` schema with logo
- [ ] Open Graph image per tool (generated at build, Phase 1.6)
- [ ] 404 page, redirects file, `www` → apex
- [ ] `hreflang`: not needed (single language)
- [ ] Core Web Vitals monitored in Search Console (field data)
- [ ] Structured-data validation in CI (Rich Results test locally before launch)
- [ ] **IndexNow** ping in the deploy pipeline (Bing/Yandex etc.). Note: Google does not use IndexNow.

## Fast indexing (realistic)
Google indexing speed is driven by site quality and crawl demand, not tricks. What helps:
1. Verified Search Console domain property, sitemap submitted on day 1.
2. **URL Inspection → Request indexing** for the first ~10 key pages (manual, limited quota).
3. Internal links from the homepage to every tool; no orphan pages.
4. A few real external links (forums, directories, communities) so crawlers discover the domain.
5. Do not use indexing-API tricks for non-job/live-stream pages, and do not buy links.
6. Expect weeks to months for competitive terms. Low-competition long-tail can move earlier.

## Content and E-E-A-T
- Author/publisher identity on About page with a real contact.
- Every number sourced, with links; formulas explained; worked examples with realistic values.
- Use first-hand-style, practical language (what a dispatcher or driver actually decides), not generic filler. Avoid unverified claims (earnings, "guaranteed").
- Do not rely on AI text unedited; each guide gets a human accuracy review against sources.

## Programmatic SEO guardrails (avoid "scaled content abuse")
Allowed: pages where each URL has **distinct, useful data** (e.g., IFTA rate per jurisdiction per quarter, with the tool prefilled). Not allowed: swapping a state name into identical text. Gate: a page ships only if it would be useful without ads, has ≥ 300 words of unique content or a unique data table, and passes a manual spot check.

## Off-page (Phase 5)
Trucking communities and forums (follow rules, be useful), owner-operator bookkeeping and dispatcher blogs, a "cite this / embed this calculator" widget with attribution, data-driven mini-studies ("2026 diesel price vs breakeven rate"), HARO-style expert responses. No paid links, no link exchanges.

## Measurement
Weekly: Search Console (impressions, clicks, CTR, position by page/query, CWV, indexing report). Monthly: update the tracker, prune or improve pages with impressions but no clicks (title/description tests), merge cannibalizing pages.
