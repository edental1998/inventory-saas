import { getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchSummariesForOrg } from "@/lib/data/branches";
import { getTasksForOrg } from "@/lib/data/tasks";
import type { DbTask } from "@/lib/data/types";
import {
  CeoTasksOverviewTabs,
  type CeoTasksOverviewBranch,
} from "@/components/tasks/CeoTasksOverviewTabs";
import { CeoTasksSubNav } from "@/components/tasks/CeoTasksSubNav";
import type { TaskBoardLabels } from "@/components/tasks/TaskBoardTabs";

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

  const [branchSummaries, tasks] = await Promise.all([
    getBranchSummariesForOrg(session.organizationId),
    getTasksForOrg(session.organizationId),
  ]);

  const tasksByBranch = tasks.reduce<Record<string, DbTask[]>>((acc, task) => {
    (acc[task.branchId] ??= []).push(task);
    return acc;
  }, {});

  const branches: CeoTasksOverviewBranch[] = branchSummaries.map((branch) => ({
    id: branch.id,
    name: branch.name,
    completionRate: branch.taskCompletionRate,
    tasks: tasksByBranch[branch.id] ?? [],
  }));

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
      <AutoRefresh />
      <div>
        <h1 className="text-lg font-bold text-brand-text">
          {t("ceo.tasksTitle")}
        </h1>
        <p className="text-sm text-brand-text/60">{t("ceo.tasksSubtitle")}</p>
      </div>

      <CeoTasksSubNav
        items={[
          { href: "/ceo/tasks", label: t("ceo.navOverview") },
          { href: "/ceo/tasks/by-branch", label: t("ceo.navByBranch") },
          { href: "/ceo/tasks/performance", label: t("ceo.navPerformance") },
        ]}
      />

      <CeoTasksOverviewTabs
        branches={branches}
        labels={labels}
        completionRatePrefix={t("ceo.taskCompletionRate")}
      />
    </div>
  );
}
