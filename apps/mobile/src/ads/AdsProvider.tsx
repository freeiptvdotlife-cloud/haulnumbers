import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import mobileAds, { AdEventType, AdsConsent, AdsConsentPrivacyOptionsRequirementStatus, InterstitialAd } from "react-native-google-mobile-ads";
import { interstitialUnitId } from "./adUnits";
import { changePrivacyChoices, startAds, type AdsSdk, type ConsentGateway } from "./consentGate";
import { InterstitialController, type InterstitialHandle } from "./interstitialController";
import { InterstitialPolicy } from "./interstitialPolicy";

// Adult audience: not directed at children, no under-age-of-consent users (see docs/05, Play data safety).
const consentGateway: ConsentGateway = {
  async gatherConsent() {
    const info = await AdsConsent.gatherConsent({ tagForUnderAgeOfConsent: false });
    return {
      canRequestAds: info.canRequestAds,
      privacyOptionsRequired: info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    };
  },
  async showPrivacyOptions() {
    await AdsConsent.showPrivacyOptionsForm();
  },
};

const adsSdk: AdsSdk = {
  async configure() {
    await mobileAds().setRequestConfiguration({
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: __DEV__ ? ["EMULATOR"] : [],
    });
  },
  async initialize() {
    await mobileAds().initialize();
  },
};

function createInterstitial(): InterstitialHandle {
  const unit = interstitialUnitId();
  const ad = InterstitialAd.createForAdRequest(unit);
  return {
    load: () => ad.load(),
    show: () => { void ad.show().catch(() => undefined); },
    onLoaded: (cb) => ad.addAdEventListener(AdEventType.LOADED, cb),
    onClosed: (cb) => ad.addAdEventListener(AdEventType.CLOSED, cb),
    onError: (cb) => ad.addAdEventListener(AdEventType.ERROR, cb),
  };
}

export interface LeaveInfo {
  hasViewedResult: boolean;
  fieldFocused: boolean;
}

interface AdsContextValue {
  adsAllowed: boolean;
  privacyOptionsRequired: boolean;
  changePrivacyChoices: () => Promise<void>;
  onCalculatorLeave: (info: LeaveInfo) => void;
}

export const AdsContext = createContext<AdsContextValue>({
  adsAllowed: false,
  privacyOptionsRequired: false,
  changePrivacyChoices: async () => undefined,
  onCalculatorLeave: () => undefined,
});
export const useAds = () => useContext(AdsContext);

export function AdsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ adsAllowed: false, privacyOptionsRequired: false });
  const controller = useRef<InterstitialController | null>(null);
  if (controller.current === null) controller.current = new InterstitialController(createInterstitial, new InterstitialPolicy());

  // Consent first: nothing ad-related is configured, initialised or requested until it allows it.
  useEffect(() => {
    let cancelled = false;
    void startAds(consentGateway, adsSdk).then((r) => { if (!cancelled) setState(r); });
    return () => { cancelled = true; };
  }, []);

  // Pre-load interstitials only while ads are allowed; withdrawing consent stops them.
  useEffect(() => {
    const c = controller.current;
    if (state.adsAllowed && interstitialUnitId() !== "") c?.start();
    else c?.stop();
    return () => c?.stop();
  }, [state.adsAllowed]);

  const change = useCallback(async () => { setState(await changePrivacyChoices(consentGateway, adsSdk)); }, []);
  const onCalculatorLeave = useCallback((info: LeaveInfo) => {
    controller.current?.onCalculatorLeave({ ...info, adsAllowed: state.adsAllowed });
  }, [state.adsAllowed]);

  const value = useMemo(() => ({ ...state, changePrivacyChoices: change, onCalculatorLeave }), [state, change, onCalculatorLeave]);
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}
