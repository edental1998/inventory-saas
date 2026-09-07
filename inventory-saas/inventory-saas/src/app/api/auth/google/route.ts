import { NextResponse, type NextRequest } from "next/server";
import {
  buildGoogleAuthorizeUrl,
  getAppOrigin,
  signOAuthState,
} from "@/lib/auth/google-oauth";

/**
 * שלב 1 של "התחברות עם Google": בונה state חתום (כולל הכוונה login/signup
 * ופרטי טופס ההרשמה אם יש) ומפנה בפועל ל-Google. אין כאן שום session/עוגייה
 * זמנית — כל המידע "נוסע" בתוך ה-state החתום עצמו וחוזר ב-callback.
 *
 * נקרא מקישור רגיל (<a href="/api/auth/google?...">), לא מ-form, ולכן זהו
 * Route Handler רגיל (GET) ולא Server Action.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = getAppOrigin(request.nextUrl.origin);
  const intent = searchParams.get("intent") === "signup" ? "signup" : "login";
  const locale = searchParams.get("locale") || "he";
  const orgName = searchParams.get("orgName") || undefined;
  const adminName = searchParams.get("adminName") || undefined;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const url = new URL(`/${locale}/login`, origin);
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  if (intent === "signup" && (!orgName || !adminName)) {
    const url = new URL(`/${locale}/signup`, origin);
    url.searchParams.set("error", "google_missing_details");
    return NextResponse.redirect(url);
  }

  const state = await signOAuthState({ intent, locale, orgName, adminName });
  const redirectUri = `${origin}/api/auth/google/callback`;
  return NextResponse.redirect(buildGoogleAuthorizeUrl(state, redirectUri));
}
