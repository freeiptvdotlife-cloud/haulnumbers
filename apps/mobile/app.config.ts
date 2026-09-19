import type { ExpoConfig } from "expo/config";
import { SAMPLE_ADMOB_APP_ID, productionAdProblems } from "./src/config/releaseGuard.ts";

/**
 * Ads configuration by build kind (ids are public identifiers, not secrets, but differ per environment):
 *  - development: Google's TEST ids, sample app id (never earns anything).
 *  - testing on Google Play (internal/closed): a real build with ADMOB_USE_TEST_IDS=true, so it shows test ads.
 *  - production (APP_ENV=production): real ids REQUIRED; test ids or the sample app id make this file throw.
 */
const adProblems = productionAdProblems(process.env);
if (adProblems.length > 0) throw new Error("Production ad configuration is invalid:\n - " + adProblems.join("\n - "));

const config: ExpoConfig = {
  name: "Haul Numbers",
  slug: "haul-numbers",
  version: "0.1.0",
  orientation: "default",
  userInterfaceStyle: "automatic",
  android: {
    package: "com.haulnumbers.app",
    versionCode: 1,
    // A calculator needs none of these; every permission widens the Play data-safety declaration.
    blockedPermissions: [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.VIBRATE",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
    // Nothing worth backing up: no accounts, no stored user data.
    allowBackup: false,
  },
  plugins: [
    "expo-router",
    "expo-status-bar",
    ["react-native-google-mobile-ads", { androidAppId: process.env.ADMOB_ANDROID_APP_ID ?? SAMPLE_ADMOB_APP_ID }],
    // Google Play requires new apps and updates to target Android 16 (API 36) since 2026-08-31 (docs/05).
    ["expo-build-properties", { android: { compileSdkVersion: 36, targetSdkVersion: 36 } }],
  ],
  extra: {
    admob: {
      bannerUnitId: process.env.ADMOB_ANDROID_BANNER_UNIT_ID ?? "",
      interstitialUnitId: process.env.ADMOB_ANDROID_INTERSTITIAL_UNIT_ID ?? "",
      useTestIds: process.env.ADMOB_USE_TEST_IDS === "true",
    },
  },
};

export default config;
