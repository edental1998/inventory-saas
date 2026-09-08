-- DDL ידני שמשקף 1:1 את prisma/schema.prisma.
--
-- למה קובץ SQL ידני ולא "npx prisma migrate"? בסביבת הענן הנוכחית שבה נכתב הקוד,
-- הגישה לשרת ההפצה של קובץ ה-engine של Prisma (binaries.prisma.sh) חסומה ברמת
-- הרשת, כך שפקודות כמו `prisma generate`/`migrate dev` לא הצליחו לרוץ שם.
-- כדי בכל זאת להראות מערכת אמיתית עם מסד נתונים חי, יצרנו את הטבלאות ישירות
-- דרך SQL רגיל מול PostgreSQL אמיתי (כולל שרת PostgreSQL מקומי מוטמע שמגיע
-- עם prisma דרך `npx prisma dev`, ללא צורך בהתקנת שרת נפרד).
--
-- ברגע שמריצים את `npx prisma generate` בסביבה עם גישת אינטרנט רגילה (המחשב
-- שלך, שרת CI, שירות אחסון), אפשר לעבור בהדרגה מהשאילתות הידניות ב-src/lib/data
-- ל-Prisma Client המלא באותה סכמה בדיוק — שתי הגישות מתארות את אותו מודל נתונים.

create table if not exists organizations (
  id text primary key,
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists brand_themes (
  id text primary key,
  organization_id text not null unique references organizations(id) on delete cascade,
  color_primary text not null,
  color_secondary text not null,
  color_accent text not null,
  color_background text not null,
  color_surface text not null,
  color_text text not null,
  color_success text not null default '#16A34A',
  color_warning text not null default '#D97706',
  color_danger text not null default '#DC2626',
  logo_light_url text,
  logo_dark_url text,
  login_background_url text,
  dashboard_background_url text,
  font_family text not null default 'Heebo',
  updated_at timestamptz not null default now()
);

create table if not exists branches (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  timezone text not null default 'Asia/Jerusalem',
  created_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  branch_id text references branches(id) on delete set null,
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('CHAIN_MANAGER', 'BRANCH_MANAGER', 'EMPLOYEE')),
  preferred_locale text not null default 'he',
  created_at timestamptz not null default now()
);

create table if not exists products (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name_he text not null,
  name_en text not null,
  category text not null,
  unit text not null default 'יחידה',
  shelf_life_hours integer not null default 72, -- שעות, לא ימים: יש מוצרי מאפה שפגים תוך פחות מיום
  reference_photo_url text, -- נשלחת ל-AI כדוגמה חזותית לזיהוי אוטומטי (ראו product_captures)
  created_at timestamptz not null default now()
);

-- Phase 2: מיגרציה רכה מ-default_shelf_life_days (ימים) ל-shelf_life_hours (שעות),
-- שקטה ובלתי-מזיקה גם על התקנה קיימת שכבר הריצה את הגרסה הישנה של הקובץ הזה.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'shelf_life_hours'
  ) then
    alter table products add column shelf_life_hours integer;
    update products set shelf_life_hours = coalesce(default_shelf_life_days, 3) * 24;
    alter table products alter column shelf_life_hours set default 72;
    alter table products alter column shelf_life_hours set not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'default_shelf_life_days'
  ) then
    alter table products drop column default_shelf_life_days;
  end if;
end $$;

create table if not exists inventory_batches (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  quantity integer not null, -- הכמות המקורית שהתקבלה, קבועה — ראו שלושת העמודות הבאות למצב בפועל
  received_at timestamptz not null default now(),
  expiry_date timestamptz not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'REMOVED')),
  arrival_photo_url text, -- חותמת הזמן של קובץ זה (created_at/received_at) קובעת מתי המוצר "הגיע" בפועל
  disposed_at timestamptz, -- Phase 2: חותמת הזמן של אירוע הזריקה האחרון על האצווה הזו
  disposal_photo_url text,
  disposed_by_user_id text references users(id) on delete set null,
  created_by_user_id text references users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table inventory_batches add column if not exists disposed_at timestamptz;
alter table inventory_batches add column if not exists disposal_photo_url text;
alter table inventory_batches add column if not exists disposed_by_user_id text references users(id) on delete set null;

-- הרחבה: תנועות מלאי חלקיות (מדף/מקפיא/זריקה חלקית) — ראו ARCHITECTURE.md
-- → "תנועות מלאי חלקיות וסיבת זריקה". מונים רצים ליד ה-quantity המקורי, לא
-- מחליפים אותו — כך יומן הביקורת (stock_movements) נשאר מקור האמת לתנועה
-- בפועל, והעמודות האלה הן רק "cache" נוח לקריאה מהירה בלי לסכם בכל פעם.
alter table inventory_batches add column if not exists shelf_quantity integer not null default 0;
alter table inventory_batches add column if not exists freezer_quantity integer not null default 0;
alter table inventory_batches add column if not exists wasted_quantity integer not null default 0;

create table if not exists stock_movements (
  id text primary key,
  batch_id text not null references inventory_batches(id) on delete cascade,
  type text not null check (type in ('RECEIVE', 'MOVE_TO_SHELF', 'MOVE_TO_FREEZER', 'REMOVE_EXPIRED', 'WASTE', 'SALE_ADJUSTMENT')),
  quantity integer not null,
  performed_by_user_id text references users(id) on delete set null,
  reason text check (reason in ('EXPIRED', 'QUALITY_ISSUE', 'PEST_CONTAMINATION', 'SUSPECTED_CONSUMPTION', 'OTHER')), -- רלוונטי רק ל-type=WASTE
  note text,
  created_at timestamptz not null default now()
);

alter table stock_movements drop constraint if exists stock_movements_type_check;
alter table stock_movements add constraint stock_movements_type_check
  check (type in ('RECEIVE', 'MOVE_TO_SHELF', 'MOVE_TO_FREEZER', 'REMOVE_EXPIRED', 'WASTE', 'SALE_ADJUSTMENT'));
alter table stock_movements add column if not exists reason text;
alter table stock_movements drop constraint if exists stock_movements_reason_check;
alter table stock_movements add constraint stock_movements_reason_check
  check (reason in ('EXPIRED', 'QUALITY_ISSUE', 'PEST_CONTAMINATION', 'SUSPECTED_CONSUMPTION', 'OTHER') or reason is null);

create table if not exists tasks (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  type text not null check (type in ('RECEIVE_DELIVERY', 'RESTOCK_SHELF', 'REMOVE_OLD_STOCK', 'CHECK_EXPIRY', 'CUSTOM')),
  title text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'DONE', 'OVERDUE')),
  assigned_to_id text references users(id) on delete set null,
  created_by_id text references users(id) on delete set null,
  related_batch_id text references inventory_batches(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  photo_required boolean not null default false,
  proof_photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists sale_records (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  date date not null,
  quantity_sold integer not null,
  revenue numeric,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

-- Phase 2: כל צילום מוצר (הגעה/זריקה) — ראו ARCHITECTURE.md → "תכנון Phase 2".
-- זו גם היומן (audit trail) של מה ה-AI ניחש מול מה שאושר בפועל.
create table if not exists product_captures (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  event_type text not null check (event_type in ('ARRIVAL', 'DISPOSAL')),
  photo_url text not null,
  captured_by_user_id text references users(id) on delete set null,
  captured_at timestamptz not null default now(),
  ai_suggested_product_id text references products(id) on delete set null,
  ai_confidence real,
  ai_raw_response text,
  resolved_product_id text references products(id) on delete set null,
  quantity integer,
  status text not null default 'PENDING_REVIEW'
    check (status in ('AUTO_CONFIRMED', 'PENDING_REVIEW', 'PENDING_DATE_REVIEW', 'CONFIRMED', 'REJECTED')),
  resulting_batch_id text references inventory_batches(id) on delete set null,
  -- מדבקת תוקף שה-AI קרא מהתמונה עצמה (ראו ARCHITECTURE.md → "קריאת מדבקות תוקף").
  -- תמיד נדרש אישור/עריכה של עובד לפני שמשתמשים בזה בפועל — ראו confirmed_expiry_date.
  detected_expiry_date date,
  detected_expiry_raw_text text,
  confirmed_expiry_date date,
  -- רלוונטי רק ל-event_type=DISPOSAL — הסיבה שהעובד בחר לזריקה, ראו ARCHITECTURE.md
  -- → "תנועות מלאי חלקיות וסיבת זריקה".
  waste_reason text,
  created_at timestamptz not null default now()
);

alter table product_captures add column if not exists detected_expiry_date date;
alter table product_captures add column if not exists detected_expiry_raw_text text;
alter table product_captures add column if not exists confirmed_expiry_date date;
alter table product_captures add column if not exists waste_reason text;
alter table product_captures drop constraint if exists product_captures_waste_reason_check;
alter table product_captures add constraint product_captures_waste_reason_check
  check (waste_reason in ('EXPIRED', 'QUALITY_ISSUE', 'PEST_CONTAMINATION', 'SUSPECTED_CONSUMPTION', 'OTHER') or waste_reason is null);
alter table product_captures drop constraint if exists product_captures_status_check;
alter table product_captures add constraint product_captures_status_check
  check (status in ('AUTO_CONFIRMED', 'PENDING_REVIEW', 'PENDING_DATE_REVIEW', 'CONFIRMED', 'REJECTED'));

create index if not exists idx_users_org on users(organization_id);
create index if not exists idx_branches_org on branches(organization_id);
create index if not exists idx_tasks_branch on tasks(branch_id);
create index if not exists idx_tasks_assigned on tasks(assigned_to_id);
create index if not exists idx_batches_branch on inventory_batches(branch_id);
create index if not exists idx_batches_branch_product_active on inventory_batches(branch_id, product_id, status);
create index if not exists idx_sales_branch_date on sale_records(branch_id, date);
create index if not exists idx_captures_branch on product_captures(branch_id);
create index if not exists idx_captures_status on product_captures(status);

-- Google Sign-In: מזהה Google (sub) ייחודי לכל משתמש, ותמיכה במשתמש שנוצר
-- דרך Google בלבד (בלי סיסמה מקומית) — ראו src/lib/auth/google-oauth.ts
-- ו-src/lib/data/signup.ts. אלה alter-ים אידמפוטנטיים, בטוחים גם על התקנה
-- קיימת שכבר הריצה את הגרסה הישנה של הקובץ הזה.
alter table users add column if not exists google_id text;
create unique index if not exists idx_users_google_id on users(google_id) where google_id is not null;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'users' and column_name = 'password_hash' and is_nullable = 'NO'
  ) then
    alter table users alter column password_hash drop not null;
  end if;
end $$;

-- מחזור חיים אמיתי למשימה (Slice 1 של שיפוץ הניווט): PENDING/DONE היו עד עכשיו
-- שני המצבים היחידים שנכתבו בפועל — IN_PROGRESS ו-OVERDUE הוגדרו ב-CHECK אבל
-- אף קוד לא כתב אליהם. העמודות האלה נותנות ל-"התחל משימה"/"השלם משימה" משמעות
-- אמיתית, כולל מי (לא רק מתי) ביצע כל מעבר — ראו getTaskOwnership/completeTask
-- ב-src/lib/data/tasks.ts. כולן nullable/תוספתיות: שורות קיימות ושאילתות קיימות
-- ממשיכות לעבוד בלי שינוי.
alter table tasks add column if not exists started_at timestamptz;
alter table tasks add column if not exists started_by_id text references users(id) on delete set null;
alter table tasks add column if not exists completed_by_id text references users(id) on delete set null;
alter table tasks add column if not exists completion_notes text;
alter table tasks add column if not exists description text;
alter table tasks add column if not exists checklist jsonb;
