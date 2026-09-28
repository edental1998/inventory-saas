import { Button } from "@/components/ui/Button";

/** טופס פשוט בלי אינטראקטיביות בצד לקוח — Server Action רגיל. הפעולה הראשית: גדולה, מלאת-רוחב, בולטת */
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
      <Button type="submit" className="w-full py-3.5 text-base">
        {label}
      </Button>
    </form>
  );
}
