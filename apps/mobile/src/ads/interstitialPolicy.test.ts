import { DEFAULT_INTERSTITIAL_CONFIG, InterstitialPolicy, type LeaveContext } from "./interstitialPolicy";

const cfg = { minMsSinceSessionStart: 60_000, minMsBetweenAds: 180_000, minQualifyingLeavesBetweenAds: 3 };
const good: LeaveContext = { hasViewedResult: true, fieldFocused: false, adsAllowed: true, adReady: true };

function setup() {
  let t = 1_000_000;
  const policy = new InterstitialPolicy(cfg, () => t);
  return { policy, advance: (ms: number) => { t += ms; } };
}
/** Fast-forward past the session-age gate and build up the required qualifying leaves. */
function primed() {
  const s = setup();
  s.advance(cfg.minMsSinceSessionStart + 1);
  s.policy.onCalculatorLeave(good);
  s.policy.onCalculatorLeave(good);
  return s;
}

describe("InterstitialPolicy: what it must never allow", () => {
  it("never shows when the user has not seen a result", () => {
    const { policy, advance } = setup();
    advance(10 * 60_000);
    expect(policy.onCalculatorLeave({ ...good, hasViewedResult: false })).toEqual({ show: false, reason: "no-result-viewed" });
  });

  it("never shows while a field is focused (the user is mid-task, e.g. filling out a form)", () => {
    const { policy } = primed();
    expect(policy.onCalculatorLeave({ ...good, fieldFocused: true })).toEqual({ show: false, reason: "field-focused" });
  });

  it("never shows without ad consent", () => {
    const { policy } = primed();
    expect(policy.onCalculatorLeave({ ...good, adsAllowed: false })).toEqual({ show: false, reason: "no-consent" });
  });

  it("never shows an ad that is not already loaded", () => {
    const { policy } = primed();
    expect(policy.onCalculatorLeave({ ...good, adReady: false })).toEqual({ show: false, reason: "ad-not-ready" });
  });

  it("never shows in the first minute of a session", () => {
    const { policy, advance } = setup();
    policy.onCalculatorLeave(good);
    policy.onCalculatorLeave(good);
    advance(cfg.minMsSinceSessionStart - 1);
    expect(policy.onCalculatorLeave(good)).toEqual({ show: false, reason: "session-too-young" });
  });

  it("does not show after every action: needs several qualifying leaves", () => {
    const { policy, advance } = setup();
    advance(cfg.minMsSinceSessionStart + 1);
    expect(policy.onCalculatorLeave(good)).toEqual({ show: false, reason: "not-enough-leaves" });
    expect(policy.onCalculatorLeave(good)).toEqual({ show: false, reason: "not-enough-leaves" });
    expect(policy.onCalculatorLeave(good)).toEqual({ show: true });
  });

  it("enforces a minimum time between ads and starts the count again", () => {
    const { policy, advance } = primed();
    expect(policy.onCalculatorLeave(good)).toEqual({ show: true });
    advance(1000);
    for (let i = 0; i < 5; i++) expect(policy.onCalculatorLeave(good)).toEqual({ show: false, reason: "too-soon" });
    advance(cfg.minMsBetweenAds);
    expect(policy.onCalculatorLeave(good)).toEqual({ show: true });
  });

  it("needs fresh qualifying leaves after an ad, not just elapsed time", () => {
    const { policy, advance } = primed();
    policy.onCalculatorLeave(good); // shown
    advance(cfg.minMsBetweenAds + 1);
    expect(policy.onCalculatorLeave(good)).toEqual({ show: false, reason: "not-enough-leaves" });
  });

  it("does not count leaves that were suppressed for being mid-task or without a result", () => {
    const { policy, advance } = setup();
    advance(cfg.minMsSinceSessionStart + 1);
    for (let i = 0; i < 10; i++) policy.onCalculatorLeave({ ...good, fieldFocused: true });
    for (let i = 0; i < 10; i++) policy.onCalculatorLeave({ ...good, hasViewedResult: false });
    for (let i = 0; i < 10; i++) policy.onCalculatorLeave({ ...good, adsAllowed: false });
    expect(policy.onCalculatorLeave(good)).toEqual({ show: false, reason: "not-enough-leaves" });
  });
});

describe("InterstitialPolicy: structure", () => {
  it("has exactly one trigger, leaving a calculator screen: no launch, exit, timer or per-action hooks", () => {
    // If you add a method here you are adding a new way to show an interstitial. Re-read docs/05
    // (AdMob rules) first, then update this list on purpose.
    const methods = Object.getOwnPropertyNames(InterstitialPolicy.prototype).sort();
    expect(methods).toEqual(["constructor", "onCalculatorLeave"]);
  });

  it("ships conservative defaults", () => {
    expect(DEFAULT_INTERSTITIAL_CONFIG.minMsSinceSessionStart).toBeGreaterThanOrEqual(60_000);
    expect(DEFAULT_INTERSTITIAL_CONFIG.minMsBetweenAds).toBeGreaterThanOrEqual(120_000);
    expect(DEFAULT_INTERSTITIAL_CONFIG.minQualifyingLeavesBetweenAds).toBeGreaterThanOrEqual(3);
  });
});
