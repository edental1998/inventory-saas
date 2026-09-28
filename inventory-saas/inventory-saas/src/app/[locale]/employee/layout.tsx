import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Sun, ListChecks, Package, Trash2, User } from "lucide-react";
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

  const iconProps = { className: "h-[18px] w-[18px]" };
  const navItems: SidebarNavItem[] = [
    {
      type: "link",
      href: "/employee/dashboard",
      label: t("nav.myDay"),
      icon: <Sun {...iconProps} />,
    },
    { type: "disabled", label: t("nav.myTasks"), icon: <ListChecks {...iconProps} /> },
    { type: "disabled", label: t("nav.inventory"), icon: <Package {...iconProps} /> },
    {
      type: "link",
      href: "/employee/capture",
      label: t("nav.wasteDisposal"),
      icon: <Trash2 {...iconProps} />,
    },
    { type: "disabled", label: t("nav.profile"), icon: <User {...iconProps} /> },
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
