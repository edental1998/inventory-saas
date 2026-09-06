"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * מחליף שפה מבלי לאבד את המסך הנוכחי (למשל נשאר בתוך /branch/tasks).
 * זו הדגמה חיה לכך ש-RTL/LTR הם באמת "פליפ" מלא של הכיווניות ולא רק תרגום טקסט.
 */
export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-black/5 p-1 text-xs">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchTo(loc)}
          className={
            loc === locale
              ? "rounded-full bg-brand-primary px-3 py-1 font-medium text-brand-on-primary"
              : "rounded-full px-3 py-1 text-brand-text/60 hover:text-brand-text"
          }
          aria-current={loc === locale}
        >
          {loc === "he" ? t("hebrew") : t("english")}
        </button>
      ))}
    </div>
  );
}
