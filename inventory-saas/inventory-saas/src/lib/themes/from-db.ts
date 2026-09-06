import type { BrandTheme } from "./types";
import type { OrgWithTheme } from "@/lib/data/types";

/** ממיר שורת ארגון+מותג שהגיעה מה-DB לטיפוס BrandTheme המשותף לכל הממשק */
export function dbOrgToBrandTheme(org: OrgWithTheme): BrandTheme {
  return {
    slug: org.slug,
    displayName: org.name,
    colors: {
      primary: org.theme.colorPrimary,
      secondary: org.theme.colorSecondary,
      accent: org.theme.colorAccent,
      background: org.theme.colorBackground,
      surface: org.theme.colorSurface,
      text: org.theme.colorText,
      onPrimary: "#FFFFFF",
      success: org.theme.colorSuccess,
      warning: org.theme.colorWarning,
      danger: org.theme.colorDanger,
    },
    logo: {
      light: org.theme.logoLightUrl ?? "/brands/demo-bakery/logo-light.svg",
      dark: org.theme.logoDarkUrl ?? "/brands/demo-bakery/logo-dark.svg",
    },
    backgroundImage: {
      login: org.theme.loginBackgroundUrl ?? undefined,
      dashboard: org.theme.dashboardBackgroundUrl ?? undefined,
    },
    fontFamily: org.theme.fontFamily,
  };
}
