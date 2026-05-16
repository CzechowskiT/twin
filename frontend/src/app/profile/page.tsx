"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch, apiUpload } from "@/lib/api";
import { getToken } from "@/lib/auth";

type CvInsights = {
  headline?: string;
  summary_bullets?: string[];
  languages?: string[];
  industries?: string[];
  seniority?: string;
};

type Profile = {
  id?: number;
  name: string;
  skills: string[];
  preferred_job_titles?: string[];
  experience_years: number;
  desired_salary: number | null;
  location: string | null;
  talent_pool_opt_in?: boolean;
  has_cv?: boolean;
  cv_filename?: string | null;
  has_intro_audio?: boolean;
  cv_insights?: CvInsights | null;
  cv_processing_consent_at?: string | null;
  intro_audio_processing_consent_at?: string | null;
};

type UserPrefs = {
  marketing_emails_opt_in: boolean;
};

const CV_ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const AUDIO_ACCEPT = "audio/webm,audio/mpeg,audio/mp4,audio/wav,.webm,.mp3,.m4a,.wav,.ogg";

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const [introBusy, setIntroBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvMessage, setCvMessage] = useState<string | null>(null);
  const [introMessage, setIntroMessage] = useState<string | null>(null);
  const [initial, setInitial] = useState<Profile | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPrefs | null>(null);
  const [cvUploadConsent, setCvUploadConsent] = useState(false);
  const [introUploadConsent, setIntroUploadConsent] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    Promise.all([
      apiFetch<Profile>("/api/v1/candidates/me", {}, token).catch(() => null),
      apiFetch<UserPrefs>("/api/v1/auth/me", {}, token).catch(() => null),
    ])
      .then(([prof, prefs]) => {
        setInitial(prof);
        setUserPrefs(prefs);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function reloadProfile() {
    const token = getToken();
    if (!token) return;
    try {
      const [prof, prefs] = await Promise.all([
        apiFetch<Profile>("/api/v1/candidates/me", {}, token),
        apiFetch<UserPrefs>("/api/v1/auth/me", {}, token),
      ]);
      setInitial(prof);
      setUserPrefs(prefs);
    } catch {
      /* ignore */
    }
  }

  async function onCvSelected(file: File | null) {
    if (!file) return;
    const token = getToken();
    if (!token) return;
    setError(null);
    setCvMessage(null);
    if (initial && !initial.cv_processing_consent_at && !cvUploadConsent) {
      setError(t("profile.cvConsentRequiredUpload"));
      return;
    }
    setCvBusy(true);
    try {
      const extra =
        initial && !initial.cv_processing_consent_at ? { processing_consent: "true" } : undefined;
      const result = await apiUpload<{
        message: string;
        skills_updated: string[];
        preferred_job_titles?: string[];
        cv_insights?: CvInsights | null;
      }>("/api/v1/candidates/me/cv", file, token, extra);
      await reloadProfile();
      setCvUploadConsent(false);
      setCvMessage(result.message || t("profile.cvUploaded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.cvFailed"));
    } finally {
      setCvBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeCv() {
    const token = getToken();
    if (!token) return;
    setCvBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/candidates/me/cv", { method: "DELETE" }, token);
      await reloadProfile();
      setCvMessage(t("profile.cvRemoved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.cvFailed"));
    } finally {
      setCvBusy(false);
    }
  }

  async function onIntroSelected(file: File | null) {
    if (!file) return;
    const token = getToken();
    if (!token) return;
    setError(null);
    setIntroMessage(null);
    if (initial && !initial.intro_audio_processing_consent_at && !introUploadConsent) {
      setError(t("profile.introConsentRequiredUpload"));
      return;
    }
    setIntroBusy(true);
    try {
      const extra =
        initial && !initial.intro_audio_processing_consent_at
          ? { processing_consent: "true" }
          : undefined;
      const result = await apiUpload<{ message: string }>(
        "/api/v1/candidates/me/intro-audio",
        file,
        token,
        extra,
      );
      await reloadProfile();
      setIntroUploadConsent(false);
      setIntroMessage(result.message || t("profile.introAudioUploaded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.introAudioFailed"));
    } finally {
      setIntroBusy(false);
      if (audioRef.current) audioRef.current.value = "";
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const skillsRaw = String(form.get("skills") || "");
    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const titlesRaw = String(form.get("preferred_job_titles") || "");
    const preferred_job_titles = titlesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const salaryRaw = String(form.get("desired_salary") || "").trim();
    const body = {
      name: String(form.get("name")),
      skills,
      preferred_job_titles,
      experience_years: Number(form.get("experience_years") || 0),
      desired_salary: salaryRaw ? Number(salaryRaw) : null,
      location: String(form.get("location") || "") || null,
      talent_pool_opt_in: Boolean(form.get("talent_pool_opt_in")),
      cv_processing_consent: form.get("cv_processing_consent") === "on",
      intro_audio_processing_consent: form.get("intro_audio_processing_consent") === "on",
    };
    const marketing_emails_opt_in = form.get("marketing_emails_opt_in") === "on";
    try {
      await Promise.all([
        apiFetch("/api/v1/candidates/me", { method: "PUT", body: JSON.stringify(body) }, token),
        apiFetch(
          "/api/v1/auth/me/marketing",
          { method: "PATCH", body: JSON.stringify({ marketing_emails_opt_in }) },
          token,
        ),
      ]);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.failed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Shell rail>
        <p className="twin-muted">{t("profile.loading")}</p>
      </Shell>
    );
  }

  return (
    <Shell rail>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("profile.title")}</h1>
        <p className="twin-muted mb-6 text-sm">{t("profile.subtitle")}</p>

        <section className="twin-filter-box mb-6">
          <h2 className="mb-1 text-sm font-semibold text-[var(--foreground)]">
            {t("profile.cvSection")}
          </h2>
          <p className="twin-muted mb-3 text-xs">{t("profile.cvHint")}</p>
          {initial && !initial.cv_processing_consent_at && (
            <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/30 p-3 text-sm">
              <input
                type="checkbox"
                checked={cvUploadConsent}
                onChange={(e) => setCvUploadConsent(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">{t("profile.cvProcessingConsentLabel")}</span>
                <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">
                  {t("profile.cvProcessingConsentHint")}
                </span>
              </span>
            </label>
          )}
          {initial?.has_cv && (
            <p className="mb-3 text-sm text-[var(--twin-accent)]">
              {t("profile.cvCurrent")}: <strong>{initial.cv_filename}</strong>
            </p>
          )}
          {!initial ? (
            <p className="twin-muted text-sm">{t("profile.cvSaveProfileFirst")}</p>
          ) : (
            <>
          <input
            ref={fileRef}
            type="file"
            accept={CV_ACCEPT}
            className="hidden"
            onChange={(e) => onCvSelected(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={cvBusy || saving}
              onClick={() => fileRef.current?.click()}
            >
              {cvBusy
                ? t("profile.cvUploading")
                : initial?.has_cv
                  ? t("profile.cvReplace")
                  : t("profile.cvUpload")}
            </Button>
            {initial?.has_cv && (
              <button
                type="button"
                disabled={cvBusy || saving}
                onClick={removeCv}
                className="twin-btn-secondary twin-touch-target !w-auto px-4 py-2 text-sm"
              >
                {t("profile.cvRemove")}
              </button>
            )}
          </div>
          {cvMessage && <p className="mt-3 text-sm text-green-700">{cvMessage}</p>}
          {initial?.cv_insights && (
            <div className="mt-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 p-4 text-sm">
              <p className="mb-2 font-semibold text-[var(--foreground)]">{t("profile.cvAnalysisTitle")}</p>
              {initial.cv_insights.headline ? (
                <p className="mb-2 text-[var(--twin-muted-strong)]">
                  <span className="font-medium text-[var(--foreground)]">{t("profile.cvAnalysisHeadline")}: </span>
                  {initial.cv_insights.headline}
                </p>
              ) : null}
              {initial.cv_insights.summary_bullets && initial.cv_insights.summary_bullets.length > 0 ? (
                <div className="mb-2">
                  <p className="font-medium text-[var(--foreground)]">{t("profile.cvAnalysisBullets")}</p>
                  <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                    {initial.cv_insights.summary_bullets.map((b, idx) => (
                      <li key={`${idx}-${b.slice(0, 40)}`}>{b}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {initial.cv_insights.languages && initial.cv_insights.languages.length > 0 ? (
                <p className="mb-1 text-[var(--twin-muted-strong)]">
                  <span className="font-medium text-[var(--foreground)]">{t("profile.cvAnalysisLanguages")}: </span>
                  {initial.cv_insights.languages.join(", ")}
                </p>
              ) : null}
              {initial.cv_insights.industries && initial.cv_insights.industries.length > 0 ? (
                <p className="mb-1 text-[var(--twin-muted-strong)]">
                  <span className="font-medium text-[var(--foreground)]">{t("profile.cvAnalysisIndustries")}: </span>
                  {initial.cv_insights.industries.join(", ")}
                </p>
              ) : null}
              {initial.cv_insights.seniority && initial.cv_insights.seniority !== "unknown" ? (
                <p className="mb-2 text-[var(--twin-muted-strong)]">
                  <span className="font-medium text-[var(--foreground)]">{t("profile.cvAnalysisSeniority")}: </span>
                  {initial.cv_insights.seniority}
                </p>
              ) : null}
              <p className="text-xs text-[var(--twin-muted)]">{t("profile.cvTargetRolesHint")}</p>
            </div>
          )}
            </>
          )}
        </section>

        {initial && (
          <section className="twin-filter-box mb-6">
            <h2 className="mb-1 text-sm font-semibold text-[var(--foreground)]">
              {t("profile.introAudioSection")}
            </h2>
            <p className="twin-muted mb-3 text-xs">{t("profile.introAudioHint")}</p>
            {initial && !initial.intro_audio_processing_consent_at && (
              <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/30 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={introUploadConsent}
                  onChange={(e) => setIntroUploadConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
                />
                <span>
                  <span className="font-medium text-[var(--foreground)]">
                    {t("profile.introAudioProcessingConsentLabel")}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">
                    {t("profile.introAudioProcessingConsentHint")}
                  </span>
                </span>
              </label>
            )}
            {initial.has_intro_audio && (
              <p className="mb-3 text-sm text-[var(--twin-accent)]">{t("profile.introAudioUploaded")}</p>
            )}
            <input
              ref={audioRef}
              type="file"
              accept={AUDIO_ACCEPT}
              className="hidden"
              onChange={(e) => onIntroSelected(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              disabled={introBusy || saving || cvBusy}
              onClick={() => audioRef.current?.click()}
            >
              {introBusy ? t("profile.introAudioUploading") : t("profile.introAudioUpload")}
            </Button>
            {introMessage && <p className="mt-3 text-sm text-green-700">{introMessage}</p>}
          </section>
        )}

        <form onSubmit={onSubmit}>
          <Label>{t("profile.fullName")}</Label>
          <Input name="name" required defaultValue={initial?.name ?? ""} />
          <Label>{t("profile.skills")}</Label>
          <Input
            name="skills"
            placeholder={t("profile.skillsPlaceholder")}
            defaultValue={initial?.skills?.join(", ") ?? ""}
          />
          <Label>{t("profile.preferredJobTitles")}</Label>
          <Input
            name="preferred_job_titles"
            placeholder={t("profile.preferredJobTitlesPlaceholder")}
            defaultValue={initial?.preferred_job_titles?.join(", ") ?? ""}
          />
          <Label>{t("profile.yearsExperience")}</Label>
          <Input
            name="experience_years"
            type="number"
            min={0}
            max={50}
            required
            defaultValue={initial?.experience_years ?? 3}
          />
          <Label>{t("profile.desiredSalary")}</Label>
          <Input
            name="desired_salary"
            type="number"
            min={0}
            placeholder={t("profile.salaryPlaceholder")}
            defaultValue={initial?.desired_salary ?? ""}
          />
          <Label>{t("profile.preferredLocation")}</Label>
          <Input
            name="location"
            placeholder={t("profile.locationPlaceholder")}
            defaultValue={initial?.location ?? ""}
          />
          <div className="mb-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="cv_processing_consent"
                value="on"
                defaultChecked={Boolean(initial?.cv_processing_consent_at)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">{t("profile.cvProcessingConsentLabel")}</span>
                <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">
                  {t("profile.cvProcessingConsentHint")}
                </span>
              </span>
            </label>
          </div>
          <div className="mb-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="intro_audio_processing_consent"
                value="on"
                defaultChecked={Boolean(initial?.intro_audio_processing_consent_at)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">
                  {t("profile.introAudioProcessingConsentLabel")}
                </span>
                <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">
                  {t("profile.introAudioProcessingConsentHint")}
                </span>
              </span>
            </label>
          </div>
          <div className="mb-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="marketing_emails_opt_in"
                value="on"
                defaultChecked={Boolean(userPrefs?.marketing_emails_opt_in)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">{t("profile.marketingEmailsOptIn")}</span>
                <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">{t("profile.marketingEmailsHint")}</span>
              </span>
            </label>
          </div>
          <div className="mb-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="talent_pool_opt_in"
                value="on"
                defaultChecked={Boolean(initial?.talent_pool_opt_in)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">{t("profile.talentPoolOptIn")}</span>
                <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">{t("profile.talentPoolOptInHint")}</span>
              </span>
            </label>
          </div>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving || cvBusy || introBusy}>
            {saving ? t("profile.saving") : t("profile.submit")}
          </Button>
        </form>
        <p className="twin-muted mt-4 text-center text-sm">
          <Link href="/dashboard/identity" className="twin-link mr-3">
            {t("dashboard.identityLink")}
          </Link>
          <Link href="/dashboard" className="twin-link">
            {t("profile.backToDashboard")}
          </Link>
        </p>
      </Card>
    </Shell>
  );
}
