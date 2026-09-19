import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Keyboard, TextInput } from "react-native";
import { useAds } from "./AdsProvider";

/** True while the user is mid-task: the soft keyboard is up or a text field has focus. */
export function isUserTyping(): boolean {
  return Keyboard.isVisible() || TextInput.State.currentlyFocusedInput?.() != null;
}

/**
 * Called by every calculator screen. Reports the moment the user LEAVES the screen (the only place an
 * interstitial may be considered), together with whether they saw a result and whether they are typing.
 * The decision itself is made by InterstitialPolicy (see interstitialPolicy.ts and docs/05).
 */
export function useLeaveInterstitial(hasResult: boolean): void {
  const { onCalculatorLeave } = useAds();
  const viewed = useRef(false);
  const leave = useRef(onCalculatorLeave);
  leave.current = onCalculatorLeave;

  useEffect(() => { if (hasResult) viewed.current = true; }, [hasResult]);

  useFocusEffect(
    useCallback(() => {
      viewed.current = hasResult; // a fresh visit
      return () => {
        leave.current({ hasViewedResult: viewed.current, fieldFocused: isUserTyping() });
        viewed.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
}
