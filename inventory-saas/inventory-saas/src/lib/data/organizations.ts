import { query } from "@/lib/db";
import type { OrgWithTheme } from "./types";

export async function getOrganizationWithTheme(
  organizationId: string
): Promise<OrgWithTheme | null> {
  const { rows } = await query(
    `select o.id, o.slug, o.name,
            t.color_primary, t.color_secondary, t.color_accent, t.color_background,
            t.color_surface, t.color_text, t.color_success, t.color_warning, t.color_danger,
            t.logo_light_url, t.logo_dark_url, t.login_background_url, t.dashboard_background_url,
            t.font_family
     from organizations o
     join brand_themes t on t.organization_id = o.id
     where o.id = $1`,
    [organizationId]
  );
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    theme: {
      colorPrimary: row.color_primary,
      colorSecondary: row.color_secondary,
      colorAccent: row.color_accent,
      colorBackground: row.color_background,
      colorSurface: row.color_surface,
      colorText: row.color_text,
      colorSuccess: row.color_success,
      colorWarning: row.color_warning,
      colorDanger: row.color_danger,
      logoLightUrl: row.logo_light_url,
      logoDarkUrl: row.logo_dark_url,
      loginBackgroundUrl: row.login_background_url,
      dashboardBackgroundUrl: row.dashboard_background_url,
      fontFamily: row.font_family,
    },
  };
}

export async function getOrganizationBySlug(
  slug: string
): Promise<OrgWithTheme | null> {
  const { rows } = await query(`select id from organizations where slug = $1`, [
    slug,
  ]);
  const id = rows[0]?.id as string | undefined;
  if (!id) return null;
  return getOrganizationWithTheme(id);
}

/** רשימת כל הארגונים עם שם תצוגה בלבד — משמש למשל למסך התחברות עם "חשבונות דמו" */
export async function listOrganizations(): Promise<
  { id: string; slug: string; name: string }[]
> {
  const { rows } = await query<{ id: string; slug: string; name: string }>(
    `select id, slug, name from organizations order by name`
  );
  return rows;
}
