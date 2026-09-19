import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
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
  return (
    <SafeAreaView edges={["bottom"]} style={[s.fill, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        <View>
          <AdBanner />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xl },
});
