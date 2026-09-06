import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/get-session";
import {
  getOrganizationWithTheme,
  getOrganizationBySlug,
} from "@/lib/data/organizations";
import { dbOrgToBrandTheme } from "./from-db";
import { demoBakeryTheme } from "./brands/demo-bakery";
import type { BrandTheme } from "./types";

/** עוגייה קלה שמסמנת "באיזה ארגון צופים" לפני התחברות — לא אימות, רק העדפת עיצוב */
export const TENANT_HINT_COOKIE = "tenant_hint";

/**
 * Phase 1: המותג נטען תמיד מה-DB, לא מקובץ קונפיג סטטי.
 *
 * אחרי התחברות: המותג נגזר מה-organizationId האמיתי של המשתמש המחובר —
 * לא ניתן "להחליף מותג" ידנית יותר, בדיוק כמו במערכת אמיתית.
 *
 * לפני התחברות (מסך login/בחירת ארגון): אין עדיין session, אז אין לנו
 * organizationId לשאול עליו. פותרים את זה עם רמז קליל בעוגייה (tenant_hint)
 * שמוגדר כשבוחרים ארגון במסך הבחירה — בדיוק כמו שבמערכת אמיתית תת-הדומיין
 * (bakery.app.com לעומת cafe.app.com) היה מזהה את הארגון עוד לפני ההתחברות.
 */
export async function getCurrentTheme(): Promise<BrandTheme> {
  const session = await getSession();
  if (session) {
    const org = await getOrganizationWithTheme(session.organizationId);
    if (org) return dbOrgToBrandTheme(org);
  }

  const cookieStore = await cookies();
  const hintSlug = cookieStore.get(TENANT_HINT_COOKIE)?.value;
  if (hintSlug) {
    const org = await getOrganizationBySlug(hintSlug);
    if (org) return dbOrgToBrandTheme(org);
  }

  // ברירת מחדל ניטרלית (לדף שגיאה, או אם ה-DB לא זמין) — לא נחשפת בפועל בזרימה הרגילה
  return demoBakeryTheme;
}
