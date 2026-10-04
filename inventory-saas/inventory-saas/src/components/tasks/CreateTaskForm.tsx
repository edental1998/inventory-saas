"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { CreateTaskState } from "@/lib/actions/tasks";

export type CreateTaskFormLabels = {
  titlePlaceholder: string;
  assignPlaceholder: string;
  dueDateLabel: string;
  dueTimeLabel: string;
  descriptionPlaceholder: string;
  checklistPlaceholder: string;
  photoRequiredLabel: string;
  submit: string;
  submitting: string;
  created: string;
  errors: Record<Exclude<CreateTaskState, { status: "idle" | "ok" }>["code"], string>;
  typeLabels: Record<string, string>;
};

/**
 * טופס יצירת משימה. כל כשל בשרת מוצג כהודעה מפורשת (useActionState) —
 * אין כישלון שקט. הטופס נשלח ידנית (ולא כ-<form action>) כדי ש-React לא
 * ינקה את השדות אחרי שגיאת ולידציה; מנקים רק אחרי הצלחה.
 */
export function CreateTaskForm({
  action,
  employees,
  taskTypes,
  labels,
}: {
  action: (prev: CreateTaskState, formData: FormData) => Promise<CreateTaskState>;
  employees: { id: string; name: string }[];
  taskTypes: readonly string[];
  labels: CreateTaskFormLabels;
}) {
  const [state, dispatch] = useActionState(action, { status: "idle" } as CreateTaskState);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok") formRef.current?.reset();
  }, [state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-t border-brand-border p-4"
    >
      <div className="flex flex-wrap gap-3">
        <Input
          name="title"
          required
          placeholder={labels.titlePlaceholder}
          className="min-w-[200px] flex-1"
        />
        <Select name="type" className="w-auto" defaultValue="CUSTOM">
          {taskTypes.map((type) => (
            <option key={type} value={type}>
              {labels.typeLabels[type] ?? type}
            </option>
          ))}
        </Select>
        <Select name="assignedToId" className="w-auto" defaultValue="">
          <option value="">{labels.assignPlaceholder}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-brand-text-secondary">
          {labels.dueDateLabel}
          <Input type="date" name="dueDate" className="w-auto" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-brand-text-secondary">
          {labels.dueTimeLabel}
          <Input type="time" name="dueTime" className="w-auto" />
        </label>
      </div>

      <Textarea name="description" placeholder={labels.descriptionPlaceholder} rows={2} />

      <Textarea name="checklist" placeholder={labels.checklistPlaceholder} rows={3} />

      <label className="flex items-center gap-2 text-sm text-brand-text">
        <input
          type="checkbox"
          name="photoRequired"
          className="h-4 w-4 rounded border-brand-border accent-brand-primary"
        />
        {labels.photoRequiredLabel}
      </label>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {labels.errors[state.code]}
        </p>
      ) : null}
      {state.status === "ok" ? (
        <p role="status" className="text-sm font-medium text-success">
          {labels.created}
        </p>
      ) : null}

      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
