"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { apiFetch } from "@/lib/api";

const PAGE_LIMIT = 24;
const DEBOUNCE_MS = 400;

type TalentPoolItem = {
  public_id: string;
  skills: string[];
  validated: boolean;
  match_percent: number;
};

type TalentPoolResponse = {
  items: TalentPoolItem[];
  total: number;
};

function buildQuery(offset: number, jobTitle: string, requiredSkills: string): string {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_LIMIT));
  params.set("offset", String(offset));
  const title = jobTitle.trim();
  const skills = requiredSkills.trim();
  if (title) params.set("job_title", title);
  if (skills) params.set("required_skills", skills);
  return `/api/v1/talent-pool/anonymous?${params.toString()}`;
}

export function TalentPoolPreview() {
  const { t } = useTranslation();
  const [jobTitle, setJobTitle] = useState("");
  const [skillsCsv, setSkillsCsv] = useState("");
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [debouncedSkills, setDebouncedSkills] = useState("");
  const [items, setItems] = useState<TalentPoolItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersBootstrapped = useRef(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!filtersBootstrapped.current) {
      filtersBootstrapped.current = true;
      setDebouncedTitle(jobTitle);
      setDebouncedSkills(skillsCsv);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedTitle(jobTitle);
      setDebouncedSkills(skillsCsv);
      setOffset(0);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [jobTitle, skillsCsv]);

  const fetchPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      const path = buildQuery(nextOffset, debouncedTitle, debouncedSkills);
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<TalentPoolResponse>(path);
        setTotal(data.total);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      } catch (e) {
        setError(e instanceof Error ? e.message : t("common.errorBody"));
        if (!append) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedTitle, debouncedSkills, t],
  );

  useEffect(() => {
    void fetchPage(offset, offset > 0);
  }, [debouncedTitle, debouncedSkills, offset, fetchPage]);

  const canLoadMore = items.length < total;

  return (
    <section aria-labelledby="talent-pool-preview-heading" className="space-y-6">
      <div>
        <h2 id="talent-pool-preview-heading" className="twin-section-title text-lg sm:text-xl">
          {t("persona.talentPoolTitle")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
          {t("persona.talentPoolLead")}
        </p>
      </div>

      <div className="flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-[var(--foreground)]">
          <span className="mb-1 block text-xs font-normal text-[var(--twin-muted)]">
            {t("persona.talentPoolJobTitle")}
          </span>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="twin-input w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2 text-sm"
            placeholder={t("persona.talentPoolJobTitlePlaceholder")}
            autoComplete="off"
          />
        </label>
        <label className="flex-1 text-sm font-medium text-[var(--foreground)]">
          <span className="mb-1 block text-xs font-normal text-[var(--twin-muted)]">
            {t("persona.talentPoolSkills")}
          </span>
          <input
            type="text"
            value={skillsCsv}
            onChange={(e) => setSkillsCsv(e.target.value)}
            className="twin-input w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2 text-sm"
            placeholder={t("persona.talentPoolSkillsPlaceholder")}
            autoComplete="off"
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="text-sm text-[var(--twin-muted-strong)]">{t("common.loadingEllipsis")}</p>
      ) : null}

      {!loading && items.length === 0 && !error ? (
        <p className="text-sm text-[var(--twin-muted-strong)]">{t("persona.talentPoolEmpty")}</p>
      ) : null}

      {items.length > 0 ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((row) => (
              <li
                key={row.public_id}
                className="flex flex-col rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-xs text-[var(--twin-muted-strong)]">{row.public_id}</p>
                  <span className="shrink-0 rounded-full bg-[var(--twin-accent-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--twin-accent)]">
                    {row.match_percent}%
                  </span>
                </div>
                {row.validated ? (
                  <p className="mt-2 inline-flex w-fit rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                    {t("persona.talentPoolValidated")}
                  </p>
                ) : null}
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {row.skills.length === 0 ? (
                    <li className="text-xs text-[var(--twin-muted)]">{t("persona.talentPoolNoSkills")}</li>
                  ) : (
                    row.skills.map((s) => (
                      <li
                        key={`${row.public_id}-${s}`}
                        className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-2 py-0.5 text-xs text-[var(--twin-muted-strong)]"
                      >
                        {s}
                      </li>
                    ))
                  )}
                </ul>
              </li>
            ))}
          </ul>
          {canLoadMore ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => setOffset((o) => o + PAGE_LIMIT)}
              className="twin-touch-target rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-5 py-2 text-sm font-semibold text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-border-hover)] disabled:opacity-50"
            >
              {loadingMore ? t("common.loadingEllipsis") : t("persona.talentPoolLoadMore")}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
