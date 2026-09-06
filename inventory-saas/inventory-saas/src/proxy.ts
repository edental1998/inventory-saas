import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/auth/session";
import { ROLE_HOME_PATH, ROUTE_PREFIX_TO_ROLE } from "./lib/auth/types";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * שער אחד לכל בקשה: קודם קובע שפה/כיווניות (next-intl), ואז — אם הנתיב
 * שייך לאחד הדשבורדים המוגנים (/ceo, /branch, /employee) — בודק שיש
 * session תקין ושהתפקיד שלו תואם לדשבורד המבוקש. זה בדיוק הרגע שבו
 * "בלי לוגין" הופך ל"בלי גישה" בפועל, לא רק כרשומה בתיעוד.
 */
export default async function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const hasLocalePrefix = (routing.locales as readonly string[]).includes(
    firstSegment ?? ""
  );
  const locale = hasLocalePrefix ? firstSegment! : routing.defaultLocale;
  const pathWithoutLocale =
    "/" + segments.slice(hasLocalePrefix ? 1 : 0).join("/");

  const protectedPrefix = Object.keys(ROUTE_PREFIX_TO_ROLE).find((prefix) =>
    pathWithoutLocale.startsWith(prefix)
  );

  if (protectedPrefix) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return NextResponse.redirect(url);
    }

    const requiredRole = ROUTE_PREFIX_TO_ROLE[protectedPrefix];
    if (session.role !== requiredRole) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${ROLE_HOME_PATH[session.role]}`;
      return NextResponse.redirect(url);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
