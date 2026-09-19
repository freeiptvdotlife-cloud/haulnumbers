import { useEffect, useState } from "react";
import { Keyboard, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useAds } from "./AdsProvider";
import { bannerUnitId } from "./adUnits";

function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

/**
 * Adaptive banner docked below the scroll area of a calculator screen. It renders nothing without
 * consent, without a configured unit id, or while the keyboard is up (no ad beside a live keyboard).
 */
export function AdBanner() {
  const { adsAllowed } = useAds();
  const keyboard = useKeyboardVisible();
  const unit = bannerUnitId();
  if (!adsAllowed || unit === "" || keyboard) return null;
  return (
    <View accessibilityLabel="Advertisement" style={{ alignItems: "center", minHeight: 50, marginTop: 8 }}>
      <BannerAd unitId={unit} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
