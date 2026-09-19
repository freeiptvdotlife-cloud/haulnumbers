import Constants from "expo-constants";
import { TestIds } from "react-native-google-mobile-ads";

type Extra = { admob?: { bannerUnitId?: string; interstitialUnitId?: string } };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/**
 * Ad unit ids. Development builds always use Google's TEST ids, so a developer can never click or
 * load a real ad by accident. Release builds use the ids from the build environment and, if one is
 * missing, return "" so that no ad is requested at all (fail closed) instead of falling back.
 */
export const bannerUnitId = (): string => (__DEV__ ? TestIds.ADAPTIVE_BANNER : extra.admob?.bannerUnitId ?? "");
export const interstitialUnitId = (): string => (__DEV__ ? TestIds.INTERSTITIAL : extra.admob?.interstitialUnitId ?? "");
