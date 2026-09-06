import { getTranslations } from "next-intl/server";
import { CaptureFlow } from "@/components/capture/CaptureFlow";
import { requireSession } from "@/lib/auth/get-session";
import { getProductsForOrg } from "@/lib/data/products";

export default async function EmployeeCapturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, session] = await Promise.all([getTranslations("capture"), requireSession(locale)]);
  const products = await getProductsForOrg(session.organizationId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-brand-text">{t("title")}</h1>
        <p className="text-sm text-brand-text/60">{t("subtitle")}</p>
      </div>
      <CaptureFlow
        branchId={session.branchId ?? ""}
        products={products.map((p) => ({ id: p.id, nameHe: p.nameHe, nameEn: p.nameEn }))}
      />
    </div>
  );
}
