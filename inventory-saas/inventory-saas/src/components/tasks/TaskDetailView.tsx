import type { DbTask } from "@/lib/data/types";
import { StartTaskForm } from "./StartTaskForm";
import { CompleteTaskForm } from "./CompleteTaskForm";
import { ChecklistItem } from "./ChecklistItem";

export interface TaskDetailLabels {
  descriptionLabel: string;
  due: string;
  noDue: string;
  checklistLabel: string;
  photoRequiredHint: string;
  startButton: string;
  completeButton: string;
  overrideButton: string;
  notesLabel: string;
  notesPlaceholder: string;
  photoLabel: string;
  submitting: string;
  missingPhoto: string;
  missingNotes: string;
  completedBy: string;
  completionNotesLabel: string;
  statusLabel: string;
  statusValues: Record<DbTask["status"], string>;
  typeValues: Record<DbTask["type"], string>;
}

/**
 * תצוגת פרטי משימה משותפת — נבנתה ב-Slice 2 עבור העובד/ת, ומיועדת להיות
 * משותפת גם ללוח המשימות של מנהל/ת סניף (Slice 3) ולתצוגת המנכ"ל (Slice 4,
 * שם canStart/canComplete/canOverride כולם false — צפייה בלבד).
 */
export function TaskDetailView({
  task,
  locale,
  labels,
  canStart,
  canComplete,
  canOverride = false,
  startAction,
  completeAction,
  overrideAction,
  toggleChecklistAction,
}: {
  task: DbTask;
  locale: string;
  labels: TaskDetailLabels;
  canStart: boolean;
  canComplete: boolean;
  canOverride?: boolean;
  startAction?: (formData: FormData) => Promise<void>;
  completeAction?: (formData: FormData) => Promise<void>;
  overrideAction?: (formData: FormData) => Promise<void>;
  toggleChecklistAction?: (formData: FormData) => Promise<void>;
}) {
  const dateFormatter = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: task.branchTimezone,
  });

  const isOverrideCompletion =
    task.status === "DONE" &&
    task.completedById !== null &&
    task.completedById !== task.assignedToId;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">
          {labels.typeValues[task.type]}
        </p>
        <h1 className="mt-1 text-lg font-bold text-brand-text">{task.title}</h1>
        {task.description ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-text/80">
            {task.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-brand-text/60">
          <span>
            {labels.statusLabel}: {labels.statusValues[task.status]}
          </span>
          <span>{labels.due}: {task.dueAt ? dateFormatter.format(new Date(task.dueAt)) : labels.noDue}</span>
        </div>

        {task.photoRequired ? (
          <p className="mt-2 text-xs text-brand-accent">📷 {labels.photoRequiredHint}</p>
        ) : null}
      </div>

      {task.checklist && task.checklist.length > 0 ? (
        <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-2 font-semibold text-brand-text">{labels.checklistLabel}</h2>
          <div className="flex flex-col gap-1">
            {toggleChecklistAction
              ? task.checklist.map((item) => (
                  <ChecklistItem
                    key={item.id}
                    taskId={task.id}
                    item={item}
                    action={toggleChecklistAction}
                  />
                ))
              : task.checklist.map((item) => (
                  <p
                    key={item.id}
                    className={
                      item.done
                        ? "px-2 py-1.5 text-sm text-brand-text/50 line-through"
                        : "px-2 py-1.5 text-sm text-brand-text"
                    }
                  >
                    {item.done ? "☑" : "☐"} {item.label}
                  </p>
                ))}
          </div>
        </div>
      ) : null}

      {task.status === "DONE" ? (
        <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
          {isOverrideCompletion ? (
            <p className="mb-2 rounded-lg bg-brand-warning/10 px-3 py-2 text-sm text-brand-warning">
              {labels.completedBy}
            </p>
          ) : null}
          {task.completionNotes ? (
            <>
              <h2 className="mb-1 font-semibold text-brand-text">
                {labels.completionNotesLabel}
              </h2>
              <p className="text-sm text-brand-text/80">{task.completionNotes}</p>
            </>
          ) : null}
        </div>
      ) : null}

      {canStart && task.status === "PENDING" ? (
        <StartTaskForm taskId={task.id} action={startAction!} label={labels.startButton} />
      ) : null}

      {canComplete && task.status === "IN_PROGRESS" ? (
        <CompleteTaskForm
          taskId={task.id}
          action={completeAction!}
          photoRequired={task.photoRequired}
          labels={{
            notesLabel: labels.notesLabel,
            notesPlaceholder: labels.notesPlaceholder,
            photoLabel: labels.photoLabel,
            submitLabel: labels.completeButton,
            submittingLabel: labels.submitting,
            missingPhoto: labels.missingPhoto,
            missingNotes: labels.missingNotes,
          }}
        />
      ) : null}

      {canOverride && task.status !== "DONE" ? (
        <CompleteTaskForm
          taskId={task.id}
          action={overrideAction!}
          photoRequired={task.photoRequired}
          isOverride
          labels={{
            notesLabel: labels.notesLabel,
            notesPlaceholder: labels.notesPlaceholder,
            photoLabel: labels.photoLabel,
            submitLabel: labels.overrideButton,
            submittingLabel: labels.submitting,
            missingPhoto: labels.missingPhoto,
            missingNotes: labels.missingNotes,
          }}
        />
      ) : null}
    </div>
  );
}
