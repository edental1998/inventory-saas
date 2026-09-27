"use client";

import { useRouter } from "@/i18n/navigation";

/**
 * בורר סניף פשוט ל"לפי סניף" — ניווט מיידי ב-query param (?branchId=),
 * בלי state נוסף; ה-server component שולף מחדש לפי searchParams.
 */
export function BranchPicker({
  branches,
  selectedBranchId,
  label,
}: {
  branches: { id: string; name: string }[];
  selectedBranchId: string;
  label: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-brand-text">
      {label}
      <select
        value={selectedBranchId}
        onChange={(e) => router.push(`/ceo/tasks/by-branch?branchId=${e.target.value}`)}
        className="rounded-lg border border-black/10 px-3 py-2 text-sm"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}
