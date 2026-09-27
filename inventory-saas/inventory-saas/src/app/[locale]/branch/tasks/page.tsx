import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchById } from "@/lib/data/branches";
import { getTasksForBranch } from "@/lib/data/tasks";
import { getBranchEmployees } from "@/lib/data/users";
import { createTaskAction } from "@/lib/actions/tasks";
import { TaskBoardTabs, type TaskBoardLabels } from "@/components/tasks/TaskBoardTabs";

const TASK_TYPES = [
  "RECEIVE_DELIVERY",
  "RESTOCK_SHELF",
  "REMOVE_OLD_STOCK",
  "CHECK_EXPIRY",
  "CUSTOM",
] as const;

/**
 * לוח המשימות של מנהל/ת הסניף (Slice 3) — עמוד אחד עם טאבים בתוכו, לא חמישה
 * ניתובים נפרדים (ראו התכנון). טופס היצירה מרחיב את זה שהיה קיים: עכשיו
 * גם description/checklist/photo_required, לא רק כותרת+סוג+שיוך.
 */
export default async function BranchTasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session] = await Promise.all([
    getTranslations(),
    requireSession(locale),
  ]);

  if (!session.branchId) notFound();
  const branchId = session.branchId;

  const [branch, tasks, employees] = await Promise.all([
    getBranchById(branchId),
    getTasksForBranch(branchId),
    getBranchEmployees(branchId),
  ]);
  if (!branch) notFound();

  const boundCreateTask = createTaskAction.bind(null, branchId);

  const labels: TaskBoardLabels = {
    all: t("taskBoard.all"),
    pending: t("task.status.PENDING"),
    inProgress: t("task.status.IN_PROGRESS"),
    overdue: t("myDay.overdue"),
    done: t("task.status.DONE"),
    empty: t("ceo.noTasks"),
    assignedToPrefix: t("task.assignedTo"),
    typeLabels: {
      RECEIVE_DELIVERY: t("task.type.RECEIVE_DELIVERY"),
      RESTOCK_SHELF: t("task.type.RESTOCK_SHELF"),
      REMOVE_OLD_STOCK: t("task.type.REMOVE_OLD_STOCK"),
      CHECK_EXPIRY: t("task.type.CHECK_EXPIRY"),
      CUSTOM: t("task.type.CUSTOM"),
    },
    statusLabels: {
      PENDING: t("task.status.PENDING"),
      IN_PROGRESS: t("task.status.IN_PROGRESS"),
      DONE: t("task.status.DONE"),
      OVERDUE: t("task.status.OVERDUE"),
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-brand-text">{t("taskBoard.title")}</h1>
          <p className="text-sm text-brand-text/60">{t("taskBoard.subtitle")}</p>
        </div>
        <Link
          href="/branch/tasks/mine"
          className="shrink-0 rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-brand-text hover:bg-black/5"
        >
          {t("taskBoard.myTasksLink")}
        </Link>
      </div>

      <details className="rounded-xl bg-brand-surface p-4 shadow-sm ring-1 ring-black/5">
        <summary className="cursor-pointer font-medium text-brand-text">
          + {t("branch.createTask")}
        </summary>
        <form action={boundCreateTask} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <input
              name="title"
              required
              placeholder={t("branch.createTask")}
              className="min-w-[200px] flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <select
              name="type"
              className="rounded-lg border border-black/10 px-3 py-2 text-sm"
              defaultValue="CUSTOM"
            >
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`task.type.${type}`)}
                </option>
              ))}
            </select>
            <select
              name="assignedToId"
              className="rounded-lg border border-black/10 px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">{t("task.assignedTo")}...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            name="description"
            placeholder={t("taskDetail.description")}
            rows={2}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
          />

          <textarea
            name="checklist"
            placeholder={t("taskBoard.checklistPlaceholder")}
            rows={3}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
          />

          <label className="flex items-center gap-2 text-sm text-brand-text">
            <input type="checkbox" name="photoRequired" className="h-4 w-4 rounded border-black/20" />
            {t("taskBoard.photoRequiredLabel")}
          </label>

          <button
            type="submit"
            className="self-start rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-brand-on-primary"
          >
            {t("branch.createTask")}
          </button>
        </form>
      </details>

      <TaskBoardTabs tasks={tasks} basePath="/branch/tasks" labels={labels} />
    </div>
  );
}
