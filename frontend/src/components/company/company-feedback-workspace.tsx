"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  COMPANY_FEEDBACK_MARKERS,
  COMPANY_FEEDBACK_ROUTE,
  createCompanyFeedbackDraft,
  loadCompanyFeedback,
  resolveCompanyFeedback,
  submitCompanyFeedbackForReview,
  type CompanyFeedbackRow,
  type SafePersistenceSource,
} from "@/lib/company-feedback";

export { COMPANY_FEEDBACK_ROUTE, COMPANY_FEEDBACK_MARKERS };

export function CompanyFeedbackWorkspace() {
  const { t } = useTranslation();
  const [record, setRecord] = useState(() => resolveCompanyFeedback());
  const [source, setSource] = useState<SafePersistenceSource>("demo");
  const [candidateRef, setCandidateRef] = useState("demo-candidate-001");
  const [roleRef, setRoleRef] = useState("demo-role-001");
  const [draftWrite, setDraftWrite] = useState<"idle" | "live" | "demo">("idle");
  const [submitWrite, setSubmitWrite] = useState<"idle" | "live" | "demo">("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void loadCompanyFeedback().then((res) => {
      if (!active) return;
      setRecord(res.record);
      setSource(res.source);
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceKey = source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback";
  const draftKey = draftWrite === "live" ? "safePersistence.internalWriteLive" : draftWrite === "demo" ? "safePersistence.internalWriteDemo" : null;
  const submitKey = submitWrite === "live" ? "safePersistence.internalWriteLive" : submitWrite === "demo" ? "safePersistence.internalWriteDemo" : null;
  const draftItem = record.items.find((row) => row.status === "draft");

  async function onDraft(): Promise<void> {
    setSaving(true);
    setDraftWrite("idle");
    const result = await createCompanyFeedbackDraft({ candidate_ref: candidateRef, role_ref: roleRef });
    if (result.wrote && result.data) {
      const row: CompanyFeedbackRow = {
        id: String(result.data.id),
        candidate_ref: result.data.candidate_ref,
        role_ref: result.data.role_ref,
        status: result.data.status,
        rating_preview: result.data.rating_preview,
      };
      setRecord((prev) => ({ items: [row, ...prev.items.filter((i) => i.id !== row.id)] }));
      setSource("live");
      setDraftWrite("live");
    } else {
      setDraftWrite("demo");
    }
    setSaving(false);
  }

  async function onSubmitReview(): Promise<void> {
    if (!draftItem) return;
    setSaving(true);
    setSubmitWrite("idle");
    const result = await submitCompanyFeedbackForReview(draftItem.id);
    if (result.wrote && result.data) {
      setRecord((prev) => ({
        items: prev.items.map((row) =>
          row.id === draftItem.id ? { ...row, status: result.data!.status } : row,
        ),
      }));
      setSource("live");
      setSubmitWrite("live");
    } else {
      setSubmitWrite("demo");
    }
    setSaving(false);
  }

  return (
    <Shell wide>
      <div data-company-feedback-page="company-feedback-page" className="mx-auto max-w-4xl space-y-4">
        <header data-testid={COMPANY_FEEDBACK_MARKERS.header}>
          <h1 className="twin-section-title text-2xl">{t("companyFeedback.pageTitle")}</h1>
          <p className="text-xs text-[var(--twin-muted)]" data-testid="company-feedback-data-source">
            {t(sourceKey)}
          </p>
        </header>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.list}>
          <p className="mb-2 text-xs">{t("companyFeedback.listLead")}</p>
          <ul className="space-y-1 text-xs">
            {record.items.map((row: CompanyFeedbackRow) => (
              <li key={row.id} className="rounded border px-2 py-1">
                {row.candidate_ref} · {row.role_ref} · {row.status}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.draftForm}>
          <p className="text-xs">{t("companyFeedback.draftLead")}</p>
          <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t("companyFeedback.draftInternalNote")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="text"
              value={candidateRef}
              onChange={(e) => setCandidateRef(e.target.value)}
              className="rounded border bg-transparent px-2 py-1 text-xs"
              aria-label="candidate ref"
            />
            <input
              type="text"
              value={roleRef}
              onChange={(e) => setRoleRef(e.target.value)}
              className="rounded border bg-transparent px-2 py-1 text-xs"
              aria-label="role ref"
            />
            <button type="button" className="rounded border px-3 py-1 text-xs disabled:opacity-50" onClick={() => void onDraft()} disabled={saving}>
              {t("companyFeedback.draftAction")}
            </button>
          </div>
          {draftKey ? <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{t(draftKey)}</p> : null}
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.reviewStatus}>
          <p className="text-xs">{t("companyFeedback.reviewLead")}</p>
          {draftItem ? (
            <button type="button" className="mt-2 rounded border px-3 py-1 text-xs disabled:opacity-50" onClick={() => void onSubmitReview()} disabled={saving}>
              {t("companyFeedback.submitReviewAction")}
            </button>
          ) : null}
          {submitKey ? <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{t(submitKey)}</p> : null}
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.visibilityBoundary}>
          <p className="text-xs">{t("companyFeedback.visibilityLead")}</p>
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.auditTrail}>
          <p className="text-xs">{t("companyFeedback.auditLead")}</p>
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.boundary}>
          <p className="text-xs">{t("companyFeedback.boundaryLead")}</p>
        </Card>
      </div>
    </Shell>
  );
}
