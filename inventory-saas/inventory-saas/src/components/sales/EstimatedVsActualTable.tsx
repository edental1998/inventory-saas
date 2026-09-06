import { clsx } from "clsx";

/**
 * "אומדן מכירה" (מדף פחות פחת) מול מכירות שדווחו בפועל — כלי בקרה, לא נתון
 * מכירה בעצמו. פער חיובי גדול (אומדן > בפועל) עשוי להצביע על מכירות שלא
 * דווחו, או על חוסר לא מוסבר — ראו ARCHITECTURE.md → "תנועות מלאי חלקיות
 * וסיבת זריקה". חשוב: זה תמיד מוצג כאומדן, לעולם לא כאילו הוא מכירה אמיתית.
 */
export function EstimatedVsActualTable({
  rows,
  estimatedLabel,
  actualLabel,
  gapLabel,
  emptyLabel,
}: {
  rows: { name: string; estimatedSold: number; actualSold: number; gap: number }[];
  estimatedLabel: string;
  actualLabel: string;
  gapLabel: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-brand-text/50">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-black/5 text-brand-text/50">
            <th className="py-2 text-start font-medium"> </th>
            <th className="py-2 text-start font-medium">{estimatedLabel}</th>
            <th className="py-2 text-start font-medium">{actualLabel}</th>
            <th className="py-2 text-start font-medium">{gapLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-black/5 last:border-0">
              <td className="py-3 font-medium text-brand-text">{row.name}</td>
              <td className="py-3">{row.estimatedSold}</td>
              <td className="py-3">{row.actualSold}</td>
              <td
                className={clsx(
                  "py-3 font-medium",
                  row.gap > 0 ? "text-brand-danger" : "text-brand-text/60"
                )}
              >
                {row.gap > 0 ? `+${row.gap}` : row.gap}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
