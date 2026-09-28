import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchById } from "@/lib/data/branches";
import { getTasksForBranch } from "@/lib/data/tasks";
import { getBranchEmployees } from "@/lib/data/users";
import { createTaskAction } from "@/lib/actions/tasks";
import { TaskBoardTabs, type TaskBoardLabels } from "@/components/tasks/TaskBoardTabs";
import { Card } from "@/components/ui/Card";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button, buttonClasses } from "@/components/ui/Button";

const TASK_TYPES = [
  "RECEIVE_DELIVERY",
  "RESTOCK_SHELF",
  "REMOVE_OLD_STOCK",
  "CHECK_EXPIRY",
  "CUSTOM",
] as const;

/**
 * לוח המשימות של מנהל/ת הסניף — עמוד אחד עם טאבים בתוכו, לא חמישה ניתובים
 * נפרדים. Slice 10: רק עיצוב — כל שדות הטופס (שם/action) זהים ל-Slice 3,
 * רק העטיפה החזותית (primitives, Card, spacing) השתנתה.
 */
export default async function BranchTasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, uiLocale, session] = await Promise.all([
    getTranslations(),
    getLocale(),
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
    photoLabel: t("employee.uploadPhoto"),
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
          <p className="text-sm text-brand-text-secondary">{t("taskBoard.subtitle")}</p>
        </div>
        <Link href="/branch/tasks/mine" className={buttonClasses("secondary", "sm", "shrink-0")}>
          {t("taskBoard.myTasksLink")}
        </Link>
      </div>

      <Card padding="none">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-medium text-brand-text">
            <Plus className="h-4 w-4 text-brand-primary transition-transform group-open:rotate-45" />
            {t("branch.createTask")}
          </summary>
          <form action={boundCreateTask} className="flex flex-col gap-3 border-t border-brand-border p-4">
            <div className="flex flex-wrap gap-3">
              <Input
                name="title"
                required
                placeholder={t("branch.createTask")}
                className="min-w-[200px] flex-1"
              />
              <Select name="type" className="w-auto" defaultValue="CUSTOM">
                {TASK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`task.type.${type}`)}
                  </option>
                ))}
              </Select>
              <Select name="assignedToId" className="w-auto" defaultValue="">
                <option value="">{t("task.assignedTo")}...</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-brand-text-secondary">
                {t("taskBoard.dueDateLabel")}
                <Input type="date" name="dueDate" className="w-auto" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-brand-text-secondary">
                {t("taskBoard.dueTimeLabel")}
                <Input type="time" name="dueTime" defaultValue="17:00" className="w-auto" />
              </label>
            </div>

            <Textarea
              name="description"
              placeholder={t("taskDetail.description")}
              rows={2}
            />

            <Textarea
              name="checklist"
              placeholder={t("taskBoard.checklistPlaceholder")}
              rows={3}
            />

            <label className="flex items-center gap-2 text-sm text-brand-text">
              <input
                type="checkbox"
                name="photoRequired"
                className="h-4 w-4 rounded border-brand-border accent-brand-primary"
              />
              {t("taskBoard.photoRequiredLabel")}
            </label>

            <Button type="submit" className="self-start">
              {t("branch.createTask")}
            </Button>
          </form>
        </details>
      </Card>

      <TaskBoardTabs tasks={tasks} basePath="/branch/tasks" labels={labels} locale={uiLocale} />
    </div>
  );
}
