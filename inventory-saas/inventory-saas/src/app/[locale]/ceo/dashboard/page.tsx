import { getTranslations, getLocale } from "next-intl/server";
import { StatCard } from "@/components/ui/StatCard";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchSummariesForOrg } from "@/lib/data/branches";

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

  const branches = await getBranchSummariesForOrg(session.organizationId);

  const avgCompletion = branches.length
    ? Math.round(
        branches.reduce((sum, b) => sum + b.taskCompletionRate, 0) /
          branches.length
      )
    : 0;
  const totalExpiryAlerts = branches.reduce(
    (sum, b) => sum + b.openExpiryAlerts,
    0
  );
  const totalWeekly = branches.reduce((sum, b) => sum + b.weeklySales, 0);
  const totalMonthly = branches.reduce((sum, b) => sum + b.monthlySales, 0);

  const currency = new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("ceo.taskCompletionRate")}
          value={`${avgCompletion}%`}
          hint={`${branches.length} ${t("nav.branchDashboard")}`}
        />
        <StatCard
          label={t("ceo.openExpiryAlerts")}
          value={String(totalExpiryAlerts)}
          tone={totalExpiryAlerts > 0 ? "warning" : "success"}
        />
        <StatCard
          label={t("ceo.weeklySales")}
          value={currency.format(totalWeekly)}
        />
        <StatCard
          label={t("ceo.monthlySales")}
          value={currency.format(totalMonthly)}
        />
      </div>

      <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-4 font-semibold text-brand-text">
          {t("ceo.branchLeaderboard")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-black/5 text-brand-text/50">
                <th className="py-2 text-start font-medium">{t("nav.branchDashboard")}</th>
                <th className="py-2 text-start font-medium">{t("ceo.taskCompletionRate")}</th>
                <th className="py-2 text-start font-medium">{t("ceo.openExpiryAlerts")}</th>
                <th className="py-2 text-start font-medium">{t("ceo.weeklySales")}</th>
                <th className="py-2 text-start font-medium">{t("ceo.monthlySales")}</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b border-black/5 last:border-0">
                  <td className="py-3 font-medium text-brand-text">{branch.name}</td>
                  <td className="py-3">{branch.taskCompletionRate}%</td>
                  <td className="py-3">{branch.openExpiryAlerts}</td>
                  <td className="py-3">{currency.format(branch.weeklySales)}</td>
                  <td className="py-3">{currency.format(branch.monthlySales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
