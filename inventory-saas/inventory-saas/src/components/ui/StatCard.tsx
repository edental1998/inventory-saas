import { clsx } from "clsx";

type Tone = "default" | "success" | "warning" | "danger";

const toneToTextClass: Record<Tone, string> = {
  default: "text-brand-primary",
  success: "text-brand-success",
  warning: "text-brand-warning",
  danger: "text-brand-danger",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-sm text-brand-text/60">{label}</p>
      <p className={clsx("mt-2 text-3xl font-bold", toneToTextClass[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-brand-text/50">{hint}</p> : null}
    </div>
  );
}
