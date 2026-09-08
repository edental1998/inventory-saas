import type { BrandTheme } from "./types";

/**
 * שם הפונט ב-BrandTheme (theme.fontFamily, למשל "Heebo") הוא רק תווית —
 * הפונט בפועל נטען פעם אחת בשורש דרך next/font/google (ראו src/lib/fonts.ts)
 * וחשוף כמשתנה CSS. הממיפוי כאן מתרגם את התווית למשתנה הטעון בפועל, כדי
 * שהברירת המחדל של הדפדפן (system-ui) לא "תגנוב" את מקום הפונט המיועד.
 */
const FONT_FAMILY_VARIABLES: Record<string, string> = {
  Heebo: "var(--font-heebo)",
  Rubik: "var(--font-rubik)",
};

/**
 * ממיר אובייקט BrandTheme לרשימת משתני CSS שמוזרקים בתגית <style> בראש הדף.
 * ה-Layout הראשי (src/app/[locale]/layout.tsx) קורא לפונקציה הזו פעם אחת בשרת,
 * לפי הארגון של המשתמש המחובר, ומזריק את התוצאה — כך שכל הרכיבים למטה
 * בעץ יכולים להשתמש במחלקות Tailwind כמו bg-brand-primary בלי לדעת
 * כלום על הארגון הספציפי.
 */
export function themeToCssVariables(theme: BrandTheme): string {
  const vars: Record<string, string> = {
    "--brand-color-primary": theme.colors.primary,
    "--brand-color-secondary": theme.colors.secondary,
    "--brand-color-accent": theme.colors.accent,
    "--brand-color-background": theme.colors.background,
    "--brand-color-surface": theme.colors.surface,
    "--brand-color-text": theme.colors.text,
    "--brand-color-on-primary": theme.colors.onPrimary,
    "--brand-color-success": theme.colors.success,
    "--brand-color-warning": theme.colors.warning,
    "--brand-color-danger": theme.colors.danger,
    "--brand-font-family":
      FONT_FAMILY_VARIABLES[theme.fontFamily] ?? theme.fontFamily,
  };

  const declarations = Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");

  return `:root { ${declarations} }`;
}
