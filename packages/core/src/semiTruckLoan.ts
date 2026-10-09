import { roundCents } from "./money";
import { type FieldError, type Result, isFiniteNonNegative, isFinitePositive } from "./result";

export interface SemiTruckLoanInput {
  /** Total purchase price of the truck, USD. */
  truckPrice: number;
  /** Cash down payment, USD (0 for no money down). */
  downPayment: number;
  /** Trade-in value applied to the purchase, USD (0 if none). */
  tradeInValue: number;
  /** Annual percentage rate (APR), e.g. 7.5 means 7.5%. */
  annualRatePct: number;
  /** Loan term in months, 12–84. */
  termMonths: number;
}

export interface SemiTruckLoanAnnualRow {
  year: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
}

export interface SemiTruckLoanResult {
  loanAmount: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  annualSchedule: SemiTruckLoanAnnualRow[];
}

export function validateSemiTruckLoan(input: SemiTruckLoanInput): FieldError[] {
  const errors: FieldError[] = [];
  if (!isFinitePositive(input.truckPrice) || input.truckPrice > 5_000_000) {
    errors.push({ field: "truckPrice", message: "Enter a truck price between $1 and $5,000,000." });
  }
  if (!isFiniteNonNegative(input.downPayment) || input.downPayment >= input.truckPrice) {
    errors.push({ field: "downPayment", message: "Down payment must be less than the truck price." });
  }
  if (!isFiniteNonNegative(input.tradeInValue) || input.tradeInValue > input.truckPrice) {
    errors.push({ field: "tradeInValue", message: "Trade-in value must be between $0 and the truck price." });
  }
  if (
    typeof input.annualRatePct !== "number" ||
    !Number.isFinite(input.annualRatePct) ||
    input.annualRatePct < 0 ||
    input.annualRatePct > 30
  ) {
    errors.push({ field: "annualRatePct", message: "APR must be between 0% and 30%." });
  }
  if (
    !Number.isInteger(input.termMonths) ||
    input.termMonths < 12 ||
    input.termMonths > 84
  ) {
    errors.push({ field: "termMonths", message: "Loan term must be between 12 and 84 months." });
  }
  // Down payment + trade-in must not exceed the truck price
  if (
    errors.length === 0 &&
    input.downPayment + input.tradeInValue >= input.truckPrice
  ) {
    errors.push({ field: "downPayment", message: "Down payment and trade-in together must be less than the truck price." });
  }
  return errors;
}

export function calculateSemiTruckLoan(input: SemiTruckLoanInput): Result<SemiTruckLoanResult> {
  const errors = validateSemiTruckLoan(input);
  if (errors.length > 0) return { ok: false, errors };

  const loanAmount = roundCents(input.truckPrice - input.downPayment - input.tradeInValue);
  const monthlyRate = input.annualRatePct / 100 / 12;
  const n = input.termMonths;

  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = roundCents(loanAmount / n);
  } else {
    const factor = Math.pow(1 + monthlyRate, n);
    monthlyPayment = roundCents((loanAmount * monthlyRate * factor) / (factor - 1));
  }

  // Build annual schedule
  const annualSchedule: SemiTruckLoanAnnualRow[] = [];
  let balance = loanAmount;
  let totalInterest = 0;
  let currentYear = 1;
  let yearPrincipal = 0;
  let yearInterest = 0;

  for (let month = 1; month <= n; month++) {
    const interestCharge = roundCents(balance * monthlyRate);
    const principalCharge = month < n
      ? roundCents(Math.min(monthlyPayment - interestCharge, balance))
      : balance; // last payment clears the balance exactly
    balance = roundCents(balance - principalCharge);
    totalInterest = roundCents(totalInterest + interestCharge);
    yearPrincipal = roundCents(yearPrincipal + principalCharge);
    yearInterest = roundCents(yearInterest + interestCharge);

    if (month % 12 === 0 || month === n) {
      annualSchedule.push({
        year: currentYear,
        principalPaid: yearPrincipal,
        interestPaid: yearInterest,
        endingBalance: balance,
      });
      currentYear++;
      yearPrincipal = 0;
      yearInterest = 0;
    }
  }

  return {
    ok: true,
    value: {
      loanAmount,
      monthlyPayment,
      totalInterest,
      totalCost: roundCents(loanAmount + totalInterest),
      annualSchedule,
    },
  };
}
