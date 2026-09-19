import type { ExpoConfig } from "expo/config";

/**
 * Google's published SAMPLE AdMob app id: safe for development and never earns anything.
 * A release build must set ADMOB_ANDROID_APP_ID to the real id, and the unit ids below.
 * (Ids are public identifiers, not secrets, but they differ per environment, so they come from env.)
 */
const SAMPLE_ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713";

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
    },
  },
};

export default config;
