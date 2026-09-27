import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { requireSession } from "@/lib/auth/get-session";
import { getOpenTasksForUser } from "@/lib/data/tasks";

/**
 * "המשימות שלי" של מנהל/ת הסניף — משימות שהוקצו אליו/ה אישית (מנהל/ת סניף
 * יכול/ה להיות גם משויך/ת ישירות, לא רק ליצור/לנהל). מקשר לאותו עמוד פרטים
 * משותף כמו לוח המשימות (/branch/tasks/[taskId]).
 */
export default async function BranchMyTasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session] = await Promise.all([
    getTranslations(),
    requireSession(locale),
  ]);

  const tasks = await getOpenTasksForUser(session.userId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/branch/tasks" className="text-sm text-brand-primary underline">
          {t("taskBoard.backToBoard")}
        </Link>
        <h1 className="mt-2 text-lg font-bold text-brand-text">
          {t("taskBoard.myTasksTitle")}
        </h1>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-brand-text/50">{t("ceo.noTasks")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <Link key={task.id} href={`/branch/tasks/${task.id}`} className="block">
              <TaskCard
                task={task}
                typeLabel={t(`task.type.${task.type}`)}
                statusLabel={t(`task.status.${task.status}`)}
                photoLabel={t("employee.uploadPhoto")}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
