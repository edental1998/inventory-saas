import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getCurrentTheme } from "@/lib/themes/current-theme";
import { requireSession } from "@/lib/auth/get-session";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { SidebarNavItem } from "@/components/layout/Sidebar";
import { getBranchesForOrg } from "@/lib/data/branches";

/**
 * ניווט המנכ"ל (Slice 5) — קבוצות מקוננות לפי הארכיטקטורה שסוכמה. "סניפים"
 * נבנה דינמית מרשימת הסניפים בפועל (אותה שאילתה ששימשה בעבר את
 * BranchSwitcher, שהוסר — כפילות ניווט). יעדים שטרם נבנו (Employees,
 * Sales›By Branch, כל Inventory) מסומנים disabled ולא מקושרים ל"עמוד מזויף".
 */
export default async function CeoLayout({
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
  const branches = await getBranchesForOrg(session.organizationId);

  const navItems: SidebarNavItem[] = [
    { type: "link", href: "/ceo/dashboard", label: t("nav.ceoDashboard") },
    {
      type: "group",
      label: t("nav.branches"),
      children: branches.map((branch) => ({
        type: "link" as const,
        href: `/ceo/branches/${branch.id}`,
        label: branch.name,
      })),
    },
    {
      type: "group",
      label: t("nav.tasks"),
      children: [
        { type: "link", href: "/ceo/tasks", label: t("nav.overview") },
        { type: "link", href: "/ceo/tasks/by-branch", label: t("nav.byBranch") },
        {
          type: "link",
          href: "/ceo/tasks/performance",
          label: t("nav.employeePerformance"),
        },
      ],
    },
    { type: "link", href: "/ceo/managers", label: t("nav.managerTracking") },
    { type: "disabled", label: t("nav.employees") },
    {
      type: "group",
      label: t("nav.sales"),
      children: [
        { type: "link", href: "/ceo/sales", label: t("nav.overview") },
        { type: "disabled", label: t("nav.byBranch") },
      ],
    },
    {
      type: "group",
      label: t("nav.inventory"),
      children: [
        { type: "disabled", label: t("nav.overview") },
        { type: "disabled", label: t("nav.alerts") },
        { type: "disabled", label: t("nav.waste") },
      ],
    },
  ];

  return (
    <DashboardShell
      theme={theme}
      appName={t("common.appName")}
      roleLabel={t("nav.ceoDashboard")}
      title={t("ceo.title")}
      subtitle={t("ceo.subtitle")}
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
