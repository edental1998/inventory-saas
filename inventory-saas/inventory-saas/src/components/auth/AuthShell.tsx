import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ListChecks } from "lucide-react";
import type { BrandTheme } from "@/lib/themes/types";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { GestionMark } from "@/components/ui/GestionBranding";
import { Card } from "@/components/ui/Card";
import { FALLBACK_IMAGERY } from "@/lib/imagery/fallback-images";

const PREVIEW_ROWS: { type: string; status: "DONE" | "IN_PROGRESS" | "PENDING" }[] = [
  { type: "RECEIVE_DELIVERY", status: "DONE" },
  { type: "CHECK_EXPIRY", status: "IN_PROGRESS" },
  { type: "RESTOCK_SHELF", status: "PENDING" },
];

const STATUS_DOT: Record<string, string> = {
  DONE: "bg-success",
  IN_PROGRESS: "bg-info",
  PENDING: "bg-brand-text-muted",
};

const STATUS_BADGE: Record<string, string> = {
  DONE: "bg-success/10 text-success",
  IN_PROGRESS: "bg-info/10 text-info",
  PENDING: "bg-black/5 text-brand-text-secondary",
};

/**
 * מעטפת משותפת למסכי אימות (התחברות/הרשמה). הרקע הכללי ניטרלי
 * (bg-brand-background), בדיוק כמו כל דשבורד — לא עוד רקע מלא בצבע המותג.
 *
 * גרסה מתוקנת: הפאנל הוויזואלי הגדול כבר לא לוגו קטן בודד על שטח ריק.
 * שני עוגני-תוכן אמיתיים: (1) "תצוגה מקדימה" של המוצר — כרטיס Card אמיתי
 * עם שורות רשימת-בדיקה שבנויות מאותם תרגומי task.type/task.status
 * הקיימים במוצר עצמו, לא טקסט שיווקי מומצא; (2) בלוק מיתוג הארגון (לוגו,
 * שם, משפט תיאור) עם היררכיית טיפוגרפיה חזקה. מתג השפה ולוגו Gestion
 * הקטן יושבים יחד בשורת כותרת אחת מעל טופס הכרטיס — לא עוד אלמנט צף
 * בודד. "Powered by" עבר לשורה קטנה ומשולבת מתחת לכרטיס, לא פס תחתון
 * נפרד על כל רוחב העמוד.
 */
export async function AuthShell({
  theme,
  children,
}: {
  theme: BrandTheme;
  children: ReactNode;
}) {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col bg-brand-background">
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex flex-1 flex-col lg:w-[440px] lg:flex-none">
          <div className="flex items-center justify-between p-6">
            <GestionMark className="h-6 w-auto opacity-80" />
            <LocaleSwitcher />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center p-6 pt-0">
            <div className="w-full max-w-sm">
              <Card padding="lg" className="shadow-xl">
                {children}
              </Card>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-brand-text-muted">
                <span>{t("common.poweredBy")}</span>
                <GestionMark className="h-3.5 w-auto opacity-60" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative hidden flex-1 overflow-hidden lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${theme.backgroundImage.login ?? FALLBACK_IMAGERY.auth})`,
            }}
          />
          {/* שכבת-על ניטרלית (לא בצבע המותג בכוונה): גוון שרירותי — במיוחד כחול/
              סגול/ירוק — יוצר "מריחה" מוזרה מעל תמונת מזון חמה, ראו תיעוד
              בדיקה. שחור שקוף שומר על התמונה קריאה ועל הטקסט הלבן ניגודי,
              בלי תלות בצבע המותג הספציפי של הארגון */}
          <div className="absolute inset-0 bg-black/45" />

          <div className="relative flex h-full flex-col items-start justify-center gap-8 p-12">
            {/* תצוגה מקדימה — כרטיס Card אמיתי, לא איור דקורטיבי */}
            <Card padding="sm" className="w-full max-w-[280px] shadow-2xl">
              <div className="mb-2 flex items-center gap-2 border-b border-brand-border pb-2">
                <ListChecks className="h-4 w-4 text-brand-primary" />
                <span className="text-xs font-semibold text-brand-text">
                  {t("nav.tasks")}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {PREVIEW_ROWS.map((row) => (
                  <div key={row.type} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[row.status]}`} />
                      <span className="truncate text-xs text-brand-text">
                        {t(`task.type.${row.type}`)}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[row.status]}`}
                    >
                      {t(`task.status.${row.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* מיתוג הארגון — עוגן שני, היררכיה טיפוגרפית חזקה */}
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- לוגו חיצוני דינמי לפי מותג */}
              <img
                src={theme.logo.light}
                alt={theme.displayName}
                className="h-16 w-16 shrink-0 rounded-2xl shadow-lg ring-4 ring-white/20"
              />
              <div>
                <p className="text-2xl font-bold text-white drop-shadow-sm">
                  {theme.displayName}
                </p>
                <p className="mt-1 max-w-xs text-sm text-white/85 drop-shadow-sm">
                  {t("login.tagline")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
