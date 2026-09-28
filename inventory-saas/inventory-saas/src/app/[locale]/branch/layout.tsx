import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Camera,
  TrendingUp,
  Package,
  FileText,
} from "lucide-react";
import { getCurrentTheme } from "@/lib/themes/current-theme";
import { requireSession } from "@/lib/auth/get-session";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { SidebarNavItem } from "@/components/layout/Sidebar";

/**
 * ניווט מנהל/ת הסניף (Slice 5). "קליטה וזריקה" (לשעבר "צלם מוצר") נשאר
 * פריט שטוח עם אותו נתיב/פונקציונליות — זרימה תפעולית פעילה, לא נעלמת
 * רק כדי להתאים בדיוק לעץ המתוכנן (הוחלט מפורשות לא להסתיר תכונה עובדת).
 * Employees/Inventory/Reports עדיין Phase 2/3 — disabled, לא נבנו "בעמוד מזויף".
 */
export default async function BranchLayout({
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
      href: "/branch/dashboard",
      label: t("nav.branchDashboard"),
      icon: <LayoutDashboard {...iconProps} />,
    },
    {
      type: "group",
      label: t("nav.employees"),
      icon: <Users {...iconProps} />,
      children: [
        { type: "disabled", label: t("nav.allEmployees") },
        { type: "disabled", label: t("nav.activeToday") },
      ],
    },
    {
      type: "group",
      label: t("nav.tasks"),
      icon: <ListChecks {...iconProps} />,
      children: [
        { type: "link", href: "/branch/tasks", label: t("nav.taskBoard") },
        { type: "link", href: "/branch/tasks/mine", label: t("nav.myTasks") },
      ],
    },
    {
      type: "link",
      href: "/branch/capture",
      label: t("nav.intakeWaste"),
      icon: <Camera {...iconProps} />,
    },
    {
      type: "link",
      href: "/branch/sales",
      label: t("nav.sales"),
      icon: <TrendingUp {...iconProps} />,
    },
    {
      type: "group",
      label: t("nav.inventory"),
      icon: <Package {...iconProps} />,
      children: [
        { type: "disabled", label: t("nav.stock") },
        { type: "disabled", label: t("nav.alerts") },
        { type: "disabled", label: t("nav.waste") },
      ],
    },
    { type: "disabled", label: t("nav.reports"), icon: <FileText {...iconProps} /> },
  ];

  return (
    <DashboardShell
      theme={theme}
      appName={t("common.appName")}
      roleLabel={t("nav.branchDashboard")}
      title={t("branch.title")}
      subtitle={t("branch.subtitle")}
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
