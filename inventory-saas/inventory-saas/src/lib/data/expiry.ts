import { query } from "@/lib/db";
import type { DbExpiryAlert } from "./types";

const ALERT_SELECT = `
  select ib.id, p.name_he as product_name, ib.branch_id, b.name as branch_name,
         ib.quantity,
         ceil(extract(epoch from (ib.expiry_date - now())) / 86400)::int as days_left
  from inventory_batches ib
  join products p on p.id = ib.product_id
  join branches b on b.id = ib.branch_id
  where ib.status <> 'REMOVED' and ib.expiry_date <= now() + interval '3 days'
`;

function mapAlertRow(row: Record<string, unknown>): DbExpiryAlert {
  return {
    id: row.id as string,
    productName: row.product_name as string,
    branchId: row.branch_id as string,
    branchName: row.branch_name as string,
    quantity: Number(row.quantity),
    daysLeft: Number(row.days_left),
  };
}

export async function getExpiryAlertsForBranch(
  branchId: string
): Promise<DbExpiryAlert[]> {
  const { rows } = await query(
    `${ALERT_SELECT} and ib.branch_id = $1 order by ib.expiry_date asc`,
    [branchId]
  );
  return rows.map(mapAlertRow);
}

export async function getExpiryAlertsForOrg(
  organizationId: string
): Promise<DbExpiryAlert[]> {
  const { rows } = await query(
    `${ALERT_SELECT} and b.organization_id = $1 order by ib.expiry_date asc`,
    [organizationId]
  );
  return rows.map(mapAlertRow);
}
