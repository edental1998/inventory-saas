"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Link } from "@/i18n/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import type { TaskBoardLabels } from "./TaskBoardTabs";
import type { DbTask } from "@/lib/data/types";

type TabKey = "ALL" | "PENDING" | "IN_PROGRESS" | "OVERDUE" | "DONE";

export interface CeoTasksOverviewBranch {
  id: string;
  name: string;
  completionRate: number;
  tasks: DbTask[];
}

/**
 * כמו TaskBoardTabs (טאבים בתוך הדף, Overdue נגזר), אבל מקובץ לפי סניף —
 * לתצוגת "סקירה כלל-רשתית" של המנכ"ל (Slice 4). לחיצה על משימה מובילה
 * לעמוד פרטים לקריאה בלבד (/ceo/tasks/[taskId]) — לא לאותו נתיב עריכה
 * של מנהל/ת הסניף.
 */
export function CeoTasksOverviewTabs({
  branches,
  labels,
  completionRatePrefix,
}: {
  branches: CeoTasksOverviewBranch[];
  labels: TaskBoardLabels;
  completionRatePrefix: string;
}) {
  const [tab, setTab] = useState<TabKey>("ALL");
  const now = Date.now();
  const isOverdue = (task: DbTask) =>
    task.status !== "DONE" && task.dueAt !== null && new Date(task.dueAt).getTime() < now;

  const filterTasks = (tasks: DbTask[]) =>
    tasks.filter((task) => {
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
    <div className="flex flex-col gap-4">
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

      {branches.map((branch) => {
        const filtered = filterTasks(branch.tasks);
        return (
          <div
            key={branch.id}
            className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-brand-text">{branch.name}</h2>
              <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
                {completionRatePrefix}: {branch.completionRate}%
              </span>
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-brand-text/50">{labels.empty}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((task) => (
                  <Link key={task.id} href={`/ceo/tasks/${task.id}`} className="block">
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
      })}
    </div>
  );
}
