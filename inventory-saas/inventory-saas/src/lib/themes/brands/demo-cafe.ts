import type { BrandTheme } from "../types";

/**
 * מותג דמו מספר 2: "קפה מרידיאן" — בית קפה עם פלטה כהה/טילית מודרנית.
 * שימו לב: אותם בדיוק רכיבי React, רק קונפיג צבעים/לוגו שונה לגמרי.
 */
export const demoCafeTheme: BrandTheme = {
  slug: "demo-cafe",
  displayName: "קפה מרידיאן",
  colors: {
    primary: "#0F4C4C",
    secondary: "#4B8B8B",
    accent: "#D4A24C",
    background: "#F3F7F6",
    surface: "#FFFFFF",
    text: "#12211F",
    onPrimary: "#FFFFFF",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
  },
  logo: {
    light: "/brands/demo-cafe/logo-light.svg",
    dark: "/brands/demo-cafe/logo-dark.svg",
  },
  backgroundImage: {
    login: "/brands/demo-cafe/login-bg.svg",
    dashboard: "/brands/demo-cafe/dashboard-bg.svg",
  },
  fontFamily: "Rubik",
};
