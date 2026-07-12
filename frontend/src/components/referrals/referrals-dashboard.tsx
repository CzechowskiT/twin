"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  buildReferralShareUrl,
  CANDIDATE_REFERRALS_API_PATH,
  CANDIDATE_REFERRALS_ENSURE_CODE_PATH,
  CANDIDATE_REFERRALS_INVITE_PATH,
  type CandidateReferralItem,
  type CandidateReferralsData,
  referralStatusLabelKey,
} from "@/lib/candidate-referrals-api";
import type { TranslationKey } from "@/lib/i18n";

type ReferralPayout = {
  id: number;
  payout_type: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

type CashOutRequest = {
  id: number;
  amount_cents: number;
  payout_method: string;
  status: string;
  created_at: string;
};

type ReferralMe = {
  referral_public_token: string;
  share_example_path: string;
  referral_tier: string;
  qualified_referrals: number;
  referred_user_count: number;
  pending_earnings_cents: number;
  lifetime_earnings_cents: number;
  recent_payouts: ReferralPayout[];
};

type LeaderboardEntry = {
  rank: number;
  display_name: string;
  referral_tier: string;
  qualified_referrals: number;
  earnings_cents: number;
};

const PAYOUT_LABEL: Record<string, TranslationKey> = {
  first_payment: "referrals.payoutTypeFirst",
  retained_3m: "referrals.payoutTypeRetained",
  hired: "referrals.payoutTypeHired",
  milestone_10: "referrals.payoutTypeMilestone10",
  milestone_50: "referrals.payoutTypeMilestone50",
  milestone_100: "referrals.payoutTypeMilestone100",
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "PLN" }).format(cents / 100);
}

export function ReferralsDashboard() {
  const { t } = useTranslation();
  const [persisted, setPersisted] = useState<CandidateReferralsData | null>(null);
  const [me, setMe] = useState<ReferralMe | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [cashOutHistory, setCashOutHistory] = useState<CashOutRequest[]>([]);
  const [lbWindow, setLbWindow] = useState<"month" | "all">("month");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (persisted?.program?.share_path && typeof window !== "undefined") {
      return buildReferralShareUrl(window.location.origin, persisted.program.share_path);
    }
    if (me && typeof window !== "undefined") {
      return `${window.location.origin}${me.share_example_path}`;
    }
    return "";
  }, [me, persisted]);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setErr(null);
    try {
      const [persistedRes, meRes, lbRes, histRes] = await Promise.all([
        apiFetch<CandidateReferralsData>(CANDIDATE_REFERRALS_API_PATH, {}, token),
        apiFetch<ReferralMe>("/api/v1/referrals/me", {}, token),
        apiFetch<{ entries: LeaderboardEntry[] }>(
          `/api/v1/referrals/leaderboard?window=${lbWindow}`,
          {},
          token,
        ),
        apiFetch<{ requests: CashOutRequest[] }>("/api/v1/referrals/cash-out/history", {}, token),
      ]);
      setPersisted(persistedRes);
      setMe(meRes);
      setBoard(lbRes.entries);
      setCashOutHistory(histRes.requests);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("referrals.loadFailed"));
    }
  }, [t, lbWindow]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("referrals.copied"));
    } catch {
      toast.error(shareUrl);
    }
  };

  const ensureCode = async () => {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(CANDIDATE_REFERRALS_ENSURE_CODE_PATH, { method: "POST" }, token);
      await load();
      toast.success(t("referrals.codeReady"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("referrals.loadFailed"));
    }
  };

  const submitInvite = async () => {
    const token = getToken();
    if (!token || !inviteEmail.trim()) return;
    setInviteBusy(true);
    try {
      await apiFetch(
        CANDIDATE_REFERRALS_INVITE_PATH,
        { method: "POST", body: JSON.stringify({ invite_email: inviteEmail.trim() }) },
        token,
      );
      setInviteEmail("");
      await load();
      toast.success(t("referrals.inviteRecorded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("referrals.loadFailed"));
    } finally {
      setInviteBusy(false);
    }
  };

  if (err) {
    return (
      <div data-candidate-referrals-error>
        <p className="twin-muted text-sm">{err}</p>
        <Button type="button" className="mt-3" onClick={() => void load()}>
          {t("common.tryAgain")}
        </Button>
      </div>
    );
  }
  if (!me || !persisted) {
    return (
      <p className="twin-muted text-sm" data-candidate-referrals-loading>
        {t("common.loading")}
      </p>
    );
  }

  const referrals = persisted.referrals;

  return (
    <div className="space-y-8" data-candidate-referrals-dashboard>
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t("referrals.shareTitle")}</h2>
        <p className="twin-muted mt-2 break-all rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 py-2 text-sm" data-candidate-referrals-share-url>
          {shareUrl}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void copyLink()}>
            {t("referrals.copyLink")}
          </Button>
          <Button type="button" className="twin-btn-secondary" onClick={() => void ensureCode()}>
            {t("referrals.ensureCode")}
          </Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6" data-candidate-referrals-how-it-works>
        <h2 className="text-lg font-semibold">{t("referrals.howItWorksTitle")}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          <li>{t("referrals.howItWorksStep1")}</li>
          <li>{t("referrals.howItWorksStep2")}</li>
          <li>{t("referrals.howItWorksStep3")}</li>
        </ol>
        <p className="twin-muted mt-3 text-xs">{persisted.manual_processing_notice}</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("referrals.tier"), value: me.referral_tier },
          { label: t("referrals.referred"), value: String(persisted.program.total_referrals) },
          { label: t("referrals.qualified"), value: String(me.qualified_referrals) },
          { label: t("referrals.pending"), value: formatMoney(me.pending_earnings_cents) },
        ].map((tile) => (
          <Card key={tile.label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
              {tile.label}
            </p>
            <p className="mt-1 text-xl font-semibold capitalize tabular-nums">{tile.value}</p>
          </Card>
        ))}
      </div>
      <p className="twin-muted text-sm">
        {t("referrals.lifetime")}: <strong>{formatMoney(me.lifetime_earnings_cents)}</strong>
      </p>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t("referrals.inviteTitle")}</h2>
        <p className="twin-muted mt-1 text-sm">{t("referrals.inviteLead")}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("referrals.inviteEmailPlaceholder")}
            className="twin-input flex-1 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 py-2 text-sm"
            data-candidate-referrals-invite-input
          />
          <Button type="button" disabled={inviteBusy || !inviteEmail.trim()} onClick={() => void submitInvite()}>
            {t("referrals.inviteSubmit")}
          </Button>
        </div>
      </Card>

      <section data-candidate-referrals-list>
        <h2 className="text-lg font-semibold">{t("referrals.listTitle")}</h2>
        {referrals.length === 0 ? (
          <p className="twin-muted mt-2 text-sm">{t("referrals.listEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {referrals.map((row: CandidateReferralItem) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)] px-3 py-2 text-sm"
              >
                <span>{row.invite_email ?? t("referrals.anonymousSignup")}</span>
                <span className="text-xs font-medium capitalize">{t(referralStatusLabelKey(row.status))}</span>
                <span className="twin-muted text-xs">{new Date(row.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {me.pending_earnings_cents > 0 ? (
        <Link
          href="/dashboard/referrals/cash-out"
          className="twin-btn-solid twin-touch-target inline-flex text-sm font-semibold"
        >
          {t("referrals.cashOutLink")}
        </Link>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">{t("referrals.cashOutHistoryTitle")}</h2>
        {cashOutHistory.length === 0 ? (
          <p className="twin-muted mt-2 text-sm">{t("referrals.cashOutNoHistory")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {cashOutHistory.map((r) => {
              const statusKey =
                r.status === "paid"
                  ? "referrals.cashOutStatusPaid"
                  : r.status === "requested"
                    ? "referrals.cashOutStatusRequested"
                    : "referrals.cashOutStatusPending";
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)] px-3 py-2 text-sm"
                >
                  <span className="tabular-nums font-medium">{formatMoney(r.amount_cents)}</span>
                  <span className="twin-muted text-xs">{new Date(r.created_at).toLocaleString()}</span>
                  <span className="text-xs font-medium capitalize">{t(statusKey)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t("referrals.payoutsTitle")}</h2>
        {me.recent_payouts.length === 0 ? (
          <p className="twin-muted mt-2 text-sm">{t("referrals.noPayouts")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {me.recent_payouts.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)] px-3 py-2 text-sm"
              >
                <span>{t(PAYOUT_LABEL[p.payout_type] ?? "referrals.payoutTypeFirst")}</span>
                <span className="tabular-nums font-medium">{formatMoney(p.amount_cents)}</span>
                <span className="twin-muted text-xs">
                  {t("referrals.payoutStatus")}: {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("referrals.leaderboardTitle")}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold ${lbWindow === "month" ? "bg-[var(--twin-accent-muted)]" : "border border-[var(--twin-border)]"}`}
              onClick={() => setLbWindow("month")}
            >
              {t("referrals.leaderboardMonth")}
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold ${lbWindow === "all" ? "bg-[var(--twin-accent-muted)]" : "border border-[var(--twin-border)]"}`}
              onClick={() => setLbWindow("all")}
            >
              {t("referrals.leaderboardAll")}
            </button>
          </div>
        </div>
        <ol className="mt-3 space-y-2">
          {board.map((row) => (
            <li
              key={row.rank}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)] px-3 py-2 text-sm"
            >
              <span>
                <strong>#{row.rank}</strong> {row.display_name}{" "}
                <span className="twin-muted text-xs capitalize">({row.referral_tier})</span>
              </span>
              <span className="tabular-nums font-medium">{formatMoney(row.earnings_cents)}</span>
            </li>
          ))}
        </ol>
      </section>

      <Link href="/dashboard" className="twin-link text-sm font-medium">
        ← {t("referrals.backDashboard")}
      </Link>
    </div>
  );
}
