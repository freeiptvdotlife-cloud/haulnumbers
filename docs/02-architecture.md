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
  pages/  index, calculators/, guides/, glossary/, about, privacy, terms, contact
  content/  guides/*.md (Astro content collections, typed frontmatter)
apps/mobile/  (Phase 3)
docs/
```

## Web architecture
- **Rendering:** fully static. Calculator pages hydrate with a tiny inline module (no framework). Islands only where interaction is needed.
- **Interactivity pattern:** form `input` event → read `FormData` → `calculate…` → render result nodes with `textContent` (never `innerHTML`, so no XSS surface).
- **Empty input is an error**, not `0` (`Number("") === 0` is a classic bug, already handled in the CPM page).
- **Accessibility:** labelled inputs, `aria-live="polite"` results, visible focus, ≥ 44 px targets, contrast in both themes.
- **Head:** canonical, OG, JSON-LD per page type (WebApplication, FAQPage, BreadcrumbList, Article).
- **Styles for anything created by JavaScript must be global.** Astro scopes a page's `<style>` to elements its template rendered, so `dt`/`dd`, table cells and cloned rows built in a script never match scoped rules. Shared calculator styles live in `styles/tool.css`; a page-level `<style>` must be `is:global` if it styles script-created elements. (Found in Phase 1: the first versions of the result rows were unstyled for this reason.)
- **A new calculator** is: a core module + tests, a page built from `Field`/`SelectField`/`FieldGroup`/`ResultPanel`/`Faq`/`RelatedTools` and `toolUi.ts`, and one entry in `data/tools.ts`, which adds it to the nav, the homepage and every page's related-tools list.
- **Ads:** `AdSlot` reserves height, renders nothing without env vars, never inside forms or between an input and its result.
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
- Expo managed workflow with EAS Build; development builds for the AdMob native module.
- Screens map 1:1 to calculators; each screen is thin: form state → core → result list.
- Local persistence with `expo-sqlite` or MMKV for saved scenarios (no cloud, no accounts).
- Ads: adaptive banner at screen bottom (outside scroll and input areas), interstitial only after a completed calculation and a frequency cap, rewarded ad only for an explicit opt-in action.
- Consent via Google UMP before any ad request; ads request is gated on consent status.
- Offline first: all logic is local; rates data bundled and updated through app releases (and optionally a signed JSON fetched from the site, Phase 5).

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
