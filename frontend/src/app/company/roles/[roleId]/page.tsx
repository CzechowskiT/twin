"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { CompanyRoleForm } from "@/components/company/company-role-form";
import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { type CompanyRole, COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

export default function CompanyRoleDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const roleId = Number(params.roleId);
  const session = readRecruiterInboxSession();
  const [token, setToken] = useState(session.token);
  const [companyRaw, setCompanyRaw] = useState(session.companySlug);
  const [role, setRole] = useState<CompanyRole | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(readRecruiterInboxSession().companySlug, companyRaw),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug || !Number.isFinite(roleId)) return;
    const q = recruiterInboxQuery(tkn, slug);
    const res = await fetch(`/api/company/roles/${roleId}?${q}`, { cache: "no-store" });
    if (res.status === 503) {
      setReadOnly(true);
      return;
    }
    if (!res.ok) return;
    setReadOnly(false);
    const data = (await res.json()) as { role: CompanyRole };
    setRole(data.role);
  }, [token, companySlug, roleId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function saveRole(payload: Record<string, unknown>) {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) {
      toast.error(t("recruiterInbox.missingAuth"));
      return;
    }
    setBusy(true);
    try {
      writeRecruiterInboxSession(tkn, slug);
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/company/roles/${roleId}?${q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 503) {
        setReadOnly(true);
        toast.error(t("companyJobs.readOnlyUnavailable"));
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { role: CompanyRole };
      setRole(data.role);
      toast.success(t("companyJobs.saveSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("companyJobs.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell wide>
      <Card>
        <CompanyWorkspaceNav />
        <Link href={COMPANY_ROLES_ROUTE} className="twin-link text-sm">
          {t("companyJobs.backToList")}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">{role?.title ?? t("companyJobs.editTitle")}</h1>
        {role ? (
          <p className="twin-muted mb-2 mt-2 text-sm">
            {t("companyJobs.linkedCandidates")}: {role.linked_candidates_count}
          </p>
        ) : null}
        <p className="twin-muted mb-6 text-sm">{t("companyJobs.editLead")}</p>
        <RecruiterAccessFields
          idPrefix="company-role-edit"
          token={token}
          onTokenChange={setToken}
          companySlug={companyRaw}
          onCompanySlugChange={setCompanyRaw}
          companyOptions={companyOptions}
        />
        <div className="mt-6">
          <CompanyRoleForm
            initial={role ?? undefined}
            readOnly={readOnly}
            busy={busy}
            onSubmit={saveRole}
          />
        </div>
      </Card>
    </Shell>
  );
}
