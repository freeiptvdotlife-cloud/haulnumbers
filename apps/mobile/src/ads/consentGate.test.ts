import { changePrivacyChoices, startAds, type AdsSdk, type ConsentGateway, type ConsentState } from "./consentGate";

function fakes(state: ConsentState | Error, after?: ConsentState) {
  const calls: string[] = [];
  let current = state;
  const consent: ConsentGateway = {
    async gatherConsent() { calls.push("gather"); if (current instanceof Error) throw current; return current; },
    async showPrivacyOptions() { calls.push("privacyOptions"); if (after) current = after; },
  };
  const sdk: AdsSdk = {
    async configure() { calls.push("configure"); },
    async initialize() { calls.push("initialize"); },
  };
  return { consent, sdk, calls };
}

describe("startAds: consent before ads", () => {
  it("does not configure or initialise the ads SDK when consent is not granted", async () => {
    const { consent, sdk, calls } = fakes({ canRequestAds: false, privacyOptionsRequired: true });
    expect(await startAds(consent, sdk)).toEqual({ adsAllowed: false, privacyOptionsRequired: true });
    expect(calls).toEqual(["gather"]);
  });

  it("configures the request settings BEFORE initialising, and only after consent", async () => {
    const { consent, sdk, calls } = fakes({ canRequestAds: true, privacyOptionsRequired: false });
    expect(await startAds(consent, sdk)).toEqual({ adsAllowed: true, privacyOptionsRequired: false });
    expect(calls).toEqual(["gather", "configure", "initialize"]);
  });

  it("fails closed when the consent flow errors", async () => {
    const { consent, sdk, calls } = fakes(new Error("network"));
    expect(await startAds(consent, sdk)).toEqual({ adsAllowed: false, privacyOptionsRequired: false });
    expect(calls).toEqual(["gather"]);
  });

  it("fails closed when SDK initialisation errors", async () => {
    const { consent, calls } = fakes({ canRequestAds: true, privacyOptionsRequired: true });
    const sdk: AdsSdk = { configure: async () => { calls.push("configure"); }, initialize: async () => { throw new Error("boom"); } };
    expect(await startAds(consent, sdk)).toEqual({ adsAllowed: false, privacyOptionsRequired: true });
  });
});

describe("changePrivacyChoices", () => {
  it("switches ads off when the user withdraws consent", async () => {
    const { consent, sdk } = fakes({ canRequestAds: true, privacyOptionsRequired: true }, { canRequestAds: false, privacyOptionsRequired: true });
    expect(await changePrivacyChoices(consent, sdk)).toEqual({ adsAllowed: false, privacyOptionsRequired: true });
  });

  it("re-evaluates even if opening the options form fails", async () => {
    const { sdk } = fakes({ canRequestAds: true, privacyOptionsRequired: true });
    const consent: ConsentGateway = {
      gatherConsent: async () => ({ canRequestAds: false, privacyOptionsRequired: true }),
      showPrivacyOptions: async () => { throw new Error("no activity"); },
    };
    expect(await changePrivacyChoices(consent, sdk)).toEqual({ adsAllowed: false, privacyOptionsRequired: true });
  });
});
