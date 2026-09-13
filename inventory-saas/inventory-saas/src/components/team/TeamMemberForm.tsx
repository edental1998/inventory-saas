"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  createTeamMemberAction,
  type CreateTeamMemberState,
} from "@/lib/actions/team";

const INITIAL_STATE: CreateTeamMemberState = {};

export function TeamMemberForm({
  branches,
}: {
  branches: { id: string; name: string }[];
}) {
  const t = useTranslations("team");
  const [state, formAction, isPending] = useActionState(
    createTeamMemberAction,
    INITIAL_STATE
  );

  if (state.success) {
    return (
      <div className="rounded-2xl bg-brand-success/10 p-5 text-sm text-brand-success">
        {t("createdSuccess")}
      </div>
    );
  }

  const errorText =
    state.error === "missing_fields"
      ? t("missingFields")
      : state.error === "invalid_role"
        ? t("invalidRole")
        : state.error === "invalid_branch"
          ? t("invalidBranch")
          : state.error === "password_too_short"
            ? t("passwordTooShort")
            : state.error === "email_taken"
              ? t("emailTaken")
              : state.error === "forbidden"
                ? t("forbidden")
                : null;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="name"
        required
        placeholder={t("name")}
        className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40"
      />
      <input
        name="email"
        type="email"
        required
        placeholder={t("email")}
        className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40"
      />
      <select
        name="role"
        required
        defaultValue="EMPLOYEE"
        className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-brand-text"
      >
        <option value="EMPLOYEE">{t("roleEmployee")}</option>
        <option value="BRANCH_MANAGER">{t("roleBranchManager")}</option>
      </select>
      <select
        name="branchId"
        required
        defaultValue=""
        className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-brand-text"
      >
        <option value="" disabled>
          {t("selectBranch")}
        </option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder={t("tempPassword")}
        className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-brand-text placeholder:text-brand-text/40"
      />

      {errorText ? <p className="text-sm text-brand-danger">{errorText}</p> : null}

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
