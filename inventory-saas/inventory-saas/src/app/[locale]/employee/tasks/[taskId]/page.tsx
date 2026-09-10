import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/get-session";
import { getTaskById } from "@/lib/data/tasks";
import {
  startTaskAction,
  completeTaskAction,
  toggleChecklistItemAction,
} from "@/lib/actions/tasks";
import { TaskDetailView, type TaskDetailLabels } from "@/components/tasks/TaskDetailView";

export default async function EmployeeTaskDetailPage({
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

  const task = await getTaskById(taskId);
  if (!task || task.assignedToId !== session.userId) notFound();

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
      <Link href="/employee/dashboard" className="text-sm text-brand-primary underline">
        {t("taskDetail.back")}
      </Link>

      <TaskDetailView
        task={task}
        locale={locale}
        labels={labels}
        canStart
        canComplete
        startAction={startTaskAction}
        completeAction={completeTaskAction}
        toggleChecklistAction={toggleChecklistItemAction}
      />
    </div>
  );
}
