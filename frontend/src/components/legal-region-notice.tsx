"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui";
import {
  clearJurisdictionHintCache,
  fetchJurisdictionHint,
  getJurisdictionHintCached,
  normalizeLegalRegion,
  type JurisdictionHint,
  type LegalRegion,
} from "@/lib/jurisdiction-hint";
import { isLocale, LOCALE_STORAGE_KEY, type Locale, type TranslationKey } from "@/lib/i18n";
import { marketingLocaleForCountryCode } from "@/lib/pricing-locale";
import { safeStorage } from "@/lib/safe-storage";

function bodyKey(region: LegalRegion): TranslationKey {
  const m: Record<LegalRegion, TranslationKey> = {
    EU_EEA: "legalRegion.bodyEU_EEA",
    UK: "legalRegion.bodyUK",
    UAE: "legalRegion.bodyUAE",
    US: "legalRegion.bodyUS",
    CH: "legalRegion.bodyCH",
    JP: "legalRegion.bodyJP",
    CN: "legalRegion.bodyCN",
    OTHER: "legalRegion.bodyOTHER",
  };
  return m[region];
}

function sourceCaption(source: string): TranslationKey {
  if (source === "cloudflare_header") return "legalRegion.sourceCloudflare";
  if (source === "ip_lookup") return "legalRegion.sourceIp";
  if (source === "coordinates") return "legalRegion.sourceCoordinates";
  return "legalRegion.sourceUnknown";
}

type GeoFeedback = {
  key: TranslationKey;
  tone: "neutral" | "success";
};

function hasStoredLocaleChoice(): boolean {
  const stored = safeStorage.getItem(LOCALE_STORAGE_KEY);
  return Boolean(stored && isLocale(stored));
}

function applyMarketingLocaleFromHint(
  hint: JurisdictionHint,
  setLocale: (locale: Locale) => void,
): void {
  if (hasStoredLocaleChoice()) return;
  const suggested = marketingLocaleForCountryCode(hint.country_code);
  if (suggested) setLocale(suggested);
}

export function LegalRegionNotice() {
  const { t, setLocale } = useTranslation();
  const [hint, setHint] = useState<JurisdictionHint | null>(null);
  const [geoFeedback, setGeoFeedback] = useState<GeoFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [geoSupported, setGeoSupported] = useState(false);

  const load = useCallback((h: JurisdictionHint) => {
    setHint(h);
  }, []);

  useEffect(() => {
    setGeoSupported(typeof navigator !== "undefined" && Boolean(navigator.geolocation));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getJurisdictionHintCached()
      .then((h: JurisdictionHint) => {
        if (!cancelled) load(h);
      })
      .catch(() => {
        clearJurisdictionHintCache();
        if (!cancelled) load({ country_code: null, legal_region: "OTHER", source: "fallback" });
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefine = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    setGeoFeedback(null);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void getJurisdictionHintCached({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        })
          .then((h) => {
            load(h);
            applyMarketingLocaleFromHint(h, setLocale);
            if (h.source === "coordinates") {
              setGeoFeedback({ key: "legalRegion.refineSuccess", tone: "success" });
            } else {
              setGeoFeedback({ key: "legalRegion.refineUsedNetworkHint", tone: "neutral" });
            }
          })
          .catch(async () => {
            try {
              const h = await fetchJurisdictionHint();
              load(h);
              setGeoFeedback({ key: "legalRegion.refineUsedNetworkHint", tone: "neutral" });
            } catch {
              setGeoFeedback({ key: "legalRegion.refineError", tone: "neutral" });
            }
          })
          .finally(() => setBusy(false));
      },
      () => {
        setBusy(false);
        setGeoFeedback({ key: "legalRegion.refineDenied", tone: "neutral" });
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 120_000 },
    );
  }, [load, setLocale]);

  if (!hint) return null;

  const region = normalizeLegalRegion(hint.legal_region);
  const feedbackClass =
    geoFeedback?.tone === "success"
      ? "mt-3 text-xs text-[var(--twin-accent)]"
      : "twin-muted mt-3 text-xs leading-relaxed";

  return (
    <section
      className="mb-6 space-y-3 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 p-4 text-sm"
      aria-labelledby="legal-region-title"
    >
      <h2 id="legal-region-title" className="mb-2 text-base font-semibold text-[var(--foreground)]">
        {t("legalRegion.title")}
      </h2>
      <p className="twin-muted mb-3 leading-relaxed">{t("legalRegion.lead")}</p>
      <p className="mb-2 text-xs text-[var(--twin-muted-strong)]">{t(sourceCaption(hint.source))}</p>
      {hint.country_code ? (
        <p className="mb-3 font-mono text-xs text-[var(--twin-muted-strong)]">{hint.country_code}</p>
      ) : null}
      <p className="leading-relaxed text-[var(--foreground)]/95">{t(bodyKey(region))}</p>
      {geoFeedback ? <p className={feedbackClass}>{t(geoFeedback.key)}</p> : null}
      {geoSupported ? (
        <div className="mt-4 space-y-2">
          <p className="twin-muted text-xs leading-relaxed">{t("legalRegion.refineCtaHint")}</p>
          <Button
            type="button"
            className="twin-touch-target twin-btn-secondary !text-[var(--twin-fg)]"
            disabled={busy}
            onClick={() => void onRefine()}
          >
            {busy ? t("legalRegion.refineBusy") : t("legalRegion.refineCta")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
