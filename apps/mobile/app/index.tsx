import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TARGET, SPACING, useTheme } from "../src/theme";
import { TOOLS } from "../src/tools";

// The home screen carries no ads: it is a menu, not content (AdMob: no ads on screens without publisher content).
export default function Home() {
  const t = useTheme();
  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        contentContainerStyle={s.list}
        data={TOOLS}
        keyExtractor={(x) => x.route}
        ListHeaderComponent={<Text style={{ color: t.muted, fontSize: 15, marginBottom: SPACING.sm }}>Free calculators for owner-operators. Everything is worked out on your phone.</Text>}
        renderItem={({ item }) => (
          <Link href={item.route as never} asChild>
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}. ${item.blurb}`} style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
              <Text style={{ color: t.fg, fontWeight: "700", fontSize: 17 }}>{item.name}</Text>
              <Text style={{ color: t.muted, fontSize: 14 }}>{item.blurb}</Text>
            </Pressable>
          </Link>
        )}
        ListFooterComponent={
          <View style={{ marginTop: SPACING.lg }}>
            <Link href={"/settings" as never} asChild>
              <Pressable accessibilityRole="button" style={[s.link, { borderColor: t.line }]}><Text style={{ color: t.brand, fontWeight: "600" }}>About and privacy</Text></Pressable>
            </Link>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  list: { padding: SPACING.lg, gap: SPACING.md },
  card: { borderWidth: 1, borderRadius: 12, padding: SPACING.lg, gap: SPACING.xs, minHeight: MIN_TARGET },
  link: { borderWidth: 1, borderRadius: 8, minHeight: MIN_TARGET, paddingHorizontal: SPACING.lg, justifyContent: "center", alignSelf: "flex-start" },
});
