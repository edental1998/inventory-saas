"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { clsx } from "clsx";
import { GestionMark, PoweredByGestion } from "@/components/ui/GestionBranding";

export interface SidebarNavItem {
  href: string;
  label: string;
}

export function Sidebar({
  items,
  appName,
  orgName,
  roleLabel,
  logoSrc,
}: {
  items: SidebarNavItem[];
  appName: string;
  orgName: string;
  roleLabel: string;
  logoSrc?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col gap-6 border-e border-black/5 bg-brand-surface p-4">
      <div className="flex justify-center px-2">
        <GestionMark className="h-8 w-auto" />
      </div>

      <div className="flex items-center gap-2 px-2">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- לוגו חיצוני דינמי לפי מותג
          <img src={logoSrc} alt={orgName} className="h-8 w-8 rounded" />
        ) : (
          <div
            className="h-8 w-8 rounded bg-brand-primary"
            aria-hidden
          />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-brand-text">
            {orgName}
          </span>
          <span className="truncate text-xs text-brand-text/50">
            {appName}
          </span>
          <span className="truncate text-xs font-medium text-brand-accent">
            {roleLabel}
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-brand-primary text-brand-on-primary font-medium"
                  : "text-brand-text/70 hover:bg-black/5 hover:text-brand-text"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <PoweredByGestion className="border-t border-black/5 px-2 pt-3" />
    </aside>
  );
}
