import { query } from "@/lib/db";
import type { DbTask } from "./types";

const TASK_SELECT = `
  select tsk.id, tsk.type, tsk.title, tsk.status, tsk.photo_required,
         tsk.assigned_to_id, u.name as assigned_to_name,
         tsk.branch_id, b.name as branch_name
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
    status: row.status as DbTask["status"],
    assignedToId: (row.assigned_to_id as string | null) ?? null,
    assignedToName: (row.assigned_to_name as string | null) ?? null,
    branchId: row.branch_id as string,
    branchName: row.branch_name as string,
    photoRequired: row.photo_required as boolean,
  };
}

export async function getTasksForBranch(branchId: string): Promise<DbTask[]> {
  const { rows } = await query(
    `${TASK_SELECT} where tsk.branch_id = $1 order by ${STATUS_ORDER}, tsk.created_at asc`,
    [branchId]
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
 * לבדיקת הרשאה לפני סימון "בוצע": מי משויך למשימה, באיזה סניף היא ולאיזה
 * ארגון הסניף שייך — כדי שמנהל רשת/סניף לא יוכל לסמן כבוצעה משימה
 * שמשויכת ל-organization/branch אחר לגמרי (גם אם ה-taskId נשלח ידנית).
 */
export async function getTaskOwnership(taskId: string): Promise<{
  assignedToId: string | null;
  branchId: string;
  organizationId: string;
} | null> {
  const { rows } = await query(
    `select tsk.assigned_to_id, tsk.branch_id, b.organization_id
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
  };
}
