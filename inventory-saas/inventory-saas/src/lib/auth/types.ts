export type UserRole = "CHAIN_MANAGER" | "BRANCH_MANAGER" | "EMPLOYEE";

/** נתיב הבית של כל תפקיד (בלי פרפיקס שפה — זה נוסף בזמן ניתוב) */
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  CHAIN_MANAGER: "/ceo/dashboard",
  BRANCH_MANAGER: "/branch/dashboard",
  EMPLOYEE: "/employee/dashboard",
};

/** לאיזה תפקיד מיועד כל route group מוגן */
export const ROUTE_PREFIX_TO_ROLE: Record<string, UserRole> = {
  "/ceo": "CHAIN_MANAGER",
  "/branch": "BRANCH_MANAGER",
  "/employee": "EMPLOYEE",
};
