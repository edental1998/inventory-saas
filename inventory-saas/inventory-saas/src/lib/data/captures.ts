import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import type { WasteReason } from "./inventory";

export type CaptureEventType = "ARRIVAL" | "DISPOSAL";
export type CaptureStatus =
  | "AUTO_CONFIRMED"
  | "PENDING_REVIEW"
  | "PENDING_DATE_REVIEW"
  | "CONFIRMED"
  | "REJECTED";

export interface DbProductCapture {
  id: string;
  branchId: string;
  eventType: CaptureEventType;
  photoUrl: string;
  capturedByUserId: string | null;
  capturedAt: string;
  aiSuggestedProductId: string | null;
  aiConfidence: number | null;
  resolvedProductId: string | null;
  quantity: number | null;
  status: CaptureStatus;
  resultingBatchId: string | null;
  /** מדבקת תוקף שה-AI קרא מהתמונה עצמה — הצעה בלבד, ראו confirmedExpiryDate */
  detectedExpiryDate: string | null;
  detectedExpiryRawText: string | null;
  /** מה שהעובד בפועל אישר/ערך — זה מה שנכנס לאצווה, לא detectedExpiryDate הגולמי */
  confirmedExpiryDate: string | null;
  /** רלוונטי רק ל-eventType="DISPOSAL" — הסיבה שהעובד בחר לזריקה */
  wasteReason: WasteReason | null;
}

/**
 * עמודות מטיפוס `date` ב-Postgres חוזרות מה-driver (`pg`) כאובייקט JS Date,
 * לא כמחרוזת — צריך להמיר אותן במפורש בחזרה ל-"YYYY-MM-DD" (יום, בלי אזור
 * זמן), אחרת ערך כמו detected_expiry_date "דולף" כאובייקט Date לצד הלקוח
 * ושובר תצוגה של תאריך (input type="date" מצפה למחרוזת בפורמט הזה בדיוק).
 */
function toIsoDateString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapCaptureRow(row: Record<string, unknown>): DbProductCapture {
  return {
    id: row.id as string,
    branchId: row.branch_id as string,
    eventType: row.event_type as CaptureEventType,
    photoUrl: row.photo_url as string,
    capturedByUserId: (row.captured_by_user_id as string | null) ?? null,
    capturedAt: row.captured_at as string,
    aiSuggestedProductId: (row.ai_suggested_product_id as string | null) ?? null,
    aiConfidence: row.ai_confidence === null ? null : Number(row.ai_confidence),
    resolvedProductId: (row.resolved_product_id as string | null) ?? null,
    quantity: row.quantity === null ? null : Number(row.quantity),
    status: row.status as CaptureStatus,
    resultingBatchId: (row.resulting_batch_id as string | null) ?? null,
    detectedExpiryDate: toIsoDateString(row.detected_expiry_date),
    detectedExpiryRawText: (row.detected_expiry_raw_text as string | null) ?? null,
    confirmedExpiryDate: toIsoDateString(row.confirmed_expiry_date),
    wasteReason: (row.waste_reason as WasteReason | null) ?? null,
  };
}

/** יוצר את רשומת הצילום עצמה — תמיד, בין אם ה-AI בטוח ובין אם לא (יומן ביקורת מלא) */
export async function createCapture(params: {
  branchId: string;
  eventType: CaptureEventType;
  photoUrl: string;
  capturedByUserId: string | null;
  capturedAt: Date;
  aiSuggestedProductId: string | null;
  aiConfidence: number | null;
  aiRawResponse: string | null;
  status: CaptureStatus;
  resolvedProductId?: string | null;
  quantity?: number | null;
  resultingBatchId?: string | null;
  detectedExpiryDate?: string | null;
  detectedExpiryRawText?: string | null;
  wasteReason?: WasteReason | null;
}): Promise<string> {
  const id = randomUUID();
  await query(
    `insert into product_captures
       (id, branch_id, event_type, photo_url, captured_by_user_id, captured_at,
        ai_suggested_product_id, ai_confidence, ai_raw_response, status,
        resolved_product_id, quantity, resulting_batch_id,
        detected_expiry_date, detected_expiry_raw_text, waste_reason)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      id,
      params.branchId,
      params.eventType,
      params.photoUrl,
      params.capturedByUserId,
      params.capturedAt,
      params.aiSuggestedProductId,
      params.aiConfidence,
      params.aiRawResponse,
      params.status,
      params.resolvedProductId ?? null,
      params.quantity ?? null,
      params.resultingBatchId ?? null,
      params.detectedExpiryDate ?? null,
      params.detectedExpiryRawText ?? null,
      params.wasteReason ?? null,
    ]
  );
  return id;
}

/**
 * שלב ביניים: המוצר נקבע (אוטומטית או בבחירה ידנית) אבל זוהתה מדבקת תוקף —
 * לא יוצרים עדיין אצווה, רק מעדכנים את הסטטוס ל-PENDING_DATE_REVIEW ומחכים
 * לאישור/עריכה של העובד (ראו confirmExpiryDateAction).
 */
export async function markCapturePendingDateReview(params: {
  captureId: string;
  resolvedProductId: string;
  quantity: number | null;
}): Promise<void> {
  await query(
    `update product_captures
     set status = 'PENDING_DATE_REVIEW', resolved_product_id = $2, quantity = coalesce($3, quantity)
     where id = $1`,
    [params.captureId, params.resolvedProductId, params.quantity]
  );
}

/** אישור/עריכה סופיים של תאריך התפוגה — זה מה שבפועל נכנס לאצווה */
export async function confirmCaptureExpiryDate(params: {
  captureId: string;
  confirmedExpiryDate: string;
  resultingBatchId: string;
}): Promise<void> {
  await query(
    `update product_captures
     set status = 'CONFIRMED', confirmed_expiry_date = $2, resulting_batch_id = $3
     where id = $1`,
    [params.captureId, params.confirmedExpiryDate, params.resultingBatchId]
  );
}

export async function getCaptureById(
  id: string
): Promise<DbProductCapture | null> {
  const { rows } = await query(
    `select * from product_captures where id = $1`,
    [id]
  );
  const row = rows[0];
  return row ? mapCaptureRow(row) : null;
}

/** לבדיקת הרשאה: לאיזה ארגון/סניף שייך הצילום, כדי שאישור ידני לא "יזלוג" בין ארגונים */
export async function getCaptureOwnership(
  captureId: string
): Promise<{ branchId: string; organizationId: string } | null> {
  const { rows } = await query<{ branch_id: string; organization_id: string }>(
    `select pc.branch_id, b.organization_id
     from product_captures pc
     join branches b on b.id = pc.branch_id
     where pc.id = $1`,
    [captureId]
  );
  const row = rows[0];
  return row ? { branchId: row.branch_id, organizationId: row.organization_id } : null;
}

export async function resolveCapture(params: {
  captureId: string;
  status: "CONFIRMED" | "REJECTED";
  resolvedProductId?: string | null;
  quantity?: number | null;
  resultingBatchId?: string | null;
}): Promise<void> {
  await query(
    `update product_captures
     set status = $2, resolved_product_id = $3, quantity = coalesce($4, quantity),
         resulting_batch_id = $5
     where id = $1`,
    [
      params.captureId,
      params.status,
      params.resolvedProductId ?? null,
      params.quantity ?? null,
      params.resultingBatchId ?? null,
    ]
  );
}

/** רשימת הצילומים האחרונים בסניף — למסך "היסטוריית צילומים" בדשבורד מנהל הסניף */
export async function getRecentCapturesForBranch(
  branchId: string,
  limit = 20
): Promise<
  (DbProductCapture & { productNameHe: string | null; capturedByName: string | null })[]
> {
  const { rows } = await query(
    `select pc.*, p.name_he as product_name_he, u.name as captured_by_name
     from product_captures pc
     left join products p on p.id = coalesce(pc.resolved_product_id, pc.ai_suggested_product_id)
     left join users u on u.id = pc.captured_by_user_id
     where pc.branch_id = $1
     order by pc.captured_at desc
     limit $2`,
    [branchId, limit]
  );
  return rows.map((row) => ({
    ...mapCaptureRow(row),
    productNameHe: (row.product_name_he as string | null) ?? null,
    capturedByName: (row.captured_by_name as string | null) ?? null,
  }));
}
