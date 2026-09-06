import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  verifyOAuthState,
} from "@/lib/auth/google-oauth";
import { establishSession } from "@/lib/auth/actions";
import { ROLE_HOME_PATH } from "@/lib/auth/types";
import {
  createOrganizationWithAdmin,
  findUserByGoogleId,
  linkGoogleIdToUserByEmail,
} from "@/lib/data/signup";

/**
 * שלב 2: Google מפנה לכאן עם code+state. מאמתים את ה-state (חתימה + תפוגה),
 * מחליפים את ה-code בפרטי המשתמש מול Google, ואז לפי המקרה:
 *  - כבר יש משתמש עם ה-google_id הזה → מתחברים.
 *  - יש משתמש קיים עם אותו אימייל (נרשם בעבר עם סיסמה) → מקשרים את חשבון
 *    ה-Google אליו ומתחברים.
 *  - אין משתמש כזה, וזו זרימת הרשמה עם שם עסק/מנהל תקינים → יוצרים ארגון
 *    חדש (ראו src/lib/data/signup.ts).
 *  - אין משתמש כזה וזו זרימת login → שולחים חזרה למסך ההתחברות עם שגיאה
 *    שמסבירה שצריך להירשם קודם.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const stateToken = searchParams.get("state");
  const state = await verifyOAuthState(stateToken);
  const locale = state?.locale || "he";

  function failure(reason: string) {
    const url = new URL(`/${locale}/login`, origin);
    url.searchParams.set("error", reason);
    return NextResponse.redirect(url);
  }

  if (!code || !state) return failure("google_state_invalid");

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);
    const googleUser = await fetchGoogleUserInfo(tokens.access_token);

    if (!googleUser.emailVerified) return failure("google_email_unverified");

    let user = await findUserByGoogleId(googleUser.sub);

    if (!user) {
      user = await linkGoogleIdToUserByEmail(googleUser.email, googleUser.sub);
    }

    if (!user) {
      if (state.intent !== "signup" || !state.orgName || !state.adminName) {
        return failure("google_no_account");
      }
      user = await createOrganizationWithAdmin({
        organizationName: state.orgName,
        adminName: state.adminName,
        adminEmail: googleUser.email,
        googleId: googleUser.sub,
        locale,
      });
    }

    await establishSession({
      id: user.id,
      organizationId: user.organizationId,
      branchId: user.branchId,
      role: user.role,
      name: user.name,
    });

    return NextResponse.redirect(
      new URL(`/${locale}${ROLE_HOME_PATH[user.role]}`, origin)
    );
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return failure("google_unexpected_error");
  }
}
