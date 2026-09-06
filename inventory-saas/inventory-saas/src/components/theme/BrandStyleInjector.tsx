import type { BrandTheme } from "@/lib/themes/types";
import { themeToCssVariables } from "@/lib/themes/theme-to-css-vars";

/**
 * מזריק את משתני ה-CSS של המותג הפעיל כתגית <style> בראש הדף.
 * זהו הגשר בין הנתונים (BrandTheme) לבין Tailwind — ראו globals.css
 * שם הטוקנים הסמנטיים (bg-brand-primary וכו') ממופים למשתנים האלה.
 */
export function BrandStyleInjector({ theme }: { theme: BrandTheme }) {
  return (
    // תוכן מבוקר (רשימת צבעים מ-BrandTheme), לא קלט משתמש חופשי
    <style dangerouslySetInnerHTML={{ __html: themeToCssVariables(theme) }} />
  );
}
