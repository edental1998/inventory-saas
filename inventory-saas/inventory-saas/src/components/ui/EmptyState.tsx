import type { ReactNode } from "react";

/**
 * מצב ריק מכוון — לא עוד שורת טקסט אפורה בודדת. שימוש: מסך בלי משימות/
 * עובדים/מוצרים/סניפים, עם אייקון עדין, כותרת+הסבר, ואופציונלית פעולה
 * (קישור/כפתור) שמכוונת את המשתמש/ת לצעד הבא.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-border bg-brand-surface/50 px-6 py-10 text-center">
      {icon ? <div className="text-brand-text-muted">{icon}</div> : null}
      <div>
        <p className="font-medium text-brand-text">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-brand-text-secondary">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
