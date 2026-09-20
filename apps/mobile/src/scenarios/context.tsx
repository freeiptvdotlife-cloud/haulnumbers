import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext } from "react";
import { ScenarioStore } from "./store";

/** The real store lives on the device; tests provide an in-memory one through the context. */
export const defaultScenarioStore = new ScenarioStore(AsyncStorage);
export const ScenariosContext = createContext<ScenarioStore>(defaultScenarioStore);
export const useScenarioStore = () => useContext(ScenariosContext);
