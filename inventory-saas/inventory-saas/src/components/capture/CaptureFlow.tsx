"use client";

import { useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import {
  captureProductAction,
  confirmCaptureAction,
  confirmExpiryDateAction,
  rejectCaptureAction,
  type CaptureActionResult,
  type CaptureCandidate,
} from "@/lib/actions/captures";
import { moveStockAction, type StockMoveActionResult } from "@/lib/actions/stock-move";
import type { CaptureEventType } from "@/lib/data/captures";
import { WASTE_REASONS, type StockMoveKind, type WasteReason } from "@/lib/inventory-types";

type FlowMode = CaptureEventType | "STOCK_MOVE";
type StockMoveTarget = Exclude<StockMoveKind, "WASTE">;

const STOCK_MOVE_TARGETS: StockMoveTarget[] = ["TO_SHELF", "TO_FREEZER", "FREEZER_TO_SHELF"];

/**
 * מסך "צלם מוצר" — הליבה של Phase 2, מורחב עם "תנועות מלאי חלקיות" (ראו
 * ARCHITECTURE.md → "תנועות מלאי חלקיות וסיבת זריקה"). שלושה טאבים: הגעה
 * (צילום+כמות), זריקה (צילום+כמות+סיבה — יכולה להיות חלקית), ועדכון כמות
 * בלי צילום (העברה למדף/למקפיא/מהמקפיא למדף). ראו src/lib/actions/captures.ts
 * ו-src/lib/actions/stock-move.ts.
 */
export function CaptureFlow({
  branchId,
  products,
}: {
  branchId: string;
  products: { id: string; nameHe: string; nameEn: string }[];
}) {
  const t = useTranslations("capture");
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<FlowMode>("ARRIVAL");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [wasteReason, setWasteReason] = useState<WasteReason | "">("");
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureActionResult | null>(null);
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [expiryDateInput, setExpiryDateInput] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [stockMoveProductId, setStockMoveProductId] = useState("");
  const [stockMoveTarget, setStockMoveTarget] = useState<StockMoveTarget>("TO_SHELF");
  const [stockMoveQuantity, setStockMoveQuantity] = useState("");
  const [stockMoveResult, setStockMoveResult] = useState<StockMoveActionResult | null>(null);
  const [isStockMovePending, startStockMoveTransition] = useTransition();

  const productName = (p: { nameHe: string; nameEn: string }) =>
    locale === "he" ? p.nameHe : p.nameEn;

  function reset() {
    setPhotoFile(null);
    setPhotoPreview(null);
    setQuantity("");
    setWasteReason("");
    setFormError(null);
    setResult(null);
    setShowFullCatalog(false);
    setExpiryDateInput(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyResult(res: CaptureActionResult) {
    setResult(res);
    setExpiryDateInput(res.kind === "pending_date_review" ? res.detectedExpiryDate : null);
  }

  function switchMode(next: FlowMode) {
    setMode(next);
    reset();
    setStockMoveResult(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function errorText(message: string): string {
    if (message === "missing_photo") return t("missingPhoto");
    if (message === "missing_quantity") return t("missingQuantity");
    if (message === "missing_waste_reason") return t("missingWasteReason");
    if (message === "invalid_date") return t("invalidDate");
    return t("genericError");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (mode !== "ARRIVAL" && mode !== "DISPOSAL") return;

    if (!photoFile) {
      setFormError(t("missingPhoto"));
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setFormError(t("missingQuantity"));
      return;
    }
    if (mode === "DISPOSAL" && !wasteReason) {
      setFormError(t("missingWasteReason"));
      return;
    }

    const formData = new FormData();
    formData.set("photo", photoFile);
    formData.set("quantity", quantity);
    if (mode === "DISPOSAL") formData.set("wasteReason", wasteReason);

    startTransition(async () => {
      const res = await captureProductAction(branchId, mode, formData);
      applyResult(res);
    });
  }

  function handleConfirm(candidate: { productId: string }) {
    if (!result || result.kind !== "pending_review") return;
    const captureId = result.captureId;
    startTransition(async () => {
      const res = await confirmCaptureAction(captureId, candidate.productId, null);
      applyResult(res);
    });
  }

  function handleConfirmDate() {
    if (!result || result.kind !== "pending_date_review" || !expiryDateInput) return;
    const captureId = result.captureId;
    startTransition(async () => {
      const res = await confirmExpiryDateAction(captureId, expiryDateInput, null);
      applyResult(res);
    });
  }

  function handleReject() {
    if (!result || (result.kind !== "pending_review" && result.kind !== "pending_date_review")) return;
    const captureId = result.captureId;
    startTransition(async () => {
      await rejectCaptureAction(captureId);
      reset();
    });
  }

  function handleStockMoveSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStockMoveResult(null);
    if (!stockMoveProductId) {
      setStockMoveResult({ kind: "error", message: "unknown_product" });
      return;
    }
    if (!stockMoveQuantity || Number(stockMoveQuantity) <= 0) {
      setStockMoveResult({ kind: "error", message: "missing_quantity" });
      return;
    }
    startStockMoveTransition(async () => {
      const res = await moveStockAction(
        branchId,
        stockMoveProductId,
        stockMoveTarget,
        Number(stockMoveQuantity)
      );
      setStockMoveResult(res);
      if (res.kind === "done" && res.unallocated === 0) {
        setStockMoveQuantity("");
      }
    });
  }

  function stockMoveErrorText(message: string): string {
    if (message === "missing_quantity") return t("missingQuantity");
    if (message === "unknown_product") return t("stockMove.selectProduct");
    if (message === "not_authorized" || message === "not_authenticated") return t("genericError");
    return t("genericError");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div className="flex gap-2 rounded-xl bg-black/5 p-1">
        <TabButton active={mode === "ARRIVAL"} onClick={() => switchMode("ARRIVAL")}>
          {t("arrivalTab")}
        </TabButton>
        <TabButton active={mode === "DISPOSAL"} onClick={() => switchMode("DISPOSAL")}>
          {t("disposalTab")}
        </TabButton>
        <TabButton active={mode === "STOCK_MOVE"} onClick={() => switchMode("STOCK_MOVE")}>
          {t("stockMoveTab")}
        </TabButton>
      </div>

      {mode === "STOCK_MOVE" && (
        <form
          onSubmit={handleStockMoveSubmit}
          className="flex flex-col gap-4 rounded-xl bg-brand-surface p-5 shadow-sm"
        >
          <p className="text-xs text-brand-text/60">{t("stockMove.hint")}</p>

          <div className="flex flex-col gap-1">
            <label htmlFor="stock-move-product" className="text-sm font-medium text-brand-text/80">
              {t("stockMove.product")}
            </label>
            <select
              id="stock-move-product"
              value={stockMoveProductId}
              onChange={(e) => setStockMoveProductId(e.target.value)}
              className="rounded-lg border border-black/10 px-3 py-2 text-start"
            >
              <option value="">{t("stockMove.selectProduct")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {productName(p)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-text/80">{t("stockMove.target")}</label>
            <div className="flex flex-col gap-2">
              {STOCK_MOVE_TARGETS.map((target) => (
                <label
                  key={target}
                  className={clsx(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    stockMoveTarget === target
                      ? "border-brand-primary bg-brand-primary/5"
                      : "border-black/10"
                  )}
                >
                  <input
                    type="radio"
                    name="stock-move-target"
                    checked={stockMoveTarget === target}
                    onChange={() => setStockMoveTarget(target)}
                  />
                  {t(`stockMove.target${target}`)}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="stock-move-quantity" className="text-sm font-medium text-brand-text/80">
              {t("quantity")}
            </label>
            <input
              id="stock-move-quantity"
              type="number"
              min={1}
              inputMode="numeric"
              value={stockMoveQuantity}
              onChange={(e) => setStockMoveQuantity(e.target.value)}
              className="rounded-lg border border-black/10 px-3 py-2 text-start"
            />
          </div>

          {stockMoveResult?.kind === "error" && (
            <p className="text-sm text-brand-danger">{stockMoveErrorText(stockMoveResult.message)}</p>
          )}
          {stockMoveResult?.kind === "done" && (
            <p
              className={clsx(
                "text-sm font-medium",
                stockMoveResult.unallocated > 0 ? "text-brand-warning" : "text-brand-success"
              )}
            >
              {stockMoveResult.unallocated > 0
                ? t("stockMove.partialSuccess", {
                    allocated: stockMoveResult.allocatedTotal,
                    missing: stockMoveResult.unallocated,
                  })
                : t("stockMove.success", { quantity: stockMoveResult.allocatedTotal })}
            </p>
          )}

          <button
            type="submit"
            disabled={isStockMovePending}
            className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isStockMovePending ? t("submitting") : t("stockMove.submit")}
          </button>
        </form>
      )}

      {(mode === "ARRIVAL" || mode === "DISPOSAL") && !result && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl bg-brand-surface p-5 shadow-sm">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-primary/30 bg-brand-background p-6 text-center">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className="max-h-56 rounded-lg object-contain" />
            ) : (
              <span className="text-sm text-brand-text/70">{t("takePhoto")}</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />
            {photoPreview && (
              <span className="text-xs font-medium text-brand-primary">{t("retake")}</span>
            )}
          </label>

          <div className="flex flex-col gap-1">
            <label htmlFor="quantity" className="text-sm font-medium text-brand-text/80">
              {mode === "ARRIVAL" ? t("quantity") : t("disposalQuantity")}
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder={mode === "ARRIVAL" ? t("quantityPlaceholder") : t("disposalQuantityPlaceholder")}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-lg border border-black/10 px-3 py-2 text-start"
            />
          </div>

          {mode === "DISPOSAL" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="waste-reason" className="text-sm font-medium text-brand-text/80">
                {t("wasteReasonLabel")}
              </label>
              <select
                id="waste-reason"
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value as WasteReason | "")}
                className="rounded-lg border border-black/10 px-3 py-2 text-start"
              >
                <option value="">{t("wasteReasonSelect")}</option>
                {WASTE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {t(`wasteReason.${reason}`)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formError && <p className="text-sm text-brand-danger">{formError}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? t("submitting") : t("submit")}
          </button>
        </form>
      )}

      {result?.kind === "error" && (
        <ResultCard tone="danger">
          <p>{errorText(result.message)}</p>
          <button onClick={reset} className="mt-3 text-sm font-medium underline">
            {t("another")}
          </button>
        </ResultCard>
      )}

      {result?.kind === "auto_confirmed" && (
        <ResultCard tone="success">
          <p>
            {result.eventType === "ARRIVAL"
              ? t("autoConfirmedArrival", { name: productName(result), quantity: result.quantity })
              : t("autoConfirmedDisposal", { name: productName(result), quantity: result.quantity })}
          </p>
          {result.eventType === "DISPOSAL" && !result.batchFound && (
            <p className="mt-1 text-xs opacity-80">{t("disposalNoBatch")}</p>
          )}
          {result.eventType === "DISPOSAL" && !!result.unallocated && result.unallocated > 0 && (
            <p className="mt-1 text-xs opacity-80">
              {t("disposalUnallocated", { count: result.unallocated })}
            </p>
          )}
          <button onClick={reset} className="mt-3 text-sm font-medium underline">
            {t("another")}
          </button>
        </ResultCard>
      )}

      {result?.kind === "pending_review" && (
        <div className="flex flex-col gap-3 rounded-xl bg-brand-surface p-5 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.photoUrl} alt="" className="max-h-40 self-center rounded-lg object-contain" />
          <p className="text-sm font-medium text-brand-text">{t("reviewNeeded")}</p>
          <p className="text-xs text-brand-text/60">{t("reviewHint")}</p>

          <div className="flex flex-col gap-2">
            {result.candidates.map((c) => (
              <CandidateButton
                key={c.productId}
                candidate={c}
                label={productName(c)}
                disabled={isPending}
                onClick={() => handleConfirm(c)}
              />
            ))}
          </div>

          {!showFullCatalog && (
            <button
              type="button"
              onClick={() => setShowFullCatalog(true)}
              className="text-sm font-medium text-brand-primary underline"
            >
              {t("showFullCatalog")}
            </button>
          )}

          {showFullCatalog && (
            <div className="grid grid-cols-2 gap-2">
              {result.allProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleConfirm({ productId: p.id })}
                  className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-60"
                >
                  {productName(p)}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleReject}
            disabled={isPending}
            className="text-sm text-brand-danger underline disabled:opacity-60"
          >
            {isPending ? t("confirming") : t("reject")}
          </button>
        </div>
      )}

      {result?.kind === "pending_date_review" && (
        <div className="flex flex-col gap-3 rounded-xl bg-brand-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-brand-text">
            {t("dateReviewTitle", { name: productName(result) })}
          </p>
          <p className="text-xs text-brand-text/60">{t("dateReviewHint")}</p>
          {result.detectedExpiryRawText && (
            <p className="text-xs text-brand-text/50">
              {t("detectedRawText", { text: result.detectedExpiryRawText })}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="expiry-date" className="text-sm font-medium text-brand-text/80">
              {t("expiryDateLabel")}
            </label>
            <input
              id="expiry-date"
              type="date"
              value={expiryDateInput ?? ""}
              onChange={(e) => setExpiryDateInput(e.target.value)}
              className="rounded-lg border border-black/10 px-3 py-2 text-start"
            />
          </div>

          <button
            type="button"
            onClick={handleConfirmDate}
            disabled={isPending || !expiryDateInput}
            className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? t("confirming") : t("confirmDate")}
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={isPending}
            className="text-sm text-brand-danger underline disabled:opacity-60"
          >
            {t("reject")}
          </button>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
        active ? "bg-brand-primary text-white" : "text-brand-text/70"
      )}
    >
      {children}
    </button>
  );
}

function ResultCard({
  tone,
  children,
}: {
  tone: "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl p-5 text-sm shadow-sm",
        tone === "success" ? "bg-brand-success/10 text-brand-success" : "bg-brand-danger/10 text-brand-danger"
      )}
    >
      {children}
    </div>
  );
}

function CandidateButton({
  candidate,
  label,
  disabled,
  onClick,
}: {
  candidate: CaptureCandidate;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-between rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-4 py-3 text-start text-sm font-medium hover:bg-brand-primary/10 disabled:opacity-60"
    >
      <span>{label}</span>
      <span className="text-xs text-brand-text/50">{Math.round(candidate.confidence * 100)}%</span>
    </button>
  );
}
