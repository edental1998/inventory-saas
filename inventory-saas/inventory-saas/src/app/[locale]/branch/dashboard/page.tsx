import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { ExpiryBadge, daysLeftToTone } from "@/components/ui/ExpiryBadge";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchById, getBranchSummary } from "@/lib/data/branches";
import { getExpiryAlertsForBranch } from "@/lib/data/expiry";

export default async function BranchDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session] = await Promise.all([
    getTranslations(),
    requireSession(locale),
  ]);

  if (!session.branchId) {
    // לא אמור לקרות (מנהל סניף תמיד משויך לסניף), אבל זו רשת ביטחון
    notFound();
  }

  const branchRow = await getBranchById(session.branchId);
  if (!branchRow) notFound();

  const [summary, alerts] = await Promise.all([
    getBranchSummary(branchRow.id, branchRow.name),
    getExpiryAlertsForBranch(branchRow.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("ceo.taskCompletionRate")}
          value={`${summary.taskCompletionRate}%`}
        />
        <StatCard
          label={t("branch.expiryAlerts")}
          value={String(alerts.length)}
          tone={alerts.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label={t("ceo.weeklySales")}
          value={`₪${summary.weeklySales.toLocaleString()}`}
        />
      </div>

      <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-4 font-semibold text-brand-text">
          {t("branch.expiryAlerts")}
        </h2>
        <div className="flex flex-col gap-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-brand-text/50">—</p>
          ) : (
            alerts.map((alert) => {
              const tone = daysLeftToTone(alert.daysLeft);
              const label =
                alert.daysLeft < 0
                  ? t("expiry.expired")
                  : alert.daysLeft === 0
                    ? t("expiry.expiresToday")
                    : t("expiry.daysLeft", { days: alert.daysLeft });
              return (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-black/5"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-text">
                      {alert.productName}
                    </p>
                    <p className="text-xs text-brand-text/50">{alert.quantity}</p>
                  </div>
                  <ExpiryBadge label={label} tone={tone} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
