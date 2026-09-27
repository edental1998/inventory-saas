import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/get-session";
import { getTaskById } from "@/lib/data/tasks";
import { getBranchEmployees } from "@/lib/data/users";
import { getSignedPhotoUrl } from "@/lib/storage";
import {
  startTaskAction,
  completeTaskAction,
  overrideCompleteTaskAction,
  toggleChecklistItemAction,
  reassignTaskAction,
} from "@/lib/actions/tasks";
import { TaskDetailView, type TaskDetailLabels } from "@/components/tasks/TaskDetailView";

/**
 * פרטי משימה לתצוגת מנהל/ת סניף — אותו רכיב תצוגה משותף כמו העובד/ת
 * (Slice 2), רק עם מדיניות פעולות שונה: לא ניתן "להתחיל" משימה של מישהו/י
 * אחר/ת (canStart רק על המשימות של עצמו/ה), אבל ניתן לעקוף-להשלים עם הערה
 * חובה (canOverride), ולשייך מחדש בתוך הסניף בלבד.
 */
export default async function BranchTaskDetailPage({
  params,
}: {
  params: Promise<{ locale: string; taskId: string }>;
}) {
  const { locale: paramLocale, taskId } = await params;
  const [t, locale, session] = await Promise.all([
    getTranslations(),
    getLocale(),
    requireSession(paramLocale),
  ]);

  if (!session.branchId) notFound();

  const task = await getTaskById(taskId);
  // שיוך לסניף — לא לארגון בלבד — כדי שמנהל/ת סניף לא יראה/תראה משימה של סניף אחר
  if (!task || task.branchId !== session.branchId) notFound();

  const [proofPhotoSignedUrl, employees] = await Promise.all([
    getSignedPhotoUrl(task.proofPhotoUrl),
    getBranchEmployees(session.branchId),
  ]);

  const isOwnTask = task.assignedToId === session.userId;

  const labels: TaskDetailLabels = {
    descriptionLabel: t("taskDetail.description"),
    due: t("taskDetail.due"),
    noDue: t("taskDetail.noDue"),
    checklistLabel: t("taskDetail.checklist"),
    photoRequiredHint: t("employee.uploadPhoto"),
    startButton: t("taskDetail.startButton"),
    completeButton: t("taskDetail.completeButton"),
    overrideButton: t("taskDetail.overrideButton"),
    notesLabel: t("taskDetail.notesLabel"),
    notesPlaceholder: t("taskDetail.notesPlaceholder"),
    photoLabel: t("employee.uploadPhoto"),
    submitting: t("taskDetail.submitting"),
    missingPhoto: t("taskDetail.missingPhoto"),
    missingNotes: t("taskDetail.missingNotes"),
    completedBy: t("taskDetail.completedByOverride"),
    completionNotesLabel: t("taskDetail.completionNotesLabel"),
    statusLabel: t("taskDetail.statusLabel"),
    statusValues: {
      PENDING: t("task.status.PENDING"),
      IN_PROGRESS: t("task.status.IN_PROGRESS"),
      DONE: t("task.status.DONE"),
      OVERDUE: t("task.status.OVERDUE"),
    },
    typeValues: {
      RECEIVE_DELIVERY: t("task.type.RECEIVE_DELIVERY"),
      RESTOCK_SHELF: t("task.type.RESTOCK_SHELF"),
      REMOVE_OLD_STOCK: t("task.type.REMOVE_OLD_STOCK"),
      CHECK_EXPIRY: t("task.type.CHECK_EXPIRY"),
      CUSTOM: t("task.type.CUSTOM"),
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/branch/tasks" className="text-sm text-brand-primary underline">
        {t("taskBoard.backToBoard")}
      </Link>

      {task.status !== "DONE" ? (
        <form
          action={reassignTaskAction}
          className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-surface p-4 shadow-sm ring-1 ring-black/5"
        >
          <input type="hidden" name="taskId" value={task.id} />
          <label className="text-sm font-medium text-brand-text">
            {t("taskBoard.reassignLabel")}
          </label>
          <select
            name="assignedToId"
            defaultValue={task.assignedToId ?? ""}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
          >
            <option value="">{t("task.assignedTo")}...</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-brand-primary px-3 py-2 text-xs font-medium text-brand-on-primary"
          >
            {t("taskBoard.reassignButton")}
          </button>
        </form>
      ) : null}

      <TaskDetailView
        task={task}
        locale={locale}
        labels={labels}
        canStart={isOwnTask}
        canComplete={isOwnTask}
        canOverride={!isOwnTask}
        proofPhotoSignedUrl={proofPhotoSignedUrl}
        startAction={startTaskAction}
        completeAction={completeTaskAction}
        overrideAction={overrideCompleteTaskAction}
        toggleChecklistAction={isOwnTask ? toggleChecklistItemAction : undefined}
      />
    </div>
  );
}
