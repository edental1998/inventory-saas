import { clsx } from "clsx";

/** placeholder טעינה — צורה קרובה ללייאאוט הסופי, בלי הבהוב טקסט "Loading..." */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-brand-text/10", className)} />;
}
