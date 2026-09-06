import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * חיבור PostgreSQL אמיתי דרך ה-driver הרשמי `pg`, ולא דרך Prisma Client.
 *
 * למה לא Prisma Client כאן? Prisma Client דורש שלב build בשם `prisma generate`,
 * ושלב הזה מוריד קובץ engine מהשרת של Prisma (binaries.prisma.sh). בסביבת הענן
 * שבה נכתב הקוד הזה, הגישה לכתובת הזו חסומה — ולכן שכבת הנתונים הזו (src/lib/data)
 * כותבת שאילתות SQL מפורשות ישירות מול הטבלאות שמוגדרות ב-prisma/schema.sql,
 * שמשקפות בדיוק את המודל המתועד ב-prisma/schema.prisma.
 *
 * זו לא "עקיפה זמנית מפוקפקת" — הרבה מערכות production אמיתיות עובדות ככה
 * במכוון (SQL מפורש במקום ORM). אם וכאשר ירצו לעבור ל-Prisma Client המלא
 * (בסביבה עם גישת אינטרנט רגילה ל-npx prisma generate), אפשר לעשות זאת בהדרגה
 * בלי לשנות את הסכמה עצמה.
 */
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

// חובה להאזין ל-'error' על ה-pool: חיבור idle שנופל (למשל reset מהצד השני,
// שכיח גם מול Postgres serverless אמיתי כמו Neon אחרי "התעוררות" מ-cold start)
// פולט אירוע ברמת ה-process, ובלי מאזין זה מפיל את כל שרת ה-Node.
pool.on("error", (err) => {
  console.error("Unexpected error on idle pg client", err);
});

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

function isTransientConnectionError(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "ECONNRESET" ||
    code === "57P01" || // admin_shutdown
    message.includes("Connection terminated unexpectedly") ||
    message.includes("ECONNRESET")
  );
}

/**
 * עטיפה דקה סביב pool.query עם ניסיון חוזר יחיד על שגיאת חיבור חולפת.
 * זה נחוץ במיוחד מול מסדי Postgres "serverless"/מוטמעים שיכולים לישון
 * ולנתק חיבורים ריקים — הניסיון הראשון שמעיר אותם נכשל, השני מצליח.
 * כל שכבת src/lib/data משתמשת בזה במקום ב-pool.query ישירות.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await pool.query<T>(text, params);
    } catch (error) {
      const isLastAttempt = attempt === MAX_ATTEMPTS;
      if (!isTransientConnectionError(error) || isLastAttempt) throw error;
      console.warn(
        `Transient DB connection error (attempt ${attempt}/${MAX_ATTEMPTS}), retrying:`,
        error
      );
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }
  // בלתי־ניתן להגעה בפועל (הלולאה תמיד מחזירה או זורקת) — רק כדי לספק ל-TypeScript
  throw new Error("unreachable");
}

/**
 * עוטף כמה שאילתות בעסקה אחת (BEGIN/COMMIT/ROLLBACK) על אותו חיבור. נחוץ
 * במיוחד בהקצאת FIFO רב-אצוות (ראו src/lib/data/inventory.ts): קוראים כמה
 * שורות "כמה מקום פנוי באצווה הזו", מחליטים כמה לקחת מכל אחת, וכותבים בחזרה —
 * בלי עסקה, שתי בקשות בו-זמנית לאותו מוצר/סניף יכולות "לקרוא" את אותו מצב
 * ולהקצות פעמיים את אותה כמות. שאר שכבת ה-DB (INSERT/UPDATE בודדים) לא זקוקה
 * לזה, ולכן ממשיכה להשתמש ב-`query` הרגיל.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
