import { calculateDetention, minutesBetween, type BillingIncrement } from "@haulnumbers/core";
import { useMemo, useState } from "react";
import { num, numOr0, usd } from "../lib/format";
import { useForm } from "../lib/useForm";
import { CalculatorScreen } from "../ui/CalculatorScreen";
import { Body, Card, Disclaimer, ErrorList, Field, Heading, Notice, ResultRows, Segmented, type Row } from "../ui/kit";

const LABELS: Record<string, string> = {
  pickupArrival: "Pickup arrival (HH:MM, 24 h)", pickupDeparture: "Pickup departure (HH:MM, 24 h)", pickupDays: "Pickup days later",
  deliveryArrival: "Delivery arrival (HH:MM, 24 h)", deliveryDeparture: "Delivery departure (HH:MM, 24 h)", deliveryDays: "Delivery days later",
  freeMinutes: "Free time per stop (minutes)", hourlyRate: "Detention rate per hour (USD)", layoverDays: "Layover days", layoverRatePerDay: "Layover rate per day (USD)",
  billingIncrement: "Billing blocks",
};
const CORE_TO_INPUT: Record<string, string> = { arrival: "Arrival", departure: "Departure", extraDays: "Days" };
const STOPS = [{ key: "pickup", name: "Pickup" }, { key: "delivery", name: "Delivery" }] as const;
const BLOCKS = [{ value: "0", label: "Exact" }, { value: "15", label: "15 min" }, { value: "30", label: "30 min" }, { value: "60", label: "Started hour" }] as const;

const dur = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h === 0 ? `${r} min` : r === 0 ? `${h} h` : `${h} h ${r} min`; };

// Note: this stop-assembly logic mirrors apps/web/src/pages/detention-pay-calculator.astro. Keep them in step
// (a candidate to move into core so there is a single copy).
export function DetentionScreen() {
  const { v, set } = useForm({
    pickupArrival: "08:00", pickupDeparture: "11:15", pickupDays: "0", deliveryArrival: "", deliveryDeparture: "", deliveryDays: "0",
    freeMinutes: "120", hourlyRate: "50", layoverDays: "0", layoverRatePerDay: "0",
  });
  const [block, setBlock] = useState<"0" | "15" | "30" | "60">("60");

  const out = useMemo(() => {
    const problems: { input: string; message: string }[] = [];
    const used: { name: string; key: string; minutes: number }[] = [];
    const text = (k: string) => (v as Record<string, string>)[k]!.trim();
    for (const s of STOPS) {
      const arr = text(`${s.key}Arrival`), dep = text(`${s.key}Departure`);
      if (arr === "" && dep === "") continue;
      if (arr === "" || dep === "") { problems.push({ input: `${s.key}${arr === "" ? "Arrival" : "Departure"}`, message: "Enter both arrival and departure, or leave both blank to skip this stop." }); continue; }
      const t = minutesBetween(arr, dep, num(text(`${s.key}Days`)));
      if (!t.ok) { for (const e of t.errors) problems.push({ input: `${s.key}${CORE_TO_INPUT[e.field] ?? "Arrival"}`, message: e.message }); continue; }
      used.push({ name: s.name, key: s.key, minutes: t.value });
    }
    if (used.length === 0 && problems.length === 0) problems.push({ input: "pickupArrival", message: "Enter arrival and departure times for at least one stop." });
    const r = problems.length > 0 ? null : calculateDetention({
      stops: used.map((u) => ({ minutesOnSite: u.minutes })), freeMinutes: num(v.freeMinutes), hourlyRate: num(v.hourlyRate),
      billingIncrement: Number(block) as BillingIncrement, layoverDays: num(v.layoverDays), layoverRatePerDay: num(v.layoverRatePerDay),
    });
    if (r && !r.ok) for (const e of r.errors) {
      const m = /^stops\[(\d+)\]/.exec(e.field);
      const stop = m ? used[Number(m[1])] : undefined;
      problems.push({ input: stop ? `${stop.key}Days` : e.field, message: e.message });
    }
    return { problems, used, result: r && r.ok ? r.value : null };
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
    </CalculatorScreen>
  );
}
