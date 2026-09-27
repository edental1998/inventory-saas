"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import {
  getTaskOwnership,
  startTask as startTaskQuery,
  completeTask as completeTaskQuery,
  toggleChecklistItem as toggleChecklistItemQuery,
  reassignTask as reassignTaskQuery,
} from "@/lib/data/tasks";
import type { TaskChecklistItem } from "@/lib/data/types";
import { query } from "@/lib/db";
import { getBranchForOrg } from "@/lib/data/branches";
import { isUserInBranch } from "@/lib/data/users";
import { saveUploadedImage, validateUploadedFile } from "@/lib/storage";

const TASK_TYPES = [
  "RECEIVE_DELIVERY",
  "RESTOCK_SHELF",
  "REMOVE_OLD_STOCK",
  "CHECK_EXPIRY",
  "CUSTOM",
] as const;

type ProofPhotoResult =
  | { ok: true; key: string | null }
  | { ok: false };

/**
 * מחלץ ומעלה תמונת הוכחה מה-FormData אם צורפה. מחזיר את מפתח האובייקט (מה
 * שנשמר ב-proof_photo_url) — לא URL. קובץ לא תקין (סוג/גודל) נדחה: ok=false,
 * והפעולה הקוראת מפסיקה — לא ממשיכה "בלי תמונה" בשקט כשכן נשלחה תמונה.
 */
async function extractProofPhotoKey(
  formData: FormData,
  organizationId: string,
  branchId: string
): Promise<ProofPhotoResult> {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { ok: true, key: null };
  if (validateUploadedFile(photo)) return { ok: false };
  const saved = await saveUploadedImage(photo, organizationId, branchId);
  return { ok: true, key: saved.key };
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
  const proof = await extractProofPhotoKey(
    formData,
    ownership.organizationId,
    ownership.branchId
  );
  if (!proof.ok) return;
  const proofPhotoUrl = proof.key;
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

  const proof = await extractProofPhotoKey(
    formData,
    ownership.organizationId,
    ownership.branchId
  );
  if (!proof.ok) return;
  const proofPhotoUrl = proof.key;
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
  // מנהל סניף יוצר משימות רק בסניף שלו; והסניף (גם למנכ"ל) חייב להיות של
  // הארגון של המשתמש — לא לסמוך על branchId שהגיע מהלקוח.
  if (session.role === "BRANCH_MANAGER" && session.branchId !== branchId) return;
  const branch = await getBranchForOrg(branchId, session.organizationId);
  if (!branch) return;

  const title = String(formData.get("title") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "CUSTOM");
  const type = TASK_TYPES.includes(typeRaw as (typeof TASK_TYPES)[number])
    ? typeRaw
    : "CUSTOM";
  const assignedToIdRaw = String(formData.get("assignedToId") ?? "");
  const assignedToId = assignedToIdRaw || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const photoRequired = formData.get("photoRequired") === "on";
  // רשימת בדיקה: שורה אחת לכל פריט בטופס — מזהה יציב לכל פריט (ראו B בתכנון)
  const checklistRaw = String(formData.get("checklist") ?? "");
  const checklistItems: TaskChecklistItem[] = checklistRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({ id: randomUUID(), label, done: false }));

  if (!title) return;
  // המשויך/ת חייב/ת להיות משתמש/ת באותו סניף (ולכן גם באותו ארגון)
  if (assignedToId && !(await isUserInBranch(assignedToId, branch.id))) return;

  await query(
    `insert into tasks
       (id, branch_id, type, title, description, checklist, photo_required, assigned_to_id, created_by_id, due_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, now())`,
    [
      randomUUID(),
      branch.id,
      type,
      title,
      description,
      checklistItems.length > 0 ? JSON.stringify(checklistItems) : null,
      photoRequired,
      assignedToId,
      session.userId,
    ]
  );

  revalidatePath("/", "layout");
}

/**
 * שיוך מחדש — רק מנהל/ת סניף, רק למשימה בסניף שלו/ה, ורק למשתמש/ת שנמצא/ת
 * באותו סניף (או ביטול שיוך, assignedToId ריק). המנכ"ל לא משייך/ת (צופה
 * בלבד); עובד/ת לא משייך/ת (יש לו/ה רק start/complete על המשימות שלו/ה).
 */
export async function reassignTaskAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "BRANCH_MANAGER") return;

  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;
  const newAssigneeIdRaw = String(formData.get("assignedToId") ?? "");
  const newAssigneeId = newAssigneeIdRaw || null;

  const ownership = await getTaskOwnership(taskId);
  if (!ownership) return;
  if (ownership.branchId !== session.branchId) return;
  if (ownership.status === "DONE") return;
  if (newAssigneeId && !(await isUserInBranch(newAssigneeId, ownership.branchId))) return;

  await reassignTaskQuery(taskId, newAssigneeId);
  revalidatePath("/", "layout");
}
