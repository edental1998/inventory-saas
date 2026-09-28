/**
 * צבעים סמנטיים בבעלות Gestion — לא תלויי מותג/ארגון (החלטה מאושרת:
 * "success / warning / danger / info become Gestion-owned semantic colors,
 * independent of tenant brand colors"). גם אם ל-BrandTheme.colors עדיין יש
 * שדות success/warning/danger היסטוריים (מה-DB, ראו from-db.ts) — הערכים
 * האלה מתעלמים מהם בכוונה ותמיד משתמשים בקבועים כאן. אין כאן שינוי סכמה:
 * העמודות ב-DB פשוט הופכות ללא-בשימוש, לא נמחקות.
 */
export const GESTION_SEMANTIC_COLORS = {
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#2563EB",
} as const;
