import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * אחסון תמונות מקומי בדיסק, תחת public/uploads — מספיק כדי להריץ ולבדוק
 * את כל זרימת הצילום מקצה לקצה בלי תלות בשירות חיצוני.
 *
 * חשוב: זה פתרון לפיתוח/הדגמה בלבד. בפריסה אמיתית לענן (Vercel/Render וכו')
 * הדיסק המקומי לא קבוע בין פריסות/instances, ולכן לפני production יש להחליף
 * את הפונקציה הזו לכתיבה מול שירות אחסון אובייקטים תואם S3 (למשל Cloudflare
 * R2) — שאר הקוד (src/lib/actions/captures.ts וכו') לא צריך להשתנות בכלל,
 * כי הוא רק קורא ל-saveUploadedImage ומקבל בחזרה כתובת URL. ראו ARCHITECTURE.md
 * → "תכנון Phase 2" → "אחסון התמונות".
 */

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic" || mimeType === "image/heif") return "heic";
  return "jpg";
}

export interface SavedImage {
  /** נתיב URL ציבורי, יחסי לשורש האתר — נשמר כמו שהוא בעמודות ה-DB (photo_url וכו') */
  url: string;
  /** נתיב מוחלט בדיסק — נוח לצורך שליחת ה-bytes חזרה ל-AI לצורך זיהוי */
  absolutePath: string;
  mimeType: string;
}

/**
 * שומר תמונה שהועלתה (File מ-FormData) תחת public/uploads/<organizationId>/<branchId>/<uuid>.<ext>
 */
export async function saveUploadedImage(
  file: File,
  organizationId: string,
  branchId: string
): Promise<SavedImage> {
  const mimeType = file.type || "image/jpeg";
  const ext = extensionForMimeType(mimeType);
  const fileName = `${randomUUID()}.${ext}`;

  const dir = path.join(UPLOADS_ROOT, organizationId, branchId);
  await mkdir(dir, { recursive: true });

  const absolutePath = path.join(dir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  return {
    url: `/uploads/${organizationId}/${branchId}/${fileName}`,
    absolutePath,
    mimeType,
  };
}
