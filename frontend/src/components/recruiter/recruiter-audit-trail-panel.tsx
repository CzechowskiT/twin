"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  formatRecruiterAuditTimestamp,
  recruiterAuditActionLabelKey,
  recruiterAuditTrailQuery,
  type RecruiterAuditEventRow,
} from "@/lib/recruiter-audit-trail";

type Props = {
  applicationId: number;
  token: string;
  companySlug: string;
  refreshKey?: number;
};

export function RecruiterAuditTrailPanel({ applicationId, token, companySlug, refreshKey = 0 }: Props) {
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<RecruiterAuditEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const tkn = token.trim();
    const slug = companySlug.trim();
    if (!tkn || !slug) return;
    let cancelled = false;
    const q = recruiterAuditTrailQuery(tkn, slug);
    void fetch(`/api/recruiter/inbox/${applicationId}/audit?${q}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(true);
          setItems([]);
          return;
        }
        const data = (await res.json()) as { items?: RecruiterAuditEventRow[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, companySlug, token, refreshKey]);

  return (
    <section
      className="mt-4 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface)]/70 p-4"
      aria-label={t("recruiterAudit.panelAria")}
    >
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("recruiterAudit.title")}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--twin-muted)]">{t("recruiterAudit.trustNote")}</p>
      {loading ? (
        <p className="mt-3 text-xs text-[var(--twin-muted)]">{t("recruiterAudit.loading")}</p>
      ) : error ? (
        <p className="mt-3 text-xs text-[var(--twin-muted)]">{t("recruiterAudit.loadFailed")}</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--twin-muted)]">{t("recruiterAudit.empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-0.5 border-b border-[var(--twin-border)]/40 pb-2 last:border-0 last:pb-0"
            >
              <span className="text-xs font-medium text-[var(--foreground)]">
                {t(recruiterAuditActionLabelKey(item.action_type))}
              </span>
              <span className="text-[0.6875rem] text-[var(--twin-muted)]">
                {formatRecruiterAuditTimestamp(item.created_at, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export async function postRecruiterAuditEvent(opts: {
  applicationId: number;
  token: string;
  companySlug: string;
  actionType: string;
  meta?: Record<string, string>;
}): Promise<boolean> {
  const tkn = opts.token.trim();
  const slug = opts.companySlug.trim();
  if (!tkn || !slug) return false;
  const q = recruiterAuditTrailQuery(tkn, slug);
  const res = await fetch(`/api/recruiter/inbox/${opts.applicationId}/audit?${q}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_type: opts.actionType, meta: opts.meta ?? {} }),
  });
  return res.ok;
}
