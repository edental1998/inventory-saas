"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { clsx } from "clsx";
import {
  Menu,
  X,
  ChevronUp,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export type SidebarNavItem =
  | { type: "link"; href: string; label: string; icon?: ReactNode }
  | { type: "disabled"; label: string; icon?: ReactNode }
  | { type: "group"; label: string; icon?: ReactNode; children: SidebarNavChild[] };

export type SidebarNavChild =
  | { type: "link"; href: string; label: string }
  | { type: "disabled"; label: string };

const COLLAPSE_STORAGE_KEY = "gestion:sidebar-collapsed";

/**
 * בוחר עבור pathname נתון את ה-href התואם הארוך/הספציפי ביותר מבין כל
 * הקישורים בניווט (כולל ילדי קבוצות) — לא סתם "כל prefix תואם=פעיל".
 * זה מונע באג של שני אחים שחולקים prefix (למשל /ceo/tasks ו-
 * /ceo/tasks/by-branch) מודגשים שניהם בו-זמנית: /ceo/tasks/by-branch
 * תמיד "תנצח" את /ceo/tasks כשה-pathname הוא באמת /ceo/tasks/by-branch,
 * בעוד שדף פרטים כמו /ceo/tasks/abc123 עדיין יתאים רק ל-/ceo/tasks
 * (אין קישור ספציפי יותר לו בניווט).
 */
function collectLinkHrefs(items: SidebarNavItem[]): string[] {
  const hrefs: string[] = [];
  for (const item of items) {
    if (item.type === "link") hrefs.push(item.href);
    if (item.type === "group") {
      for (const child of item.children) {
        if (child.type === "link") hrefs.push(child.href);
      }
    }
  }
  return hrefs;
}

function computeActiveHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (matches && (!best || href.length > best.length)) best = href;
  }
  return best;
}

/**
 * פריט ניווט משותף לקישור פעיל/לא-פעיל — בשימוש גם לפריטים ברמה עליונה
 * וגם לילדים בתוך קבוצה. פריט "disabled" (יעד Phase 2/3 שטרם נבנה) מוצג
 * עם תג "בקרוב" ואינו קישור בכלל — לא "עמוד מזויף", ראו תכנון Slice 5.
 * ילדים בתוך קבוצה מקבלים הדגשה "רכה" (soft) כשפעילים, לא את אותה פסיכת
 * primary מלאה של פריט עליון — כדי שהיררכיית "באיזה אזור" מול "באיזה עמוד
 * מדויק" תהיה קריאה.
 */
function NavLinkRow({
  item,
  activeHref,
  comingSoonLabel,
  indent = false,
}: {
  item: SidebarNavChild;
  activeHref: string | null;
  comingSoonLabel: string;
  indent?: boolean;
}) {
  if (item.type === "disabled") {
    return (
      <div
        className={clsx(
          "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-brand-text-muted",
          indent && "ms-3"
        )}
        aria-disabled="true"
      >
        <span>{item.label}</span>
        <Badge tone="neutral">{comingSoonLabel}</Badge>
      </div>
    );
  }

  const active = item.href === activeHref;
  return (
    <Link
      href={item.href}
      className={clsx(
        "block rounded-lg px-3 py-2 text-sm transition-colors",
        indent && "ms-3",
        active
          ? "bg-brand-primary-soft font-medium text-brand-primary"
          : "text-brand-text-secondary hover:bg-black/5 hover:text-brand-text"
      )}
    >
      {item.label}
    </Link>
  );
}

function NavGroup({
  label,
  icon,
  navChildren,
  activeHref,
  comingSoonLabel,
  collapsed,
  onExpandSidebar,
}: {
  label: string;
  icon?: ReactNode;
  navChildren: SidebarNavChild[];
  activeHref: string | null;
  comingSoonLabel: string;
  collapsed: boolean;
  onExpandSidebar: () => void;
}) {
  const active = navChildren.some(
    (child) => child.type === "link" && child.href === activeHref
  );
  const [open, setOpen] = useState(active);
  const hasRealLink = navChildren.some((child) => child.type === "link");

  function handleHeaderClick() {
    if (collapsed) {
      onExpandSidebar();
      setOpen(true);
      return;
    }
    setOpen((value) => !value);
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleHeaderClick}
        title={collapsed ? label : undefined}
        className={clsx(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm transition-colors",
          collapsed && "justify-center px-0",
          active
            ? "text-brand-primary"
            : "text-brand-text-secondary hover:bg-black/5 hover:text-brand-text",
          !hasRealLink && "opacity-60"
        )}
        aria-expanded={open}
      >
        {icon ? <span className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span> : null}
        {!collapsed ? (
          <>
            <span className="flex-1 font-medium">{label}</span>
            {open ? (
              <ChevronUp aria-hidden className="h-4 w-4 text-brand-text-muted" />
            ) : (
              <ChevronDown aria-hidden className="h-4 w-4 text-brand-text-muted" />
            )}
          </>
        ) : null}
      </button>
      {open && !collapsed ? (
        <div className="mt-1 flex flex-col gap-1">
          {navChildren.map((child) => (
            <NavLinkRow
              key={child.type === "link" ? child.href : child.label}
              item={child}
              activeHref={activeHref}
              comingSoonLabel={comingSoonLabel}
              indent
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TopLevelRow({
  item,
  activeHref,
  comingSoonLabel,
  collapsed,
}: {
  item: Extract<SidebarNavItem, { type: "link" | "disabled" }>;
  activeHref: string | null;
  comingSoonLabel: string;
  collapsed: boolean;
}) {
  if (item.type === "disabled") {
    return (
      <div
        className={clsx(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-brand-text-muted",
          collapsed && "justify-center px-0"
        )}
        aria-disabled="true"
        title={collapsed ? item.label : undefined}
      >
        {item.icon ? (
          <span className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">{item.icon}</span>
        ) : null}
        {!collapsed ? (
          <>
            <span className="flex-1">{item.label}</span>
            <Badge tone="neutral">{comingSoonLabel}</Badge>
          </>
        ) : null}
      </div>
    );
  }

  const active = item.href === activeHref;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={clsx(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-brand-primary text-brand-on-primary"
          : "text-brand-text-secondary hover:bg-black/5 hover:text-brand-text"
      )}
    >
      {item.icon ? (
        <span className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">{item.icon}</span>
      ) : null}
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
}

export function Sidebar({
  items,
  appName,
  orgName,
  roleLabel,
  logoSrc,
  comingSoonLabel,
  userName,
  signOutLabel,
  signOutAction,
}: {
  items: SidebarNavItem[];
  appName: string;
  orgName: string;
  roleLabel: string;
  logoSrc?: string;
  comingSoonLabel: string;
  userName: string;
  signOutLabel: string;
  signOutAction: (formData: FormData) => Promise<void>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const activeHref = computeActiveHref(pathname, collectLinkHrefs(items));

  // נטען אחרי mount בלבד, כדי לא לגרום ל-hydration mismatch מול ה-render
  // הראשוני בצד השרת (שם אין גישה ל-localStorage)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // localStorage חסום (מצב פרטי וכו') — נשאר במצב פתוח כברירת מחדל
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // התעלמות — נוחות בלבד, לא חובה שתישמר
      }
      return next;
    });
  }

  return (
    <aside
      className={clsx(
        "flex w-full shrink-0 flex-col border-b border-brand-border bg-brand-surface md:sticky md:top-0 md:h-screen md:border-b-0 md:border-e",
        collapsed ? "md:w-[76px]" : "md:w-72"
      )}
    >
      <div className="flex items-center gap-2 p-4">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- לוגו חיצוני דינמי לפי מותג
          <img src={logoSrc} alt={orgName} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="h-9 w-9 shrink-0 rounded-lg bg-brand-primary" aria-hidden />
        )}
        {!collapsed ? (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-brand-text">{orgName}</span>
            <span className="truncate text-xs text-brand-text-muted">
              {appName} · {roleLabel}
            </span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="shrink-0 rounded-lg border border-brand-border p-2 md:hidden"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden shrink-0 rounded-lg p-2 text-brand-text-muted hover:bg-black/5 hover:text-brand-text md:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav
        className={clsx(
          "flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3",
          mobileOpen ? "flex" : "hidden",
          "md:flex"
        )}
      >
        {items.map((item) => {
          if (item.type === "group") {
            return (
              <NavGroup
                key={item.label}
                label={item.label}
                icon={item.icon}
                navChildren={item.children}
                activeHref={activeHref}
                comingSoonLabel={comingSoonLabel}
                collapsed={collapsed}
                onExpandSidebar={toggleCollapsed}
              />
            );
          }
          return (
            <TopLevelRow
              key={item.type === "link" ? item.href : item.label}
              item={item}
              activeHref={activeHref}
              comingSoonLabel={comingSoonLabel}
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      <div
        className={clsx(
          "flex items-center gap-2 border-t border-brand-border p-3",
          mobileOpen ? "flex" : "hidden md:flex",
          collapsed && "md:flex-col"
        )}
      >
        <Avatar name={userName} size="sm" />
        {!collapsed ? (
          <span className="min-w-0 flex-1 truncate text-sm text-brand-text">{userName}</span>
        ) : null}
        <form action={signOutAction}>
          <button
            type="submit"
            title={signOutLabel}
            aria-label={signOutLabel}
            className="shrink-0 rounded-lg p-2 text-brand-text-muted hover:bg-black/5 hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
