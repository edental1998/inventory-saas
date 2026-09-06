import type { UserRole } from "./types";

/**
 * מנגנון session פשוט ומאובטח, מבוסס עוגייה חתומה (HMAC-SHA256) דרך Web Crypto —
 * לא ספריית Auth.js/NextAuth. הסיבה: Web Crypto (crypto.subtle) עובד באופן זהה
 * גם ב-Server Components/Server Actions (Node) וגם ב-middleware/proxy (Edge),
 * בלי תלות נוספת שצריך להתקין ולוודא שתואמת לשני זמני הריצה. אם בהמשך ירצו
 * SSO/ספקי התחברות חיצוניים (Google, Microsoft Entra וכו') — זו בדיוק הנקודה
 * להחליף למימוש מלא של Auth.js, בלי לשנות איך שאר האפליקציה קוראת session.
 */
export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // שבוע

export interface SessionPayload {
  userId: string;
  organizationId: string;
  branchId: string | null;
  role: UserRole;
  name: string;
  exp: number; // מועד תפוגה, מילישניות מאז epoch
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // רק לשלב הדמו: כדי שהאפליקציה תרוץ גם בלי להגדיר .env מראש.
    // בפרודקשן חובה להגדיר AUTH_SECRET אמיתי וסודי (ראו .env.example).
    return "dev-only-insecure-secret-change-me";
  }
  return secret;
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

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSessionToken(
  payload: SessionPayload
): Promise<string> {
  const key = await getHmacKey(getAuthSecret());
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${payloadB64}.${signatureB64}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) return null;

  const key = await getHmacKey(getAuthSecret());
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signatureB64),
    new TextEncoder().encode(payloadB64)
  );
  if (!isValid) return null;

  try {
    const json = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.exp === "number" && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
