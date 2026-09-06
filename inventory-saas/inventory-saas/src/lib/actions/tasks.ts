"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import { getTaskOwnership, markTaskDone as markTaskDoneQuery } from "@/lib/data/tasks";
import { query } from "@/lib/db";

/**
 * מסמן משימה כבוצעה — כתיבה אמיתית ל-DB, לא רק שינוי בממשק.
 * עובד יכול לסמן רק משימה ששויכה אליו; מנהל סניף/הנהלה יכולים לסמן כל משימה.
 */
export async function markTaskDoneAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  const ownership = await getTaskOwnership(taskId);
  if (!ownership) return;

  // עובד: רק המשימה שהוקצתה לו. מנהל סניף: רק משימות של הסניף שלו.
  // מנהל רשת: כל משימה, אבל רק בתוך הארגון שלו — לא ארגון אחר לגמרי.
  const allowed =
    ownership.assignedToId === session.userId ||
    (session.role === "BRANCH_MANAGER" &&
      ownership.branchId === session.branchId) ||
    (session.role === "CHAIN_MANAGER" &&
      ownership.organizationId === session.organizationId);
  if (!allowed) return;

  await markTaskDoneQuery(taskId);
  revalidatePath("/", "layout");
}

/** יצירת משימה חדשה בסניף — רק למנהל סניף/הנהלה (נבדק בשרת, לא רק בממשק) */
export async function createTaskAction(
  branchId: string,
  formData: FormData
): Promise<void> {
  const session = await getSession();
  if (!session || session.role === "EMPLOYEE") return;

  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "CUSTOM");
  const assignedToIdRaw = String(formData.get("assignedToId") ?? "");
  const assignedToId = assignedToIdRaw || null;

  if (!title) return;

  await query(
    `insert into tasks (id, branch_id, type, title, assigned_to_id, created_by_id, due_at)
     values ($1, $2, $3, $4, $5, $6, now())`,
    [randomUUID(), branchId, type, title, assignedToId, session.userId]
  );

  revalidatePath("/", "layout");
}
