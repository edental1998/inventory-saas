/**
 * תמונות גנריות (לא ספציפיות לארגון) המשמשות כשכבת עיצוב תומכת — לא
 * תחליף לתמונות אמיתיות של סניף/מוצר ספציפי. המקור: public/images/
 * hospitality (ראו CREDITS.md שם — Pexels, שימוש מסחרי חופשי, לא דורש
 * קרדיט).
 *
 * בכוונה קובץ קונפיג אחד, לא נתיבים מוטבעים ברכיבים: כשגסטיון תשרת
 * תעשייה אחרת (לא בייקרי/קפה), מחליפים את הקבצים בתיקייה ומעדכנים כאן —
 * בלי לגעת ב-AuthShell או בכרטיסי הסניפים.
 */
export const FALLBACK_IMAGERY = {
  /** פאנל הצד במסכי התחברות/הרשמה, כשלארגון אין login background משלו */
  auth: "/images/hospitality/artisan-bread-basket.jpg",
  /**
   * מאגר תמונות רקע לכרטיסי סניפים — יותר מתמונה אחת כדי שסניפים שונים
   * לא ייראו זהים (ראו getBranchCardImage), בלי שדה תמונת-סניף בסכמה.
   */
  branchCards: [
    "/images/hospitality/golden-croissants.jpg",
    "/images/hospitality/latte-art-flatlay.jpg",
    "/images/hospitality/artisan-bread-basket.jpg",
  ],
} as const;

/** בוחר תמונת רקע לכרטיס סניף לפי אינדקס — דטרמיניסטי, בלי אחסון נוסף */
export function getBranchCardImage(index: number): string {
  const images = FALLBACK_IMAGERY.branchCards;
  return images[index % images.length]!;
}
