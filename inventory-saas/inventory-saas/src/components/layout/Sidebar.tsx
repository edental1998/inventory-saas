"use client";

import { useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { clsx } from "clsx";
import { GestionMark } from "@/components/ui/GestionBranding";

export type SidebarNavItem =
  | { type: "link"; href: string; label: string }
  | { type: "disabled"; label: string }
  | { type: "group"; label: string; children: SidebarNavChild[] };

export type SidebarNavChild =
  | { type: "link"; href: string; label: string }
  | { type: "disabled"; label: string };

/** התאמה גם לנתיבי-בת (למשל /branch/tasks/abc123) לא רק להתאמה מדויקת */
function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function isGroupActive(pathname: string, children: SidebarNavChild[]): boolean {
  return children.some(
    (child) => child.type === "link" && isPathActive(pathname, child.href)
  );
}

/**
 * פריט ניווט משותף לקישור פעיל/לא-פעיל — בשימוש גם לפריטים ברמה עליונה
 * וגם לילדים בתוך קבוצה. פריט "disabled" (יעד Phase 2/3 שטרם נבנה) מוצג
 * עם תווית "בקרוב" ואינו קישור בכלל — לא "עמוד מזויף", ראו תכנון Slice 5.
 */
function NavLinkRow({
  item,
  pathname,
  comingSoonLabel,
  indent = false,
}: {
  item: SidebarNavChild;
  pathname: string;
  comingSoonLabel: string;
  indent?: boolean;
}) {
  if (item.type === "disabled") {
    return (
      <div
        className={clsx(
          "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-brand-text/35",
          indent && "ms-3"
        )}
        aria-disabled="true"
      >
        <span>{item.label}</span>
        <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-brand-text/40">
          {comingSoonLabel}
        </span>
      </div>
    );
  }

  const active = isPathActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={clsx(
        "block rounded-lg px-3 py-2 text-sm transition-colors",
        indent && "ms-3",
        active
          ? "bg-brand-primary text-brand-on-primary font-medium"
          : "text-brand-text/70 hover:bg-black/5 hover:text-brand-text"
      )}
    >
      {item.label}
    </Link>
  );
}

function NavGroup({
  label,
  navChildren,
  pathname,
  comingSoonLabel,
}: {
  label: string;
  navChildren: SidebarNavChild[];
  pathname: string;
  comingSoonLabel: string;
}) {
  const active = isGroupActive(pathname, navChildren);
  const [open, setOpen] = useState(active);
  const hasRealLink = navChildren.some((child) => child.type === "link");

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={clsx(
          "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors",
          active && !open
            ? "text-brand-primary font-medium"
            : "text-brand-text/70 hover:bg-black/5 hover:text-brand-text",
          !hasRealLink && "text-brand-text/45"
        )}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span aria-hidden className="text-xs text-brand-text/40">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div className="mt-1 flex flex-col gap-1">
          {navChildren.map((child) => (
            <NavLinkRow
              key={child.type === "link" ? child.href : child.label}
              item={child}
              pathname={pathname}
              comingSoonLabel={comingSoonLabel}
              indent
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  items,
  appName,
  orgName,
  roleLabel,
  logoSrc,
  comingSoonLabel,
}: {
  items: SidebarNavItem[];
  appName: string;
  orgName: string;
  roleLabel: string;
  logoSrc?: string;
  comingSoonLabel: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-black/5 bg-brand-surface p-4 md:w-72 md:gap-6 md:border-b-0 md:border-e">
      <div className="flex justify-center px-2 py-2 md:block">
        <GestionMark className="h-16 w-auto md:h-32" />
      </div>

      <div className="flex items-center gap-2 px-2">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- לוגו חיצוני דינמי לפי מותג
          <img src={logoSrc} alt={orgName} className="h-8 w-8 rounded" />
        ) : (
          <div className="h-8 w-8 rounded bg-brand-primary" aria-hidden />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold text-brand-text">{orgName}</span>
          <span className="truncate text-xs text-brand-text/50">{appName}</span>
          <span className="truncate text-xs font-medium text-brand-accent">{roleLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="shrink-0 rounded-lg border border-black/10 px-3 py-2 text-sm md:hidden"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      <nav className={clsx("flex-1 flex-col gap-1", mobileOpen ? "flex" : "hidden", "md:flex")}>
        {items.map((item) => {
          if (item.type === "group") {
            return (
              <NavGroup
                key={item.label}
                label={item.label}
                navChildren={item.children}
                pathname={pathname}
                comingSoonLabel={comingSoonLabel}
              />
            );
          }
          return (
            <NavLinkRow
              key={item.type === "link" ? item.href : item.label}
              item={item}
              pathname={pathname}
              comingSoonLabel={comingSoonLabel}
            />
          );
        })}
      </nav>
    </aside>
  );
}
