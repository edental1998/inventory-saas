import { clsx } from "clsx";

type Tone = "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

/** ממיר מספר ימים עד תפוגה לטון חזותי: אדום אם כבר פג/פג היום, כתום אם קרוב, ירוק אחרת */
export function daysLeftToTone(daysLeft: number): Tone {
  if (daysLeft <= 0) return "danger";
  if (daysLeft <= 2) return "warning";
  return "success";
}

export function ExpiryBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  );
}
