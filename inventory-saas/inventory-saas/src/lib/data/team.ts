import "server-only";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import type { UserRole } from "@/lib/auth/types";

export type TeamMemberRole = Extract<UserRole, "EMPLOYEE" | "BRANCH_MANAGER">;

export interface NewTeamMember {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  email: string;
  role: TeamMemberRole;
}

/**
 * יצירת חבר/ת צוות (עובד/ת או מנהל/ת סניף) בתוך ארגון קיים — Slice 2.5:
 * תשתית מינימלית וזמנית ליצירת משתמשים, לא מערכת הזמנות אמיתית (זו תיבנה
 * ב-Phase 2). ה-caller (src/lib/actions/team.ts) אחראי לוודא ש-organizationId
 * ו-branchId מגיעים מה-session/מאומתים מול הארגון — הפונקציה כאן סומכת על כך.
 */
export async function createTeamMember(params: {
  organizationId: string;
  branchId: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  passwordHash: string;
}): Promise<NewTeamMember> {
  const id = randomUUID();
  const email = params.email.trim().toLowerCase();

  await query(
    `insert into users (id, organization_id, branch_id, name, email, password_hash, role)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      params.organizationId,
      params.branchId,
      params.name,
      email,
      params.passwordHash,
      params.role,
    ]
  );

  return {
    id,
    organizationId: params.organizationId,
    branchId: params.branchId,
    name: params.name,
    email,
    role: params.role,
  };
}
