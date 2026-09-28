import { getTranslations, getLocale } from "next-intl/server";
import { AlertTriangle, Sun, CalendarClock, CheckCircle2, PartyPopper } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { requireSession } from "@/lib/auth/get-session";
import { getTasksForUserToday } from "@/lib/data/tasks";
import { isTaskOverdue } from "@/lib/tasks/overdue";
import type { DbTask } from "@/lib/data/types";

function localDateStr(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

/**
 * "היום שלי" — מסך הבית של העובד/ת. Slice 11: חוויית עבודה ממוקדת-נייד,
 * הרבה יותר פשוטה מהניסיון של מנהל/ת סניף/מנכ"ל בכוונה — לא "עוד דשבורד
 * ניהולי". אותם 4 אזורי דחיפות בדיוק כמו קודם (Overdue/Needs Now/Upcoming/
 * Completed Today), אותה שאילתה ואותה לוגיקת חלוקה (getTasksForUserToday +
 * due_at מול "עכשיו" לפי אזור הזמן של הסניף) — רק העיצוב השתנה: כרטיסים
 * גדולים וידידותיים למגע (TaskCard variant="large"), "באיחור" בולט אבל לא
 * צועק על כל העמוד (טבעת אדומה דקה בלבד + ספירה ליד הכותרת, לא רקע אדום
 * מלא), ומשימות שהושלמו "שקטות" חזותית (TaskCard variant="quiet").
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
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <PartyPopper className="h-10 w-10 text-brand-primary" />
        <p className="text-lg font-medium text-brand-text">{t("employee.noTasksToday")}</p>
      </div>
    );
  }

  const dateFmt = (iso: string, timeZone: string) =>
    new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone,
    }).format(new Date(iso));

  function taskList(list: DbTask[], options?: { large?: boolean; quiet?: boolean }) {
    return (
      <div className="flex flex-col gap-2.5">
        {list.map((task) => {
          const overdueNow = isTaskOverdue(task);
          return (
            <Link key={task.id} href={`/employee/tasks/${task.id}`} className="block">
              <TaskCard
                task={task}
                typeLabel={t(`task.type.${task.type}`)}
                statusLabel={t(`task.status.${task.status}`)}
                overdueLabel={t("task.status.OVERDUE")}
                isOverdue={overdueNow}
                dueLabel={task.dueAt ? dateFmt(task.dueAt, task.branchTimezone) : undefined}
                photoLabel={t("employee.uploadPhoto")}
                large={options?.large}
                quiet={options?.quiet}
              />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {overdue.length > 0 ? (
        <section>
          <h2 className="mb-2.5 flex items-center gap-1.5 font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" />
            {t("myDay.overdue")}
            <span className="text-sm font-normal text-danger/70">({overdue.length})</span>
          </h2>
          {taskList(overdue, { large: true })}
        </section>
      ) : null}

      <section>
        <h2 className="mb-2.5 flex items-center gap-1.5 font-semibold text-brand-text">
          <Sun className="h-4 w-4 text-brand-text-muted" />
          {t("myDay.needsNow")}
        </h2>
        {needsNow.length > 0 ? (
          taskList(needsNow, { large: true })
        ) : (
          <p className="text-sm text-brand-text-muted">{t("myDay.noTasksInSection")}</p>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section>
          <h2 className="mb-2.5 flex items-center gap-1.5 font-semibold text-brand-text">
            <CalendarClock className="h-4 w-4 text-brand-text-muted" />
            {t("myDay.upcoming")}
          </h2>
          {taskList(upcoming)}
        </section>
      ) : null}

      {completedToday.length > 0 ? (
        <section>
          <h2 className="mb-2.5 flex items-center gap-1.5 font-semibold text-brand-text-secondary">
            <CheckCircle2 className="h-4 w-4 text-success" />
            {t("myDay.completedToday")}
          </h2>
          {taskList(completedToday, { quiet: true })}
        </section>
      ) : null}
    </div>
  );
}
