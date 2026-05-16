"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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
        setError(t("dashboard.identityError"));
      });
    });
  }, [router, load, t]);

  useEffect(() => {
    const conv = searchParams.get("conversation");
    if (!conv || !token) return;
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
        .catch((e) => setError(e instanceof Error ? e.message : t("dashboard.identityError")))
        .finally(() => setBusy(null));
    });
  }, [searchParams, token, t]);

  async function onStart() {
    if (!token) return;
    setBusy("start");
    setError(null);
    try {
      const res = await apiFetch<StartResp>("/api/v1/kyc/authologic/start", { method: "POST" }, token);
      window.location.assign(res.redirect_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboard.identityError"));
    } finally {
      setBusy(null);
    }
  }

  async function onSync() {
    if (!token || !status?.latest_conversation_id) return;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboard.identityError"));
    } finally {
      setBusy(null);
    }
  }

  if (!token) return null;

  return (
    <Shell wide>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("dashboard.identityPageTitle")}</h1>
        <Link href="/dashboard" className="twin-link twin-touch-target text-sm">
          ← {t("dashboard.title")}
        </Link>
      </div>

      <Card variant="accent" className="mb-6">
        <p className="twin-muted text-sm leading-relaxed">{t("dashboard.identityPageLead")}</p>
        {configured === false ? (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{t("dashboard.identityNotConfigured")}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="twin-touch-target"
              disabled={!configured || busy !== null}
              onClick={() => void onStart()}
            >
              {busy === "start" ? "…" : t("dashboard.identityStart")}
            </Button>
            <Button
              type="button"
              className="twin-touch-target twin-btn-secondary !text-[var(--twin-fg)]"
              disabled={!configured || !status?.latest_conversation_id || busy !== null}
              onClick={() => void onSync()}
            >
              {busy === "sync" ? "…" : t("dashboard.identitySync")}
            </Button>
          </div>
        </div>
        <p className="twin-muted mt-4 text-xs">{t("dashboard.identityRedirectHint")}</p>
      </Card>
    </Shell>
  );
}

export default function IdentityPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <Shell wide>
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
