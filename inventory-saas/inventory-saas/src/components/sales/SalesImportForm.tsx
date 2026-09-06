"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  importSalesCsvAction,
  type SalesImportActionResult,
} from "@/lib/actions/sales-import";

/**
 * טופס ייבוא מכירות מ-CSV — ראו ARCHITECTURE.md → "תכנון Phase 3".
 * זהו הפתרון המעשי ל"חיבור קופה" כל עוד אין מערכת קופה קבועה: אותה נקודת
 * כניסה (branch_id + formData) תוכל בעתיד לקבל מתאם API אמיתי במקום CSV,
 * בלי שהמסך הזה או שאר המערכת ישתנו.
 */
export function SalesImportForm({ branchId }: { branchId: string }) {
  const t = useTranslations("sales");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<SalesImportActionResult | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reasonText(reason: string): string {
    const [key, extra] = reason.split(":");
    switch (key) {
      case "unknown_product":
        return t("reason.unknown_product", { name: extra ?? "" });
      case "missing_headers":
        return `${t("reason.missing_headers")} (${extra ?? ""})`;
      case "empty_file":
        return t("reason.empty_file");
      case "missing_product":
        return t("reason.missing_product");
      case "invalid_date":
        return t("reason.invalid_date");
      case "invalid_quantity":
        return t("reason.invalid_quantity");
      case "invalid_revenue":
        return t("reason.invalid_revenue");
      default:
        return reason;
    }
  }

  function errorText(message: string): string {
    switch (message) {
      case "not_authenticated":
        return t("error.not_authenticated");
      case "not_authorized":
        return t("error.not_authorized");
      case "unknown_branch":
        return t("error.unknown_branch");
      case "missing_file":
        return t("error.missing_file");
      default:
        return message;
    }
  }

  function handleSubmit(formData: FormData) {
    if (!formData.get("file") || (formData.get("file") as File).size === 0) {
      setResult({ kind: "error", message: "missing_file" });
      return;
    }
    startTransition(async () => {
      const res = await importSalesCsvAction(branchId, formData);
      setResult(res);
      setShowSkipped(false);
      if (res.kind === "done") {
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  return (
    <div className="rounded-2xl bg-brand-surface p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold text-brand-text">{t("importTitle")}</h2>
      <p className="mt-1 text-sm text-brand-text/60">{t("importHint")}</p>
      <p className="mt-2 rounded-lg bg-brand-primary/5 p-3 text-xs text-brand-text/70">
        {t("posNote")}
      </p>

      <form action={handleSubmit} className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="hidden"
          id="sales-csv-file"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <label
          htmlFor="sales-csv-file"
          className="cursor-pointer rounded-full bg-black/5 px-4 py-2 text-sm font-medium text-brand-text/80 hover:bg-black/10"
        >
          {t("chooseFile")}
        </label>
        <span className="text-sm text-brand-text/50">
          {fileName ?? t("noFileChosen")}
        </span>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? t("importing") : t("import")}
        </button>
      </form>

      {result?.kind === "error" ? (
        <p className="mt-3 text-sm text-brand-danger">{errorText(result.message)}</p>
      ) : null}

      {result?.kind === "done" ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm font-medium text-brand-success">
            {result.summary.skipped.length > 0
              ? t("importDoneWithSkipped", {
                  imported: result.summary.imported,
                  skipped: result.summary.skipped.length,
                })
              : t("importDone", { imported: result.summary.imported })}
          </p>
          {result.summary.skipped.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setShowSkipped((v) => !v)}
                className="text-xs font-medium text-brand-primary underline"
              >
                {t("viewSkipped")}
              </button>
              {showSkipped ? (
                <ul className="mt-2 flex flex-col gap-1 text-xs text-brand-text/60">
                  {result.summary.skipped.map((s, i) => (
                    <li key={i}>
                      {t("row", { row: s.rowNumber })}: {reasonText(s.reason)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
