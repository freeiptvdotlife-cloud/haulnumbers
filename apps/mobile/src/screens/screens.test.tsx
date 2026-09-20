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

// ------------------------------------------------------------------------------------------------
// Saved scenarios, tablet layout and the delete-all privacy control
// ------------------------------------------------------------------------------------------------
import { Alert, Dimensions } from "react-native";
import { act, waitFor } from "@testing-library/react-native";
import { ScenariosContext } from "../scenarios/context";
import { ScenarioStore, STORAGE_KEY } from "../scenarios/store";

function memStore(initial?: unknown) {
  const m = new Map<string, string>();
  if (initial !== undefined) m.set(STORAGE_KEY, JSON.stringify(initial));
  return new ScenarioStore({ getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } });
}
const withStore = (ui: React.ReactElement, store: ScenarioStore) => <ScenariosContext.Provider value={store}>{withAds(ui)}</ScenariosContext.Provider>;

describe("saved scenarios through the real screens", () => {
  it("cost per mile: save, change, load restores, delete removes", async () => {
    const store = memStore();
    await render(withStore(<CostPerMileScreen />, store));
    await type("in-miles", "9000");
    await type("scenario-name", "Denver lane");
    await fireEvent.press(screen.getByTestId("scenario-save"));
    await waitFor(() => expect(screen.getByText("Denver lane")).toBeTruthy());
    expect(screen.getByText("Saved “Denver lane”.")).toBeTruthy();
    await type("in-miles", "1234");
    await fireEvent.press(screen.getByLabelText("Load Denver lane"));
    expect(screen.getByTestId("in-miles").props.value).toBe("9000");
    await fireEvent.press(screen.getByLabelText("Delete Denver lane"));
    await waitFor(() => expect(screen.queryByText("Denver lane")).toBeNull());
    expect(await store.list("cost-per-mile")).toEqual([]);
  });

  it("a blank name shows an error and stores nothing", async () => {
    const store = memStore();
    await render(withStore(<CostPerMileScreen />, store));
    await fireEvent.press(screen.getByTestId("scenario-save"));
    await waitFor(() => expect(screen.getByText("Enter a name for this scenario.")).toBeTruthy());
    expect(await store.list("cost-per-mile")).toEqual([]);
  });

  it("saving the same name again updates it", async () => {
    const store = memStore();
    await render(withStore(<LoadProfitScreen />, store));
    await type("scenario-name", "Lane A");
    await fireEvent.press(screen.getByTestId("scenario-save"));
    await waitFor(() => expect(screen.getByText("Saved “Lane A”.")).toBeTruthy());
    await type("in-linehaulRevenue", "2500");
    await type("scenario-name", "lane a");
    await fireEvent.press(screen.getByTestId("scenario-save"));
    await waitFor(() => expect(screen.getByText("Updated “lane a”.")).toBeTruthy());
    expect(await store.list("load-profit")).toHaveLength(1);
  });

  it("a hostile or corrupt saved snapshot cannot break the screen: bad fields fall back to defaults", async () => {
    const store = memStore([{ id: "1", toolId: "cost-per-mile", name: "Bad", savedAt: 5, state: { miles: 123, mpg: { evil: true }, extra: "x", insurance: "1800" } }]);
    await render(withStore(<CostPerMileScreen />, store));
    await waitFor(() => expect(screen.getByText("Bad")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Load Bad"));
    expect(screen.getByTestId("in-miles").props.value).toBe("10000"); // wrong type -> default
    expect(screen.getByTestId("in-mpg").props.value).toBe("6.5"); // object -> default
    expect(screen.getByTestId("in-insurance").props.value).toBe("1800"); // valid string kept
    expect(text("row-Total cost per mile")).toBeTruthy();
  });

  it("per diem: area and hours-of-service choices are restored too", async () => {
    const store = memStore();
    await render(withStore(<PerDiemScreen />, store));
    await fireEvent.press(screen.getByLabelText("Outside U.S."));
    await fireEvent.press(screen.getByLabelText("No, 50%"));
    await type("scenario-name", "Overseas");
    await fireEvent.press(screen.getByTestId("scenario-save"));
    await waitFor(() => expect(screen.getByText("Overseas")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Continental U.S."));
    await fireEvent.press(screen.getByLabelText("Yes, 80%"));
    expect(text("row-Deductible (80%)")).toBe("$736.00");
    await fireEvent.press(screen.getByLabelText("Load Overseas"));
    expect(text("row-Deductible (50%)")).toBe("$494.50");
  });

  it("detention: the billing block is restored", async () => {
    const store = memStore();
    await render(withStore(<DetentionScreen />, store));
    await fireEvent.press(screen.getByLabelText("15 min"));
    await type("scenario-name", "Quarter hours");
    await fireEvent.press(screen.getByTestId("scenario-save"));
    await waitFor(() => expect(screen.getByText("Quarter hours")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Exact"));
    expect(screen.getByLabelText("Exact").props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByLabelText("Load Quarter hours"));
    expect(screen.getByLabelText("15 min").props.accessibilityState.selected).toBe(true);
  });

  it("IFTA: rows, quarter and untaxed fuel come back", async () => {
    const store = memStore();
    await render(withStore(<IftaScreen />, store));
    await fireEvent.press(screen.getByTestId("remove-2")); // drop California
    expect(screen.getAllByTestId(/^in-miles-/)).toHaveLength(2);
    await type("scenario-name", "Two states");
    await fireEvent.press(screen.getByTestId("scenario-save"));
    await waitFor(() => expect(screen.getByText("Two states")).toBeTruthy());
    await fireEvent.press(screen.getByTestId("add-state"));
    await fireEvent.press(screen.getByTestId("add-state"));
    expect(screen.getAllByTestId(/^in-miles-/)).toHaveLength(4);
    await fireEvent.press(screen.getByLabelText("Load Two states"));
    expect(screen.getAllByTestId(/^in-miles-/)).toHaveLength(2);
    expect(screen.getByTestId("in-miles-0").props.value).toBe("6000");
  });
});

describe("tablet layout", () => {
  const setWidth = (width: number) => act(async () => { Dimensions.set({ window: { width, height: 1400, scale: 1, fontScale: 1 }, screen: { width, height: 1400, scale: 1, fontScale: 1 } }); });

  it("uses two columns on a wide screen and keeps everything visible", async () => {
    await setWidth(900);
    await render(withAds(<CostPerMileScreen />));
    expect(screen.getByTestId("wide-layout")).toBeTruthy();
    expect(screen.getByTestId("in-miles")).toBeTruthy();
    expect(text("row-Total cost per mile")).toBe("$1.200");
    expect(screen.getByTestId("scenario-save")).toBeTruthy();
  });

  it("stays a single column on a phone", async () => {
    await setWidth(400);
    await render(withAds(<CostPerMileScreen />));
    expect(screen.queryByTestId("wide-layout")).toBeNull();
    expect(text("row-Total cost per mile")).toBe("$1.200");
  });
});

describe("settings: delete all saved scenarios", () => {
  it("asks first, then wipes every saved scenario", async () => {
    const store = memStore();
    await store.save("ifta", "a", {});
    await store.save("per-diem", "b", {});
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => { buttons?.find((b) => b.text === "Delete")?.onPress?.(); });
    await render(withStore(<Settings />, store));
    await fireEvent.press(screen.getByTestId("clear-scenarios"));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0]![0]).toBe("Delete all saved scenarios?");
    await waitFor(() => expect(screen.getByText("All saved scenarios were deleted.")).toBeTruthy());
    expect(await store.list("ifta")).toEqual([]);
    expect(await store.list("per-diem")).toEqual([]);
    alert.mockRestore();
  });

  it("does nothing if the user cancels", async () => {
    const store = memStore();
    await store.save("ifta", "a", {});
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => { buttons?.find((b) => b.text === "Cancel")?.onPress?.(); });
    await render(withStore(<Settings />, store));
    await fireEvent.press(screen.getByTestId("clear-scenarios"));
    expect(await store.list("ifta")).toHaveLength(1);
    expect(screen.queryByText("All saved scenarios were deleted.")).toBeNull();
    alert.mockRestore();
  });
});
