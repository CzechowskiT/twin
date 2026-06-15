"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  RECRUITER_TALENT_RADAR_DIGEST_MARKERS,
  type DigestCandidate,
  type DismissPattern,
  type LowCoverageRole,
} from "@/lib/recruiter-talent-radar-digest";
import { RECRUITER_TALENT_RADAR_ROUTE } from "@/lib/recruiter-talent-radar";

type SectionProps =
  | {
      kind: "candidates";
      titleKey: TranslationKey;
      emptyKey: TranslationKey;
      items: DigestCandidate[];
      showNotSent?: boolean;
    }
  | {
      kind: "dismissed";
      titleKey: TranslationKey;
      emptyKey: TranslationKey;
      items: DismissPattern[];
    }
  | {
      kind: "roles";
      titleKey: TranslationKey;
      emptyKey: TranslationKey;
      items: LowCoverageRole[];
    };

function CandidateRow({ row, showNotSent }: { row: DigestCandidate; showNotSent?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] p-3"
      data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.candidateCard}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{row.displayName}</p>
          {row.roleTitle ? (
            <p className="text-xs text-[var(--twin-muted-strong)]">{row.roleTitle}</p>
          ) : null}
        </div>
        {row.fitLabel ? (
          <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {row.fitLabel}
          </span>
        ) : null}
      </div>
      {row.whyNow && row.whyNow.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">{row.whyNow[0]}</p>
      ) : null}
      {showNotSent ? (
        <p className="mt-2 text-xs font-medium text-amber-400/90">{t("recruiterTalentRadarDigest.draftNotSent")}</p>
      ) : null}
      <Link
        href={RECRUITER_TALENT_RADAR_ROUTE}
        className="mt-2 inline-block text-xs font-medium text-[var(--twin-accent)] underline"
      >
        {t("recruiterTalentRadarDigest.openInRadar")}
      </Link>
    </div>
  );
}

export function TalentRadarDigestSection(props: SectionProps) {
  const { t } = useTranslation();
  const { titleKey, emptyKey } = props;

  return (
    <section
      className="space-y-3"
      data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.section}
    >
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{t(titleKey)}</h2>
      {props.kind === "candidates" && props.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--twin-border)] p-4 text-sm text-[var(--twin-muted-strong)]">
          {t(emptyKey)}
        </p>
      ) : null}
      {props.kind === "candidates"
        ? props.items.map((row) => (
            <CandidateRow key={row.candidateId} row={row} showNotSent={props.showNotSent} />
          ))
        : null}
      {props.kind === "dismissed" ? (
        props.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--twin-border)] p-4 text-sm text-[var(--twin-muted-strong)]">
            {t(emptyKey)}
          </p>
        ) : (
          <ul className="space-y-2">
            {props.items.map((p) => (
              <li
                key={p.reasonCode}
                className="flex items-center justify-between rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--foreground)]">{p.label}</span>
                <span className="tabular-nums font-semibold text-[var(--twin-muted-strong)]">{p.count}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {props.kind === "roles" ? (
        props.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--twin-border)] p-4 text-sm text-[var(--twin-muted-strong)]">
            {t(emptyKey)}
          </p>
        ) : (
          <ul className="space-y-2">
            {props.items.map((role) => (
              <li
                key={role.jobId}
                className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] p-3 text-sm"
              >
                <p className="font-semibold text-[var(--foreground)]">{role.roleTitle}</p>
                <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                  {role.candidateCount} · {role.coverageWarning}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
