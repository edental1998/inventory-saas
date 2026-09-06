import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_HOME_PATH } from "@/lib/auth/types";
import { listOrganizations } from "@/lib/data/organizations";
import { chooseOrgHintAction } from "@/lib/auth/actions";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

/**
 * מסך הבית: אם כבר מחוברים — ישר לדשבורד המתאים לתפקיד. אם לא — בוחרים
 * ארגון (מדמה כניסה דרך תת-דומיין ממותג) ועוברים למסך ההתחברות שלו.
 */
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session, organizations] = await Promise.all([
    getTranslations(),
    getSession(),
    listOrganizations(),
  ]);

  if (session) {
    redirect(`/${locale}${ROLE_HOME_PATH[session.role]}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-brand-background p-6">
      <div className="absolute end-6 top-6">
        <LocaleSwitcher />
      </div>

      <div className="text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-primary" aria-hidden />
        <h1 className="text-2xl font-bold text-brand-text">
          {t("common.appName")}
        </h1>
        <p className="mt-1 text-brand-text/60">{t("landing.subtitle")}</p>
      </div>

      <div className="grid w-full max-w-md gap-3">
        {organizations.map((org) => {
          const boundAction = chooseOrgHintAction.bind(null, org.slug, locale);
          return (
            <form key={org.id} action={boundAction}>
              <button
                type="submit"
                className="w-full rounded-xl bg-brand-surface px-5 py-4 text-center font-medium text-brand-text shadow-sm ring-1 ring-black/5 transition-colors hover:bg-brand-primary hover:text-brand-on-primary"
              >
                {org.name}
              </button>
            </form>
          );
        })}
      </div>

      <Link
        href="/login"
        className="text-sm text-brand-text/50 underline underline-offset-2"
      >
        {t("common.goToLogin")}
      </Link>
    </main>
  );
}
