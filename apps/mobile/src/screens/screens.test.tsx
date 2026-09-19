import { fireEvent, render, screen } from "@testing-library/react-native";
import { AdsContext } from "../ads/AdsProvider";
import { useLeaveInterstitial } from "../ads/useLeaveInterstitial";
import { CostPerMileScreen } from "./CostPerMileScreen";
import { DetentionScreen } from "./DetentionScreen";
import { IftaScreen } from "./IftaScreen";
import { LoadProfitScreen } from "./LoadProfitScreen";
import { PerDiemScreen } from "./PerDiemScreen";
import Home from "../../app/index";
import Settings from "../../app/settings";

const text = (id: string) => screen.getByTestId(id).props.children as string;
const type = (id: string, v: string) => fireEvent.changeText(screen.getByTestId(id), v);
const noAds = { adsAllowed: false, privacyOptionsRequired: false, changePrivacyChoices: async () => {}, onCalculatorLeave: () => {} };

function withAds(ui: React.ReactElement, over: Partial<typeof noAds> = {}) {
  return <AdsContext.Provider value={{ ...noAds, ...over }}>{ui}</AdsContext.Provider>;
}

describe("results match the website", () => {
  it("cost per mile: default example", async () => {
    await render(withAds(<CostPerMileScreen />));
    expect(text("row-Total cost per mile")).toBe("$1.200");
    expect(text("row-Target rate per mile")).toBe("$1.333");
    expect(text("row-Total monthly cost")).toBe("$12,000.00");
    expect(text("row-Profit at target rate")).toBe("$1,333.33");
  });

  it("load profit: take, then negotiate with the counter-offer", async () => {
    await render(withAds(<LoadProfitScreen />));
    expect(text("row-Net profit")).toBe("$1,266.62");
    expect(screen.getByText("Take it: you keep $1.267 per mile, above your minimum.")).toBeTruthy();
    await type("in-linehaulRevenue", "1000");
    expect(screen.getByText("Negotiate: profitable, but below your minimum. Ask for at least $1,175.69 linehaul.")).toBeTruthy();
    await type("in-linehaulRevenue", "300");
    expect(screen.getByText("Skip: this load loses $314.38.")).toBeTruthy();
    expect(text("row-Net profit")).toBe("-$314.38");
  });

  it("detention: same-day, past midnight, and per-stop free time", async () => {
    await render(withAds(<DetentionScreen />));
    expect(text("row-Total owed")).toBe("$100.00");
    await type("in-pickupArrival", "22:30");
    await type("in-pickupDeparture", "01:15");
    expect(text("row-Pickup: time on site")).toBe("2 h 45 min");
    expect(text("row-Total owed")).toBe("$50.00");
    await type("in-pickupArrival", "08:00");
    await type("in-pickupDeparture", "11:00");
    await type("in-deliveryArrival", "13:00");
    await type("in-deliveryDeparture", "14:00");
    expect(text("row-Pickup: detention pay")).toBe("$50.00");
    expect(text("row-Delivery: detention pay")).toBe("$0.00");
  });

  it("per diem: $920 -> $736 -> $184, and the outside-US rate", async () => {
    await render(withAds(<PerDiemScreen />));
    expect(text("row-Per diem total")).toBe("$920.00");
    expect(text("row-Deductible (80%)")).toBe("$736.00");
    expect(text("row-Estimated tax savings at 25%")).toBe("$184.00");
    await fireEvent.press(screen.getByLabelText("Outside U.S."));
    expect(text("row-Per diem total")).toBe("$989.00");
    await fireEvent.press(screen.getByLabelText("No, 50%"));
    expect(text("row-Deductible (50%)")).toBe("$494.50");
  });

  it("IFTA: the hand-computed return is $29.25 net, and rows can be added and removed", async () => {
    await render(withAds(<IftaScreen />));
    expect(text("row-Fleet MPG")).toBe("8.00");
    expect(text("row-Net tax due")).toBe("$29.25");
    expect(screen.getAllByTestId(/^in-miles-/)).toHaveLength(3);
    await fireEvent.press(screen.getByTestId("add-state"));
    expect(screen.getAllByTestId(/^in-miles-/)).toHaveLength(4);
    await fireEvent.press(screen.getByTestId("remove-3"));
    expect(screen.getAllByTestId(/^in-miles-/)).toHaveLength(3);
    expect(text("row-Net tax due")).toBe("$29.25");
  });
});

describe("errors name the field, and a blank field is an error not zero", () => {
  it("cost per mile", async () => {
    await render(withAds(<CostPerMileScreen />));
    await type("in-miles", "0");
    expect(screen.getByText("Miles driven this month: Miles must be greater than 0.")).toBeTruthy();
    expect(screen.queryByTestId("row-Total cost per mile")).toBeNull();
    await type("in-miles", "10000");
    await type("in-mpg", "");
    expect(screen.getByText("Truck MPG: MPG must be greater than 0.")).toBeTruthy();
  });

  it("detention: a half-filled stop and a blank rate", async () => {
    await render(withAds(<DetentionScreen />));
    await type("in-deliveryArrival", "13:00");
    expect(screen.getByText(/Delivery departure .*: Enter both arrival and departure/)).toBeTruthy();
    await type("in-deliveryArrival", "");
    await type("in-hourlyRate", "");
    expect(screen.getByText(/Detention rate per hour \(USD\): Must be 0 or more\./)).toBeTruthy();
  });

  it("IFTA: a row with miles but no state names the row", async () => {
    await render(withAds(<IftaScreen />));
    await fireEvent.press(screen.getByTestId("add-state"));
    await type("in-miles-3", "100");
    expect(screen.getByText("Row 4: Choose a state.")).toBeTruthy();
    expect(screen.queryByTestId("row-Net tax due")).toBeNull();
  });
});

describe("ad compliance in the UI", () => {
  it("shows no banner without consent, on any calculator screen", async () => {
    await render(withAds(<CostPerMileScreen />, { adsAllowed: false }));
    expect(screen.queryByLabelText("Advertisement")).toBeNull();
  });

  it("shows the labelled banner on a calculator screen once consent allows ads", async () => {
    await render(withAds(<CostPerMileScreen />, { adsAllowed: true }));
    expect(screen.getByLabelText("Advertisement")).toBeTruthy();
  });

  it("never shows a banner on the menu or settings screens, even with consent", async () => {
    await render(withAds(<Home />, { adsAllowed: true }));
    expect(screen.queryByLabelText("Advertisement")).toBeNull();
    await screen.unmount();
    await render(withAds(<Settings />, { adsAllowed: true }));
    expect(screen.queryByLabelText("Advertisement")).toBeNull();
  });

  it("offers Privacy settings only when the consent flow requires it", async () => {
    await render(withAds(<Settings />, { privacyOptionsRequired: false }));
    expect(screen.queryByTestId("privacy-settings")).toBeNull();
    await screen.unmount();
    await render(withAds(<Settings />, { privacyOptionsRequired: true }));
    expect(screen.getByTestId("privacy-settings")).toBeTruthy();
  });

  it("reports leaving a calculator screen once, after a result was viewed", async () => {
    const onCalculatorLeave = jest.fn();
    const r = await render(withAds(<CostPerMileScreen />, { adsAllowed: true, onCalculatorLeave }));
    expect(onCalculatorLeave).not.toHaveBeenCalled();
    await r.unmount();
    expect(onCalculatorLeave).toHaveBeenCalledTimes(1);
    expect(onCalculatorLeave).toHaveBeenCalledWith({ hasViewedResult: true, fieldFocused: false });
  });

  it("reports no viewed result when the screen never showed a valid result", async () => {
    const onCalculatorLeave = jest.fn();
    function Probe({ hasResult }: { hasResult: boolean }) {
      useLeaveInterstitial(hasResult);
      return null;
    }
    const r = await render(withAds(<Probe hasResult={false} />, { onCalculatorLeave }));
    await r.unmount();
    expect(onCalculatorLeave).toHaveBeenCalledWith({ hasViewedResult: false, fieldFocused: false });
  });

  it("reports a viewed result once the result becomes valid during the visit", async () => {
    const onCalculatorLeave = jest.fn();
    function Probe({ hasResult }: { hasResult: boolean }) {
      useLeaveInterstitial(hasResult);
      return null;
    }
    const r = await render(withAds(<Probe hasResult={false} />, { onCalculatorLeave }));
    await r.rerender(withAds(<Probe hasResult={true} />, { onCalculatorLeave }));
    await r.unmount();
    expect(onCalculatorLeave).toHaveBeenCalledWith({ hasViewedResult: true, fieldFocused: false });
  });
});
