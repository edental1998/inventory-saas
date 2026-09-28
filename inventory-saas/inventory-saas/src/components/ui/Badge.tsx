import type { ReactNode } from "react";
import { clsx } from "clsx";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  neutral: "bg-brand-text/10 text-brand-text-secondary",
  brand: "bg-brand-primary-soft text-brand-primary",
};

/**
 * צ'יפ סטטוס משותף — הבסיס להמשך איחוד TaskCard/ExpiryBadge לתחביר אחד
 * (Slice 10). לא מסתמך רק על צבע: משאיר מקום לאייקון קטן דרך ה-prop icon.
 */
export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone]
      )}
    >
      {icon}
      {children}
    </span>
  );
}
