import type { ReactNode } from "react";
import type { BrandTheme } from "@/lib/themes/types";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { PoweredByGestion } from "@/components/ui/GestionBranding";
import { Card } from "@/components/ui/Card";
import { FALLBACK_IMAGERY } from "@/lib/imagery/fallback-images";

/**
 * מעטפת משותפת למסכי אימות (התחברות/הרשמה) — Slice 8. מחליפה את הרקע
 * המלא בצבע המותג (backgroundColor: var(--brand-color-primary)) שהיה
 * מנותק חזותית משאר המוצר, בבדיוק אותו רקע ניטרלי (bg-brand-background)
 * שמשמש את כל הדשבורדים. מיתוג הארגון עדיין נוכח — לוגו+שם בכרטיס, ופאנל
 * צד מרוסן במסכים גדולים — אבל לא "צובע" את כל העמוד.
 */
export function AuthShell({
  theme,
  children,
}: {
  theme: BrandTheme;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-background">
      <div className="flex flex-1">
        <div className="relative flex flex-1 flex-col items-center justify-center p-6">
          <div className="absolute end-6 top-6">
            <LocaleSwitcher />
          </div>
          <div className="w-full max-w-sm">
            <Card padding="lg" className="shadow-xl">
              {children}
            </Card>
          </div>
        </div>

        <div className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${theme.backgroundImage.login ?? FALLBACK_IMAGERY.auth})`,
            }}
          />
          {/* שכבת-על ניטרלית (לא בצבע המותג בכוונה): גוון שרירותי — במיוחד כחול/
              סגול/ירוק — יוצר "מריחה" מוזרה מעל תמונת מזון חמה, ראו תיעוד
              בדיקה. שחור שקוף שומר על התמונה קריאה ועל הלוגו/שם ניגודיים,
              בלי תלות בצבע המותג הספציפי של הארגון */}
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative flex flex-col items-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- לוגו חיצוני דינמי לפי מותג */}
            <img
              src={theme.logo.light}
              alt={theme.displayName}
              className="h-20 w-20 rounded-2xl shadow-lg ring-4 ring-white/20"
            />
            <p className="text-xl font-semibold text-white drop-shadow-sm">
              {theme.displayName}
            </p>
          </div>
        </div>
      </div>

      <PoweredByGestion className="border-t border-brand-border bg-brand-surface py-2" />
    </div>
  );
}
