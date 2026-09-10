"use client";

import { useState, useTransition } from "react";
import type { TaskChecklistItem } from "@/lib/data/types";

/** פריט ברשימת בדיקה — נשמר מיד עם הקלקה, לא ממתין לשליחת הטופס הראשי */
export function ChecklistItem({
  taskId,
  item,
  action,
}: {
  taskId: string;
  item: TaskChecklistItem;
  action: (formData: FormData) => Promise<void>;
}) {
  const [done, setDone] = useState(item.done);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !done;
    setDone(next);
    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("itemId", item.id);
    formData.set("done", String(next));
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/5">
      <input
        type="checkbox"
        checked={done}
        disabled={isPending}
        onChange={toggle}
        className="h-4 w-4 rounded border-black/20"
      />
      <span
        className={done ? "text-sm text-brand-text/50 line-through" : "text-sm text-brand-text"}
      >
        {item.label}
      </span>
    </label>
  );
}
