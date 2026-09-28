import { getTranslations, getLocale } from "next-intl/server";
import { ArrowRight, ListChecks } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireSession } from "@/lib/auth/get-session";
import { getOpenTasksForUser } from "@/lib/data/tasks";
import { isTaskOverdue } from "@/lib/tasks/overdue";

/**
 * "המשימות שלי" של מנהל/ת הסניף — משימות שהוקצו אליו/ה אישית. מקשר לאותו
 * עמוד פרטים משותף כמו לוח המשימות (/branch/tasks/[taskId]). Slice 10: רק
 * עיצוב — אותה שאילתה, אותו נתיב.
 */
export default async function BranchMyTasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, uiLocale, session] = await Promise.all([
    getTranslations(),
    getLocale(),
    requireSession(locale),
  ]);

  const tasks = await getOpenTasksForUser(session.userId);
  const now = Date.now();

  const dateFmt = (iso: string, timeZone: string) =>
    new Intl.DateTimeFormat(uiLocale === "he" ? "he-IL" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone,
    }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/branch/tasks"
          className="flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          {t("taskBoard.backToBoard")}
        </Link>
        <h1 className="mt-2 text-lg font-bold text-brand-text">
          {t("taskBoard.myTasksTitle")}
        </h1>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={<ListChecks className="h-8 w-8" />} title={t("ceo.noTasks")} />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => {
            const overdue = isTaskOverdue(task, now);
            return (
              <Link key={task.id} href={`/branch/tasks/${task.id}`} className="block">
                <TaskCard
                  task={task}
                  typeLabel={t(`task.type.${task.type}`)}
                  statusLabel={t(`task.status.${task.status}`)}
                  overdueLabel={t("task.status.OVERDUE")}
                  isOverdue={overdue}
                  dueLabel={task.dueAt ? dateFmt(task.dueAt, task.branchTimezone) : undefined}
                  photoLabel={t("employee.uploadPhoto")}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
