"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";
import {
  buildInvestorDataRoomMailto,
  githubDocHref,
  INVESTOR_DATA_ROOM_CONFIDENTIAL_SLOTS,
  INVESTOR_DATA_ROOM_LIVE_SURFACE_IDS,
  INVESTOR_DATA_ROOM_PUBLIC_DOCS,
  INVESTOR_DATA_ROOM_VISUAL_MARKERS,
} from "@/lib/investor-data-room-request-access";
import { DATA_ROOM_INVITE_ONLY_PREVIEW } from "@/lib/seven-day-d5-investor";
import { getPublicApiBase } from "@/lib/public-api-base";
import { InvestorDataRoomLivePanel } from "@/components/investor/investor-data-room-live-panel";

const DOC_LABEL_KEY: Record<(typeof INVESTOR_DATA_ROOM_PUBLIC_DOCS)[number]["id"], TranslationKey> = {
  dueDiligencePack: "investorDataRoom.docDueDiligencePack",
  demoRunbook: "investorDataRoom.docDemoRunbook",
  placementVerification: "investorDataRoom.docPlacementVerification",
  qaTop10: "investorDataRoom.docQaTop10",
};

const LIVE_LABEL_KEY: Record<(typeof INVESTOR_DATA_ROOM_LIVE_SURFACE_IDS)[number], TranslationKey> = {
  metrics: "investorDataRoom.liveMetrics",
  status: "investorDataRoom.liveStatus",
  calculator: "investorDataRoom.liveCalculator",
  openApi: "investorDataRoom.liveOpenApi",
};

const CONFIDENTIAL_LABEL_KEY: Record<(typeof INVESTOR_DATA_ROOM_CONFIDENTIAL_SLOTS)[number], TranslationKey> = {
  cap: "investorDataRoom.confidentialCap",
  fin: "investorDataRoom.confidentialFin",
  legal: "investorDataRoom.confidentialLegal",
};

function liveSurfaceHref(id: (typeof INVESTOR_DATA_ROOM_LIVE_SURFACE_IDS)[number], openApiUrl: string) {
  switch (id) {
    case "metrics":
      return { href: "/investor/metrics", external: false };
    case "status":
      return { href: "/status", external: false };
    case "calculator":
      return { href: "/investor/calculator", external: false };
    case "openApi":
      return { href: openApiUrl, external: true };
    default:
      return { href: "/investor", external: false };
  }
}

export function InvestorDataRoomPanel() {
  const { t } = useTranslation();
  const apiBase = getPublicApiBase();
  const openApiUrl = apiBase ? `${apiBase}/openapi.json` : "/api/v1/openapi.json";

  const mailtoHref = useMemo(
    () =>
      buildInvestorDataRoomMailto({
        subject: t("investorDataRoom.mailtoSubject"),
        body: t("investorDataRoom.mailtoBody"),
      }),
    [t],
  );

  return (
    <div className="space-y-8">
      {DATA_ROOM_INVITE_ONLY_PREVIEW ? (
        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid="seven-day-investor-data-room-invite-boundary"
          data-seven-day-investor-data-room-invite-boundary
        >
          <h2 className="text-lg font-semibold">{t("sevenDayD5.dataRoomBoundaryTitle")}</h2>
          <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">{t("sevenDayD5.dataRoomBoundaryBody")}</p>
        </Card>
      ) : null}
      <InvestorDataRoomLivePanel />
      <Card variant="soft" className="p-5 sm:p-6" data-testid={INVESTOR_DATA_ROOM_VISUAL_MARKERS.transparencyBanner}>
        <h2 className="text-lg font-semibold">{t("investorDataRoom.transparencyTitle")}</h2>
        <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">{t("investorDataRoom.transparencyBody")}</p>
      </Card>

      <section data-testid={INVESTOR_DATA_ROOM_VISUAL_MARKERS.publicDocs}>
        <h2 className="text-lg font-semibold">{t("investorDataRoom.publicDocsTitle")}</h2>
        <p className="twin-muted mt-1 max-w-2xl text-sm">{t("investorDataRoom.publicDocsLead")}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {INVESTOR_DATA_ROOM_PUBLIC_DOCS.map((doc) => (
            <li key={doc.id}>
              <a
                href={githubDocHref(doc.path)}
                className="twin-link block rounded-lg border border-[var(--twin-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--twin-accent-muted)]/40"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(DOC_LABEL_KEY[doc.id])} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid={INVESTOR_DATA_ROOM_VISUAL_MARKERS.liveSurfaces}>
        <h2 className="text-lg font-semibold">
          {DATA_ROOM_INVITE_ONLY_PREVIEW ? t("sevenDayD5.dataRoomVerifySurfacesTitle") : t("investorDataRoom.liveSurfacesTitle")}
        </h2>
        <p className="twin-muted mt-1 max-w-2xl text-sm">
          {DATA_ROOM_INVITE_ONLY_PREVIEW ? t("sevenDayD5.dataRoomVerifySurfacesLead") : t("investorDataRoom.liveSurfacesLead")}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {INVESTOR_DATA_ROOM_LIVE_SURFACE_IDS.map((id) => {
            const { href, external } = liveSurfaceHref(id, openApiUrl);
            const label = t(LIVE_LABEL_KEY[id]);
            return (
              <li key={id}>
                {external ? (
                  <a
                    href={href}
                    className="twin-link block rounded-lg border border-[var(--twin-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--twin-accent-muted)]/40"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {label} ↗
                  </a>
                ) : (
                  <Link href={href} className="block rounded-lg border border-[var(--twin-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--twin-accent-muted)]/40">
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section data-testid={INVESTOR_DATA_ROOM_VISUAL_MARKERS.confidential}>
        <h2 className="text-lg font-semibold">{t("investorDataRoom.confidentialTitle")}</h2>
        <p className="twin-muted mt-1 max-w-2xl text-sm">{t("investorDataRoom.confidentialLead")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {INVESTOR_DATA_ROOM_CONFIDENTIAL_SLOTS.map((slot) => (
            <Card key={slot} variant="soft" className="p-4 opacity-90">
              <p className="text-sm font-medium">{t(CONFIDENTIAL_LABEL_KEY[slot])}</p>
              <p className="twin-muted mt-2 text-xs">{t("investorDataRoom.confidentialPlaceholderNote")}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4" data-testid={INVESTOR_DATA_ROOM_VISUAL_MARKERS.founderContact}>
        <div>
          <h2 className="text-lg font-semibold">{t("investorDataRoom.founderTitle")}</h2>
          <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("investorDataRoom.founderLead")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={mailtoHref}
            className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-[var(--twin-cta)] px-5 text-sm font-semibold text-[var(--twin-on-cta)]"
            data-testid={INVESTOR_DATA_ROOM_VISUAL_MARKERS.requestAccessCta}
          >
            {t("investorDataRoom.requestAccessCta")}
          </a>
          <Link
            href="/contact"
            className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-[var(--twin-border)] px-5 text-sm font-semibold hover:bg-[var(--twin-accent-muted)]/30"
          >
            {t("investorDataRoom.contactFormCta")}
          </Link>
        </div>
      </section>

      <Link href="/workspace/investor" className="twin-link text-sm font-medium">
        ← {t("investorDataRoom.backInvestor")}
      </Link>
    </div>
  );
}
