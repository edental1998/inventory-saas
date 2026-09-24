import "server-only";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * אחסון תמונות ב-Cloudflare R2 (תואם S3) — בקט פרטי לחלוטין, בלי גישה
 * ציבורית. זו נקודת הכניסה היחידה לאחסון בכל הקוד העסקי (captures.ts,
 * tasks.ts) — אף קובץ אחר לא אמור לדעת ש-R2 בכלל קיים, כדי שאפשר יהיה
 * להחליף ספק בעתיד בלי לגעת בשאר המערכת.
 *
 * עקרון מרכזי: מה שנשמר ב-DB (בעמודות כמו proof_photo_url/photo_url/
 * arrival_photo_url) הוא תמיד ה-*מפתח* היציב של האובייקט (למשל
 * "orgId/branchId/uuid.png"), לעולם לא URL חתום — URL חתום נוצר רק
 * בזמן קריאה בפועל (getSignedPhotoUrl), אחרי שהקורא כבר עבר בדיקת
 * הרשאה, ותקף לזמן קצר בלבד (5 דקות).
 */

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const SIGNED_URL_EXPIRY_SECONDS = 5 * 60;

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic" || mimeType === "image/heif") return "heic";
  return "jpg";
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 storage is not configured (missing R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)"
    );
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2 storage is not configured (missing R2_BUCKET_NAME)");
  }
  return bucket;
}

export type UploadRejectionReason = "invalid_type" | "too_large";

/** ולידציה בצד שרת לפני כל העלאה — לא סומכים על accept/maxSize בצד לקוח */
export function validateUploadedFile(file: File): UploadRejectionReason | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) return "invalid_type";
  if (file.size > MAX_FILE_SIZE_BYTES) return "too_large";
  return null;
}

export interface UploadedImage {
  /** מפתח האובייקט היציב שנשמר ב-DB */
  key: string;
  /** הבייטים שהועלו בפועל — לשימוש מיידי (כמו זיהוי AI) בלי round-trip ל-R2 */
  bytes: Buffer;
  mimeType: string;
}

/**
 * שומרת תמונה שהועלתה (File מ-FormData) ב-R2 תחת מפתח ייחודי לא-ניחוש
 * <organizationId>/<branchId>/<uuid>.<ext>. זורקת אם הקובץ לא עובר ולידציה —
 * הקוראים אמורים לקרוא ל-validateUploadedFile קודם כדי להחזיר שגיאה
 * ידידותית; זו רק רשת ביטחון אחרונה.
 */
export async function saveUploadedImage(
  file: File,
  organizationId: string,
  branchId: string
): Promise<UploadedImage> {
  const rejection = validateUploadedFile(file);
  if (rejection) {
    throw new Error(`upload_rejected:${rejection}`);
  }

  const mimeType = file.type;
  const ext = extensionForMimeType(mimeType);
  const key = `${organizationId}/${branchId}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: bytes,
      ContentType: mimeType,
    })
  );

  return { key, bytes, mimeType };
}

/**
 * URL חתום קצר-טווח לצפייה בתמונה — לקרוא רק אחרי שהקורא כבר עבר בדיקת
 * הרשאה (תפקיד/שיוך/ארגון) ברמת ה-Server Component/Action, לעולם לא לפני.
 * מחזירה null אם אין מפתח.
 */
export async function getSignedPhotoUrl(
  key: string | null | undefined
): Promise<string | null> {
  if (!key) return null;
  const command = new GetObjectCommand({ Bucket: getBucketName(), Key: key });
  return getSignedUrl(getClient(), command, {
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });
}
