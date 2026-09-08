"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * "פול" קליל של נתונים בצד שרת: מרעננת את דף השרת (Server Component) שוב
 * ושוב במרווח קבוע, בלי WebSocket/תשתית נוספת. בלי UI משלה — רק מרכיב-מטרה.
 */
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
