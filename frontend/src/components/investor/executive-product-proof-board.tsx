"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { MarketingCrosslinksBand } from "@/components/marketing/marketing-crosslinks-band";
import { DemoJourneyPilotStatus } from "@/components/workspace/demo-journey-pilot-status";
import { Card, Shell } from "@/components/ui";
import {
  EXECUTIVE_PRODUCT_PROOF_DEMO_LINKS,
  EXECUTIVE_PRODUCT_PROOF_MARKERS,
  EXECUTIVE_PRODUCT_PROOF_PAGE_MARKER,
  EXECUTIVE_PRODUCT_PROOF_FORBIDDEN_PATTERNS,
  LAUNCH_STANCE,
  getExecutiveProductProofDeliveryHistory,
  getExecutiveProductProofMaturityMatrix,
  getExecutiveProductProofMilestones,
  getExecutiveProductProofRisks,
  getExecutiveProductProofSorStack,
} from "@/lib/executive-product-proof";
import { PRODUCT_PROOF_PREVIEW_BOUNDARY } from "@/lib/seven-day-d5-investor";

function sectionCard(marker: string, title: string, children: ReactNode, className = ""): ReactNode {
  return (
    <Card
      variant="soft"
      className={`border-[var(--twin-border)]/80 p-5 sm:p-6 ${className}`}
      data-testid={marker}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">{children}</div>
    </Card>
  );
}

function maturityTone(maturity: string): string {
  if (maturity === "live") return "text-emerald-200 border-emerald-500/30";
  if (maturity === "pilot") return "text-[var(--twin-accent)] border-[var(--twin-accent)]/30";
  if (maturity === "planned") return "text-sky-200 border-sky-500/30";
  return "text-amber-200 border-amber-500/30";
}

function severityTone(severity: string): string {
  if (severity === "high") return "border-rose-500/30 bg-rose-500/5";
  if (severity === "medium") return "border-amber-500/30 bg-amber-500/5";
  return "border-[var(--twin-border)]";
}

export function ExecutiveProductProofBoard({ workspace = false }: { workspace?: boolean }) {
  const { t } = useTranslation();
  const sorStack = getExecutiveProductProofSorStack();
  const maturity = getExecutiveProductProofMaturityMatrix();
  const delivery = getExecutiveProductProofDeliveryHistory();
  const risks = getExecutiveProductProofRisks();
  const milestones = getExecutiveProductProofMilestones();

  return (
    <Shell wide>
      <div
        data-executive-product-proof-page={EXECUTIVE_PRODUCT_PROOF_PAGE_MARKER}
        className="mx-auto min-w-0 max-w-6xl space-y-6 overflow-x-hidden px-4 sm:px-6"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 min-w-0" data-testid={EXECUTIVE_PRODUCT_PROOF_MARKERS.header}>
          <div className="min-w-0 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("executiveProductProof.pageEyebrow")}
            </p>
            <h1 className="twin-section-title text-2xl sm:text-3xl">{t("executiveProductProof.title")}</h1>
            <p className="text-sm text-[var(--twin-muted-strong)]">{t("executiveProductProof.lead")}</p>
          {workspace ? (
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("executiveProductProof.workspaceNote")}</p>
          ) : (
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("executiveProductProof.publicNote")}</p>
          )}
          <MarketingCrosslinksBand page="investor-product-proof" className="pt-2" />
          </div>
          <DemoJourneyPilotStatus status="pilot" />
        </header>

        {PRODUCT_PROOF_PREVIEW_BOUNDARY ? (
          <Card variant="soft" className="border-[var(--twin-border)]/80 p-5" data-seven-day-investor-product-proof-preview-boundary>
            <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("sevenDayD5.productProofPreviewBoundaryBody")}</p>
          </Card>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {sectionCard(
            EXECUTIVE_PRODUCT_PROOF_MARKERS.sorStack,
            t("executiveProductProof.sorStackTitle"),
            <>
              <p className="twin-muted text-xs">{t("executiveProductProof.sorStackLead")}</p>
              <ul className="space-y-3">
                {sorStack.map((layer) => (
                  <li key={layer.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{layer.layer}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${maturityTone(layer.status)}`}>
                        {layer.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="twin-muted mt-1 text-xs">{layer.modules}</p>
                    <p className="mt-1 text-xs text-amber-200/90">{layer.boundary}</p>
                  </li>
                ))}
              </ul>
            </>,
            "lg:col-span-2",
          )}

          {sectionCard(
            EXECUTIVE_PRODUCT_PROOF_MARKERS.maturityMatrix,
            t("executiveProductProof.maturityTitle"),
            <>
              <p className="twin-muted text-xs">{t("executiveProductProof.maturityLead")}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--twin-border)] text-[var(--twin-muted-strong)]">
                      <th className="py-2 pr-3 font-semibold">{t("executiveProductProof.colModule")}</th>
                      <th className="py-2 pr-3 font-semibold">{t("executiveProductProof.colMaturity")}</th>
                      <th className="py-2 font-semibold">{t("executiveProductProof.colEvidence")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maturity.map((row) => (
                      <tr key={row.id} className="border-b border-[var(--twin-border)]/40">
                        <td className="py-2 pr-3 font-medium">{row.module}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${maturityTone(row.maturity)}`}>
                            {row.maturity.replace("_", " ")}
                          </span>
                        </td>
                        <td className="twin-muted py-2">{row.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>,
            "lg:col-span-2",
          )}

          {sectionCard(
            EXECUTIVE_PRODUCT_PROOF_MARKERS.deliveryHistory,
            t("executiveProductProof.deliveryTitle"),
            <>
              <p className="twin-muted text-xs">{t("executiveProductProof.deliveryLead")}</p>
              <ul className="space-y-2">
                {delivery.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="font-mono font-semibold text-[var(--twin-accent)]">{entry.pr}</span>
                    <span className="font-medium">{entry.title}</span>
                    <span className="twin-muted">· {entry.lane} · {entry.shipped_at}</span>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            EXECUTIVE_PRODUCT_PROOF_MARKERS.launchStatus,
            t("executiveProductProof.launchTitle"),
            <>
              <p
                className="text-2xl font-bold uppercase tracking-wide text-amber-400"
                data-launch-stance={LAUNCH_STANCE}
              >
                {t("executiveProductProof.launchNoGo")}
              </p>
              <p className="twin-muted text-xs">{t("executiveProductProof.launchDetail")}</p>
              <p className="text-xs font-medium text-rose-200/90">{t("executiveProductProof.p0Open")}</p>
            </>,
          )}

          {sectionCard(
            EXECUTIVE_PRODUCT_PROOF_MARKERS.demoLinks,
            t("executiveProductProof.demoLinksTitle"),
            <>
              <p className="twin-muted text-xs">{t("executiveProductProof.demoLinksLead")}</p>
              <ul className="flex flex-wrap gap-2">
                {EXECUTIVE_PRODUCT_PROOF_DEMO_LINKS.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="twin-link inline-block rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs font-medium"
                      data-testid={`executive-product-proof-link-${link.id}`}
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>,
            "lg:col-span-2",
          )}

          {sectionCard(
            EXECUTIVE_PRODUCT_PROOF_MARKERS.humanDecisioning,
            t("executiveProductProof.humanTitle"),
            <>
              <p className="text-sm">{t("executiveProductProof.humanBody")}</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>· {t("executiveProductProof.humanPoint1")}</li>
                <li>· {t("executiveProductProof.humanPoint2")}</li>
                <li>· {t("executiveProductProof.humanPoint3")}</li>
              </ul>
            </>,
          )}

          {sectionCard(
            EXECUTIVE_PRODUCT_PROOF_MARKERS.boundaryProof,
            t("executiveProductProof.boundaryTitle"),
            <>
              <p className="twin-muted text-xs">{t("executiveProductProof.boundaryLead")}</p>
              <ul className="space-y-1 text-xs">
                <li>· {t("executiveProductProof.boundaryNoOutreach")}</li>
                <li>· {t("executiveProductProof.boundaryNoAutoApply")}</li>
                <li>· {t("executiveProductProof.boundaryNoAtsSync")}</li>
                <li>· {t("executiveProductProof.boundaryDraftOnly")}</li>
              </ul>
            </>,
          )}

          {sectionCard(
            EXECUTIVE_PRODUCT_PROOF_MARKERS.riskRegister,
            t("executiveProductProof.riskTitle"),
            <>
              <p className="twin-muted text-xs">{t("executiveProductProof.riskLead")}</p>
              <ul className="space-y-2">
                {risks.map((risk) => (
                  <li key={risk.id} className={`rounded-lg border px-3 py-2 ${severityTone(risk.severity)}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{risk.title}</span>
                      <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] uppercase">
                        {risk.severity}
                      </span>
                    </div>
                    <p className="twin-muted mt-1 text-xs">{risk.mitigation}</p>
                  </li>
                ))}
              </ul>
            </>,
            "lg:col-span-2",
          )}

          {sectionCard(
            EXECUTIVE_PRODUCT_PROOF_MARKERS.milestones,
            t("executiveProductProof.milestonesTitle"),
            <>
              <p className="twin-muted text-xs">{t("executiveProductProof.milestonesLead")}</p>
              <ul className="space-y-2">
                {milestones.map((ms) => (
                  <li key={ms.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="font-medium">{ms.title}</span>
                    <span className="twin-muted">· {ms.target}</span>
                    <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] uppercase">
                      {ms.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            </>,
            "lg:col-span-2",
          )}
        </div>
      </div>
    </Shell>
  );
}

export function assertExecutiveProductProofCopySafe(blob: string): void {
  for (const pattern of EXECUTIVE_PRODUCT_PROOF_FORBIDDEN_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error(`Forbidden pattern ${pattern} in executive product proof surfaces`);
    }
  }
}
