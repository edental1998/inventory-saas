import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchesForOrg, getBranchForOrg } from "@/lib/data/branches";
import { getTasksForBranch } from "@/lib/data/tasks";
import { TaskBoardTabs, type TaskBoardLabels } from "@/components/tasks/TaskBoardTabs";
import { CeoTasksSubNav } from "@/components/tasks/CeoTasksSubNav";
import { BranchPicker } from "@/components/tasks/BranchPicker";

/**
 * "לפי סניף" — כמו לוח המשימות של מנהל/ת הסניף (אותם טאבים/TaskBoardTabs),
 * רק לצפייה בלבד (basePath מוביל ל-/ceo/tasks/[taskId] הקריאה-בלבד) ועם
 * בורר סניף במקום סניף קבוע מה-session.
 */
export default async function CeoTasksByBranchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const { locale } = await params;
  const { branchId: requestedBranchId } = await searchParams;
  const [t, session] = await Promise.all([
    getTranslations(),
    requireSession(locale),
  ]);

  const branches = await getBranchesForOrg(session.organizationId);
  const firstBranch = branches[0];
  if (!firstBranch) notFound();

  const selectedBranchId =
    requestedBranchId && branches.some((b) => b.id === requestedBranchId)
      ? requestedBranchId
      : firstBranch.id;

  // וידוא שהסניף שייך לארגון של המנכ"ל — גם אם branchId הגיע ישירות מה-URL
  const branch = await getBranchForOrg(selectedBranchId, session.organizationId);
  if (!branch) notFound();

  const tasks = await getTasksForBranch(selectedBranchId);

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
      <div>
        <h1 className="text-lg font-bold text-brand-text">
          {t("ceo.byBranchTitle")}
        </h1>
        <p className="text-sm text-brand-text/60">{t("ceo.byBranchSubtitle")}</p>
      </div>

      <CeoTasksSubNav
        items={[
          { href: "/ceo/tasks", label: t("ceo.navOverview") },
          { href: "/ceo/tasks/by-branch", label: t("ceo.navByBranch") },
          { href: "/ceo/tasks/performance", label: t("ceo.navPerformance") },
        ]}
      />

      <BranchPicker
        branches={branches}
        selectedBranchId={selectedBranchId}
        label={t("ceo.selectBranchLabel")}
      />

      <TaskBoardTabs tasks={tasks} basePath="/ceo/tasks" labels={labels} />
    </div>
  );
}
