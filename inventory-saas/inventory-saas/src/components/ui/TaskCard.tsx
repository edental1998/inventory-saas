import { clsx } from "clsx";
import type { DbTask } from "@/lib/data/types";

const statusDotClasses: Record<DbTask["status"], string> = {
  PENDING: "bg-brand-text/30",
  IN_PROGRESS: "bg-brand-accent",
  DONE: "bg-brand-success",
  OVERDUE: "bg-brand-danger",
};

export function TaskCard({
  task,
  typeLabel,
  statusLabel,
  assignedToLabel,
  photoLabel,
  action,
}: {
  task: DbTask;
  typeLabel: string;
  statusLabel: string;
  assignedToLabel?: string;
  photoLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-brand-surface p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <span
          className={clsx(
            "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
            statusDotClasses[task.status]
          )}
          aria-hidden
        />
        <div>
          <p className="font-medium text-brand-text">{task.title}</p>
          <p className="mt-0.5 text-xs text-brand-text/60">
            {typeLabel} · {statusLabel}
            {assignedToLabel ? ` · ${assignedToLabel}` : ""}
          </p>
          {task.photoRequired && photoLabel ? (
            <p className="mt-0.5 text-xs text-brand-accent">📷 {photoLabel}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
