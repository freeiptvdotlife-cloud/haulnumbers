import { Children, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdBanner } from "../ads/AdBanner";
import { useLeaveInterstitial } from "../ads/useLeaveInterstitial";
import { SPACING, useTheme } from "../theme";

/**
 * Shared frame for every calculator screen.
 * Ads live ONLY here (calculator screens have real content): the banner is docked below the
 * scroll area so it never overlaps an input or result, and the interstitial hook fires only when
 * the user leaves the screen after seeing a result.
 */
export function CalculatorScreen({ children, hasResult }: { children: ReactNode; hasResult: boolean }) {
  const t = useTheme();
  useLeaveInterstitial(hasResult);
  // Tablets and landscape phones: inputs on the left, results and saved scenarios on the right.
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT;
  const kids = Children.toArray(children);
  return (
    <SafeAreaView edges={["bottom"]} style={[s.fill, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[s.content, wide && s.contentWide]} keyboardShouldPersistTaps="handled">
          {wide ? (
            <View style={s.row} testID="wide-layout">
              <View style={s.col}>{kids[0]}</View>
              <View style={s.col}>{kids.slice(1)}</View>
            </View>
          ) : (
            kids
          )}
        </ScrollView>
        <View>
          <AdBanner />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** dp width from which the two-column layout is used. */
export const WIDE_BREAKPOINT = 720;

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xl },
  contentWide: { maxWidth: 1200, width: "100%", alignSelf: "center" },
  row: { flexDirection: "row", gap: SPACING.lg, alignItems: "flex-start" },
  col: { flex: 1, gap: SPACING.lg },
});
