import { calculateLoadProfit } from "@haulnumbers/core";
import { useMemo } from "react";
import { describeErrors } from "../lib/errors";
import { num, pct, usd } from "../lib/format";
import { useForm } from "../lib/useForm";
import { CalculatorScreen } from "../ui/CalculatorScreen";
import { Card, Disclaimer, ErrorList, Field, Heading, Notice, ResultRows } from "../ui/kit";

const LABELS: Record<string, string> = {
  linehaulRevenue: "Linehaul rate", fuelSurcharge: "Fuel surcharge", accessorials: "Accessorials (detention, lumper)",
  loadedMiles: "Loaded miles", deadheadMiles: "Deadhead (empty) miles", mpg: "Truck MPG", fuelPricePerGallon: "Fuel price per gallon",
  tolls: "Tolls", otherTripCosts: "Other trip costs", nonFuelCostPerMile: "Non-fuel cost per mile",
  dispatchPercent: "Dispatch or broker fee (%)", factoringPercent: "Factoring fee (%)", minProfitPerMile: "Minimum profit per mile",
};
const toInput = (f: string) => (f === "dispatchFeePct" ? "dispatchPercent" : f === "factoringFeePct" ? "factoringPercent" : f);

export function LoadProfitScreen() {
  const { v, set } = useForm({
    linehaulRevenue: "2000", fuelSurcharge: "300", accessorials: "100", loadedMiles: "800", deadheadMiles: "200",
    mpg: "6.5", fuelPricePerGallon: "4", tolls: "50", otherTripCosts: "0", nonFuelCostPerMile: "0.3",
    dispatchPercent: "5", factoringPercent: "2", minProfitPerMile: "0.5",
  });
  const r = useMemo(() => calculateLoadProfit({
    linehaulRevenue: num(v.linehaulRevenue), fuelSurcharge: num(v.fuelSurcharge), accessorials: num(v.accessorials),
    loadedMiles: num(v.loadedMiles), deadheadMiles: num(v.deadheadMiles), mpg: num(v.mpg), fuelPricePerGallon: num(v.fuelPricePerGallon),
    tolls: num(v.tolls), otherTripCosts: num(v.otherTripCosts), nonFuelCostPerMile: num(v.nonFuelCostPerMile),
    dispatchFeePct: num(v.dispatchPercent) / 100, factoringFeePct: num(v.factoringPercent) / 100, minProfitPerMile: num(v.minProfitPerMile),
  }), [v]);
  const { messages, bad } = r.ok ? { messages: [], bad: new Set<string>() } : describeErrors(r.errors, toInput, LABELS);
  const f = (k: keyof typeof v) => ({ label: LABELS[k] ?? k, value: v[k], onChangeText: set(k), error: bad.has(k), testID: `in-${k}` });

  let verdict: { text: string; tone: "brand" | "accent" | "bad" } | null = null;
  if (r.ok) {
    const x = r.value;
    verdict = x.verdict === "TAKE" ? { text: `Take it: you keep ${usd(x.profitPerMile, 3)} per mile, above your minimum.`, tone: "brand" }
      : x.verdict === "NEGOTIATE" ? { text: `Negotiate: profitable, but below your minimum. Ask for at least ${usd(x.minLinehaulToAccept)} linehaul.`, tone: "accent" }
      : { text: x.netProfit < 0 ? `Skip: this load loses ${usd(-x.netProfit)}.` : "Skip: this load only breaks even.", tone: "bad" };
  }

  return (
    <CalculatorScreen hasResult={r.ok}>
      <Card>
        <Heading>Pay (USD)</Heading>
        <Field {...f("linehaulRevenue")} /><Field {...f("fuelSurcharge")} /><Field {...f("accessorials")} />
        <Heading>Miles</Heading>
        <Field {...f("loadedMiles")} /><Field {...f("deadheadMiles")} />
        <Heading>Costs</Heading>
        <Field {...f("mpg")} /><Field {...f("fuelPricePerGallon")} /><Field {...f("tolls")} /><Field {...f("otherTripCosts")} /><Field {...f("nonFuelCostPerMile")} />
        <Heading>Fees and goal</Heading>
        <Field {...f("dispatchPercent")} /><Field {...f("factoringPercent")} /><Field {...f("minProfitPerMile")} />
      </Card>
      <Card>
        <Heading>Your results</Heading>
        {verdict && <Notice tone={verdict.tone}>{verdict.text}</Notice>}
        <ErrorList messages={messages} />
        {r.ok && (
          <ResultRows rows={[
            ["Net profit", usd(r.value.netProfit), true],
            ["Profit per total mile", usd(r.value.profitPerMile, 3), true],
            ["All-in rate per mile (with deadhead)", usd(r.value.allInRatePerMile, 3)],
            ["Deadhead share of miles", pct(r.value.deadheadPct)],
            ["Gross pay", usd(r.value.grossRevenue)],
            ["Fees", usd(r.value.fees)],
            ["Fuel cost", usd(r.value.fuelCost)],
            ["Other costs", usd(r.value.otherCost)],
            ["Lowest pay to accept", usd(r.value.minRateToAccept)],
            ["Lowest pay per mile to accept", usd(r.value.minRatePerMile, 3)],
            ["Lowest linehaul to ask for", usd(r.value.minLinehaulToAccept)],
          ]} />
        )}
        <Disclaimer />
      </Card>
    </CalculatorScreen>
  );
}
