import type { ReactNode } from "react";
import { clsx } from "clsx";

type CardPadding = "none" | "sm" | "md" | "lg";

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

/** שכבת "משטח" משותפת — surface רגיל (רוב הכרטיסים) או elevated (מודלים/פופאובר) */
export function Card({
  children,
  className,
  elevated = false,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  padding?: CardPadding;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl ring-1 ring-brand-border",
        elevated ? "bg-brand-surface-elevated shadow-md" : "bg-brand-surface shadow-sm",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
