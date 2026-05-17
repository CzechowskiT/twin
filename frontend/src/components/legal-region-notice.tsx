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
import type { TranslationKey } from "@/lib/i18n";

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

export function LegalRegionNotice() {
  const { t } = useTranslation();
  const [hint, setHint] = useState<JurisdictionHint | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback((h: JurisdictionHint) => {
    setHint(h);
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
      setGeoMsg(t("legalRegion.refineUnavailable"));
      return;
    }
    setGeoMsg(null);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void getJurisdictionHintCached({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        })
          .then((h) => {
            load(h);
            setGeoMsg(null);
          })
          .catch(async () => {
            try {
              const h = await fetchJurisdictionHint();
              load(h);
              setGeoMsg(t("legalRegion.refineUsedNetworkHint"));
            } catch {
              setGeoMsg(t("legalRegion.refineError"));
            }
          })
          .finally(() => setBusy(false));
      },
      () => {
        setBusy(false);
        setGeoMsg(t("legalRegion.refineDenied"));
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 120_000 },
    );
  }, [load, t]);

  if (!hint) return null;

  const region = normalizeLegalRegion(hint.legal_region);

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
      {geoMsg ? <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">{geoMsg}</p> : null}
      <div className="mt-4">
        <Button
          type="button"
          className="twin-touch-target twin-btn-secondary !text-[var(--twin-fg)]"
          disabled={busy}
          onClick={() => void onRefine()}
        >
          {busy ? t("legalRegion.refineBusy") : t("legalRegion.refineCta")}
        </Button>
      </div>
    </section>
  );
}
