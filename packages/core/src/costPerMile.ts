import { roundCents, roundPerMile } from "./money";
import { type FieldError, type Result, isFiniteNonNegative, isFinitePositive } from "./result";

export interface CostPerMileInput {
  /** Miles driven in the period (usually a month). Must be > 0. */
  miles: number;
  /** Fixed costs for the same period, in USD. */
  fixed: {
    truckPayment: number;
    insurance: number;
    permitsAndFees: number;
    other: number;
  };
  /** Variable costs. Fuel is derived from mpg and price; others are $/mile. */
  variable: {
    mpg: number;
    fuelPricePerGallon: number;
    maintenancePerMile: number;
    tiresPerMile: number;
    otherPerMile: number;
  };
  /** Driver/owner wage per mile if you pay yourself or a driver. */
  driverPayPerMile: number;
  /** Desired profit margin on revenue, 0..0.9 (e.g. 0.1 = 10%). */
  targetProfitMargin: number;
}

export interface CostPerMileResult {
  fixedTotal: number;
  fixedPerMile: number;
  fuelPerMile: number;
  variablePerMile: number;
  costPerMile: number;
  totalCost: number;
  /** Revenue per mile needed to cover all costs (break-even). */
  breakEvenRatePerMile: number;
  /** Revenue per mile needed to hit targetProfitMargin. */
  targetRatePerMile: number;
  /** Profit per period if revenue equals targetRatePerMile x miles. */
  targetProfit: number;
}

export function validateCostPerMile(input: CostPerMileInput): FieldError[] {
  const errors: FieldError[] = [];
  if (!isFinitePositive(input.miles)) {
    errors.push({ field: "miles", message: "Miles must be greater than 0." });
  }
  for (const [key, v] of Object.entries(input.fixed)) {
    if (!isFiniteNonNegative(v)) {
      errors.push({ field: `fixed.${key}`, message: "Must be 0 or more." });
    }
  }
  if (!isFinitePositive(input.variable.mpg)) {
    errors.push({ field: "variable.mpg", message: "MPG must be greater than 0." });
  }
  for (const key of [
    "fuelPricePerGallon",
    "maintenancePerMile",
    "tiresPerMile",
    "otherPerMile",
  ] as const) {
    if (!isFiniteNonNegative(input.variable[key])) {
      errors.push({ field: `variable.${key}`, message: "Must be 0 or more." });
    }
  }
  if (!isFiniteNonNegative(input.driverPayPerMile)) {
    errors.push({ field: "driverPayPerMile", message: "Must be 0 or more." });
  }
  const m = input.targetProfitMargin;
  if (typeof m !== "number" || !Number.isFinite(m) || m < 0 || m > 0.9) {
    errors.push({ field: "targetProfitMargin", message: "Margin must be between 0% and 90%." });
  }
  return errors;
}

export function calculateCostPerMile(input: CostPerMileInput): Result<CostPerMileResult> {
  const errors = validateCostPerMile(input);
  if (errors.length > 0) return { ok: false, errors };

  const { miles, fixed, variable } = input;
  const fixedTotal = fixed.truckPayment + fixed.insurance + fixed.permitsAndFees + fixed.other;
  const fixedPerMile = fixedTotal / miles;
  const fuelPerMile = variable.fuelPricePerGallon / variable.mpg;
  const variablePerMile =
    fuelPerMile +
    variable.maintenancePerMile +
    variable.tiresPerMile +
    variable.otherPerMile +
    input.driverPayPerMile;

  const costPerMile = fixedPerMile + variablePerMile;
  const totalCost = costPerMile * miles;
  // Margin is on revenue: rate = cost / (1 - margin)
  const targetRatePerMile = costPerMile / (1 - input.targetProfitMargin);

  return {
    ok: true,
    value: {
      fixedTotal: roundCents(fixedTotal),
      fixedPerMile: roundPerMile(fixedPerMile),
      fuelPerMile: roundPerMile(fuelPerMile),
      variablePerMile: roundPerMile(variablePerMile),
      costPerMile: roundPerMile(costPerMile),
      totalCost: roundCents(totalCost),
      breakEvenRatePerMile: roundPerMile(costPerMile),
      targetRatePerMile: roundPerMile(targetRatePerMile),
      targetProfit: roundCents(targetRatePerMile * miles - totalCost),
    },
  };
}
