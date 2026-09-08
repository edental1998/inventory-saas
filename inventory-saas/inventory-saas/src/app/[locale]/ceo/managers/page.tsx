import { getTranslations, getLocale } from "next-intl/server";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchSummariesForOrg } from "@/lib/data/branches";
import { getBranchManagersForOrg } from "@/lib/data/users";

export default async function CeoManagersPage({
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

  const [branches, managers] = await Promise.all([
    getBranchSummariesForOrg(session.organizationId),
    getBranchManagersForOrg(session.organizationId),
  ]);

  const managerByBranch = new Map(managers.map((m) => [m.branchId, m]));

  const currency = new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-brand-text">
          {t("ceo.managersTitle")}
        </h1>
        <p className="text-sm text-brand-text/60">
          {t("ceo.managersSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {branches.map((branch) => {
          const manager = managerByBranch.get(branch.id);
          return (
            <div
              key={branch.id}
              className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5"
            >
              <h2 className="font-semibold text-brand-text">{branch.name}</h2>
              {manager ? (
                <p className="mt-1 text-sm text-brand-text">
                  {manager.name}
                  <span className="text-brand-text/50"> · {manager.email}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-brand-text/50">
                  {t("ceo.noManagerAssigned")}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-brand-text/50">
                    {t("ceo.taskCompletionRate")}
                  </p>
                  <p className="font-medium text-brand-text">
                    {branch.taskCompletionRate}%
                  </p>
                </div>
                <div>
                  <p className="text-brand-text/50">
                    {t("ceo.openExpiryAlerts")}
                  </p>
                  <p className="font-medium text-brand-text">
                    {branch.openExpiryAlerts}
                  </p>
                </div>
                <div>
                  <p className="text-brand-text/50">{t("ceo.weeklySales")}</p>
                  <p className="font-medium text-brand-text">
                    {currency.format(branch.weeklySales)}
                  </p>
                </div>
                <div>
                  <p className="text-brand-text/50">{t("ceo.monthlySales")}</p>
                  <p className="font-medium text-brand-text">
                    {currency.format(branch.monthlySales)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
