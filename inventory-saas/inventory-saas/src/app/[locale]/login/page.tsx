import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_HOME_PATH } from "@/lib/auth/types";
import { getCurrentTheme } from "@/lib/themes/current-theme";
import { listDemoAccounts } from "@/lib/data/users";
import { quickLoginAction } from "@/lib/auth/actions";
import { DEMO_ACCOUNT_PASSWORD } from "@/lib/auth/demo-password";
import { LoginForm } from "@/components/auth/LoginForm";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { GestionMark, PoweredByGestion } from "@/components/ui/GestionBranding";

const ROLE_LABEL_KEY: Record<string, string> = {
  CHAIN_MANAGER: "nav.ceoDashboard",
  BRANCH_MANAGER: "nav.branchDashboard",
  EMPLOYEE: "nav.employeeDashboard",
};

/**
 * מסך התחברות מלא-מותג ואמיתי: הרקע, הלוגו וצבע הכפתור מגיעים מ-BrandTheme
 * (שנטען מה-DB לפי רמז הארגון, ראו current-theme.ts), וההתחברות עצמה קוראת
 * בפועל למסד הנתונים ובודקת סיסמה מוצפנת (bcrypt) — לא UI מדומה.
 */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const showDemoAccounts = process.env.SHOW_DEMO_ACCOUNTS === "true";
  const [t, session, theme, demoAccounts] = await Promise.all([
    getTranslations(),
    getSession(),
    getCurrentTheme(),
    showDemoAccounts ? listDemoAccounts() : Promise.resolve([]),
  ]);

  if (session) {
    redirect(`/${locale}${ROLE_HOME_PATH[session.role]}`);
  }

  const accountsForOrg = demoAccounts.filter(
    (account) => account.orgName === theme.displayName
  );
  const boundQuickLogin = quickLoginAction.bind(null, locale);
  const googleErrorMessage =
    error === "google_no_account"
      ? t("login.googleErrorNoAccount")
      : error
        ? t("login.googleErrorGeneric")
        : null;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center p-6"
      style={
        theme.backgroundImage.login
          ? {
              backgroundImage: `url(${theme.backgroundImage.login})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: "var(--brand-color-primary)" }
      }
    >
      <div className="absolute end-6 top-6">
        <LocaleSwitcher />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="rounded-2xl bg-brand-surface p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <GestionMark className="h-24 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element -- לוגו חיצוני דינמי לפי מותג */}
            <img
              src={theme.logo.light}
              alt={theme.displayName}
              className="h-14 w-14 rounded-xl"
            />
            <h1 className="text-lg font-bold text-brand-text">
              {theme.displayName}
            </h1>
            <p className="text-sm text-brand-text/60">{t("login.title")}</p>
          </div>

          {googleErrorMessage ? (
            <p className="mb-3 rounded-lg bg-brand-danger/10 px-3 py-2 text-center text-sm text-brand-danger">
              {googleErrorMessage}
            </p>
          ) : null}

          <LoginForm locale={locale} />
        </div>

        {accountsForOrg.length > 0 ? (
          <div className="rounded-2xl bg-brand-surface/90 p-4 text-sm shadow-xl">
            <p className="mb-2 font-medium text-brand-text">
              {t("login.demoAccounts")}
            </p>
            <div className="flex flex-col gap-2">
              {accountsForOrg.map((account) => (
                <form key={account.email} action={boundQuickLogin}>
                  <input type="hidden" name="email" value={account.email} />
                  <input
                    type="hidden"
                    name="password"
                    value={DEMO_ACCOUNT_PASSWORD}
                  />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-between rounded-lg bg-black/5 px-3 py-2 text-start hover:bg-black/10"
                  >
                    <span className="text-brand-text">{account.name}</span>
                    <span className="text-xs text-brand-text/50">
                      {t(ROLE_LABEL_KEY[account.role] ?? "nav.employeeDashboard")}
                    </span>
                  </button>
                </form>
              ))}
            </div>
            <p className="mt-2 text-xs text-brand-text/40">
              {t("login.demoPasswordHint", { password: DEMO_ACCOUNT_PASSWORD })}
            </p>
          </div>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <PoweredByGestion className="rounded-full bg-brand-surface/90 px-3 py-1.5 shadow" />
      </div>
    </main>
  );
}
