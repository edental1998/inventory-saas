/**
 * כלי חד-פעמי, מופעל ידנית על ידי הבעלים: אבטחת חשבונות ה-QA בפרודקשן.
 *
 *   npx tsx scripts/secure-qa-accounts.ts list
 *   npx tsx scripts/secure-qa-accounts.ts rotate [--generate --out <file>] [--email <addr> ...]
 *   npx tsx scripts/secure-qa-accounts.ts revoke [--email <addr> ...]
 *
 * עקרונות:
 *  - מחרוזת החיבור למסד לא מתקבלת כארגומנט ולא נקראת מ-.env (כדי לא להגיע
 *    להיסטוריית הפקודות או להתחבר בטעות למסד מקומי): היא נשאלת בהקלדה מוסתרת
 *    (או ממשתנה הסביבה GESTION_DB_URL אם הבעלים בחר להגדיר אותו בעצמו).
 *  - סיסמאות חדשות מוזנות בהקלדה מוסתרת (ממנהל הסיסמאות של הבעלים), או נוצרות
 *    ל-קובץ שהבעלים בוחר (--generate --out). הן לעולם לא מודפסות למסך/ללוג.
 *  - רק משתמשי הארגון "S4 QA Bakery" (או כתובות שצוינו מפורשות ב---email)
 *    נשנים. אף משתמש אחר, ושום נתון (ארגונים/משימות/ראיות), לא נמחק ולא משתנה.
 *  - כל שינוי מעלה את users.session_version, כך שכל ה-sessions הקיימים של
 *    אותם משתמשים מתבטלים מיד (ראו getSession ב-src/lib/auth/get-session.ts).
 */
import { randomBytes } from "node:crypto";
import { existsSync, openSync, writeSync, closeSync } from "node:fs";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const QA_ORG_NAME = "S4 QA Bakery";
const MIN_PASSWORD_LENGTH = 16;

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    let value = "";
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n" || char === "\u0004") {
          if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          stdout.write("\nבוטל.\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdin.on("data", onData);
  });
}

function parseArgs(argv: string[]) {
  const [command = "list", ...rest] = argv;
  const emails: string[] = [];
  let generate = false;
  let out: string | null = null;
  let insecureSsl = false;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--generate") generate = true;
    else if (arg === "--insecure-ssl") insecureSsl = true;
    else if (arg === "--out") out = rest[++i] ?? null;
    else if (arg === "--email") {
      const value = rest[++i];
      if (value) emails.push(value.trim().toLowerCase());
    } else {
      throw new Error(`ארגומנט לא מוכר: ${arg}`);
    }
  }
  return { command, emails, generate, out, insecureSsl };
}

function redact(message: string, secret: string): string {
  return secret ? message.split(secret).join("[REDACTED]") : message;
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  org_name: string;
  has_password: boolean;
  session_version: number;
  disabled: boolean;
}

const USER_SELECT = `
  select u.id, u.email, u.role, o.name as org_name,
         (u.password_hash is not null and u.password_hash <> '') as has_password,
         u.session_version, (u.disabled_at is not null) as disabled
  from users u join organizations o on o.id = u.organization_id`;

let knownSecret = "";

async function main() {
  const { command, emails, generate, out, insecureSsl } = parseArgs(process.argv.slice(2));
  if (!["list", "rotate", "revoke"].includes(command)) {
    throw new Error("פקודה לא מוכרת. אפשר: list | rotate | revoke");
  }

  const connectionString =
    process.env.GESTION_DB_URL?.trim() ||
    (await promptHidden("PostgreSQL connection string (הקלדה מוסתרת): ")).trim();
  if (!connectionString) throw new Error("לא הוזנה מחרוזת חיבור.");
  knownSecret = connectionString;

  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 1,
    ssl: isLocal ? false : { rejectUnauthorized: !insecureSsl },
  });

  try {
    const columns = await pool.query(
      `select column_name from information_schema.columns
       where table_name = 'users' and column_name in ('session_version', 'disabled_at')`
    );
    if (columns.rows.length < 2) {
      throw new Error(
        "העמודות session_version/disabled_at עדיין לא קיימות במסד. יש לפרוס קודם את הגרסה החדשה (npm run db:push רץ אוטומטית בכל deploy)."
      );
    }

    const all = await pool.query<UserRow>(`${USER_SELECT} order by o.name, u.role, u.email`);
    const qaCandidates = all.rows.filter(
      (u) =>
        u.org_name === QA_ORG_NAME ||
        /\.test@example\.com$/i.test(u.email) ||
        /@[a-z0-9-]+\.example$/i.test(u.email)
    );

    if (command === "list") {
      const orgCounts = new Map<string, number>();
      for (const u of all.rows) orgCounts.set(u.org_name, (orgCounts.get(u.org_name) ?? 0) + 1);
      console.log("\nארגונים (שם — מספר משתמשים):");
      for (const [name, count] of orgCounts) console.log(`  ${name} — ${count}`);
      console.log("\nחשבונות שנראים כ-QA/דמו/בדיקה (לפי שם ארגון QA או דפוס כתובת):");
      for (const u of qaCandidates) {
        console.log(
          `  ${u.email} | ${u.role} | ${u.org_name} | סיסמה מקומית: ${u.has_password ? "יש" : "אין"} | גרסת session: ${u.session_version} | מושבת: ${u.disabled ? "כן" : "לא"}`
        );
      }
      console.log("\n(קריאה בלבד — שום דבר לא שונה.)");
      return;
    }

    const targets =
      emails.length > 0
        ? all.rows.filter((u) => emails.includes(u.email.toLowerCase()))
        : all.rows.filter((u) => u.org_name === QA_ORG_NAME);
    const missing = emails.filter((e) => !targets.some((u) => u.email.toLowerCase() === e));
    if (missing.length > 0) throw new Error(`כתובות שלא נמצאו: ${missing.join(", ")}`);
    if (targets.length === 0) throw new Error("לא נמצאו חשבונות לטיפול.");

    console.log(`\nחשבונות שיעודכנו (${targets.length}):`);
    for (const u of targets) console.log(`  ${u.email} | ${u.role} | ${u.org_name}`);
    const verb = command === "rotate" ? "ROTATE" : "REVOKE";
    const confirmation = await promptHidden(
      `\nלאישור הקלידו ${verb} ${targets.length} (ההקלדה מוסתרת): `
    );
    if (confirmation.trim() !== `${verb} ${targets.length}`) {
      throw new Error("אישור שגוי. לא בוצע שום שינוי.");
    }

    const newPasswords = new Map<string, string>();
    if (command === "rotate") {
      if (generate) {
        if (!out) throw new Error("--generate דורש --out <קובץ>.");
        if (existsSync(out)) throw new Error("קובץ היעד כבר קיים — בחרו נתיב חדש (לא דורסים).");
        for (const u of targets) newPasswords.set(u.id, randomBytes(24).toString("base64url"));
      } else {
        for (const u of targets) {
          for (;;) {
            const first = await promptHidden(`סיסמה חדשה עבור ${u.email} (מינימום ${MIN_PASSWORD_LENGTH} תווים): `);
            if (first.length < MIN_PASSWORD_LENGTH) {
              console.log(`  קצרה מדי (מינימום ${MIN_PASSWORD_LENGTH}).`);
              continue;
            }
            const second = await promptHidden("  הקלידו שוב לאימות: ");
            if (first !== second) {
              console.log("  הסיסמאות לא זהות.");
              continue;
            }
            newPasswords.set(u.id, first);
            break;
          }
        }
      }
    }

    let outFd: number | null = null;
    if (command === "rotate" && generate && out) {
      // 'wx' = יצירה בלבד (לא דורס); 0o600 = קריאה/כתיבה לבעלים בלבד (ב-Windows מוגבל ל-ACL של המשתמש)
      outFd = openSync(out, "wx", 0o600);
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const u of targets) {
        if (command === "rotate") {
          const hash = await bcrypt.hash(newPasswords.get(u.id)!, 12);
          await client.query(
            `update users set password_hash = $1, session_version = session_version + 1
             where id = $2 and email = $3`,
            [hash, u.id, u.email]
          );
        } else {
          await client.query(
            `update users set session_version = session_version + 1 where id = $1 and email = $2`,
            [u.id, u.email]
          );
        }
      }
      if (outFd !== null) {
        for (const u of targets) writeSync(outFd, `${u.email}\t${newPasswords.get(u.id)}\n`);
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
      if (outFd !== null) closeSync(outFd);
    }

    if (command === "rotate") {
      const after = await pool.query<{ id: string; password_hash: string; session_version: number }>(
        `select id, password_hash, session_version from users where id = any($1::text[])`,
        [targets.map((u) => u.id)]
      );
      let verified = 0;
      for (const row of after.rows) {
        if (await bcrypt.compare(newPasswords.get(row.id)!, row.password_hash)) verified++;
      }
      console.log(`\n✔ ${targets.length} חשבונות עודכנו; אומתו מול ה-DB: ${verified}/${targets.length}.`);
      if (outFd !== null) {
        console.log(`✔ הסיסמאות נשמרו בקובץ שבחרתם. העבירו אותן למנהל הסיסמאות ומחקו את הקובץ.`);
      }
    } else {
      console.log(`\n✔ ה-sessions של ${targets.length} חשבונות בוטלו (סיסמאות לא שונו).`);
    }
    console.log("✔ כל ה-sessions הקיימים של החשבונות האלה פסלו מיד. שום נתון אחר לא שונה או נמחק.");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const code = (error as { code?: string } | undefined)?.code;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`✖ ${redact(message, knownSecret)}${code ? ` (${code})` : ""}`);
  if (code && /CERT|SELF_SIGNED/.test(code)) {
    console.error("  אם זה חיבור חיצוני לספק מאובטח, אפשר להריץ שוב עם --insecure-ssl (מצפין בלי לאמת תעודה).");
  }
  process.exit(1);
});
