/**
 * טיפוס תבנית העיצוב של מותג/רשת.
 * זהו החוזה היחיד שכל רכיב עיצוב במערכת תלוי בו — כדי להוסיף רשת חדשה
 * לא צריך לגעת ברכיבי React בכלל, אלא רק ליצור אובייקט חדש מהטיפוס הזה
 * (ובעתיד: רשומה חדשה בטבלת BrandTheme דרך מסך ניהול).
 */
export interface BrandTheme {
  /** מזהה ייחודי קצר של הארגון, משמש גם לניתוב/תת-דומיין */
  slug: string;
  /** שם התצוגה של הרשת */
  displayName: string;

  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    onPrimary: string;
    success: string;
    warning: string;
    danger: string;
  };

  logo: {
    light: string;
    dark: string;
  };

  backgroundImage: {
    /** רקע למסך ההתחברות */
    login?: string;
    /** רקע עדין ברקע הדשבורדים (למשל טקסטורת עץ/קמח בעדינות) */
    dashboard?: string;
  };

  fontFamily: string;
}

/** רשימת שדות ה-CSS variables שמוזרקים בפועל לדף — ראו theme-to-css-vars.ts */
export const THEME_CSS_VAR_PREFIX = "--brand";
