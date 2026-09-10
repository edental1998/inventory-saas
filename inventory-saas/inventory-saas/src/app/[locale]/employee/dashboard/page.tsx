import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { requireSession } from "@/lib/auth/get-session";
import { getTasksForUserToday } from "@/lib/data/tasks";
import type { DbTask } from "@/lib/data/types";

function localDateStr(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

/**
 * "היום שלי" — מסך הבית של העובד/ת (Slice 2 של שיפוץ הניווט). מחליף את
 * דשבורד המשימות השטוח הקודם בארבעה אזורים לפי דחיפות אמיתית, כולל "באיחור"
 * שמחושב מהמופע (due_at < עכשיו) ולא נשען על סטטוס OVERDUE מאוחסן (שאף קוד
 * לא כתב אליו בפועל — ראו תיעוד ה-migration). "היום"/"הושלמו היום" מחושבים
 * לפי היום העסקי-מקומי של הסניף (branchTimezone), לא לפי חצות UTC.
 */
export default async function EmployeeDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: paramLocale } = await params;
  const [t, locale, session] = await Promise.all([
    getTranslations(),
    getLocale(),
    requireSession(paramLocale),
  ]);

  const tasks = await getTasksForUserToday(session.userId);
  const now = new Date();

  const overdue: DbTask[] = [];
  const needsNow: DbTask[] = [];
  const upcoming: DbTask[] = [];
  const completedToday: DbTask[] = [];

  for (const task of tasks) {
    if (task.status === "DONE") {
      completedToday.push(task);
      continue;
    }
    if (task.dueAt && new Date(task.dueAt) < now) {
      overdue.push(task);
      continue;
    }
    if (!task.dueAt) {
      needsNow.push(task);
      continue;
    }
    const dueLocal = localDateStr(new Date(task.dueAt), task.branchTimezone);
    const todayLocal = localDateStr(now, task.branchTimezone);
    if (dueLocal <= todayLocal) {
      needsNow.push(task);
    } else {
      upcoming.push(task);
    }
  }

  const hasAnyTasks =
    overdue.length + needsNow.length + upcoming.length + completedToday.length > 0;

  if (!hasAnyTasks) {
    return (
      <div className="flex h-full items-center justify-center text-center text-lg text-brand-text/60">
        {t("employee.noTasksToday")}
      </div>
    );
  }

  function taskList(list: DbTask[]) {
    return (
      <div className="flex flex-col gap-2">
        {list.map((task) => (
          <Link key={task.id} href={`/employee/tasks/${task.id}`} className="block">
            <TaskCard
              task={task}
              typeLabel={t(`task.type.${task.type}`)}
              statusLabel={t(`task.status.${task.status}`)}
              assignedToLabel={
                task.dueAt
                  ? new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: task.branchTimezone,
                    }).format(new Date(task.dueAt))
                  : undefined
              }
              photoLabel={t("employee.uploadPhoto")}
            />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {overdue.length > 0 ? (
        <section>
          <h2 className="mb-2 font-semibold text-brand-danger">
            {t("myDay.overdue")}
          </h2>
          {taskList(overdue)}
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-semibold text-brand-text">{t("myDay.needsNow")}</h2>
        {needsNow.length > 0 ? taskList(needsNow) : (
          <p className="text-sm text-brand-text/50">{t("myDay.noTasksInSection")}</p>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section>
          <h2 className="mb-2 font-semibold text-brand-text">{t("myDay.upcoming")}</h2>
          {taskList(upcoming)}
        </section>
      ) : null}

      {completedToday.length > 0 ? (
        <section>
          <h2 className="mb-2 font-semibold text-brand-text">
            {t("myDay.completedToday")}
          </h2>
          {taskList(completedToday)}
        </section>
      ) : null}
    </div>
  );
}
