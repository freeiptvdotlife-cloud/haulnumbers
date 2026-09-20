# Google Play listing draft

Limits checked when this was written: title 30, short description 80, full description 4000 characters. Re-check in Play Console.

## Title (pick one, both under 30)
- `Haul Numbers Trucker Tools` (26 chars)
- `Haul Numbers: Trucking Calc` (27 chars)

## Short description (80 chars)
Free trucker calculators: cost per mile, load profit, IFTA, detention, per diem.

## Full description (1334 chars)
```
Haul Numbers is a set of free calculators for owner-operator truckers. Work out what a load is really worth before you say yes.

WHAT YOU CAN CALCULATE
• Cost per mile: your true cost per mile, your break-even rate and the rate you need for the profit you want.
• Load profit: real profit per mile including deadhead miles and broker or factoring fees, plus the lowest pay worth accepting.
• Detention pay: what you are owed for waiting past free time, including waits that run past midnight.
• IFTA fuel tax: an estimate of your quarterly diesel tax by state, using rates from the official IFTA matrix.
• Per diem: your meal deduction using the IRS special rate for transportation workers.

BUILT FOR THE CAB
• Works offline. Everything is calculated on your phone and nothing you type is uploaded.
• Save your usual lanes and scenarios and load them again later. They stay on your phone.
• Clear results, every formula explained, and the source and date shown for official rates.
• Dark mode and large touch targets.

HONEST NUMBERS
Results are estimates based on what you enter. They are not financial, tax or legal advice. Check your contracts and your own tax situation before you rely on a result.

The app shows ads. Where the law requires it you are asked for your consent, and you can change your choice any time in Settings.
```

## Category and tags
Category: **Business** (alternative: Tools). Tags to pick in the console: calculator, finance/business tools, transportation.

## Assets
| Asset | Status | Where |
|---|---|---|
| App icon 512 x 512 PNG | Derive from `apps/mobile/assets/icon.png` (1024 px) | resize to 512 |
| Feature graphic 1024 x 500 | Done (placeholder branding) | `docs/store/feature-graphic.png` |
| Phone screenshots (at least 2, ideally 6-8) | **Needs an emulator or device run** | capture: home, cost per mile, load profit verdict, IFTA table, per diem, saved scenarios, dark mode |
| 7-inch and 10-inch tablet screenshots | Optional but improves visibility | same screens on a tablet emulator |

## Contact and policy (fill in after the domain exists)
- Website: `https://haulnumbers.com`
- Support email: the `PUBLIC_CONTACT_EMAIL` address
- Privacy policy URL: `https://haulnumbers.com/privacy/`

## Content rating questionnaire, expected answers
Utility app. No violence, sexual content, profanity, gambling, controlled substances, user-generated content, location sharing or purchases. Contains ads: yes. Expected rating: suitable for everyone; **target audience: adults (18+)**, not children, so the Families policy does not apply. Answer the real questionnaire truthfully in the console; this is only the plan.

## Data safety form, draft (VERIFY against the SDK's own disclosure page before submitting)
- The app itself collects no account data, stores no data on servers, and does not upload calculator inputs or saved scenarios (they stay on the device; a Settings button deletes them).
- Ads: the Google Mobile Ads (AdMob) SDK collects data for advertising and analytics. Complete the form from Google's current Google Mobile Ads SDK data-disclosure guidance (search for "Google Mobile Ads SDK Play data disclosure"), which lists what to declare (typically device or other identifiers such as the advertising ID, and diagnostics). **This list was not verified when written.**
- Data is encrypted in transit by the SDK; users can request deletion of app data via Settings (saved scenarios) and Android's ad settings for the advertising ID.
- Permissions requested by our config: `INTERNET` only. The AdMob SDK merges `ACCESS_NETWORK_STATE` and the advertising-ID permission. Confirm the merged list with `aapt2 dump permissions app-release.apk` after the first build.
- Also complete Play's **Advertising ID declaration** (the app uses the advertising ID for advertising).

## Release checklist pointers
Signing, test tracks, the closed-testing requirement and the production ID rules are in `docs/08-launch-checklist.md`.
