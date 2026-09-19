/**
 * When an interstitial may be shown. This encodes the AdMob rules recorded in docs/05:
 *  - only at a logical break between screens: the ONLY entry point is leaving a calculator screen,
 *    so there is deliberately no way to trigger one on app launch, on exit, or on a timer;
 *  - never while the user is focused on a task (a field is focused / the keyboard is up);
 *  - never before the user has actually seen a result on the screen they are leaving;
 *  - never without ad consent, never with an ad that is not already loaded (no late pop-ups);
 *  - conservative frequency: not in the first minute, not more than once per interval, and only
 *    every few qualifying screen changes, never after every action.
 * Changing these numbers is a product decision; changing the shape of this class needs the
 * structural test in interstitialPolicy.test.ts to be updated on purpose.
 */
export interface InterstitialConfig {
  minMsSinceSessionStart: number;
  minMsBetweenAds: number;
  minQualifyingLeavesBetweenAds: number;
}

export const DEFAULT_INTERSTITIAL_CONFIG: InterstitialConfig = {
  minMsSinceSessionStart: 60_000,
  minMsBetweenAds: 180_000,
  minQualifyingLeavesBetweenAds: 3,
};

export interface LeaveContext {
  /** The user saw a valid result on the screen being left. */
  hasViewedResult: boolean;
  /** A text field is focused (keyboard up), i.e. the user is mid-task. */
  fieldFocused: boolean;
  /** Ad consent allows requesting ads. */
  adsAllowed: boolean;
  /** An interstitial is already loaded and ready to show instantly. */
  adReady: boolean;
}

export type SuppressReason =
  | "no-result-viewed"
  | "field-focused"
  | "no-consent"
  | "ad-not-ready"
  | "session-too-young"
  | "too-soon"
  | "not-enough-leaves";

export type Decision = { show: true } | { show: false; reason: SuppressReason };

export class InterstitialPolicy {
  private lastShownAt: number | null = null;
  private leavesSinceShown = 0;
  private readonly sessionStartedAt: number;

  constructor(
    private readonly config: InterstitialConfig = DEFAULT_INTERSTITIAL_CONFIG,
    private readonly now: () => number = Date.now,
  ) {
    this.sessionStartedAt = now();
  }

  /** Call when the user leaves a calculator screen. Returns whether to show an interstitial now. */
  onCalculatorLeave(ctx: LeaveContext): Decision {
    if (!ctx.hasViewedResult) return { show: false, reason: "no-result-viewed" };
    if (ctx.fieldFocused) return { show: false, reason: "field-focused" };
    if (!ctx.adsAllowed) return { show: false, reason: "no-consent" };

    this.leavesSinceShown += 1; // a qualifying screen change
    const t = this.now();
    if (!ctx.adReady) return { show: false, reason: "ad-not-ready" };
    if (t - this.sessionStartedAt < this.config.minMsSinceSessionStart) return { show: false, reason: "session-too-young" };
    if (this.lastShownAt !== null && t - this.lastShownAt < this.config.minMsBetweenAds) return { show: false, reason: "too-soon" };
    if (this.leavesSinceShown < this.config.minQualifyingLeavesBetweenAds) return { show: false, reason: "not-enough-leaves" };

    this.lastShownAt = t;
    this.leavesSinceShown = 0;
    return { show: true };
  }
}
