"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch, apiUpload } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Profile = {
  name: string;
  skills: string[];
  experience_years: number;
  desired_salary: number | null;
  location: string | null;
  has_cv?: boolean;
  cv_filename?: string | null;
};

const CV_ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvMessage, setCvMessage] = useState<string | null>(null);
  const [initial, setInitial] = useState<Profile | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    apiFetch<Profile>("/api/v1/candidates/me", {}, token)
      .then(setInitial)
      .catch(() => setInitial(null))
      .finally(() => setLoading(false));
  }, [router]);

  async function reloadProfile() {
    const token = getToken();
    if (!token) return;
    try {
      setInitial(await apiFetch<Profile>("/api/v1/candidates/me", {}, token));
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
    setCvBusy(true);
    try {
      const result = await apiUpload<{
        message: string;
        skills_updated: string[];
      }>("/api/v1/candidates/me/cv", file, token);
      await reloadProfile();
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
    const salaryRaw = String(form.get("desired_salary") || "").trim();
    const body = {
      name: String(form.get("name")),
      skills,
      experience_years: Number(form.get("experience_years") || 0),
      desired_salary: salaryRaw ? Number(salaryRaw) : null,
      location: String(form.get("location") || "") || null,
    };
    try {
      await apiFetch("/api/v1/candidates/me", { method: "PUT", body: JSON.stringify(body) }, token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.failed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="twin-muted">{t("profile.loading")}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("profile.title")}</h1>
        <p className="twin-muted mb-6 text-sm">{t("profile.subtitle")}</p>

        <section className="twin-filter-box mb-6">
          <h2 className="mb-1 text-sm font-semibold text-[var(--foreground)]">
            {t("profile.cvSection")}
          </h2>
          <p className="twin-muted mb-3 text-xs">{t("profile.cvHint")}</p>
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
            </>
          )}
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
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving || cvBusy}>
            {saving ? t("profile.saving") : t("profile.submit")}
          </Button>
        </form>
        <p className="twin-muted mt-4 text-center text-sm">
          <Link href="/dashboard" className="twin-link">
            {t("profile.backToDashboard")}
          </Link>
        </p>
      </Card>
    </Shell>
  );
}
