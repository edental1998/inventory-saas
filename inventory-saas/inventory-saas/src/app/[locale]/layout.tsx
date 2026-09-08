import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, getDirection } from "@/i18n/routing";
import { getCurrentTheme } from "@/lib/themes/current-theme";
import { BrandStyleInjector } from "@/components/theme/BrandStyleInjector";
import { heebo, rubik } from "@/lib/fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const theme = await getCurrentTheme();
  return {
    title: `${theme.displayName} · ${locale === "he" ? "ניהול מלאי" : "Inventory Manager"}`,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // מאפשר ל-Server Components תחת ה-layout הזה לקרוא getTranslations בלי לציין locale ידנית
  setRequestLocale(locale);

  const [messages, theme] = await Promise.all([
    getMessages(),
    getCurrentTheme(),
  ]);

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      className={`${heebo.variable} ${rubik.variable}`}
    >
      <head>
        <BrandStyleInjector theme={theme} />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
