"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListChecks } from "lucide-react";
import { isTaskOverdue } from "@/lib/tasks/overdue";
import type { DbTask } from "@/lib/data/types";

type TabKey = "ALL" | "PENDING" | "IN_PROGRESS" | "OVERDUE" | "DONE";

export interface TaskBoardLabels {
  all: string;
  pending: string;
  inProgress: string;
  overdue: string;
  done: string;
  empty: string;
  assignedToPrefix: string;
  photoLabel?: string;
  typeLabels: Record<DbTask["type"], string>;
  statusLabels: Record<DbTask["status"], string>;
}

/**
 * טאבים בתוך הדף (All/To Do/In Progress/Overdue/Completed) — לא ניתובים
 * נפרדים, לפי התכנון. "Overdue" נגזר מהמופע (ראו lib/tasks/overdue.ts),
 * לא נשען על סטטוס OVERDUE מאוחסן. Slice 10: כל טאב מציג ספירה, וכרטיסי
 * המשימות מציגים יעד+התקדמות צ'קליסט+דרישת תמונה, לא רק כותרת/סטטוס.
 */
export function TaskBoardTabs({
  tasks,
  basePath,
  labels,
  locale = "he",
}: {
  tasks: DbTask[];
  basePath: string;
  labels: TaskBoardLabels;
  /** לא חובה — קריאות קיימות (למשל ceo/tasks/by-branch) שלא הועברו עדיין ל-Slice 10 ממשיכות לעבוד עם ברירת המחדל */
  locale?: string;
}) {
  const [tab, setTab] = useState<TabKey>("ALL");
  const now = Date.now();

  const counts = {
    ALL: tasks.length,
    PENDING: tasks.filter((t) => t.status === "PENDING").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    OVERDUE: tasks.filter((t) => isTaskOverdue(t, now)).length,
    DONE: tasks.filter((t) => t.status === "DONE").length,
  };

  const filtered = tasks.filter((task) => {
    if (tab === "ALL") return true;
    if (tab === "OVERDUE") return isTaskOverdue(task, now);
    return task.status === tab;
  });

  const tabs: { key: TabKey; label: string }[] = [
    { key: "ALL", label: labels.all },
    { key: "PENDING", label: labels.pending },
    { key: "IN_PROGRESS", label: labels.inProgress },
    { key: "OVERDUE", label: labels.overdue },
    { key: "DONE", label: labels.done },
  ];

  const dateFmt = (iso: string, timeZone: string) =>
    new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone,
    }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === tb.key
                ? "bg-brand-primary text-brand-on-primary"
                : "bg-black/5 text-brand-text-secondary hover:bg-black/10"
            )}
          >
            {tb.label}
            <span className={clsx("ms-1.5", tab === tb.key ? "text-brand-on-primary/70" : "text-brand-text-muted")}>
              {counts[tb.key]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ListChecks className="h-8 w-8" />} title={labels.empty} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => {
            const overdue = isTaskOverdue(task, now);
            return (
              <Link key={task.id} href={`${basePath}/${task.id}`} className="block">
                <TaskCard
                  task={task}
                  typeLabel={labels.typeLabels[task.type]}
                  statusLabel={labels.statusLabels[task.status]}
                  overdueLabel={labels.overdue}
                  isOverdue={overdue}
                  assignedToLabel={task.assignedToName ?? undefined}
                  dueLabel={task.dueAt ? dateFmt(task.dueAt, task.branchTimezone) : undefined}
                  photoLabel={labels.photoLabel}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
