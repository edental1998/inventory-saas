import { Heebo, Rubik } from "next/font/google";

/**
 * הפונטים בפועל שהמותגים משתמשים בהם (theme.fontFamily ב-BrandTheme).
 * נטענים פעם אחת בשורש (src/app/[locale]/layout.tsx) דרך next/font/google
 * (כולל subset עברי), וחושפים משתני CSS (--font-heebo/--font-rubik)
 * שאליהם ממופה theme-to-css-vars.ts לפי שם הפונט של המותג הפעיל.
 */
export const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

export const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik",
  display: "swap",
});
