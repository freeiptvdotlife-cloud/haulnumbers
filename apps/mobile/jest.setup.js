// Native modules and navigation are replaced with light fakes so screens can be tested without a device.
jest.mock("react-native-google-mobile-ads", () => ({
  __esModule: true,
  default: () => ({ setRequestConfiguration: jest.fn(async () => {}), initialize: jest.fn(async () => {}) }),
  AdsConsent: {
    gatherConsent: jest.fn(async () => ({ canRequestAds: false, privacyOptionsRequirementStatus: "NOT_REQUIRED" })),
    showPrivacyOptionsForm: jest.fn(async () => {}),
  },
  AdsConsentPrivacyOptionsRequirementStatus: { UNKNOWN: "UNKNOWN", REQUIRED: "REQUIRED", NOT_REQUIRED: "NOT_REQUIRED" },
  InterstitialAd: { createForAdRequest: jest.fn(() => ({ load: jest.fn(), show: jest.fn(async () => {}), addAdEventListener: jest.fn(() => () => {}) })) },
  AdEventType: { LOADED: "loaded", CLOSED: "closed", ERROR: "error" },
  BannerAd: "BannerAd",
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER" },
  TestIds: { ADAPTIVE_BANNER: "test-banner", INTERSTITIAL: "test-interstitial" },
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb) => React.useEffect(cb, []),
    Link: ({ children }) => children,
    Stack: { Screen: () => null },
  };
});

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
