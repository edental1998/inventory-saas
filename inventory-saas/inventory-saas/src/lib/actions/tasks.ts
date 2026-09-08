"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import {
  getTaskOwnership,
  markTaskDone as markTaskDoneQuery,
  startTask as startTaskQuery,
  completeTask as completeTaskQuery,
  toggleChecklistItem as toggleChecklistItemQuery,
} from "@/lib/data/tasks";
import { query } from "@/lib/db";
import { saveUploadedImage } from "@/lib/storage/local";

/** מחלץ תמונת הוכחה מה-FormData אם צורפה (אותה מוסכמה כמו src/lib/actions/captures.ts) */
async function extractProofPhotoUrl(
  formData: FormData,
  organizationId: string,
  branchId: string
): Promise<string | null> {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return null;
  const saved = await saveUploadedImage(photo, organizationId, branchId);
  return saved.url;
}

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

/**
 * "התחל משימה" — רק מי שהמשימה משויכת אליו/ה (עובד/ת, או מנהל/ת סניף
 * שהמשימה הוקצתה אליו/ה אישית דרך "המשימות שלי"). בכוונה בלי חריג לפי
 * תפקיד: started_at אמור לשקף עבודה אמיתית שהתחילה, לא לחיצה של מנהל/ת
 * בשם עובד/ת. מנכ"ל לא יכול "להתחיל" משימה בכלל — צפייה בלבד בדשבורד שלו.
 */
export async function startTaskAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role === "CHAIN_MANAGER") return;

  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  const ownership = await getTaskOwnership(taskId);
  if (!ownership) return;
  if (ownership.assignedToId !== session.userId) return;
  if (ownership.status !== "PENDING") return;

  await startTaskQuery(taskId, session.userId);
  revalidatePath("/", "layout");
}

/**
 * "השלם משימה" — השלמה עצמית רגילה: רק מי שהמשימה משויכת אליו/ה. אם
 * photo_required, חובה לצרף תמונה — אחרת הפעולה נדחית בשקט (ה-UI אמור
 * למנוע את זה מראש, אבל זו האכיפה האמיתית, בצד השרת).
 */
export async function completeTaskAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role === "CHAIN_MANAGER") return;

  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  const ownership = await getTaskOwnership(taskId);
  if (!ownership) return;
  if (ownership.assignedToId !== session.userId) return;
  if (ownership.status === "DONE") return;

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const proofPhotoUrl = await extractProofPhotoUrl(
    formData,
    ownership.organizationId,
    ownership.branchId
  );
  if (ownership.photoRequired && !proofPhotoUrl) return;

  await completeTaskQuery(taskId, session.userId, { notes, proofPhotoUrl });
  revalidatePath("/", "layout");
}

/**
 * עקיפת מנהל/ת סניף: משלים/ה משימה ששויכה למישהו אחר, כשצריך מבחינה
 * תפעולית. רק BRANCH_MANAGER (לא מנכ"ל — צופה בלבד; לא עובד/ת — יש לו/ה
 * completeTaskAction הרגיל למשימות שלו/ה עצמו/ה), ורק בסניף שלו/ה. תמיד
 * עם completion_notes לא ריק — זה מה שמתעד את הסיבה לעקיפה (בכוונה בלי
 * שדה נפרד בסכמה, ראו תכנון). completed_by_id נכתב כ-session.userId
 * (המנהל/ת) — לעולם לא "בשם" assignedToId, כדי שהעקיפה תישאר גלויה בנתונים.
 */
export async function overrideCompleteTaskAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "BRANCH_MANAGER") return;

  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  const ownership = await getTaskOwnership(taskId);
  if (!ownership) return;
  if (ownership.branchId !== session.branchId) return;
  if (ownership.status === "DONE") return;

  const notes = String(formData.get("notes") ?? "").trim();
  if (!notes) return;

  const proofPhotoUrl = await extractProofPhotoUrl(
    formData,
    ownership.organizationId,
    ownership.branchId
  );
  if (ownership.photoRequired && !proofPhotoUrl) return;

  await completeTaskQuery(taskId, session.userId, { notes, proofPhotoUrl });
  revalidatePath("/", "layout");
}

/**
 * סימון/ביטול פריט ברשימת המשימות (checklist) — כמו start/complete, רק
 * למי שהמשימה משויכת אליו/ה: זה חלק מ"ביצוע" המשימה, לא מניהול שלה.
 */
export async function toggleChecklistItemAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role === "CHAIN_MANAGER") return;

  const taskId = String(formData.get("taskId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!taskId || !itemId) return;
  const done = formData.get("done") === "true";

  const ownership = await getTaskOwnership(taskId);
  if (!ownership) return;
  if (ownership.assignedToId !== session.userId) return;

  await toggleChecklistItemQuery(taskId, itemId, done);
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
