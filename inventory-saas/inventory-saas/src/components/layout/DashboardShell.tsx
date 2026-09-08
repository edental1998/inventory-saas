import type { ReactNode } from "react";
import type { BrandTheme } from "@/lib/themes/types";
import { Sidebar, type SidebarNavItem } from "./Sidebar";
import { TopBar } from "./TopBar";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { PoweredByGestion } from "@/components/ui/GestionBranding";
import { logoutAction } from "@/lib/auth/actions";

/**
 * שלד משותף לשלושת הדשבורדים. כל דשבורד (הנהלה/סניף/עובד) מזין כאן רק את
 * פריטי הניווט והכותרות שלו — העיצוב, הלוגו, ה-RTL/LTR ומתג השפה זהים
 * בקוד ומגיעים אוטומטית מהמותג הפעיל (של המשתמש המחובר) ומהשפה הנבחרת.
 */
export function DashboardShell({
  theme,
  navItems,
  navExtra,
  appName,
  title,
  subtitle,
  roleLabel,
  locale,
  userName,
  signOutLabel,
  children,
}: {
  theme: BrandTheme;
  navItems: SidebarNavItem[];
  navExtra?: ReactNode;
  appName: string;
  title: string;
  subtitle?: string;
  roleLabel: string;
  locale: string;
  userName: string;
  signOutLabel: string;
  children: ReactNode;
}) {
  const boundLogout = logoutAction.bind(null, locale);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <Sidebar
          items={navItems}
          appName={appName}
          orgName={theme.displayName}
          roleLabel={roleLabel}
          logoSrc={theme.logo.light}
          navExtra={navExtra}
        />
        <div className="flex flex-1 flex-col">
          <TopBar
            title={title}
            subtitle={subtitle}
            roleLabel={roleLabel}
            actions={
              <>
                <span className="hidden text-sm text-brand-text/60 sm:inline">
                  {userName}
                </span>
                <LocaleSwitcher />
                <form action={boundLogout}>
                  <button
                    type="submit"
                    className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-brand-text/70 hover:bg-black/10"
                  >
                    {signOutLabel}
                  </button>
                </form>
              </>
            }
          />
          <main
            className="flex-1 bg-brand-background p-6"
            style={
              theme.backgroundImage.dashboard
                ? {
                    backgroundImage: `url(${theme.backgroundImage.dashboard})`,
                    backgroundRepeat: "repeat",
                    backgroundSize: "240px 240px",
                  }
                : undefined
            }
          >
            {children}
          </main>
        </div>
      </div>
      <PoweredByGestion className="border-t border-black/5 bg-brand-surface py-2" />
    </div>
  );
}
