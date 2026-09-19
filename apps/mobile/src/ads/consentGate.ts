/**
 * Consent comes first. The ads SDK is not configured or initialised, and no ad is requested, until
 * the consent flow says ads may be requested. Any failure fails CLOSED (no ads).
 */
export interface ConsentState {
  canRequestAds: boolean;
  /** True when the user must be offered a way to change their privacy choices later. */
  privacyOptionsRequired: boolean;
}

export interface ConsentGateway {
  /** Refresh consent info and show the consent form when one is required. */
  gatherConsent(): Promise<ConsentState>;
  showPrivacyOptions(): Promise<void>;
}

export interface AdsSdk {
  /** Request configuration (content rating, child-directed flags, test devices). Runs before initialize. */
  configure(): Promise<void>;
  initialize(): Promise<void>;
}

export interface AdsStartResult {
  adsAllowed: boolean;
  privacyOptionsRequired: boolean;
}

export async function startAds(consent: ConsentGateway, sdk: AdsSdk): Promise<AdsStartResult> {
  let state: ConsentState;
  try {
    state = await consent.gatherConsent();
  } catch {
    return { adsAllowed: false, privacyOptionsRequired: false };
  }
  if (!state.canRequestAds) return { adsAllowed: false, privacyOptionsRequired: state.privacyOptionsRequired };
  try {
    await sdk.configure();
    await sdk.initialize();
  } catch {
    return { adsAllowed: false, privacyOptionsRequired: state.privacyOptionsRequired };
  }
  return { adsAllowed: true, privacyOptionsRequired: state.privacyOptionsRequired };
}

/** Let the user change their choice, then re-evaluate: withdrawing consent switches ads off. */
export async function changePrivacyChoices(consent: ConsentGateway, sdk: AdsSdk): Promise<AdsStartResult> {
  try {
    await consent.showPrivacyOptions();
  } catch {
    /* fall through: re-evaluate below either way */
  }
  return startAds(consent, sdk);
}
