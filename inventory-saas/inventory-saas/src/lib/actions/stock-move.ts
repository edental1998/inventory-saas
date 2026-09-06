"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import { getProductById } from "@/lib/data/products";
import { applyStockMove, type StockMoveKind } from "@/lib/data/inventory";

export type StockMoveActionResult =
  | { kind: "error"; message: string }
  | { kind: "done"; allocatedTotal: number; unallocated: number };

/**
 * עדכון כמות "בלי צילום" — העברה למדף, כניסה למקפיא, או הוצאה מהמקפיא למדף
 * (ראו ARCHITECTURE.md → "תנועות מלאי חלקיות וסיבת זריקה"). בכוונה בלי מצלמה
 * ובלי AI: זו לא תיעוד לצורך יצירת/סגירת אצווה חדשה, אלא רק "איפה בדיוק נמצאת
 * הכמות שכבר נקלטה" — לכן העובד בוחר מוצר מרשימה ומקליד כמות, בלי צילום נוסף.
 */
export async function moveStockAction(
  branchId: string,
  productId: string,
  kind: Exclude<StockMoveKind, "WASTE">,
  quantity: number
): Promise<StockMoveActionResult> {
  const session = await getSession();
  if (!session) return { kind: "error", message: "not_authenticated" };
  if (session.role === "CHAIN_MANAGER" || session.branchId !== branchId) {
    return { kind: "error", message: "not_authorized" };
  }
  if (!quantity || quantity <= 0) {
    return { kind: "error", message: "missing_quantity" };
  }

  const product = await getProductById(productId);
  if (!product || product.organizationId !== session.organizationId) {
    return { kind: "error", message: "unknown_product" };
  }

  const move = await applyStockMove({
    branchId,
    productId,
    kind,
    quantity,
    performedByUserId: session.userId,
  });

  revalidatePath("/", "layout");
  return { kind: "done", allocatedTotal: move.allocatedTotal, unallocated: move.unallocated };
}
