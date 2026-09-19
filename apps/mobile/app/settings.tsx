import { Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAds } from "../src/ads/AdsProvider";
import { CONTACT_URL, PRIVACY_URL, TERMS_URL } from "../src/lib/links";
import { SPACING, useTheme } from "../src/theme";
import { Body, Button, Card, Heading } from "../src/ui/kit";

// No ads here: a settings/consent screen has no publisher content.
export default function Settings() {
  const t = useTheme();
  const { privacyOptionsRequired, changePrivacyChoices } = useAds();
  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}>
        <Card>
          <Heading>About</Heading>
          <Body>Haul Numbers is a set of free calculators for owner-operator truckers. Calculations run on your phone and what you type is not sent anywhere. Results are estimates, not financial, tax or legal advice.</Body>
          <Body muted>IFTA rates come from IFTA, Inc.'s published fuel tax matrix and per diem rates from the IRS notice for the current period. Each screen shows its source and date.</Body>
        </Card>
        <Card>
          <Heading>Privacy</Heading>
          <Body>The app shows ads. Where the law requires it, you are asked for consent first, and you can change your choice at any time.</Body>
          {privacyOptionsRequired && <Button title="Privacy settings" testID="privacy-settings" onPress={() => { void changePrivacyChoices(); }} />}
          <Button title="Privacy policy" onPress={() => { void Linking.openURL(PRIVACY_URL); }} />
          <Button title="Terms of use" onPress={() => { void Linking.openURL(TERMS_URL); }} />
          <Button title="Contact us" onPress={() => { void Linking.openURL(CONTACT_URL); }} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
