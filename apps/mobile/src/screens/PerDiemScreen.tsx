import { PER_DIEM_TABLES, calculatePerDiem, getPerDiemTable, listPerDiemPeriods, type PerDiemArea } from "@haulnumbers/core";
import { useMemo, useState } from "react";
import { describeErrors } from "../lib/errors";
import { num, usd } from "../lib/format";
import { useForm } from "../lib/useForm";
import { SavedScenarios } from "../ui/SavedScenarios";
import { pickOneOf, pickStrings, asRecord } from "../scenarios/snapshot";
import { CalculatorScreen } from "../ui/CalculatorScreen";
import { Body, Card, Disclaimer, ErrorList, Field, Heading, Notice, ResultRows, Segmented } from "../ui/kit";

const LABELS: Record<string, string> = { fullDays: "Full days away", partialDays: "Departure and return days", taxRate: "Your combined tax rate (%), an example, enter your own", hos: "Subject to DOT hours-of-service limits?" };
const toInput = (f: string) => (f === "subjectToHoursOfService" ? "hos" : f === "marginalTaxRatePercent" ? "taxRate" : f);
const AREAS = [{ value: "conus", label: "Continental U.S." }, { value: "oconus", label: "Outside U.S." }] as const;
const HOS = [{ value: "yes", label: "Yes, 80%" }, { value: "no", label: "No, 50%" }] as const;

const DEFAULTS = { fullDays: "10", partialDays: "2", taxRate: "25" };

export function PerDiemScreen() {
  const period = listPerDiemPeriods()[0] ?? "";
  const table = getPerDiemTable(period);
  const { v, set, replace } = useForm(DEFAULTS);
  const [area, setArea] = useState<PerDiemArea>("conus");
  const [hos, setHos] = useState<"yes" | "no">("yes");
  const r = useMemo(() => calculatePerDiem({
    period, area, fullDays: num(v.fullDays), partialDays: num(v.partialDays), subjectToHoursOfService: hos === "yes", marginalTaxRatePercent: num(v.taxRate),
  }), [period, area, hos, v]);
  const { messages, bad } = r.ok ? { messages: [], bad: new Set<string>() } : describeErrors(r.errors, toInput, LABELS);
  const f = (k: keyof typeof v) => ({ label: LABELS[k] ?? k, value: v[k], onChangeText: set(k), error: bad.has(k), testID: `in-${k}`, keyboardType: k === "taxRate" ? ("decimal-pad" as const) : ("number-pad" as const) });
  const ended = table !== undefined && new Date().toISOString().slice(0, 10) > table.effectiveThrough;
  const latest = PER_DIEM_TABLES.find((t) => t.period === period);

  return (
    <CalculatorScreen hasResult={r.ok}>
      <Card>
        <Heading>IRS rates</Heading>
        <Body muted>{latest ? `${latest.effectiveFrom} to ${latest.effectiveThrough} (${latest.notice})` : "No rates available"}</Body>
        <Segmented label="Where you traveled" options={AREAS} value={area} onChange={setArea} />
        <Heading>Days away from home</Heading>
        <Field {...f("fullDays")} /><Field {...f("partialDays")} />
        <Heading>Deduction</Heading>
        <Segmented label={LABELS.hos ?? ""} options={HOS} value={hos} onChange={setHos} />
        <Field {...f("taxRate")} />
      </Card>
      <Card>
        <Heading>Your estimate</Heading>
        {ended && table && <Notice tone="accent">{`These rates ended on ${table.effectiveThrough}. The IRS publishes new rates each year for the period starting October 1, so check IRS.gov before relying on this estimate.`}</Notice>}
        <ErrorList messages={messages} />
        {r.ok && (
          <ResultRows rows={[
            ["Daily rate", usd(r.value.dailyRate)],
            ["Departure and return day rate (¾)", usd(r.value.partialDayRate)],
            ["Days counted", String(r.value.dayEquivalents)],
            ["Per diem total", usd(r.value.perDiemTotal)],
            [`Deductible (${r.value.deductiblePercent}%)`, usd(r.value.deductibleAmount), true],
            [`Estimated tax savings at ${r.value.marginalTaxRatePercent}%`, usd(r.value.estimatedTaxSavings), true],
          ]} />
        )}
        <Body muted>{`Rates: IRS ${latest?.notice ?? ""}, retrieved ${latest?.retrievedAt ?? ""}. For self-employed owner-operators; company drivers generally cannot deduct unreimbursed meals.`}</Body>
        <Disclaimer />
      </Card>
      <SavedScenarios toolId="per-diem" snapshot={{ ...v, area, hos }} onLoad={(st) => { replace(pickStrings(DEFAULTS, st)); setArea(pickOneOf(asRecord(st).area, ["conus", "oconus"] as const, "conus")); setHos(pickOneOf(asRecord(st).hos, ["yes", "no"] as const, "yes")); }} />
    </CalculatorScreen>
  );
}
