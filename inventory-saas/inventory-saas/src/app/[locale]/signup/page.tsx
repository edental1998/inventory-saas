import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_HOME_PATH } from "@/lib/auth/types";
import { SignupForm } from "@/components/auth/SignupForm";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

/**
 * מסך ההקמה העצמאית של עסק חדש: כאן בעל/ת עסק אמיתי/ת (בייקרי, בית קפה,
 * ועוד) יוצר/ת ארגון חדש משלו/ה במערכת — עם אימייל+סיסמה, או עם חשבון
 * Google — בלי שאף אחד אחר מזין את הפרטים בשמם. ראו
 * src/lib/auth/signup-actions.ts ו-src/lib/data/signup.ts.
 */
export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session] = await Promise.all([getTranslations(), getSession()]);

  if (session) {
    redirect(`/${locale}${ROLE_HOME_PATH[session.role]}`);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-brand-background p-6">
      <div className="absolute end-6 top-6">
        <LocaleSwitcher />
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-brand-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold text-brand-text">
            {t("signup.title")}
          </h1>
          <p className="text-sm text-brand-text/60">{t("signup.subtitle")}</p>
        </div>

        <SignupForm locale={locale} />

        <p className="mt-6 text-center text-sm text-brand-text/60">
          {t("signup.haveAccount")}{" "}
          <a
            href={`/${locale}/login`}
            className="font-medium text-brand-primary underline"
          >
            {t("signup.loginLink")}
          </a>
        </p>
      </div>
    </main>
  );
}
