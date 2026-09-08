/**
 * מיתוג המערכת עצמה (Gestion) — נפרד מהמותג של כל ארגון/עסק (BrandTheme).
 * מוצג בכל עמודי המערכת (מסכי כניסה/הרשמה והדשבורדים כולם) כדי שהמותג
 * הכללי תמיד יהיה נוכח, מעל מיתוג הארגון הספציפי.
 */

export function GestionMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- לוגו המערכת, קובץ סטטי קבוע
    <img src="/gestion-logo.png" alt="Gestion" className={className} />
  );
}

export function PoweredByGestion({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 text-[11px] text-brand-text/40 ${className ?? ""}`}
    >
      <span>Powered by</span>
      <GestionMark className="h-3 w-auto" />
    </div>
  );
}
