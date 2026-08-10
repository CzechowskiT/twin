"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken, logoutSession } from "@/lib/auth";
import { issueStepUpToken, stepUpHeaders, type StepUpPurpose } from "@/lib/step-up";
import { WorkspaceHandoffBanner } from "@/components/candidate/workspace-handoff-banner";
import {
  disableMfa,
  fetchMfaStatus,
  presentMfaRecoveryCodes,
  startMfaEnroll,
  verifyMfaEnroll,
} from "@/lib/mfa";

type AccessItem = {
  access_key: string;
  kind: string;
  group: string;
  title: string;
  scope: string;
  state: string;
  revocable: boolean;
  revision: string;
  expires_at?: string | null;
  consequence: string;
};

type Inventory = {
  items?: AccessItem[];
  groups?: Record<string, AccessItem[]>;
  unavailable_sources?: string[];
};

const GROUP_ORDER = [
  "connected_services",
  "private_links_and_feeds",
  "temporary_files",
] as const;

type StepUpPrompt = {
  purpose: StepUpPurpose;
  onToken: (token: string) => Promise<void>;
};

function MfaOptInPanel({ onChanged }: { onChanged: () => void }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"idle" | "secret" | "verify" | "codes">("idle");
  const [secretHint, setSecretHint] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetchMfaStatus()
      .then((s) => setEnabled(Boolean(s.enabled)))
      .catch(() => undefined);
  }, []);

  async function enroll() {
    setBusy(true);
    setErr(null);
    try {
      const started = await startMfaEnroll(password);
      setSecretHint(started.otpauth_uri_once ? "otpauth://…" : "secret-ready");
      setPhase("verify");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("accessCenter.error"));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setErr(null);
    try {
      await verifyMfaEnroll(code);
      const presented = await presentMfaRecoveryCodes();
      setCodes(presented.recovery_codes_once || []);
      setPhase("codes");
      setEnabled(true);
      onChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("accessCenter.error"));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setErr(null);
    try {
      await disableMfa(password);
      setEnabled(false);
      setPhase("idle");
      setCodes(null);
      onChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("accessCenter.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <Label>{t("accessCenter.stepUpPassword")}</Label>
      <Input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {!enabled ? (
        <>
          {phase === "idle" || phase === "secret" ? (
            <Button type="button" disabled={busy || !password} onClick={() => void enroll()}>
              {t("accessCenter.mfaEnroll")}
            </Button>
          ) : null}
          {phase === "verify" ? (
            <>
              {secretHint ? (
                <p className="text-xs text-[var(--twin-muted)]" data-mfa-secret-ready>
                  Authenticator setup ready (URI/secret delivered once — not re-shown).
                </p>
              ) : null}
              <Label>{t("login.mfaCode")}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
              <Button type="button" disabled={busy || !code} onClick={() => void verify()}>
                {t("login.mfaSubmit")}
              </Button>
            </>
          ) : null}
          {phase === "codes" && codes ? (
            <div data-mfa-recovery-codes-once>
              <p className="text-sm">{t("accessCenter.mfaCodesOnce")}</p>
              <p className="text-xs text-[var(--twin-muted)]">{codes.length} codes issued (values not logged).</p>
            </div>
          ) : null}
        </>
      ) : (
        <Button type="button" disabled={busy || !password} onClick={() => void turnOff()}>
          {t("accessCenter.mfaDisable")}
        </Button>
      )}
      {err ? (
        <p className="text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}

export function AccessControlCenterWorkspace() {
  const { t } = useTranslation();
  const router = useRouter();
  const [inv, setInv] = useState<Inventory | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [stepUp, setStepUp] = useState<StepUpPrompt | null>(null);
  const [stepPassword, setStepPassword] = useState("");
  const [stepBusy, setStepBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Inventory>(
        "/api/v1/candidates/me/access-inventory",
        {},
        token,
      );
      setInv(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("accessCenter.error"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function runWithStepUp(purpose: StepUpPurpose, onToken: (tok: string) => Promise<void>) {
    setStepUp({ purpose, onToken });
    setStepPassword("");
  }

  async function submitStepUp() {
    if (!stepUp) return;
    setStepBusy(true);
    setErr(null);
    try {
      const once = await issueStepUpToken(stepUp.purpose, stepPassword);
      await stepUp.onToken(once);
      setStepUp(null);
      setStepPassword("");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("accessCenter.error"));
    } finally {
      setStepBusy(false);
    }
  }

  async function revoke(item: AccessItem) {
    const token = getToken();
    if (!token) return;
    if (!item.revocable) {
      setErr(t("accessCenter.notRevocable"));
      return;
    }
    if (confirmKey !== item.access_key) {
      setConfirmKey(item.access_key);
      return;
    }

    const doRevoke = async (stepTok?: string) => {
      setBusyKey(item.access_key);
      try {
        await apiFetch(
          "/api/v1/candidates/me/access-inventory/revoke",
          {
            method: "POST",
            headers: stepTok ? stepUpHeaders(stepTok) : {},
            body: JSON.stringify({
              access_key: item.access_key,
              kind: item.kind,
              client_revision: item.revision,
              confirm: true,
            }),
          },
          token,
        );
        setConfirmKey(null);
        await load();
      } catch (ex) {
        const msg = ex instanceof Error ? ex.message : t("accessCenter.error");
        setErr(msg.includes("revision") ? t("accessCenter.revisionStale") : msg);
      } finally {
        setBusyKey(null);
      }
    };

    if (item.kind === "PENDING_RECOVERY") {
      await runWithStepUp("CANCEL_RECOVERY", doRevoke);
      return;
    }
    await doRevoke();
  }

  function groupLabel(g: string): string {
    if (g === "connected_services") return t("accessCenter.groupConnected");
    if (g === "private_links_and_feeds") return t("accessCenter.groupLinks");
    return t("accessCenter.groupTemp");
  }

  function revokeLabel(item: AccessItem): string {
    if (item.kind === "PENDING_RECOVERY") return t("accessCenter.cancelRecovery");
    return confirmKey === item.access_key
      ? t("accessCenter.confirmRevoke")
      : t("accessCenter.revoke");
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("accessCenter.nav")} />
      <main
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8"
        data-access-control-center
        data-auth-recovery-center
      >
        <div>
          <Link href="/dashboard/privacy-center" className="text-sm underline">
            {t("accessCenter.backPrivacy")}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">{t("accessCenter.title")}</h1>
          <p className="mt-2 text-sm text-[var(--twin-muted)]">{t("accessCenter.lead")}</p>
          <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("accessCenter.noTracking")}</p>
          <p className="text-xs text-[var(--twin-muted)]">{t("accessCenter.noSecrets")}</p>
          <p className="text-xs text-[var(--twin-muted)]">{t("accessCenter.notFirstValue")}</p>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("accessCenter.sessionsNote")}</p>
          <p className="mt-2 text-sm text-[var(--twin-muted)]">{t("accessCenter.recoveryLead")}</p>
          <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("accessCenter.pendingRecoveryNote")}</p>
          <Link href="/forgot-password" className="text-sm underline">
            {t("accessCenter.recoveryLink")}
          </Link>
          <div className="mt-4 rounded border border-[var(--twin-border)] p-3" data-mfa-opt-in>
            <h2 className="text-base font-medium">{t("accessCenter.mfaTitle")}</h2>
            <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("accessCenter.mfaLead")}</p>
            <p className="text-xs text-[var(--twin-muted)]">{t("accessCenter.mfaNotFirstValue")}</p>
            <MfaOptInPanel onChanged={() => void load()} />
          </div>
          <div className="mt-3">
            <Button
              type="button"
              data-auth-sign-out-everywhere
              onClick={() => {
                void runWithStepUp("SIGN_OUT_EVERYWHERE", async (stepTok) => {
                  await logoutSession({ everywhere: true, stepUpToken: stepTok });
                  router.replace("/login");
                });
              }}
            >
              {t("accessCenter.signOutEverywhere")}
            </Button>
          </div>
        </div>
        <WorkspaceHandoffBanner expectedDestRouteKey="access_center" />
        {stepUp ? (
          <Card data-step-up-prompt>
            <h2 className="text-lg font-medium">{t("accessCenter.stepUpTitle")}</h2>
            <p className="mt-1 text-sm text-[var(--twin-muted)]">{t("accessCenter.stepUpLead")}</p>
            <Label>{t("accessCenter.stepUpPassword")}</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={stepPassword}
              onChange={(e) => setStepPassword(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <Button type="button" disabled={stepBusy || !stepPassword} onClick={() => void submitStepUp()}>
                {t("accessCenter.stepUpConfirm")}
              </Button>
              <Button
                type="button"
                disabled={stepBusy}
                onClick={() => {
                  setStepUp(null);
                  setStepPassword("");
                }}
              >
                {t("accessCenter.stepUpCancel")}
              </Button>
            </div>
          </Card>
        ) : null}
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {!inv && !err ? (
          <p className="text-sm text-[var(--twin-muted)]">{t("accessCenter.loading")}</p>
        ) : null}
        {inv?.unavailable_sources && inv.unavailable_sources.length > 0 ? (
          <p className="text-sm text-amber-800">{t("accessCenter.unavailable")}</p>
        ) : null}
        {GROUP_ORDER.map((g) => {
          const items = (inv?.groups?.[g] || []).filter((i) =>
            ["ACTIVE", "AVAILABLE", "OPEN", "PROCESSING"].includes(i.state),
          );
          return (
            <Card key={g} data-access-group={g}>
              <h2 className="mb-3 text-lg font-medium">{groupLabel(g)}</h2>
              {items.length === 0 ? (
                <p className="text-sm text-[var(--twin-muted)]">{t("accessCenter.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {items.map((item) => (
                    <li
                      key={item.access_key}
                      className="border-t border-[var(--twin-border)] pt-3 first:border-0 first:pt-0"
                      data-access-key={item.access_key}
                      data-access-kind={item.kind}
                    >
                      <div className="font-medium">{item.title}</div>
                      <dl className="mt-1 grid gap-1 text-sm text-[var(--twin-muted)]">
                        <div>
                          <dt className="inline">{t("accessCenter.scope")}: </dt>
                          <dd className="inline">{item.scope}</dd>
                        </div>
                        <div>
                          <dt className="inline">{t("accessCenter.state")}: </dt>
                          <dd className="inline">{item.state}</dd>
                        </div>
                        {item.expires_at ? (
                          <div>
                            <dt className="inline">{t("accessCenter.expires")}: </dt>
                            <dd className="inline">{item.expires_at}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="inline">{t("accessCenter.consequence")}: </dt>
                          <dd className="inline">{item.consequence}</dd>
                        </div>
                      </dl>
                      {item.revocable ? (
                        <Button
                          type="button"
                          className="mt-2"
                          disabled={busyKey === item.access_key}
                          onClick={() => void revoke(item)}
                        >
                          {revokeLabel(item)}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </main>
    </Shell>
  );
}
