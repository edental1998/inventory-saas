import type { ParsedSaleRow, SalesParseResult } from "./types";

/**
 * מתאם המקור הראשון (ומיושם) של "ייבוא נתוני מכירות" — ראו ARCHITECTURE.md
 * → "תכנון Phase 3". קובץ CSV פשוט בעמודות: date,product,quantity,revenue
 * (revenue אופציונלי). אין תלות בספריית CSV חיצונית בכוונה — הפורמט קבוע
 * ומתועד במסך ההעלאה עצמו, כך שפרסר קטן ועצמאי מספיק ופשוט יותר לתחזק.
 */

const REQUIRED_HEADERS = ["date", "product", "quantity"] as const;

/** פיצול שורת CSV אחת לשדות, עם תמיכה בסיסית בשדות מצוטטים ("a, b") */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // מוסכמה ישראלית: DD/MM/YYYY או DD.MM.YYYY
  const match = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(trimmed);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return null;
}

export function parseSalesCsv(text: string): SalesParseResult {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  const rows: ParsedSaleRow[] = [];
  const errors: SalesParseResult["errors"] = [];

  if (lines.length === 0) {
    return { rows, errors: [{ rowNumber: 1, reason: "empty_file" }] };
  }

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return { rows, errors: [{ rowNumber: 1, reason: `missing_headers:${missing.join(",")}` }] };
  }

  const dateIdx = header.indexOf("date");
  const productIdx = header.indexOf("product");
  const quantityIdx = header.indexOf("quantity");
  const revenueIdx = header.indexOf("revenue"); // אופציונלי, -1 אם אין

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const fields = splitCsvLine(lines[i]!);

    const productName = fields[productIdx]?.trim();
    if (!productName) {
      errors.push({ rowNumber, reason: "missing_product" });
      continue;
    }

    const date = parseDate(fields[dateIdx] ?? "");
    if (!date) {
      errors.push({ rowNumber, reason: "invalid_date" });
      continue;
    }

    const quantity = Number(fields[quantityIdx]);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push({ rowNumber, reason: "invalid_quantity" });
      continue;
    }

    const revenueRaw = revenueIdx >= 0 ? fields[revenueIdx] : undefined;
    const revenue = revenueRaw ? Number(revenueRaw) : null;
    if (revenueRaw && !Number.isFinite(revenue)) {
      errors.push({ rowNumber, reason: "invalid_revenue" });
      continue;
    }

    rows.push({ productName, date, quantity, revenue });
  }

  return { rows, errors };
}
