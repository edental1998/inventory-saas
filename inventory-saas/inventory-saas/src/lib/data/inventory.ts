import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db";
import type { PoolClient } from "pg";
import { WASTE_REASONS, type WasteReason, type StockMoveKind } from "@/lib/inventory-types";

// מיוצא מחדש כדי לא לשבור קוד קיים שמייבא מכאן — אבל המקור האמיתי הוא
// src/lib/inventory-types.ts (קובץ "בטוח ל-client"), ראו הערה שם.
export { WASTE_REASONS, type WasteReason, type StockMoveKind };

/**
 * יצירת "כניסה" (ARRIVAL): פותחים אצווה חדשה. תאריך התפוגה נקבע באחת משתי דרכים:
 * (1) ברירת המחדל — מחושב אוטומטית מתוך shelf_life_hours של המוצר, ביחס לחותמת
 *     הזמן של הצילום עצמו; (2) אם הועבר expiryDateOverride (כשהעובד אישר תאריך
 *     שנקרא ממדבקת תוקף אמיתית על המוצר) — משתמשים בו במקום החישוב, ראו
 *     ARCHITECTURE.md → "קריאת מדבקות תוקף" ו-"תכנון Phase 2".
 */
export async function createBatchFromArrival(params: {
  branchId: string;
  productId: string;
  quantity: number;
  arrivalPhotoUrl: string;
  capturedAt: Date;
  shelfLifeHours: number;
  createdByUserId: string | null;
  expiryDateOverride?: string | null; // תאריך ISO (YYYY-MM-DD) שאושר ידנית על ידי העובד
}): Promise<string> {
  const batchId = randomUUID();
  if (params.expiryDateOverride) {
    await query(
      `insert into inventory_batches
         (id, branch_id, product_id, quantity, received_at, expiry_date,
          status, arrival_photo_url, created_by_user_id)
       values ($1, $2, $3, $4, $5::timestamptz, ($6::date + interval '1 day' - interval '1 second'), 'ACTIVE', $7, $8)`,
      [
        batchId,
        params.branchId,
        params.productId,
        params.quantity,
        params.capturedAt,
        params.expiryDateOverride,
        params.arrivalPhotoUrl,
        params.createdByUserId,
      ]
    );
  } else {
    await query(
      `insert into inventory_batches
         (id, branch_id, product_id, quantity, received_at, expiry_date,
          status, arrival_photo_url, created_by_user_id)
       values ($1, $2, $3, $4, $5::timestamptz, $5::timestamptz + ($6 || ' hours')::interval, 'ACTIVE', $7, $8)`,
      [
        batchId,
        params.branchId,
        params.productId,
        params.quantity,
        params.capturedAt,
        params.shelfLifeHours,
        params.arrivalPhotoUrl,
        params.createdByUserId,
      ]
    );
  }
  await query(
    `insert into stock_movements (id, batch_id, type, quantity, performed_by_user_id, note)
     values ($1, $2, 'RECEIVE', $3, $4, 'נוצר אוטומטית מצילום הגעה (Phase 2)')`,
    [randomUUID(), batchId, params.quantity, params.createdByUserId]
  );
  return batchId;
}

/**
 * סוגי "תנועה חלקית" נתמכים על אצווה קיימת — ראו ARCHITECTURE.md → "תנועות
 * מלאי חלקיות וסיבת זריקה". שלושתם מבוצעים בהקצאת FIFO על פני כמה אצוות
 * פעילות אם צריך (למשל: זריקה של 10 יחידות כשבאצווה הישנה ביותר נשארו רק 6 —
 * 4 הנוספות נלקחות אוטומטית מהאצווה הבאה בתור).
 *
 * - TO_SHELF / TO_FREEZER: הקצאה ממלאי שעדיין לא שויך לשום "כתובת" ולא נזרק.
 * - FREEZER_TO_SHELF: העברה פנימית מתוך מה שכבר סומן כ"במקפיא" למדף — לא
 *   נוגעת במלאי הלא-מוקצה, ולכן יש לה נוסחת "מקום פנוי" שונה.
 * - WASTE: זריקה בפועל. יכולה להגיע מכל אחת מהכתובות (או ממלאי לא-מוקצה) —
 *   בעולם האמיתי דברים נזרקים גם לפני שהם "רשמית" עלו למדף.
 */
interface BatchHeadroomRow {
  id: string;
  quantity: number;
  shelf_quantity: number;
  freezer_quantity: number;
  wasted_quantity: number;
}

function headroomFor(batch: BatchHeadroomRow, kind: StockMoveKind): number {
  switch (kind) {
    case "TO_SHELF":
    case "TO_FREEZER":
      return (
        batch.quantity - batch.shelf_quantity - batch.freezer_quantity - batch.wasted_quantity
      );
    case "FREEZER_TO_SHELF":
      return batch.freezer_quantity;
    case "WASTE":
      return batch.quantity - batch.wasted_quantity;
  }
}

export interface BatchAllocation {
  batchId: string;
  quantity: number;
}

export interface StockMoveResult {
  allocations: BatchAllocation[];
  allocatedTotal: number;
  /** כמות שלא ניתן היה לשייך למלאי רשום פעיל — לא חוסם את הפעולה, רק מדווח (ראו ARCHITECTURE.md) */
  unallocated: number;
}

/**
 * מבצע תנועת מלאי חלקית על פני כמה אצוות פעילות לפי FIFO (הישנה ביותר קודם),
 * בתוך עסקת DB אחת כדי שלא ייווצר מרוץ בין שתי בקשות בו-זמניות לאותו מוצר.
 * לא חוסם אם המלאי הרשום לא מספיק לכמות המבוקשת — מקצה כמה שאפשר ומדווח על
 * mismatch, כי המטרה היא לתעד אירוע פיזי אמיתי, לא לחסום עובד בגלל שהמערכת
 * "לא מסתדרת" (ייתכן פער בין המלאי הרשום לפיזי, ראו ARCHITECTURE.md).
 */
export async function applyStockMove(params: {
  branchId: string;
  productId: string;
  kind: StockMoveKind;
  quantity: number;
  performedByUserId: string | null;
  note?: string | null;
  reason?: WasteReason | null; // רלוונטי רק ל-kind="WASTE"
  disposalPhotoUrl?: string | null; // רלוונטי רק ל-kind="WASTE"
  capturedAt?: Date; // רלוונטי רק ל-kind="WASTE"
}): Promise<StockMoveResult> {
  return withTransaction(async (client) => {
    const { rows: batches } = await client.query<BatchHeadroomRow>(
      `select id, quantity, shelf_quantity, freezer_quantity, wasted_quantity
       from inventory_batches
       where branch_id = $1 and product_id = $2 and status = 'ACTIVE'
       order by received_at asc
       for update`,
      [params.branchId, params.productId]
    );

    const allocations: BatchAllocation[] = [];
    let remaining = params.quantity;

    for (const batch of batches) {
      if (remaining <= 0) break;
      const headroom = headroomFor(batch, params.kind);
      if (headroom <= 0) continue;
      const take = Math.min(headroom, remaining);
      allocations.push({ batchId: batch.id, quantity: take });
      remaining -= take;
      await applyAllocationToBatch(client, batch.id, params.kind, take, params);
    }

    const allocatedTotal = params.quantity - remaining;
    return { allocations, allocatedTotal, unallocated: remaining };
  });
}

async function applyAllocationToBatch(
  client: PoolClient,
  batchId: string,
  kind: StockMoveKind,
  amount: number,
  params: {
    performedByUserId: string | null;
    note?: string | null;
    reason?: WasteReason | null;
    disposalPhotoUrl?: string | null;
    capturedAt?: Date;
  }
): Promise<void> {
  switch (kind) {
    case "TO_SHELF":
      await client.query(
        `update inventory_batches set shelf_quantity = shelf_quantity + $2 where id = $1`,
        [batchId, amount]
      );
      await client.query(
        `insert into stock_movements (id, batch_id, type, quantity, performed_by_user_id, note)
         values ($1, $2, 'MOVE_TO_SHELF', $3, $4, $5)`,
        [randomUUID(), batchId, amount, params.performedByUserId, params.note ?? null]
      );
      return;
    case "TO_FREEZER":
      await client.query(
        `update inventory_batches set freezer_quantity = freezer_quantity + $2 where id = $1`,
        [batchId, amount]
      );
      await client.query(
        `insert into stock_movements (id, batch_id, type, quantity, performed_by_user_id, note)
         values ($1, $2, 'MOVE_TO_FREEZER', $3, $4, $5)`,
        [randomUUID(), batchId, amount, params.performedByUserId, params.note ?? null]
      );
      return;
    case "FREEZER_TO_SHELF":
      await client.query(
        `update inventory_batches
         set freezer_quantity = freezer_quantity - $2, shelf_quantity = shelf_quantity + $2
         where id = $1`,
        [batchId, amount]
      );
      await client.query(
        `insert into stock_movements (id, batch_id, type, quantity, performed_by_user_id, note)
         values ($1, $2, 'MOVE_TO_SHELF', $3, $4, $5)`,
        [
          randomUUID(),
          batchId,
          amount,
          params.performedByUserId,
          params.note ?? "הוצאה מהמקפיא למדף",
        ]
      );
      return;
    case "WASTE": {
      const { rows } = await client.query<{ quantity: number; wasted_quantity: number }>(
        `update inventory_batches
         set wasted_quantity = wasted_quantity + $2,
             disposed_at = coalesce($3, disposed_at),
             disposal_photo_url = coalesce($4, disposal_photo_url),
             disposed_by_user_id = coalesce($5, disposed_by_user_id)
         where id = $1
         returning quantity, wasted_quantity`,
        [
          batchId,
          amount,
          params.capturedAt ?? null,
          params.disposalPhotoUrl ?? null,
          params.performedByUserId,
        ]
      );
      const updated = rows[0];
      if (updated && updated.wasted_quantity >= updated.quantity) {
        await client.query(`update inventory_batches set status = 'REMOVED' where id = $1`, [
          batchId,
        ]);
      }
      await client.query(
        `insert into stock_movements (id, batch_id, type, quantity, performed_by_user_id, reason, note)
         values ($1, $2, 'WASTE', $3, $4, $5, $6)`,
        [
          randomUUID(),
          batchId,
          amount,
          params.performedByUserId,
          params.reason ?? null,
          params.note ?? null,
        ]
      );
      return;
    }
  }
}
