import { useColorScheme } from "react-native";

/** Same palette as the website; contrast ratios were checked for both schemes (WCAG AA). */
const light = { bg: "#f7f8f6", card: "#ffffff", fg: "#15211c", muted: "#5b6b64", brand: "#0b3d2e", accent: "#f5b301", line: "#dfe5e1", bad: "#b3261e" };
const dark = { bg: "#0e1512", card: "#16211c", fg: "#e8efeb", muted: "#9db0a7", brand: "#7fd1ae", accent: "#f5b301", line: "#2a3a33", bad: "#f2b8b5" };

export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === "dark" ? dark : light);
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
/** Minimum touch target, Android accessibility guidance. */
export const MIN_TARGET = 48;
