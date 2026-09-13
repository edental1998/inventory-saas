"use server";

import { getSession } from "@/lib/auth/get-session";
import { hashPassword } from "@/lib/auth/password";
import { organizationEmailExists } from "@/lib/data/signup";
import { getBranchForOrg } from "@/lib/data/branches";
import { createTeamMember, type TeamMemberRole } from "@/lib/data/team";

export type CreateTeamMemberErrorCode =
  | "missing_fields"
  | "invalid_role"
  | "invalid_branch"
  | "password_too_short"
  | "email_taken"
  | "forbidden";

export interface CreateTeamMemberState {
  error?: CreateTeamMemberErrorCode;
  success?: boolean;
}

/** סגור בכוונה לשני תפקידים בלבד — אין דרך ליצור CHAIN_MANAGER נוסף דרך הטופס הזה */
const ALLOWED_ROLES: TeamMemberRole[] = ["EMPLOYEE", "BRANCH_MANAGER"];

/**
 * יצירת חבר/ת צוות על ידי מנכ"ל — Slice 2.5, תשתית מינימלית עד שתיבנה
 * מערכת הזמנות אמיתית. הרשאות (נבדקות כאן, בשרת — לא רק מוסתרות ב-UI):
 *  - רק CHAIN_MANAGER יכול/ה לקרוא לפעולה הזו.
 *  - organization_id תמיד נגזר מה-session, לעולם לא מתקבל מה-FormData.
 *  - הסניף שנבחר חייב לעבור אימות שהוא שייך לארגון של המנכ"ל (getBranchForOrg).
 *  - התפקיד המבוקש חייב להיות EMPLOYEE או BRANCH_MANAGER בדיוק.
 */
export async function createTeamMemberAction(
  _prevState: CreateTeamMemberState,
  formData: FormData
): Promise<CreateTeamMemberState> {
  const session = await getSession();
  if (!session || session.role !== "CHAIN_MANAGER") {
    return { error: "forbidden" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "");
  const branchId = String(formData.get("branchId") ?? "");

  if (!name || !email || !password || !roleRaw || !branchId) {
    return { error: "missing_fields" };
  }

  if (!ALLOWED_ROLES.includes(roleRaw as TeamMemberRole)) {
    return { error: "invalid_role" };
  }
  const role = roleRaw as TeamMemberRole;

  if (password.length < 8) {
    return { error: "password_too_short" };
  }

  const branch = await getBranchForOrg(branchId, session.organizationId);
  if (!branch) {
    return { error: "invalid_branch" };
  }

  if (await organizationEmailExists(email)) {
    return { error: "email_taken" };
  }

  const passwordHash = await hashPassword(password);
  await createTeamMember({
    organizationId: session.organizationId,
    branchId: branch.id,
    name,
    email,
    role,
    passwordHash,
  });

  return { success: true };
}
