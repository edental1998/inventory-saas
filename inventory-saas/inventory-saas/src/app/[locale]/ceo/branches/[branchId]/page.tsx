import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { TaskCard } from "@/components/ui/TaskCard";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchForOrg, getBranchSummary } from "@/lib/data/branches";
import { getTasksForBranch } from "@/lib/data/tasks";
import { getBranchManager } from "@/lib/data/users";

export default async function CeoBranchDetailPage({
  params,
}: {
  params: Promise<{ locale: string; branchId: string }>;
}) {
  const { locale: paramLocale, branchId } = await params;
  const [t, locale, session] = await Promise.all([
    getTranslations(),
    getLocale(),
    requireSession(paramLocale),
  ]);

  const branch = await getBranchForOrg(branchId, session.organizationId);
  if (!branch) notFound();

  const [summary, tasks, manager] = await Promise.all([
    getBranchSummary(branch.id, branch.name),
    getTasksForBranch(branch.id),
    getBranchManager(branch.id),
  ]);

  const currency = new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-brand-text">{branch.name}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("ceo.taskCompletionRate")}
          value={`${summary.taskCompletionRate}%`}
        />
        <StatCard
          label={t("ceo.openExpiryAlerts")}
          value={String(summary.openExpiryAlerts)}
          tone={summary.openExpiryAlerts > 0 ? "warning" : "success"}
        />
        <StatCard
          label={t("ceo.weeklySales")}
          value={currency.format(summary.weeklySales)}
        />
        <StatCard
          label={t("ceo.monthlySales")}
          value={currency.format(summary.monthlySales)}
        />
      </div>

      <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-3 font-semibold text-brand-text">
          {t("ceo.branchManager")}
        </h2>
        {manager ? (
          <p className="text-sm text-brand-text">
            {manager.name}
            <span className="text-brand-text/50"> · {manager.email}</span>
          </p>
        ) : (
          <p className="text-sm text-brand-text/50">
            {t("ceo.noManagerAssigned")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-brand-text">{t("nav.tasks")}</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-brand-text/50">{t("ceo.noTasks")}</p>
        ) : (
          tasks.map((task) => (
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
          ))
        )}
      </div>
    </div>
  );
}
