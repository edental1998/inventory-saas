/** טופס פשוט בלי אינטראקטיביות בצד לקוח — Server Action רגיל, כמו כפתור "סמן כבוצע" הקיים */
export function StartTaskForm({
  taskId,
  action,
  label,
}: {
  taskId: string;
  action: (formData: FormData) => Promise<void>;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        className="w-full rounded-lg bg-brand-primary px-4 py-3 text-sm font-medium text-brand-on-primary"
      >
        {label}
      </button>
    </form>
  );
}
