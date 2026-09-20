# 02 · Architecture

## Stack
| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) | One language across web and app; compile-time safety for money math |
| Workspace | npm workspaces | Zero extra tooling; pnpm not installed on the dev box |
| Core | `packages/core`: pure functions | Deterministic, trivially testable, shared |
| Web | Astro (static output) | Ships HTML, not a framework. Best CWV for content + small interactive islands |
| Web hosting | Cloudflare Pages | Global CDN, free tier, easy custom domain and headers |
| Android | Expo (React Native) + `react-native-google-mobile-ads` | Reuses core; solid AdMob support; fast iteration |
| Tests | Vitest (core), Playwright (web e2e, Phase 1.8), Jest/RNTL (mobile) | |
| CI | GitHub Actions | typecheck, test, build, Lighthouse CI |

Alternative considered for Android: Kotlin + Jetpack Compose (more native, but duplicates business logic). See ADR-003.

## Core design rules
1. **No side effects, no DOM, no `Date.now()`** inside calculators. Pass everything in.
2. **Result type** `Result<T> = {ok:true,value} | {ok:false,errors[]}`. Never throw for bad user input.
3. **Validate at the boundary** (`validateX`), compute after. UI maps `FieldError.field` to inputs.
4. **Money:** internal math in floating point on small magnitudes, rounded at the edge via `roundCents` / `roundPerMile`. If any tool needs summing many line items (IFTA across 50 jurisdictions), switch that tool to integer cents to avoid drift.
5. **Data tables are data, not code:** `packages/core/src/data/*.json` with schema `{ source, sourceUrl, effectiveFrom, retrievedAt, rows }`. A unit test fails if `retrievedAt` is older than the policy window (see doc 06).
6. **Every calculator ships:** `input type`, `result type`, `validate`, `calculate`, tests, a `spec` entry in doc 03.

## Planned layout
```
packages/core/src/
  money.ts result.ts
  costPerMile.ts loadProfit.ts detention.ts perDiem.ts ifta.ts
  data/ ifta/<year>q<n>.json (generated)  iftaRates.ts (registry)  per-diem-YYYY.json (planned)
  index.ts
packages/core/test/  one file per calculator + data-integrity tests
packages/core/tools/ build-time only: iftaMatrix.mjs (parser/validator), updateIftaRates.mjs (CLI)
apps/web/src/
  layouts/Base.astro
  components/  AdSlot Field SelectField FieldGroup ResultPanel Faq RelatedTools IftaRow
  data/tools.ts  the calculator registry: navigation, homepage cards and related links all read it
  lib/toolUi.ts  client helpers: usd, num (blank = NaN), renderRows, showErrors, bindForm ...
  lib/seo.ts     toolJsonLd(): WebApplication + FAQPage structured data
  styles/tool.css  shared, GLOBAL styles (see the rule below)
  pages/  index, calculators, guides/ (index + five articles), 404, about, privacy, terms, contact, ads.txt, app-ads.txt
  data/guides.ts  the guide registry (index, nav, related links, JSON-LD read it); layouts/Guide.astro renders articles
  public/  robots.txt, _headers (security + cache headers for Cloudflare Pages), og-default.png, apple-touch-icon.png
apps/mobile/  Expo app: app/ (routes), src/screens, src/ads, src/ui, src/lib
docs/
```

## Web architecture
- **Rendering:** fully static. Calculator pages hydrate with a tiny inline module (no framework). Islands only where interaction is needed.
- **Interactivity pattern:** form `input` event → read `FormData` → `calculate…` → render result nodes with `textContent` (never `innerHTML`, so no XSS surface).
- **Empty input is an error**, not `0` (`Number("") === 0` is a classic bug, already handled in the CPM page).
- **Accessibility:** labelled inputs, `aria-live="polite"` results, visible focus, ≥ 44 px targets, contrast in both themes.
- **Head:** canonical, OG, JSON-LD per page type (WebApplication, FAQPage, BreadcrumbList, Article).
- **Styles for anything created by JavaScript must be global.** Astro scopes a page's `<style>` to elements its template rendered, so `dt`/`dd`, table cells and cloned rows built in a script never match scoped rules. Shared calculator styles live in `styles/tool.css`; a page-level `<style>` must be `is:global` if it styles script-created elements. (Found in Phase 1: the first versions of the result rows were unstyled for this reason.)
- **Fieldsets must set `min-width:0`.** A `<fieldset>` defaults to `min-width:min-content`, so a grid inside cannot shrink below its widest `<select>` option and the page overflows a phone screen (found on the IFTA page at 400px). Inputs and selects also set `min-width:0`, and grid columns use `minmax(0,1fr)` or `minmax(min(240px,100%),1fr)`.
- **A new calculator** is: a core module + tests, a page built from `Field`/`SelectField`/`FieldGroup`/`ResultPanel`/`Faq`/`RelatedTools` and `toolUi.ts`, and one entry in `data/tools.ts`, which adds it to the nav, the homepage and every page's related-tools list.
- **Ads:** `AdSlot` reserves height, renders nothing without env vars, never inside forms or between an input and its result. It supports four modes: ad-free (default), `PUBLIC_ADS_PREVIEW=1` placeholder for layout review, verification-only (`PUBLIC_ADSENSE_VERIFY_ONLY=1`: account meta tag, no ad code), and monetised. The compliance gate knows all four (docs/05, docs/06).
- **Search visibility:** `PUBLIC_NOINDEX=1` marks a whole build as staging (noindex, nofollow); the 404 page is always noindex; the gate rejects noindex in a monetised build.
- **Headers (Cloudflare `_headers`):** long-cache hashed assets, `X-Content-Type-Options`, `Referrer-Policy`, a CSP allowing only Google ad/consent origins once ads are enabled.

## Performance budgets (enforced in CI)
| Budget | Limit |
|---|---|
| HTML per page (gzip) | ≤ 30 KB before ads |
| Own JS per page (gzip) | ≤ 15 KB |
| Own CSS per page | inline critical, ≤ 10 KB |
| Third-party (ads, consent) | loaded `async`, after main content; never blocks LCP |
| CLS | ≤ 0.1, ad slots have reserved `min-height` |

## Mobile architecture (Phase 3)
Built with Expo SDK 57 (React Native 0.86, React 19.2, target and compile SDK 36), expo-router, `react-native-google-mobile-ads` 17.
- **One copy of React and React Native.** The root `package.json` pins both with `overrides`; without it npm hoisted RN 0.87.1 next to the app's 0.86.3 (two copies break Metro at runtime). TypeScript is 5.9 everywhere.
- **Layout:** `app/` holds thin route files that re-export `src/screens/*`. Screens are string form state → core `calculate…` → result rows, the same shape as the web pages. Shared UI is `src/ui/kit.tsx` and `CalculatorScreen`; `src/lib/format.ts` formats numbers without `Intl` so output is identical on every device and matches the website.
- **Ads live only in `CalculatorScreen`** (banner below the scroll area and hidden while the keyboard is up; the leave-screen hook). The home, settings and consent screens carry none.
- **Ad logic is plain TypeScript with tests, not buried in components:** `interstitialPolicy.ts` (when an interstitial may show; its only entry point is leaving a calculator screen, guarded by a structural test), `interstitialController.ts` (keeps one ad pre-loaded, no retry loop), `consentGate.ts` (nothing is configured, initialised or requested until consent allows it; every failure fails closed), `adUnits.ts` (dev = Google test ids, release = ids from build env or none).
- **Config:** `app.config.ts` reads `ADMOB_ANDROID_APP_ID`, `ADMOB_ANDROID_BANNER_UNIT_ID`, `ADMOB_ANDROID_INTERSTITIAL_UNIT_ID` (defaults are Google's sample ids). It blocks unneeded permissions, turns off backup, and registers no deep-link scheme.
- **Not built yet:** a native time picker for detention (times are typed as HH:MM).
- **Detention form handling lives in core** (`calculateDetentionFromTimes`), so the web page and `DetentionScreen` share one implementation (previously duplicated; verified byte-identical on the web after the move).
- **Saved scenarios:** `src/scenarios/` (`ScenarioStore` with an injected key-value backend, AsyncStorage on device). Stored snapshots are untrusted: each screen rebuilds its state through `pickStrings` / `pickOneOf` / `sanitizeIftaState`, so corrupt or hostile data falls back to defaults instead of crashing. Max 30 per calculator, same name replaces, one write at a time, wipe-all in Settings.
- **Tablet layout:** at 720 dp and wider, `CalculatorScreen` shows inputs on the left and results plus saved scenarios on the right.
- **Offline first:** all logic is local; rate data is bundled and updated through app releases.

## Data flow
```
User input → UI adapter (web/mobile) → core.validate → core.calculate → Result<T> → UI render
                                                    ↑
                                       data/*.json (dated, sourced)
```
No network calls in the calculation path.

## Security and privacy
- No user data leaves the device. No cookies except those set by Google ads/consent after consent.
- Secrets: none in the repo. AdSense/AdMob IDs are public identifiers, kept in env files for configurability, not secrecy.
- Dependencies: `npm audit` in CI; monthly updates; lockfile committed.
- Android: release keystore never committed; use Play App Signing.
