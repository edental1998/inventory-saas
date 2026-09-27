"use client";

import { clsx } from "clsx";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * ניווט-משנה שטוח בתוך "משימות כל הסניפים" (סקירה/לפי סניף/ביצועי עובדים) —
 * לא סיידבר מקונן, לפי התכנון (זה נשאר ל-Slice 5). אותה שפת עיצוב כמו
 * "המשימות שלי" בלוח המשימות של מנהל/ת הסניף.
 */
export function CeoTasksSubNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-brand-primary text-brand-on-primary"
              : "border border-black/10 text-brand-text hover:bg-black/5"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
