import { getTranslations, getLocale } from "next-intl/server";
import { requireSession } from "@/lib/auth/get-session";
import {
  getDailySalesTrendForOrg,
  getTopProductsForOrg,
  getWasteVsSalesForOrg,
  getEstimatedVsActualForOrg,
  getWasteReasonBreakdownForOrg,
} from "@/lib/data/sales-analytics";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { TopProductsBarChart } from "@/components/charts/TopProductsBarChart";
import { WasteVsSalesChart } from "@/components/charts/WasteVsSalesChart";
import { EstimatedVsActualTable } from "@/components/sales/EstimatedVsActualTable";
import { WasteReasonBreakdown } from "@/components/sales/WasteReasonBreakdown";

export default async function CeoSalesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, uiLocale, session] = await Promise.all([
    getTranslations("sales"),
    getLocale(),
    requireSession(locale),
  ]);

  const [trend, topProducts, waste, estimatedVsActual, wasteReasons] = await Promise.all([
    getDailySalesTrendForOrg(session.organizationId),
    getTopProductsForOrg(session.organizationId),
    getWasteVsSalesForOrg(session.organizationId),
    getEstimatedVsActualForOrg(session.organizationId),
    getWasteReasonBreakdownForOrg(session.organizationId),
  ]);

  const productName = (p: { nameHe: string; nameEn: string }) =>
    uiLocale === "he" ? p.nameHe : p.nameEn;

  const currency = new Intl.NumberFormat(uiLocale === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });

  const reasonLabels: Record<string, string> = {
    EXPIRED: t("wasteReason.EXPIRED"),
    QUALITY_ISSUE: t("wasteReason.QUALITY_ISSUE"),
    PEST_CONTAMINATION: t("wasteReason.PEST_CONTAMINATION"),
    SUSPECTED_CONSUMPTION: t("wasteReason.SUSPECTED_CONSUMPTION"),
    OTHER: t("wasteReason.OTHER"),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-brand-text">{t("title")}</h1>
        <p className="text-sm text-brand-text/60">{t("orgSubtitle")}</p>
      </div>

      <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-4 font-semibold text-brand-text">{t("dailyTrend")}</h2>
        <TrendLineChart
          points={trend.map((p) => ({ date: p.date, value: p.revenue }))}
          formatValue={(v) => currency.format(v)}
          label={t("dailyTrend")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-4 font-semibold text-brand-text">{t("topProducts")}</h2>
          <TopProductsBarChart
            rows={topProducts.map((p) => ({ name: productName(p), value: p.quantity }))}
            formatValue={(v) => t("quantityUnit", { count: v })}
            emptyLabel={t("noData")}
          />
        </div>

        <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-4 font-semibold text-brand-text">{t("wasteVsSales")}</h2>
          <WasteVsSalesChart
            rows={waste.map((w) => ({
              name: productName(w),
              sold: w.sold,
              wasted: w.wasted,
              wastePercent: w.wastePercent,
            }))}
            soldLabel={t("sold")}
            wastedLabel={t("wasted")}
            emptyLabel={t("noData")}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-brand-text">{t("estimatedVsActual")}</h2>
        <p className="mb-4 mt-1 text-xs text-brand-text/60">{t("estimatedVsActualHint")}</p>
        <EstimatedVsActualTable
          rows={estimatedVsActual.map((r) => ({
            name: productName(r),
            estimatedSold: r.estimatedSold,
            actualSold: r.actualSold,
            gap: r.gap,
          }))}
          estimatedLabel={t("estimatedSold")}
          actualLabel={t("actualSold")}
          gapLabel={t("gap")}
          emptyLabel={t("noData")}
        />
      </div>

      <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-4 font-semibold text-brand-text">{t("wasteReasonsTitle")}</h2>
        <WasteReasonBreakdown
          rows={wasteReasons}
          reasonLabels={reasonLabels}
          unspecifiedLabel={t("wasteReasonUnspecified")}
          quantityLabel={t("quantityLabel")}
          eventsLabel={t("eventsLabel")}
          emptyLabel={t("noData")}
          flaggedReason="SUSPECTED_CONSUMPTION"
        />
      </div>
    </div>
  );
}
