import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchById } from "@/lib/data/branches";
import { getTasksForBranch } from "@/lib/data/tasks";
import { getBranchEmployees } from "@/lib/data/users";
import { createTaskAction, markTaskDoneAction } from "@/lib/actions/tasks";

const TASK_TYPES = [
  "RECEIVE_DELIVERY",
  "RESTOCK_SHELF",
  "REMOVE_OLD_STOCK",
  "CHECK_EXPIRY",
  "CUSTOM",
] as const;

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

  return (
    <div className="flex flex-col gap-6">
      <details className="rounded-xl bg-brand-surface p-4 shadow-sm ring-1 ring-black/5">
        <summary className="cursor-pointer font-medium text-brand-text">
          + {t("branch.createTask")}
        </summary>
        <form action={boundCreateTask} className="mt-4 flex flex-wrap gap-3">
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
          <button
            type="submit"
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-brand-on-primary"
          >
            {t("branch.createTask")}
          </button>
        </form>
      </details>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            typeLabel={t(`task.type.${task.type}`)}
            statusLabel={t(`task.status.${task.status}`)}
            assignedToLabel={
              task.assignedToName
                ? `${t("task.assignedTo")}: ${task.assignedToName}`
                : undefined
            }
            photoLabel={t("employee.uploadPhoto")}
            action={
              task.status !== "DONE" ? (
                <form action={markTaskDoneAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg bg-brand-success px-3 py-1.5 text-xs font-medium text-white"
                  >
                    {t("employee.markDone")}
                  </button>
                </form>
              ) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
