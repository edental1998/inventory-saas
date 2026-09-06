import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // בפרודקשן: להוסיף כאן את הדומיין של שירות אחסון האובייקטים (למשל R2/S3)
    // ששם יאוחסנו לוגואים, תמונות רקע ותמונות מוצרים.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default withNextIntl(nextConfig);
