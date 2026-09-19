import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AdsProvider } from "../src/ads/AdsProvider";
import { useTheme } from "../src/theme";

export default function RootLayout() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <AdsProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerStyle: { backgroundColor: t.card }, headerTintColor: t.fg, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="index" options={{ title: "Haul Numbers" }} />
          <Stack.Screen name="cost-per-mile" options={{ title: "Cost per mile" }} />
          <Stack.Screen name="load-profit" options={{ title: "Load profit" }} />
          <Stack.Screen name="detention" options={{ title: "Detention pay" }} />
          <Stack.Screen name="ifta" options={{ title: "IFTA fuel tax" }} />
          <Stack.Screen name="per-diem" options={{ title: "Per diem" }} />
          <Stack.Screen name="settings" options={{ title: "About and privacy" }} />
        </Stack>
      </AdsProvider>
    </SafeAreaProvider>
  );
}
