import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getCurrentTheme } from "@/lib/themes/current-theme";
import { requireSession } from "@/lib/auth/get-session";
import { DashboardShell } from "@/components/layout/DashboardShell";

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
      navItems={[
        { href: "/branch/dashboard", label: t("nav.branchDashboard") },
        { href: "/branch/tasks", label: t("nav.tasks") },
        { href: "/branch/capture", label: t("nav.captureProduct") },
        { href: "/branch/sales", label: t("nav.sales") },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
