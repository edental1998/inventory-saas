"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import { saveUploadedImage } from "@/lib/storage/local";
import {
  classifyProductPhoto,
  AUTO_CONFIRM_CONFIDENCE_THRESHOLD,
} from "@/lib/ai/classify-product";
import { getProductsForOrg, getProductById } from "@/lib/data/products";
import {
  createCapture,
  getCaptureById,
  getCaptureOwnership,
  resolveCapture,
  markCapturePendingDateReview,
  confirmCaptureExpiryDate,
  type CaptureEventType,
} from "@/lib/data/captures";
import {
  createBatchFromArrival,
  applyStockMove,
  WASTE_REASONS,
  type WasteReason,
} from "@/lib/data/inventory";

function parseWasteReason(value: FormDataEntryValue | null): WasteReason | null {
  const str = typeof value === "string" ? value : "";
  return (WASTE_REASONS as string[]).includes(str) ? (str as WasteReason) : null;
}

export interface CaptureCandidate {
  productId: string;
  nameHe: string;
  nameEn: string;
  confidence: number;
}

export type CaptureActionResult =
  | { kind: "error"; message: string }
  | {
      kind: "auto_confirmed";
      eventType: CaptureEventType;
      nameHe: string;
      nameEn: string;
      quantity: number;
      batchFound: boolean;
      /** ב-DISPOSAL בלבד: כמה מהכמות שהוזנה לא ניתן היה לשייך למלאי רשום פעיל (ראו ARCHITECTURE.md) */
      unallocated?: number;
    }
  | {
      kind: "pending_review";
      captureId: string;
      eventType: CaptureEventType;
      photoUrl: string;
      candidates: CaptureCandidate[];
      allProducts: { id: string; nameHe: string; nameEn: string }[];
    }
  | {
      kind: "pending_date_review";
      captureId: string;
      nameHe: string;
      nameEn: string;
      quantity: number;
      detectedExpiryDate: string;
      detectedExpiryRawText: string | null;
    };

/**
 * הפעולה המרכזית של Phase 2: מקבלת תמונה שצולמה (הגעה/זריקה), שומרת אותה,
 * מנסה לזהות את המוצר בעזרת AI, ומחליטה לפי סף הביטחון אם לבצע את הפעולה
 * אוטומטית או להחזיר לעובד מסך בחירה. בצילומי ARRIVAL גם מנסה לקרוא מדבקת
 * תוקף מהתמונה — אבל זו *תמיד* רק הצעה שדורשת אישור/עריכה מפורשים של העובד
 * (ראו confirmExpiryDateAction), גם אם זיהוי המוצר עצמו היה חד-משמעי.
 * ראו ARCHITECTURE.md → "תכנון Phase 2" ו-"קריאת מדבקות תוקף".
 */
export async function captureProductAction(
  branchId: string,
  eventType: CaptureEventType,
  formData: FormData
): Promise<CaptureActionResult> {
  const session = await getSession();
  if (!session) return { kind: "error", message: "not_authenticated" };
  // רק עובד/מנהל סניף מצלמים, ורק בסניף שלהם — בדיוק כמו סימון משימה כבוצעה
  if (session.role === "CHAIN_MANAGER" || session.branchId !== branchId) {
    return { kind: "error", message: "not_authorized" };
  }

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { kind: "error", message: "missing_photo" };
  }
  const quantityRaw = formData.get("quantity");
  const quantity = quantityRaw ? Number(quantityRaw) : null;
  if (!quantity || quantity <= 0) {
    // כמות נדרשת גם ב-ARRIVAL (כמה הגיע) וגם ב-DISPOSAL (כמה נזרק בפועל —
    // ראו ARCHITECTURE.md → "תנועות מלאי חלקיות": זריקה כבר לא חייבת לסגור
    // אצווה שלמה).
    return { kind: "error", message: "missing_quantity" };
  }
  const wasteReason = eventType === "DISPOSAL" ? parseWasteReason(formData.get("wasteReason")) : null;
  if (eventType === "DISPOSAL" && !wasteReason) {
    return { kind: "error", message: "missing_waste_reason" };
  }

  const saved = await saveUploadedImage(photo, session.organizationId, branchId);
  const capturedAt = new Date();

  const products = await getProductsForOrg(session.organizationId);
  const classification = await classifyProductPhoto(
    saved.absolutePath,
    saved.mimeType,
    products.map((p) => ({
      id: p.id,
      nameHe: p.nameHe,
      nameEn: p.nameEn,
      category: p.category,
      referencePhotoUrl: p.referencePhotoUrl,
    })),
    { detectExpiryLabel: eventType === "ARRIVAL" }
  );

  const best = classification.candidates[0];
  const isAutoConfirmed =
    !!best && best.confidence >= AUTO_CONFIRM_CONFIDENCE_THRESHOLD;

  if (isAutoConfirmed) {
    const product = await getProductById(best.productId);
    if (product) {
      // מוצר זוהה בביטחון גבוה — אבל אם התגלתה גם מדבקת תוקף, עדיין עוצרים
      // כאן ומבקשים מהעובד לאשר/לערוך את התאריך לפני שיוצרים אצווה כלשהי.
      if (eventType === "ARRIVAL" && classification.detectedExpiryDate) {
        const captureId = await createCapture({
          branchId,
          eventType,
          photoUrl: saved.url,
          capturedByUserId: session.userId,
          capturedAt,
          aiSuggestedProductId: best.productId,
          aiConfidence: best.confidence,
          aiRawResponse: classification.rawResponse,
          status: "PENDING_DATE_REVIEW",
          resolvedProductId: product.id,
          quantity,
          detectedExpiryDate: classification.detectedExpiryDate,
          detectedExpiryRawText: classification.detectedExpiryRawText,
        });
        return {
          kind: "pending_date_review",
          captureId,
          nameHe: product.nameHe,
          nameEn: product.nameEn,
          quantity: quantity ?? 0,
          detectedExpiryDate: classification.detectedExpiryDate,
          detectedExpiryRawText: classification.detectedExpiryRawText,
        };
      }

      const result = await applyResolvedCapture({
        branchId,
        eventType,
        productId: product.id,
        quantity,
        capturedAt,
        performedByUserId: session.userId,
        photoUrl: saved.url,
        wasteReason,
      });
      if (result) {
        await createCapture({
          branchId,
          eventType,
          photoUrl: saved.url,
          capturedByUserId: session.userId,
          capturedAt,
          aiSuggestedProductId: best.productId,
          aiConfidence: best.confidence,
          aiRawResponse: classification.rawResponse,
          status: "AUTO_CONFIRMED",
          resolvedProductId: product.id,
          quantity: result.quantity,
          resultingBatchId: result.batchId,
          wasteReason,
        });
        revalidatePath("/", "layout");
        return {
          kind: "auto_confirmed",
          eventType,
          nameHe: product.nameHe,
          nameEn: product.nameEn,
          quantity: result.quantity,
          batchFound: eventType === "ARRIVAL" || result.batchId !== null,
          unallocated: result.unallocated,
        };
      }
    }
  }

  // ה-AI לא בטוח מספיק לגבי זהות המוצר (או שאין מפתח מוגדר בכלל) — שומרים
  // לבדיקה ידנית של העובד. אם בכל זאת זוהתה מדבקת תוקף, שומרים אותה כאן
  // ומעבירים אותה הלאה — היא תוצג לאישור רק אחרי שהעובד יבחר את המוצר הנכון.
  // כמות וסיבת זריקה (אם רלוונטי) כבר נאספו למעלה ונשמרות כאן — לא יבוקשו שוב
  // מהעובד במסך הבחירה הידנית.
  const captureId = await createCapture({
    branchId,
    eventType,
    photoUrl: saved.url,
    capturedByUserId: session.userId,
    capturedAt,
    aiSuggestedProductId: best?.productId ?? null,
    aiConfidence: best?.confidence ?? null,
    aiRawResponse: classification.rawResponse,
    wasteReason,
    status: "PENDING_REVIEW",
    quantity,
    detectedExpiryDate: classification.detectedExpiryDate,
    detectedExpiryRawText: classification.detectedExpiryRawText,
  });

  const productsById = new Map(products.map((p) => [p.id, p]));
  const candidates: CaptureCandidate[] = classification.candidates
    .map((c) => {
      const p = productsById.get(c.productId);
      return p
        ? { productId: p.id, nameHe: p.nameHe, nameEn: p.nameEn, confidence: c.confidence }
        : null;
    })
    .filter((c): c is CaptureCandidate => c !== null);

  return {
    kind: "pending_review",
    captureId,
    eventType,
    photoUrl: saved.url,
    candidates,
    allProducts: products.map((p) => ({ id: p.id, nameHe: p.nameHe, nameEn: p.nameEn })),
  };
}

/**
 * אישור ידני של עובד למסך "בחירה" (או תיקון ניחוש AI שגוי) — אותה לוגיקת
 * יצירת/סגירת אצווה כמו במסלול האוטומטי, רק שהמוצר נבחר בידיים. אם התגלתה
 * מדבקת תוקף על התמונה הזו, גם כאן עוצרים לפני יצירת אצווה ומעבירים לאישור
 * תאריך (ראו captureProductAction ו-confirmExpiryDateAction).
 */
export async function confirmCaptureAction(
  captureId: string,
  productId: string,
  quantity: number | null
): Promise<CaptureActionResult> {
  const session = await getSession();
  if (!session) return { kind: "error", message: "not_authenticated" };

  const ownership = await getCaptureOwnership(captureId);
  if (!ownership || ownership.organizationId !== session.organizationId) {
    return { kind: "error", message: "not_authorized" };
  }
  if (session.role !== "CHAIN_MANAGER" && ownership.branchId !== session.branchId) {
    return { kind: "error", message: "not_authorized" };
  }

  const capture = await getCaptureById(captureId);
  if (!capture || capture.status !== "PENDING_REVIEW") {
    return { kind: "error", message: "capture_not_pending" };
  }

  const product = await getProductById(productId);
  if (!product) return { kind: "error", message: "unknown_product" };

  const finalQuantity = quantity ?? capture.quantity;

  if (capture.eventType === "ARRIVAL" && capture.detectedExpiryDate) {
    await markCapturePendingDateReview({
      captureId,
      resolvedProductId: productId,
      quantity: finalQuantity,
    });
    return {
      kind: "pending_date_review",
      captureId,
      nameHe: product.nameHe,
      nameEn: product.nameEn,
      quantity: finalQuantity ?? 0,
      detectedExpiryDate: capture.detectedExpiryDate,
      detectedExpiryRawText: capture.detectedExpiryRawText,
    };
  }

  const result = await applyResolvedCapture({
    branchId: ownership.branchId,
    eventType: capture.eventType,
    productId,
    quantity: finalQuantity,
    capturedAt: new Date(capture.capturedAt),
    performedByUserId: session.userId,
    photoUrl: capture.photoUrl,
    // סיבת הזריקה כבר נאספה מהעובד בטופס הראשוני (captureProductAction) —
    // מסך הבחירה הידנית לא שואל אותה שוב, רק בורר את המוצר הנכון.
    wasteReason: capture.wasteReason,
  });
  if (!result) return { kind: "error", message: "batch_not_found" };

  await resolveCapture({
    captureId,
    status: "CONFIRMED",
    resolvedProductId: productId,
    quantity: result.quantity,
    resultingBatchId: result.batchId,
  });
  revalidatePath("/", "layout");

  return {
    kind: "auto_confirmed",
    eventType: capture.eventType,
    nameHe: product.nameHe,
    nameEn: product.nameEn,
    quantity: result.quantity,
    batchFound: capture.eventType === "ARRIVAL" || result.batchId !== null,
    unallocated: result.unallocated,
  };
}

/**
 * השלב האחרון של "קריאת מדבקת תוקף": העובד אישר או ערך את התאריך שה-AI
 * הציע, ורק עכשיו — לא לפני כן — נוצרת האצווה בפועל, עם התאריך המאושר
 * (לא הניחוש הגולמי). ראו ARCHITECTURE.md → "קריאת מדבקות תוקף".
 */
export async function confirmExpiryDateAction(
  captureId: string,
  confirmedDateIso: string,
  quantityOverride: number | null
): Promise<CaptureActionResult> {
  const session = await getSession();
  if (!session) return { kind: "error", message: "not_authenticated" };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(confirmedDateIso)) {
    return { kind: "error", message: "invalid_date" };
  }

  const ownership = await getCaptureOwnership(captureId);
  if (!ownership || ownership.organizationId !== session.organizationId) {
    return { kind: "error", message: "not_authorized" };
  }
  if (session.role !== "CHAIN_MANAGER" && ownership.branchId !== session.branchId) {
    return { kind: "error", message: "not_authorized" };
  }

  const capture = await getCaptureById(captureId);
  if (
    !capture ||
    capture.status !== "PENDING_DATE_REVIEW" ||
    capture.eventType !== "ARRIVAL" ||
    !capture.resolvedProductId
  ) {
    return { kind: "error", message: "capture_not_pending" };
  }

  const quantity = quantityOverride ?? capture.quantity;
  if (!quantity || quantity <= 0) return { kind: "error", message: "missing_quantity" };

  const product = await getProductById(capture.resolvedProductId);
  if (!product) return { kind: "error", message: "unknown_product" };

  const batchId = await createBatchFromArrival({
    branchId: ownership.branchId,
    productId: product.id,
    quantity,
    arrivalPhotoUrl: capture.photoUrl,
    capturedAt: new Date(capture.capturedAt),
    shelfLifeHours: product.shelfLifeHours,
    createdByUserId: session.userId,
    expiryDateOverride: confirmedDateIso,
  });

  await confirmCaptureExpiryDate({ captureId, confirmedExpiryDate: confirmedDateIso, resultingBatchId: batchId });
  revalidatePath("/", "layout");

  return {
    kind: "auto_confirmed",
    eventType: "ARRIVAL",
    nameHe: product.nameHe,
    nameEn: product.nameEn,
    quantity,
    batchFound: true,
  };
}

export async function rejectCaptureAction(captureId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const ownership = await getCaptureOwnership(captureId);
  if (!ownership || ownership.organizationId !== session.organizationId) return;
  await resolveCapture({ captureId, status: "REJECTED" });
  revalidatePath("/", "layout");
}

/** ליבת ה-ARRIVAL/DISPOSAL המשותפת למסלול האוטומטי ולמסלול הידני, כשאין מדבקת תוקף לאשר */
async function applyResolvedCapture(params: {
  branchId: string;
  eventType: CaptureEventType;
  productId: string;
  quantity: number | null;
  capturedAt: Date;
  performedByUserId: string;
  photoUrl: string;
  wasteReason?: WasteReason | null;
}): Promise<{ batchId: string | null; quantity: number; unallocated: number } | null> {
  if (params.eventType === "ARRIVAL") {
    if (!params.quantity || params.quantity <= 0) return null;
    const product = await getProductById(params.productId);
    if (!product) return null;
    const batchId = await createBatchFromArrival({
      branchId: params.branchId,
      productId: params.productId,
      quantity: params.quantity,
      arrivalPhotoUrl: params.photoUrl,
      capturedAt: params.capturedAt,
      shelfLifeHours: product.shelfLifeHours,
      createdByUserId: params.performedByUserId,
    });
    return { batchId, quantity: params.quantity, unallocated: 0 };
  }

  // DISPOSAL: מקצים את הכמות שנזרקה בפועל על פני האצוות הפעילות של אותו מוצר
  // באותו סניף, הישנה ביותר קודם (FIFO, יכול להתפרס על יותר מאצווה אחת —
  // ראו ARCHITECTURE.md → "תנועות מלאי חלקיות וסיבת זריקה"). אם אין שום אצווה
  // פעילה — עדיין מתעדים את הצילום עצמו, בלי לקשר אצווה (מקרה קצה).
  if (!params.quantity || params.quantity <= 0) return null;
  const move = await applyStockMove({
    branchId: params.branchId,
    productId: params.productId,
    kind: "WASTE",
    quantity: params.quantity,
    performedByUserId: params.performedByUserId,
    reason: params.wasteReason ?? null,
    disposalPhotoUrl: params.photoUrl,
    capturedAt: params.capturedAt,
  });
  const primaryBatchId = move.allocations[0]?.batchId ?? null;
  return { batchId: primaryBatchId, quantity: move.allocatedTotal, unallocated: move.unallocated };
}
