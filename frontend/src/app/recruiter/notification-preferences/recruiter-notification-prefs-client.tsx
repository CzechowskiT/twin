"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { readRecruiterInboxSession } from "@/lib/recruiter-inbox";
import {
  type RecruiterNotificationPrefs,
  recruiterNotificationPrefsQuery,
  recruiterNotificationPrefsResetQuery,
} from "@/lib/recruiter-notification-prefs-api";
import {
  RECRUITER_C3_BROWSER_SMOKE_STATUS,
  RECRUITER_NOTIFICATION_PREFS_MARKERS,
  RECRUITER_NOTIFICATION_PREFS_SHIP_STATUS,
} from "@/lib/seven-day-c3-recruiter";

type PrefsKey = keyof Pick<
  RecruiterNotificationPrefs,
  "in_app_inbox_digest" | "in_app_interview_reminder" | "in_app_trust_review_alert" | "in_app_pipeline_update"
>;

const TOGGLE_KEYS: PrefsKey[] = [
  "in_app_inbox_digest",
  "in_app_interview_reminder",
  "in_app_trust_review_alert",
  "in_app_pipeline_update",
];

export function RecruiterNotificationPrefsClient() {
  const { t } = useTranslation();
  const [session, setSession] = useState<{ token: string; companySlug: string } | null>(null);
  const [prefs, setPrefs] = useState<RecruiterNotificationPrefs | null>(null);
  const [draft, setDraft] = useState<Partial<RecruiterNotificationPrefs>>({});
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSession(readRecruiterInboxSession());
  }, []);

  const load = useCallback(async () => {
    if (!session?.token?.trim() || !session.companySlug?.trim()) {
      setPhase("empty");
      return;
    }
    setPhase("loading");
    setErr(null);
    try {
      const data = await apiFetch<RecruiterNotificationPrefs>(
        recruiterNotificationPrefsQuery(session.token, session.companySlug),
      );
      setPrefs(data);
      setDraft({});
      setPhase("ready");
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("recruiterNotificationPrefs.loadError"));
      setPhase("error");
    }
  }, [session, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = (key: PrefsKey): boolean => {
    if (key in draft) return Boolean(draft[key]);
    return Boolean(prefs?.[key]);
  };

  const toggle = (key: PrefsKey) => {
    setDraft((d) => ({ ...d, [key]: !current(key) }));
  };

  const save = async () => {
    if (!session || Object.keys(draft).length === 0) return;
    setSaving(true);
    setErr(null);
    try {
      const data = await apiFetch<RecruiterNotificationPrefs>(
        recruiterNotificationPrefsQuery(session.token, session.companySlug),
        { method: "PATCH", body: JSON.stringify(draft) },
      );
      setPrefs(data);
      setDraft({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("recruiterNotificationPrefs.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!session) return;
    setSaving(true);
    setErr(null);
    try {
      const data = await apiFetch<RecruiterNotificationPrefs>(
        recruiterNotificationPrefsResetQuery(session.token, session.companySlug),
        { method: "POST" },
      );
      setPrefs(data);
      setDraft({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("recruiterNotificationPrefs.resetError"));
    } finally {
      setSaving(false);
    }
  };

  if (phase === "empty") {
    return (
      <Card variant="soft" className="mx-auto max-w-2xl p-6" data-recruiter-notification-prefs-empty>
        <p className="text-sm text-[var(--twin-muted-strong)]">{t("recruiterNotificationPrefs.emptyLead")}</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8" data-testid={RECRUITER_NOTIFICATION_PREFS_MARKERS.panel}>
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("recruiterNotificationPrefs.eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{t("recruiterNotificationPrefs.title")}</h1>
        <p className="twin-muted mt-2 text-sm leading-relaxed">{t("recruiterNotificationPrefs.lead")}</p>
        <p className="mt-2 text-xs text-[var(--twin-muted-strong)]" role="status">
          {t("recruiterNotificationPrefs.pilotBadge")} · {RECRUITER_NOTIFICATION_PREFS_SHIP_STATUS} ·{" "}
          {RECRUITER_C3_BROWSER_SMOKE_STATUS}
        </p>
      </header>

      {phase === "loading" && <p className="text-sm text-[var(--twin-muted-strong)]">{t("common.loading")}</p>}
      {err && (
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      )}

      {phase === "ready" && (
        <Card variant="soft" className="space-y-4 p-5">
          <ul className="space-y-4" aria-label={t("recruiterNotificationPrefs.toggleListAria")}>
            {TOGGLE_KEYS.map((key) => (
              <li key={key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {t(`recruiterNotificationPrefs.${key}Label` as const)}
                  </p>
                  <p className="text-xs text-[var(--twin-muted-strong)]">
                    {t(`recruiterNotificationPrefs.${key}Hint` as const)}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={current(key)}
                  aria-label={t(`recruiterNotificationPrefs.${key}Label` as const)}
                  className={`twin-touch-target h-8 w-14 shrink-0 rounded-full border transition ${
                    current(key)
                      ? "border-[var(--twin-accent)] bg-[var(--twin-accent)]"
                      : "border-[var(--twin-border)] bg-[var(--twin-surface-2)]"
                  }`}
                  onClick={() => toggle(key)}
                />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              className="twin-btn-primary twin-touch-target"
              disabled={saving || Object.keys(draft).length === 0}
              data-testid={RECRUITER_NOTIFICATION_PREFS_MARKERS.save}
              onClick={() => void save()}
            >
              {t("recruiterNotificationPrefs.saveCta")}
            </button>
            <button
              type="button"
              className="twin-btn-secondary twin-touch-target"
              disabled={saving}
              data-testid={RECRUITER_NOTIFICATION_PREFS_MARKERS.reset}
              onClick={() => void reset()}
            >
              {t("recruiterNotificationPrefs.resetCta")}
            </button>
          </div>
          <p className="text-xs text-[var(--twin-muted-strong)]">{t("recruiterNotificationPrefs.inAppOnlyNote")}</p>
        </Card>
      )}
    </div>
  );
}
