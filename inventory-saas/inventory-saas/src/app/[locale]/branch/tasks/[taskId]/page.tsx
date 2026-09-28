import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowRight, UserCog } from "lucide-react";
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
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/**
 * פרטי משימה לתצוגת מנהל/ת סניף — אותו רכיב תצוגה משותף כמו העובד/ת
 * (Slice 2), רק עם מדיניות פעולות שונה: לא ניתן "להתחיל" משימה של מישהו/י
 * אחר/ת (canStart רק על המשימות של עצמו/ה), אבל ניתן לעקוף-להשלים עם הערה
 * חובה (canOverride), ולשייך מחדש בתוך הסניף בלבד. Slice 10: רק עיצוב —
 * כל ה-actions/הרשאות זהים ל-Slice 3.
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
    assigneeLabel: t("taskDetail.assigneeLabel"),
    createdByLabel: t("taskDetail.createdByLabel"),
    startedByLabel: t("taskDetail.startedByLabel"),
    completedByActorLabel: t("taskDetail.completedByActorLabel"),
    evidenceLabel: t("taskDetail.evidenceLabel"),
  };

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/branch/tasks"
        className="flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
      >
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        {t("taskBoard.backToBoard")}
      </Link>

      {task.status !== "DONE" ? (
        <Card padding="sm">
          <form action={reassignTaskAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="taskId" value={task.id} />
            <UserCog className="h-4 w-4 shrink-0 text-brand-text-muted" />
            <label className="text-sm font-medium text-brand-text">
              {t("taskBoard.reassignLabel")}
            </label>
            <Select
              name="assignedToId"
              defaultValue={task.assignedToId ?? ""}
              className="w-auto min-w-[160px]"
            >
              <option value="">{t("task.assignedTo")}...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm">
              {t("taskBoard.reassignButton")}
            </Button>
          </form>
        </Card>
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
