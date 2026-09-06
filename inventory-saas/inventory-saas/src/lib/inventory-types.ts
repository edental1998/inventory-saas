/**
 * טיפוסים/קבועים "בטוחים ל-client" הקשורים למלאי — בכוונה בקובץ נפרד מ-
 * src/lib/data/inventory.ts, כי אותו קובץ מייבא את src/lib/db.ts (driver ה-pg),
 * ורכיבי client (כמו CaptureFlow.tsx) שמייבאים ממנו גורמים ל-Next.js לנסות
 * לצרף את pg לחבילת ה-browser (שגיאת build: "Module not found: tls" / "util/types").
 * כל טיפוס/קבוע שרכיב client צריך חייב לחיות כאן, ולא ב-data/inventory.ts.
 */

/** הסיבה לזריקה — נאספת בכל אירוע השלכה, ראו ARCHITECTURE.md → "תנועות מלאי חלקיות וסיבת זריקה" */
export type WasteReason =
  | "EXPIRED"
  | "QUALITY_ISSUE"
  | "PEST_CONTAMINATION"
  | "SUSPECTED_CONSUMPTION"
  | "OTHER";

export const WASTE_REASONS: WasteReason[] = [
  "EXPIRED",
  "QUALITY_ISSUE",
  "PEST_CONTAMINATION",
  "SUSPECTED_CONSUMPTION",
  "OTHER",
];

/** יעד עדכון הכמות (טאב "עדכון כמות") / זריקה — ראו applyStockMove ב-data/inventory.ts */
export type StockMoveKind = "TO_SHELF" | "TO_FREEZER" | "FREEZER_TO_SHELF" | "WASTE";
