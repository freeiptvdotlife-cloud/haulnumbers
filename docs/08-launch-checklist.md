# 08 · Launch checklist

Everything that can be built without a domain or Google approvals is built and tested. This is the exact sequence for the rest. Each step says **who** does it, what to run, and what "done" looks like.

> Console screens change. Where a step describes a Cloudflare, AdSense, AdMob or Play Console screen, treat the wording as a guide and follow the current on-screen instructions. Items marked **verify** were not confirmed against the live product when this was written.

## 0. Before anything: get the repository online
**You.** Create a GitHub repository and push this one (`git remote add origin ...`, `git push -u origin main`). This turns on `.github/workflows/ci.yml` (tests, typecheck, build, compliance gate, Android bundle, Lighthouse budgets) and `data-freshness.yml` (weekly check that IFTA and per diem rates are current).
Done when: the first CI run is green. If the Lighthouse job fails, read its assertion output; `lighthouserc.json` holds the budgets. (The workflows are syntax-checked but have not been executed on GitHub yet.)

## 0b. Staging on a free `pages.dev` address (no domain needed)
Use this to test the real site on the internet before the domain exists. **Trade-off to know:** Cloudflare says a Pages project created by direct upload cannot be switched to Git integration later. That only matters if you want GitHub auto-deploy; direct-upload projects can still take your custom domain and be redeployed with one command (or from CI with an API token). Decide at launch whether to keep this project or create a Git-connected one.

1. **You (once):** create a free Cloudflare account, then log Wrangler in on this machine: `npx wrangler@latest login` (opens a browser; from the Claude Code prompt you can run it as `! npx wrangler@latest login`). Or set `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID`) for non-interactive use; never paste a token into a chat.
2. **Create the project:** `npx wrangler@latest pages project create haulnumbers --production-branch main --force` (`--force` is needed once, for creation, on Wrangler 4.135). Note the address it prints (`<name>.pages.dev`; Cloudflare may append characters if the name is taken).
3. **Deploy:** `npm run deploy:staging` (set `STAGING_URL` and `STAGING_PROJECT` if you used another name). This builds with `PUBLIC_NOINDEX=1` (Google will not index the copy) and `PUBLIC_SITE_URL` set (canonical links, sitemap, share images and structured data use the staging address), runs the compliance gate, and uploads `apps/web/dist`. The staging build carries **no ads**.
4. **Test on the real network:** open every page on a phone and a desktop, try each calculator, check the guides, and run Lighthouse against the live URL. Everything here except ads and the contact address behaves as it will in production. (`/contact/` will say the address is not configured unless you also set `PUBLIC_CONTACT_EMAIL` for the build.)
5. **Later:** delete the staging project or keep it for pre-release checks. Production uses its own project, the real domain and no `PUBLIC_NOINDEX`.

**Recorded 2026-09-20: staging is live.** The main test site is the Pages project **`haulnumbers`** at `https://haulnumbers.pages.dev/` (created after trying the cleaner name, which was free). An earlier trial project `haulnumbers-staging` was deleted the same day; it is the only Pages project on the account for this site. Each deployment also gets its own `https://<id>.<project>.pages.dev`. Redeploy any time with `npm run deploy:staging` (defaults to project `haulnumbers`; override with `STAGING_PROJECT` and `STAGING_URL`). It builds, runs the compliance gate and uploads in about 30 seconds.
- Verified live: 18 pages return 200 in about 0.2 s, unknown URLs return a real 404 page, security headers and one-year caching for hashed assets are applied, `noindex`, canonical, sitemap and `robots.txt` all use the staging address, and every calculator produces the expected numbers in a real browser at phone width with no JavaScript errors. Lighthouse on the live pages: 100 for performance, accessibility and best practices; SEO reads 66 **only** because `is-crawlable` fails, which is the staging `noindex` working (production will not have it).
- **Wrangler 4.135 note:** Cloudflare is merging Pages into Workers. `wrangler pages project create` now tries a Workers-style setup and fails from the repo root; passing `--force` (needed only once, for creation) makes classic Pages. Later commands (`pages deploy`) work without it. When you create the production project, re-check Cloudflare's current guidance on Pages versus Workers static assets and on Git integration before choosing.
- Wrangler is not a project dependency: it is fetched on demand with `npx --yes wrangler@latest`. Its login is stored in `~/.config/.wrangler/` on this machine (token and refresh token; never commit or share it).

Caveats: the staging URL is public (anyone with the link can open it), just not indexed; Cloudflare's limits are 20,000 files and 25 MiB per file, which this site is far below.

## 1. Domain, hosting and email
1. **You:** buy `haulnumbers.com` (re-check availability first; it was unregistered on 2026-09-19). Turn on auto-renew, registrar lock and two-factor sign-in.
2. **You:** create a free Cloudflare account and add the domain (change the nameservers at the registrar).
3. **You:** create a Cloudflare Pages project from the GitHub repository.
   - Build command: `npm ci && npm run build:web`
   - Output directory: `apps/web/dist`
   - Environment variable `NODE_VERSION` = `22`
   - **Preview environment only:** `PUBLIC_NOINDEX` = `1` (so preview copies are never indexed; the compliance gate rejects `noindex` in a monetised build).
4. **You:** attach the custom domain to the Pages project; add a redirect from `www` to the apex domain; enable "Always use HTTPS".
5. **You:** turn on Cloudflare Email Routing and create a public address such as `contact@haulnumbers.com` that forwards to your inbox.
6. **You:** in the Pages **Production** environment set `PUBLIC_CONTACT_EMAIL` to that address, redeploy.

Done when: `https://haulnumbers.com/` loads, `/contact/` shows the address, `/robots.txt` and `/sitemap-index.xml` load, and the security headers from `apps/web/public/_headers` appear (`curl -I https://haulnumbers.com/` shows `x-content-type-options: nosniff`).

## 2. Search Console and indexing
1. **You:** add a **Domain property** in Google Search Console and verify it with the DNS TXT record it shows.
2. **You:** submit `https://haulnumbers.com/sitemap-index.xml`.
3. **You:** use URL Inspection, then "Request indexing", for the home page, `/calculators/`, `/guides/` and the ten calculator and guide pages (there is a daily quota; spread it over a few days).
4. Track queries and positions weekly in `docs/seo-tracker.csv`. Expect weeks before competitive terms move.
Done when: Search Console reports the pages as indexed.

## 3. AdSense
**Prerequisite:** the site is live, has been crawled, and has real content (five calculators and five 1,000-word guides are in place). Approval is not guaranteed.

1. **You:** sign up for AdSense and add `haulnumbers.com`.
2. **Verification stage.** AdSense asks you to prove ownership before it gives you ad units. Copy your publisher id (`ca-pub-…`) and deploy a verification build by setting, in Pages **Production**:
   - `PUBLIC_ADSENSE_CLIENT` = your `ca-pub-…` id
   - `PUBLIC_ADSENSE_VERIFY_ONLY` = `1`
   - `PUBLIC_CONTACT_EMAIL` (already set)
   - `ADS_TXT` = the exact `ads.txt` line AdSense shows you (format: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`; several lines are separated by `|`)

   This build emits `<meta name="google-adsense-account" …>` on every page and serves `/ads.txt`, and it loads **no** ad script. Choose the meta-tag or ads.txt verification method in AdSense (**verify** which methods your console offers).
3. **Check locally first:** with the same variables set, `npm run build:web && npm run check:compliance` must print `Compliance check passed (monetised build).`
4. Wait for approval. If AdSense rejects the site, read the reason, fix the content (not the wording of the application), and re-apply. Common reasons: low-value content, missing pages, navigation problems.
5. **After approval** create six responsive display ad units (one per calculator plus one shared by all guides) and set in Pages Production:
   - `PUBLIC_ADSENSE_SLOT_CPM`, `PUBLIC_ADSENSE_SLOT_LOAD`, `PUBLIC_ADSENSE_SLOT_DETENTION`, `PUBLIC_ADSENSE_SLOT_IFTA`, `PUBLIC_ADSENSE_SLOT_PERDIEM`, `PUBLIC_ADSENSE_SLOT_GUIDE`
   - **remove** `PUBLIC_ADSENSE_VERIFY_ONLY`
6. **Turn Auto ads off** in AdSense. We place ads manually; Auto ads could place them on pages that must stay ad-free. (The AdSense loader is only ever included on the ten content pages by design.)
7. In AdSense **Privacy & messaging**, create the European regulations message using a **Google-certified CMP with TCF v2.3** support, and publish it. Check whether users need a persistent "Privacy settings" link to change their choice (**verify**); add it to the footer if so.
8. Redeploy, run the gate (`npm run check:compliance`, same variables) and open every page. Confirm one labelled "Advertisement" unit per content page, no ads on privacy/terms/contact/404/guides index, and no layout jump.
9. **Never click your own ads.** Use a different browser profile or the AdSense preview tools to review.
Done when: ads render on the ten calculator and guide pages, the AdSense policy centre shows no issues, and Lighthouse still passes (expect performance to drop somewhat once ad scripts load; investigate any CLS above 0.1).

## 4. Android app: build, test tracks, release
### 4.1 Verify the build locally
```bash
cd apps/mobile
npx expo prebuild --platform android --no-install --clean
cd android && ./gradlew assembleDebug        # first run downloads a lot; see the network note in docs/06
```
On a slow connection the first build can take one to two hours (the release build took 38 minutes once dependencies were cached). NDK note: React Native pins NDK 27.1; if that download is impractical, point the *generated, git-ignored* `android/build.gradle` at an installed NDK for a local verification build only. Then confirm the target SDK from the APK: `aapt2 dump badging app/build/outputs/apk/debug/app-debug.apk | grep targetSdkVersion` (build-tools 36 is installed here). Expected: `targetSdkVersion:'36'`. Install on an emulator or a phone and walk through: consent flow (needs a test device or the EEA debug geography), banner on calculator screens only, hidden while typing, no ad on home/settings, saved scenarios, dark mode.

### 4.2 AdMob
1. **You:** create an AdMob account; add the app (Android, package `com.haulnumbers.app`); create two ad units, **banner** and **interstitial**.
2. In AdMob **Privacy & messaging**, set up the consent (GDPR) message that the app's UMP flow will show.
3. Keep the ids handy: app id `ca-app-pub-…~…`, unit ids `ca-app-pub-…/…`.

### 4.3 Google Play Console
1. **You:** create the app in Play Console with your existing developer account.
2. Complete the listing from `docs/store/listing.md`, the content rating, target audience (**18+**), the ads declaration (the app contains ads), the data safety form and the advertising-ID declaration. Privacy policy URL: `https://haulnumbers.com/privacy/`.
3. **Signing.** Use Play App Signing. The simplest supported path is Expo's EAS Build, which manages the upload keystore: `npx eas-cli build --platform android --profile production` (needs a free Expo account; **verify** the current EAS Build free-tier limits). If you build locally instead, generate an upload key with `keytool -genkeypair -v -storetype PKCS12 -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`, keep it **outside the repository** (`*.jks` and `*.keystore` are git-ignored), and back it up; losing it is painful.
4. **Internal / closed testing builds show Google's TEST ads.** Build with `ADMOB_USE_TEST_IDS=true`. Upload the AAB to the internal track first.
5. **Closed-testing requirement.** If your developer account is a **personal account created after 2023-11-13**, Google requires a closed test with **12 testers opted in continuously for 14 days** before you can apply for production access. Organisation accounts and older personal accounts are exempt. Check your account's date and type, and recruit 15-20 testers if needed (the clock is per tester).
6. **Production build.** Set `APP_ENV=production` and your real `ADMOB_ANDROID_APP_ID`, `ADMOB_ANDROID_BANNER_UNIT_ID`, `ADMOB_ANDROID_INTERSTITIAL_UNIT_ID`. The Expo config **refuses to build** a production app with test ids, missing ids or malformed ids. Do not set `ADMOB_USE_TEST_IDS`.
7. **`app-ads.txt`:** set `APP_ADS_TXT` in Pages Production to the exact line AdMob gives you, redeploy, then in AdMob request a crawl of the app. The file must be on the developer website named in the Play listing (the apex domain).
8. Roll out in stages (10%, 50%, 100%) and watch Play vitals (crashes and ANRs).
Done when: the app is live, AdMob serves real ads, `app-ads.txt` verifies, and there are no policy warnings.

## 5. After launch
- Weekly: Search Console (indexing, queries), AdSense policy centre, Play vitals, the freshness workflow.
- **Every quarter:** IFTA rates (runbook in `docs/06`). **Every October:** IRS per diem notice (runbook in `docs/06`); the current period ends 2026-09-30 and the new notice was not yet published on 2026-09-20.
- Every Expo SDK upgrade: bump React and React Native together (root `overrides`), re-run `npm audit`, and re-verify the accepted advisories in `docs/07`.

## 6. What was verified locally and what was not
| Verified in this repository | Not verifiable without accounts or a device |
|---|---|
| 286 tests (170 core, 23 compliance-gate, 93 app); typecheck on all three workspaces; web build; compliance gate in ad-free, preview, verification and monetised modes (with fake ids) | AdSense approval and real ad rendering; ads.txt verification by Google |
| Lighthouse and axe on every page; keyboard pass; overflow at five widths | A real screen-reader session |
| Android **debug and release APKs built and inspected** (`com.haulnumbers.app`, compile and target SDK 36, minimal permissions, no `SYSTEM_ALERT_WINDOW` in release); JS bundle; config guard for production ids | The consent form and ads on a real device; Play data-safety acceptance |
| CI and freshness workflows parse as valid YAML | Their first run on GitHub |
