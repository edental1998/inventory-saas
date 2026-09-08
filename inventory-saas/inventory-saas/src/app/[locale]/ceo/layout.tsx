import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getCurrentTheme } from "@/lib/themes/current-theme";
import { requireSession } from "@/lib/auth/get-session";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BranchSwitcher } from "@/components/layout/BranchSwitcher";
import { getBranchesForOrg } from "@/lib/data/branches";

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
      navExtra={
        <BranchSwitcher branches={branches} label={t("nav.switchBranch")} />
      }
      navItems={[
        { href: "/ceo/dashboard", label: t("nav.ceoDashboard") },
        { href: "/ceo/tasks", label: t("nav.allBranchesTasks") },
        { href: "/ceo/managers", label: t("nav.managerTracking") },
        { href: "/ceo/sales", label: t("nav.sales") },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
