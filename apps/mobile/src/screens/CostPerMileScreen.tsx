import { calculateCostPerMile } from "@haulnumbers/core";
import { useMemo } from "react";
import { describeErrors } from "../lib/errors";
import { num, usd } from "../lib/format";
import { useForm } from "../lib/useForm";
import { SavedScenarios } from "../ui/SavedScenarios";
import { pickOneOf, pickStrings, asRecord } from "../scenarios/snapshot";
import { CalculatorScreen } from "../ui/CalculatorScreen";
import { Card, Disclaimer, ErrorList, Field, Heading, ResultRows } from "../ui/kit";

const LABELS: Record<string, string> = {
  miles: "Miles driven this month", truckPayment: "Truck payment", insurance: "Insurance", permitsAndFees: "Permits and fees", other: "Other fixed",
  mpg: "Truck MPG", fuelPricePerGallon: "Fuel price per gallon", maintenancePerMile: "Maintenance per mile", tiresPerMile: "Tires per mile",
  otherPerMile: "Other per mile", driverPayPerMile: "Driver pay per mile", marginPercent: "Target profit margin (%)",
};
const toInput = (f: string) => (f === "targetProfitMargin" ? "marginPercent" : f.replace(/^(fixed|variable)\./, ""));

const DEFAULTS = {
    miles: "10000", truckPayment: "2000", insurance: "1500", permitsAndFees: "300", other: "200",
    mpg: "6.5", fuelPricePerGallon: "3.9", maintenancePerMile: "0.15", tiresPerMile: "0.05", otherPerMile: "0", driverPayPerMile: "0", marginPercent: "10",
  };

export function CostPerMileScreen() {
  const { v, set, replace } = useForm(DEFAULTS);
  const r = useMemo(() => calculateCostPerMile({
    miles: num(v.miles),
    fixed: { truckPayment: num(v.truckPayment), insurance: num(v.insurance), permitsAndFees: num(v.permitsAndFees), other: num(v.other) },
    variable: { mpg: num(v.mpg), fuelPricePerGallon: num(v.fuelPricePerGallon), maintenancePerMile: num(v.maintenancePerMile), tiresPerMile: num(v.tiresPerMile), otherPerMile: num(v.otherPerMile) },
    driverPayPerMile: num(v.driverPayPerMile),
    targetProfitMargin: num(v.marginPercent) / 100,
  }), [v]);
  const { messages, bad } = r.ok ? { messages: [], bad: new Set<string>() } : describeErrors(r.errors, toInput, LABELS);
  const f = (k: keyof typeof v) => ({ label: LABELS[k] ?? k, value: v[k], onChangeText: set(k), error: bad.has(k), testID: `in-${k}` });

  return (
    <CalculatorScreen hasResult={r.ok}>
      <Card>
        <Heading>Miles</Heading>
        <Field {...f("miles")} />
        <Heading>Fixed costs per month (USD)</Heading>
        <Field {...f("truckPayment")} /><Field {...f("insurance")} /><Field {...f("permitsAndFees")} /><Field {...f("other")} />
        <Heading>Variable costs</Heading>
        <Field {...f("mpg")} /><Field {...f("fuelPricePerGallon")} /><Field {...f("maintenancePerMile")} />
        <Field {...f("tiresPerMile")} /><Field {...f("otherPerMile")} /><Field {...f("driverPayPerMile")} />
        <Heading>Profit goal</Heading>
        <Field {...f("marginPercent")} />
      </Card>
      <Card>
        <Heading>Your results</Heading>
        <ErrorList messages={messages} />
        {r.ok && (
          <ResultRows rows={[
            ["Total cost per mile", usd(r.value.costPerMile, 3), true],
            ["Break-even rate per mile", usd(r.value.breakEvenRatePerMile, 3)],
            ["Target rate per mile", usd(r.value.targetRatePerMile, 3), true],
            ["Fixed cost per mile", usd(r.value.fixedPerMile, 3)],
            ["Fuel per mile", usd(r.value.fuelPerMile, 3)],
            ["Total monthly cost", usd(r.value.totalCost)],
            ["Profit at target rate", usd(r.value.targetProfit)],
          ]} />
        )}
        <Disclaimer />
      </Card>
      <SavedScenarios toolId="cost-per-mile" snapshot={v} onLoad={(st) => replace(pickStrings(DEFAULTS, st))} />
    </CalculatorScreen>
  );
}
