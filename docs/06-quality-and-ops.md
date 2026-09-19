# 06 · Quality, CI/CD, data freshness and risks

## Test strategy
| Level | Tool | What |
|---|---|---|
| Unit | Vitest | Every calculator: happy path, boundaries (exact equality), invalid input, rounding. Coverage ≥ 90% on `packages/core` |
| Data integrity | Vitest | Rate files: schema valid, all jurisdictions present, `retrievedAt` not stale, rates non-negative, sources present |
| Cross-check | Vitest | Hand-computed examples from authoritative guides for IFTA and per diem; store the reference in the test comment |
| Property tests (optional) | fast-check | Monotonicity (higher cost → higher break-even), margin 0 ⇒ target = break-even, no NaN/Infinity for any valid input |
| Web e2e | Playwright | Fill form → correct result text; keyboard-only flow; mobile viewport; no console errors |
| Accessibility | axe via Playwright, manual screen-reader pass | WCAG 2.2 AA on tool pages |
| Performance | Lighthouse CI | Budgets from doc 02; fail the build on regression |
| Mobile | Jest + React Native Testing Library; manual device matrix (low-end and current Android) | |

## CI pipeline (GitHub Actions)
On every PR: install with lockfile → `npm audit --omit=dev` (warn) → typecheck → test (core and web script tests) → build web → **`npm run check:compliance`** → Lighthouse CI → (Phase 3) mobile typecheck and unit tests.
On `main`: deploy web to Cloudflare Pages, then ping IndexNow for changed URLs. Mobile release builds run on tags via EAS.

## Branching and releases
Trunk-based with short-lived branches and PRs; Conventional Commits; web deploys on merge; app releases are tagged `app-vX.Y.Z` with a changelog. Staged rollout on Play.

## Data freshness (the moat)
| Data | Source | Cadence | Owner action |
|---|---|---|---|
| IFTA rates | IFTA, Inc. official fuel tax matrix (`iftach.org/taxmatrix4`) | Every quarter; the next quarter's matrix is visible about 3 months ahead as *preliminary*, final about a month before it ends | Run the updater (below); CI blocks if the current quarter's file is missing |
| Per diem | IRS annual special per diem notice (e.g. Notice 2025-54), transportation-industry section | Yearly, late September for the period starting Oct 1 | Add `perDiem/<period>.json` (runbook below); CI blocks from Oct 1 until it exists |
| Fuel price default | Manual sensible default, clearly labelled as an example | Quarterly review | Optional: EIA weekly diesel price fetched at build time (Phase 5) |

Freshness reminder: a scheduled GitHub Action opens an issue 10 days before each quarter starts.

## Monitoring
Search Console (indexing, CWV, manual actions), AdSense policy center and RPM, AdMob mediation/reports, Play Console vitals (ANR, crashes), Cloudflare Web Analytics, uptime check (free monitor on the apex URL).

## Risk register
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AdSense rejects for "low value content" | Medium | High | ≥ 5 tools, 600+ words each, guides, real About/Contact; fix and reapply |
| Crowded SERPs, slow ranking | High | Medium | Long-tail focus, all-in math differentiator, patience; do not chase head terms first |
| Wrong rate data causes bad results | Medium | High | Sourced, dated data; cross-check tests; visible "last updated"; disclaimers |
| Google spam/scaled-content action | Low if guarded | High | Programmatic-SEO guardrails in doc 04 |
| Invalid traffic / policy strike | Low | Very high | No self-clicks, test IDs in dev, no incentivized clicks, monitor policy center |
| Play new-account testing delay | High | Medium | Start recruiting testers during Phase 3.2 |
| Play rejects for low functionality | Low | Medium | Real offline features, saved scenarios |
| Big brand ships competing tool | Medium | Medium | Speed, depth, data freshness, community trust |
| Solo-maintainer burnout / stale data | Medium | High | Automation, reminders, small scope, quarterly ritual |
| Low ad RPM in this niche vs. expectation | Medium | Medium | Measure early, diversify (affiliate for factoring/insurance/fuel cards, compliant and disclosed) once traffic exists |
| Domain/registrar mishap | Low | High | Auto-renew, 2FA, domain lock |

## Definition of done (per calculator)
Compliance check passes (ad-free and monetised) · Spec updated in doc 03 · core code + tests pass · page built from the shared components and registered in `data/tools.ts` · page content written and reviewed for accuracy · a11y checked · Lighthouse budget met · structured data valid · added to hub and related-tools · sitemap updated · disclaimer present · (if data-driven) data file sourced and dated.

## Quarterly IFTA rate update (runbook)
1. From the repo root: `npm run update:ifta-rates -w @haulnumbers/core -- 2026Q4 2027Q1` (list every quarter to refresh, including newly published ones). It downloads from IFTA, Inc., validates, and rewrites `packages/core/src/data/ifta/*.json`.
2. **Review the diff.** Each change must match a "Rate Change" note on the official matrix. Re-fetch any `preliminary` quarter after its `finalDate` so its status flips to `final`.
3. To add a new quarter to the calculator, import its JSON in `packages/core/src/data/iftaRates.ts`, then `npm test` (integrity and freshness tests) and `npm run build:web`.
4. If the updater throws, **do not loosen it to make it pass**. The page layout may have changed or a rate looks wrong; read the message, inspect the page, and fix the parser with a new test.
5. The freshness test fails on the first day of a quarter until that quarter's file exists. That is intended.

## Annual IRS per diem update (runbook)
1. In late September, find the new "Special Per Diem Rates" notice on IRS.gov (last year: Notice 2025-54, `irs.gov/pub/irs-drop/n-25-54.pdf`; the number changes every year).
2. Read **section 3, "Special M&IE rates for transportation industry"** (continental U.S. and outside). Copy the two numbers exactly; never estimate.
3. Copy `packages/core/src/data/perDiem/2025-2026.json` to `<year>-<year+1>.json`; set `period`, `effectiveFrom` (Oct 1), `effectiveThrough` (Sep 30 next year), `notice`, `sourceUrl`, `retrievedAt` (today) and the two rates.
4. Register the file in `packages/core/src/data/perDiemRates.ts`; confirm Pub. 463's 80% and 50% figures are unchanged for the tax year; run `npm test` and `npm run build:web`.
5. Update the page's worked example and its "$80 / $86" wording if the rates changed.

## Browser QA (manual until CI exists)
Run after any change to layout, CSS or a page. Lighthouse and puppeteer are not project dependencies; install them in a scratch folder.
1. `npm run build:web`, then `npx astro preview --port 4321 --host 127.0.0.1` (from `apps/web`).
2. **Lighthouse**, mobile emulation, every page: `npx lighthouse http://127.0.0.1:4321/<page>/ --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices,seo`. Target: 100/100/100/100, CLS 0. Last run (2026-09-19, no ads yet): all 7 pages 100 across the board, LCP about 1 s, TBT 0.
3. **Overflow check:** load every page at 320, 360, 400, 768 and 1280 px and compare `document.documentElement.scrollWidth` with `clientWidth`; any excess is a bug. Also watch for JS errors on load.
4. **Look at it** in both colour schemes (`prefers-color-scheme` light and dark) at phone and desktop width. Automated scores miss things a screenshot shows.
5. **Keyboard-only pass:** press Tab through every page. Each control needs a visible focus ring and an accessible name, the order must follow the layout, the first stop must be the skip link, and the IFTA add/remove buttons must work with Enter and Space. (Note: `type="time"` inputs legitimately have several tab stops: hours, minutes, AM/PM.)
6. Repeat step 2 once real ads and the consent banner are live: they add third-party scripts, so expect performance and CLS to move.

## Compliance gate
`apps/web/scripts/complianceCheck.mjs` inspects the built `dist/` (or any folder passed as an argument) and fails on: ads or the AdSense script on non-content pages, an ad without an "Advertisement" label, thin ad pages, click-inducing wording, a privacy policy missing required disclosures, missing legal/contact pages, a bad or missing `ads.txt`, a missing contact email or ad unit in a monetised build, and a `robots.txt` that blocks crawlers. `node --test` covers each rule with a passing and a failing fixture (`npm test`).
- Ad-free build (current): `npm run build:web && npm run check:compliance`.
- Monetised build: set the variables from `apps/web/.env.example` (client id, one slot id per page, `PUBLIC_CONTACT_EMAIL`, `ADS_TXT`), build, then run the check with the **same** variables.
- Env values used by components must be read in frontmatter. `import.meta.env.X` written inside a page's template expression was not replaced at build time and silently rendered no ad units; the gate's "no ad unit configured" rule caught it.

## Mobile QA
- `npm test` runs core, web-script and mobile tests; `npm run typecheck` covers all three.
- `npm run bundle:mobile` builds the full Android Hermes bundle (proves Metro resolves the shared core and its JSON data). Last run: 3 MB bundle; the audit-flagged `decode-uri-component` and `query-string` are NOT in it (searched the bytecode), and the IFTA and IRS data are.
- Native build: from `apps/mobile`, `npx expo prebuild --platform android --no-install --clean`, then `cd android && ./gradlew assembleDebug`. Read the target SDK from the APK with `aapt2 dump badging app-debug.apk | grep targetSdkVersion` (build-tools 36 is installed). `android/`, `ios/`, `.expo/` and `dist-android/` are generated and git-ignored.
- **Network note (this dev machine):** IPv6 to the npm registry fails, which made installs crawl. Use `NODE_OPTIONS=--dns-result-order=ipv4first` for npm and `JAVA_TOOL_OPTIONS=-Djava.net.preferIPv4Stack=true` for Gradle.
- Still needed before release: run on a real device or emulator (consent form, test ads, TalkBack), and screenshots for the store listing.
