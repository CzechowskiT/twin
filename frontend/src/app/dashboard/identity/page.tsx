"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type KycConfigured = { configured: boolean };

type KycStatus = {
  identity_verified_at: string | null;
  latest_conversation_id: string | null;
  conversation_status: string | null;
  identity_status: string | null;
};

type StartResp = { redirect_url: string; conversation_id: string };

function IdentityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const syncedConv = useRef<string | null>(null);
  const [token, setTok] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identityProviderConsent, setIdentityProviderConsent] = useState(false);

  const load = useCallback(async (t0: string) => {
    const [cfg, st] = await Promise.all([
      apiFetch<KycConfigured>("/api/v1/kyc/authologic/configured"),
      apiFetch<KycStatus>("/api/v1/kyc/status", {}, t0),
    ]);
    setConfigured(cfg.configured);
    setStatus(st);
  }, []);

  useEffect(() => {
    const t0 = getToken();
    if (!t0) {
      router.replace("/login");
      return;
    }
    queueMicrotask(() => {
      setTok(t0);
      void load(t0).catch(() => {
        setConfigured(false);
        setError("identity_error");
      });
    });
  }, [router, load]);

  useEffect(() => {
    const conv = searchParams.get("conversation");
    if (!conv || !token || configured !== true) return;
    if (syncedConv.current === conv) return;
    syncedConv.current = conv;
    queueMicrotask(() => {
      setBusy("sync");
      setError(null);
      void apiFetch<KycStatus>(
        "/api/v1/kyc/authologic/sync",
        { method: "POST", body: JSON.stringify({ conversation_id: conv }) },
        token,
      )
        .then(setStatus)
        .catch(() => setError("identity_error"))
        .finally(() => setBusy(null));
    });
  }, [searchParams, token, configured]);

  async function onStart() {
    if (!token || configured !== true) return;
    if (!identityProviderConsent) {
      setError("consent_required");
      return;
    }
    setBusy("start");
    setError(null);
    try {
      const res = await apiFetch<StartResp>(
        "/api/v1/kyc/authologic/start",
        {
          method: "POST",
          body: JSON.stringify({ identity_provider_processing_consent: true }),
        },
        token,
      );
      window.location.assign(res.redirect_url);
    } catch {
      setError("identity_error");
    } finally {
      setBusy(null);
    }
  }

  async function onSync() {
    if (!token || !status?.latest_conversation_id || configured !== true) return;
    setBusy("sync");
    setError(null);
    try {
      setStatus(
        await apiFetch<KycStatus>(
          "/api/v1/kyc/authologic/sync",
          { method: "POST", body: JSON.stringify({ conversation_id: status.latest_conversation_id }) },
          token,
        ),
      );
    } catch {
      setError("identity_error");
    } finally {
      setBusy(null);
    }
  }

  const pilotUnavailable = configured === false;
  const actionsDisabled = configured !== true || busy !== null;

  if (!token) return null;

  return (
    <Shell wide rail>
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("dashboard.identityPageTitle")}</h1>
          <p className="twin-muted mt-2 max-w-prose text-sm leading-relaxed">{t("dashboard.identityPageLead")}</p>
        </div>
        <CandidateWorkspaceSubnav ariaLabel={t("dashboard.identityPageTitle")} />
      </div>

      <Link href="/dashboard" className="twin-link twin-touch-target mb-4 inline-block text-sm">
        ← {t("dashboard.title")}
      </Link>

      {configured === null ? (
        <Card>
          <p className="twin-muted text-sm">{t("dashboard.identityLoading")}</p>
        </Card>
      ) : null}

      {pilotUnavailable ? (
        <Card variant="soft" className="mb-6 border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">{t("dashboard.identityPilotNotice")}</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90">
            {t("dashboard.identityNotConfigured")}
          </p>
        </Card>
      ) : null}

      {error === "consent_required" ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{t("dashboard.identityProviderConsentRequired")}</p>
      ) : null}
      {error === "identity_error" ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{t("dashboard.identityError")}</p>
      ) : null}

      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium">
              {status?.identity_verified_at
                ? t("dashboard.identityVerified")
                : t("dashboard.identityNotVerified")}
            </p>
            {status?.latest_conversation_id ? (
              <p className="twin-muted mt-1 font-mono text-xs break-all">
                {t("dashboard.identityConversation")}: {status.latest_conversation_id}
              </p>
            ) : null}
            {status?.conversation_status ? (
              <p className="twin-muted mt-1 text-xs">
                {status.conversation_status}
                {status.identity_status ? ` · ${status.identity_status}` : ""}
              </p>
            ) : null}
          </div>

          <label
            className={`flex items-start gap-3 text-sm ${pilotUnavailable ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              checked={identityProviderConsent}
              disabled={pilotUnavailable}
              onChange={(e) => {
                setIdentityProviderConsent(e.target.checked);
                if (e.target.checked) setError(null);
              }}
              className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--twin-border)] disabled:cursor-not-allowed"
            />
            <span>
              <span className="font-medium text-[var(--foreground)]">{t("dashboard.identityProviderConsentLabel")}</span>
              <span className="twin-muted mt-1 block text-xs">{t("dashboard.identityProviderConsentHint")}</span>
            </span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="twin-touch-target"
              disabled={actionsDisabled || !identityProviderConsent}
              onClick={() => void onStart()}
            >
              {busy === "start" ? "…" : t("dashboard.identityStart")}
            </Button>
            <Button
              type="button"
              className="twin-touch-target twin-btn-secondary !text-[var(--twin-fg)]"
              disabled={actionsDisabled || !status?.latest_conversation_id}
              onClick={() => void onSync()}
            >
              {busy === "sync" ? "…" : t("dashboard.identitySync")}
            </Button>
          </div>
        </div>
        {configured === true ? (
          <p className="twin-muted mt-4 text-xs">{t("dashboard.identityRedirectHint")}</p>
        ) : null}
      </Card>
    </Shell>
  );
}

export default function IdentityPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <Shell wide rail>
          <Card>
            <p className="twin-muted text-sm">{t("dashboard.identityLoading")}</p>
          </Card>
        </Shell>
      }
    >
      <IdentityPageContent />
    </Suspense>
  );
}
