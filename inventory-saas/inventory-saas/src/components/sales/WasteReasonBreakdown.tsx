import { clsx } from "clsx";

/**
 * פירוט סיבות זריקה לתקופה — נאסף בכל צילום "זריקה" (ראו ARCHITECTURE.md →
 * "תנועות מלאי חלקיות וסיבת זריקה"). SUSPECTED_CONSUMPTION מודגש בכוונה —
 * זו הסיבה שנועדה בדיוק לתעד חשד לצריכה/נטילה לא מתועדת של עובד.
 */
export function WasteReasonBreakdown({
  rows,
  reasonLabels,
  unspecifiedLabel,
  quantityLabel,
  eventsLabel,
  emptyLabel,
  flaggedReason,
}: {
  rows: { reason: string; quantity: number; events: number }[];
  reasonLabels: Record<string, string>;
  unspecifiedLabel: string;
  quantityLabel: string;
  eventsLabel: string;
  emptyLabel: string;
  flaggedReason: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-brand-text/50">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => {
        const flagged = row.reason === flaggedReason;
        return (
          <div
            key={row.reason}
            className={clsx(
              "flex items-center justify-between rounded-lg px-3 py-2",
              flagged ? "bg-brand-danger/10" : "bg-black/[0.03]"
            )}
          >
            <span
              className={clsx(
                "text-sm font-medium",
                flagged ? "text-brand-danger" : "text-brand-text"
              )}
            >
              {reasonLabels[row.reason] ?? unspecifiedLabel}
            </span>
            <span className="text-xs text-brand-text/60">
              {quantityLabel}: {row.quantity} · {eventsLabel}: {row.events}
            </span>
          </div>
        );
      })}
    </div>
  );
}
