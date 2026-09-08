export type TaskType =
  | "RECEIVE_DELIVERY"
  | "RESTOCK_SHELF"
  | "REMOVE_OLD_STOCK"
  | "CHECK_EXPIRY"
  | "CUSTOM";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "OVERDUE";

export interface DbTask {
  id: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  branchId: string;
  branchName: string;
  photoRequired: boolean;
}

export interface DbExpiryAlert {
  id: string;
  productName: string;
  branchId: string;
  branchName: string;
  daysLeft: number;
  quantity: number;
}

export interface DbBranchSummary {
  id: string;
  name: string;
  taskCompletionRate: number;
  openExpiryAlerts: number;
  weeklySales: number;
  monthlySales: number;
}

export interface DbBranchManager {
  id: string;
  name: string;
  email: string;
  branchId: string;
  branchName: string;
}

export interface OrgWithTheme {
  id: string;
  slug: string;
  name: string;
  theme: {
    colorPrimary: string;
    colorSecondary: string;
    colorAccent: string;
    colorBackground: string;
    colorSurface: string;
    colorText: string;
    colorSuccess: string;
    colorWarning: string;
    colorDanger: string;
    logoLightUrl: string | null;
    logoDarkUrl: string | null;
    loginBackgroundUrl: string | null;
    dashboardBackgroundUrl: string | null;
    fontFamily: string;
  };
}
