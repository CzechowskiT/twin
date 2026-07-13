"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import {
  type RecruiterActivationState,
  recruiterActivationQuery,
} from "@/lib/recruiter-activation-api";
import {
  RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS,
  RECRUITER_ACTIVATION_SHIP_STATUS,
} from "@/lib/seven-day-c-recruiter";
import {
  readRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

type LoadPhase = "idle" | "loading" | "ready" | "empty" | "error";

export function RecruiterActivationPanel() {
  const { t } = useTranslation();
  const [session, setSession] = useState<{ token: string; companySlug: string } | null>(null);
  const [state, setState] = useState<RecruiterActivationState | null>(null);
  const [phase, setPhase] = useState<LoadPhase>("idle");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSession(readRecruiterInboxSession());
  }, []);

  const load = useCallback(async () => {
    if (!session?.token?.trim() || !session.companySlug?.trim()) {
      setPhase("empty");
      setState(null);
      return;
    }
    setPhase("loading");
    setErr(null);
    try {
      const data = await apiFetch<RecruiterActivationState>(
        recruiterActivationQuery(session.token, session.companySlug),
      );
      setState(data);
      setPhase("ready");
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("recruiterActivation.loadError"));
      setPhase("error");
    }
  }, [session, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase === "empty") {
    return (
      <Card
        variant="soft"
        className="mt-6 border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-5 sm:p-6"
        data-recruiter-activation-empty
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("recruiterActivation.eyebrow")}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("recruiterActivation.emptyTitle")}</h2>
        <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("recruiterActivation.emptyLead")}</p>
        <Link href="/recruiter/inbox" className="twin-btn-primary twin-touch-target mt-4 inline-flex">
          {t("recruiterActivation.emptyCta")}
        </Link>
      </Card>
    );
  }

  if (phase === "loading" || phase === "idle") {
    return (
      <Card
        variant="soft"
        className="mt-6 border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-5 sm:p-6"
        data-recruiter-activation-loading
      >
        <p className="twin-muted text-sm">{t("recruiterActivation.loading")}</p>
      </Card>
    );
  }

  if (phase === "error") {
    return (
      <Card
        variant="soft"
        className="mt-6 border-red-500/30 bg-red-500/5 p-5 sm:p-6"
        data-recruiter-activation-error
      >
        <p className="text-sm text-red-200">{err}</p>
        <button type="button" className="twin-btn-secondary mt-3 text-sm" onClick={() => void load()}>
          {t("recruiterActivation.retry")}
        </button>
      </Card>
    );
  }

  if (!state) return null;

  const nextActionKey = state.next_action as TranslationKey;

  return (
    <Card
      variant="soft"
      className="mt-6 border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-5 sm:p-6"
      data-recruiter-activation-panel
      data-recruiter-activation-ship-status={RECRUITER_ACTIVATION_SHIP_STATUS}
      data-recruiter-activation-smoke-status={RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("recruiterActivation.eyebrow")}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("recruiterActivation.title")}</h2>
          <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("recruiterActivation.lead")}</p>
        </div>
        <span
          className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100"
          data-recruiter-activation-pilot-badge
        >
          {t("recruiterActivation.pilotBadge")}
        </span>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-[var(--twin-muted-strong)]">
          {t("recruiterActivation.progressLabel").replace("{pct}", String(state.completion_percent))}
        </p>
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--twin-border)]"
          role="progressbar"
          aria-valuenow={state.completion_percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[var(--twin-accent)] transition-[width] duration-300"
            style={{ width: `${state.completion_percent}%` }}
          />
        </div>
      </div>

      <ul className="mt-5 space-y-2" data-recruiter-activation-steps>
        {state.steps.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-2 text-sm"
            data-recruiter-activation-step={step.id}
            data-recruiter-activation-step-complete={step.completed ? "true" : "false"}
          >
            <span aria-hidden className={step.completed ? "text-emerald-400" : "text-[var(--twin-muted)]"}>
              {step.completed ? "✓" : "○"}
            </span>
            <span className={step.completed ? "text-[var(--foreground)]" : "text-[var(--twin-muted-strong)]"}>
              {t(step.label_key as TranslationKey)}
            </span>
          </li>
        ))}
      </ul>

      {state.activation_complete ? (
        <p className="mt-4 text-sm text-emerald-300" data-recruiter-activation-success>
          {t("recruiterActivation.activationCompleteNote")}
        </p>
      ) : (
        <Link
          href={state.next_action_href}
          className="twin-btn-primary twin-touch-target mt-4 inline-flex"
          data-recruiter-activation-next-action
        >
          {t(nextActionKey)}
        </Link>
      )}

      <p className="twin-muted mt-4 text-xs leading-relaxed">{t("recruiterActivation.pilotBoundary")}</p>
    </Card>
  );
}
