# 03 · Calculator specifications

Conventions: USD, US units (miles, gallons). Per-mile values display at 3 decimals, totals at 2. All inputs validated; invalid input returns field errors. "Data" means a dated, sourced table (see doc 02).

---
## 1. Cost per mile ✅ implemented (`costPerMile.ts`)
**Inputs:** miles, fixed costs (truck payment, insurance, permits and fees, other), MPG, fuel price, maintenance/mi, tires/mi, other/mi, driver pay/mi, target margin.
**Formulas:**
- `fixedPerMile = fixedTotal / miles`
- `fuelPerMile = fuelPrice / mpg`
- `CPM = fixedPerMile + fuelPerMile + maintenance + tires + other + driverPay`
- `targetRate = CPM / (1 − margin)` (margin on revenue)
**Validation:** miles > 0, mpg > 0, everything else ≥ 0, margin 0–90%.
**Later additions:** cost breakdown chart, "what if fuel +$0.50" sensitivity, save-as-preset (app).

---
## 2. Load profit and deadhead ✅ implemented (`loadProfit.ts`, `/load-profit-calculator/`)
**Inputs:** linehaul revenue, fuel surcharge, accessorials (detention, lumper, etc.), loaded miles, deadhead miles, MPG, fuel price, tolls, other trip costs, `nonFuelCostPerMile` (maintenance, tires, fixed allocation from the CPM tool), `dispatchFeePct` and `factoringFeePct` (**fractions of gross revenue**, 0.05 = 5%), `minProfitPerMile` (per total mile).
**Formulas:**
- `grossRevenue = linehaul + fsc + accessorials`
- `fees = grossRevenue × (dispatchFeePct + factoringFeePct)`
- `totalMiles = loaded + deadhead`
- `fuelCost = totalMiles / mpg × fuelPrice`
- `otherCost = totalMiles × nonFuelCostPerMile + tolls + otherTrip`
- `netProfit = grossRevenue − fees − fuelCost − otherCost`
- `allInRatePerMile = grossRevenue / totalMiles` (includes deadhead), `profitPerMile = netProfit / totalMiles`, `deadheadPct = deadhead / totalMiles`
- **Revenue-scaled fees:** fees are a share of revenue `R`, so `profit(R) = R(1 − feePct) − costs`. Setting `profit(R) = minProfitPerMile × totalMiles` gives the closed form `minRateToAccept = (fuelCost + otherCost + minProfitPerMile × totalMiles) / (1 − feePct)`. No iteration is needed.
- `minLinehaulToAccept = max(0, minRateToAccept − fsc − accessorials)`
**Rounding:** results round to nearest (cents, 3-decimal per-mile). **Minimums (`minRateToAccept`, `minRatePerMile`, `minLinehaulToAccept`) round UP**, so acting on the advice never lands a fraction of a cent short. `-0` is normalised to `0`.
**Verdict** (compared in whole cents, so exact-equality boundaries are not decided by float noise): `SKIP` if `netProfit ≤ 0`; else `TAKE` if `netProfit ≥ minProfitPerMile × totalMiles`; else `NEGOTIATE` (show `minLinehaulToAccept`).
**Validation (field errors, never throws):** `loadedMiles > 0`, `mpg > 0`, all other money/mile inputs ≥ 0 and finite (NaN, Infinity and non-numbers rejected), each fee in `[0, 1)`, and the two fees together `< 1` (reported on `factoringFeePct`).
**Tests:** `packages/core/test/loadProfit.test.ts`: worked example, fee scaling, zero deadhead, verdict boundaries at exact equality, zero profit, negative profit, counter-offer round trip (NEGOTIATE → TAKE), clamping, and all validation paths.
**Differentiator:** shows "the load looks like $2.50/mi but is $1.62/mi all-in".
**Not applicable:** time-of-day/midnight logic belongs to the detention tool (#3), not this one.

---
## 3. Detention and layover pay ✅ implemented (`detention.ts`, `/detention-pay-calculator/`)
**Inputs:** per stop (pickup, delivery; up to 10 in core): arrival and departure clock times (`HH:MM`, 24 h) plus optional `extraDays`; free minutes (default 120, applied **per stop**); hourly rate; billing block (`0` exact minutes, `15`, `30`, `60` = each started hour); optional flat layover (`layoverDays` × `layoverRatePerDay`).
**Formulas:**
- `minutesOnSite = ((departure − arrival + 1440) mod 1440) + extraDays × 1440` (`minutesBetween`).
- `over = max(0, minutesOnSite − freeMinutes)`; `billable = over` when increment is 0, else `ceil(over / increment) × increment`.
- `stopPay = billable / 60 × hourlyRate` rounded to cents; `detentionPay` = sum of per-stop pay in **whole cents**; `total = detentionPay + layoverPay`.
**Midnight rule:** a departure earlier than the arrival means the next day. **Identical times mean 0 minutes**; a full-day stay must be entered with `extraDays`, which removes the 0-versus-24-hour ambiguity instead of guessing.
**Validation (field errors, never throws):** malformed times (`24:00`, `9:30`, `12:60`, non-strings), `extraDays` a whole number ≥ 0, `minutesOnSite` whole minutes 0–10,080 (7 days; longer is treated as a typo), free time whole minutes ≥ 0, rate ≥ 0, increment one of 0/15/30/60, 1–10 stops.
**Tests:** `packages/core/test/detention.test.ts`: midnight crossing, identical times, extra days, exactly-at-free-time, 1 minute over for every increment, exact multiples, per-stop (not pooled) free time, cent-exact summing over several stops, layover, and every validation path.
**UI:** an unused stop is left blank (both times); one blank time is an error naming the field. Shows per-stop time on site, billable time and pay, plus totals.
**Deferred (not built, add only if Search Console shows demand):** effective rate-per-mile impact of detention on a load (use the load-profit tool, entering detention under accessorials), per-stop free-time overrides.
**Note:** detention terms are contractual; the page tells users to check their rate confirmation.

---
## 4. Per diem / take-home ✅ implemented (`perDiem.ts`, `data/perDiemRates.ts`, `/per-diem-calculator/`)
**Audience:** self-employed owner-operators. Company drivers generally cannot deduct unreimbursed meals (Pub. 463: employee deductions suspended apart from listed categories); the page says so and points to a tax professional.
**Inputs:** rate period, area (continental U.S. / outside), full days away, departure-and-return days, hours-of-service yes/no, user's combined marginal tax rate (an example default of 25%, labelled "enter your own").
**Data (verified 2026-09-19 against IRS primary sources):** `src/data/perDiem/<period>.json`, hand-transcribed from the annual notice. **Notice 2025-54 §3: $80 continental U.S., $86 outside**, for Oct 1, 2025 – Sep 30, 2026. Percentages from Pub. 463 (2025): **80%** for interstate truck operators under DOT hours-of-service limits, **50%** otherwise. Departure/return days: **Method 1, 3/4 of the daily rate** (Method 2, any consistent reasonable proration, is not modelled).
**Formulas (exact integer cents):**
- `quarters = 4 × fullDays + 3 × partialDays`; `total = round(rate × quarters / 4)`
- `deductible = round(total × 80% or 50%)`; `estimatedTaxSavings = round(deductible × taxRate)` (rate held in hundredths of a percent)
**Validation:** whole days 0–366, at least one day and at most 366 in total, known period and area, boolean hours-of-service, tax rate 0–100.
**Rules stated on the page (each confirmed verbatim in Pub. 463):** using the special rate for any trip means using it for all trips that year; "traveling away from home" definition; standard meal allowance means no need to prove the amount.
**Staleness handling:** the IRS notice for the next Oct 1 period normally appears in late September. The page shows an "these rates ended on …" banner once the selected period has passed, and a freshness test fails from that date until a new data file is added (doc 06 runbook). No rate is ever estimated.
**Tests:** `perDiem.test.ts`: hand-computed example ($920 → $736 → $184), outside-U.S. rate, 50% case, partial-only/full-only, fractional tax rate, half-up cent rounding with an odd rate, full year, every validation path, data integrity, freshness.
**Not modelled (by design):** state per diem, lodging, the regular GSA M&IE tables, Method 2 proration, actual-expense method, self-employment tax computation, eligibility.

---
## 5. IFTA quarterly estimator ✅ implemented (`ifta.ts`, `data/iftaRates.ts`, `/ifta-calculator/`)
**Scope (v1):** **diesel only**, the **48 IFTA member U.S. states**. Gasoline, other fuels, EV/hydrogen, Canadian provinces, interest and penalties are out of scope and stated on the page.
**Inputs:** quarter; per state: total miles, exempt miles, tax-paid gallons bought; optional gallons bought without tax paid (bulk).
**Rules (from a state's IFTA return instructions; IFTA rules are uniform across jurisdictions):**
- Inputs are rounded to whole miles and gallons (half up).
- `fleetMPG = totalMiles / totalGallons`, rounded to 2 decimals, **half up**. Total miles = **every** mile incl. exempt, deadhead, bobtail and off-highway; total gallons = tax-paid + untaxed.
- `taxableMiles = miles − exempt`; `taxableGallons = taxableMiles / fleetMPG`, rounded to whole gallons, half up.
- `netTaxableGallons = taxableGallons − taxPaidGallons`; `tax = net × baseRate` (negative = credit).
- **Surcharge (KY, VA):** `taxableGallons × surchargeRate`, **tax-paid gallons are not deducted, and it is never a credit**. Shown separately.
- `netTax` = sum of every state's tax + surcharge (negative = net credit).
**Exactness:** after input rounding all math is integer (MPG in hundredths, rates in 1/10,000 dollar, money in cents), so half-way cases match the paper return and never drift with floating point. Tax lines round half away from zero.
**Validation:** unknown quarter, unknown or duplicate state, negative/NaN/non-number/≥ 10 million values, exempt > miles, 1–48 states, zero total miles or gallons, MPG below 0.01. **Warning** (not error) when fleet MPG is under 3 or over 15 (usually swapped fields).
**Data:** `packages/core/src/data/ifta/<year>q<n>.json`, generated only by `tools/updateIftaRates.mjs` from IFTA, Inc.'s official matrix (`https://www.iftach.org/taxmatrix4/Taxmatrix.php?QY=<n>Q<year>`). Each file records source URL, retrieval date, `status` (`final` or `preliminary` + `finalDate`, from the matrix's "not final until" notice) and `blankDiesel`.
- **Oregon:** its whole row is blank in the matrix (no footnote), so it is stored as 0 and listed in `blankDiesel`; its miles still count toward MPG. The page says only that IFTA lists no diesel rate for Oregon, without guessing why.
- **Indiana:** the matrix's "(Surcharge)" row for Indiana currently carries **gasoline** (a Jul 1–Sep 5, 2026 gas-tax holiday per the matrix footnote), so it does not affect diesel. Diesel is read from the "Special Diesel" column only.
- **Kentucky/Virginia** surcharge rates come straight from the matrix (not from blogs, which disagreed with it).
**Parser safety (`tools/iftaMatrix.mjs`):** refuses to read a page whose heading or rate-change notes name a different quarter; requires exactly 48 states with 17 cells each; cross-checks each displayed rate against its rate-change note; handles the site's two cell layouts; fails on any unexpected content; only Oregon may be blank; rates must fall in 0.10–1.50 $/gal.
**Tests:** hand-computed three-state return ($29.25 net), surcharge-not-a-credit, MPG half-up (5.765 → 5.77), taxable-gallon half-up, exempt/untaxed/Oregon cases, all validation paths, parser happy paths and every refusal, data integrity of every shipped file, independently confirmed rates (CA 0.979 up from 0.971, PA 0.741, TX 0.20), and the **freshness gate** (fails if the current calendar quarter has no rate file).
**Disclaimer:** an estimate; the user's base jurisdiction determines the actual return, interest and penalties.
**Update process:** see doc 06 ("Quarterly IFTA rate update").

---
## Later candidates (Phase 4, order decided by Search Console)
Factoring fee cost, fuel surcharge (FSC) per-mile from DOE price, truck lease vs buy, trip cost planner, depreciation, break-even miles/month, ROI of a new truck.

## Shared UI contract per tool page
1. H1 with the exact head term. 2. Calculator. 3. Results with plain-language interpretation. 4. "How it works" formula list. 5. Worked example. 6. FAQ (with FAQPage schema only if visible on the page). 7. Related tools. 8. Disclaimer. 9. Last-updated date when data-driven.
