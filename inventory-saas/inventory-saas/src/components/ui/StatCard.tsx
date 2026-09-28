import type { ReactNode } from "react";
import { clsx } from "clsx";

type Tone = "default" | "success" | "warning" | "danger";

const toneToTextClass: Record<Tone, string> = {
  default: "text-brand-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-brand-border">
      <div className="flex items-center gap-2">
        {icon ? (
          <span className={clsx("[&>svg]:h-4 [&>svg]:w-4", toneToTextClass[tone])}>
            {icon}
          </span>
        ) : null}
        <p className="text-sm text-brand-text-secondary">{label}</p>
      </div>
      <p className={clsx("mt-2 text-3xl font-bold", toneToTextClass[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-brand-text-muted">{hint}</p> : null}
    </div>
  );
}
