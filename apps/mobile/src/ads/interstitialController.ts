import { InterstitialPolicy, type Decision } from "./interstitialPolicy";

/** The small part of an interstitial ad we use, so the real SDK object can be swapped for a fake in tests. */
export interface InterstitialHandle {
  load(): void;
  show(): void;
  onLoaded(cb: () => void): () => void;
  onClosed(cb: () => void): () => void;
  onError(cb: () => void): () => void;
}

/**
 * Keeps one interstitial pre-loaded (so it never appears late) and asks the policy before showing it.
 * There is no retry loop: after a load error the ad is reloaded lazily on the next qualifying leave.
 */
export class InterstitialController {
  private handle: InterstitialHandle | null = null;
  private ready = false;
  private unsubs: (() => void)[] = [];

  constructor(
    private readonly create: () => InterstitialHandle,
    private readonly policy: InterstitialPolicy,
  ) {}

  /** Start pre-loading. Call only after ad consent allows it. */
  start(): void {
    if (this.handle) return;
    this.load();
  }

  stop(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.handle = null;
    this.ready = false;
  }

  get isReady(): boolean {
    return this.ready;
  }

  onCalculatorLeave(ctx: { hasViewedResult: boolean; fieldFocused: boolean; adsAllowed: boolean }): Decision {
    const decision = this.policy.onCalculatorLeave({ ...ctx, adReady: this.ready });
    if (decision.show && this.handle) {
      this.ready = false;
      this.handle.show();
    } else if (!this.ready && ctx.adsAllowed && this.handle === null) {
      this.load(); // recover lazily after an error
    }
    return decision;
  }

  private load(): void {
    this.stop();
    const h = this.create();
    this.handle = h;
    this.unsubs = [
      h.onLoaded(() => { this.ready = true; }),
      h.onClosed(() => { this.ready = false; this.load(); }), // pre-load the next one
      h.onError(() => { this.ready = false; this.stop(); }), // no hot retry loop
    ];
    h.load();
  }
}
