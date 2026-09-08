import { query } from "@/lib/db";
import type { UserRole } from "@/lib/auth/types";
import type { DbBranchManager } from "./types";

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

const BRANCH_MANAGER_SELECT = `
  select u.id, u.name, u.email, u.branch_id, b.name as branch_name
  from users u
  join branches b on b.id = u.branch_id
  where u.role = 'BRANCH_MANAGER'
`;

function mapBranchManagerRow(row: Record<string, unknown>): DbBranchManager {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    branchId: row.branch_id as string,
    branchName: row.branch_name as string,
  };
}

/** כל מנהלי הסניפים בארגון — למסך "מעקב מנהלים" */
export async function getBranchManagersForOrg(
  organizationId: string
): Promise<DbBranchManager[]> {
  const { rows } = await query(
    `${BRANCH_MANAGER_SELECT} and b.organization_id = $1 order by b.name`,
    [organizationId]
  );
  return rows.map(mapBranchManagerRow);
}

/** מנהל/ת הסניף הספציפי הזה, אם יש (ייתכן שאין — עדיין אין תהליך הזמנת מנהלים) */
export async function getBranchManager(
  branchId: string
): Promise<DbBranchManager | null> {
  const { rows } = await query(
    `${BRANCH_MANAGER_SELECT} and u.branch_id = $1 limit 1`,
    [branchId]
  );
  const row = rows[0];
  return row ? mapBranchManagerRow(row) : null;
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
