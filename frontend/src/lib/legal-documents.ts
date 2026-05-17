import type { JurisdictionHint } from "@/lib/jurisdiction-hint";
import { normalizeLegalRegion } from "@/lib/jurisdiction-hint";
import type { Locale } from "@/lib/i18n";

export type ResolvedLegalMarkdown = {
  path: string;
  htmlLang: string;
  dir: "ltr" | "rtl";
  docLabel: "ar-AE" | "en-AE" | "pl-EU" | "en-EU" | "en-global";
  alternatePath?: string;
  alternateDocLabel?: "ar-AE" | "en-AE";
};

function countryCode(hint: JurisdictionHint): string {
  return (hint.country_code ?? "").trim().toUpperCase();
}

/**
 * Privacy markdown by estimated jurisdiction: UAE → Arabic (English optional via ?lang=en),
 * Poland → Polish EU notice, other EU/EEA → English EU notice, otherwise global English.
 */
export function resolvePrivacyMarkdown(
  hint: JurisdictionHint,
  _uiLocale: Locale,
  langQuery: string | null,
): ResolvedLegalMarkdown {
  const country = countryCode(hint);
  const region = normalizeLegalRegion(hint.legal_region);

  if (country === "AE" || region === "UAE") {
    if (langQuery === "en") {
      return {
        path: "/legal/privacy-ae-en.md",
        htmlLang: "en-AE",
        dir: "ltr",
        docLabel: "en-AE",
        alternatePath: "/legal/privacy-ae-ar.md",
        alternateDocLabel: "ar-AE",
      };
    }
    return {
      path: "/legal/privacy-ae-ar.md",
      htmlLang: "ar-AE",
      dir: "rtl",
      docLabel: "ar-AE",
      alternatePath: "/legal/privacy-ae-en.md",
      alternateDocLabel: "en-AE",
    };
  }

  if (country === "PL") {
    return {
      path: "/legal/privacy-pl-eu.md",
      htmlLang: "pl-PL",
      dir: "ltr",
      docLabel: "pl-EU",
    };
  }

  if (region === "EU_EEA") {
    return {
      path: "/legal/privacy-en-eu.md",
      htmlLang: "en-GB",
      dir: "ltr",
      docLabel: "en-EU",
    };
  }

  return {
    path: "/legal/privacy-en-global.md",
    htmlLang: "en",
    dir: "ltr",
    docLabel: "en-global",
  };
}

/** Terms: Polish file for PL UI (non-UAE); UAE → Arabic / English pair; default English. */
export function resolveTermsMarkdown(
  hint: JurisdictionHint,
  uiLocale: Locale,
  langQuery: string | null,
): ResolvedLegalMarkdown {
  const country = countryCode(hint);
  const region = normalizeLegalRegion(hint.legal_region);

  if (country === "AE" || region === "UAE") {
    if (langQuery === "en") {
      return {
        path: "/legal/terms-ae-en.md",
        htmlLang: "en-AE",
        dir: "ltr",
        docLabel: "en-AE",
        alternatePath: "/legal/terms-ae-ar.md",
        alternateDocLabel: "ar-AE",
      };
    }
    return {
      path: "/legal/terms-ae-ar.md",
      htmlLang: "ar-AE",
      dir: "rtl",
      docLabel: "ar-AE",
      alternatePath: "/legal/terms-ae-en.md",
      alternateDocLabel: "en-AE",
    };
  }

  if (uiLocale === "pl" && langQuery !== "en") {
    return {
      path: "/legal/terms-pl.md",
      htmlLang: "pl",
      dir: "ltr",
      docLabel: "pl-EU",
    };
  }

  return {
    path: "/legal/terms-en.md",
    htmlLang: "en",
    dir: "ltr",
    docLabel: "en-global",
  };
}
