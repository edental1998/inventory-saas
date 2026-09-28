import { getTranslations, getLocale } from "next-intl/server";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  UserRound,
  TrendingUp,
  Wallet,
  Store,
  ListChecks,
  Clock,
  History,
  ImageIcon,
  Circle,
  CircleDot,
  CheckCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchSummariesForOrg } from "@/lib/data/branches";
import { getBranchManagersForOrg } from "@/lib/data/users";
import { getTasksForOrg } from "@/lib/data/tasks";
import { getDailySalesTrendForOrg } from "@/lib/data/sales-analytics";
import type { DbTask } from "@/lib/data/types";
import { getSignedPhotoUrl } from "@/lib/storage";
import { getBranchCardImage } from "@/lib/imagery/fallback-images";

/**
 * דשבורד המנכ"ל — מרכז תפעול, לא כמה כרטיסי KPI על עמוד (Slice 9 revision).
 * כל הנתונים כאן ממשיכים להגיע מאותן שלוש שאילתות קיימות
 * (getBranchSummariesForOrg/getBranchManagersForOrg/getTasksForOrg) — גם
 * "פעילות אחרונה" ו"תיעוד אחרון" נגזרים מתוך אותה רשימת המשימות שכבר
 * נשלפה, לא שאילתות חדשות. אין מדדים מומצאים: כל מקטע בלי נתונים מציג
 * מצב ריק מכוון במקום להיעלם או להישאר ריק.
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

  const [branches, managers, tasks, salesTrend] = await Promise.all([
    getBranchSummariesForOrg(session.organizationId),
    getBranchManagersForOrg(session.organizationId),
    getTasksForOrg(session.organizationId),
    getDailySalesTrendForOrg(session.organizationId),
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
    pending: tasks.filter((tk) => tk.status === "PENDING" && !isOverdue(tk)).length,
    inProgress: tasks.filter((tk) => tk.status === "IN_PROGRESS" && !isOverdue(tk)).length,
    overdue: tasks.filter(isOverdue).length,
    done: tasks.filter((tk) => tk.status === "DONE").length,
  };

  const branchesWithAlerts = branches.filter((b) => b.openExpiryAlerts > 0);
  const branchesNoManager = branches.filter((b) => !managerByBranch.has(b.id));
  const hasAttentionItems =
    taskCounts.overdue > 0 || branchesWithAlerts.length > 0 || branchesNoManager.length > 0;

  const recentCompleted = tasks
    .filter((tk) => tk.status === "DONE" && tk.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5);

  const evidenceTasks = tasks
    .filter((tk) => tk.proofPhotoUrl && tk.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 6);
  const evidence = await Promise.all(
    evidenceTasks.map(async (tk) => ({
      task: tk,
      url: await getSignedPhotoUrl(tk.proofPhotoUrl),
    }))
  );
  const evidenceWithUrls = evidence.filter((e): e is { task: DbTask; url: string } => !!e.url);

  const currency = new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });
  const dateFmt = (iso: string, timeZone: string) =>
    new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone,
    }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-5">
      {/* KPI מצומצם — שורה אחת קומפקטית במקום ארבעה כרטיסים גדולים.
          מפרידים בין הפריטים ב-border-e (לוגי) ולא ב-divide-x (פיזי) —
          divide-x לא מתהפך נכון ב-RTL, ראו מוסכמה בתחילת globals.css */}
      <Card padding="none">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <CheckCircle2 className="h-5 w-5" />,
              label: t("ceo.taskCompletionRate"),
              value: `${avgCompletion}%`,
              hint: `${branches.length} ${t("nav.branchDashboard")}`,
              chip: "bg-brand-primary-soft text-brand-primary",
            },
            {
              icon: <AlertTriangle className="h-5 w-5" />,
              label: t("ceo.openExpiryAlerts"),
              value: String(totalExpiryAlerts),
              chip: totalExpiryAlerts > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success",
            },
            {
              icon: <TrendingUp className="h-5 w-5" />,
              label: t("ceo.weeklySales"),
              value: currency.format(totalWeekly),
              chip: "bg-success/10 text-success",
            },
            {
              icon: <Wallet className="h-5 w-5" />,
              label: t("ceo.monthlySales"),
              value: currency.format(totalMonthly),
              chip: "bg-info/10 text-info",
            },
          ].map((kpi, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 lg:border-e lg:border-brand-border lg:last:border-e-0"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.chip}`}>
                {kpi.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs text-brand-text-secondary">{kpi.label}</p>
                <p className="text-xl font-bold text-brand-text">{kpi.value}</p>
                {kpi.hint ? (
                  <p className="truncate text-[11px] text-brand-text-muted">{kpi.hint}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* דורש תשומת לב */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-[18px] w-[18px] text-brand-text-muted" />
            <h2 className="font-semibold text-brand-text">{t("ceo.needsAttentionTitle")}</h2>
          </div>
          {hasAttentionItems ? (
            <div className="flex flex-col gap-2">
              {taskCounts.overdue > 0 ? (
                <Link
                  href="/ceo/tasks"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-brand-text hover:bg-black/5"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                  {t("ceo.overdueTasksCount", { count: taskCounts.overdue })}
                </Link>
              ) : null}
              {branchesWithAlerts.length > 0 ? (
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-brand-text">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {t("ceo.branchesWithAlerts", { count: branchesWithAlerts.length })}
                </div>
              ) : null}
              {branchesNoManager.length > 0 ? (
                <Link
                  href="/ceo/managers"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-brand-text hover:bg-black/5"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-text-muted" />
                  {t("ceo.branchesNoManager", { count: branchesNoManager.length })}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg bg-success/5 px-3 py-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium text-brand-text">{t("ceo.allClear")}</p>
                <p className="text-xs text-brand-text-muted">{t("ceo.allClearHint")}</p>
              </div>
            </div>
          )}
        </Card>

        {/* ביצוע משימות */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="h-[18px] w-[18px] text-brand-text-muted" />
            <h2 className="font-semibold text-brand-text">{t("ceo.taskExecutionTitle")}</h2>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-brand-text-muted">{t("ceo.noTasks")}</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { icon: <Circle className="h-4 w-4" />, label: t("task.status.PENDING"), value: taskCounts.pending, tone: "text-brand-text-secondary" },
                { icon: <CircleDot className="h-4 w-4" />, label: t("task.status.IN_PROGRESS"), value: taskCounts.inProgress, tone: "text-info" },
                { icon: <AlertTriangle className="h-4 w-4" />, label: t("task.status.OVERDUE"), value: taskCounts.overdue, tone: "text-danger" },
                { icon: <CheckCircle className="h-4 w-4" />, label: t("task.status.DONE"), value: taskCounts.done, tone: "text-success" },
              ].map((s, i) => (
                <div key={i} className="rounded-lg bg-brand-background p-3">
                  <span className={`inline-flex ${s.tone}`}>{s.icon}</span>
                  <p className={`mt-1 text-lg font-bold ${s.tone}`}>{s.value}</p>
                  <p className="text-[11px] text-brand-text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* מגמת מכירות — רק כשיש בפועל תנועת מכירות בארגון; אחרת מוסיפה גרף ריק
          בלי תועלת. שימוש חוזר מלא ב-getDailySalesTrendForOrg/TrendLineChart
          הקיימים (כבר בשימוש ב-/ceo/sales) — לא שאילתה/רכיב חדשים */}
      {salesTrend.some((p) => p.revenue > 0) ? (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-[18px] w-[18px] text-brand-text-muted" />
            <h2 className="font-semibold text-brand-text">{t("ceo.salesTrendTitle")}</h2>
          </div>
          <TrendLineChart
            points={salesTrend.map((p) => ({ date: p.date, value: p.revenue }))}
            formatValue={(v) => currency.format(v)}
            label={t("ceo.salesTrendTitle")}
          />
        </Card>
      ) : null}

      {/* סקירת סניפים */}
      <div>
        <h2 className="mb-3 font-semibold text-brand-text">{t("ceo.branchLeaderboard")}</h2>
        {branches.length === 0 ? (
          <EmptyState icon={<Store className="h-8 w-8" />} title={t("ceo.noTasks")} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch, index) => {
              const manager = managerByBranch.get(branch.id);
              return (
                <Link key={branch.id} href={`/ceo/branches/${branch.id}`} className="block">
                  <Card padding="none" className="overflow-hidden transition-shadow hover:shadow-md">
                    <div
                      className="relative flex h-32 flex-col justify-between bg-cover bg-center p-3"
                      style={{ backgroundImage: `url(${getBranchCardImage(index)})` }}
                    >
                      <div className="absolute inset-0 bg-black/35" />
                      <div className="relative flex items-start justify-between">
                        <div className="rounded-lg bg-white/90 p-1.5">
                          <Store className="h-4 w-4 text-brand-primary" />
                        </div>
                        <Badge tone="brand">{branch.taskCompletionRate}%</Badge>
                      </div>
                      <h3 className="relative font-semibold text-white drop-shadow-sm">
                        {branch.name}
                      </h3>
                    </div>
                    <div className="flex flex-col gap-3 p-5">
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* פעילות אחרונה */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <History className="h-[18px] w-[18px] text-brand-text-muted" />
            <h2 className="font-semibold text-brand-text">{t("ceo.recentActivityTitle")}</h2>
          </div>
          {recentCompleted.length === 0 ? (
            <p className="text-sm text-brand-text-muted">{t("ceo.recentActivityEmpty")}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {recentCompleted.map((tk) => (
                <Link
                  key={tk.id}
                  href={`/ceo/tasks/${tk.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-black/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-brand-text">{tk.title}</p>
                    <p className="truncate text-xs text-brand-text-muted">
                      {tk.branchName}
                      {tk.assignedToName ? ` · ${tk.assignedToName}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs text-brand-text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    {dateFmt(tk.completedAt!, tk.branchTimezone)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* תיעוד אחרון — רק כשיש תיעוד אמיתי, לא מצב ריק מקושט */}
        {evidenceWithUrls.length > 0 ? (
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ImageIcon className="h-[18px] w-[18px] text-brand-text-muted" />
              <h2 className="font-semibold text-brand-text">{t("ceo.recentEvidenceTitle")}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {evidenceWithUrls.map(({ task: tk, url }) => (
                <Link
                  key={tk.id}
                  href={`/ceo/tasks/${tk.id}`}
                  className="group relative block aspect-square overflow-hidden rounded-lg bg-brand-background"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- תמונת הוכחה חתומה, לא asset סטטי */}
                  <img
                    src={url}
                    alt={tk.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-1 text-[10px] text-white">
                    {tk.branchName}
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-[18px] w-[18px] text-brand-text-muted" />
              <h2 className="font-semibold text-brand-text">{t("ceo.managersTitle")}</h2>
            </div>
            {managers.length === 0 ? (
              <p className="text-sm text-brand-text-muted">{t("ceo.noManagerAssigned")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {managers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5">
                    <Avatar name={m.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-text">{m.name}</p>
                      <p className="truncate text-xs text-brand-text-muted">{m.branchName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
