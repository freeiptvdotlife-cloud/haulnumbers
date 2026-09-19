import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { MIN_TARGET, SPACING, useTheme } from "../theme";

export function Card({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>{children}</View>;
}

export function Heading({ children }: { children: string }) {
  const t = useTheme();
  return <Text accessibilityRole="header" style={[s.heading, { color: t.fg }]}>{children}</Text>;
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  const t = useTheme();
  return <Text style={{ color: muted ? t.muted : t.fg, fontSize: 15, lineHeight: 22 }}>{children}</Text>;
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: KeyboardTypeOptions;
  error?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  testID?: string;
  placeholder?: string;
}
export function Field({ label, value, onChangeText, keyboardType = "decimal-pad", error, onFocus, onBlur, testID, placeholder }: FieldProps) {
  const t = useTheme();
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: t.muted }]}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[s.input, { color: t.fg, backgroundColor: t.bg, borderColor: error ? t.bad : t.line }]}
      />
    </View>
  );
}

/** A row of mutually exclusive choices (billing block, area, quarter...). */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: t.muted }]}>{label}</Text>
      <View style={s.segRow} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.label} onPress={() => onChange(o.value)}
              style={[s.seg, { borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brand : t.bg }]}>
              <Text style={{ color: on ? t.bg : t.fg, fontWeight: "600" }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Button({ title, onPress, testID }: { title: string; onPress: () => void; testID?: string }) {
  const t = useTheme();
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={[s.button, { borderColor: t.line, backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontWeight: "600" }}>{title}</Text>
    </Pressable>
  );
}

export type Row = [label: string, value: string, big?: boolean];

export function ResultRows({ rows }: { rows: Row[] }) {
  const t = useTheme();
  return (
    <View accessibilityLiveRegion="polite">
      {rows.map(([label, value, big]) => (
        <View key={label} style={s.row}>
          <Text style={{ color: t.muted, flexShrink: 1, fontSize: 15 }}>{label}</Text>
          <Text testID={`row-${label}`} style={{ color: big ? t.brand : t.fg, fontWeight: "700", fontSize: big ? 22 : 15, fontVariant: ["tabular-nums"] }}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export function ErrorList({ messages }: { messages: string[] }) {
  const t = useTheme();
  if (messages.length === 0) return null;
  return (
    <View accessibilityLiveRegion="polite" testID="errors">
      <Text style={{ color: t.bad, fontWeight: "700" }}>Please check your entries.</Text>
      {messages.map((m) => <Text key={m} style={{ color: t.bad }}>{m}</Text>)}
    </View>
  );
}

export function Notice({ children, tone = "line" }: { children: ReactNode; tone?: "line" | "accent" | "brand" | "bad" }) {
  const t = useTheme();
  return <View style={[s.notice, { borderColor: t[tone] }]}><Text style={{ color: t.fg, fontWeight: "600" }}>{children}</Text></View>;
}

export function Disclaimer() {
  const t = useTheme();
  return <Text style={{ color: t.muted, fontSize: 12, marginTop: SPACING.sm }}>Estimate only, not financial, tax or legal advice. Check your own figures and contracts before relying on it.</Text>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: SPACING.lg, gap: SPACING.md },
  heading: { fontSize: 18, fontWeight: "700", marginTop: SPACING.sm },
  field: { gap: SPACING.xs },
  label: { fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.md, minHeight: MIN_TARGET, fontSize: 16 },
  segRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  seg: { borderWidth: 1, borderRadius: 8, minHeight: MIN_TARGET, paddingHorizontal: SPACING.md, alignItems: "center", justifyContent: "center" },
  button: { borderWidth: 1, borderRadius: 8, minHeight: MIN_TARGET, paddingHorizontal: SPACING.lg, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACING.md, paddingVertical: 4 },
  notice: { borderWidth: 2, borderRadius: 8, padding: SPACING.md },
});
