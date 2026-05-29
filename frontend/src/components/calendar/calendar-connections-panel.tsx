"use client";

import type { ReactNode } from "react";

import {
  AppleCalendarIcon,
  GoogleCalendarIcon,
  MicrosoftCalendarIcon,
  OutlookCalendarIcon,
  PhoneCalendarIcon,
} from "@/components/calendar/calendar-brand-icons";
import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";
import { webcalToHttps } from "@/lib/webcal-subscribe";

type ProviderState = {
  connected: boolean;
  email: string | null;
  oauthConfigured: boolean;
};

type WebcalState = {
  url: string | null;
  expiresAt: string | null;
  linkCopied: boolean;
};

export type CalendarConnectionsPanelProps = {
  loading: boolean;
  googleStatusError?: boolean;
  microsoftStatusError?: boolean;
  actionBusy: string | null;
  google: ProviderState;
  microsoft: ProviderState;
  webcal: WebcalState;
  locale: string;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  onConnectMicrosoft: () => void;
  onDisconnectMicrosoft: () => void;
  onSubscribeWebcal: () => void;
  onCopyWebcalLink: () => void;
  onGenerateWebcalLink: () => void;
};

function StatusBadge({ connected }: { connected: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        connected
          ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
          : "bg-[var(--twin-surface-raised)] text-[var(--twin-muted-strong)]"
      }`}
    >
      {connected ? t("dashboard.calendarConnected") : t("dashboard.calendarNotConnected")}
    </span>
  );
}

function ProviderCardHeader({
  icon,
  title,
  badge,
}: {
  icon: ReactNode;
  title: string;
  badge: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">{badge}</div>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]">
          {icon}
        </span>
        <h3 className="min-w-0 text-base font-semibold leading-snug text-[var(--foreground)]">{title}</h3>
      </div>
    </div>
  );
}

function ProviderCard({
  icon,
  titleKey,
  bodyKey,
  provider,
  connectLabelKey,
  disconnectLabelKey,
  connectedAsKey,
  soonTitleKey,
  soonBodyKey,
  connectBusyKey,
  disconnectBusyKey,
  loading,
  statusError,
  actionBusy,
  onConnect,
  onDisconnect,
}: {
  icon: ReactNode;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  provider: ProviderState;
  connectLabelKey: TranslationKey;
  disconnectLabelKey: TranslationKey;
  connectedAsKey: TranslationKey;
  soonTitleKey: TranslationKey;
  soonBodyKey: TranslationKey;
  connectBusyKey: string;
  disconnectBusyKey: string;
  loading: boolean;
  statusError?: boolean;
  actionBusy: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const { t } = useTranslation();
  const connectBusy = actionBusy === connectBusyKey;
  const disconnectBusy = actionBusy === disconnectBusyKey;
  const anyBusy = Boolean(actionBusy);

  return (
    <Card className="!mb-0 flex h-full flex-col border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/60">
      <ProviderCardHeader icon={icon} title={t(titleKey)} badge={<StatusBadge connected={provider.connected} />} />
      <p className="twin-muted mt-2 flex-1 text-sm leading-relaxed">{t(bodyKey)}</p>
      {provider.connected && provider.email ? (
        <p className="mt-3 text-sm text-[var(--foreground)]">
          <span className="text-[var(--twin-muted-strong)]">{t(connectedAsKey)}:</span>{" "}
          <span className="font-medium">{provider.email}</span>
        </p>
      ) : null}
      {loading ? (
        <p className="twin-muted mt-4 text-sm">{t("dashboard.calendarConnectionsLoading")}</p>
      ) : statusError ? (
        <p className="mt-4 text-sm text-[var(--twin-muted-strong)]" role="alert">
          {t("dashboard.calendarConnectionsStatusError")}
        </p>
      ) : provider.connected ? (
        <Button
          type="button"
          className="twin-btn-secondary twin-touch-target mt-4 !w-auto self-start"
          disabled={anyBusy}
          onClick={onDisconnect}
        >
          {disconnectBusy ? "…" : t(disconnectLabelKey)}
        </Button>
      ) : !provider.oauthConfigured ? (
        <div className="mt-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 px-3 py-3">
          <p className="text-sm font-medium text-[var(--foreground)]">{t(soonTitleKey)}</p>
          <p className="twin-muted mt-1 text-sm leading-relaxed">{t(soonBodyKey)}</p>
        </div>
      ) : (
        <Button
          type="button"
          className="twin-touch-target mt-4 !w-auto self-start"
          disabled={anyBusy}
          onClick={onConnect}
        >
          {connectBusy ? "…" : t(connectLabelKey)}
        </Button>
      )}
    </Card>
  );
}

const OTHER_STEPS: {
  icon: (props: { className?: string }) => ReactNode;
  title: TranslationKey;
  body: TranslationKey;
}[] = [
  { icon: PhoneCalendarIcon, title: "dashboard.calendarOtherStep1Title", body: "dashboard.calendarOtherStep1Body" },
  { icon: AppleCalendarIcon, title: "dashboard.calendarOtherStep2Title", body: "dashboard.calendarOtherStep2Body" },
  { icon: OutlookCalendarIcon, title: "dashboard.calendarOtherStep3Title", body: "dashboard.calendarOtherStep3Body" },
];

export function CalendarConnectionsPanel({
  loading,
  googleStatusError,
  microsoftStatusError,
  actionBusy,
  google,
  microsoft,
  webcal,
  locale,
  onConnectGoogle,
  onDisconnectGoogle,
  onConnectMicrosoft,
  onDisconnectMicrosoft,
  onSubscribeWebcal,
  onCopyWebcalLink,
  onGenerateWebcalLink,
}: CalendarConnectionsPanelProps) {
  const { t } = useTranslation();

  return (
    <section className="mb-6" aria-labelledby="calendar-connections-heading">
      <div className="mb-4">
        <h2 id="calendar-connections-heading" className="text-lg font-semibold text-[var(--foreground)]">
          {t("dashboard.calendarConnectedAccountsTitle")}
        </h2>
        <p className="twin-muted mt-1 max-w-2xl text-sm leading-relaxed">
          {t("dashboard.calendarConnectedAccountsLead")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ProviderCard
          icon={<GoogleCalendarIcon className="h-5 w-5" />}
          titleKey="dashboard.calendarPathGoogleTitle"
          bodyKey="dashboard.calendarPathGoogleBody"
          provider={google}
          connectLabelKey="dashboard.calendarConnect"
          disconnectLabelKey="dashboard.calendarDisconnect"
          connectedAsKey="dashboard.calendarConnectedAs"
          soonTitleKey="dashboard.calendarGoogleSoon"
          soonBodyKey="dashboard.calendarGoogleSoonBody"
          connectBusyKey="connect"
          disconnectBusyKey="disconnect"
          loading={loading}
          statusError={googleStatusError}
          actionBusy={actionBusy}
          onConnect={onConnectGoogle}
          onDisconnect={onDisconnectGoogle}
        />
        <ProviderCard
          icon={<MicrosoftCalendarIcon className="h-5 w-5" />}
          titleKey="dashboard.calendarPathMicrosoftTitle"
          bodyKey="dashboard.calendarPathMicrosoftBody"
          provider={microsoft}
          connectLabelKey="dashboard.calendarConnectMicrosoft"
          disconnectLabelKey="dashboard.calendarDisconnectMicrosoft"
          connectedAsKey="dashboard.calendarMicrosoftConnectedAs"
          soonTitleKey="dashboard.calendarMicrosoftSoon"
          soonBodyKey="dashboard.calendarMicrosoftSoonBody"
          connectBusyKey="ms-connect"
          disconnectBusyKey="ms-disconnect"
          loading={loading}
          statusError={microsoftStatusError}
          actionBusy={actionBusy}
          onConnect={onConnectMicrosoft}
          onDisconnect={onDisconnectMicrosoft}
        />
      </div>

      <Card variant="accent" className="mt-4 border border-[var(--twin-border)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[var(--foreground)]">{t("dashboard.calendarPathOtherTitle")}</h3>
            <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("dashboard.calendarWebcalHint")}</p>
            <p className="twin-muted mt-2 text-xs leading-relaxed">{t("dashboard.calendarWebcalMacHint")}</p>
          </div>
          <Button
            type="button"
            className="twin-touch-target shrink-0 lg:!w-auto"
            disabled={Boolean(actionBusy)}
            onClick={onSubscribeWebcal}
          >
            {actionBusy === "webcal" ? "…" : t("dashboard.calendarAddToCalendar")}
          </Button>
        </div>

        <ol className="mt-6 list-none space-y-4 p-0">
          {OTHER_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flex gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] text-[var(--foreground)]"
                  aria-hidden
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <OtherCalendarStep index={index} titleKey={step.title} bodyKey={step.body} />
              </li>
            );
          })}
        </ol>

        <details className="mt-5 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/80 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
            {t("dashboard.calendarLinkAdvancedSummary")}
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="twin-btn-secondary twin-touch-target"
              disabled={Boolean(actionBusy)}
              onClick={onCopyWebcalLink}
            >
              {actionBusy === "webcal-copy" ? "…" : t("dashboard.calendarCopyLink")}
            </Button>
            <Button
              type="button"
              className="twin-btn-secondary twin-touch-target"
              disabled={Boolean(actionBusy)}
              onClick={onGenerateWebcalLink}
            >
              {actionBusy === "webcal-regen" ? "…" : t("dashboard.calendarWebcalGenerate")}
            </Button>
          </div>
          {webcal.linkCopied ? (
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">
              {t("dashboard.calendarLinkCopied")}
            </p>
          ) : null}
          {webcal.url ? <WebcalUrlPreview webcal={webcal} locale={locale} /> : null}
        </details>
      </Card>
    </section>
  );
}

function OtherCalendarStep({
  index,
  titleKey,
  bodyKey,
}: {
  index: number;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted)]">{index + 1}</p>
      <p className="text-sm font-medium text-[var(--foreground)]">{t(titleKey)}</p>
      <p className="twin-muted mt-0.5 text-sm leading-relaxed">{t(bodyKey)}</p>
    </div>
  );
}

function WebcalUrlPreview({ webcal, locale }: { webcal: WebcalState; locale: string }) {
  const { t } = useTranslation();
  if (!webcal.url) return null;
  return (
    <div className="mt-3 space-y-2">
      {webcal.expiresAt ? (
        <p className="text-xs text-[var(--twin-muted-strong)]">
          {t("dashboard.calendarWebcalExpires").replace(
            "{when}",
            new Date(webcal.expiresAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }),
          )}
        </p>
      ) : null}
      <label className="block text-xs font-medium text-[var(--foreground)]">
        {t("dashboard.calendarWebcalPreview")}
        <input
          readOnly
          value={webcalToHttps(webcal.url)}
          className="twin-input mt-1 w-full font-mono text-[11px]"
          onFocus={(e) => e.currentTarget.select()}
        />
      </label>
    </div>
  );
}
