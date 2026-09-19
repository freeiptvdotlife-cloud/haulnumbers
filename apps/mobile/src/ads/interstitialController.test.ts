import { InterstitialController, type InterstitialHandle } from "./interstitialController";
import { InterstitialPolicy } from "./interstitialPolicy";

const cfg = { minMsSinceSessionStart: 0, minMsBetweenAds: 0, minQualifyingLeavesBetweenAds: 1 };
const ctx = { hasViewedResult: true, fieldFocused: false, adsAllowed: true };

class FakeAd implements InterstitialHandle {
  loads = 0; shows = 0;
  private cbs: Record<"loaded" | "closed" | "error", (() => void)[]> = { loaded: [], closed: [], error: [] };
  load() { this.loads++; }
  show() { this.shows++; }
  onLoaded(cb: () => void) { this.cbs.loaded.push(cb); return () => { this.cbs.loaded = this.cbs.loaded.filter((c) => c !== cb); }; }
  onClosed(cb: () => void) { this.cbs.closed.push(cb); return () => { this.cbs.closed = this.cbs.closed.filter((c) => c !== cb); }; }
  onError(cb: () => void) { this.cbs.error.push(cb); return () => { this.cbs.error = this.cbs.error.filter((c) => c !== cb); }; }
  fire(e: "loaded" | "closed" | "error") { [...this.cbs[e]].forEach((c) => c()); }
}
function setup() {
  const ads: FakeAd[] = [];
  const controller = new InterstitialController(() => { const a = new FakeAd(); ads.push(a); return a; }, new InterstitialPolicy(cfg, () => 0));
  return { controller, ads };
}

describe("InterstitialController", () => {
  it("does nothing until started (no ad is created before consent allows it)", () => {
    const { controller, ads } = setup();
    controller.onCalculatorLeave({ ...ctx, adsAllowed: false });
    expect(ads).toHaveLength(0);
  });

  it("pre-loads on start and shows only once the ad has loaded", () => {
    const { controller, ads } = setup();
    controller.start();
    expect(ads[0]!.loads).toBe(1);
    expect(controller.onCalculatorLeave(ctx)).toEqual({ show: false, reason: "ad-not-ready" });
    expect(ads[0]!.shows).toBe(0);
    ads[0]!.fire("loaded");
    expect(controller.onCalculatorLeave(ctx)).toEqual({ show: true });
    expect(ads[0]!.shows).toBe(1);
  });

  it("pre-loads the next ad after one is closed, and never shows the same ad twice", () => {
    const { controller, ads } = setup();
    controller.start();
    ads[0]!.fire("loaded");
    controller.onCalculatorLeave(ctx);
    ads[0]!.fire("closed");
    expect(ads).toHaveLength(2);
    expect(ads[1]!.loads).toBe(1);
    expect(controller.isReady).toBe(false);
    expect(controller.onCalculatorLeave(ctx).show).toBe(false);
    expect(ads[0]!.shows).toBe(1);
  });

  it("does not retry in a hot loop after a load error, and recovers lazily on the next leave", () => {
    const { controller, ads } = setup();
    controller.start();
    ads[0]!.fire("error");
    expect(ads).toHaveLength(1);
    controller.onCalculatorLeave(ctx);
    expect(ads).toHaveLength(2);
  });

  it("does not create a new ad on leave when consent is off", () => {
    const { controller, ads } = setup();
    controller.start();
    ads[0]!.fire("error");
    controller.onCalculatorLeave({ ...ctx, adsAllowed: false });
    expect(ads).toHaveLength(1);
  });

  it("stop() detaches listeners and forgets the ad", () => {
    const { controller, ads } = setup();
    controller.start();
    controller.stop();
    ads[0]!.fire("loaded");
    expect(controller.isReady).toBe(false);
  });

  it("start() twice does not create two ads", () => {
    const { controller, ads } = setup();
    controller.start();
    controller.start();
    expect(ads).toHaveLength(1);
  });
});
