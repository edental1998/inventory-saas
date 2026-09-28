import type { DbTask } from "@/lib/data/types";

/**
 * "באיחור" תמיד נגזר מהמופע (due_at עבר, סטטוס לא DONE) — לא סטטוס מאוחסן.
 * הנוסחה הזו הייתה משוכפלת זהה ב-3 מקומות (TaskBoardTabs, My Day,
 * CeoTasksOverviewTabs); מאוחדת כאן ל-Slice 10 כדי שרכיבי הצגה חדשים
 * (TaskCard) ישתמשו באותה הגדרה בלי לשכפל שוב. אותה התנהגות בדיוק,
 * לא שינוי לוגיקה.
 */
export function isTaskOverdue(task: DbTask, now: number = Date.now()): boolean {
  return task.status !== "DONE" && task.dueAt !== null && new Date(task.dueAt).getTime() < now;
}
