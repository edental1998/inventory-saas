import { clsx } from "clsx";

/**
 * פחת מול מכירות לכל מוצר — פס דו-צבעי (נמכר/נזרק) + אחוז פחת מוצג במפורש
 * כטקסט, לא רק כצבע. הנתון הזה קיים בזכות צילומי "זריקה" האמיתיים מ-Phase 2
 * (stock_movements מסוג WASTE) — ראו ARCHITECTURE.md → "תכנון Phase 3".
 */
export function WasteVsSalesChart({
  rows,
  soldLabel,
  wastedLabel,
  emptyLabel,
}: {
  rows: { name: string; sold: number; wasted: number; wastePercent: number }[];
  soldLabel: string;
  wastedLabel: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-brand-text/50">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => {
        const total = row.sold + row.wasted || 1;
        const soldPct = (row.sold / total) * 100;
        return (
          <div key={row.name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-brand-text">{row.name}</span>
              <span
                className={clsx(
                  "font-medium",
                  row.wastePercent >= 20 ? "text-brand-danger" : "text-brand-text/60"
                )}
              >
                {row.wastePercent}% {wastedLabel}
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-black/5">
              <div className="h-full bg-brand-success" style={{ width: `${soldPct}%` }} />
              <div className="h-full bg-brand-danger" style={{ width: `${100 - soldPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-brand-text/50">
              <span>
                {soldLabel}: {row.sold}
              </span>
              <span>
                {wastedLabel}: {row.wasted}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
