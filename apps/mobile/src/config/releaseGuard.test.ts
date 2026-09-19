import { productionAdProblems, SAMPLE_ADMOB_APP_ID } from "./releaseGuard";

const real = {
  APP_ENV: "production",
  ADMOB_ANDROID_APP_ID: "ca-app-pub-1234567890123456~1234567890",
  ADMOB_ANDROID_BANNER_UNIT_ID: "ca-app-pub-1234567890123456/1111111111",
  ADMOB_ANDROID_INTERSTITIAL_UNIT_ID: "ca-app-pub-1234567890123456/2222222222",
};

describe("productionAdProblems", () => {
  it("does not restrict development or testing builds (no APP_ENV, or another value)", () => {
    expect(productionAdProblems({})).toEqual([]);
    expect(productionAdProblems({ APP_ENV: "internal", ADMOB_USE_TEST_IDS: "true" })).toEqual([]);
  });

  it("accepts a production build with real ids", () => {
    expect(productionAdProblems(real)).toEqual([]);
  });

  it("rejects test ids being switched on in production", () => {
    expect(productionAdProblems({ ...real, ADMOB_USE_TEST_IDS: "true" })).toEqual(["ADMOB_USE_TEST_IDS must not be set for a production build"]);
  });

  it("rejects missing ids", () => {
    expect(productionAdProblems({ APP_ENV: "production" })).toHaveLength(3);
  });

  it("rejects Google's sample app id and test unit ids", () => {
    const p = productionAdProblems({ ...real, ADMOB_ANDROID_APP_ID: SAMPLE_ADMOB_APP_ID, ADMOB_ANDROID_BANNER_UNIT_ID: "ca-app-pub-3940256099942544/9214589741" });
    expect(p).toHaveLength(2);
    expect(p.join(" ")).toMatch(/TEST ids/);
  });

  it("rejects malformed ids", () => {
    expect(productionAdProblems({ ...real, ADMOB_ANDROID_BANNER_UNIT_ID: "banner-1" })).toEqual(["ADMOB_ANDROID_BANNER_UNIT_ID is not in the expected AdMob format"]);
    expect(productionAdProblems({ ...real, ADMOB_ANDROID_APP_ID: "ca-app-pub-1234567890123456/1234567890" })).toHaveLength(1);
  });
});
