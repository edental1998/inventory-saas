/**
 * גרף מגמה יומי (SVG פשוט, בלי ספריית גרפים חיצונית — כדי לא להוסיף תלות
 * גרסה חדשה לפרויקט, ראו ARCHITECTURE.md → "תכנון Phase 3"). מציג קו +
 * שטח מתחתיו, עם ערך מספרי גלוי בריחוף/בטקסט — לא מסתמך על צבע בלבד.
 */
export function TrendLineChart({
  points,
  formatValue,
  label,
}: {
  points: { date: string; value: number }[];
  formatValue: (value: number) => string;
  label: string;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-brand-text/50">—</p>;
  }

  const width = 600;
  const height = 160;
  const padding = 24;
  const max = Math.max(...points.map((p) => p.value), 1);

  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padding + i * stepX,
    y: height - padding - (p.value / max) * (height - padding * 2),
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]!.x} ${height - padding} L ${coords[0]!.x} ${height - padding} Z`;

  const first = points[0]!;
  const last = points[points.length - 1]!;

  return (
    // dir="ltr" בכוונה: הגרף עצמו (SVG עם ציר X הולך משמאל לימין, ישן→חדש)
    // הוא "תמונה" עצמאית שאינה מתהפכת לפי כיווניות העמוד — בלי זה, בעמוד
    // RTL שורת התאריכים מתחת מתהפכת ע"י flexbox בעוד ה-SVG לא, וכך התאריך
    // המוצג מתחת לכל נקודה בגרף כבר לא תואם את הנקודה שמעליו.
    <div dir="ltr" role="img" aria-label={`${label}: ${formatValue(last.value)} ${last.date}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <path d={areaPath} className="fill-brand-primary/10" />
        <path d={linePath} className="fill-none stroke-brand-primary" strokeWidth={2} />
        {coords.map((c) => (
          <circle key={c.date} cx={c.x} cy={c.y} r={2.5} className="fill-brand-primary" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-brand-text/50">
        <span>{first.date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  );
}
