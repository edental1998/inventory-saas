import type { ReactNode } from "react";

export function TopBar({
  title,
  subtitle,
  roleLabel,
  actions,
}: {
  title: string;
  subtitle?: string;
  roleLabel: string;
  actions: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 bg-brand-surface px-6 py-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">
          {roleLabel}
        </p>
        <h1 className="text-xl font-bold text-brand-text">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-brand-text/60">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">{actions}</div>
    </header>
  );
}
