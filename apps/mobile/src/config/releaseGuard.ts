/**
 * Guards production builds. For internal testing and closed testing on Google Play you may run REAL
 * builds that show Google's TEST ads (set ADMOB_USE_TEST_IDS=true). A PRODUCTION build (APP_ENV=production)
 * must have real AdMob ids and must never use test ids or the sample app id: this throws at config time.
 */
export const SAMPLE_ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const GOOGLE_TEST_PUBLISHER = "3940256099942544";
const APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const UNIT_ID = /^ca-app-pub-\d{16}\/\d{10}$/;

/** Build-time environment variables (process.env is assignable to this). */
export type AdEnv = Record<string, string | undefined>;

export function productionAdProblems(env: AdEnv): string[] {
  if (env.APP_ENV !== "production") return [];
  const problems: string[] = [];
  if (env.ADMOB_USE_TEST_IDS === "true") problems.push("ADMOB_USE_TEST_IDS must not be set for a production build");
  const checks: [string, string | undefined, RegExp][] = [
    ["ADMOB_ANDROID_APP_ID", env.ADMOB_ANDROID_APP_ID, APP_ID],
    ["ADMOB_ANDROID_BANNER_UNIT_ID", env.ADMOB_ANDROID_BANNER_UNIT_ID, UNIT_ID],
    ["ADMOB_ANDROID_INTERSTITIAL_UNIT_ID", env.ADMOB_ANDROID_INTERSTITIAL_UNIT_ID, UNIT_ID],
  ];
  for (const [name, value, re] of checks) {
    if (!value) problems.push(`${name} is required for a production build`);
    else if (!re.test(value)) problems.push(`${name} is not in the expected AdMob format`);
    else if (value.includes(GOOGLE_TEST_PUBLISHER)) problems.push(`${name} is one of Google's TEST ids; a production build needs your own`);
  }
  return problems;
}
