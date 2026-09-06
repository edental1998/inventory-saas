/**
 * מריץ את prisma/schema.sql מול מסד הנתונים ב-DATABASE_URL.
 * זהו ה"migrate" הזמני שלנו כל עוד `npx prisma migrate` לא זמין (ראו הסבר
 * מלא בראש prisma/schema.sql ובמסמך ARCHITECTURE.md).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import "dotenv/config";

async function main() {
  const sql = readFileSync(
    path.join(__dirname, "..", "prisma", "schema.sql"),
    "utf-8"
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log("✅ הסכמה הוחלה בהצלחה על", process.env.DATABASE_URL);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("❌ שגיאה בהחלת הסכמה:", error);
  process.exit(1);
});
