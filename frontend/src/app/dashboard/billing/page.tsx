"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
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

  if (loading && me === null) {
    return (
      <Shell wide rail>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
          <div
            className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--twin-accent)] border-t-transparent"
            aria-hidden
          />
          <p className="twin-muted text-sm">{t("dashboard.billingLoading")}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell wide rail>
      <div className="twin-app-read-pane space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 border-b border-[var(--twin-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-3xl space-y-3">
            <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("dashboard.billingPageTitle")}</h1>
            <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">{t("dashboard.billingPageLead")}</p>
          </div>
          <nav
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"
            aria-label={t("dashboard.billingPageTitle")}
          >
            <Link
              href="/dashboard"
              className="twin-link inline-flex min-h-[2.75rem] items-center justify-center px-1 text-sm sm:justify-start"
            >
              {t("profile.backToDashboard")}
            </Link>
            <Link href="/profile" className="twin-link inline-flex min-h-[2.75rem] items-center justify-center px-1 text-sm sm:justify-start">
              {t("nav.profile")}
            </Link>
          </nav>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {checkoutBanner === "success" ? (
            <Card variant="soft" className="!mb-0 border-[var(--twin-accent)]/25 bg-[var(--twin-accent-muted)]/25">
              <p className="text-sm font-medium text-[var(--twin-accent-hover)]">{t("dashboard.billingCheckoutSuccess")}</p>
            </Card>
          ) : null}
          {checkoutBanner === "cancel" ? (
            <Card variant="soft" className="!mb-0">
              <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingCheckoutCancelled")}</p>
            </Card>
          ) : null}

          {plans && !plans.checkout_configured ? (
            <Card variant="soft" className="!mb-0">
              <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingNotConfigured")}</p>
            </Card>
          ) : null}

          {actionError ? (
            <Card variant="soft" className="!mb-0 border-red-300/80 dark:border-red-900/50">
              <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingCheckoutError")}</p>
            </Card>
          ) : null}

          {!loading && loadFailed ? (
            <Card variant="soft" className="!mb-0">
              <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingLoadIssue")}</p>
              <button type="button" className="twin-link mt-3 text-sm font-semibold" onClick={() => void load()}>
                {t("dashboard.billingRetry")}
              </button>
            </Card>
          ) : null}

          {me ? (
            <Card className="!mb-0">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                    {t("dashboard.billingCurrentPlan")}
                  </p>
                  <p className="text-xl font-semibold capitalize tracking-tight text-[var(--foreground)] sm:text-2xl">{me.plan_tier}</p>
                  <p className="text-sm text-[var(--twin-muted-strong)]">
                    {t("dashboard.billingSubscriptionStatus")}:{" "}
                    <span className="font-semibold text-[var(--foreground)]">
                      {formatSubscriptionStatusLabel(t, me.subscription_status)}
                    </span>
                  </p>
                  {(() => {
                    const periodEnd = formatSubscriptionPeriodEnd(me.subscription_current_period_end);
                    if (!periodEnd) return null;
                    return (
                      <p className="text-sm text-[var(--twin-muted-strong)]">
                        {t("dashboard.billingPeriodEnds")}: <span className="font-semibold text-[var(--foreground)]">{periodEnd}</span>
                      </p>
                    );
                  })()}
                </div>
                {showPortal ? (
                  <div className="w-full shrink-0 border-t border-[var(--twin-border)] pt-5 lg:w-auto lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingPortalHint")}</p>
                    <Button
                      type="button"
                      className="mt-3 !w-full sm:!w-auto sm:!min-w-[12rem]"
                      disabled={busy !== null}
                      onClick={() => void openPortal()}
                    >
                      {busy === "portal" ? "…" : t("dashboard.billingManagePortal")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          {me && !loading ? (
            <Card variant="soft" className="!mb-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                {t("dashboard.billingInvoiceProfileTitle")}
              </p>
              <p className="twin-muted mt-1 max-w-prose text-sm leading-relaxed">{t("dashboard.billingInvoiceProfileLead")}</p>
              <div className="mt-5 grid max-w-xl gap-4">
                <div>
                  <Label>{t("dashboard.billingCompanyLabel")}</Label>
                  <Input
                    id="billing-company"
                    type="text"
                    autoComplete="organization"
                    value={billingCompany}
                    onChange={(e) => setBillingCompany(e.target.value)}
                    className="!mb-0 max-w-full"
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label>{t("dashboard.billingTaxIdLabel")}</Label>
                  <Input
                    id="billing-tax"
                    type="text"
                    autoComplete="off"
                    value={billingTaxId}
                    onChange={(e) => setBillingTaxId(e.target.value)}
                    className="!mb-0 max-w-full"
                    maxLength={64}
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button type="button" className="!w-full sm:!w-auto" disabled={billingSaveBusy} onClick={() => void saveBillingProfile()}>
                    {billingSaveBusy ? "…" : t("dashboard.billingSaveInvoiceProfile")}
                  </Button>
                  {billingSaveOk ? (
                    <p className="text-sm font-medium text-[var(--twin-accent-hover)]">{t("dashboard.billingSavedInvoiceProfile")}</p>
                  ) : null}
                </div>
              </div>
              <p className="twin-muted mt-5 text-xs leading-relaxed">{t("dashboard.billingCheckoutPromoHint")}</p>
              <p className="twin-muted mt-2 text-xs leading-relaxed">{t("dashboard.billingPauseViaPortal")}</p>
            </Card>
          ) : null}

          {plans && !loading ? (
            <section className="space-y-4" aria-labelledby="billing-plans-heading">
              <h2 id="billing-plans-heading" className="twin-section-title text-lg sm:text-xl">
                {t("dashboard.billingPlansTitle")}
              </h2>
              {(plans.checkout_payment_methods ?? []).length > 0 ? (
                <Card variant="soft" className="!mb-0">
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
                          className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]"
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
                </Card>
              ) : null}

              {plans.plans.length === 0 ? (
                <Card variant="soft" className="!mb-0 border-dashed">
                  <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingPlansEmpty")}</p>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {plans.plans.map((p) => {
                    const tier = (me?.plan_tier ?? "free").toLowerCase();
                    const isCurrent = me != null && tier === p.id;
                    const canOpenWorkspace = p.id === "free" && !isCurrent;
                    const canCheckoutPremium = !paid && p.id === "premium" && plans.checkout_configured;
                    const canCheckoutPro = !paid && p.id === "pro" && plans.checkout_configured && p.stripe_price_configured;
                    const actionable = canOpenWorkspace || canCheckoutPremium || canCheckoutPro;
                    const ctaDisabled = busy !== null || isCurrent || !actionable;
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

                    const ctaLabel =
                      busy === "checkout-premium" && p.id === "premium"
                        ? "…"
                        : busy === "checkout-pro" && p.id === "pro"
                          ? "…"
                          : t(footerKey);

                    return (
                      <Card
                        key={p.id}
                        className={`!mb-0 flex min-h-[280px] flex-col ${
                          isCurrent ? "ring-2 ring-[var(--twin-accent)]/40" : ""
                        } ${!isCurrent && actionable && busy === null ? "shadow-[0_1px_0_0_var(--twin-accent-muted)]" : ""}`}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="text-lg font-semibold capitalize leading-snug text-[var(--foreground)]">{p.name}</p>
                          <div className="mt-3">
                            <p className="text-2xl font-bold tracking-tight text-[var(--twin-accent)] sm:text-3xl">
                              {formatPlanListMonthly(
                                locale,
                                p.monthly_list_price_usd,
                                p.list_price_monthly != null && p.list_price_currency
                                  ? { amount: p.list_price_monthly, currency: p.list_price_currency }
                                  : null,
                              )}
                              <span className="ml-1.5 text-sm font-medium text-[var(--twin-muted-strong)]">{t("dashboard.billingPerMonth")}</span>
                            </p>
                            {p.list_price_monthly != null && p.list_price_currency ? (
                              <p className="mt-1 text-[11px] font-medium text-[var(--twin-muted)]">{t("dashboard.billingLiveStripeList")}</p>
                            ) : null}
                          </div>
                          <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{p.description}</p>
                          <p className="mt-3 text-xs text-[var(--twin-muted)]">
                            {p.max_tracked_applications != null
                              ? t("dashboard.billingTrackedCap").replace("{n}", String(p.max_tracked_applications))
                              : t("dashboard.billingTrackedUnlimited")}
                          </p>
                        </div>
                        <div className="mt-5 border-t border-[var(--twin-border)] pt-4">
                          {isCurrent ? (
                            <p className="text-center text-sm font-semibold text-[var(--twin-accent-hover)]">{t("dashboard.billingPlanCurrent")}</p>
                          ) : (
                            <Button
                              type="button"
                              className={
                                actionable && busy === null
                                  ? "!bg-[var(--twin-cta)] !text-[var(--twin-on-cta)] hover:!bg-[var(--twin-cta-hover)]"
                                  : ""
                              }
                              disabled={ctaDisabled}
                              onClick={() => {
                                if (busy !== null) return;
                                if (isCurrent) return;
                                if (canOpenWorkspace) {
                                  router.push("/dashboard");
                                  return;
                                }
                                if (canCheckoutPremium) void startCheckout("premium");
                                if (canCheckoutPro) void startCheckout("pro");
                              }}
                            >
                              {ctaLabel}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
              <p className="text-xs leading-relaxed text-[var(--twin-muted)]">{t("dashboard.billingListPricesNote")}</p>
            </section>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
