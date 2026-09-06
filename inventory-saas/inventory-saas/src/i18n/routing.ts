import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["he", "en"],
  defaultLocale: "he",
  localePrefix: "always", // תמיד /he/... או /en/... — מונע דו-משמעות בין הדשבורדים
});

export type AppLocale = (typeof routing.locales)[number];

/** מיפוי כיווניות לכל שפה — משמש בקביעת dir="rtl"/"ltr" בתגית html */
export function getDirection(locale: string): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}
