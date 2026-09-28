import type { BrandTheme } from "./types";
import { mix, primaryHoverColor, softTint, pickAccessibleTextColor } from "./color-utils";

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
 *
 * Slice 6: מעבר על שכבת הטוקנים הגולמית (10 צבעים בלבד) והוספת שכבת טוקנים
 * סמנטית נגזרת — hover/soft/contrast/border/היררכיית טקסט — הכול מחושב כאן
 * מתוך אותם שדות BrandTheme קיימים (בלי שדה DB חדש אחד, כמו שהוחלט). צבעי
 * success/warning/danger בכוונה מתעלמים מ-theme.colors ותמיד משתמשים בקבועי
 * Gestion (ראו semantic-colors.ts) — כך שמותג אדום/ירוק של ארגון לא "יגנוב"
 * את המשמעות הסמנטית של פעולה מסוכנת/אזהרה/הצלחה.
 */
export function themeToCssVariables(theme: BrandTheme): string {
  const { primary, secondary, accent, background, surface, text } = theme.colors;

  const onPrimary = pickAccessibleTextColor(primary);
  const onAccent = pickAccessibleTextColor(accent);
  const onSecondary = pickAccessibleTextColor(secondary);

  const vars: Record<string, string> = {
    "--brand-color-primary": primary,
    "--brand-color-primary-hover": primaryHoverColor(primary),
    "--brand-color-primary-soft": softTint(primary, surface),
    "--brand-color-on-primary": onPrimary,

    "--brand-color-secondary": secondary,
    "--brand-color-on-secondary": onSecondary,

    "--brand-color-accent": accent,
    "--brand-color-accent-soft": softTint(accent, surface),
    "--brand-color-on-accent": onAccent,

    "--brand-color-background": background,
    "--brand-color-surface": surface,
    "--brand-color-surface-elevated": mix(surface, primary, 0.03),
    "--brand-color-border": mix(surface, text, 0.12),

    "--brand-color-text": text,
    "--brand-color-text-secondary": mix(text, background, 0.35),
    "--brand-color-text-muted": mix(text, background, 0.55),

    // הערה: success/warning/danger/info בכוונה לא כאן — הם טוקנים קבועים
    // של Gestion שלא תלויים בארגון בכלל, מוגדרים ישירות ב-globals.css
    // (@theme, לא @theme inline) — ראו semantic-colors.ts.
    "--brand-font-family":
      FONT_FAMILY_VARIABLES[theme.fontFamily] ?? theme.fontFamily,
  };

  const declarations = Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");

  return `:root { ${declarations} }`;
}
