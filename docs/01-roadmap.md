# 01 · Roadmap

Each phase has **deliverables** and **exit criteria**. Do not start monetization work in a phase before its exit criteria are met. Dates are deliberately absent: phases are gated by quality, not the calendar. Effort is a rough size (S ≤ 1 day, M ≈ 2–3 days, L ≈ 1 week).

## Phase 0 · Foundation ✅ done
- [x] npm-workspaces monorepo, TypeScript strict
- [x] `packages/core`: money helpers, result type, cost-per-mile with 6 tests
- [x] `apps/web`: Astro shell, layout, SEO head, JSON-LD, sitemap, robots, About, Privacy, ad slot component
- [x] 0 audit vulnerabilities, typecheck and build green

## Phase 1 · Web MVP (5 calculators) — target: quality complete
| # | Task | Size |
|---|---|---|
| 1.1 | Load profit and deadhead calculator: **core + tests + web page ✅** | M |
| 1.2 | Detention and layover pay calculator: **core + tests + web page ✅** | S |
| 1.3 | Per diem calculator (data-driven rates): **core + tests + web page ✅** | M |
| 1.4 | IFTA quarterly estimator with rate data pipeline: **pipeline + core + tests + web page ✅** (diesel, 48 states) | L |
| 1.5 | Shared UI components: field, select, field group, result panel (with disclaimer), FAQ, related tools, tool registry, shared global CSS and client helpers **✅** | M |
| 1.6 | Per-tool content: formula, worked example, FAQ, glossary links (real text, not filler) | L |
| 1.7 | Hub pages: `/calculators/` **✅** (driven by `data/tools.ts`); `/guides/` deferred until real guides exist, since an empty page hurts AdSense approval | S |
| 1.8 | Vitest coverage ≥ 90% on core ✅; a11y pass: contrast (WCAG AA, both themes), labels and Lighthouse a11y 100 ✅; keyboard-only pass ✅ (tab order, focus rings, accessible names, skip link, IFTA add/remove/typing); **still open:** a screen-reader pass with real assistive tech | M |
| 1.9 | Lighthouse CI budget in CI: manual Lighthouse run done (100/100/100/100, CLS 0, all 7 pages); **automating it needs a CI setup, which does not exist yet** | S |

**Exit:** 5 calculators pass tests, Lighthouse targets met, each tool page has ≥ 600 words of useful original content, disclaimers present.

## Phase 2 · Launch and AdSense approval
| # | Task | Size |
|---|---|---|
| 2.1 | Buy domain (`haulnumbers.com`, verify availability first), enable auto-renew, WHOIS privacy | S |
| 2.2 | Cloudflare Pages project, custom domain, HTTPS, www→apex redirect, security headers | S |
| 2.3 | Search Console (domain property), submit sitemap, IndexNow ping on deploy | S |
| 2.4 | Privacy, About, Contact and Terms pages ✅ built (privacy policy meets the checklist in doc 05); **needs a real contact email**, which requires the domain | S |
| 2.5 | Consent management (Google-certified CMP for EEA/UK/CH) | M |
| 2.6 | Privacy-friendly analytics (Cloudflare Web Analytics) | S |
| 2.7 | Apply for AdSense; add `ads.txt`; fix any rejection reasons | S + wait |
| 2.8 | Create ad units, set `PUBLIC_ADSENSE_CLIENT` / slot env vars and `ADS_TXT`, verify no CLS | M |
| 2.9 | **Compliance gate:** `npm run build:web && npm run check:compliance` with production env must pass before every deploy (built and tested; see doc 05) | S |

**Exit:** site live and indexed, AdSense approved, ads render without CLS regressions, consent works.

## Phase 3 · Android app + AdMob
| # | Task | Size |
|---|---|---|
| 3.1 | `apps/mobile` Expo app (TypeScript), imports `@haulnumbers/core` | M |
| 3.2 | Screens for the 5 calculators, offline, saved scenarios (local storage) | L |
| 3.3 | Navigation, theming (dark mode), accessibility, tablet layout | M |
| 3.4 | AdMob, following the App rules in doc 05: adaptive banner on calculator screens only; interstitial only when leaving a calculator screen (never on launch/exit/while typing); UMP consent gating the ads SDK; test ids in dev | M |
| 3.5 | Test ads only until release; App Store listing: title, description, screenshots, feature graphic | M |
| 3.6 | Play Console: data safety form, content rating, privacy policy URL, target-API compliance | M |
| 3.7 | Closed testing: 12 testers opted in for 14 days if the account is a personal account created after 2023-11-13 (otherwise exempt; see doc 05) | M + wait |
| 3.8 | Crash reporting (Play vitals + optional Sentry), release signing via Play App Signing | S |
| 3.9 | Production release, staged rollout 10% → 50% → 100% | S |

**Exit:** app in production, crash-free ≥ 99.5%, AdMob serving real ads with valid `app-ads.txt`, no policy warnings.

## Phase 4 · SEO expansion (quality-first)
- 4.1 Read Search Console data to see which queries actually get impressions; double down there.
- 4.2 **State pages with real data**, not templates with swapped names: IFTA rates by jurisdiction, state fuel tax, weigh station / permit basics only where we can cite a source.
- 4.3 Guides: how to calculate CPM, deadhead math, factoring cost comparison, lease vs buy (each ≥ 1,000 words, original examples, sources).
- 4.4 New tools ranked by Search Console evidence (candidates: factoring fee, fuel surcharge, truck loan/lease, trip planner cost, depreciation, break-even miles).
- 4.5 Internal linking model: tool ↔ guide ↔ glossary; breadcrumbs with structured data.
- 4.6 Refresh cadence: quarterly IFTA rate update PR, annual per-diem update, yearly content review.

**Exit:** ≥ 25 pages that each have unique data or analysis; no thin page ships.

## Phase 5 · Optimization and growth
- 5.1 Ad layout experiments (position, count, sticky vs inline), judged on RPM **and** engagement, capped by CWV limits.
- 5.2 Android: rewarded ad for "save/export PDF" (opt-in only), review prompts, Play listing A/B tests.
- 5.3 Backlinks by usefulness: trucking forums and subreddits (follow their rules), owner-operator communities, dispatcher and bookkeeper resource pages, embeddable calculator (with attribution link).
- 5.4 Email/notification for quarterly IFTA deadline reminders (opt-in, local notifications in the app first).
- 5.5 Localization to Canadian English/IFTA provinces if data shows demand.

## Phase 6 · Operations (ongoing)
Quarterly rate updates, dependency updates monthly, Search Console and AdSense policy-center review weekly, yearly domain renewal check, annual policy re-read (AdSense, AdMob, Play).

## Dependency graph (short)
`0 → 1 → 2 → 3` and `4` can start once Phase 2 is indexed. `3` needs the consent design from `2.5`. IFTA data pipeline (1.4) is the highest-risk item, so start it early in Phase 1.
