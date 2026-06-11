"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { CompanyRoleForm } from "@/components/company/company-role-form";
import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

export default function CompanyRoleNewPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const session = readRecruiterInboxSession();
  const [token, setToken] = useState(session.token);
  const [companyRaw, setCompanyRaw] = useState(session.companySlug);
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

  async function createRole(payload: Record<string, unknown>) {
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
      const res = await fetch(`/api/company/roles?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 503) {
        setReadOnly(true);
        toast.error(t("companyJobs.readOnlyUnavailable"));
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { role: { id: number } };
      toast.success(t("companyJobs.createSuccess"));
      router.push(`${COMPANY_ROLES_ROUTE}/${data.role.id}`);
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
        <h1 className="mt-4 text-2xl font-semibold">{t("companyJobs.createTitle")}</h1>
        <p className="twin-muted mb-6 mt-2 text-sm">{t("companyJobs.createLead")}</p>
        <RecruiterAccessFields
          idPrefix="company-role-new"
          token={token}
          onTokenChange={setToken}
          companySlug={companyRaw}
          onCompanySlugChange={setCompanyRaw}
          companyOptions={companyOptions}
        />
        <div className="mt-6">
          <CompanyRoleForm readOnly={readOnly} busy={busy} onSubmit={createRole} />
        </div>
      </Card>
    </Shell>
  );
}
