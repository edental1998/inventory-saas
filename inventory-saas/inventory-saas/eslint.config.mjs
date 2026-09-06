import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16.x מייצא כבר flat config (מערך), אז אין צורך ב-FlatCompat כאן —
// שימוש ב-FlatCompat על מערך שכבר flat גורם לשגיאת "circular structure" בגרסת ESLint הזו.
const eslintConfig = [...nextCoreWebVitals, ...nextTypescript];

export default eslintConfig;
