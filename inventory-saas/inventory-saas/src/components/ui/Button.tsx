import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary text-brand-on-primary hover:bg-brand-primary-hover",
  secondary: "bg-brand-primary-soft text-brand-primary hover:bg-brand-primary-soft/70",
  ghost: "text-brand-text hover:bg-black/5",
  destructive: "bg-danger text-white hover:bg-danger/90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
};

/**
 * מחזיר מחרוזת className זהה לזו ש-Button משתמש בה — כדי ש-<Link> (שאי אפשר
 * להפוך ל-Button ישירות) ייראה בדיוק אותו דבר בלי רכיב polymorphic נפרד.
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string
): string {
  return clsx(baseClasses, variantClasses[variant], sizeClasses[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
