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
  );
}
