import "server-only";
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@/lib/db";
import type { UserRole } from "@/lib/auth/types";

/**
 * עיצוב ברירת מחדל ניטרלי לעסק חדש שנרשם עצמאית דרך /signup — לא בייקרי,
 * לא בית קפה, פשוט פלטה נעימה שאפשר לשנות מאוחר יותר (בעתיד: מסך ניהול
 * מותג). לא קשור לשני מותגי הדמו (demo-bakery/demo-cafe) שממשיכים לשמש
 * רק לחשבונות הדמו.
 */
const DEFAULT_THEME = {
  colorPrimary: "#2563EB",
  colorSecondary: "#1E3A8A",
  colorAccent: "#F59E0B",
  colorBackground: "#F8FAFC",
  colorSurface: "#FFFFFF",
  colorText: "#0F172A",
  fontFamily: "Heebo",
};

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "org";
}

async function slugExists(slug: string): Promise<boolean> {
  const { rows } = await query(`select 1 from organizations where slug = $1`, [
    slug,
  ]);
  return rows.length > 0;
}

/** מוצא slug פנוי — מוסיף סיומת מספרית אם השם כבר תפוס (כמה עסקים יכולים להיקרא אותו דבר) */
async function reserveUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let attempt = 1;
  while (await slugExists(candidate)) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return candidate;
}

export interface NewOrganizationAdmin {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  email: string;
  role: UserRole;
}

/**
 * יוצר ארגון חדש מאפס יחד עם מותג ברירת מחדל, סניף ראשי, ומשתמש מנהל/ת
 * ראשי/ת (CHAIN_MANAGER) — הכל בעסקה אחת. זו נקודת הכניסה היחידה שדרכה
 * נוצר ארגון אמיתי במערכת (במקום זריעת דמו/הזנה ידנית ל-DB).
 *
 * יש להעביר בדיוק אחד מבין passwordHash (הרשמה עם אימייל+סיסמה) או
 * googleId (הרשמה עם חשבון Google) — לא חובה שניהם.
 */
export async function createOrganizationWithAdmin(params: {
  organizationName: string;
  adminName: string;
  adminEmail: string;
  passwordHash?: string;
  googleId?: string;
  locale: string;
}): Promise<NewOrganizationAdmin> {
  const slug = await reserveUniqueSlug(params.organizationName);
  const orgId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const email = params.adminEmail.trim().toLowerCase();

  await withTransaction(async (client) => {
    await client.query(
      `insert into organizations (id, slug, name) values ($1, $2, $3)`,
      [orgId, slug, params.organizationName]
    );

    await client.query(
      `insert into brand_themes
         (id, organization_id, color_primary, color_secondary, color_accent,
          color_background, color_surface, color_text, font_family)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        randomUUID(),
        orgId,
        DEFAULT_THEME.colorPrimary,
        DEFAULT_THEME.colorSecondary,
        DEFAULT_THEME.colorAccent,
        DEFAULT_THEME.colorBackground,
        DEFAULT_THEME.colorSurface,
        DEFAULT_THEME.colorText,
        DEFAULT_THEME.fontFamily,
      ]
    );

    await client.query(
      `insert into branches (id, organization_id, name) values ($1, $2, $3)`,
      [branchId, orgId, "סניף ראשי"]
    );

    await client.query(
      `insert into users
         (id, organization_id, branch_id, name, email, password_hash, google_id, role, preferred_locale)
       values ($1, $2, $3, $4, $5, $6, $7, 'CHAIN_MANAGER', $8)`,
      [
        userId,
        orgId,
        branchId,
        params.adminName,
        email,
        params.passwordHash ?? null,
        params.googleId ?? null,
        params.locale,
      ]
    );
  });

  return {
    id: userId,
    organizationId: orgId,
    branchId,
    name: params.adminName,
    email,
    role: "CHAIN_MANAGER",
  };
}

export interface GoogleLinkedUser {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  email: string;
  role: UserRole;
}

export async function findUserByGoogleId(
  googleId: string
): Promise<GoogleLinkedUser | null> {
  const { rows } = await query(
    `select id, organization_id, branch_id, name, email, role
     from users where google_id = $1`,
    [googleId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

/**
 * מקשר חשבון Google לחשבון קיים לפי אימייל — למקרה שמישהו כבר נרשם בעבר
 * עם אימייל+סיסמה ומתחבר עם Google לראשונה עם אותה כתובת אימייל בדיוק.
 * לא דורס google_id קיים (התנאי `google_id is null`), כדי לא "לגנוב"
 * חשבון שכבר מקושר לחשבון Google אחר.
 */
export async function linkGoogleIdToUserByEmail(
  email: string,
  googleId: string
): Promise<GoogleLinkedUser | null> {
  const { rows } = await query(
    `update users set google_id = $1
     where email = $2 and google_id is null
     returning id, organization_id, branch_id, name, email, role`,
    [googleId, email.trim().toLowerCase()]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

export async function organizationEmailExists(email: string): Promise<boolean> {
  const { rows } = await query(`select 1 from users where email = $1`, [
    email.trim().toLowerCase(),
  ]);
  return rows.length > 0;
}
