"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  CANDIDATE_VISIBILITY_PREFERENCES_MARKERS,
  CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER,
  CANDIDATE_VISIBILITY_PREFERENCE_FIELDS,
  LAUNCH_STANCE,
  loadCandidateVisibilityPreferences,
  resolveCandidateVisibilityPreferences,
  saveCandidateVisibilityPreferences,
  type SafePersistenceSource,
  type VisibilityPreferenceFieldId,
  type VisibilityPreferenceRecord,
} from "@/lib/candidate-visibility-preferences";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import type { TranslationKey } from "@/lib/i18n";

export function CandidateVisibilityPreferencesWorkspace() {
  const { t } = useTranslation();
  const [record, setRecord] = useState<VisibilityPreferenceRecord>(() => resolveCandidateVisibilityPreferences());
  const [source, setSource] = useState<SafePersistenceSource>("demo");
  const [writeStatus, setWriteStatus] = useState<"idle" | "live" | "demo">("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void loadCandidateVisibilityPreferences().then((res) => {
      if (!active) return;
      setRecord(res.record);
      setSource(res.source);
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceKey = source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback";
  const writeKey =
    writeStatus === "live"
      ? "safePersistence.internalWriteLive"
      : writeStatus === "demo"
        ? "safePersistence.internalWriteDemo"
        : null;

  async function onSave(): Promise<void> {
    setSaving(true);
    setWriteStatus("idle");
    const result = await saveCandidateVisibilityPreferences(record);
    if (result.wrote && result.data) {
      setRecord(mapSaved(result.data));
      setSource("live");
      setWriteStatus("live");
    } else {
      setWriteStatus("demo");
    }
    setSaving(false);
  }

  function onFieldChange(id: VisibilityPreferenceFieldId, value: string): void {
    setRecord((prev) => ({ ...prev, [id]: value }));
    setWriteStatus("idle");
  }

  return (
    <Shell wide rail>
      <div
        data-candidate-visibility-preferences-page={CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER}
        data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.page}
        className="mx-auto max-w-4xl space-y-6"
      >
        <header data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("candidateVisibilityPreferences.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("candidateVisibilityPreferences.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("candidateVisibilityPreferences.headerLead")}</p>
          <p className="text-xs text-[var(--twin-muted)]" data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.dataSource}>
            {t(sourceKey)}
          </p>
          <span
            data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.pilotBadge}
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-launch-stance={LAUNCH_STANCE}
          >
            {t("candidateVisibilityPreferences.pilotBadge")}
          </span>
          <Link
            href={candidateControlCenterHref()}
            data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.controlCenterLink}
            className="twin-link block text-xs"
          >
            {t("candidateVisibilityPreferences.linkControlCenter")}
          </Link>
        </header>

        <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
          <div data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.fields}>
            <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
              {t("candidateVisibilityPreferences.fieldsTitle")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {CANDIDATE_VISIBILITY_PREFERENCE_FIELDS.map((field) => (
                <li key={field.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-xs">
                  <span>{t(field.labelKey)}</span>
                  <select
                    className="rounded border bg-transparent px-2 py-1 font-mono text-[var(--twin-muted)]"
                    value={record[field.id]}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    aria-label={t(field.labelKey)}
                  >
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
          <div data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.saveForm}>
            <p className="text-sm">{t("candidateVisibilityPreferences.saveLead")}</p>
            <button
              type="button"
              className="twin-touch-target mt-3 rounded border px-4 py-2 text-xs font-medium disabled:opacity-50"
              onClick={() => void onSave()}
              disabled={saving}
            >
              {t("candidateVisibilityPreferences.saveAction")}
            </button>
            {writeKey ? (
              <p
                className="mt-2 text-xs text-[var(--twin-muted-strong)]"
                data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.writeStatus}
              >
                {t(writeKey)}
              </p>
            ) : null}
          </div>
        </Card>

        <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
          <div data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.persistenceNote}>
            <p className="text-sm">{t("candidateVisibilityPreferences.persistenceLead")}</p>
            <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("candidateVisibilityPreferences.apiNote")}</p>
          </div>
        </Card>

        <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
          <div data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.boundary}>
            <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
              {t("candidateVisibilityPreferences.boundaryTitle")}
            </h2>
            <ul className="mt-3 list-inside list-disc text-xs">
              {(
                [
                  "candidateVisibilityPreferences.boundaryNoExternal",
                  "candidateVisibilityPreferences.boundaryNoEmail",
                  "candidateVisibilityPreferences.boundaryNoAts",
                  "candidateVisibilityPreferences.boundaryHumanReview",
                ] as const
              ).map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

function mapSaved(item: {
  id: number;
  candidate_id: string;
  profile_visibility: string;
  cv_visibility: string;
  match_visibility: string;
  company_visibility: string;
  communication_preference: string;
}): VisibilityPreferenceRecord {
  return {
    id: item.id,
    candidate_id: item.candidate_id,
    profile_visibility: item.profile_visibility,
    cv_visibility: item.cv_visibility,
    match_visibility: item.match_visibility,
    company_visibility: item.company_visibility,
    communication_preference: item.communication_preference,
  };
}
