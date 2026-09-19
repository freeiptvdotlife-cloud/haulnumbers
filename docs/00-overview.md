# 00 · Overview

## Vision
The most trustworthy, fastest set of money calculators for owner-operator truckers: every formula shown, every rate sourced, every result reproducible.

## Audience
- **Primary:** US owner-operators and small fleets (1–10 trucks), searching on desktop at night and on phones in the cab.
- **Secondary:** New CDL drivers considering buying a truck, dispatchers, trucking bookkeepers.
- **Geography:** English, US first (highest ad value). Canada later only where IFTA overlaps.

## Why this niche (evidence, Sept 2026 research)
- Small independent tool sites already rank on page 1 (truckleap, truckcalcs, haulalytics, iftacalculators), so a new domain can compete.
- Head terms ("cost per mile", "IFTA calculator") are also served by large brands and SaaS lead-gen. We do not win by copying a basic calculator. We win on **depth, accuracy, freshness and speed**.
- Advertisers here (factoring, insurance, fuel cards, load boards, truck sales) pay well relative to generic calculator niches.
- Limits: volumes were **not** measured (no keyword tool access). Validate in Phase 1 with Search Console and Keyword Planner before scaling content.

## Product principles
1. **Correct before clever.** Money math is tested, edge cases return errors, never silent zeros.
2. **Show the math.** Every tool documents its formula. This builds trust and helps SEO.
3. **Private by default.** Calculations run on-device. No inputs are sent to servers.
4. **Fast on a bad connection.** Static HTML, near-zero JS, no layout shift from ads.
5. **Ads never break the tool.** Reserved slots, no ads over inputs or results, no accidental-click placements.
6. **One source of truth.** The same `packages/core` powers web and Android.
7. **Data is dated.** Any rate table (IFTA, per diem) carries its source, effective date and retrieval date.

## Success metrics
Leading indicators (income is lagging and unpredictable, so we do not plan around it):

| Metric | Target | When |
|---|---|---|
| Core Web Vitals, field data | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 | From launch |
| Lighthouse (mobile) perf / SEO / a11y | ≥ 95 / 100 / ≥ 95 | Every release |
| Pages indexed / submitted | ≥ 90% | 4 weeks after launch |
| Calculators live (web) | 5 | End of Phase 1 |
| AdSense approved | Yes | Phase 2 |
| Organic clicks (Search Console) | Track weekly, set target after first 60 days of data | Phase 2+ |
| Android: crash-free sessions | ≥ 99.5% | Phase 3+ |
| Android: day-7 retention | Track, set target after first cohort | Phase 3+ |
| Page RPM / app eCPM | Measure per page and per placement, never assume | Phase 4+ |

## Non-goals (for now)
iOS, accounts/login, server-side storage, user-generated content, paid tier, non-English sites, live load boards, anything needing legal/tax advice claims.

## Disclaimers policy
Every result page states: estimates only, not financial, tax or legal advice. IFTA and tax tools additionally state that official filing happens with the user's base jurisdiction.
