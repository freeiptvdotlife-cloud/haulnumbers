import { ceilCents, ceilPerMile, roundCents, roundFraction, roundPerMile } from "./money";
import { type FieldError, type Result, isFiniteNonNegative, isFinitePositive } from "./result";

export type LoadVerdict = "TAKE" | "NEGOTIATE" | "SKIP";

export interface LoadProfitInput {
  /** Revenue components in USD; all >= 0. */
  linehaulRevenue: number;
  fuelSurcharge: number;
  /** Detention, lumper reimbursement, etc. */
  accessorials: number;
  /** Miles with freight on. Must be > 0. */
  loadedMiles: number;
  /** Empty miles to reach the pickup (and any empty return counted for this load). >= 0. */
  deadheadMiles: number;
  mpg: number;
  fuelPricePerGallon: number;
  tolls: number;
  otherTripCosts: number;
  /** Maintenance, tires and fixed-cost allocation per mile (see cost-per-mile tool), excluding fuel. */
  nonFuelCostPerMile: number;
  /** Fractions of gross revenue, 0..1 (0.05 = 5%). Together they must stay below 1. */
  dispatchFeePct: number;
  factoringFeePct: number;
  /** Minimum acceptable net profit per total mile (loaded + deadhead), USD. */
  minProfitPerMile: number;
}

export interface LoadProfitResult {
  grossRevenue: number;
  fees: number;
  totalMiles: number;
  fuelCost: number;
  /** Non-fuel per-mile cost x total miles + tolls + other trip costs. */
  otherCost: number;
  netProfit: number;
  /** Gross revenue per total mile, including deadhead. */
  allInRatePerMile: number;
  profitPerMile: number;
  /** Deadhead as a fraction of total miles (0..1). */
  deadheadPct: number;
  /** Gross revenue (all-in, dollars) required to reach minProfitPerMile after revenue-scaled fees. */
  minRateToAccept: number;
  /** minRateToAccept expressed per total mile. */
  minRatePerMile: number;
  /** Linehaul to ask for, given the fuel surcharge and accessorials already offered (never below 0). */
  minLinehaulToAccept: number;
  verdict: LoadVerdict;
}

const FEE_FIELDS = ["dispatchFeePct", "factoringFeePct"] as const;
const NON_NEGATIVE_FIELDS = [
  "linehaulRevenue",
  "fuelSurcharge",
  "accessorials",
  "deadheadMiles",
  "fuelPricePerGallon",
  "tolls",
  "otherTripCosts",
  "nonFuelCostPerMile",
  "minProfitPerMile",
] as const;

export function validateLoadProfit(input: LoadProfitInput): FieldError[] {
  const errors: FieldError[] = [];
  if (!isFinitePositive(input.loadedMiles)) {
    errors.push({ field: "loadedMiles", message: "Loaded miles must be greater than 0." });
  }
  if (!isFinitePositive(input.mpg)) {
    errors.push({ field: "mpg", message: "MPG must be greater than 0." });
  }
  for (const key of NON_NEGATIVE_FIELDS) {
    if (!isFiniteNonNegative(input[key])) {
      errors.push({ field: key, message: "Must be 0 or more." });
    }
  }
  let feesValid = true;
  for (const key of FEE_FIELDS) {
    const v = input[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v >= 1) {
      feesValid = false;
      errors.push({ field: key, message: "Fee must be at least 0% and below 100%." });
    }
  }
  if (feesValid && input.dispatchFeePct + input.factoringFeePct >= 1) {
    errors.push({
      field: "factoringFeePct",
      message: "Dispatch and factoring fees together must be below 100%.",
    });
  }
  return errors;
}

export function calculateLoadProfit(input: LoadProfitInput): Result<LoadProfitResult> {
  const errors = validateLoadProfit(input);
  if (errors.length > 0) return { ok: false, errors };

  const totalMiles = input.loadedMiles + input.deadheadMiles;
  const feePct = input.dispatchFeePct + input.factoringFeePct;

  const grossRevenue = input.linehaulRevenue + input.fuelSurcharge + input.accessorials;
  const fees = grossRevenue * feePct;
  const fuelCost = (totalMiles / input.mpg) * input.fuelPricePerGallon;
  const otherCost = totalMiles * input.nonFuelCostPerMile + input.tolls + input.otherTripCosts;
  const netProfit = grossRevenue - fees - fuelCost - otherCost;

  // Fees are a share of gross revenue R, so profit(R) = R(1 - feePct) - costs.
  // Solving profit(R) = minProfitPerMile x totalMiles gives a closed form; no iteration needed.
  const requiredProfit = input.minProfitPerMile * totalMiles;
  const minRateToAccept = (fuelCost + otherCost + requiredProfit) / (1 - feePct);
  const minLinehaulToAccept = Math.max(
    0,
    minRateToAccept - input.fuelSurcharge - input.accessorials,
  );

  // Compare in whole cents so exact-equality boundaries are not decided by float noise.
  const netCents = roundCents(netProfit);
  const verdict: LoadVerdict =
    netCents <= 0 ? "SKIP" : netCents >= roundCents(requiredProfit) ? "TAKE" : "NEGOTIATE";

  return {
    ok: true,
    value: {
      grossRevenue: roundCents(grossRevenue),
      fees: roundCents(fees),
      totalMiles,
      fuelCost: roundCents(fuelCost),
      otherCost: roundCents(otherCost),
      netProfit: netCents,
      allInRatePerMile: roundPerMile(grossRevenue / totalMiles),
      profitPerMile: roundPerMile(netProfit / totalMiles),
      deadheadPct: roundFraction(input.deadheadMiles / totalMiles),
      // Minimums round up so following the advice always lands at or above the threshold.
      minRateToAccept: ceilCents(minRateToAccept),
      minRatePerMile: ceilPerMile(minRateToAccept / totalMiles),
      minLinehaulToAccept: ceilCents(minLinehaulToAccept),
      verdict,
    },
  };
}
