import { query } from "@/lib/db";

/**
 * שאילתות ניתוח מכירות מתקדם (Phase 3) — ראו ARCHITECTURE.md → "תכנון Phase 3".
 * כולן עובדות מול sale_records הקיים (בלי תלות בשום שינוי סכמה חדש), חוץ
 * מ"פחת מול מכירות" שמצליבה גם את stock_movements מסוג WASTE — נתון שקיים
 * בפועל רק הודות לצילומי "זריקה" האמיתיים מ-Phase 2.
 */

export interface DailySalesPoint {
  date: string; // YYYY-MM-DD
  quantity: number;
  revenue: number;
}

export interface TopProductRow {
  productId: string;
  nameHe: string;
  nameEn: string;
  quantity: number;
  revenue: number;
}

export interface WasteVsSalesRow {
  productId: string;
  nameHe: string;
  nameEn: string;
  sold: number;
  wasted: number;
  /** אחוז מהכמות שהגיעה בפועל למדף שהושלכה, ולא נמכרה (0 אם אין נתונים) */
  wastePercent: number;
}

export interface EstimatedVsActualRow {
  productId: string;
  nameHe: string;
  nameEn: string;
  /** מדף פחות פחת בתקופה — אומדן בלבד, לא נתון מכירה אמיתי (ראו ARCHITECTURE.md) */
  estimatedSold: number;
  /** נמכר בפועל, מנתוני sale_records אמיתיים (ייבוא/קופה) */
  actualSold: number;
  /** אומדן פחות בפועל — פער חיובי גדול עשוי להצביע על חוסר לא מוסבר (ראו ARCHITECTURE.md) */
  gap: number;
}

export interface WasteReasonBreakdownRow {
  reason: string; // אחד מ-WASTE_REASONS, או "UNSPECIFIED" לתנועות ישנות בלי סיבה
  quantity: number;
  events: number;
}

function dateRangeFilter(days: number) {
  return `now() - interval '${Math.max(1, Math.floor(days))} days'`;
}

export async function getDailySalesTrend(
  branchId: string,
  days = 30
): Promise<DailySalesPoint[]> {
  const { rows } = await query<{ day: string; quantity: string; revenue: string }>(
    `select date::text as day,
            coalesce(sum(quantity_sold), 0) as quantity,
            coalesce(sum(revenue), 0) as revenue
     from sale_records
     where branch_id = $1 and date >= ${dateRangeFilter(days)}
     group by date
     order by date asc`,
    [branchId]
  );
  return rows.map((r) => ({ date: r.day, quantity: Number(r.quantity), revenue: Number(r.revenue) }));
}

export async function getDailySalesTrendForOrg(
  organizationId: string,
  days = 30
): Promise<DailySalesPoint[]> {
  const { rows } = await query<{ day: string; quantity: string; revenue: string }>(
    `select sr.date::text as day,
            coalesce(sum(sr.quantity_sold), 0) as quantity,
            coalesce(sum(sr.revenue), 0) as revenue
     from sale_records sr
     join branches b on b.id = sr.branch_id
     where b.organization_id = $1 and sr.date >= ${dateRangeFilter(days)}
     group by sr.date
     order by sr.date asc`,
    [organizationId]
  );
  return rows.map((r) => ({ date: r.day, quantity: Number(r.quantity), revenue: Number(r.revenue) }));
}

const TOP_PRODUCTS_SELECT = (whereClause: string) => `
  select p.id as product_id, p.name_he, p.name_en,
         coalesce(sum(sr.quantity_sold), 0) as quantity,
         coalesce(sum(sr.revenue), 0) as revenue
  from sale_records sr
  join products p on p.id = sr.product_id
  join branches b on b.id = sr.branch_id
  where ${whereClause}
  group by p.id, p.name_he, p.name_en
  order by quantity desc
`;

function mapTopProductRow(row: Record<string, unknown>): TopProductRow {
  return {
    productId: row.product_id as string,
    nameHe: row.name_he as string,
    nameEn: row.name_en as string,
    quantity: Number(row.quantity),
    revenue: Number(row.revenue),
  };
}

export async function getTopProductsForBranch(
  branchId: string,
  days = 30,
  limit = 5
): Promise<TopProductRow[]> {
  const { rows } = await query(
    `${TOP_PRODUCTS_SELECT(`sr.branch_id = $1 and sr.date >= ${dateRangeFilter(days)}`)} limit $2`,
    [branchId, limit]
  );
  return rows.map(mapTopProductRow);
}

export async function getTopProductsForOrg(
  organizationId: string,
  days = 30,
  limit = 5
): Promise<TopProductRow[]> {
  const { rows } = await query(
    `${TOP_PRODUCTS_SELECT(`b.organization_id = $1 and sr.date >= ${dateRangeFilter(days)}`)} limit $2`,
    [organizationId, limit]
  );
  return rows.map(mapTopProductRow);
}

function mapWasteRow(row: Record<string, unknown>): WasteVsSalesRow {
  const sold = Number(row.sold);
  const wasted = Number(row.wasted);
  const total = sold + wasted;
  return {
    productId: row.product_id as string,
    nameHe: row.name_he as string,
    nameEn: row.name_en as string,
    sold,
    wasted,
    wastePercent: total > 0 ? Math.round((wasted / total) * 100) : 0,
  };
}

/** פחת מול מכירות, ברמת סניף בודד — 30 הימים האחרונים */
export async function getWasteVsSalesForBranch(branchId: string): Promise<WasteVsSalesRow[]> {
  const { rows } = await query(
    `select
       p.id as product_id, p.name_he, p.name_en,
       coalesce(sold.qty, 0) as sold,
       coalesce(wasted.qty, 0) as wasted
     from products p
     join branches br on br.id = $1 and br.organization_id = p.organization_id
     left join (
       select product_id, sum(quantity_sold) as qty
       from sale_records
       where branch_id = $1 and date >= now() - interval '30 days'
       group by product_id
     ) sold on sold.product_id = p.id
     left join (
       select ib.product_id, sum(sm.quantity) as qty
       from stock_movements sm
       join inventory_batches ib on ib.id = sm.batch_id
       where sm.type = 'WASTE' and ib.branch_id = $1 and sm.created_at >= now() - interval '30 days'
       group by ib.product_id
     ) wasted on wasted.product_id = p.id
     where coalesce(sold.qty, 0) > 0 or coalesce(wasted.qty, 0) > 0
     order by wasted desc nulls last`,
    [branchId]
  );
  return rows.map(mapWasteRow);
}

function mapEstimatedRow(row: Record<string, unknown>): EstimatedVsActualRow {
  const estimatedSold = Math.max(0, Number(row.shelved) - Number(row.wasted));
  const actualSold = Number(row.sold);
  return {
    productId: row.product_id as string,
    nameHe: row.name_he as string,
    nameEn: row.name_en as string,
    estimatedSold,
    actualSold,
    gap: estimatedSold - actualSold,
  };
}

/**
 * "אומדן מכירה" (מדף פחות פחת) מול מכירות שדווחו בפועל — כלי בקרה, לא נתון
 * מכירה. פער חיובי גדול (אומדן > בפועל) יכול להצביע על מכירות שלא דווחו,
 * או על חוסר לא מוסבר (כולל חשד לצריכה על ידי עובד) — ראו ARCHITECTURE.md
 * → "תנועות מלאי חלקיות וסיבת זריקה". לעולם לא מוצג כ"מכירה אמיתית".
 */
export async function getEstimatedVsActualForBranch(
  branchId: string,
  days = 30
): Promise<EstimatedVsActualRow[]> {
  const { rows } = await query(
    `select
       p.id as product_id, p.name_he, p.name_en,
       coalesce(shelved.qty, 0) as shelved,
       coalesce(wasted.qty, 0) as wasted,
       coalesce(sold.qty, 0) as sold
     from products p
     join branches br on br.id = $1 and br.organization_id = p.organization_id
     left join (
       select ib.product_id, sum(sm.quantity) as qty
       from stock_movements sm
       join inventory_batches ib on ib.id = sm.batch_id
       where sm.type = 'MOVE_TO_SHELF' and ib.branch_id = $1
         and sm.created_at >= ${dateRangeFilter(days)}
       group by ib.product_id
     ) shelved on shelved.product_id = p.id
     left join (
       select ib.product_id, sum(sm.quantity) as qty
       from stock_movements sm
       join inventory_batches ib on ib.id = sm.batch_id
       where sm.type = 'WASTE' and ib.branch_id = $1
         and sm.created_at >= ${dateRangeFilter(days)}
       group by ib.product_id
     ) wasted on wasted.product_id = p.id
     left join (
       select product_id, sum(quantity_sold) as qty
       from sale_records
       where branch_id = $1 and date >= ${dateRangeFilter(days)}
       group by product_id
     ) sold on sold.product_id = p.id
     where coalesce(shelved.qty, 0) > 0 or coalesce(wasted.qty, 0) > 0 or coalesce(sold.qty, 0) > 0
     order by (coalesce(shelved.qty, 0) - coalesce(wasted.qty, 0) - coalesce(sold.qty, 0)) desc`,
    [branchId]
  );
  return rows.map(mapEstimatedRow);
}

/** כמו getEstimatedVsActualForBranch, ברמת ארגון שלם (כל הסניפים יחד) */
export async function getEstimatedVsActualForOrg(
  organizationId: string,
  days = 30
): Promise<EstimatedVsActualRow[]> {
  const { rows } = await query(
    `select
       p.id as product_id, p.name_he, p.name_en,
       coalesce(shelved.qty, 0) as shelved,
       coalesce(wasted.qty, 0) as wasted,
       coalesce(sold.qty, 0) as sold
     from products p
     left join (
       select ib.product_id, sum(sm.quantity) as qty
       from stock_movements sm
       join inventory_batches ib on ib.id = sm.batch_id
       join branches b on b.id = ib.branch_id
       where sm.type = 'MOVE_TO_SHELF' and b.organization_id = $1
         and sm.created_at >= ${dateRangeFilter(days)}
       group by ib.product_id
     ) shelved on shelved.product_id = p.id
     left join (
       select ib.product_id, sum(sm.quantity) as qty
       from stock_movements sm
       join inventory_batches ib on ib.id = sm.batch_id
       join branches b on b.id = ib.branch_id
       where sm.type = 'WASTE' and b.organization_id = $1
         and sm.created_at >= ${dateRangeFilter(days)}
       group by ib.product_id
     ) wasted on wasted.product_id = p.id
     left join (
       select sr.product_id, sum(sr.quantity_sold) as qty
       from sale_records sr
       join branches b on b.id = sr.branch_id
       where b.organization_id = $1 and sr.date >= ${dateRangeFilter(days)}
       group by sr.product_id
     ) sold on sold.product_id = p.id
     where p.organization_id = $1
       and (coalesce(shelved.qty, 0) > 0 or coalesce(wasted.qty, 0) > 0 or coalesce(sold.qty, 0) > 0)
     order by (coalesce(shelved.qty, 0) - coalesce(wasted.qty, 0) - coalesce(sold.qty, 0)) desc`,
    [organizationId]
  );
  return rows.map(mapEstimatedRow);
}

function mapWasteReasonRow(row: Record<string, unknown>): WasteReasonBreakdownRow {
  return {
    reason: (row.reason as string | null) ?? "UNSPECIFIED",
    quantity: Number(row.quantity),
    events: Number(row.events),
  };
}

/**
 * פירוט סיבות זריקה לתקופה — הכלי המרכזי לבקרת פחת (ראו ARCHITECTURE.md →
 * "תנועות מלאי חלקיות וסיבת זריקה"), כולל דגל SUSPECTED_CONSUMPTION לחשד
 * לצריכה לא מתועדת של עובד.
 */
export async function getWasteReasonBreakdownForBranch(
  branchId: string,
  days = 30
): Promise<WasteReasonBreakdownRow[]> {
  const { rows } = await query(
    `select sm.reason as reason, sum(sm.quantity) as quantity, count(*) as events
     from stock_movements sm
     join inventory_batches ib on ib.id = sm.batch_id
     where sm.type = 'WASTE' and ib.branch_id = $1 and sm.created_at >= ${dateRangeFilter(days)}
     group by sm.reason
     order by quantity desc`,
    [branchId]
  );
  return rows.map(mapWasteReasonRow);
}

/** כמו getWasteReasonBreakdownForBranch, ברמת ארגון שלם (כל הסניפים יחד) */
export async function getWasteReasonBreakdownForOrg(
  organizationId: string,
  days = 30
): Promise<WasteReasonBreakdownRow[]> {
  const { rows } = await query(
    `select sm.reason as reason, sum(sm.quantity) as quantity, count(*) as events
     from stock_movements sm
     join inventory_batches ib on ib.id = sm.batch_id
     join branches b on b.id = ib.branch_id
     where sm.type = 'WASTE' and b.organization_id = $1 and sm.created_at >= ${dateRangeFilter(days)}
     group by sm.reason
     order by quantity desc`,
    [organizationId]
  );
  return rows.map(mapWasteReasonRow);
}

/** פחת מול מכירות, ברמת ארגון שלם (כל הסניפים יחד) — 30 הימים האחרונים */
export async function getWasteVsSalesForOrg(organizationId: string): Promise<WasteVsSalesRow[]> {
  const { rows } = await query(
    `select
       p.id as product_id, p.name_he, p.name_en,
       coalesce(sold.qty, 0) as sold,
       coalesce(wasted.qty, 0) as wasted
     from products p
     left join (
       select sr.product_id, sum(sr.quantity_sold) as qty
       from sale_records sr
       join branches b on b.id = sr.branch_id
       where b.organization_id = $1 and sr.date >= now() - interval '30 days'
       group by sr.product_id
     ) sold on sold.product_id = p.id
     left join (
       select ib.product_id, sum(sm.quantity) as qty
       from stock_movements sm
       join inventory_batches ib on ib.id = sm.batch_id
       join branches b on b.id = ib.branch_id
       where sm.type = 'WASTE' and b.organization_id = $1 and sm.created_at >= now() - interval '30 days'
       group by ib.product_id
     ) wasted on wasted.product_id = p.id
     where p.organization_id = $1 and (coalesce(sold.qty, 0) > 0 or coalesce(wasted.qty, 0) > 0)
     order by wasted desc nulls last`,
    [organizationId]
  );
  return rows.map(mapWasteRow);
}
