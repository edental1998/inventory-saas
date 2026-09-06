"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import { query } from "@/lib/db";
import { getBranchById } from "@/lib/data/branches";
import { findProductByName } from "@/lib/data/products";
import { parseSalesCsv } from "@/lib/sales/csv-adapter";

export interface SalesImportSummary {
  imported: number;
  skipped: { rowNumber: number; reason: string }[];
}

export type SalesImportActionResult =
  | { kind: "error"; message: string }
  | { kind: "done"; summary: SalesImportSummary };

/**
 * ייבוא נתוני מכירות מקובץ CSV — ראו ARCHITECTURE.md → "תכנון Phase 3".
 * מתורגם דרך src/lib/sales/csv-adapter.ts, כדי שהחלפה עתידית למקור אחר
 * (API אמיתי של קופה) תהיה הוספת מתאם חדש, לא שינוי של הפעולה הזו.
 */
export async function importSalesCsvAction(
  branchId: string,
  formData: FormData
): Promise<SalesImportActionResult> {
  const session = await getSession();
  if (!session) return { kind: "error", message: "not_authenticated" };
  if (session.role === "EMPLOYEE") return { kind: "error", message: "not_authorized" };
  if (session.role === "BRANCH_MANAGER" && session.branchId !== branchId) {
    return { kind: "error", message: "not_authorized" };
  }

  const branch = await getBranchById(branchId);
  if (!branch) return { kind: "error", message: "unknown_branch" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { kind: "error", message: "missing_file" };
  }

  const text = await file.text();
  const { rows, errors } = parseSalesCsv(text);

  const skipped = [...errors];
  let imported = 0;

  // קאש קטן בתוך הריצה הזו: לא לשלוח שאילתת "מצא מוצר" זהה פעמיים לאותו שם
  const productCache = new Map<string, string | null>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowNumber = i + 2; // +1 לשורת הכותרת, +1 כי i הוא 0-based

    let productId = productCache.get(row.productName.toLowerCase());
    if (productId === undefined) {
      const product = await findProductByName(session.organizationId, row.productName);
      productId = product?.id ?? null;
      productCache.set(row.productName.toLowerCase(), productId);
    }

    if (!productId) {
      skipped.push({ rowNumber, reason: `unknown_product:${row.productName}` });
      continue;
    }

    await query(
      `insert into sale_records (id, branch_id, product_id, date, quantity_sold, revenue, source)
       values ($1, $2, $3, $4::date, $5, $6, 'import')`,
      [randomUUID(), branchId, productId, row.date, row.quantity, row.revenue]
    );
    imported++;
  }

  revalidatePath("/", "layout");
  return { kind: "done", summary: { imported, skipped } };
}
