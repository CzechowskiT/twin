"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type {
  VerifiedReadinessGate,
  VerifiedReadinessLoadState,
} from "@/hooks/dashboard/use-dashboard-verified-readiness";
import type { TranslationKey } from "@/lib/i18n";
import { CANDIDATE_READINESS_COMPLETION_ROUTES } from "@/lib/candidate-readiness-working-flow";

const CHECKLIST_KEYS = [
  "profile_present",
  "cv_present",
  "career_brief_present",
  "skill_evidence_present",
  "consent_general_present",
  "consent_storage_present",
] as const;

type ChecklistKey = (typeof CHECKLIST_KEYS)[number];

const MISSING_ITEM_HREF: Record<string, string> = CANDIDATE_READINESS_COMPLETION_ROUTES;

const STATUS_KEYS: Record<string, TranslationKey> = {
  unverified: "verifiedReadiness.statusUnverified",
  profile_incomplete: "verifiedReadiness.statusProfileIncomplete",
  consent_missing: "verifiedReadiness.statusConsentMissing",
  cv_missing: "verifiedReadiness.statusCvMissing",
  career_brief_missing: "verifiedReadiness.statusCareerBriefMissing",
  skill_evidence_missing: "verifiedReadiness.statusSkillEvidenceMissing",
  ready_for_review: "verifiedReadiness.statusReadyForReview",
  verified_basic: "verifiedReadiness.statusVerifiedBasic",
  delegated_apply_enabled: "verifiedReadiness.statusDelegatedApplyEnabled",
  suspended: "verifiedReadiness.statusSuspended",
};

function checklistLabelKey(key: ChecklistKey): TranslationKey {
  const map: Record<ChecklistKey, TranslationKey> = {
    profile_present: "verifiedReadiness.checkProfile",
    cv_present: "verifiedReadiness.checkCv",
    career_brief_present: "verifiedReadiness.checkCareerBrief",
    skill_evidence_present: "verifiedReadiness.checkSkillEvidence",
    consent_general_present: "verifiedReadiness.checkConsentGeneral",
    consent_storage_present: "verifiedReadiness.checkConsentStorage",
  };
  return map[key];
}

function missingItemLabelKey(item: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    profile: "verifiedReadiness.missingProfile",
    consent_general: "verifiedReadiness.missingConsentGeneral",
    consent_storage: "verifiedReadiness.missingConsentStorage",
    cv: "verifiedReadiness.missingCv",
    career_brief: "verifiedReadiness.missingCareerBrief",
    skill_evidence: "verifiedReadiness.missingSkillEvidence",
  };
  return map[item] ?? "verifiedReadiness.missingGeneric";
}

function blockedReasonLabelKey(reason: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    missing_required_consent: "verifiedReadiness.blockMissingRequiredConsent",
    missing_storage_consent: "verifiedReadiness.blockMissingStorageConsent",
    missing_cv_material: "verifiedReadiness.blockMissingCvMaterial",
    missing_career_brief: "verifiedReadiness.blockMissingCareerBrief",
  };
  return map[reason] ?? "verifiedReadiness.blockGeneric";
}

function statusLabel(t: (key: TranslationKey) => string, status: string): string {
  const key = STATUS_KEYS[status];
  return key ? t(key) : t("verifiedReadiness.statusUnknown").replace("{status}", status);
}

function ReadinessBody({ gate }: { gate: VerifiedReadinessGate }) {
  const { t } = useTranslation();

  const checklist = gate.checklist;
  const delegatedBlocked =
    !gate.delegated_apply_allowed && !gate.can_submit_delegated_application;

  const missingWithLinks = useMemo(
    () =>
      gate.missing_items.filter((item) => MISSING_ITEM_HREF[item]),
    [gate.missing_items],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="twin-muted">{t("verifiedReadiness.statusLabel")}: </span>
        <strong>{statusLabel(t, gate.verification_status)}</strong>
      </p>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
          {t("verifiedReadiness.checklistTitle")}
        </p>
        <ul className="space-y-1.5 text-sm">
          {CHECKLIST_KEYS.map((key) => {
            const done = checklist[key];
            return (
              <li key={key} className="flex items-start gap-2">
                <span
                  className={
                    done
                      ? "text-[var(--twin-accent)]"
                      : "text-[var(--twin-muted-strong)]"
                  }
                  aria-hidden
                >
                  {done ? "✓" : "○"}
                </span>
                <span className={done ? "" : "text-[var(--foreground)]"}>
                  {t(checklistLabelKey(key))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {missingWithLinks.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("verifiedReadiness.missingTitle")}
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {missingWithLinks.map((item) => (
              <li key={item}>
                <Link href={MISSING_ITEM_HREF[item]} className="twin-link">
                  {t(missingItemLabelKey(item))}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {gate.blocked_reasons.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--twin-muted-strong)]">
          {gate.blocked_reasons.map((reason) => (
            <li key={reason}>{t(blockedReasonLabelKey(reason))}</li>
          ))}
        </ul>
      ) : null}

      {gate.can_prepare_application_package ? (
        <p className="text-xs text-[var(--twin-muted-strong)]">
          {t("verifiedReadiness.preparePackageNote")}
        </p>
      ) : null}

      {delegatedBlocked ? (
        <p className="rounded-md border border-[var(--twin-border)] bg-[var(--twin-surface-muted)]/40 px-3 py-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
          {t("verifiedReadiness.delegatedBlocked")}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-[var(--twin-muted-strong)]">
        {t("verifiedReadiness.disclaimer")}
      </p>
    </div>
  );
}

type CardProps = {
  gate: VerifiedReadinessGate | null;
  loadState: VerifiedReadinessLoadState;
};

/** Read-only readiness checklist — no apply/submit actions. */
export function DashboardVerifiedReadinessCard({ gate, loadState }: CardProps) {
  const { t } = useTranslation();

  if (loadState === "idle" || loadState === "loading") return null;

  if (loadState === "failed") {
    return (
      <section
        className="mb-4 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-muted)]/30 px-4 py-3 sm:mb-6"
        aria-live="polite"
      >
        <p className="text-xs text-[var(--twin-muted-strong)]">{t("verifiedReadiness.loadFailed")}</p>
      </section>
    );
  }

  if (!gate) return null;

  return (
    <Card id="dashboard-readiness" className="mb-4 space-y-2 p-4 sm:mb-6 scroll-mt-24">
      <div>
        <h2 id="verified-readiness-heading" className="text-base font-semibold">
          {t("verifiedReadiness.title")}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          {t("verifiedReadiness.lead")}
        </p>
      </div>
      <ReadinessBody gate={gate} />
    </Card>
  );
}
