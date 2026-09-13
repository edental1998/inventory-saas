import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/get-session";
import { getBranchesForOrg } from "@/lib/data/branches";
import { TeamMemberForm } from "@/components/team/TeamMemberForm";

/**
 * Slice 2.5: יצירת חבר/ת צוות על ידי מנכ"ל — תשתית מינימלית וזמנית כדי
 * לאפשר בדיקה אמיתית של תפקידי BRANCH_MANAGER/EMPLOYEE, עד שתיבנה מערכת
 * הזמנות מלאה ב-Phase 2. הדף נמצא תחת /ceo/... כך שהגנת התפקיד כבר אוטומטית
 * (ראו src/proxy.ts) — אבל src/lib/actions/team.ts בכל זאת בודק הרשאה בעצמו,
 * ולא סומך רק על מיקום הנתיב.
 */
export default async function NewTeamMemberPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session] = await Promise.all([
    getTranslations(),
    requireSession(locale),
  ]);

  const branches = await getBranchesForOrg(session.organizationId);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-brand-text">{t("team.newTitle")}</h1>
        <p className="text-sm text-brand-text/60">{t("team.newSubtitle")}</p>
      </div>
      <TeamMemberForm branches={branches} />
    </div>
  );
}
