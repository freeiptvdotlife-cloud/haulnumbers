# 05 · Monetization and compliance

> Policies change. Treat this as a working checklist and re-read the current AdSense, AdMob and Google Play policy pages before each submission.
> **Last verified: 2026-09-19** against Google's own help pages (linked inline). Items still marked **verify** were not confirmed against a primary source.

## Compliance matrix (verified 2026-09-19 against Google's own pages)
Sources: [AdSense ad placement policies](https://support.google.com/adsense/answer/1346295), [AdSense Program policies](https://support.google.com/adsense/answer/48182), [Publisher Policies (valuable inventory)](https://support.google.com/publisherpolicies/answer/11112688), [AdMob interstitial guidance](https://support.google.com/admob/answer/6066980), [AdMob disallowed interstitials](https://support.google.com/admob/answer/6201362), [AdMob app-ads.txt](https://support.google.com/admob/answer/9363762), [AdSense ads.txt guide](https://support.google.com/adsense/answer/12171612), [EU user consent policy](https://support.google.com/adsense/answer/10961068).

### Web (AdSense)
| Rule (paraphrased from the source) | How we comply | Enforced by |
|---|---|---|
| Never click your own ads; no incentives for clicks | No self-clicks; dev builds render no ads; wording never invites clicks | `click-inducing-text` check; process rule |
| Ads must not look like menus, navigation or download links; no buttons or navigation next to ads | One slot per page, after the results panel, never between fields or beside a button; slot has its own margin | Layout review (`AdSlot`); QA step |
| Labels may only be "Advertisement" or "Sponsored links"; no "help keep this site running" style wording | Visible "Advertisement" caption on every slot | `ad-label` and `click-inducing-text` checks |
| No ads on pages without publisher content (thank-you, error, exit, thin pages) | Ads only on the 5 calculator pages (each 500+ words). Never on home, hub, about, contact, privacy, terms or 404 | `ad-placement` and `thin-content` checks |
| Low-value or unfinished content can lose ad serving | Original explanations, worked examples, sourced data; no "coming soon" pages (so no `/guides/` yet) | `thin-content` check (300+ words in main content); content review |
| No auto-refresh, pop-ups, new-window ads | Standard responsive units only; no refresh code | Code review |
| Ad crawler must be able to read pages | `robots.txt` allows everything; nothing blocks Mediapartners-Google | `robots` check |
| Privacy policy discloses Google ad cookies and offers opt-outs; EEA/UK/CH users get a Google-certified TCF v2.3 CMP | Privacy page covers cookies, third-party vendors, Ads Settings, aboutads.info, Google's ad-technology and Business Data Responsibility pages; CMP set up in AdSense "Privacy & messaging" at approval | `privacy-policy` check; Phase 2.5 |
| `ads.txt` with the exact AdSense snippet (`google.com, pub-…, DIRECT, f08c47fec0942fa0`) | `/ads.txt` is generated from the `ADS_TXT` build variable | `ads.txt` check |
| Real contact route | `/contact/` shows `PUBLIC_CONTACT_EMAIL`; a monetised build fails without it | `contact` check |

**AdSense loader scope:** the `adsbygoogle.js` script is included by `AdSlot`, so it loads only on pages with a slot. If Auto ads were ever enabled they could otherwise reach privacy, terms and contact.

**Run before every deploy:** `npm run build:web && npm run check:compliance` with the same environment variables as the build. It exits non-zero on any violation. It is a safety net for the mechanical rules; it does not replace reading the policies.

### App (AdMob), rules that shape the design
| Rule | Design consequence |
|---|---|
| Interstitials only at logical breaks between pages of content; **not on app launch or exit**; not placed so they appear while the user is focused on a task such as **filling out a form**; not after every user action | Our calculators are forms that recalculate as you type, so an interstitial can **never** be tied to "after a calculation". It is shown only when the user **leaves a calculator screen** (back to the list) after they have viewed a result, at most once per N screen changes and once per several minutes, pre-loaded, never in the first session minute, never on launch/exit/back-out of the app, never while a field is focused |
| No ads on screens without publisher content (loading, splash, empty, error, consent, settings screens) | Ads render only on the five calculator screens. Splash, list, settings and consent screens carry none |
| Banners must not overlap or sit next to controls in a way that invites accidental clicks | Adaptive banner docked at the bottom, outside the scroll area, with clear space above it and never under the keyboard or a button |
| Never click own ads; use test ads in development | `TestIds` in `__DEV__` and on registered test devices; real unit ids only in release builds, injected via config |
| Consent before ads in EEA/UK/CH (Google-certified CMP, TCF v2.3) | Google's UMP SDK: request consent info on launch, show the form when required, and **do not initialise the ads SDK or request ads until consent allows it**; a "Privacy settings" entry in the app to reopen the form |
| `app-ads.txt` on the developer website named in the Play listing | `/app-ads.txt` is generated from the `APP_ADS_TXT` build variable (needs the domain) |
| Native/rewarded formats have their own rules | Not used at launch; rewarded only as an explicit opt-in (Phase 5), native only with visible "Ad" attribution |

### App rules: where each is enforced in code (tests in `apps/mobile/src`)
| Rule | Enforced by |
|---|---|
| No interstitial on launch/exit/timer; only when leaving a calculator screen | `InterstitialPolicy` has exactly one trigger; a structural test fails if another method is added |
| Not while filling out a form; only after a result was viewed | `fieldFocused` and `hasViewedResult` gates; `useLeaveInterstitial` tests |
| Conservative frequency (first minute, 3 min apart, every 3rd qualifying leave) | `interstitialPolicy.test.ts` (each reason has a passing and a failing case) |
| Ads SDK not initialised or requested before consent; fail closed | `consentGate.test.ts`; `AdsProvider` starts only through `startAds` |
| Withdrawing consent switches ads off | `changePrivacyChoices` re-evaluates; test |
| No ads on menu, settings or consent screens; banner hidden while typing | `screens.test.tsx` (banner absent on Home/Settings; `AdBanner` returns null with the keyboard up) |
| Test ids in dev, never a test-id fallback in release | `adUnits.test.ts` |
| Minimal permissions and no backup or deep links | `app.config.ts`; verified in the generated manifest (`tools:node="remove"` on four permissions) |

Play data-safety inputs (complete in Phase 3.6): permissions requested by our config are `INTERNET` only; the AdMob SDK merges `ACCESS_NETWORK_STATE` and `com.google.android.gms.permission.AD_ID` (confirm in the built APK's manifest with `aapt2 dump permissions`).

### Testing before real ads exist
**AdMob (app) has real test ids; AdSense (web) has none.**
- App: development builds always use Google's test ids and sample app id. A real Play build for internal or closed testing can show Google's test ads by building with `ADMOB_USE_TEST_IDS=true`. A **production** build (`APP_ENV=production`) must have your real AdMob app id and both unit ids, and `app.config.ts` throws if it is given the test flag, missing ids, malformed ids, or any of Google's test ids (`src/config/releaseGuard.ts`, tested).
- Web: AdSense serves nothing without an approved account and real ids. Its test attribute only marks impressions as not counted; it does not make ads appear (and its exact name was not confirmed, so it is not wired in). Instead, `PUBLIC_ADS_PREVIEW=1` renders a clearly marked dashed placeholder in each ad slot so placement and layout can be reviewed now. The compliance gate **fails** any build containing the placeholder unless run with `--allow-preview`, so a preview build can never pass a deploy check.
  - Review build: `PUBLIC_ADS_PREVIEW=1 npx astro build --outDir /tmp/preview` then `node scripts/check-compliance.mjs /tmp/preview --allow-preview`.
- A free `*.pages.dev` address is technically allowed to apply, but approval on free subdomains is reported to be much less likely than on your own domain (secondary sources; Google's own page was not conclusive). Plan to apply with the real domain.

### Not yet verified (do not treat as confirmed)
- `https://business.safety.google/privacy/` (Google Business Data Responsibility page) is linked from the privacy policy because Google's EU consent policy asks for it, but the URL could not be fetched from this environment. Open it once and confirm before launch.
- Exact UMP SDK behaviour and the current `react-native-google-mobile-ads` consent API: read their docs when Phase 3.4 starts.
- Whether the AdSense-provided CMP message needs a footer "Privacy settings" link on this site so users can change their choice later (the EU policy expects users to be able to withdraw consent). Check when the message is configured in the AdSense console, and add the link if needed.
- Google Play data safety form answers for the AdMob SDK: complete from the SDK's own data-disclosure page in Phase 3.6.

## Principles
1. Ads follow value: no ad placement that hurts a tool's usability.
2. Invalid traffic is an existential risk. **Never click your own ads**, never ask others to, never use incentives for clicks. Use test ads in development and on-device test IDs in the app.
3. Consent before personalization where the law requires it.

## AdSense (web)
### Approval readiness checklist
- [ ] Own domain, HTTPS, site is live and crawlable
- [ ] ≥ 5 tools plus guides with substantial original content (not thin, not copied)
- [ ] Privacy Policy that names Google ads/cookies and how to opt out; About; Contact; Terms/Disclaimer
- [ ] Clear navigation, no broken pages, no "under construction" pages
- [ ] Site verified in AdSense; `ads.txt` at the root with the publisher line from AdSense
- [ ] Consent management platform for EEA/UK/Switzerland traffic: a **Google-certified CMP that supports IAB TCF v2.3** (see "Consent and TCF v2.3" below)
- [ ] Country/age-appropriate content, nothing restricted

### Placement rules
- Reserve space (`min-height`) to avoid CLS. Prefer in-content units between sections and one below the results, not above the fold on mobile.
- Never place ads inside the form, between an input and its result, or in a way that could be confused with calculator buttons.
- Label consistently ("Advertisement" via the component); no misleading labels.
- Start with 2–3 units per page and measure. More units are not automatically better; Google may also limit them per page.
- Use Auto ads only after manual testing, with exclusions on interactive regions.

### Optimization loop (Phase 5)
Track per-page RPM and viewability in AdSense, test one change at a time for ≥ 2 weeks, watch CLS and engagement, and revert anything that lowers them.

### Content-policy cautions for this niche
Tax and financial pages must avoid guarantees and advice claims. Keep disclaimers visible. Do not scrape competitors' calculators or copy text.

## AdMob (Android)
### Setup
1. Create AdMob account and app; use **test ad units** in development (`TestIds`), swap to real IDs only in release builds via config.
2. Link the AdMob app to the Play listing after publishing.
3. `app-ads.txt`: host on the developer website (the domain listed in the Play listing) with AdMob's line; required for the app ad ecosystem **verify**.
4. Consent: integrate Google's **User Messaging Platform (UMP)**; request consent info on launch and only initialize ad requests when allowed. Provide a "Privacy settings" entry in the app to re-open the form. Use a current UMP SDK release so TC strings are TCF v2.3 compliant (see below).

### Formats and rules
| Format | Use | Guardrails |
|---|---|---|
| Adaptive banner | Bottom of screen | Not overlapping controls or inputs; not in scrolling lists between form fields |
| Interstitial | Only when leaving a calculator screen after a result was viewed (see the App matrix above), capped by count and time | Never on app open or exit, never while a field is focused or the user is typing, never after every action; pre-load so it does not appear late |
| Rewarded | Optional: "Watch an ad to export PDF / save scenario" | Must be explicit opt-in with clear reward |
| Native | Later, in the saved-scenarios list | Must be visually distinguishable |

Frequency caps are tuned from data. Start conservative (retention first), because a 1-star "too many ads" review costs more than the impression.

### Google Play compliance
- **Data safety form:** declare ad SDK data collection (device IDs, usage data) honestly; keep it consistent with the privacy policy.
- **Privacy policy URL** hosted on the site.
- **Content rating** questionnaire; target audience: adults (not "designed for children"; avoids Families policy).
- **Target API level: Android 16 (API level 36).** Verified: since **2026-08-31**, new apps and app updates must target API 36 or higher ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878)). A one-time extension to **2026-11-01** exists via the Play Console policy status page, but a brand-new app should simply target 36 from day one (`targetSdkVersion 36`; Expo: use an SDK version that supports it, and confirm with `expo-doctor` / a release-build check). Re-check every August, as Google raises this yearly.
- **Closed-test requirement (new personal accounts):** verified exactly: **12 testers, opted in continuously for 14 days**, before production access can be requested ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465)).
  - Applies **only to personal accounts created after 2023-11-13**. Organization accounts and older personal accounts are exempt. **Action: check the creation date/type of our Play developer account; if exempt, drop task 3.7's waiting period.**
  - The 14-day clock is **per tester**: if a tester opts out and back in, their clock resets. Recruit 15–20 to keep a buffer, and keep them opted in.
  - Use the same signed build family you will release, and fix crashes found by testers before applying.
- **Minimum functionality / spam:** the app must be real functionality (offline calculators, saved scenarios), not a wrapper of the website.
- **Metadata:** honest title/description; no keyword stuffing, no unverifiable claims ("#1", "best"), no misleading screenshots.

## Consent and TCF v2.3 (AdSense and AdMob)
Verified against Google's AdSense help ([TCF v2.3 transition](https://support.google.com/adsense/answer/16703994), [consent requirements for the EEA, UK and Switzerland](https://support.google.com/adsense/answer/13554116)):
- Serving ads to users in the **EEA, UK and Switzerland** requires a **Google-certified CMP** integrated with the IAB Europe **Transparency and Consent Framework**. This has applied since 2024-01-16 for personalized ads.
- **TCF v2.3 transition deadline was 2026-02-28.** Consent strings created from 2026-03-01 must be v2.3 (they include the `disclosedVendors` segment); newly created v2.2 strings are no longer supported. Non-compliant traffic risks being served limited ads or dropped, which cuts revenue.
- **Our rule:** pick a CMP that is on Google's certified list **and** advertises TCF v2.3 support. Options: Google's own consent tooling (free, AdSense "Privacy & messaging"; UMP SDK on Android) or a third-party CMP. Prefer Google's own to avoid extra JS and cost. Re-verify the CMP against Google's certified-CMP list at Phase 2.5, not from this doc.
- `disclosedVendors`, consequences of non-compliance and per-product scope come from Google's CMP-requirements pages and secondary sources; the transition page itself confirms only the 2026-02-28 deadline and that Google's systems process v2.3. Treat details beyond that as **verify** at integration time.
- Performance: load the CMP script early enough to gate ad requests, but `async`, and keep the banner from shifting layout (fixed-position overlay, not in-flow).

## Legal and disclaimers
- Estimates only, not financial, tax or legal advice. Repeat on results for tax/IFTA/per-diem tools.
- Trademarks: use "IFTA" descriptively, don't imply endorsement by IFTA, Inc., IRS or DOT.
- Copyright: rates are facts, but present them in our own structure and cite sources.
- CCPA/GDPR: privacy policy covers advertising identifiers; consent tooling handles regional rules. Have a contact email for requests.

## Account hygiene
Two-factor auth on Google account, Cloudflare, registrar, GitHub. Keep AdSense/AdMob payment and tax info complete (W-9 / tax info in the AdSense and AdMob profiles as prompted). Enable the registrar's auto-renew and domain lock.

## Revenue modelling (no fabricated numbers)
Revenue ≈ sessions × pages/session × ad viewability × RPM/1000. All four are unknown until we have data. Decisions in Phases 4–5 are made on measured RPM and engagement per page, not on assumed CPC figures from blog posts.
