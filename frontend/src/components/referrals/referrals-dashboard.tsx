"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

type ReferralPayout = {
  id: number;
  payout_type: string;
  amount_cents: number;
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
  const [me, setMe] = useState<ReferralMe | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [lbWindow, setLbWindow] = useState<"month" | "all">("month");
  const [err, setErr] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (!me || typeof window === "undefined") return "";
    return `${window.location.origin}${me.share_example_path}`;
  }, [me]);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setErr(null);
    try {
      const [meRes, lbRes] = await Promise.all([
        apiFetch<ReferralMe>("/api/v1/referrals/me", {}, token),
        apiFetch<{ entries: LeaderboardEntry[] }>(
          `/api/v1/referrals/leaderboard?window=${lbWindow}`,
          {},
          token,
        ),
      ]);
      setMe(meRes);
      setBoard(lbRes.entries);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("referrals.loadFailed"));
    }
  }, [t, lbWindow]);

  useEffect(() => {
    void load();
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

  if (err) {
    return <p className="twin-muted text-sm">{err}</p>;
  }
  if (!me) {
    return <p className="twin-muted text-sm">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t("referrals.shareTitle")}</h2>
        <p className="twin-muted mt-2 break-all rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 py-2 text-sm">
          {shareUrl}
        </p>
        <Button type="button" className="mt-4" onClick={() => void copyLink()}>
          {t("referrals.copyLink")}
        </Button>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("referrals.tier"), value: me.referral_tier },
          { label: t("referrals.referred"), value: String(me.referred_user_count) },
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
