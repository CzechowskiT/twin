"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { renderTermsMarkdown } from "@/app/terms/render-terms-markdown";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import { getJurisdictionHintCached, normalizeLegalRegion, type JurisdictionHint } from "@/lib/jurisdiction-hint";
import { resolveTermsMarkdown, type ResolvedLegalMarkdown } from "@/lib/legal-documents";

function TermsInner() {
  const searchParams = useSearchParams();
  const langQuery = searchParams.get("lang");
  const { locale, t } = useTranslation();
  const [hint, setHint] = useState<JurisdictionHint | null>(null);
  const [resolved, setResolved] = useState<ResolvedLegalMarkdown | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHint(null);
    setResolved(null);
    void getJurisdictionHintCached()
      .then((h) => {
        if (cancelled) return;
        setHint(h);
        setResolved(resolveTermsMarkdown(h, locale, langQuery));
      })
      .catch(() => {
        if (cancelled) return;
        const fallback: JurisdictionHint = {
          country_code: null,
          legal_region: "OTHER",
          source: "fallback",
        };
        setHint(fallback);
        setResolved(resolveTermsMarkdown(fallback, locale, langQuery));
      });
    return () => {
      cancelled = true;
    };
  }, [locale, langQuery]);

  useEffect(() => {
    if (!resolved) return;
    let cancelled = false;
    setBody(null);
    setErr(null);
    void fetch(resolved.path, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setBody(text);
      })
      .catch(() => {
        if (!cancelled) setErr(t("terms.loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [resolved, t]);

  const region = hint ? normalizeLegalRegion(hint.legal_region) : null;
  const cc = hint?.country_code ?? "—";

  return (
    <Shell rail>
      <article className="twin-prose max-w-none">
        <p className="twin-muted mb-4 text-sm leading-relaxed">{t("terms.notLegalAdvice")}</p>

        {!hint || !resolved ? (
          <p className="twin-muted text-sm leading-relaxed">{t("legalDoc.detectingRegion")}</p>
        ) : (
          <>
            <p className="twin-muted mb-4 text-sm leading-relaxed">
              {t("legalDoc.termsBannerPrefix")}{" "}
              <strong>{cc}</strong> {t("legalDoc.termsBannerMiddle")}{" "}
              <strong>{region}</strong>
              {t("legalDoc.termsBannerSuffix")}
            </p>
            {resolved.alternatePath ? (
              <p className="mb-6 text-sm">
                <Link
                  href={resolved.docLabel === "ar-AE" ? "/terms?lang=en" : "/terms?lang=ar"}
                  className="twin-link font-medium"
                >
                  {resolved.docLabel === "ar-AE" ? t("legalDoc.openAeEnglish") : t("legalDoc.openAeArabic")}
                </Link>
              </p>
            ) : null}
          </>
        )}

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {!err && body === null && resolved ? <p className="twin-muted text-sm leading-relaxed">{t("terms.loading")}</p> : null}
        {body && resolved ? (
          <div dir={resolved.dir} lang={resolved.htmlLang} className={resolved.dir === "rtl" ? "text-right" : undefined}>
            {renderTermsMarkdown(body)}
          </div>
        ) : null}

        <p className="twin-muted mt-10 text-sm leading-relaxed">
          <Link href="/" className="twin-link font-medium">
            {t("terms.backHome")}
          </Link>
          {" · "}
          <Link href="/privacy" className="twin-link font-medium">
            {t("terms.privacyLink")}
          </Link>
        </p>
      </article>
    </Shell>
  );
}

export default function TermsPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <Shell rail>
          <article className="twin-prose max-w-none">
            <p className="twin-muted text-sm leading-relaxed">{t("legalDoc.detectingRegion")}</p>
          </article>
        </Shell>
      }
    >
      <TermsInner />
    </Suspense>
  );
}
