import { query } from "@/lib/db";

export interface DbProduct {
  id: string;
  organizationId: string;
  nameHe: string;
  nameEn: string;
  category: string;
  unit: string;
  shelfLifeHours: number;
  referencePhotoUrl: string | null;
}

function mapProductRow(row: Record<string, unknown>): DbProduct {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    nameHe: row.name_he as string,
    nameEn: row.name_en as string,
    category: row.category as string,
    unit: row.unit as string,
    shelfLifeHours: Number(row.shelf_life_hours),
    referencePhotoUrl: (row.reference_photo_url as string | null) ?? null,
  };
}

/** קטלוג המוצרים המלא של ארגון — משמש גם כרשימת "המועמדים" שנשלחת ל-AI לזיהוי תמונה */
export async function getProductsForOrg(
  organizationId: string
): Promise<DbProduct[]> {
  const { rows } = await query(
    `select id, organization_id, name_he, name_en, category, unit,
            shelf_life_hours, reference_photo_url
     from products where organization_id = $1 order by name_he`,
    [organizationId]
  );
  return rows.map(mapProductRow);
}

/** מאתר מוצר בקטלוג הארגון לפי שם (עברית או אנגלית), ללא תלות ברישיות/רווחים — לייבוא CSV (Phase 3) */
export async function findProductByName(
  organizationId: string,
  name: string
): Promise<DbProduct | null> {
  const { rows } = await query(
    `select id, organization_id, name_he, name_en, category, unit,
            shelf_life_hours, reference_photo_url
     from products
     where organization_id = $1
       and (lower(trim(name_he)) = lower(trim($2)) or lower(trim(name_en)) = lower(trim($2)))
     limit 1`,
    [organizationId, name]
  );
  const row = rows[0];
  return row ? mapProductRow(row) : null;
}

export async function getProductById(
  productId: string
): Promise<DbProduct | null> {
  const { rows } = await query(
    `select id, organization_id, name_he, name_en, category, unit,
            shelf_life_hours, reference_photo_url
     from products where id = $1`,
    [productId]
  );
  const row = rows[0];
  return row ? mapProductRow(row) : null;
}
