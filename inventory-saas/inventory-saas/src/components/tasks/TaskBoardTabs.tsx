"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
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
  typeLabels: Record<DbTask["type"], string>;
  statusLabels: Record<DbTask["status"], string>;
}

/**
 * טאבים בתוך הדף (All/To Do/In Progress/Overdue/Completed) — לא ניתובים
 * נפרדים, לפי התכנון. "Overdue" נגזר מהמופע (due_at < עכשיו), לא נשען על
 * סטטוס OVERDUE מאוחסן (ראו תיעוד ה-migration ב-Slice 1).
 */
export function TaskBoardTabs({
  tasks,
  basePath,
  labels,
}: {
  tasks: DbTask[];
  basePath: string;
  labels: TaskBoardLabels;
}) {
  const [tab, setTab] = useState<TabKey>("ALL");
  const now = Date.now();
  const isOverdue = (task: DbTask) =>
    task.status !== "DONE" && task.dueAt !== null && new Date(task.dueAt).getTime() < now;

  const filtered = tasks.filter((task) => {
    if (tab === "ALL") return true;
    if (tab === "OVERDUE") return isOverdue(task);
    return task.status === tab;
  });

  const tabs: { key: TabKey; label: string }[] = [
    { key: "ALL", label: labels.all },
    { key: "PENDING", label: labels.pending },
    { key: "IN_PROGRESS", label: labels.inProgress },
    { key: "OVERDUE", label: labels.overdue },
    { key: "DONE", label: labels.done },
  ];

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
                : "bg-black/5 text-brand-text/70 hover:bg-black/10"
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-brand-text/50">{labels.empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => (
            <Link key={task.id} href={`${basePath}/${task.id}`} className="block">
              <TaskCard
                task={task}
                typeLabel={labels.typeLabels[task.type]}
                statusLabel={labels.statusLabels[task.status]}
                assignedToLabel={
                  task.assignedToName
                    ? `${labels.assignedToPrefix}: ${task.assignedToName}`
                    : undefined
                }
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
