"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { ProfileProgressBar } from "@/components/profile-progress-bar";
import { WorkspaceFlowSteps } from "@/components/ux/workspace-flow-steps";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch, apiFetchBlob, apiUpload, saveBlobAsFile } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

function cvSeniorityTranslationKey(raw: string): TranslationKey | null {
  const s = raw.trim().toLowerCase();
  if (!s || s === "unknown") return null;
  const map: Record<string, TranslationKey> = {
    junior: "profile.cvSeniorityJunior",
    mid: "profile.cvSeniorityMid",
    senior: "profile.cvSenioritySenior",
    lead: "profile.cvSeniorityLead",
    executive: "profile.cvSeniorityExecutive",
  };
  return map[s] ?? null;
}

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
  talent_pool_opt_in_at?: string | null;
  has_cv?: boolean;
  cv_filename?: string | null;
  has_intro_audio?: boolean;
  cv_insights?: CvInsights | null;
  cv_processing_consent_at?: string | null;
  intro_audio_processing_consent_at?: string | null;
  cv_tailoring?: CvTailoring | null;
};

type CvTailoring = {
  target_job_title?: string;
  job_id?: number | null;
  company?: string | null;
  pitch_paragraph?: string;
  strength_bullets?: string[];
  keywords?: string[];
  updated_at?: string;
  source?: string;
};

type TailorMatchRow = {
  job_id: number;
  title: string;
  company: string;
};

type UserPrefs = {
  marketing_emails_opt_in: boolean;
  profile_documents_processing_consent_at?: string | null;
  has_password_login?: boolean;
};

type ProfileDocumentRow = {
  id: number;
  original_filename: string;
  content_type: string | null;
  size_bytes: number;
  created_at: string;
};

function formatDocSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const CV_ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const AUDIO_ACCEPT = "audio/webm,audio/mpeg,audio/mp4,audio/wav,.webm,.mp3,.m4a,.wav,.ogg";
const DOCUMENT_ACCEPT =
  ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg,image/webp,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const docsRef = useRef<HTMLInputElement>(null);
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
  const [talentPoolOptIn, setTalentPoolOptIn] = useState(false);
  const [talentPoolProcessingConsent, setTalentPoolProcessingConsent] = useState(false);
  const [tailorMatches, setTailorMatches] = useState<TailorMatchRow[]>([]);
  const [tailorJobId, setTailorJobId] = useState("");
  const [tailorTitle, setTailorTitle] = useState("");
  const [tailorBusy, setTailorBusy] = useState(false);
  const [tailorMsg, setTailorMsg] = useState<string | null>(null);
  const [profileDocs, setProfileDocs] = useState<ProfileDocumentRow[]>([]);
  const [docStorageCovered, setDocStorageCovered] = useState(false);
  const [docsBusy, setDocsBusy] = useState(false);
  const [docsMessage, setDocsMessage] = useState<string | null>(null);
  const [docUploadConsent, setDocUploadConsent] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [exportJsonBusy, setExportJsonBusy] = useState(false);

  async function downloadMyDataJson() {
    const token = getToken();
    if (!token) return;
    setExportJsonBusy(true);
    setError(null);
    try {
      const data = await apiFetch<Record<string, unknown>>("/api/v1/candidates/me/export.json", {}, token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      saveBlobAsFile(blob, "twin-my-data.json");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.failed"));
    } finally {
      setExportJsonBusy(false);
    }
  }

  function applyTailoringFromProfile(prof: Profile | null) {
    if (!prof) return;
    const tailoring = prof.cv_tailoring;
    if (tailoring) {
      setTailorTitle(String(tailoring.target_job_title || ""));
      setTailorJobId(
        tailoring.job_id != null && tailoring.job_id !== undefined ? String(tailoring.job_id) : "",
      );
    } else {
      setTailorTitle("");
      setTailorJobId("");
    }
  }

  async function loadTailorMatches(token: string) {
    try {
      const r = await apiFetch<{ items: TailorMatchRow[] }>(
        "/api/v1/candidates/me/matches?limit=100&min_score=15",
        {},
        token,
      );
      setTailorMatches(r.items ?? []);
    } catch {
      setTailorMatches([]);
    }
  }

  async function loadDocumentsList(token: string) {
    try {
      const r = await apiFetch<{ items: ProfileDocumentRow[]; storage_consent_covered: boolean }>(
        "/api/v1/candidates/me/documents",
        {},
        token,
      );
      setProfileDocs(r.items ?? []);
      setDocStorageCovered(Boolean(r.storage_consent_covered));
    } catch {
      setProfileDocs([]);
      setDocStorageCovered(false);
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    Promise.all([
      apiFetch<Profile>("/api/v1/candidates/me", {}, token).catch(() => null),
      apiFetch<UserPrefs>("/api/v1/auth/me", {}, token).catch(() => null),
      loadDocumentsList(token),
    ])
      .then(([prof, prefs]) => {
        setInitial(prof);
        setUserPrefs(prefs);
        if (prof) {
          setTalentPoolOptIn(Boolean(prof.talent_pool_opt_in));
          setTalentPoolProcessingConsent(false);
          applyTailoringFromProfile(prof);
          void loadTailorMatches(token);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function reloadProfile() {
    const token = getToken();
    if (!token) return;
    try {
      const results = await Promise.all([
        apiFetch<Profile>("/api/v1/candidates/me", {}, token),
        apiFetch<UserPrefs>("/api/v1/auth/me", {}, token),
        loadDocumentsList(token),
      ]);
      const prof = results[0];
      const prefs = results[1];
      setInitial(prof);
      setUserPrefs(prefs);
      setTalentPoolOptIn(Boolean(prof.talent_pool_opt_in));
      setTalentPoolProcessingConsent(false);
      applyTailoringFromProfile(prof);
      void loadTailorMatches(token);
    } catch {
      /* ignore */
    }
  }

  async function generateCvTailoring() {
    const token = getToken();
    if (!token || !initial) return;
    setError(null);
    setTailorMsg(null);
    if (!initial.has_cv) {
      setError(t("profile.cvTailorNeedCv"));
      return;
    }
    const title = tailorTitle.trim();
    if (!title) {
      setError(t("profile.cvTailorTargetTitle"));
      return;
    }
    setTailorBusy(true);
    try {
      await apiFetch<{ message: string }>(
        "/api/v1/candidates/me/cv/tailor",
        {
          method: "POST",
          body: JSON.stringify({
            target_job_title: title,
            job_id: tailorJobId ? Number(tailorJobId) : null,
          }),
        },
        token,
      );
      await reloadProfile();
      setTailorMsg(t("profile.cvTailorSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.failed"));
    } finally {
      setTailorBusy(false);
    }
  }

  async function clearCvTailoring() {
    const token = getToken();
    if (!token) return;
    setError(null);
    setTailorMsg(null);
    setTailorBusy(true);
    try {
      await apiFetch("/api/v1/candidates/me/cv/tailoring", { method: "DELETE" }, token);
      await reloadProfile();
      setTailorMsg(t("profile.cvTailorCleared"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.failed"));
    } finally {
      setTailorBusy(false);
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

  async function onProfileDocSelected(file: File | null) {
    if (!file) return;
    const token = getToken();
    if (!token) return;
    setError(null);
    setDocsMessage(null);
    if (!docStorageCovered && !docUploadConsent) {
      setError(t("profile.documentsConsentRequiredUpload"));
      return;
    }
    setDocsBusy(true);
    try {
      const extra = !docStorageCovered ? { processing_consent: "true" } : undefined;
      await apiUpload<{ document: ProfileDocumentRow }>(
        "/api/v1/candidates/me/documents",
        file,
        token,
        extra,
      );
      setDocUploadConsent(false);
      await reloadProfile();
      setDocsMessage(t("profile.documentsUploaded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.documentsUploadFailed"));
    } finally {
      setDocsBusy(false);
      if (docsRef.current) docsRef.current.value = "";
    }
  }

  async function downloadProfileDoc(row: ProfileDocumentRow) {
    const token = getToken();
    if (!token) return;
    setError(null);
    setDocsBusy(true);
    try {
      const blob = await apiFetchBlob(`/api/v1/candidates/me/documents/${row.id}/file`, {}, token);
      saveBlobAsFile(blob, row.original_filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.documentsDownloadFailed"));
    } finally {
      setDocsBusy(false);
    }
  }

  async function deleteProfileDoc(id: number) {
    const token = getToken();
    if (!token) return;
    setError(null);
    setDocsMessage(null);
    setDocsBusy(true);
    try {
      await apiFetch(`/api/v1/candidates/me/documents/${id}`, { method: "DELETE" }, token);
      await reloadProfile();
      setDocsMessage(t("profile.documentsDeleted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.documentsDeleteFailed"));
    } finally {
      setDocsBusy(false);
    }
  }

  async function onChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("new_password") || "");
    const confirm = String(form.get("new_password_confirm") || "");
    if (newPassword !== confirm) {
      toast.error(t("changePassword.mismatch"));
      return;
    }
    setPasswordBusy(true);
    try {
      await apiFetch(
        "/api/v1/auth/me/password",
        {
          method: "PATCH",
          body: JSON.stringify({
            current_password: String(form.get("current_password") || ""),
            new_password: newPassword,
          }),
        },
        token,
      );
      e.currentTarget.reset();
      toast.success(t("changePassword.success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("changePassword.failed"));
    } finally {
      setPasswordBusy(false);
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
    if (talentPoolOptIn && !initial?.talent_pool_opt_in_at && !talentPoolProcessingConsent) {
      setError(t("profile.talentPoolProcessingConsentRequired"));
      setSaving(false);
      return;
    }
    const body: Record<string, unknown> = {
      name: String(form.get("name")),
      skills,
      preferred_job_titles,
      experience_years: Number(form.get("experience_years") || 0),
      desired_salary: salaryRaw ? Number(salaryRaw) : null,
      location: String(form.get("location") || "") || null,
      talent_pool_opt_in: talentPoolOptIn,
      cv_processing_consent: form.get("cv_processing_consent") === "on",
      intro_audio_processing_consent: form.get("intro_audio_processing_consent") === "on",
    };
    if (talentPoolOptIn && !initial?.talent_pool_opt_in_at) {
      body.talent_pool_processing_consent = talentPoolProcessingConsent;
    }
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
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 shrink-0">
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("profile.title")}</h1>
          <p className="twin-muted mt-1 text-sm">{t("profile.subtitle")}</p>
        </div>
        <CandidateWorkspaceSubnav
          ariaLabel={t("profile.title")}
          exportJsonBusy={exportJsonBusy}
          onExportJson={() => void downloadMyDataJson()}
        />
      </div>
      <WorkspaceFlowSteps current="profile" className="mb-4 sm:mb-6" />
      {initial ? (
        <ProfileProgressBar
          className="mb-4 max-w-md"
          profile={{
            name: initial.name,
            skills: JSON.stringify(initial.skills ?? []),
            preferred_job_titles: JSON.stringify(initial.preferred_job_titles ?? []),
            experience_years: initial.experience_years,
            location: initial.location,
            cv_filename: initial.cv_filename,
            cv_text: initial.has_cv ? "1" : null,
          }}
        />
      ) : null}
      <Card>

        <section className="twin-filter-box mb-6">
          <h2 className="mb-1 text-sm font-semibold text-[var(--foreground)]">
            {t("changePassword.sectionTitle")}
          </h2>
          <p className="twin-muted mb-3 text-xs">{t("changePassword.sectionHint")}</p>
          {userPrefs?.has_password_login === false ? (
            <p className="text-sm text-[var(--twin-muted-strong)]">{t("changePassword.oauthOnlyHint")}</p>
          ) : (
            <form onSubmit={onChangePassword} className="max-w-md space-y-3">
              <div>
                <Label htmlFor="current_password">{t("changePassword.currentPassword")}</Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={1}
                />
              </div>
              <div>
                <Label htmlFor="new_password">{t("changePassword.newPassword")}</Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="new_password_confirm">{t("changePassword.newPasswordConfirm")}</Label>
                <Input
                  id="new_password_confirm"
                  name="new_password_confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={passwordBusy || saving}>
                {passwordBusy ? t("changePassword.saving") : t("changePassword.submit")}
              </Button>
            </form>
          )}
        </section>

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
              {(() => {
                const raw = initial.cv_insights.seniority;
                const sk = raw ? cvSeniorityTranslationKey(raw) : null;
                return sk ? (
                  <p className="mb-2 text-[var(--twin-muted-strong)]">
                    <span className="font-medium text-[var(--foreground)]">{t("profile.cvAnalysisSeniority")}: </span>
                    {t(sk)}
                  </p>
                ) : null;
              })()}
              <p className="text-xs text-[var(--twin-muted)]">{t("profile.cvTargetRolesHint")}</p>
            </div>
          )}
            </>
          )}
        </section>

        {initial && (
          <section className="twin-filter-box mb-6">
            <h2 className="mb-1 text-sm font-semibold text-[var(--foreground)]">
              {t("profile.cvTailorSection")}
            </h2>
            <p className="twin-muted mb-3 text-xs">{t("profile.cvTailorHint")}</p>
            {!initial.has_cv ? (
              <p className="twin-muted text-sm">{t("profile.cvTailorNeedCv")}</p>
            ) : (
              <>
                <Label>{t("profile.cvTailorPickJob")}</Label>
                <select
                  className="mb-3 mt-1 w-full max-w-xl rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                  value={tailorJobId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTailorJobId(v);
                    if (!v) {
                      setTailorTitle("");
                      return;
                    }
                    const row = tailorMatches.find((m) => String(m.job_id) === v);
                    if (row?.title) setTailorTitle(row.title);
                  }}
                  disabled={tailorBusy || saving}
                >
                  <option value="">{t("profile.cvTailorNoJob")}</option>
                  {tailorMatches.map((m) => (
                    <option key={m.job_id} value={m.job_id}>
                      {m.title} — {m.company}
                    </option>
                  ))}
                </select>
                <Label>{t("profile.cvTailorTargetTitle")}</Label>
                <Input
                  value={tailorTitle}
                  onChange={(e) => setTailorTitle(e.target.value)}
                  placeholder={t("profile.cvTailorTargetTitlePlaceholder")}
                  disabled={tailorBusy || saving}
                  className="mb-3"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={tailorBusy || saving || cvBusy || introBusy}
                    onClick={() => void generateCvTailoring()}
                  >
                    {tailorBusy ? t("profile.cvTailorGenerating") : t("profile.cvTailorGenerate")}
                  </Button>
                  {initial.cv_tailoring ? (
                    <button
                      type="button"
                      disabled={tailorBusy || saving}
                      onClick={() => void clearCvTailoring()}
                      className="twin-btn-secondary twin-touch-target !w-auto px-4 py-2 text-sm"
                    >
                      {t("profile.cvTailorClear")}
                    </button>
                  ) : null}
                </div>
                {tailorMsg && <p className="mt-3 text-sm text-green-700">{tailorMsg}</p>}
                {initial.cv_tailoring ? (
                  <div className="mt-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 p-4 text-sm">
                    {initial.cv_tailoring.company ? (
                      <p className="mb-2 text-[var(--twin-muted-strong)]">
                        <span className="font-medium text-[var(--foreground)]">{initial.cv_tailoring.target_job_title}</span>
                        {" · "}
                        {initial.cv_tailoring.company}
                      </p>
                    ) : (
                      <p className="mb-2 font-medium text-[var(--foreground)]">
                        {initial.cv_tailoring.target_job_title}
                      </p>
                    )}
                    {initial.cv_tailoring.pitch_paragraph ? (
                      <p className="mb-3 whitespace-pre-wrap text-[var(--twin-muted-strong)]">
                        {initial.cv_tailoring.pitch_paragraph}
                      </p>
                    ) : null}
                    {initial.cv_tailoring.strength_bullets &&
                    initial.cv_tailoring.strength_bullets.length > 0 ? (
                      <ul className="mb-3 list-inside list-disc text-[var(--twin-muted-strong)]">
                        {initial.cv_tailoring.strength_bullets.map((b, idx) => (
                          <li key={`${idx}-${b.slice(0, 48)}`}>{b}</li>
                        ))}
                      </ul>
                    ) : null}
                    {initial.cv_tailoring.keywords && initial.cv_tailoring.keywords.length > 0 ? (
                      <p className="mb-1 text-xs text-[var(--twin-muted)]">
                        {t("profile.cvTailorKeywords")}: {initial.cv_tailoring.keywords.join(", ")}
                      </p>
                    ) : null}
                    <p className="text-xs text-[var(--twin-muted)]">
                      {t("profile.cvTailorUpdated")}: {initial.cv_tailoring.updated_at ?? "—"} ·{" "}
                      {t("profile.cvTailorSource")}: {initial.cv_tailoring.source ?? "—"}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </section>
        )}

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

        <section className="twin-filter-box mb-6">
          <h2 className="mb-1 text-sm font-semibold text-[var(--foreground)]">{t("profile.documentsSection")}</h2>
          <p className="twin-muted mb-3 text-xs">{t("profile.documentsHint")}</p>
          {!docStorageCovered && (
            <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/30 p-3 text-sm">
              <input
                type="checkbox"
                checked={docUploadConsent}
                onChange={(e) => setDocUploadConsent(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">{t("profile.documentsProcessingConsentLabel")}</span>
                <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">
                  {t("profile.documentsProcessingConsentHint")}
                </span>
              </span>
            </label>
          )}
          <input
            ref={docsRef}
            type="file"
            accept={DOCUMENT_ACCEPT}
            className="hidden"
            onChange={(e) => void onProfileDocSelected(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            disabled={docsBusy || saving || cvBusy || introBusy}
            onClick={() => docsRef.current?.click()}
          >
            {docsBusy ? t("profile.documentsUploading") : t("profile.documentsUpload")}
          </Button>
          {docsMessage && <p className="mt-3 text-sm text-green-700">{docsMessage}</p>}
          {profileDocs.length > 0 ? (
            <ul className="mt-4 divide-y divide-[var(--twin-border)] rounded-lg border border-[var(--twin-border)] text-sm">
              {profileDocs.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--foreground)]">{d.original_filename}</p>
                    <p className="twin-muted text-xs">
                      {formatDocSize(d.size_bytes)}
                      {d.created_at ? ` · ${d.created_at}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={docsBusy || saving || cvBusy || introBusy}
                      onClick={() => void downloadProfileDoc(d)}
                      className="twin-btn-secondary twin-touch-target !w-auto px-3 py-1.5 text-xs"
                    >
                      {t("profile.documentsDownload")}
                    </button>
                    <button
                      type="button"
                      disabled={docsBusy || saving || cvBusy || introBusy}
                      onClick={() => void deleteProfileDoc(d.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                    >
                      {t("profile.documentsDelete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

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
                checked={talentPoolOptIn}
                onChange={(e) => {
                  setTalentPoolOptIn(e.target.checked);
                  if (!e.target.checked) setTalentPoolProcessingConsent(false);
                }}
                className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">{t("profile.talentPoolOptIn")}</span>
                <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">{t("profile.talentPoolOptInHint")}</span>
              </span>
            </label>
            {talentPoolOptIn && !initial?.talent_pool_opt_in_at ? (
              <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-[var(--twin-border)] pt-4 text-sm">
                <input
                  type="checkbox"
                  checked={talentPoolProcessingConsent}
                  onChange={(e) => setTalentPoolProcessingConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)]"
                />
                <span>
                  <span className="font-medium text-[var(--foreground)]">
                    {t("profile.talentPoolProcessingConsentLabel")}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--twin-muted-strong)]">
                    {t("profile.talentPoolProcessingConsentHint")}
                  </span>
                </span>
              </label>
            ) : null}
          </div>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving || cvBusy || introBusy || docsBusy}>
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
