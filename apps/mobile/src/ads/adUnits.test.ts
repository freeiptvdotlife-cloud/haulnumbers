/** Ad unit ids: dev builds must use Google's test ids; release builds must never fall back to them. */
type Extra = { admob?: { bannerUnitId?: string; interstitialUnitId?: string } } | undefined;

function load(dev: boolean, extra: Extra) {
  const g = globalThis as unknown as { __DEV__: boolean };
  const previous = g.__DEV__;
  g.__DEV__ = dev;
  let mod: typeof import("./adUnits") | undefined;
  jest.isolateModules(() => {
    jest.doMock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { extra } } }));
    mod = require("./adUnits");
  });
  return { mod: mod!, restore: () => { g.__DEV__ = previous; } };
}

describe("ad unit ids", () => {
  it("dev builds always use the test ids, even if real ids are configured", () => {
    const { mod, restore } = load(true, { admob: { bannerUnitId: "ca-app-pub-1/real", interstitialUnitId: "ca-app-pub-1/real2" } });
    expect(mod.bannerUnitId()).toBe("test-banner");
    expect(mod.interstitialUnitId()).toBe("test-interstitial");
    restore();
  });

  it("release builds use the configured ids", () => {
    const { mod, restore } = load(false, { admob: { bannerUnitId: "ca-app-pub-1/real", interstitialUnitId: "ca-app-pub-1/real2" } });
    expect(mod.bannerUnitId()).toBe("ca-app-pub-1/real");
    expect(mod.interstitialUnitId()).toBe("ca-app-pub-1/real2");
    restore();
  });

  it("release builds fail closed: a missing id means no ad request, never a test-id fallback", () => {
    for (const extra of [undefined, {}, { admob: {} }, { admob: { bannerUnitId: "", interstitialUnitId: "" } }] as Extra[]) {
      const { mod, restore } = load(false, extra);
      expect(mod.bannerUnitId()).toBe("");
      expect(mod.interstitialUnitId()).toBe("");
      restore();
    }
  });
});
