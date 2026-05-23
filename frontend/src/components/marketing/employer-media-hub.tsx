"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import {
  EMPLOYER_ASSET_IDS,
  EMPLOYER_AWARD_IDS,
  EMPLOYER_CONTENT_HUB_IDS,
  EMPLOYER_GALLERY_CULTURE_IDS,
  EMPLOYER_GALLERY_OFFICE_IDS,
  EMPLOYER_PRESS_IDS,
  EMPLOYER_ROLE_IDS,
  EMPLOYER_STAT_IDS,
  EMPLOYER_THUMB_CLASS,
  EMPLOYER_VIDEO_IDS,
} from "@/lib/employer-media-demo";

type TabId = "overview" | "media" | "roles";

const VIDEO_MINUTES: Record<(typeof EMPLOYER_VIDEO_IDS)[number], number> = {
  lifeAt: 4,
  engineering: 6,
  product: 5,
  graduates: 3,
  belonging: 4,
  sustainability: 5,
};

const ROLE_REMOTE: Partial<Record<(typeof EMPLOYER_ROLE_IDS)[number], boolean>> = {
  seniorMl: true,
  productLead: true,
};

function SectionHeading({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="mb-4">
      <h2 className="text-lg font-semibold text-[var(--foreground)] sm:text-xl">{title}</h2>
      {lead ? <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">{lead}</p> : null}
    </header>
  );
}

const STAT_ROWS: { id: (typeof EMPLOYER_STAT_IDS)[number]; valueKey: keyof typeof import("@/lib/employer-media-messages").EMPLOYER_MEDIA_MESSAGES_EN; labelKey: keyof typeof import("@/lib/employer-media-messages").EMPLOYER_MEDIA_MESSAGES_EN }[] = [
  { id: "employees", valueKey: "statEmployees", labelKey: "statEmployeesLabel" },
  { id: "countries", valueKey: "statCountries", labelKey: "statCountriesLabel" },
  { id: "offices", valueKey: "statOffices", labelKey: "statOfficesLabel" },
  { id: "openRoles", valueKey: "statOpenRoles", labelKey: "statOpenRolesLabel" },
];

function StatStrip() {
  const { t } = useTranslation();
  const stats = useMemo(
    () =>
      STAT_ROWS.map((row) => ({
        id: row.id,
        value: t(`employerMedia.${row.valueKey}`),
        label: t(`employerMedia.${row.labelKey}`),
      })),
    [t],
  );

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.id}
          className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-4 py-3 text-center"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--twin-muted)]">{s.label}</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums text-[var(--twin-accent)]">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function VideoGrid() {
  const { t } = useTranslation();
  return (
    <section>
      <SectionHeading title={t("employerMedia.sectionVideos")} lead={t("employerMedia.sectionVideosLead")} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EMPLOYER_VIDEO_IDS.map((id) => (
          <li key={id}>
            <button
              type="button"
              className="group twin-touch-target w-full overflow-hidden rounded-xl border border-[var(--twin-border)] text-left transition hover:border-[var(--twin-accent)]/50"
              aria-label={t(`employerMedia.video${cap(id)}Title` as "employerMedia.videoLifeAtTitle")}
            >
              <div
                className={`relative flex aspect-video items-end bg-gradient-to-br p-4 ${EMPLOYER_THUMB_CLASS[id] ?? "from-slate-900 to-black"}`}
              >
                <span className="absolute inset-0 flex items-center justify-center text-4xl text-white/30" aria-hidden>
                  ▶
                </span>
                <span className="relative rounded bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                  {t("employerMedia.videoDuration").replace("{{min}}", String(VIDEO_MINUTES[id]))}
                </span>
              </div>
              <div className="border-t border-[var(--twin-border)] bg-[var(--twin-card)] p-3">
                <p className="font-semibold text-[var(--foreground)]">
                  {t(`employerMedia.video${cap(id)}Title` as "employerMedia.videoLifeAtTitle")}
                </p>
                <p className="mt-0.5 text-xs text-[var(--twin-muted-strong)]">
                  {t(`employerMedia.video${cap(id)}Desc` as "employerMedia.videoLifeAtDesc")}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PressList() {
  const { t } = useTranslation();
  return (
    <section>
      <SectionHeading title={t("employerMedia.sectionPress")} lead={t("employerMedia.sectionPressLead")} />
      <ul className="space-y-2">
        {EMPLOYER_PRESS_IDS.map((id) => (
          <li key={id}>
            <div className="flex flex-col gap-2 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--twin-accent)]">
                  {t(`employerMedia.press${cap(id)}Outlet` as "employerMedia.pressReutersOutlet")}
                </p>
                <p className="mt-1 font-semibold text-[var(--foreground)]">
                  {t(`employerMedia.press${cap(id)}Title` as "employerMedia.pressReutersTitle")}
                </p>
                <p className="mt-0.5 text-sm text-[var(--twin-muted-strong)]">
                  {t(`employerMedia.press${cap(id)}Desc` as "employerMedia.pressReutersDesc")}
                </p>
              </div>
              <span className="twin-btn-secondary twin-touch-target shrink-0 !w-auto px-3 py-1.5 text-xs">
                {t("employerMedia.pressRead")}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GallerySection({
  title,
  ids,
  prefix,
}: {
  title: string;
  ids: readonly string[];
  prefix: "gallery";
}) {
  const { t } = useTranslation();
  return (
    <section>
      <SectionHeading title={title} />
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ids.map((id) => (
          <li key={id}>
            <div
              className={`flex aspect-[4/3] flex-col justify-end rounded-lg bg-gradient-to-br p-3 ${EMPLOYER_THUMB_CLASS[id] ?? "from-slate-800 to-black"}`}
            >
              <p className="text-xs font-medium leading-snug text-white/95">
                {t(`employerMedia.${prefix}${cap(id)}Caption` as "employerMedia.galleryWarsawCaption")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImpactCards() {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card variant="soft" className="!mb-0">
        <h3 className="text-sm font-semibold">{t("employerMedia.sectionLeadership")}</h3>
        <blockquote className="mt-3 border-l-2 border-[var(--twin-accent)] pl-3 text-sm italic text-[var(--twin-muted-strong)]">
          {t("employerMedia.leaderCeoQuote")}
        </blockquote>
        <p className="mt-3 text-xs font-semibold text-[var(--foreground)]">{t("employerMedia.leaderCeoName")}</p>
        <p className="text-xs text-[var(--twin-muted)]">{t("employerMedia.leaderCeoTitle")}</p>
      </Card>
      <Card variant="soft" className="!mb-0">
        <h3 className="text-sm font-semibold">{t("employerMedia.sectionDei")}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("employerMedia.deiBody")}</p>
      </Card>
      <Card variant="soft" className="!mb-0">
        <h3 className="text-sm font-semibold">{t("employerMedia.sectionSustainability")}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          {t("employerMedia.sustainabilityBody")}
        </p>
      </Card>
    </div>
  );
}

function AwardsGrid() {
  const { t } = useTranslation();
  return (
    <section>
      <SectionHeading title={t("employerMedia.sectionAwards")} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {EMPLOYER_AWARD_IDS.map((id) => (
          <li
            key={id}
            className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-accent-muted)]/30 px-4 py-3"
          >
            <p className="font-semibold text-[var(--foreground)]">
              {t(`employerMedia.award${cap(id)}Title` as "employerMedia.awardGreatPlaceTitle")}
            </p>
            <p className="mt-0.5 text-xs text-[var(--twin-muted-strong)]">
              {t(`employerMedia.award${cap(id)}Desc` as "employerMedia.awardGreatPlaceDesc")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContentHubRow() {
  const { t } = useTranslation();
  return (
    <section>
      <SectionHeading title={t("employerMedia.sectionContentHub")} />
      <ul className="grid gap-3 md:grid-cols-3">
        {EMPLOYER_CONTENT_HUB_IDS.map((id) => (
          <li key={id} className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] p-4">
            <p className="font-semibold">{t(`employerMedia.hub${cap(id)}Title` as "employerMedia.hubPodcastTitle")}</p>
            <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">
              {t(`employerMedia.hub${cap(id)}Desc` as "employerMedia.hubPodcastDesc")}
            </p>
            <span className="mt-3 inline-block text-xs font-medium text-[var(--twin-link)]">
              {t("employerMedia.contentOpen")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AssetsRow() {
  const { t } = useTranslation();
  return (
    <section>
      <SectionHeading title={t("employerMedia.sectionAssets")} lead={t("employerMedia.sectionAssetsLead")} />
      <ul className="flex flex-wrap gap-2">
        {EMPLOYER_ASSET_IDS.map((id) => (
          <li key={id}>
            <button
              type="button"
              className="twin-btn-secondary twin-touch-target !w-auto px-4 py-2 text-left text-sm"
              title={t(`employerMedia.asset${cap(id)}Desc` as "employerMedia.assetBrandGuidelinesDesc")}
            >
              <span className="block font-semibold">
                {t(`employerMedia.asset${cap(id)}Title` as "employerMedia.assetBrandGuidelinesTitle")}
              </span>
              <span className="mt-0.5 block text-[10px] font-normal text-[var(--twin-muted)]">
                {t("employerMedia.assetDownload")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RolesList({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <section>
      {!compact ? (
        <SectionHeading title={t("employerMedia.sectionRoles")} lead={t("employerMedia.sectionRolesLead")} />
      ) : null}
      <ul className="space-y-2">
        {EMPLOYER_ROLE_IDS.map((id) => (
          <li
            key={id}
            className="flex flex-col gap-2 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-[var(--foreground)]">
                {t(`employerMedia.role${cap(id)}Title` as "employerMedia.roleStaffPlatformTitle")}
              </p>
              <p className="text-xs text-[var(--twin-muted)]">
                {t(`employerMedia.role${cap(id)}Team` as "employerMedia.roleStaffPlatformTeam")} ·{" "}
                {t(`employerMedia.role${cap(id)}Location` as "employerMedia.roleStaffPlatformLocation")}
              </p>
              <span className="mt-1 inline-block rounded bg-[var(--twin-surface-raised)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
                {ROLE_REMOTE[id] ? t("employerMedia.roleRemote") : t("employerMedia.roleOnsite")}
              </span>
            </div>
            <span className="twin-btn-solid twin-touch-target shrink-0 !w-auto px-3 py-1.5 text-xs">
              {t("employerMedia.roleApply")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OverviewTab() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <StatStrip />
      <Card variant="accent" className="!mb-0">
        <h2 className="text-lg font-semibold">{t("employerMedia.overviewMissionTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          {t("employerMedia.overviewMissionBody")}
        </p>
      </Card>
      <section className="space-y-3 text-sm">
        <h2 className="text-lg font-semibold">{t("employerMedia.overviewSnapshotTitle")}</h2>
        <p className="text-[var(--twin-muted-strong)]">{t("employerMedia.overviewFounded")}</p>
        <p className="text-[var(--twin-muted-strong)]">{t("employerMedia.overviewIndustries")}</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">{t("employerMedia.overviewHiringTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          {t("employerMedia.overviewHiringBody")}
        </p>
      </section>
      <RolesList compact />
    </div>
  );
}

export function EmployerMediaTabContent() {
  const { t } = useTranslation();
  return (
    <div className="space-y-10">
      <StatStrip />
      <VideoGrid />
      <PressList />
      <GallerySection title={t("employerMedia.sectionOffices")} ids={EMPLOYER_GALLERY_OFFICE_IDS} prefix="gallery" />
      <GallerySection title={t("employerMedia.sectionCulture")} ids={EMPLOYER_GALLERY_CULTURE_IDS} prefix="gallery" />
      <ImpactCards />
      <AwardsGrid />
      <ContentHubRow />
      <AssetsRow />
    </div>
  );
}

function cap(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function EmployerMediaHub({
  showPressKit = true,
  initialTab = "media",
  compactHeader = false,
}: {
  showPressKit?: boolean;
  initialTab?: TabId;
  compactHeader?: boolean;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>(initialTab);

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: t("employerMedia.tabOverview") },
    { id: "media", label: t("employerMedia.tabMedia") },
    { id: "roles", label: t("employerMedia.tabRoles") },
  ];

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-[var(--twin-accent)]/40 bg-[var(--twin-accent-muted)]/40 px-4 py-3 text-sm text-[var(--foreground)]">
        {t("employerMedia.demoBanner")}
      </p>

      <header className={compactHeader ? "space-y-1" : "space-y-2"}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {t("employerMedia.pageEyebrow")}
        </p>
        <h1 className={compactHeader ? "text-xl font-semibold" : "text-3xl font-bold tracking-tight sm:text-4xl"}>
          {t("employerMedia.pageTitle")}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--twin-muted-strong)] sm:text-base">{t("employerMedia.pageTagline")}</p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-[var(--twin-border)] pb-3" role="tablist" aria-label={t("employerMedia.pageEyebrow")}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`twin-touch-target rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? "bg-[var(--twin-accent-muted)] text-[var(--twin-accent)]"
                : "text-[var(--twin-muted)] hover:bg-[var(--twin-surface-raised)]"
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div role="tabpanel">
        {tab === "overview" ? <OverviewTab /> : null}
        {tab === "media" ? <EmployerMediaTabContent /> : null}
        {tab === "roles" ? <RolesList /> : null}
      </div>

      {showPressKit ? (
        <Card variant="soft" className="!mb-0 mt-8">
          <h2 className="text-base font-semibold">{t("employerMedia.pressKitTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">{t("employerMedia.pressKitLead")}</p>
          <p className="mt-3">
            <Link href="/contact" className="twin-link text-sm font-medium">
              {t("employerMedia.pressKitLink")}
            </Link>
          </p>
        </Card>
      ) : null}
    </div>
  );
}
