import { calculateDetentionFromTimes, type BillingIncrement } from "@haulnumbers/core";
import { useMemo, useState } from "react";
import { num, usd } from "../lib/format";
import { useForm } from "../lib/useForm";
import { SavedScenarios } from "../ui/SavedScenarios";
import { pickOneOf, pickStrings, asRecord } from "../scenarios/snapshot";
import { CalculatorScreen } from "../ui/CalculatorScreen";
import { Body, Card, Disclaimer, ErrorList, Field, Heading, Notice, ResultRows, Segmented, type Row } from "../ui/kit";

const LABELS: Record<string, string> = {
  pickupArrival: "Pickup arrival (HH:MM, 24 h)", pickupDeparture: "Pickup departure (HH:MM, 24 h)", pickupDays: "Pickup days later",
  deliveryArrival: "Delivery arrival (HH:MM, 24 h)", deliveryDeparture: "Delivery departure (HH:MM, 24 h)", deliveryDays: "Delivery days later",
  freeMinutes: "Free time per stop (minutes)", hourlyRate: "Detention rate per hour (USD)", layoverDays: "Layover days", layoverRatePerDay: "Layover rate per day (USD)",
  billingIncrement: "Billing blocks",
};
const STOPS = [{ key: "pickup", name: "Pickup" }, { key: "delivery", name: "Delivery" }] as const;
const BLOCKS = [{ value: "0", label: "Exact" }, { value: "15", label: "15 min" }, { value: "30", label: "30 min" }, { value: "60", label: "Started hour" }] as const;

const dur = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h === 0 ? `${r} min` : r === 0 ? `${h} h` : `${h} h ${r} min`; };

const DEFAULTS = {
    pickupArrival: "08:00", pickupDeparture: "11:15", pickupDays: "0", deliveryArrival: "", deliveryDeparture: "", deliveryDays: "0",
    freeMinutes: "120", hourlyRate: "50", layoverDays: "0", layoverRatePerDay: "0",
  };

export function DetentionScreen() {
  const { v, set, replace } = useForm(DEFAULTS);
  const [block, setBlock] = useState<"0" | "15" | "30" | "60">("60");

  const out = useMemo(() => {
    const r = calculateDetentionFromTimes({
      stops: STOPS.map((s) => ({
        key: s.key, name: s.name,
        arrival: (v as Record<string, string>)[`${s.key}Arrival`]!, departure: (v as Record<string, string>)[`${s.key}Departure`]!,
        extraDays: num((v as Record<string, string>)[`${s.key}Days`]!),
      })),
      freeMinutes: num(v.freeMinutes), hourlyRate: num(v.hourlyRate),
      billingIncrement: Number(block) as BillingIncrement, layoverDays: num(v.layoverDays), layoverRatePerDay: num(v.layoverRatePerDay),
    });
    // Core reports stop problems as (stopKey, field); the inputs are named pickupArrival etc.
    const inputName = (p: { stopKey: string | null; field: string }) => (p.stopKey ? p.stopKey + p.field.charAt(0).toUpperCase() + p.field.slice(1) : p.field);
    return r.ok
      ? { problems: [] as { input: string; message: string }[], used: r.used, result: r.value }
      : { problems: r.problems.map((p) => ({ input: inputName(p), message: p.message })), used: [], result: null };
  }, [v, block]);

  const bad = new Set(out.problems.map((p) => p.input));
  const messages = out.problems.map((p) => `${LABELS[p.input] ?? p.input}: ${p.message}`);
  const f = (k: keyof typeof v, kb: "decimal-pad" | "number-pad" | "numbers-and-punctuation" = "number-pad") =>
    ({ label: LABELS[k] ?? k, value: v[k], onChangeText: set(k), error: bad.has(k), testID: `in-${k}`, keyboardType: kb });

  const rows: Row[] = [];
  if (out.result) {
    out.result.stops.forEach((s, i) => {
      const name = out.used[i]?.name ?? `Stop ${i + 1}`;
      rows.push([`${name}: time on site`, dur(s.minutesOnSite)], [`${name}: billable time`, dur(s.billableMinutes)], [`${name}: detention pay`, usd(s.pay)]);
    });
    rows.push(["Total detention pay", usd(out.result.detentionPay), true], ["Layover pay", usd(out.result.layoverPay)], ["Total owed", usd(out.result.totalPay), true]);
  }

  return (
    <CalculatorScreen hasResult={out.result !== null}>
      <Card>
        <Heading>Pickup (leave blank if none)</Heading>
        <Field {...f("pickupArrival", "numbers-and-punctuation")} placeholder="08:00" /><Field {...f("pickupDeparture", "numbers-and-punctuation")} placeholder="11:15" /><Field {...f("pickupDays")} />
        <Heading>Delivery (leave blank if none)</Heading>
        <Field {...f("deliveryArrival", "numbers-and-punctuation")} placeholder="13:00" /><Field {...f("deliveryDeparture", "numbers-and-punctuation")} placeholder="14:00" /><Field {...f("deliveryDays")} />
        <Body muted>Use “days later” only when you stayed a full day or more. A departure earlier than the arrival is treated as after midnight.</Body>
        <Heading>Terms from your rate confirmation</Heading>
        <Field {...f("freeMinutes")} /><Field {...f("hourlyRate", "decimal-pad")} />
        <Segmented label={LABELS.billingIncrement ?? ""} options={BLOCKS} value={block} onChange={setBlock} />
        <Heading>Layover (optional)</Heading>
        <Field {...f("layoverDays")} /><Field {...f("layoverRatePerDay", "decimal-pad")} />
      </Card>
      <Card>
        <Heading>Your results</Heading>
        {out.result && out.result.totalPay === 0 && <Notice>No detention pay: time on site stayed within the free time.</Notice>}
        <ErrorList messages={messages} />
        {out.result && <ResultRows rows={rows} />}
        <Disclaimer />
      </Card>
      <SavedScenarios toolId="detention" snapshot={{ ...v, block }} onLoad={(st) => { replace(pickStrings(DEFAULTS, st)); setBlock(pickOneOf(asRecord(st).block, ["0", "15", "30", "60"] as const, "60")); }} />
    </CalculatorScreen>
  );
}
