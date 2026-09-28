import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_HOME_PATH } from "@/lib/auth/types";
import { getCurrentTheme } from "@/lib/themes/current-theme";
import { SignupForm } from "@/components/auth/SignupForm";
import { AuthShell } from "@/components/auth/AuthShell";

/**
 * מסך ההקמה העצמאית של עסק חדש: כאן בעל/ת עסק אמיתי/ת (בייקרי, בית קפה,
 * ועוד) יוצר/ת ארגון חדש משלו/ה במערכת — עם אימייל+סיסמה, או עם חשבון
 * Google — בלי שאף אחד אחר מזין את הפרטים בשמם. ראו
 * src/lib/auth/signup-actions.ts ו-src/lib/data/signup.ts.
 *
 * Slice 8: אותו AuthShell כמו login — לפני שיש ארגון, theme הוא ברירת
 * המחדל הניטרלית של Gestion (gestion-default.ts), לא עוד מותג-דמו.
 */
export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session, theme] = await Promise.all([
    getTranslations(),
    getSession(),
    getCurrentTheme(),
  ]);

  if (session) {
    redirect(`/${locale}${ROLE_HOME_PATH[session.role]}`);
  }

  return (
    <AuthShell theme={theme}>
      <div className="mb-6 text-center">
        <h1 className="text-lg font-bold text-brand-text">{t("signup.title")}</h1>
        <p className="text-sm text-brand-text-secondary">{t("signup.subtitle")}</p>
      </div>

      <SignupForm locale={locale} />

      <p className="mt-6 text-center text-sm text-brand-text-secondary">
        {t("signup.haveAccount")}{" "}
        <a
          href={`/${locale}/login`}
          className="font-medium text-brand-primary underline"
        >
          {t("signup.loginLink")}
        </a>
      </p>
    </AuthShell>
  );
}
