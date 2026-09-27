import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/get-session";
import { getTaskPerformanceForOrg } from "@/lib/data/tasks";
import { CeoTasksSubNav } from "@/components/tasks/CeoTasksSubNav";

/**
 * "ביצועי עובדים" — נתונים גולמיים ושקופים בלבד (הוקצו/הושלמו/אחוזים/באיחור),
 * בכוונה בלי ציון מסכם סינתטי (ראו תכנון E) — עד שיהיו נתוני שימוש אמיתיים
 * לכיול משקלים.
 */
export default async function CeoTasksPerformancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session] = await Promise.all([
    getTranslations(),
    requireSession(locale),
  ]);

  const performance = await getTaskPerformanceForOrg(session.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-brand-text">
          {t("ceo.performanceTitle")}
        </h1>
        <p className="text-sm text-brand-text/60">
          {t("ceo.performanceSubtitle")}
        </p>
      </div>

      <CeoTasksSubNav
        items={[
          { href: "/ceo/tasks", label: t("ceo.navOverview") },
          { href: "/ceo/tasks/by-branch", label: t("ceo.navByBranch") },
          { href: "/ceo/tasks/performance", label: t("ceo.navPerformance") },
        ]}
      />

      {performance.length === 0 ? (
        <p className="text-sm text-brand-text/50">{t("ceo.noEmployees")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-brand-surface shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-black/10 text-start text-xs uppercase tracking-wide text-brand-text/50">
                <th className="px-4 py-3 text-start">{t("ceo.performanceEmployee")}</th>
                <th className="px-4 py-3 text-start">{t("ceo.performanceBranch")}</th>
                <th className="px-4 py-3 text-end">{t("ceo.performanceAssigned")}</th>
                <th className="px-4 py-3 text-end">{t("ceo.performanceCompleted")}</th>
                <th className="px-4 py-3 text-end">{t("ceo.performanceCompletionRate")}</th>
                <th className="px-4 py-3 text-end">{t("ceo.performanceOnTimeRate")}</th>
                <th className="px-4 py-3 text-end">{t("ceo.performanceOverdue")}</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((row) => {
                const completionRate =
                  row.assigned > 0
                    ? Math.round((row.completed / row.assigned) * 100)
                    : 0;
                const onTimeRate =
                  row.completed > 0
                    ? Math.round((row.completedOnTime / row.completed) * 100)
                    : 0;
                return (
                  <tr key={row.userId} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-text">{row.userName}</td>
                    <td className="px-4 py-3 text-brand-text/70">{row.branchName}</td>
                    <td className="px-4 py-3 text-end text-brand-text">{row.assigned}</td>
                    <td className="px-4 py-3 text-end text-brand-text">{row.completed}</td>
                    <td className="px-4 py-3 text-end text-brand-text">{completionRate}%</td>
                    <td className="px-4 py-3 text-end text-brand-text">{onTimeRate}%</td>
                    <td className="px-4 py-3 text-end text-brand-text">{row.overdue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
