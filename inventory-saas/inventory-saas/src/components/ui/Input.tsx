import { clsx } from "clsx";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

const fieldBase =
  "w-full rounded-lg border bg-brand-surface px-3 py-2 text-sm text-brand-text transition-colors placeholder:text-brand-text-muted focus:outline-none";

function fieldBorder(error?: boolean) {
  return error
    ? "border-danger focus:border-danger"
    : "border-brand-border focus:border-brand-primary";
}

export function Input({
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input className={clsx(fieldBase, fieldBorder(error), className)} {...props} />
  );
}

export function Textarea({
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea className={clsx(fieldBase, fieldBorder(error), className)} {...props} />
  );
}

export function Select({
  error,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <div className="relative">
      <select
        className={clsx(fieldBase, fieldBorder(error), "appearance-none pe-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted"
      />
    </div>
  );
}
