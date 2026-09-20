# 07 · Decision log and open questions

Format: ADR-nnn · status · decision · why · trade-off. Add a new entry instead of editing old ones when a decision changes.

## ADR-001 · Niche: owner-operator trucking suite · accepted
Chosen over trades/construction calculators. Small independent tool sites rank in trucking, ad value is high, drivers are phone-first (natural web + app pairing), and IFTA rate data provides a freshness moat. Trade-off: smaller audience; volume unverified (validate in Phase 1–2).

## ADR-002 · Domain `haulnumbers.com` · proposed (not yet purchased)
Available per Verisign RDAP on 2026-09-19 (snapshot only). Short, brandable, not confusable with truckcalcs.com / truckercalc.com, room to expand beyond one tool. Backups: `truckingcalcs.com`, `loadprofitcalc.com`, `dieselmath.com`. Trade-off: weaker exact-match keyword signal, which matters little versus content and links.

## ADR-003 · One TypeScript core shared by web and Android (Expo) · accepted
Avoids writing money logic twice. Alternative: Kotlin + Compose (better native feel, but duplicate logic and roughly double the work). Revisit only if Expo performance or AdMob integration proves inadequate.

## ADR-004 · Astro static site + tiny inline scripts (no UI framework) · accepted
Best Core Web Vitals for content-heavy tool pages. Trade-off: if tools become highly stateful, introduce a small island framework (Preact/Solid) per page, not sitewide.

## ADR-005 · npm workspaces, not pnpm · accepted
pnpm was not installed; npm workspaces are sufficient at this size. Revisit if install times or hoisting issues appear.

## ADR-006 · All calculations client-side; no accounts, no backend · accepted
Privacy and cost benefits, and simpler compliance. Trade-off: no cross-device sync (acceptable for now).

## ADR-007 · Rate data as dated JSON files with tests, not hardcoded constants · accepted
Makes freshness auditable and enforceable in CI.

## ADR-008 · Cloudflare Pages hosting · proposed
Free, fast, global; matches available tooling. Alternative: Netlify/Vercel. Decision is cheap to reverse because the site is static.

## ADR-009 · IFTA v1 scope: diesel, 48 U.S. states, rates read from IFTA, Inc.'s own matrix · accepted
Rates are scraped from the official matrix by a strict, tested tool (no third-party rate sites: they disagreed with the source, e.g. on Kentucky's surcharge). Rules follow the standard IFTA return instructions (rounding, surcharge never a credit). Canada, gasoline and other fuels are deferred until search data shows demand. Trade-off: the tool depends on the matrix's HTML; it fails loudly on any change, so the failure mode is "no update", never "wrong rate".

## ADR-010 · Single React / React Native version pinned by root `overrides` · accepted
Expo packages declare `react-native: *`, so npm hoisted 0.87.1 while the app pinned Expo's 0.86.3: two copies in one monorepo. `overrides` in the root `package.json` force one version (RN 0.86.3, React 19.2.3). Re-check on every Expo SDK upgrade: bump both together.

## ADR-011 · Interstitial rules live in a pure, tested policy with one trigger · accepted
AdMob forbids interstitials on launch/exit and while the user is mid-task, and our calculators are forms that recalculate as you type. So `InterstitialPolicy` exposes a single entry point, leaving a calculator screen after a result was viewed, and a test fails if anyone adds another. Numbers (60 s, 180 s, every 3rd leave) are conservative defaults to tune with data.

## ADR-012 · Guides are content pages and may carry one ad unit each · accepted
Long-form guides (1,000+ words, sourced) are the strongest content for AdSense approval and search. They share one ad unit (`PUBLIC_ADSENSE_SLOT_GUIDE`) so setup stays small. The guides index and every legal page stay ad-free. The gate enforces this by path (`guides/*` yes, `guides` no).

## ADR-013 · AdSense verification stage is an explicit build mode · accepted
AdSense asks you to verify the site before it issues ad units, so there is a real stage with a publisher id and no slots. Rather than loosening the monetised checks, `PUBLIC_ADSENSE_VERIFY_ONLY=1` selects a stricter-in-a-different-way mode (meta tag present, zero ads). It must be removed once slots exist, and the monetised gate then requires every slot. The verification method (meta tag vs ads.txt vs code snippet) should be confirmed in the AdSense console.

## Accepted npm advisories (mobile dependency tree)
`npm audit` reports 14 moderate findings from two advisories, both inside Expo's own dependencies: `uuid` (missing bounds check when a buffer is passed, reached via native-project build tooling) and `decode-uri-component` (slow decoding of malformed percent-encoded input, reached via `query-string`). The offered "fixes" are downgrades to Expo 46 / expo-router 5, which we reject. Neither package is in the shipped Android bundle (verified by searching the Hermes bytecode). Re-run `npm audit` and re-verify at every Expo upgrade; remove this entry when upstream fixes them.

## Open questions
| # | Question | Needed by | How to resolve |
|---|---|---|---|
| Q1 | Real search volumes and difficulty for target keywords | Phase 1 (before writing all content) | Google Keyword Planner (free with an Ads account), Search Console after launch |
| Q2 | Contact email address to publish | Phase 2.4 | Create a domain-based mailbox via Cloudflare Email Routing |
| Q3 | Legal entity / how AdSense and AdMob payouts are set up (individual vs business, tax info) | Phase 2.7 | User decision with accountant if needed |
| Q4 | Which analytics: Cloudflare Web Analytics only, or also GA4 | Phase 2.6 | Prefer no-cookie option to simplify consent |
| Q5 | Affiliate monetization (factoring, insurance, fuel cards) alongside ads | Phase 5 | Only after traffic; disclose clearly |
| Q6 | Current Play new-account closed-testing requirements | Phase 3 start | Check Play Console help at that time |
| Q7 | Brand assets: logo, app icon, feature graphic | Phase 2 / 3.5 | Create simple vector logo; keep it consistent |
| Q8 | Canadian IFTA provinces | Resolved for v1 | Out of scope (litres, CAD); revisit in Phase 5 if demand shows |

## Immediate next actions
1. Buy the domain (user).
2. Build 1.1 Load profit calculator (core + tests first).
3. Create `docs/seo-tracker.csv` and run the keyword validation for the five seed clusters (Q1).
4. Start the IFTA data pipeline early (highest risk).
