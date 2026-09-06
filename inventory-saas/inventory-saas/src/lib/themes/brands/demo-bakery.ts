import type { BrandTheme } from "../types";

/**
 * מותג דמו מספר 1: "מאפיית השיבולת" — בייקרי עם פלטה חמה של חום/קרם/כתום שרוף.
 */
export const demoBakeryTheme: BrandTheme = {
  slug: "demo-bakery",
  displayName: "מאפיית השיבולת",
  colors: {
    primary: "#8B4513",
    secondary: "#D2A679",
    accent: "#E07A3F",
    background: "#FBF6EF",
    surface: "#FFFFFF",
    text: "#3A2E22",
    onPrimary: "#FFFFFF",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
  },
  logo: {
    light: "/brands/demo-bakery/logo-light.svg",
    dark: "/brands/demo-bakery/logo-dark.svg",
  },
  backgroundImage: {
    login: "/brands/demo-bakery/login-bg.svg",
    dashboard: "/brands/demo-bakery/dashboard-bg.svg",
  },
  fontFamily: "Heebo",
};
