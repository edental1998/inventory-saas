import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getCurrentTheme } from "@/lib/themes/current-theme";
import { requireSession } from "@/lib/auth/get-session";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { SidebarNavItem } from "@/components/layout/Sidebar";

/**
 * ניווט העובד/ת (Slice 5) — שטוח לגמרי, בלי קבוצות (כך גם בתכנון). "המשימות
 * שלי" (רשימה שטוחה נפרדת מ"היום שלי" המתוכנן) טרם נבנתה בפועל — disabled,
 * לא "עמוד מזויף". "פסולת / השלכה" הוא אותו /employee/capture הקיים, רק
 * בתווית ברורה יותר.
 */
export default async function EmployeeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, theme, session] = await Promise.all([
    getTranslations(),
    getCurrentTheme(),
    requireSession(locale),
  ]);

  const navItems: SidebarNavItem[] = [
    { type: "link", href: "/employee/dashboard", label: t("nav.myDay") },
    { type: "disabled", label: t("nav.myTasks") },
    { type: "disabled", label: t("nav.inventory") },
    { type: "link", href: "/employee/capture", label: t("nav.wasteDisposal") },
    { type: "disabled", label: t("nav.profile") },
  ];

  return (
    <DashboardShell
      theme={theme}
      appName={t("common.appName")}
      roleLabel={t("nav.employeeDashboard")}
      title={t("employee.title")}
      subtitle={t("employee.subtitle")}
      locale={locale}
      userName={session.name}
      signOutLabel={t("common.signOut")}
      comingSoonLabel={t("nav.comingSoon")}
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}
