"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserByEmail, type AuthUserRow } from "@/lib/data/users";
import { verifyPassword } from "./password";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
} from "./session";
import { ROLE_HOME_PATH, type UserRole } from "./types";
import { TENANT_HINT_COOKIE } from "@/lib/themes/current-theme";

/**
 * קוד שגיאה בלבד (לא טקסט מוכן) — הרכיב הקליינטי (LoginForm) הוא זה שמתרגם
 * אותו ל-he/en בפועל דרך useTranslations, כדי לא לצרוך next-intl בתוך
 * Server Action שרץ מחוץ להקשר הרינדור הרגיל.
 */
export type LoginErrorCode = "missing_fields" | "invalid_credentials";

export interface LoginActionState {
  error?: LoginErrorCode;
}

/**
 * תת-קבוצה של השדות שבאמת נחוצים כדי לפתוח session — בכוונה בלי
 * passwordHash, כך ש-establishSession תוכל לשמש גם משתמשים שנכנסו/נוצרו
 * דרך Google בלבד (ראו src/app/api/auth/google/callback/route.ts ו-
 * src/lib/auth/signup-actions.ts), לא רק כניסה עם אימייל+סיסמה.
 */
export interface SessionUser {
  id: string;
  organizationId: string;
  branchId: string | null;
  role: UserRole;
  name: string;
}

async function authenticate(
  email: string,
  password: string
): Promise<AuthUserRow | null> {
  if (!email || !password) return null;
  const user = await findUserByEmail(email);
  if (!user) return null;
  const passwordMatches = await verifyPassword(password, user.passwordHash);
  return passwordMatches ? user : null;
}

export async function establishSession(user: SessionUser): Promise<void> {
  const token = await signSessionToken({
    userId: user.id,
    organizationId: user.organizationId,
    branchId: user.branchId,
    role: user.role,
    name: user.name,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

/**
 * מחוברת ל-<form> דרך useActionState, ולכן .bind(null, locale) כדי שתדע
 * לאן להפנות אחרי הצלחה בלי לשבור את החתימה (prevState, formData).
 */
export async function loginAction(
  locale: string,
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "missing_fields" };
  }

  const user = await authenticate(email, password);
  if (!user) {
    return { error: "invalid_credentials" };
  }

  await establishSession(user);
  redirect(`/${locale}${ROLE_HOME_PATH[user.role]}`);
}

/**
 * כניסה מהירה עם חשבון דמו (כפתור שמגיש email+password קבועים מראש) —
 * עדיין התחברות אמיתית מול ה-DB, רק בלי להקליד. משמשת טופס רגיל (בלי
 * useActionState), ולכן החתימה היא (formData) בלבד אחרי ה-bind.
 */
export async function quickLoginAction(
  locale: string,
  formData: FormData
): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const user = await authenticate(email, password);
  if (!user) {
    redirect(`/${locale}/login`);
  }

  await establishSession(user);
  redirect(`/${locale}${ROLE_HOME_PATH[user.role]}`);
}

export async function logoutAction(locale: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect(`/${locale}/login`);
}

/** נקרא מהכרטיסים במסך בחירת הארגון (לפני התחברות) — ראו הסבר ב-current-theme.ts */
export async function chooseOrgHintAction(
  orgSlug: string,
  locale: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TENANT_HINT_COOKIE, orgSlug, {
    maxAge: 60 * 60,
    path: "/",
  });
  redirect(`/${locale}/login`);
}
