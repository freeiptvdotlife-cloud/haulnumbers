import { IFTA_STATE_NAMES } from "@haulnumbers/core";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TARGET, SPACING, useTheme } from "../theme";

const STATES = Object.entries(IFTA_STATE_NAMES).sort((a, b) => a[1].localeCompare(b[1]));

/** A tap-to-open list of the 48 IFTA states (no extra native picker dependency). */
export function StatePicker({ value, onChange, label }: { value: string; onChange: (code: string) => void; label: string }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={s.wrap}>
      <Text style={{ color: t.muted, fontSize: 14 }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${IFTA_STATE_NAMES[value] ?? "not chosen"}`} onPress={() => setOpen(true)}
        style={[s.button, { borderColor: t.line, backgroundColor: t.bg }]}>
        <Text style={{ color: t.fg, fontSize: 16 }}>{IFTA_STATE_NAMES[value] ?? "Choose state"}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={s.close}><Text style={{ color: t.brand, fontWeight: "700" }}>Close</Text></Pressable>
          <FlatList
            data={STATES}
            keyExtractor={([code]) => code}
            renderItem={({ item: [code, name] }) => (
              <Pressable accessibilityRole="button" accessibilityState={{ selected: code === value }} onPress={() => { onChange(code); setOpen(false); }}
                style={[s.item, { borderColor: t.line, backgroundColor: code === value ? t.card : t.bg }]}>
                <Text style={{ color: t.fg, fontSize: 16, fontWeight: code === value ? "700" : "400" }}>{name}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: SPACING.xs },
  button: { borderWidth: 1, borderRadius: 8, minHeight: MIN_TARGET, paddingHorizontal: SPACING.md, justifyContent: "center" },
  close: { minHeight: MIN_TARGET, justifyContent: "center", alignItems: "flex-end", paddingHorizontal: SPACING.lg },
  item: { minHeight: MIN_TARGET, justifyContent: "center", paddingHorizontal: SPACING.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});
