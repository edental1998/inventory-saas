import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from "./session";

/** מחזיר את ה-session הנוכחי, או null אם אין / לא תקין */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * לשימוש בתוך layout/page של אזור מוגן: מבטיח שיש session, ואם אין —
 * מפנה מיד למסך ההתחברות (בפועל זו רשת ביטחון; ה-proxy.ts כבר אמור
 * לתפוס את המקרה הזה קודם ברמת ה-middleware).
 */
export async function requireSession(locale: string): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/login`);
  }
  return session;
}
