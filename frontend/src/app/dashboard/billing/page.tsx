"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { PlanOut, PlansPublicResponse } from "@/lib/api-types";
import { clearToken, getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

type Me = {
  id: number;
  email: string;
  plan_tier: string;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  billing_company_name?: string | null;
  billing_tax_id?: string | null;
};

const PLAN_PRICE_FALLBACK_USD: Record<string, number> = {
  free: 0,
  premium: 4.99,
  pro: 9.99,
};

function formatUsdListMonthly(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPlanListMonthly(
  locale: string,
  fallbackUsd: number,
  live: { amount: number; currency: string } | null,
): string {
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  if (live && live.currency.length === 3) {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency: live.currency,
      minimumFractionDigits: live.amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(live.amount);
  }
  return formatUsdListMonthly(fallbackUsd);
}

function normalizePlansPayload(raw: unknown): PlansPublicResponse {
  if (raw == null || typeof raw !== "object") {
    return {
      plans: [],
      checkout_configured: false,
      checkout_payment_methods: [],
      payment_methods_note: "",
    };
  }
  const o = raw as Record<string, unknown>;
  const rawPlans = Array.isArray(o.plans) ? o.plans : [];
  const plans: PlanOut[] = [];
  for (const row of rawPlans) {
    if (row == null || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.trim() : "";
    if (!id) continue;
    let monthly = 0;
    if (typeof r.monthly_list_price_usd === "number" && Number.isFinite(r.monthly_list_price_usd)) {
      monthly = r.monthly_list_price_usd;
    } else if (PLAN_PRICE_FALLBACK_USD[id] != null) {
      monthly = PLAN_PRICE_FALLBACK_USD[id];
    }
    let liveAmt: number | null = null;
    let liveCur: string | null = null;
    if (typeof r.list_price_monthly === "number" && Number.isFinite(r.list_price_monthly) && r.list_price_monthly >= 0) {
      liveAmt = r.list_price_monthly;
    }
    if (typeof r.list_price_currency === "string" && /^[A-Za-z]{3}$/.test(r.list_price_currency.trim())) {
      liveCur = r.list_price_currency.trim().toUpperCase();
    }
    plans.push({
      id,
      name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : id,
      description: typeof r.description === "string" ? r.description : "",
      max_tracked_applications:
        r.max_tracked_applications === null || r.max_tracked_applications === undefined
          ? null
          : typeof r.max_tracked_applications === "number"
            ? r.max_tracked_applications
            : null,
      stripe_price_configured: Boolean(r.stripe_price_configured),
      monthly_list_price_usd: monthly,
      list_price_monthly: liveAmt,
      list_price_currency: liveCur,
    });
  }
  const pm = o.checkout_payment_methods;
  const checkout_payment_methods = Array.isArray(pm)
    ? [...new Set(pm.map((x) => String(x).trim().toLowerCase()).filter(Boolean))]
    : [];
  return {
    plans,
    checkout_configured: Boolean(o.checkout_configured),
    checkout_payment_methods,
    payment_methods_note: typeof o.payment_methods_note === "string" ? o.payment_methods_note : "",
  };
}

function stripeCheckoutMethodLabel(method: string): TranslationKey | null {
  const slug = method.trim().toLowerCase();
  const map: Record<string, TranslationKey> = {
    card: "dashboard.billingPmCard",
    link: "dashboard.billingPmLink",
    paypal: "dashboard.billingPmPaypal",
    amazon_pay: "dashboard.billingPmAmazonPay",
    sepa_debit: "dashboard.billingPmSepa",
    ideal: "dashboard.billingPmIdeal",
    us_bank_account: "dashboard.billingPmUsBank",
    bancontact: "dashboard.billingPmBancontact",
    p24: "dashboard.billingPmP24",
    blik: "dashboard.billingPmBlik",
    cashapp: "dashboard.billingPmCashapp",
    klarna: "dashboard.billingPmKlarna",
    affirm: "dashboard.billingPmAffirm",
  };
  return map[slug] ?? null;
}

function formatSubscriptionPeriodEnd(iso: string | null | undefined): string | null {
  if (iso == null || typeof iso !== "string" || !iso.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatSubscriptionStatusLabel(
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  status: unknown,
): string {
  if (status == null) return t("dashboard.billingNotActive");
  const raw = typeof status === "string" ? status.trim() : String(status).trim();
  if (!raw.length) return t("dashboard.billingNotActive");
  const s = raw.toLowerCase();
  if (s === "unknown" || s === "none") return t("dashboard.billingNotActive");
  const map: Record<string, TranslationKey> = {
    active: "dashboard.billingSubActive",
    trialing: "dashboard.billingSubTrialing",
    past_due: "dashboard.billingSubPastDue",
    canceled: "dashboard.billingSubCanceled",
    unpaid: "dashboard.billingSubUnpaid",
    incomplete: "dashboard.billingSubIncomplete",
    incomplete_expired: "dashboard.billingSubIncompleteExpired",
    paused: "dashboard.billingSubPaused",
  };
  const key = map[s];
  if (key) return t(key);
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function BillingPlanTierCard({
  plan: p,
  busy,
  footerLabel,
  buttonHint,
  locale,
  t,
  onPrimary,
  disabled,
  isCurrent,
}: {
  plan: PlanOut;
  busy: string | null;
  footerLabel: string;
  /** Full explanation for tooltip / aria when label is shortened. */
  buttonHint?: string;
  locale: string;
  t: (key: TranslationKey) => string;
  onPrimary: () => void;
  disabled: boolean;
  isCurrent: boolean;
}) {
  const busyHere =
    (busy === "checkout-premium" && p.id === "premium") || (busy === "checkout-pro" && p.id === "pro");
  const price = formatPlanListMonthly(
    locale,
    p.monthly_list_price_usd,
    p.list_price_monthly != null && p.list_price_currency
      ? { amount: p.list_price_monthly, currency: p.list_price_currency }
      : null,
  );

  return (
    <article
      className={`twin-billing-plan-card flex w-full min-w-0 max-w-none flex-col self-stretch rounded-2xl border bg-[var(--twin-surface-raised)] p-5 text-start shadow-sm transition sm:p-6 ${
        isCurrent
          ? "border-[var(--twin-accent)] ring-2 ring-[var(--twin-accent-muted)]"
          : "border-[var(--twin-border)] hover:border-[var(--twin-accent)]/50"
      } ${disabled && !isCurrent ? "opacity-[0.88]" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold capitalize tracking-tight text-[var(--foreground)]">{p.name}</h3>
        {isCurrent ? (
          <span className="shrink-0 rounded-full bg-[var(--twin-accent-muted)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--twin-accent-hover)]">
            {t("dashboard.billingPlanCurrent")}
          </span>
        ) : null}
      </div>

      <div className="mt-4 border-b border-[var(--twin-border)] pb-4">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-3xl font-bold tabular-nums tracking-tight text-[var(--twin-accent)] sm:text-4xl">
          <span>{price}</span>
          <span className="text-sm font-semibold text-[var(--twin-muted-strong)]">{t("dashboard.billingPerMonth")}</span>
        </p>
        {p.list_price_monthly != null && p.list_price_currency ? (
          <p className="mt-1 text-[11px] font-medium text-[var(--twin-muted)]">{t("dashboard.billingLiveStripeList")}</p>
        ) : null}
      </div>

      <p
        className="mt-4 flex-1 text-sm leading-relaxed text-[var(--twin-muted-strong)] break-words"
        style={{
          textAlign: "start",
          hyphens: "none",
          WebkitHyphens: "none",
          wordBreak: "normal",
          overflowWrap: "break-word",
          textWrap: "wrap",
        }}
      >
        {p.description}
      </p>
      <p
        className="mt-3 text-xs leading-snug text-[var(--twin-muted)] break-words"
        style={{
          textAlign: "start",
          hyphens: "none",
          WebkitHyphens: "none",
          wordBreak: "normal",
          overflowWrap: "break-word",
        }}
      >
        {p.max_tracked_applications != null
          ? t("dashboard.billingTrackedCap").replace("{n}", String(p.max_tracked_applications))
          : t("dashboard.billingTrackedUnlimited")}
      </p>

      <div className="mt-6 w-full">
        <Button
          type="button"
          title={buttonHint}
          aria-label={buttonHint ?? footerLabel}
          className="h-auto min-h-[2.75rem] w-full whitespace-normal py-2.5 text-center leading-snug sm:w-auto sm:min-w-[11rem] sm:px-4"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            onPrimary();
          }}
        >
          {busyHere ? "…" : footerLabel}
        </Button>
      </div>
    </article>
  );
}

type UrlPayload = { url: string };

const PAID = new Set(["active", "trialing", "past_due"]);

export default function BillingPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [plans, setPlans] = useState<PlansPublicResponse | null>(null);
  const [actionError, setActionError] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<"success" | "cancel" | null>(null);
  const [billingCompany, setBillingCompany] = useState("");
  const [billingTaxId, setBillingTaxId] = useState("");
  const [billingSaveBusy, setBillingSaveBusy] = useState(false);
  const [billingSaveOk, setBillingSaveOk] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setActionError(false);
    setLoadFailed(false);

    const [meRes, plansRes] = await Promise.allSettled([
      apiFetch<Me>("/api/v1/auth/me", {}, token),
      apiFetch<PlansPublicResponse>("/api/v1/billing/plans", { method: "GET" }),
    ]);

    let anyLoadFailure = false;

    if (meRes.status === "fulfilled") {
      const m = meRes.value;
      setMe(m);
      setBillingCompany((m.billing_company_name ?? "").trim());
      setBillingTaxId((m.billing_tax_id ?? "").trim());
      setBillingSaveOk(false);
    } else {
      setMe(null);
      setBillingCompany("");
      setBillingTaxId("");
      setBillingSaveOk(false);
      const msg = meRes.reason instanceof Error ? meRes.reason.message : String(meRes.reason);
      const lower = msg.toLowerCase();
      const looksLikeAuthFailure =
        msg.includes("401") ||
        lower.includes("invalid token") ||
        lower.includes("could not validate credentials") ||
        lower.includes("not authenticated");
      if (looksLikeAuthFailure) {
        clearToken();
        router.replace("/login");
        setLoading(false);
        return;
      }
      anyLoadFailure = true;
      console.warn("[billing] /auth/me failed", msg);
    }

    if (plansRes.status === "fulfilled") {
      setPlans(normalizePlansPayload(plansRes.value));
    } else {
      setPlans(null);
      const msg = plansRes.reason instanceof Error ? plansRes.reason.message : String(plansRes.reason);
      anyLoadFailure = true;
      console.warn("[billing] /billing/plans failed", msg);
    }

    setLoadFailed(anyLoadFailure);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("checkout");
    queueMicrotask(() => {
      if (c === "success") setCheckoutBanner("success");
      else if (c === "cancel") setCheckoutBanner("cancel");
    });
  }, []);

  async function startCheckout(plan: "premium" | "pro") {
    const token = getToken();
    if (!token) return;
    setBusy(`checkout-${plan}`);
    setActionError(false);
    try {
      const res = await apiFetch<UrlPayload>(
        "/api/v1/billing/checkout-session",
        { method: "POST", body: JSON.stringify({ plan }) },
        token,
      );
      window.location.assign(res.url);
    } catch (e) {
      setActionError(true);
      console.warn("[billing] checkout-session failed", e);
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    const token = getToken();
    if (!token) return;
    setBusy("portal");
    setActionError(false);
    try {
      const res = await apiFetch<UrlPayload>("/api/v1/billing/portal-session", { method: "POST" }, token);
      window.location.assign(res.url);
    } catch (e) {
      setActionError(true);
      console.warn("[billing] portal-session failed", e);
    } finally {
      setBusy(null);
    }
  }

  async function saveBillingProfile() {
    const token = getToken();
    if (!token) return;
    setBillingSaveBusy(true);
    setBillingSaveOk(false);
    setActionError(false);
    try {
      const updated = await apiFetch<Me>(
        "/api/v1/auth/me/billing-profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            billing_company_name: billingCompany.trim() || null,
            billing_tax_id: billingTaxId.trim() || null,
          }),
        },
        token,
      );
      setMe(updated);
      setBillingCompany((updated.billing_company_name ?? "").trim());
      setBillingTaxId((updated.billing_tax_id ?? "").trim());
      setBillingSaveOk(true);
    } catch (e) {
      setActionError(true);
      console.warn("[billing] billing-profile save failed", e);
    } finally {
      setBillingSaveBusy(false);
    }
  }

  const subscriptionStatus =
    me?.subscription_status != null && typeof me.subscription_status === "string"
      ? me.subscription_status
      : null;
  const paid = subscriptionStatus != null && PAID.has(subscriptionStatus);
  const showPortal = paid;

  return (
    <Shell wide rail>
      <div className="twin-billing-surface w-full min-w-0">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-start">
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("dashboard.billingPageTitle")}</h1>
        </div>
        <nav className="flex shrink-0 flex-wrap gap-x-4 gap-y-2 text-sm" aria-label={t("dashboard.billingPageTitle")}>
          <Link href="/dashboard" className="twin-link twin-touch-target">
            ← {t("dashboard.title")}
          </Link>
          <Link href="/profile" className="twin-link twin-touch-target">
            {t("nav.profile")}
          </Link>
        </nav>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {checkoutBanner === "success" ? (
          <Card variant="soft" className="!mb-0 border-[var(--twin-accent-muted)]">
            <p className="text-sm font-medium text-[var(--twin-accent-hover)]">{t("dashboard.billingCheckoutSuccess")}</p>
          </Card>
        ) : null}
        {checkoutBanner === "cancel" ? (
          <Card variant="soft" className="!mb-0">
            <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingCheckoutCancelled")}</p>
          </Card>
        ) : null}
        {actionError ? (
          <Card variant="soft" className="!mb-0 border-red-200 dark:border-red-900/50">
            <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingCheckoutError")}</p>
          </Card>
        ) : null}
      </div>

      {loading ? (
        <Card className="!mb-0 mt-6 animate-pulse">
          <div className="h-4 w-40 rounded bg-[var(--twin-border)]" />
          <div className="mt-4 h-3 w-full max-w-md rounded bg-[var(--twin-border)]" />
          <div className="mt-2 h-3 w-2/3 max-w-sm rounded bg-[var(--twin-border)]" />
        </Card>
      ) : null}

      {!loading && loadFailed ? (
        <Card variant="soft" className="!mb-0 mt-6 border-[var(--twin-border)]">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingLoadIssue")}</p>
          <button type="button" className="twin-link mt-3 text-sm font-semibold" onClick={() => void load()}>
            {t("dashboard.billingRetry")}
          </button>
        </Card>
      ) : null}

      {!loading && me ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card className="!mb-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
              {t("dashboard.billingCurrentPlan")}
            </p>
            <p className="mt-3 text-xl font-semibold capitalize tracking-tight text-[var(--foreground)] sm:text-2xl">
              {me.plan_tier}
            </p>
            <p className="twin-muted mt-2 text-sm">
              {t("dashboard.billingSubscriptionStatus")}:{" "}
              <span className="font-medium text-[var(--foreground)]">{formatSubscriptionStatusLabel(t, me.subscription_status)}</span>
            </p>
            {(() => {
              const periodEnd = formatSubscriptionPeriodEnd(me.subscription_current_period_end);
              if (!periodEnd) return null;
              return (
                <p className="twin-muted mt-2 text-sm">
                  {t("dashboard.billingPeriodEnds")}: <span className="font-medium text-[var(--foreground)]">{periodEnd}</span>
                </p>
              );
            })()}
            {showPortal ? (
              <div className="mt-5 border-t border-[var(--twin-border)] pt-5">
                <p className="twin-muted mb-3 text-sm leading-relaxed">{t("dashboard.billingPortalHint")}</p>
                <Button type="button" className="!w-auto sm:!min-w-[12rem]" disabled={busy !== null} onClick={() => void openPortal()}>
                  {busy === "portal" ? "…" : t("dashboard.billingManagePortal")}
                </Button>
              </div>
            ) : null}
          </Card>

          <Card variant="soft" className="!mb-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
              {t("dashboard.billingInvoiceProfileTitle")}
            </p>
            <p className="twin-muted mt-2 text-sm leading-relaxed">{t("dashboard.billingInvoiceProfileLead")}</p>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="billing-company" className="mb-1 block text-sm font-semibold text-[var(--twin-muted-strong)]">
                  {t("dashboard.billingCompanyLabel")}
                </label>
                <Input
                  id="billing-company"
                  type="text"
                  autoComplete="organization"
                  value={billingCompany}
                  onChange={(e) => setBillingCompany(e.target.value)}
                  className="!mb-0 max-w-xl"
                  maxLength={200}
                />
              </div>
              <div>
                <label htmlFor="billing-tax" className="mb-1 block text-sm font-semibold text-[var(--twin-muted-strong)]">
                  {t("dashboard.billingTaxIdLabel")}
                </label>
                <Input
                  id="billing-tax"
                  type="text"
                  autoComplete="off"
                  value={billingTaxId}
                  onChange={(e) => setBillingTaxId(e.target.value)}
                  className="!mb-0 max-w-xl"
                  maxLength={64}
                />
              </div>
              <Button type="button" className="!w-auto" disabled={billingSaveBusy} onClick={() => void saveBillingProfile()}>
                {billingSaveBusy ? "…" : t("dashboard.billingSaveInvoiceProfile")}
              </Button>
              {billingSaveOk ? (
                <p className="text-sm font-medium text-[var(--twin-accent-hover)]">{t("dashboard.billingSavedInvoiceProfile")}</p>
              ) : null}
            </div>
            <p className="twin-muted mt-5 text-xs leading-relaxed">{t("dashboard.billingCheckoutPromoHint")}</p>
            <p className="twin-muted mt-2 text-xs leading-relaxed">{t("dashboard.billingPauseViaPortal")}</p>
          </Card>
        </div>
      ) : null}

      {plans && !loading ? (
        <Card className="!mb-0 mt-6 min-w-0 max-w-full">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">{t("dashboard.billingPlansTitle")}</p>
          {(plans.checkout_payment_methods ?? []).length > 0 ? (
            <div className="mt-5 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/60 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                {t("dashboard.billingCheckoutMethodsEyebrow")}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {(plans.checkout_payment_methods ?? []).map((m) => {
                  const key = stripeCheckoutMethodLabel(m);
                  const label = key ? t(key) : `${t("dashboard.billingPmGeneric")} (${m})`;
                  return (
                    <li
                      key={m}
                      className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]"
                    >
                      {label}
                    </li>
                  );
                })}
              </ul>
              {(plans.checkout_payment_methods ?? []).includes("card") ? (
                <p className="twin-muted mt-3 text-xs leading-relaxed">{t("dashboard.billingWalletsHint")}</p>
              ) : null}
              {locale === "en" && plans.payment_methods_note ? (
                <p className="twin-muted mt-2 text-xs leading-relaxed">{plans.payment_methods_note}</p>
              ) : null}
            </div>
          ) : null}

          {plans.plans.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 p-6 text-sm text-[var(--twin-muted-strong)]">
              {t("dashboard.billingPlansEmpty")}
            </div>
          ) : (
            <div className="mt-6 flex w-full flex-col gap-5">
              {plans.plans.map((p) => {
                const tier = (me?.plan_tier ?? "free").toLowerCase();
                const isCurrent = me != null && tier === p.id;
                const canOpenWorkspace = p.id === "free" && !isCurrent;
                const canCheckoutPremium = !paid && p.id === "premium" && plans.checkout_configured;
                const canCheckoutPro = !paid && p.id === "pro" && plans.checkout_configured && p.stripe_price_configured;
                const actionable = canOpenWorkspace || canCheckoutPremium || canCheckoutPro;
                const disabled = busy !== null || isCurrent || !actionable;
                let footerKey: TranslationKey = "dashboard.billingPlanCurrent";
                if (!isCurrent) {
                  if (p.id === "free") footerKey = "dashboard.billingPlanOpenWorkspace";
                  else if (p.id === "premium")
                    footerKey = plans.checkout_configured ? "dashboard.billingUpgradePremium" : "dashboard.billingNotConfigured";
                  else if (p.id === "pro") {
                    if (!plans.checkout_configured) footerKey = "dashboard.billingNotConfigured";
                    else if (!p.stripe_price_configured) footerKey = "dashboard.billingPlanProPending";
                    else footerKey = "dashboard.billingUpgradePro";
                  }
                }
                const footerLabelLong = t(footerKey);
                let footerLabel = footerLabelLong;
                let buttonHint: string | undefined;
                if (!isCurrent) {
                  if (footerKey === "dashboard.billingNotConfigured") {
                    footerLabel = t("dashboard.billingCtaUnavailableShort");
                    buttonHint = footerLabelLong;
                  } else if (footerKey === "dashboard.billingPlanProPending") {
                    footerLabel = t("dashboard.billingCtaProPendingShort");
                    buttonHint = footerLabelLong;
                  }
                }

                return (
                  <BillingPlanTierCard
                    key={p.id}
                    plan={p}
                    busy={busy}
                    footerLabel={footerLabel}
                    buttonHint={buttonHint}
                    locale={locale}
                    t={t}
                    disabled={disabled}
                    isCurrent={isCurrent}
                    onPrimary={() => {
                      if (busy !== null) return;
                      if (isCurrent) return;
                      if (canOpenWorkspace) {
                        router.push("/dashboard");
                        return;
                      }
                      if (canCheckoutPremium) void startCheckout("premium");
                      if (canCheckoutPro) void startCheckout("pro");
                    }}
                  />
                );
              })}
            </div>
          )}
          <p className="mt-6 text-xs leading-relaxed text-[var(--twin-muted)]">{t("dashboard.billingListPricesNote")}</p>
        </Card>
      ) : null}
      </div>
    </Shell>
  );
}
