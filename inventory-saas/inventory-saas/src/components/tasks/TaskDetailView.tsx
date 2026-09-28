import { Camera, Clock, ListChecks, User, UserCog, Eye } from "lucide-react";
import type { DbTask } from "@/lib/data/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { isTaskOverdue } from "@/lib/tasks/overdue";
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
  /** Slice 10 — כולם אופציונליים כדי לא לשבור קריאות קיימות שטרם עודכנו */
  assigneeLabel?: string;
  createdByLabel?: string;
  startedByLabel?: string;
  completedByActorLabel?: string;
  readOnlyNotice?: string;
  evidenceLabel?: string;
}

/**
 * תצוגת פרטי משימה משותפת — Slice 10: "סביבת עבודה" מאורגנת בסעיפים ברורים
 * (כותרת/סטטוס, הנחיות, צ'קליסט, יעד, שיוך/יצירה, תיעוד, הערות השלמה,
 * מטא-דאטה של מי-עשה-מה, ואזור פעולה), לא רשומת מסד נתונים מורחבת.
 * הפעולה הראשית (Start/Complete) בולטת; עקיפת מנהל/ת משנית ומובחנת בכוונה.
 * מצב "צפייה בלבד" (מנכ"ל) מסומן במפורש, לא רק בהיעדר כפתורים.
 */
export function TaskDetailView({
  task,
  locale,
  labels,
  canStart,
  canComplete,
  canOverride = false,
  proofPhotoSignedUrl = null,
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
  /** URL חתום קצר-טווח שנוצר בשרת אחרי בדיקת הרשאה (task.proofPhotoUrl הוא רק מפתח אובייקט, לא ניתן לתצוגה ישירה) */
  proofPhotoSignedUrl?: string | null;
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

  const overdue = isTaskOverdue(task);
  const isReadOnly = !canStart && !canComplete && !canOverride;
  const checklistTotal = task.checklist?.length ?? 0;
  const checklistDone = task.checklist?.filter((item) => item.done).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {isReadOnly && labels.readOnlyNotice ? (
        <div className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2 text-sm text-info">
          <Eye className="h-4 w-4 shrink-0" />
          {labels.readOnlyNotice}
        </div>
      ) : null}

      {/* כותרת + סטטוס */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">
              {labels.typeValues[task.type]}
            </p>
            <h1 className="mt-1 text-lg font-bold text-brand-text">{task.title}</h1>
          </div>
          {overdue ? (
            <Badge tone="danger">{labels.statusValues.OVERDUE}</Badge>
          ) : (
            <Badge
              tone={
                task.status === "DONE" ? "success" : task.status === "IN_PROGRESS" ? "info" : "neutral"
              }
            >
              {labels.statusValues[task.status]}
            </Badge>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-text-secondary">
          <span className={overdue ? "flex items-center gap-1.5 font-medium text-danger" : "flex items-center gap-1.5"}>
            <Clock className="h-4 w-4" />
            {labels.due}: {task.dueAt ? dateFormatter.format(new Date(task.dueAt)) : labels.noDue}
          </span>
          {task.assignedToName ? (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {labels.assigneeLabel ? `${labels.assigneeLabel}: ` : ""}
              {task.assignedToName}
            </span>
          ) : null}
          {task.photoRequired ? (
            <span className="flex items-center gap-1.5 text-brand-primary">
              <Camera className="h-4 w-4" />
              {labels.photoRequiredHint}
            </span>
          ) : null}
        </div>
      </Card>

      {/* הנחיות */}
      {task.description ? (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-brand-text">{labels.descriptionLabel}</h2>
          <p className="whitespace-pre-wrap text-sm text-brand-text-secondary">{task.description}</p>
        </Card>
      ) : null}

      {/* צ'קליסט */}
      {task.checklist && task.checklist.length > 0 ? (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-text">
              <ListChecks className="h-4 w-4 text-brand-text-muted" />
              {labels.checklistLabel}
            </h2>
            <span className="text-xs text-brand-text-muted">
              {checklistDone}/{checklistTotal}
            </span>
          </div>
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
                        ? "px-2 py-1.5 text-sm text-brand-text-muted line-through"
                        : "px-2 py-1.5 text-sm text-brand-text"
                    }
                  >
                    {item.done ? "☑" : "☐"} {item.label}
                  </p>
                ))}
          </div>
        </Card>
      ) : null}

      {/* תיעוד + הערות השלמה */}
      {task.status === "DONE" ? (
        <Card>
          {isOverrideCompletion ? (
            <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              {labels.completedBy}
            </p>
          ) : null}
          {task.completionNotes ? (
            <div className="mb-3">
              <h2 className="mb-1 text-sm font-semibold text-brand-text">
                {labels.completionNotesLabel}
              </h2>
              <p className="text-sm text-brand-text-secondary">{task.completionNotes}</p>
            </div>
          ) : null}
          {proofPhotoSignedUrl ? (
            <div>
              {labels.evidenceLabel ? (
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-text">
                  <Camera className="h-4 w-4 text-brand-text-muted" />
                  {labels.evidenceLabel}
                </h2>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element -- תמונת הוכחה שהועלתה דינמית, לא asset סטטי */}
              <img
                src={proofPhotoSignedUrl}
                alt=""
                className="max-h-80 w-full rounded-lg object-cover"
              />
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* מטא-דאטה: מי עשה מה */}
      {task.createdByName || task.startedByName || task.completedByName ? (
        <Card padding="sm">
          <div className="flex flex-col gap-2 text-xs text-brand-text-muted">
            {task.createdByName && labels.createdByLabel ? (
              <div className="flex items-center gap-2">
                <Avatar name={task.createdByName} size="sm" />
                <span>
                  {labels.createdByLabel}: {task.createdByName}
                </span>
              </div>
            ) : null}
            {task.startedByName && task.startedAt && labels.startedByLabel ? (
              <div className="flex items-center gap-2">
                <Avatar name={task.startedByName} size="sm" />
                <span>
                  {labels.startedByLabel}: {task.startedByName} ·{" "}
                  {dateFormatter.format(new Date(task.startedAt))}
                </span>
              </div>
            ) : null}
            {task.completedByName && task.completedAt && labels.completedByActorLabel ? (
              <div className="flex items-center gap-2">
                <Avatar name={task.completedByName} size="sm" />
                <span>
                  {labels.completedByActorLabel}: {task.completedByName} ·{" "}
                  {dateFormatter.format(new Date(task.completedAt))}
                </span>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* פעולה ראשית — בולטת ויזואלית */}
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

      {/* עקיפת מנהל/ת — משנית ומובחנת בכוונה, לא אותה בליטה כמו הפעולה הראשית */}
      {canOverride && task.status !== "DONE" ? (
        <div className="rounded-xl border border-dashed border-brand-border p-4">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-brand-text-muted">
            <UserCog className="h-3.5 w-3.5" />
            {labels.overrideButton}
          </div>
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
        </div>
      ) : null}
    </div>
  );
}
