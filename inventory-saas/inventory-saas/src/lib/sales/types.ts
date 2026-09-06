/**
 * חוזה גנרי למקור נתוני מכירות — ראו ARCHITECTURE.md → "תכנון Phase 3".
 * הרעיון: כל "מקור" (קובץ CSV, בעתיד API של קופה אמיתית) רק צריך להפוך את
 * הנתונים הגולמיים שלו לרשימת ParsedSaleRow — שאר המערכת (ולידציה, שיוך
 * למוצר, כתיבה ל-DB) לא משתנה בין מקור למקור. כשתיבחר מערכת קופה אמיתית,
 * הפעולה היא להוסיף מתאם (adapter) חדש שמיישם את הפונקציה הזו — לא לשנות
 * שום דבר אחר בקוד.
 */
export interface ParsedSaleRow {
  /** שם המוצר כפי שמופיע בקובץ (עברית/אנגלית) — משויך לקטלוג לפי שם, לא לפי מזהה */
  productName: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  revenue: number | null;
}

export interface SalesParseError {
  rowNumber: number; // 1-based, כולל שורת הכותרת כשורה 1
  reason: string;
}

export interface SalesParseResult {
  rows: ParsedSaleRow[];
  errors: SalesParseError[];
}
