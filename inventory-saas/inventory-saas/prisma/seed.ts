/**
 * מזין נתוני דמו אמיתיים לתוך ה-DB (לא רק בזיכרון) עבור שני ארגונים, כולל
 * משתמשים עם סיסמאות מוצפנות אמיתיות (bcrypt) שאיתם אפשר להתחבר בפועל
 * במסך ה-login. מריצים עם: npm run db:push && npm run db:seed
 *
 * משתמש pg ישירות (לא Prisma Client) מאותה סיבה שמוסברת ב-src/lib/db.ts.
 */
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import "dotenv/config";
import { hashPassword } from "../src/lib/auth/password";
import { DEMO_ACCOUNT_PASSWORD } from "../src/lib/auth/demo-password";
import { demoBakeryTheme } from "../src/lib/themes/brands/demo-bakery";
import { demoCafeTheme } from "../src/lib/themes/brands/demo-cafe";
import type { BrandTheme } from "../src/lib/themes/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedOrganization(
  theme: BrandTheme,
  branchNames: string[],
  employeeName: string,
  products: {
    nameHe: string;
    nameEn: string;
    category: string;
    shelfLifeHours: number;
  }[]
) {
  const orgId = randomUUID();
  await pool.query(
    `insert into organizations (id, slug, name) values ($1, $2, $3)`,
    [orgId, theme.slug, theme.displayName]
  );

  await pool.query(
    `insert into brand_themes
       (id, organization_id, color_primary, color_secondary, color_accent,
        color_background, color_surface, color_text, color_success, color_warning,
        color_danger, logo_light_url, logo_dark_url, login_background_url,
        dashboard_background_url, font_family)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      randomUUID(),
      orgId,
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.accent,
      theme.colors.background,
      theme.colors.surface,
      theme.colors.text,
      theme.colors.success,
      theme.colors.warning,
      theme.colors.danger,
      theme.logo.light,
      theme.logo.dark,
      theme.backgroundImage.login ?? null,
      theme.backgroundImage.dashboard ?? null,
      theme.fontFamily,
    ]
  );

  const branchIds: string[] = [];
  for (const name of branchNames) {
    const branchId = randomUUID();
    branchIds.push(branchId);
    await pool.query(
      `insert into branches (id, organization_id, name) values ($1, $2, $3)`,
      [branchId, orgId, name]
    );
  }
  const mainBranchId = branchIds[0]!;

  const passwordHash = await hashPassword(DEMO_ACCOUNT_PASSWORD);
  const ceoId = randomUUID();
  const managerId = randomUUID();
  const employeeId = randomUUID();

  await pool.query(
    `insert into users (id, organization_id, branch_id, name, email, password_hash, role)
     values
       ($1, $2, null, $3, $4, $5, 'CHAIN_MANAGER'),
       ($6, $2, $7, $8, $9, $5, 'BRANCH_MANAGER'),
       ($10, $2, $7, $11, $12, $5, 'EMPLOYEE')`,
    [
      ceoId,
      orgId,
      "מנהל/ת רשת",
      `ceo@${theme.slug}.example`,
      passwordHash,
      managerId,
      mainBranchId,
      "מנהל/ת סניף",
      `manager@${theme.slug}.example`,
      employeeId,
      employeeName,
      `employee@${theme.slug}.example`,
    ]
  );

  const productIds: string[] = [];
  for (const product of products) {
    const productId = randomUUID();
    productIds.push(productId);
    await pool.query(
      `insert into products (id, organization_id, name_he, name_en, category, shelf_life_hours)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        productId,
        orgId,
        product.nameHe,
        product.nameEn,
        product.category,
        product.shelfLifeHours,
      ]
    );
  }

  // אצוות מלאי עם תאריכי תפוגה סביב "עכשיו" כדי שהתראות התוקף יראו משמעותיות מיד
  const daysOffsets = [-1, 0, 1, 2, 5];
  for (let i = 0; i < daysOffsets.length; i++) {
    const productId = productIds[i % productIds.length]!;
    const offset = daysOffsets[i]!;
    const batchId = randomUUID();
    await pool.query(
      `insert into inventory_batches
         (id, branch_id, product_id, quantity, expiry_date, status, created_by_user_id)
       values ($1, $2, $3, $4, now() + ($5 || ' days')::interval, $6, $7)`,
      [
        batchId,
        mainBranchId,
        productId,
        4 + i * 3,
        offset,
        offset < 0 ? "EXPIRED" : "ACTIVE",
        employeeId,
      ]
    );
  }

  // משימות לדוגמה בסניף הראשי
  const tasks: {
    type: string;
    title: string;
    status: string;
    photoRequired: boolean;
    dueOffsetDays: number;
    completed?: boolean;
  }[] = [
    {
      type: "RECEIVE_DELIVERY",
      title: `קליטת משלוח סחורה — ${products[0]?.nameHe ?? ""}`,
      status: "PENDING",
      photoRequired: true,
      dueOffsetDays: 0,
    },
    {
      type: "RESTOCK_SHELF",
      title: "העלאת מלאי טרי למדף הקדמי",
      status: "IN_PROGRESS",
      photoRequired: false,
      dueOffsetDays: 0,
    },
    {
      type: "REMOVE_OLD_STOCK",
      title: "הורדת מוצרים שפג תוקפם אתמול",
      status: "OVERDUE",
      photoRequired: true,
      dueOffsetDays: -1,
    },
    {
      type: "CHECK_EXPIRY",
      title: "בדיקת תוקפים במקרר המוצרים הטריים",
      status: "DONE",
      photoRequired: false,
      dueOffsetDays: -2,
      completed: true,
    },
  ];

  for (const task of tasks) {
    await pool.query(
      `insert into tasks
         (id, branch_id, type, title, status, assigned_to_id, created_by_id,
          due_at, photo_required, completed_at)
       values ($1,$2,$3,$4,$5,$6,$7, now() + ($8 || ' days')::interval, $9,
               case when $10 then now() else null end)`,
      [
        randomUUID(),
        mainBranchId,
        task.type,
        task.title,
        task.status,
        employeeId,
        managerId,
        task.dueOffsetDays,
        task.photoRequired,
        task.completed ?? false,
      ]
    );
  }

  // נתוני מכירות ל-30 הימים האחרונים, לכל הסניפים, כדי שסכומי שבוע/חודש לא יהיו אפס
  for (const branchId of branchIds) {
    for (let dayAgo = 0; dayAgo < 30; dayAgo++) {
      for (const productId of productIds) {
        const baseQty = 5 + Math.round(Math.random() * 15);
        const revenue = baseQty * (12 + Math.random() * 20);
        await pool.query(
          `insert into sale_records (id, branch_id, product_id, date, quantity_sold, revenue)
           values ($1, $2, $3, (now() - ($4 || ' days')::interval)::date, $5, $6)`,
          [
            randomUUID(),
            branchId,
            productId,
            dayAgo,
            baseQty,
            Number(revenue.toFixed(2)),
          ]
        );
      }
    }
  }

  return { orgId, branchIds };
}

async function main() {
  console.log("🌱 מנקה נתונים קיימים...");
  await pool.query(
    `truncate table sale_records, stock_movements, tasks, inventory_batches,
       products, users, branches, brand_themes, organizations restart identity cascade`
  );

  console.log("🌱 מזין את מאפיית השיבולת...");
  await seedOrganization(
    demoBakeryTheme,
    ["סניף מרכז", "סניף רמת החייל", "סניף רעננה"],
    "מיגל",
    [
      { nameHe: "לחם מחמצת", nameEn: "Sourdough bread", category: "לחם", shelfLifeHours: 48 },
      { nameHe: "קרואסון חמאה", nameEn: "Butter croissant", category: "מאפה", shelfLifeHours: 24 },
      { nameHe: "עוגת שוקולד", nameEn: "Chocolate cake", category: "עוגות", shelfLifeHours: 72 },
      { nameHe: "עוגיות שקדים", nameEn: "Almond cookies", category: "עוגיות", shelfLifeHours: 168 },
    ]
  );

  console.log("🌱 מזין את קפה מרידיאן...");
  await seedOrganization(
    demoCafeTheme,
    ["סניף דיזנגוף", "סניף הרצליה"],
    "אנה",
    [
      { nameHe: "קפה שחור", nameEn: "Black coffee", category: "משקאות", shelfLifeHours: 24 },
      { nameHe: "מאפה גבינה", nameEn: "Cheese pastry", category: "מאפה", shelfLifeHours: 48 },
      { nameHe: "סלט קינואה", nameEn: "Quinoa salad", category: "מאכלים קרים", shelfLifeHours: 24 },
    ]
  );

  console.log("✅ הזנת נתוני הדמו הושלמה בהצלחה.");
  console.log(`   כל חשבונות הדמו משתמשים בסיסמה: ${DEMO_ACCOUNT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("❌ שגיאה בהזנת הנתונים:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
