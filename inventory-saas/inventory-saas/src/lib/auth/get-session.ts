import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUserSessionState } from "@/lib/data/users";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from "./session";

/**
 * מחזיר את ה-session הנוכחי, או null אם אין / לא תקין / בוטל. החתימה והתפוגה
 * נבדקות בלי DB (verifySessionToken, זהה ל-proxy), ואז בדיקה מול ה-DB בכל
 * בקשה: המשתמש חייב להתקיים, לא להיות מושבת, וגרסת ה-session שנחתמה בתוך
 * העוגייה חייבת להיות הגרסה הנוכחית שלו (session ישן בלי sv = גרסה 0).
 * cache() מצמצם את זה לשאילתה אחת לבקשה גם אם כמה רכיבים קוראים getSession.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const state = await getUserSessionState(payload.userId);
  if (!state || state.disabled) return null;
  if ((payload.sv ?? 0) !== state.sessionVersion) return null;
  return payload;
});

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
