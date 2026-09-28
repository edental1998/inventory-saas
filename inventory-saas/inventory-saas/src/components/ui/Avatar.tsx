import { clsx } from "clsx";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

/** אווטאר ראשי תיבות — לשימוש בעובדים/מנהלים/פעילות אחרונה, בלי תלות בתמונת פרופיל */
export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: keyof typeof sizeClasses;
}) {
  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-primary-soft font-semibold text-brand-primary",
        sizeClasses[size]
      )}
    >
      {initials(name)}
    </div>
  );
}
