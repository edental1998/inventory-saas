import { query } from "@/lib/db";
import type { DbBranchSummary } from "./types";

export async function getBranchesForOrg(
  organizationId: string
): Promise<{ id: string; name: string }[]> {
  const { rows } = await query<{ id: string; name: string }>(
    `select id, name from branches where organization_id = $1 order by name`,
    [organizationId]
  );
  return rows;
}

export async function getBranchById(
  branchId: string
): Promise<{ id: string; name: string } | null> {
  const { rows } = await query<{ id: string; name: string }>(
    `select id, name from branches where id = $1`,
    [branchId]
  );
  return rows[0] ?? null;
}

export async function getBranchSummary(
  branchId: string,
  branchName: string
): Promise<DbBranchSummary> {
  const [taskResult, alertResult, salesResult] = await Promise.all([
    query(
      `select
         count(*) filter (where status = 'DONE') as done,
         count(*) as total
       from tasks where branch_id = $1`,
      [branchId]
    ),
    query(
      `select count(*) as cnt from inventory_batches
       where branch_id = $1 and status <> 'REMOVED'
         and expiry_date <= now() + interval '3 days'`,
      [branchId]
    ),
    query(
      `select
         coalesce(sum(revenue) filter (where date >= now() - interval '7 days'), 0) as weekly,
         coalesce(sum(revenue) filter (where date >= now() - interval '30 days'), 0) as monthly
       from sale_records where branch_id = $1`,
      [branchId]
    ),
  ]);

  const done = Number(taskResult.rows[0]?.done ?? 0);
  const total = Number(taskResult.rows[0]?.total ?? 0);

  return {
    id: branchId,
    name: branchName,
    taskCompletionRate: total > 0 ? Math.round((done / total) * 100) : 100,
    openExpiryAlerts: Number(alertResult.rows[0]?.cnt ?? 0),
    weeklySales: Number(salesResult.rows[0]?.weekly ?? 0),
    monthlySales: Number(salesResult.rows[0]?.monthly ?? 0),
  };
}

export async function getBranchSummariesForOrg(
  organizationId: string
): Promise<DbBranchSummary[]> {
  const branches = await getBranchesForOrg(organizationId);
  return Promise.all(
    branches.map((branch) => getBranchSummary(branch.id, branch.name))
  );
}
