import "server-only";

/**
 * עזרי OAuth ל"התחברות עם Google" — Authorization Code flow ידני, בלי
 * NextAuth/Auth.js (ראו ההסבר בראש session.ts). כל הלוגיקה כאן היא קריאות
 * HTTP רגילות מול נקודות הקצה הפומביות של Google, בלי שום תלות npm חדשה.
 *
 * ה-state שנשלח ל-Google (ומתקבל בחזרה ב-callback) חתום באותה שיטה בדיוק
 * כמו עוגיית ה-session (HMAC-SHA256 דרך Web Crypto) — כך שאין צורך בעוגייה
 * זמנית נוספת כדי "לזכור" מה המשתמש התחיל לעשות (login/signup, ושם העסק
 * שהוקלד במסך ההרשמה) בזמן שהוא נמצא אצל Google.
 */

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT =
  "https://openidconnect.googleapis.com/v1/userinfo";

export type OAuthIntent = "login" | "signup";

export interface OAuthStatePayload {
  intent: OAuthIntent;
  locale: string;
  /** רק בזרימת הרשמה: שם העסק/המנהל שהוקלדו לפני ההפניה ל-Google */
  orgName?: string;
  adminName?: string;
  nonce: string;
  exp: number;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

function getGoogleClientId(): string {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value) throw new Error("GOOGLE_CLIENT_ID is not configured");
  return value;
}

function getGoogleClientSecret(): string {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  if (!value) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return value;
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * חותם payload קצר-חיים (10 דקות) שמועבר כפרמטר `state` ל-Google. זה גם
 * מגן מפני CSRF (state לא ניתן לניחוש/זיוף) וגם "מוביל" בבטחה את הכוונה
 * (login/signup) ואת פרטי טופס ההרשמה דרך ההפניה החיצונית ל-Google וחזרה.
 */
export async function signOAuthState(
  payload: Omit<OAuthStatePayload, "nonce" | "exp">
): Promise<string> {
  const fullPayload: OAuthStatePayload = {
    ...payload,
    nonce: crypto.randomUUID(),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const key = await getHmacKey();
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(fullPayload))
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  return `${payloadB64}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyOAuthState(
  token: string | null | undefined
): Promise<OAuthStatePayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) return null;

  const key = await getHmacKey();
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signatureB64),
    new TextEncoder().encode(payloadB64)
  );
  if (!isValid) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    ) as OAuthStatePayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** בונה את כתובת ההפניה ל-Google, כולל ה-state החתום */
export function buildGoogleAuthorizeUrl(
  state: string,
  redirectUri: string
): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", getGoogleClientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

/** מחליף authorization code שהתקבל ב-callback בטוקן גישה מול Google */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }
  return response.json();
}

interface GoogleUserInfoResponse {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

/** שולף מ-Google את פרטי המשתמש (אימייל, שם, מזהה יציב sub) לפי access token */
export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google userinfo request failed: ${response.status}`);
  }
  const data = (await response.json()) as GoogleUserInfoResponse;
  return {
    sub: data.sub,
    email: data.email,
    emailVerified: data.email_verified,
    name: data.name ?? data.email,
  };
}
