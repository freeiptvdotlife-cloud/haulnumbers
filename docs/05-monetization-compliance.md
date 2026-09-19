# 05 · Monetization and compliance

> Policies change. Treat this as a working checklist and re-read the current AdSense, AdMob and Google Play policy pages before each submission.
> **Last verified: 2026-09-19** against Google's own help pages (linked inline). Items still marked **verify** were not confirmed against a primary source.

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
| Interstitial | After a completed calculation or when leaving a result, capped (e.g., not more than once per 3 calculations and not within the first minute) | Never on app open, never on back-press exit, never mid-input; no surprise or accidental-click triggers |
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
