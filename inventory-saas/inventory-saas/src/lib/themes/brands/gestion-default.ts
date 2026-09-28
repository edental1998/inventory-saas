import type { BrandTheme } from "../types";
import { GESTION_SEMANTIC_COLORS } from "../semantic-colors";

/**
 * ברירת המחדל הניטרלית של Gestion עצמה — לא מותג-דמו (למשל בייקרי חמה),
 * אלא הזהות הניטרלית של המוצר כשאין עדיין רמז ארגון (tenant_hint) ואין
 * session. החלטה מאושרת: "Replace the current demo-bakery fallback theme
 * with a proper neutral Gestion default theme when no tenant branding is
 * available." משתמשת באותם success/warning/danger קבועים כמו כל מותג אחר
 * (הם ממילא לא-תלויי-ארגון, ראו semantic-colors.ts) לשלמות הטיפוס בלבד.
 */
export const gestionDefaultTheme: BrandTheme = {
  slug: "gestion-default",
  displayName: "Gestion",
  colors: {
    primary: "#3B5BDB",
    secondary: "#5C6784",
    accent: "#2F9E8F",
    background: "#F5F6F8",
    surface: "#FFFFFF",
    text: "#1E2330",
    onPrimary: "#FFFFFF",
    success: GESTION_SEMANTIC_COLORS.success,
    warning: GESTION_SEMANTIC_COLORS.warning,
    danger: GESTION_SEMANTIC_COLORS.danger,
  },
  logo: {
    light: "/gestion-logo.png",
    dark: "/gestion-logo.png",
  },
  backgroundImage: {},
  fontFamily: "Heebo",
};
