import { query } from "@/lib/db";
import type { DbTask, TaskChecklistItem } from "./types";

const TASK_SELECT = `
  select tsk.id, tsk.type, tsk.title, tsk.description, tsk.status, tsk.photo_required,
         tsk.proof_photo_url, tsk.due_at, tsk.started_at, tsk.started_by_id,
         tsk.completed_at, tsk.completed_by_id, tsk.completion_notes, tsk.checklist,
         tsk.assigned_to_id, u.name as assigned_to_name,
         tsk.branch_id, b.name as branch_name, b.timezone as branch_timezone
  from tasks tsk
  join branches b on b.id = tsk.branch_id
  left join users u on u.id = tsk.assigned_to_id
`;

const STATUS_ORDER = `case tsk.status
  when 'OVERDUE' then 0
  when 'PENDING' then 1
  when 'IN_PROGRESS' then 2
  else 3 end`;

function mapTaskRow(row: Record<string, unknown>): DbTask {
  return {
    id: row.id as string,
    type: row.type as DbTask["type"],
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    status: row.status as DbTask["status"],
    assignedToId: (row.assigned_to_id as string | null) ?? null,
    assignedToName: (row.assigned_to_name as string | null) ?? null,
    branchId: row.branch_id as string,
    branchName: row.branch_name as string,
    branchTimezone: row.branch_timezone as string,
    photoRequired: row.photo_required as boolean,
    proofPhotoUrl: (row.proof_photo_url as string | null) ?? null,
    dueAt: row.due_at ? new Date(row.due_at as string).toISOString() : null,
    startedAt: row.started_at ? new Date(row.started_at as string).toISOString() : null,
    startedById: (row.started_by_id as string | null) ?? null,
    completedAt: row.completed_at ? new Date(row.completed_at as string).toISOString() : null,
    completedById: (row.completed_by_id as string | null) ?? null,
    completionNotes: (row.completion_notes as string | null) ?? null,
    checklist: (row.checklist as TaskChecklistItem[] | null) ?? null,
  };
}

export async function getTasksForBranch(branchId: string): Promise<DbTask[]> {
  const { rows } = await query(
    `${TASK_SELECT} where tsk.branch_id = $1 order by ${STATUS_ORDER}, tsk.created_at asc`,
    [branchId]
  );
  return rows.map(mapTaskRow);
}

/** כל המשימות בכל סניפי הארגון — לתצוגת מעקב כלל-רשתית (מסך "משימות כל הסניפים") */
export async function getTasksForOrg(organizationId: string): Promise<DbTask[]> {
  const { rows } = await query(
    `${TASK_SELECT} where b.organization_id = $1 order by b.name, ${STATUS_ORDER}, tsk.created_at asc`,
    [organizationId]
  );
  return rows.map(mapTaskRow);
}

export async function getOpenTasksForUser(userId: string): Promise<DbTask[]> {
  const { rows } = await query(
    `${TASK_SELECT} where tsk.assigned_to_id = $1 and tsk.status <> 'DONE'
     order by ${STATUS_ORDER}, tsk.created_at asc`,
    [userId]
  );
  return rows.map(mapTaskRow);
}

/**
 * כל המשימות הרלוונטיות ל"היום שלי": פתוחות (בכל סטטוס שאינו DONE) + מה
 * שהושלם היום — לפי היום העסקי-מקומי של הסניף (b.timezone), לא חצות UTC.
 * הפילוח בפועל לארבע הקבוצות (עכשיו/קרובות/באיחור/הושלמו היום) נעשה
 * בקוד הקורא (src/app/.../employee/dashboard/page.tsx) לפי אותו אזור זמן.
 */
export async function getTasksForUserToday(userId: string): Promise<DbTask[]> {
  const { rows } = await query(
    `${TASK_SELECT}
     where tsk.assigned_to_id = $1
       and (
         tsk.status <> 'DONE'
         or (tsk.completed_at at time zone b.timezone)::date = (now() at time zone b.timezone)::date
       )
     order by ${STATUS_ORDER}, tsk.due_at asc nulls last, tsk.created_at asc`,
    [userId]
  );
  return rows.map(mapTaskRow);
}

/** משימה בודדת לפי מזהה — לעמוד הפרטים. ה-caller אחראי לבדוק הרשאה (assignedToId/branchId) אחרי השליפה */
export async function getTaskById(taskId: string): Promise<DbTask | null> {
  const { rows } = await query(`${TASK_SELECT} where tsk.id = $1`, [taskId]);
  const row = rows[0];
  return row ? mapTaskRow(row) : null;
}

/**
 * מסמן משימה כבוצעה. נשמר בפועל ב-DB (completed_at + status), לא רק בממשק.
 * ההרשאה (מי מותר לו לסמן איזו משימה) נבדקת ברמת ה-Server Action שקורא לפונקציה
 * הזו, לפני שהיא נקראת — כאן רק מבצעים את העדכון בפועל.
 */
export async function markTaskDone(taskId: string): Promise<void> {
  await query(
    `update tasks set status = 'DONE', completed_at = now() where id = $1`,
    [taskId]
  );
}

/**
 * לבדיקת הרשאה לפני שינוי סטטוס: מי משויך למשימה, באיזה סניף היא, לאיזה
 * ארגון הסניף שייך, מה הסטטוס הנוכחי שלה והאם נדרשת תמונה — כדי שמנהל
 * רשת/סניף לא יוכל לפעול על משימה שמשויכת ל-organization/branch אחר לגמרי
 * (גם אם ה-taskId נשלח ידנית), ושכל Server Action יוכל לאכוף לוגיקת מעברי
 * מצב (למשל: אי אפשר "להתחיל" משימה שכבר הושלמה) בלי שאילתה נוספת.
 */
export async function getTaskOwnership(taskId: string): Promise<{
  assignedToId: string | null;
  branchId: string;
  organizationId: string;
  status: DbTask["status"];
  photoRequired: boolean;
} | null> {
  const { rows } = await query(
    `select tsk.assigned_to_id, tsk.branch_id, b.organization_id, tsk.status, tsk.photo_required
     from tasks tsk
     join branches b on b.id = tsk.branch_id
     where tsk.id = $1`,
    [taskId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    assignedToId: row.assigned_to_id,
    branchId: row.branch_id,
    organizationId: row.organization_id,
    status: row.status,
    photoRequired: row.photo_required,
  };
}

/**
 * "התחל משימה": PENDING → IN_PROGRESS, עם started_at/started_by_id אמיתיים.
 * ה-where מגן על עצמו גם ברמת ה-DB (לא רק בשכבת ה-action) — מעבר מצב תקין
 * רק אם המשימה עדיין PENDING בפועל, מונע race של שני קליקים במקביל.
 */
export async function startTask(taskId: string, userId: string): Promise<void> {
  await query(
    `update tasks
     set status = 'IN_PROGRESS', started_at = now(), started_by_id = $2
     where id = $1 and status = 'PENDING'`,
    [taskId, userId]
  );
}

/**
 * "השלם משימה" — משותף להשלמה עצמית (עובד/מנהל שהמשימה שויכה אליו) ולעקיפת
 * מנהל סניף (completed_by_id שונה מ-assigned_to_id מסמן עקיפה — ראו תיעוד
 * ב-completion_notes; ההבחנה עצמה נגזרת מהנתונים, לא נשמרת כדגל נפרד).
 * אכיפת photo_required ו-completion_notes חובה בעקיפה נעשית ברמת ה-action,
 * לפני הקריאה לפונקציה הזו — כאן רק כתיבה.
 */
export async function completeTask(
  taskId: string,
  userId: string,
  opts: { notes: string | null; proofPhotoUrl: string | null }
): Promise<void> {
  await query(
    `update tasks
     set status = 'DONE', completed_at = now(), completed_by_id = $2,
         completion_notes = coalesce($3, completion_notes),
         proof_photo_url = coalesce($4, proof_photo_url)
     where id = $1 and status <> 'DONE'`,
    [taskId, userId, opts.notes, opts.proofPhotoUrl]
  );
}

/** מסמן/מבטל פריט ברשימת המשימות (checklist jsonb) לפי מזהה יציב, לא לפי אינדקס/תווית */
export async function toggleChecklistItem(
  taskId: string,
  itemId: string,
  done: boolean
): Promise<void> {
  await query(
    `update tasks
     set checklist = (
       select jsonb_agg(
         case when elem->>'id' = $2
              then jsonb_set(elem, '{done}', to_jsonb($3::boolean))
              else elem end
       )
       from jsonb_array_elements(checklist) as elem
     )
     where id = $1 and checklist is not null`,
    [taskId, itemId, done]
  );
}
