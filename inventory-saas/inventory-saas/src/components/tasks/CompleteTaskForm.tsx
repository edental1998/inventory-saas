"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { Textarea } from "@/components/ui/Input";

/**
 * טופס "השלם משימה" — משותף להשלמה עצמית ולעקיפת מנהל/ת (isOverride מוסיף
 * חובת הערה, ראו lib/actions/tasks.ts). אימות תמונה/הערה נעשה גם כאן (חוויה)
 * וגם בשרת (אכיפה אמיתית) — ראו completeTaskAction/overrideCompleteTaskAction.
 * Slice 10: כפתור ההשלמה הרגילה נשאר ירוק (success, "פעולה ראשית" בולטת);
 * העקיפה משתמשת בכפתור "secondary" מרוסן יותר — ההבחנה החזותית מהעטיפה
 * ב-TaskDetailView (מסגרת מקווקוות) ומכאן משלימות זו את זו.
 */
export function CompleteTaskForm({
  taskId,
  action,
  photoRequired,
  isOverride = false,
  labels,
}: {
  taskId: string;
  action: (formData: FormData) => Promise<void>;
  photoRequired: boolean;
  isOverride?: boolean;
  labels: {
    notesLabel: string;
    notesPlaceholder: string;
    photoLabel: string;
    submitLabel: string;
    submittingLabel: string;
    missingPhoto: string;
    missingNotes: string;
  };
}) {
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (photoRequired && !photoFile) {
      setError(labels.missingPhoto);
      return;
    }
    if (isOverride && !notes.trim()) {
      setError(labels.missingNotes);
      return;
    }

    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("notes", notes);
    if (photoFile) formData.set("photo", photoFile);

    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium text-brand-text">
          {labels.notesLabel}
          {isOverride ? " *" : ""}
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={labels.notesPlaceholder}
          rows={3}
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-brand-text">
          {labels.photoLabel}
          {photoRequired ? " *" : ""}
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-brand-text-secondary"
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className={clsx(
          "rounded-lg px-4 py-3.5 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          isOverride
            ? "bg-brand-primary-soft text-brand-primary hover:bg-brand-primary-soft/70"
            : "w-full bg-success text-white hover:bg-success/90"
        )}
      >
        {isPending ? labels.submittingLabel : labels.submitLabel}
      </button>
    </form>
  );
}
