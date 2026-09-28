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
  /** רקע ויזואלי גנרי לכרטיס סניף, כל עוד אין תכונת תמונת-סניף ייעודית */
  branchCard: "/images/hospitality/golden-croissants.jpg",
} as const;
