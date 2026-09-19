import { IFTA_STATE_NAMES, IFTA_RATE_TABLES, calculateIfta, getIftaRateTable, listIftaQuarters } from "@haulnumbers/core";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { int, num, numOr0, usd } from "../lib/format";
import { CalculatorScreen } from "../ui/CalculatorScreen";
import { StatePicker } from "../ui/StatePicker";
import { Body, Button, Card, Disclaimer, ErrorList, Field, Heading, Notice, ResultRows, Segmented } from "../ui/kit";
import { SPACING, useTheme } from "../theme";

interface RowState { id: number; code: string; miles: string; exempt: string; gallons: string }
const MAX_ROWS = 48;

function defaultQuarter(): string {
  const quarters = listIftaQuarters();
  const n = new Date();
  const current = `${n.getUTCFullYear()}Q${Math.floor(n.getUTCMonth() / 3) + 1}`;
  if (quarters.includes(current)) return current;
  return IFTA_RATE_TABLES.filter((t) => t.status === "final").map((t) => t.quarter).sort().reverse()[0] ?? quarters[0] ?? "";
}

export function IftaScreen() {
  const t = useTheme();
  const quarters = listIftaQuarters();
  const [quarter, setQuarter] = useState(defaultQuarter());
  const [untaxed, setUntaxed] = useState("0");
  const [nextId, setNextId] = useState(4);
  const [rows, setRows] = useState<RowState[]>([
    { id: 1, code: "TX", miles: "6000", exempt: "0", gallons: "900" },
    { id: 2, code: "KY", miles: "2000", exempt: "0", gallons: "100" },
    { id: 3, code: "CA", miles: "2000", exempt: "0", gallons: "250" },
  ]);
  const update = (id: number, patch: Partial<RowState>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const calc = useMemo(() => {
    const used: RowState[] = [];
    const jurisdictions = rows.flatMap((r) => {
      if (r.code === "" && r.miles.trim() === "" && (r.exempt.trim() === "" || r.exempt === "0") && r.gallons.trim() === "") return [];
      used.push(r);
      return [{ code: r.code, miles: num(r.miles), exemptMiles: numOr0(r.exempt), taxPaidGallons: numOr0(r.gallons) }];
    });
    return { used, result: calculateIfta({ quarter, jurisdictions, untaxedGallons: numOr0(untaxed) }) };
  }, [rows, quarter, untaxed]);

  const messages: string[] = [];
  const badRows = new Map<number, Set<string>>();
  if (!calc.result.ok) {
    for (const e of calc.result.errors) {
      const m = /^jurisdictions\[(\d+)\]\.(\w+)$/.exec(e.field);
      const u = m ? calc.used[Number(m[1])] : undefined;
      if (m && u) {
        const pos = rows.findIndex((r) => r.id === u.id) + 1;
        const state = IFTA_STATE_NAMES[u.code];
        messages.push(`Row ${pos}${state ? ` (${state})` : ""}: ${e.message}`);
        badRows.set(u.id, (badRows.get(u.id) ?? new Set()).add(m[2] === "taxPaidGallons" ? "gallons" : (m[2] ?? "code")));
      } else messages.push((e.field === "untaxedGallons" ? "Fuel bought without tax paid: " : e.field === "quarter" ? "Quarter: " : "") + e.message);
    }
  }
  const v = calc.result.ok ? calc.result.value : null;
  const rateTable = getIftaRateTable(quarter);
  const bad = (id: number, k: string) => badRows.get(id)?.has(k) ?? false;

  return (
    <CalculatorScreen hasResult={v !== null}>
      <Card>
        <Heading>Return details</Heading>
        <Segmented label="Quarter" options={quarters.slice(0, 4).map((q) => ({ value: q, label: `${q.slice(0, 4)} Q${q.slice(5)}` }))} value={quarter} onChange={setQuarter} />
        <Field label="Fuel bought without tax paid (gallons, optional)" value={untaxed} onChangeText={setUntaxed} error={messages.some((m) => m.startsWith("Fuel bought"))} testID="in-untaxed" />
        <Heading>Miles and fuel by state</Heading>
        {rows.map((r, i) => (
          <View key={r.id} style={{ gap: SPACING.sm, borderTopWidth: 1, borderColor: t.line, paddingTop: SPACING.md }}>
            <StatePicker label={`State (row ${i + 1})`} value={r.code} onChange={(code) => update(r.id, { code })} />
            <Field label="Total miles" value={r.miles} onChangeText={(x) => update(r.id, { miles: x })} keyboardType="number-pad" error={bad(r.id, "miles")} testID={`in-miles-${i}`} />
            <Field label="Exempt miles" value={r.exempt} onChangeText={(x) => update(r.id, { exempt: x })} keyboardType="number-pad" error={bad(r.id, "exemptMiles")} testID={`in-exempt-${i}`} />
            <Field label="Gallons bought" value={r.gallons} onChangeText={(x) => update(r.id, { gallons: x })} error={bad(r.id, "gallons")} testID={`in-gallons-${i}`} />
            <Button title="Remove this state" testID={`remove-${i}`} onPress={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : rs.map((x) => (x.id === r.id ? { ...x, code: "", miles: "", exempt: "0", gallons: "" } : x))))} />
          </View>
        ))}
        {rows.length < MAX_ROWS && <Button title="Add a state" testID="add-state" onPress={() => { setRows((rs) => [...rs, { id: nextId, code: "", miles: "", exempt: "0", gallons: "" }]); setNextId((n) => n + 1); }} />}
        <Body muted>Total miles means every mile in the state, including empty miles. Exempt miles are miles that state does not tax. Gallons bought means fuel bought there with its tax in the price. Miles and gallons are rounded to whole numbers, as on the IFTA return.</Body>
      </Card>
      <Card>
        <Heading>Your estimate</Heading>
        {v?.rateStatus === "preliminary" && <Notice tone="accent">{`These ${v.quarter.slice(0, 4)} Q${v.quarter.slice(5)} rates are preliminary until ${v.rateFinalDate}. Check the official matrix again before filing.`}</Notice>}
        <ErrorList messages={messages} />
        {v && (
          <>
            <ResultRows rows={[
              ["Fleet MPG", v.fleetMpg.toFixed(2)], ["Total miles", int(v.totalMiles)], ["Total gallons", int(v.totalGallons)],
              [v.netTax < 0 ? "Net credit" : "Net tax due", usd(Math.abs(v.netTax)), true],
            ]} />
            <ScrollView horizontal>
              <View>
                {v.jurisdictions.map((j) => (
                  <View key={j.code} style={{ flexDirection: "row", gap: SPACING.md, paddingVertical: 4 }}>
                    <Text style={{ color: t.fg, width: 110 }}>{IFTA_STATE_NAMES[j.code] ?? j.code}</Text>
                    <Text style={{ color: t.muted, width: 90 }}>{`${int(j.taxableGallons)} gal`}</Text>
                    <Text style={{ color: t.muted, width: 90 }}>{`net ${int(j.netTaxableGallons)}`}</Text>
                    <Text style={{ color: t.muted, width: 120 }}>{j.surchargeRate > 0 ? `${j.baseRate.toFixed(4)}+${j.surchargeRate.toFixed(4)}` : j.baseRate.toFixed(4)}</Text>
                    <Text style={{ color: t.fg, fontWeight: "700", width: 90, textAlign: "right" }}>{usd(j.total)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            {v.warnings.map((w) => <Body key={w} muted>{w}</Body>)}
            {rateTable && v.jurisdictions.some((j) => rateTable.blankDiesel.includes(j.code)) && <Body muted>IFTA, Inc. lists no diesel rate for Oregon, so it is estimated at $0.00. Its miles still count toward fleet MPG.</Body>}
          </>
        )}
        <Body muted>{`Rates: IFTA, Inc. fuel tax matrix, retrieved ${rateTable?.retrievedAt ?? ""}. Negative amounts are credits. Interest, penalties, other fuels and Canada are not included.`}</Body>
        <Disclaimer />
      </Card>
    </CalculatorScreen>
  );
}
