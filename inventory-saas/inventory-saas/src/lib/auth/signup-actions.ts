"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "./password";
import { establishSession } from "./actions";
import { ROLE_HOME_PATH } from "./types";
import {
  createOrganizationWithAdmin,
  organizationEmailExists,
} from "@/lib/data/signup";

export type SignupErrorCode =
  | "missing_fields"
  | "password_too_short"
  | "email_taken";

export interface SignupActionState {
  error?: SignupErrorCode;
}

/**
 * הרשמה עצמאית עם אימייל+סיסמה: יוצרת ארגון חדש + סניף ראשי + משתמש
 * מנהל/ת ראשי/ת (CHAIN_MANAGER) בבת אחת (ראו src/lib/data/signup.ts),
 * ומחברת אותו מיד. זו הדרך שבה נכנס עסק אמיתי חדש למערכת.
 */
export async function signupAction(
  locale: string,
  _prevState: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const organizationName = String(
    formData.get("organizationName") ?? ""
  ).trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!organizationName || !adminName || !email || !password) {
    return { error: "missing_fields" };
  }
  if (password.length < 8) {
    return { error: "password_too_short" };
  }
  if (await organizationEmailExists(email)) {
    return { error: "email_taken" };
  }

  const passwordHash = await hashPassword(password);
  const user = await createOrganizationWithAdmin({
    organizationName,
    adminName,
    adminEmail: email,
    passwordHash,
    locale,
  });

  await establishSession({
    id: user.id,
    organizationId: user.organizationId,
    branchId: user.branchId,
    role: user.role,
    name: user.name,
  });

  redirect(`/${locale}${ROLE_HOME_PATH[user.role]}`);
}
