import { getTranslations } from "next-intl/server";
import { TaskCard } from "@/components/ui/TaskCard";
import { requireSession } from "@/lib/auth/get-session";
import { getOpenTasksForUser } from "@/lib/data/tasks";
import { markTaskDoneAction } from "@/lib/actions/tasks";

/**
 * דשבורד העובד נשאר בכוונה הפשוט מכולם — ממשק גדול, בהיר וברור לשימוש
 * מהיר במהלך משמרת, ולעיתים על ידי עובד שעברית/אנגלית אינן שפת אמו.
 */
export default async function EmployeeDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session] = await Promise.all([
    getTranslations(),
    requireSession(locale),
  ]);

  const myTasks = await getOpenTasksForUser(session.userId);

  if (myTasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-lg text-brand-text/60">
        {t("employee.noTasksToday")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {myTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          typeLabel={t(`task.type.${task.type}`)}
          statusLabel={t(`task.status.${task.status}`)}
          photoLabel={t("employee.uploadPhoto")}
          action={
            <form action={markTaskDoneAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand-success px-4 py-2 text-sm font-medium text-white"
              >
                {t("employee.markDone")}
              </button>
            </form>
          }
        />
      ))}
    </div>
  );
}
