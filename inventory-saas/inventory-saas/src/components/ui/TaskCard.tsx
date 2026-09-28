import { clsx } from "clsx";
import { User, Clock, ListChecks, Camera } from "lucide-react";
import type { DbTask } from "@/lib/data/types";
import { Badge, type BadgeTone } from "./Badge";

const STATUS_TONE: Record<DbTask["status"], BadgeTone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  DONE: "success",
  OVERDUE: "danger",
};

/**
 * כרטיס משימה משותף לכל הרשימות (לוח משימות, המשימות שלי, היום שלי) —
 * Slice 10/11. "יותר מרשימת מסד נתונים": מציג בבת אחת כותרת, משויך/ת, יעד,
 * התקדמות צ'קליסט ודרישת תמונה — בלי לפרוץ לכרטיס-בתוך-כרטיס. "באיחור"
 * הוא תמיד ערך נגזר שמגיע מבחוץ (ראו lib/tasks/overdue.ts), לא מוחזק כאן.
 *
 * שני variants: `large` (כרטיסים גדולים וידידותיים למגע — "היום שלי" של
 * העובד/ת, Slice 11) ו-`quiet` (משימות שהושלמו — "שקטות" חזותית: שקיפות
 * מופחתת ובלי שורת המטא-דאטה התפעולית שכבר לא רלוונטית ברגע שהמשימה הושלמה).
 */
export function TaskCard({
  task,
  typeLabel,
  statusLabel,
  overdueLabel,
  isOverdue = false,
  assignedToLabel,
  dueLabel,
  photoLabel,
  action,
  large = false,
  quiet = false,
}: {
  task: DbTask;
  typeLabel: string;
  statusLabel: string;
  overdueLabel?: string;
  isOverdue?: boolean;
  assignedToLabel?: string;
  dueLabel?: string;
  photoLabel?: string;
  action?: React.ReactNode;
  large?: boolean;
  quiet?: boolean;
}) {
  const checklistTotal = task.checklist?.length ?? 0;
  const checklistDone = task.checklist?.filter((item) => item.done).length ?? 0;

  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-xl bg-brand-surface shadow-sm ring-1 transition-shadow",
        large ? "p-5" : "p-4",
        quiet ? "opacity-60 shadow-none ring-brand-border" : "hover:shadow-md",
        !quiet && isOverdue ? "ring-danger/30" : !quiet ? "ring-brand-border" : ""
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={clsx("truncate font-medium text-brand-text", large && "text-base")}>
          {task.title}
        </p>
        {!quiet ? (
          <div
            className={clsx(
              "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-brand-text-muted",
              large ? "text-sm" : "text-xs"
            )}
          >
            <span>{typeLabel}</span>
            {assignedToLabel ? (
              <span className="flex items-center gap-1">
                <User className={large ? "h-3.5 w-3.5" : "h-3 w-3"} />
                {assignedToLabel}
              </span>
            ) : null}
            {dueLabel ? (
              <span
                className={clsx(
                  "flex items-center gap-1",
                  isOverdue && "font-medium text-danger"
                )}
              >
                <Clock className={large ? "h-3.5 w-3.5" : "h-3 w-3"} />
                {dueLabel}
              </span>
            ) : null}
            {checklistTotal > 0 ? (
              <span className="flex items-center gap-1">
                <ListChecks className={large ? "h-3.5 w-3.5" : "h-3 w-3"} />
                {checklistDone}/{checklistTotal}
              </span>
            ) : null}
            {task.photoRequired ? (
              <span className="flex items-center gap-1 text-brand-primary">
                <Camera className={large ? "h-3.5 w-3.5" : "h-3 w-3"} />
                {photoLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isOverdue && overdueLabel ? (
          <Badge tone="danger">{overdueLabel}</Badge>
        ) : (
          <Badge tone={STATUS_TONE[task.status]}>{statusLabel}</Badge>
        )}
        {action}
      </div>
    </div>
  );
}
