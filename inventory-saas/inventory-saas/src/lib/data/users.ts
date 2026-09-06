import { query } from "@/lib/db";
import type { UserRole } from "@/lib/auth/types";

export interface AuthUserRow {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export async function findUserByEmail(
  email: string
): Promise<AuthUserRow | null> {
  const { rows } = await query(
    `select id, organization_id, branch_id, name, email, password_hash, role
     from users where email = $1`,
    [email.trim().toLowerCase()]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
  };
}

/** עובדי סניף מסוים — משמש לתפריט "שיוך ל" ביצירת משימה חדשה */
export async function getBranchEmployees(
  branchId: string
): Promise<{ id: string; name: string }[]> {
  const { rows } = await query<{ id: string; name: string }>(
    `select id, name from users where branch_id = $1 order by name`,
    [branchId]
  );
  return rows;
}

export interface DemoAccount {
  email: string;
  name: string;
  role: UserRole;
  orgName: string;
}

/** לשימוש במסך ההתחברות בלבד: רשימת חשבונות דמו לכל הארגונים, לכניסה מהירה */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  const { rows } = await query(
    `select u.email, u.name, u.role, o.name as org_name
     from users u
     join organizations o on o.id = u.organization_id
     order by o.name,
       case u.role when 'CHAIN_MANAGER' then 0 when 'BRANCH_MANAGER' then 1 else 2 end`
  );
  return rows.map((row) => ({
    email: row.email,
    name: row.name,
    role: row.role,
    orgName: row.org_name,
  }));
}
