"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { recruiterScorecardQuery, type RecruiterScorecardPayload } from "@/lib/recruiter-scorecard";

type Props = {
  applicationId: number;
  token: string;
  companySlug: string;
};

export function RecruiterScorecardPanel({ applicationId, token, companySlug }: Props) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const tkn = token.trim();
    const slug = companySlug.trim();
    if (!tkn || !slug) return;
    const q = recruiterScorecardQuery(tkn, slug);
    void fetch(`/api/recruiter/inbox/${applicationId}/scorecard?${q}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as RecruiterScorecardPayload;
        setRating(data.rating ?? "");
        setNote(data.note ?? "");
      })
      .catch(() => setError(true));
  }, [applicationId, companySlug, token]);

  const save = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug.trim();
    if (!tkn || !slug) return;
    setSaving(true);
    setSaved(false);
    setError(false);
    try {
      const q = recruiterScorecardQuery(tkn, slug);
      const res = await fetch(`/api/recruiter/inbox/${applicationId}/scorecard?${q}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: rating === "" ? null : rating,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }, [applicationId, companySlug, note, rating, token]);

  return (
    <section
      className="mt-4 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface)]/70 p-4"
      aria-label={t("recruiterScorecard.panelAria")}
    >
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("recruiterScorecard.title")}</h3>
      <p className="twin-muted mt-1 text-xs leading-relaxed">{t("recruiterScorecard.lead")}</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterScorecard.ratingLabel")}</span>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
            className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-2 py-1.5 text-sm"
          >
            <option value="">{t("recruiterScorecard.ratingUnset")}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 flex flex-col gap-1 text-xs">
        <span className="font-medium text-[var(--twin-muted-strong)]">{t("recruiterScorecard.noteLabel")}</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={t("recruiterScorecard.notePlaceholder")}
          className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={saving} className="twin-btn-primary text-sm disabled:opacity-50">
          {saving ? t("recruiterScorecard.saving") : t("recruiterScorecard.save")}
        </button>
        {saved ? <span className="text-xs text-[var(--twin-accent)]">{t("recruiterScorecard.saved")}</span> : null}
        {error ? <span className="text-xs text-red-500">{t("recruiterScorecard.error")}</span> : null}
      </div>
      <p className="twin-muted mt-3 text-[10px] leading-relaxed">{t("recruiterScorecard.scopeNote")}</p>
    </section>
  );
}
