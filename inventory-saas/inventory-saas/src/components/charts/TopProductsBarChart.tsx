/**
 * דירוג מוצרים מובילים — רשימת פסים אופקיים עם שם + מספר מוצג תמיד לצד הפס,
 * כדי שהמידע לא תלוי רק באורך הפס (נגישות בסיסית). ראו ARCHITECTURE.md
 * → "תכנון Phase 3".
 */
export function TopProductsBarChart({
  rows,
  formatValue,
  emptyLabel,
}: {
  rows: { name: string; value: number }[];
  formatValue: (value: number) => string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-brand-text/50">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.name} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-brand-text">{row.name}</span>
            <span className="text-brand-text/60">{formatValue(row.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-black/5">
            <div
              className="h-2 rounded-full bg-brand-primary"
              style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
