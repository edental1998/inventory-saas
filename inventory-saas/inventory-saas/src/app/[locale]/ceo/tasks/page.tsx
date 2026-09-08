import { getTranslations } from "next-intl/server";
import { TaskCard } from "@/components/ui/TaskCard";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchSummariesForOrg } from "@/lib/data/branches";
import { getTasksForOrg } from "@/lib/data/tasks";
import type { DbTask } from "@/lib/data/types";

export default async function CeoTasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session] = await Promise.all([
    getTranslations(),
    requireSession(locale),
  ]);

  const [branches, tasks] = await Promise.all([
    getBranchSummariesForOrg(session.organizationId),
    getTasksForOrg(session.organizationId),
  ]);

  const tasksByBranch = tasks.reduce<Record<string, DbTask[]>>((acc, task) => {
    (acc[task.branchId] ??= []).push(task);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh />
      <div>
        <h1 className="text-lg font-bold text-brand-text">
          {t("ceo.tasksTitle")}
        </h1>
        <p className="text-sm text-brand-text/60">{t("ceo.tasksSubtitle")}</p>
      </div>

      {branches.map((branch) => {
        const branchTasks = tasksByBranch[branch.id] ?? [];
        return (
          <div
            key={branch.id}
            className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-brand-text">{branch.name}</h2>
              <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
                {t("ceo.taskCompletionRate")}: {branch.taskCompletionRate}%
              </span>
            </div>
            {branchTasks.length === 0 ? (
              <p className="text-sm text-brand-text/50">{t("ceo.noTasks")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {branchTasks.map((task) => (
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
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
