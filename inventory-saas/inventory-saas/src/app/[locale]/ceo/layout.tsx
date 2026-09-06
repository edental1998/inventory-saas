import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { getCurrentTheme } from "@/lib/themes/current-theme";
import { requireSession } from "@/lib/auth/get-session";
import { DashboardShell } from "@/components/layout/DashboardShell";

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
      navItems={[
        { href: "/ceo/dashboard", label: t("nav.ceoDashboard") },
        { href: "/ceo/sales", label: t("nav.sales") },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
