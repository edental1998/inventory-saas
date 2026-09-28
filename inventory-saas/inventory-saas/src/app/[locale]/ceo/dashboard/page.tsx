import { getTranslations, getLocale } from "next-intl/server";
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Store,
  ListChecks,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchSummariesForOrg } from "@/lib/data/branches";
import { getBranchManagersForOrg } from "@/lib/data/users";
import { getTasksForOrg } from "@/lib/data/tasks";
import type { DbTask } from "@/lib/data/types";
import { FALLBACK_IMAGERY } from "@/lib/imagery/fallback-images";

/**
 * דשבורד המנכ"ל (Slice 9) — עונה על "איך העסק שלי מתפקד בכל הסניפים,
 * ואיפה צריך תשומת לב?". כל הנתונים כאן ממשיכים להגיע מאותן פונקציות
 * שכבר היו קיימות (getBranchSummariesForOrg/getBranchManagersForOrg/
 * getTasksForOrg) — שדרוג חזותי, לא שאילתות/לוגיקה חדשות.
 *
 * כרטיסי הסניפים משתמשים ב"תמונת מותג" ניטרלית נגזרת (primary-soft +
 * אייקון Store) ולא בתמונה אמיתית של הסניף — הוחלט מפורשות לא להוסיף
 * שדה תמונת-סניף לסכמה עד שתהיה תכונה ייעודית לכך.
 */
export default async function CeoDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: paramLocale } = await params;
  const [t, locale, session] = await Promise.all([
    getTranslations(),
    getLocale(),
    requireSession(paramLocale),
  ]);

  const [branches, managers, tasks] = await Promise.all([
    getBranchSummariesForOrg(session.organizationId),
    getBranchManagersForOrg(session.organizationId),
    getTasksForOrg(session.organizationId),
  ]);

  const managerByBranch = new Map(managers.map((m) => [m.branchId, m]));

  const avgCompletion = branches.length
    ? Math.round(
        branches.reduce((sum, b) => sum + b.taskCompletionRate, 0) /
          branches.length
      )
    : 0;
  const totalExpiryAlerts = branches.reduce((sum, b) => sum + b.openExpiryAlerts, 0);
  const totalWeekly = branches.reduce((sum, b) => sum + b.weeklySales, 0);
  const totalMonthly = branches.reduce((sum, b) => sum + b.monthlySales, 0);

  const now = Date.now();
  const isOverdue = (task: DbTask) =>
    task.status !== "DONE" && task.dueAt !== null && new Date(task.dueAt).getTime() < now;
  const taskCounts = {
    pending: tasks.filter((t2) => t2.status === "PENDING" && !isOverdue(t2)).length,
    inProgress: tasks.filter((t2) => t2.status === "IN_PROGRESS" && !isOverdue(t2)).length,
    overdue: tasks.filter(isOverdue).length,
    done: tasks.filter((t2) => t2.status === "DONE").length,
  };

  const currency = new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 />}
          label={t("ceo.taskCompletionRate")}
          value={`${avgCompletion}%`}
          hint={`${branches.length} ${t("nav.branchDashboard")}`}
        />
        <StatCard
          icon={<AlertTriangle />}
          label={t("ceo.openExpiryAlerts")}
          value={String(totalExpiryAlerts)}
          tone={totalExpiryAlerts > 0 ? "warning" : "success"}
        />
        <StatCard
          icon={<TrendingUp />}
          label={t("ceo.weeklySales")}
          value={currency.format(totalWeekly)}
        />
        <StatCard
          icon={<Wallet />}
          label={t("ceo.monthlySales")}
          value={currency.format(totalMonthly)}
        />
      </div>

      {tasks.length > 0 ? (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="h-[18px] w-[18px] text-brand-text-muted" />
            <h2 className="font-semibold text-brand-text">{t("nav.tasks")}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">
              {t("task.status.PENDING")}: {taskCounts.pending}
            </Badge>
            <Badge tone="info">
              {t("task.status.IN_PROGRESS")}: {taskCounts.inProgress}
            </Badge>
            <Badge tone="danger">
              {t("task.status.OVERDUE")}: {taskCounts.overdue}
            </Badge>
            <Badge tone="success">
              {t("task.status.DONE")}: {taskCounts.done}
            </Badge>
          </div>
        </Card>
      ) : null}

      <div>
        <h2 className="mb-3 font-semibold text-brand-text">{t("ceo.branchLeaderboard")}</h2>
        {branches.length === 0 ? (
          <EmptyState
            icon={<Store className="h-8 w-8" />}
            title={t("ceo.noTasks")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => {
              const manager = managerByBranch.get(branch.id);
              return (
                <Link key={branch.id} href={`/ceo/branches/${branch.id}`} className="block">
                  <Card padding="none" className="overflow-hidden transition-shadow hover:shadow-md">
                    <div
                      className="relative flex h-24 items-end justify-end bg-cover bg-center p-2"
                      style={{ backgroundImage: `url(${FALLBACK_IMAGERY.branchCard})` }}
                    >
                      <div className="absolute inset-0 bg-brand-primary/35" />
                      <div className="relative rounded-lg bg-white/90 p-1.5">
                        <Store className="h-4 w-4 text-brand-primary" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-brand-text">{branch.name}</h3>
                        <Badge tone="brand">{branch.taskCompletionRate}%</Badge>
                      </div>

                      {manager ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={manager.name} size="sm" />
                          <span className="truncate text-sm text-brand-text-secondary">
                            {manager.name}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-brand-text-muted">
                          {t("ceo.noManagerAssigned")}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 border-t border-brand-border pt-3 text-sm">
                        <div>
                          <p className="text-brand-text-muted">{t("ceo.openExpiryAlerts")}</p>
                          <p
                            className={
                              branch.openExpiryAlerts > 0
                                ? "font-medium text-warning"
                                : "font-medium text-brand-text"
                            }
                          >
                            {branch.openExpiryAlerts}
                          </p>
                        </div>
                        <div>
                          <p className="text-brand-text-muted">{t("ceo.weeklySales")}</p>
                          <p className="font-medium text-brand-text">
                            {currency.format(branch.weeklySales)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
