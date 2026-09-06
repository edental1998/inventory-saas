import "server-only";
import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

/**
 * זיהוי מוצר מתוך תמונה — הליבה של Phase 2 (ראו ARCHITECTURE.md → "תכנון Phase 2").
 * במקום שהעובד יבחר/יקליד קוד פריט, שולחים את התמונה שצולמה יחד עם קטלוג
 * המוצרים של הארגון (שם + קטגוריה + תמונת רפרנס אם יש) אל Claude, ומבקשים
 * תשובה במבנה קבוע (tool-use) כדי לא להסתמך על ניתוח טקסט חופשי.
 *
 * בכוונה: בלי ANTHROPIC_API_KEY מוגדר, הפונקציה מחזירה confidence=0 במקום
 * לזרוק שגיאה — כך שכל השרשרת (צילום → יצירת/סגירת אצווה) עדיין עובדת
 * במלואה במסלול "בחירה ידנית" (ראו src/lib/actions/captures.ts), גם בסביבה
 * שבה עדיין לא הוגדר מפתח.
 *
 * בצילומי ARRIVAL, אותה קריאה גם מנסה לקרוא מדבקת/תווית תוקף מודפסת שהודבקה
 * בפועל על המוצר בתמונה (ראו ARCHITECTURE.md → "קריאת מדבקות תוקף") — אבל
 * זה תמיד רק *הצעה*: אין כאן החלטה "מספיק בטוח כדי לדלג על אישור" כמו בזיהוי
 * המוצר עצמו. איזה תאריך בסוף נכנס לאצווה נקבע אך ורק אחרי אישור/עריכה
 * מפורשים של העובד, ראו src/lib/actions/captures.ts → confirmExpiryDateAction.
 */

export interface ClassifiableProduct {
  id: string;
  nameHe: string;
  nameEn: string;
  category: string;
  referencePhotoUrl?: string | null;
}

export interface ClassificationCandidate {
  productId: string;
  confidence: number; // 0..1
}

export interface ClassificationResult {
  /** הניחוש הכי טוב, ממוין מהגבוה לנמוך — ריק אם ה-AI לא הצליח לשייך שום דבר */
  candidates: ClassificationCandidate[];
  reasoning: string;
  /** תאריך שנקרא ממדבקת תוקף גלויה בתמונה, בפורמט ISO (YYYY-MM-DD) — null אם לא נמצאה/לא ברורה */
  detectedExpiryDate: string | null;
  /** הטקסט הגולמי שה-AI קרא על המדבקה (למשל "03/09" או "עד 3.9.26") — לשקיפות מול העובד */
  detectedExpiryRawText: string | null;
  /** JSON גולמי מהמודל, לשקיפות/דיבוג — נשמר בעמודת ai_raw_response */
  rawResponse: string | null;
}

/** מעל הסף הזה זיהוי *המוצר עצמו* מתבצע אוטומטית; מתחתיו נדרש אישור עובד. לא חל על תאריך תפוגה (ראו למעלה) */
export const AUTO_CONFIRM_CONFIDENCE_THRESHOLD = 0.85;

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      // אופציונלי: proxy ארגוני/endpoint חלופי התואם ל-Anthropic API. משמש גם
      // בבדיקות פנימיות שלנו מול שרת מדומה — ברוב הפריסות משאירים את זה ריק.
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    })
  : null;

const CLASSIFY_TOOL_NAME = "report_product_match";

async function toBase64Image(
  absolutePathOrUrl: string
): Promise<{ base64: string; mediaType: string } | null> {
  try {
    // תמונות רפרנס נשמרות באותה תיקיית uploads (ראו src/lib/storage/local.ts) —
    // אם בעתיד יגיעו מ-URL חיצוני (למשל אחרי מעבר ל-S3/R2), אפשר להוסיף כאן fetch().
    if (!absolutePathOrUrl.startsWith("/")) return null;
    const path = await import("node:path");
    const fullPath = path.join(process.cwd(), "public", absolutePathOrUrl);
    const bytes = await readFile(fullPath);
    const ext = absolutePathOrUrl.split(".").pop()?.toLowerCase();
    const mediaType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return { base64: bytes.toString("base64"), mediaType };
  } catch {
    return null;
  }
}

export async function classifyProductPhoto(
  photoAbsolutePath: string,
  photoMimeType: string,
  products: ClassifiableProduct[],
  options: { detectExpiryLabel: boolean } = { detectExpiryLabel: false }
): Promise<ClassificationResult> {
  if (!anthropicClient || products.length === 0) {
    return {
      candidates: [],
      reasoning: anthropicClient
        ? "אין מוצרים בקטלוג הארגון"
        : "זיהוי AI לא מוגדר (חסר ANTHROPIC_API_KEY) — עובר לבחירה ידנית",
      detectedExpiryDate: null,
      detectedExpiryRawText: null,
      rawResponse: null,
    };
  }

  try {
    const photoBytes = await readFile(photoAbsolutePath);
    const photoBase64 = photoBytes.toString("base64");

    const catalogLines = products
      .map(
        (p, i) =>
          `${i + 1}. id="${p.id}" | עברית: ${p.nameHe} | English: ${p.nameEn} | קטגוריה: ${p.category}`
      )
      .join("\n");

    const expiryInstruction = options.detectExpiryLabel
      ? "\n\nבנוסף, בדוק אם על המוצר עצמו מודבקת מדבקה/תווית עם תאריך תפוגה מודפס או " +
        "כתוב-ביד (למשל \"תוקף: 03/09\" או \"עד 3.9.26\"). אם כן — מלא את detectedExpiryDate " +
        "בפורמט ISO (YYYY-MM-DD; תאריכים דו-ספרתיים מתפרשים כ-DD/MM ולא MM/DD, לפי המוסכמה " +
        "הישראלית, ושנה דו-ספרתית כמו 26 היא 2026), ואת detectedExpiryRawText בטקסט המדויק " +
        "שקראת. אם אין מדבקה כזו או שהיא לא קריאה בבירור — השאר את שניהם null. אל תנחש תאריך " +
        "לפי סוג המוצר בעצמך — רק אם ממש קראת אותו על התמונה."
      : "";

    const content: Anthropic.Messages.ContentBlockParam[] = [
      {
        type: "text",
        text:
          "זו תמונה של מוצר מזון שצולם בסניף של רשת בייקרי/בית קפה. " +
          "הקטלוג האפשרי של הרשת הזו הוא:\n\n" +
          catalogLines +
          "\n\nזהה לאיזה מוצר מהקטלוג הזה (ורק מהקטלוג הזה) הכי דומה התמונה, " +
          "ודרג את רמת הביטחון שלך בין 0 ל-1. אם אף מוצר לא מתאים באמת, " +
          "אפשר להחזיר candidates ריק." +
          expiryInstruction,
      },
      {
        type: "image",
        source: {
          type: "base64",
          media_type: normalizeMediaType(photoMimeType),
          data: photoBase64,
        },
      },
    ];

    // מוסיפים תמונות רפרנס למוצרים שיש להם (עוזר ל-AI להבחין בין מוצרים דומים) —
    // מגבילים כמות כדי לא לנפח את הבקשה, בשלב הזה בלי צורך אמיתי כי לנתוני
    // הדמו אין עדיין תמונות רפרנס.
    for (const p of products) {
      if (!p.referencePhotoUrl) continue;
      const ref = await toBase64Image(p.referencePhotoUrl);
      if (!ref) continue;
      content.push({ type: "text", text: `תמונת רפרנס למוצר id="${p.id}":` });
      content.push({
        type: "image",
        source: { type: "base64", media_type: ref.mediaType as "image/jpeg", data: ref.base64 },
      });
    }

    const response = await anthropicClient.messages.create({
      model: process.env.ANTHROPIC_VISION_MODEL || "claude-haiku-4-5",
      max_tokens: 500,
      tools: [
        {
          name: CLASSIFY_TOOL_NAME,
          description: "מדווח על התאמת המוצר בתמונה לקטלוג הנתון, ועל מדבקת תוקף אם זוהתה",
          input_schema: {
            type: "object",
            properties: {
              candidates: {
                type: "array",
                description: "עד 3 המועמדים הכי סבירים, ממוינים מהגבוה לנמוך",
                items: {
                  type: "object",
                  properties: {
                    productId: { type: "string" },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                  },
                  required: ["productId", "confidence"],
                },
              },
              reasoning: { type: "string", description: "הסבר קצר בעברית" },
              detectedExpiryDate: {
                type: ["string", "null"],
                description: "תאריך תפוגה שנקרא ממדבקה על המוצר, בפורמט ISO YYYY-MM-DD, או null",
              },
              detectedExpiryRawText: {
                type: ["string", "null"],
                description: "הטקסט המדויק שנקרא על המדבקה, או null",
              },
            },
            required: ["candidates", "reasoning"],
          },
        },
      ],
      tool_choice: { type: "tool", name: CLASSIFY_TOOL_NAME },
      messages: [{ role: "user", content }],
    });

    const toolUseBlock = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUseBlock) {
      return {
        candidates: [],
        reasoning: "לא התקבלה תשובה מובנית מה-AI",
        detectedExpiryDate: null,
        detectedExpiryRawText: null,
        rawResponse: JSON.stringify(response),
      };
    }

    const input = toolUseBlock.input as {
      candidates?: { productId: string; confidence: number }[];
      reasoning?: string;
      detectedExpiryDate?: string | null;
      detectedExpiryRawText?: string | null;
    };
    const validIds = new Set(products.map((p) => p.id));
    const candidates = (input.candidates ?? [])
      .filter((c) => validIds.has(c.productId))
      .map((c) => ({ productId: c.productId, confidence: Math.max(0, Math.min(1, c.confidence)) }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    return {
      candidates,
      reasoning: input.reasoning ?? "",
      detectedExpiryDate: options.detectExpiryLabel ? parseIsoDate(input.detectedExpiryDate) : null,
      detectedExpiryRawText: options.detectExpiryLabel ? input.detectedExpiryRawText ?? null : null,
      rawResponse: JSON.stringify(input),
    };
  } catch (error) {
    console.error("classifyProductPhoto failed:", error);
    return {
      candidates: [],
      reasoning: "שגיאה בקריאה ל-AI — עובר לבחירה ידנית",
      detectedExpiryDate: null,
      detectedExpiryRawText: null,
      rawResponse: null,
    };
  }
}

/** מוודא שמה שהמודל החזיר הוא באמת תאריך ISO תקין לפני שהוא זורם הלאה בקוד */
function parseIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : value;
}

function normalizeMediaType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" {
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/webp") return "image/webp";
  return "image/jpeg";
}
