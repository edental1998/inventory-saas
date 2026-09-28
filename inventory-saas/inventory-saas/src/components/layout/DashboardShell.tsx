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
 *
 * Slice 7: מי-אני/התנתקות עברו לתחתית ה-Sidebar (בלוק פרופיל קבוע, כמו
 * ברוב מוצרי SaaS מודרניים) — ה-TopBar נשאר ממוקד בהקשר של העמוד עצמו
 * (כותרת/תת-כותרת/שפה), לא עוד "כי יש מקום".
 */
export function DashboardShell({
  theme,
  navItems,
  comingSoonLabel,
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
  comingSoonLabel: string;
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
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar
          items={navItems}
          appName={appName}
          orgName={theme.displayName}
          roleLabel={roleLabel}
          logoSrc={theme.logo.light}
          comingSoonLabel={comingSoonLabel}
          userName={userName}
          signOutLabel={signOutLabel}
          signOutAction={boundLogout}
        />
        <div className="flex flex-1 flex-col">
          <TopBar
            title={title}
            subtitle={subtitle}
            roleLabel={roleLabel}
            actions={<LocaleSwitcher />}
          />
          <main
            className="flex-1 bg-brand-background p-6 md:p-8"
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
      <PoweredByGestion className="border-t border-brand-border bg-brand-surface py-2" />
    </div>
  );
}
