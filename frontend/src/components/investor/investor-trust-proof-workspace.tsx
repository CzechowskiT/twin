
"use client";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { INVESTOR_TRUST_PROOF_LINKS, INVESTOR_TRUST_PROOF_MARKERS, INVESTOR_TRUST_PROOF_PAGE_MARKER, LAUNCH_STANCE, resolveInvestorTrustProof } from "@/lib/investor-trust-proof";
import type { TranslationKey } from "@/lib/i18n";
import { TRUST_PROOF_PREVIEW_BOUNDARY } from "@/lib/seven-day-d5-investor";
import { DemoJourneyPilotStatus } from "@/components/workspace/demo-journey-pilot-status";

function section(marker: string, title: string, body: string) {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5" data-testid={marker}>
      <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">{title}</h2>
      <p className="mt-3 text-sm">{body}</p>
    </Card>
  );
}

export function InvestorTrustProofWorkspace() {
  const { t } = useTranslation();
  const record = resolveInvestorTrustProof();
  return (
    <Shell wide>
      <div data-investor-trust-proof-page={INVESTOR_TRUST_PROOF_PAGE_MARKER} data-testid={INVESTOR_TRUST_PROOF_MARKERS.page} className="mx-auto max-w-5xl space-y-6">
        <header data-testid={INVESTOR_TRUST_PROOF_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">{t("investorTrustProof.pageEyebrow")}</p>
          <h1 className="twin-section-title text-2xl">{t("investorTrustProof.pageTitle")}</h1>
          <DemoJourneyPilotStatus testId={INVESTOR_TRUST_PROOF_MARKERS.pilotBadge} />
          <div className="flex gap-3 text-xs">{INVESTOR_TRUST_PROOF_LINKS.map((l) => <Link key={l.href} href={l.href} className="twin-link">{t(l.labelKey)}</Link>)}</div>
        </header>
        {TRUST_PROOF_PREVIEW_BOUNDARY ? (
          <Card variant="soft" className="border-[var(--twin-border)]/80 p-5" data-seven-day-investor-trust-proof-preview-boundary>
            <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("sevenDayD5.trustProofPreviewBoundaryBody")}</p>
          </Card>
        ) : null}
        {section(INVESTOR_TRUST_PROOF_MARKERS.architecture, t("investorTrustProof.architectureTitle"), t("investorTrustProof.architectureLead"))}
        {section(INVESTOR_TRUST_PROOF_MARKERS.matrix, t("investorTrustProof.matrixTitle"), t("investorTrustProof.matrixLead"))}
        {section(INVESTOR_TRUST_PROOF_MARKERS.recruiter, t("investorTrustProof.recruiterTitle"), t("investorTrustProof.recruiterLead"))}
        {section(INVESTOR_TRUST_PROOF_MARKERS.boundary, t("investorTrustProof.boundaryTitle"), t("investorTrustProof.boundaryDemoOnly"))}
        {section(INVESTOR_TRUST_PROOF_MARKERS.launch, t("investorTrustProof.launchTitle"), t("investorTrustProof.launchNoGo"))}
        <Card variant="soft" data-testid={INVESTOR_TRUST_PROOF_MARKERS.risks} className="p-5"><h2 className="text-sm font-semibold uppercase">{t("investorTrustProof.risksTitle")}</h2><ul className="mt-3 list-disc pl-4 text-sm">{record.risks.map((k) => <li key={k}>{t(k as TranslationKey)}</li>)}</ul></Card>
        {section(INVESTOR_TRUST_PROOF_MARKERS.conversion, t("investorTrustProof.conversionTitle"), t("investorTrustProof.conversionLead"))}
      </div>
    </Shell>
  );
}
