/**
 * כלי גזירת צבעים גרעיניים — בלי ספריה חיצונית (כמו TrendLineChart, ראו
 * שם התיעוד). הפונקציות כאן ממירות בין hex/rgb/hsl, מערבבות שני צבעים,
 * ובוחרות טקסט קריא לפי יחס ניגודיות WCAG. משמשות את theme-to-css-vars.ts
 * כדי לגזור טוקנים סמנטיים (hover/soft/contrast/border/טקסט משני) מתוך
 * צבעי המותג הגולמיים בלבד — בלי שדות DB חדשים.
 */

export type Rgb = [number, number, number];
export type Hsl = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex([r, g, b]: Rgb): string {
  return (
    "#" +
    [r, g, b]
      .map(clampByte)
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function rgbToHsl([r, g, b]: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return [0, 0, l];

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d) % 6;
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

export function hslToRgb([h, s, l]: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r1, g1, b1] = [0, 0, 0];
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/** מערבב שני צבעי hex — ratio הוא משקל הצבע השני (0 = רק הראשון, 1 = רק השני) */
export function mix(hexA: string, hexB: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return rgbToHex([
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio,
  ]);
}

/**
 * גוון hover אדפטיבי: לצבעים בהירים/בינוניים מכהה מעט, לצבעים כהים
 * (למשל מותג "שחור") דווקא מבהיר — אחרת ה-hover על primary כהה מאוד
 * היה יוצא זהה ל-primary עצמו (clamp ב-0).
 */
export function primaryHoverColor(hex: string): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const newL = l < 0.35 ? Math.min(1, l + 0.1) : Math.max(0, l - 0.08);
  return rgbToHex(hslToRgb([h, s, newL]));
}

/** רקע "רך" — הצבע מעורבב בעדינות לתוך משטח (לצ'יפים/תגיות/הדגשות עדינות) */
export function softTint(colorHex: string, surfaceHex: string, ratio = 0.12): string {
  return mix(surfaceHex, colorHex, ratio);
}

function srgbChannelToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** בהירות יחסית לפי נוסחת WCAG */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** יחס ניגודיות WCAG בין שני צבעים (1 עד 21) */
export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * בוחר טקסט קריא (בהיר/כהה) על גבי רקע נתון, לפי מי מהשניים נותן ניגודיות
 * גבוהה יותר — כך שגם צבע מותג לא-שגרתי (למשל צהוב בהיר מאוד) מקבל טקסט
 * קריא אוטומטית, בלי להניח "תמיד לבן".
 */
export function pickAccessibleTextColor(
  backgroundHex: string,
  lightOption = "#FFFFFF",
  darkOption = "#14161A"
): string {
  const contrastWithLight = contrastRatio(backgroundHex, lightOption);
  const contrastWithDark = contrastRatio(backgroundHex, darkOption);
  return contrastWithLight >= contrastWithDark ? lightOption : darkOption;
}
