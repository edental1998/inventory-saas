"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

export interface BranchSwitcherBranch {
  id: string;
  name: string;
}

/**
 * כפתור עם סרגל נפתח (dropdown) לבחירת סניף לקידוח — אין עדיין רכיב
 * dropdown/menu משותף בקוד, אז זה הראשון; שומר על אותה שפת עיצוב
 * (bg-brand-surface, ring-black/5) כמו שאר הרכיבים בסיידבר.
 */
export function BranchSwitcher({
  branches,
  label,
}: {
  branches: BranchSwitcherBranch[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (branches.length === 0) return null;

  return (
    <div ref={containerRef} className="relative px-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium text-brand-text hover:bg-black/5"
      >
        {label}
        <span aria-hidden className="text-brand-text/40">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div className="absolute start-2 end-2 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg bg-brand-surface p-1 shadow-lg ring-1 ring-black/10">
          {branches.map((branch) => (
            <Link
              key={branch.id}
              href={`/ceo/branches/${branch.id}`}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-brand-text hover:bg-black/5"
            >
              {branch.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
