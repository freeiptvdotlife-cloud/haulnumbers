import Constants from "expo-constants";
import { TestIds } from "react-native-google-mobile-ads";

type Extra = { admob?: { bannerUnitId?: string; interstitialUnitId?: string; useTestIds?: boolean } };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/**
 * Ad unit ids. Development builds, and testing builds that set ADMOB_USE_TEST_IDS=true, use Google's TEST
 * ids: a developer or tester can never click or load a real ad by accident. Any other build uses the ids from
 * the build environment and, if one is missing, returns "" so that no ad is requested at all (fail closed)
 * instead of falling back to test ids. Production builds cannot enable test ids (see config/releaseGuard.ts).
 */
const useTestIds = (): boolean => __DEV__ || extra.admob?.useTestIds === true;
export const bannerUnitId = (): string => (useTestIds() ? TestIds.ADAPTIVE_BANNER : extra.admob?.bannerUnitId ?? "");
export const interstitialUnitId = (): string => (useTestIds() ? TestIds.INTERSTITIAL : extra.admob?.interstitialUnitId ?? "");
