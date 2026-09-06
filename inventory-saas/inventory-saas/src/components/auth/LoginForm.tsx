"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  loginAction,
  type LoginActionState,
} from "@/lib/auth/actions";

const INITIAL_STATE: LoginActionState = {};

export function LoginForm({
  locale,
  defaultEmail,
}: {
  locale: string;
  defaultEmail?: string;
}) {
  const t = useTranslations("login");
  const boundAction = loginAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    INITIAL_STATE
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={defaultEmail}
          placeholder={t("email")}
          className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40"
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder={t("password")}
          className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40"
        />

        {state.error ? (
          <p className="text-sm text-brand-danger">
            {state.error === "missing_fields"
              ? t("missingFields")
              : t("invalidCredentials")}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-brand-on-primary disabled:opacity-60"
        >
          {isPending ? t("submitting") : t("submit")}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-brand-text/40">
        <div className="h-px flex-1 bg-black/10" />
        {t("orDivider")}
        <div className="h-px flex-1 bg-black/10" />
      </div>

      <a
        href={`/api/auth/google?intent=login&locale=${encodeURIComponent(locale)}`}
        className="flex items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-brand-text hover:bg-black/5"
      >
        <GoogleIcon />
        {t("continueWithGoogle")}
      </a>

      <p className="text-center text-sm text-brand-text/60">
        {t("noAccount")}{" "}
        <a
          href={`/${locale}/signup`}
          className="font-medium text-brand-primary underline"
        >
          {t("signupLink")}
        </a>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.3v-3.1H1.27A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.27 5.4l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.6l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
