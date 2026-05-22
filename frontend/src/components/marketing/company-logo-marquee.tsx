"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

/** Corporate domain for favicon fallbacks when Simple Icons slug fails. */
type Brand = {
  slug: string;
  name: string;
  domain: string;
  /** Extra Simple Icons slug attempts before leaving SI CDN. */
  altSlugs?: string[];
  /** Known-good raster URLs when SI / favicon CDNs miss (e.g. Capital One). */
  extraUrls?: string[];
};

/**
 * Fortune 500–heavy mix. Each row has a working SI slug when possible + raster fallbacks.
 * (Simple Icons: https://simpleicons.org/ — CDN: cdn.simpleicons.org)
 */
const BRANDS: Brand[] = [
  { slug: "apple", name: "Apple", domain: "apple.com" },
  { slug: "microsoft", name: "Microsoft", domain: "microsoft.com" },
  { slug: "google", name: "Google", domain: "google.com" },
  { slug: "amazon", name: "Amazon", domain: "amazon.com" },
  { slug: "nvidia", name: "NVIDIA", domain: "nvidia.com" },
  { slug: "meta", name: "Meta", domain: "meta.com" },
  { slug: "tesla", name: "Tesla", domain: "tesla.com" },
  { slug: "broadcom", name: "Broadcom", domain: "broadcom.com" },
  { slug: "visa", name: "Visa", domain: "visa.com" },
  { slug: "mastercard", name: "Mastercard", domain: "mastercard.com" },
  { slug: "jpmorgan", name: "JPMorgan Chase", domain: "jpmorganchase.com", altSlugs: ["jpmorganchase"] },
  { slug: "bankofamerica", name: "Bank of America", domain: "bankofamerica.com" },
  { slug: "citi", name: "Citi", domain: "citi.com", altSlugs: ["citibank"] },
  { slug: "goldmansachs", name: "Goldman Sachs", domain: "goldmansachs.com" },
  { slug: "morganstanley", name: "Morgan Stanley", domain: "morganstanley.com" },
  { slug: "wellsfargo", name: "Wells Fargo", domain: "wellsfargo.com" },
  { slug: "americanexpress", name: "American Express", domain: "americanexpress.com" },
  {
    slug: "capitalone",
    name: "Capital One",
    domain: "capitalone.com",
    extraUrls: [
      "https://www.capitalone.com/favicon.ico",
      "https://icons.duckduckgo.com/ip3/capitalone.com.ico",
    ],
  },
  { slug: "walmart", name: "Walmart", domain: "walmart.com" },
  { slug: "costco", name: "Costco", domain: "costco.com" },
  { slug: "target", name: "Target", domain: "target.com" },
  { slug: "homedepot", name: "Home Depot", domain: "homedepot.com" },
  { slug: "lowes", name: "Lowe's", domain: "lowes.com" },
  { slug: "cocacola", name: "Coca-Cola", domain: "coca-cola.com" },
  { slug: "pepsi", name: "Pepsi", domain: "pepsi.com" },
  { slug: "mcdonalds", name: "McDonald's", domain: "mcdonalds.com" },
  { slug: "starbucks", name: "Starbucks", domain: "starbucks.com" },
  { slug: "nike", name: "Nike", domain: "nike.com" },
  { slug: "adidas", name: "Adidas", domain: "adidas.com" },
  { slug: "shell", name: "Shell", domain: "shell.com" },
  { slug: "chevron", name: "Chevron", domain: "chevron.com" },
  { slug: "exxonmobil", name: "ExxonMobil", domain: "exxonmobil.com" },
  { slug: "toyota", name: "Toyota", domain: "toyota.com" },
  { slug: "honda", name: "Honda", domain: "honda.com" },
  { slug: "bmw", name: "BMW", domain: "bmw.com" },
  { slug: "mercedes", name: "Mercedes-Benz", domain: "mercedes-benz.com" },
  { slug: "volkswagen", name: "Volkswagen", domain: "volkswagen.com" },
  { slug: "generalmotors", name: "General Motors", domain: "gm.com" },
  { slug: "ford", name: "Ford", domain: "ford.com" },
  { slug: "samsung", name: "Samsung", domain: "samsung.com" },
  { slug: "intel", name: "Intel", domain: "intel.com" },
  { slug: "amd", name: "AMD", domain: "amd.com" },
  { slug: "cisco", name: "Cisco", domain: "cisco.com" },
  { slug: "oracle", name: "Oracle", domain: "oracle.com" },
  { slug: "ibm", name: "IBM", domain: "ibm.com" },
  { slug: "salesforce", name: "Salesforce", domain: "salesforce.com" },
  { slug: "adobe", name: "Adobe", domain: "adobe.com" },
  { slug: "servicenow", name: "ServiceNow", domain: "servicenow.com" },
  { slug: "intuit", name: "Intuit", domain: "intuit.com" },
  { slug: "netflix", name: "Netflix", domain: "netflix.com" },
  { slug: "disney", name: "Disney", domain: "disney.com" },
  { slug: "paypal", name: "PayPal", domain: "paypal.com" },
  { slug: "uber", name: "Uber", domain: "uber.com" },
  { slug: "ups", name: "UPS", domain: "ups.com", altSlugs: ["unitedparcelsservice"] },
  { slug: "fedex", name: "FedEx", domain: "fedex.com" },
  { slug: "pfizer", name: "Pfizer", domain: "pfizer.com" },
  { slug: "jnj", name: "Johnson & Johnson", domain: "jnj.com", altSlugs: ["johnsonandjohnson"] },
  { slug: "unitedhealthgroup", name: "UnitedHealth", domain: "unitedhealthgroup.com", altSlugs: ["unitedhealthcare"] },
  { slug: "humana", name: "Humana", domain: "humana.com" },
  { slug: "cvs", name: "CVS", domain: "cvs.com" },
  { slug: "walgreens", name: "Walgreens", domain: "walgreens.com" },
  { slug: "boeing", name: "Boeing", domain: "boeing.com" },
  { slug: "lockheedmartin", name: "Lockheed Martin", domain: "lockheedmartin.com" },
  { slug: "rtx", name: "RTX", domain: "rtx.com" },
  { slug: "northropgrumman", name: "Northrop Grumman", domain: "northropgrumman.com" },
  { slug: "caterpillar", name: "Caterpillar", domain: "caterpillar.com" },
  { slug: "deere", name: "John Deere", domain: "deere.com" },
  { slug: "generalelectric", name: "GE", domain: "ge.com" },
  { slug: "atandt", name: "AT&T", domain: "att.com" },
  { slug: "verizon", name: "Verizon", domain: "verizon.com" },
  { slug: "comcast", name: "Comcast", domain: "comcast.com" },
  { slug: "tmobile", name: "T-Mobile", domain: "t-mobile.com" },
  { slug: "accenture", name: "Accenture", domain: "accenture.com" },
  { slug: "deloitte", name: "Deloitte", domain: "deloitte.com" },
  { slug: "pwc", name: "PwC", domain: "pwc.com" },
  { slug: "kpmg", name: "KPMG", domain: "kpmg.com" },
  { slug: "ey", name: "EY", domain: "ey.com" },
  { slug: "delta", name: "Delta", domain: "delta.com" },
  { slug: "unitedairlines", name: "United Airlines", domain: "united.com" },
  { slug: "americanairlines", name: "American Airlines", domain: "aa.com" },
  { slug: "metlife", name: "MetLife", domain: "metlife.com" },
  { slug: "philips", name: "Philips", domain: "philips.com" },
  { slug: "siemens", name: "Siemens", domain: "siemens.com" },
  { slug: "nestle", name: "Nestlé", domain: "nestle.com" },
  { slug: "unilever", name: "Unilever", domain: "unilever.com" },
  { slug: "novartis", name: "Novartis", domain: "novartis.com" },
  { slug: "merck", name: "Merck", domain: "merck.com" },
  { slug: "abbvie", name: "AbbVie", domain: "abbvie.com" },
  { slug: "moderna", name: "Moderna", domain: "modernatx.com" },
];

/** Two identical strips; CSS animates -50% for a gapless loop. */
const MARQUEE_SEGMENTS = 2;

/** Uniform slot — inner inset + `object-contain` keeps wide wordmarks (e.g. Amex) inside the plate. */
const MARK_BOX_CLASS = "h-10 w-[7.5rem] sm:h-11 sm:w-32";

/** Light plate so dark / monochrome marks stay legible on studio (dark) and light marketing rails. */
const MARK_PLATE_CLASS =
  "border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/[0.04] dark:border-zinc-500/40 dark:bg-zinc-100 dark:ring-white/10";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function siUrl(slug: string) {
  return `https://cdn.simpleicons.org/${slug}`;
}

function jsdelivrSiUrl(slug: string) {
  return `https://cdn.jsdelivr.net/npm/simple-icons@16/icons/${slug}.svg`;
}

function googleFaviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function duckduckgoIconUrl(domain: string) {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

function brandLogoUrls(brand: Brand): string[] {
  const slugs = [...new Set([brand.slug, ...(brand.altSlugs ?? [])])];
  const vector = slugs.flatMap((slug) => [siUrl(slug), jsdelivrSiUrl(slug)]);
  const raster = [googleFaviconUrl(brand.domain), duckduckgoIconUrl(brand.domain)];
  const custom = brand.extraUrls ?? [];
  return [...custom, ...vector, ...raster];
}

function initials(name: string): string {
  const cleaned = name.replace(/&/g, " ");
  const parts = cleaned.split(/[\s'-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  const letters = name.replace(/[^A-Za-z]/g, "");
  return letters.slice(0, 2).toUpperCase() || "Co";
}

function BrandMark({
  brand,
  instanceKey,
  linkSuffix,
  tabIndex,
}: {
  brand: Brand;
  instanceKey: string;
  /** Appended to `brand.name` for `aria-label` / `title` (locale-aware). */
  linkSuffix: string;
  /** Omit from tab order when this mark sits in a visually duplicated marquee strip. */
  tabIndex?: number;
}) {
  const urls = useMemo(() => brandLogoUrls(brand), [brand]);

  const [step, setStep] = useState(0);

  const onError = useCallback(() => {
    setStep((s) => Math.min(s + 1, urls.length));
  }, [urls.length]);

  const href = `https://${brand.domain}/`;
  const a11y = `${brand.name}${linkSuffix}`;

  const anchorClass = `${MARK_BOX_CLASS} ${MARK_PLATE_CLASS} relative flex shrink-0 items-center justify-center rounded-lg no-underline transition-[opacity,box-shadow] hover:opacity-90 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--twin-accent)]`;

  const inner =
    step >= urls.length ? (
      <span
        title={a11y}
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--twin-accent-muted)]/80 to-[var(--twin-card)]/80 text-sm font-bold tracking-tight text-[var(--twin-accent-hover)] sm:text-base"
      >
        {initials(brand.name)}
      </span>
    ) : (
      <span className="relative flex h-full w-full items-center justify-center px-2 py-1.5 sm:px-2.5">
        <Image
          key={`${instanceKey}-${step}`}
          src={urls[step]}
          alt=""
          width={96}
          height={32}
          sizes="(min-width: 640px) 128px, 120px"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          className="max-h-full max-w-full object-contain object-center contrast-[1.08] brightness-[1.02] transition-[filter,opacity]"
          onError={onError}
        />
      </span>
    );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={tabIndex}
      aria-label={a11y}
      title={a11y}
      className={anchorClass}
    >
      {inner}
    </a>
  );
}

function LogoRow({
  segmentIndex,
  ariaHidden,
  linkSuffixKey,
}: {
  segmentIndex: number;
  ariaHidden?: boolean;
  linkSuffixKey: TranslationKey;
}) {
  const { t } = useTranslation();
  const linkSuffix = t(linkSuffixKey);
  return (
    <div
      className="marketing-marquee-segment inline-flex shrink-0 items-center gap-x-5 sm:gap-x-6"
      aria-hidden={ariaHidden}
    >
      {BRANDS.map((brand) => (
        <BrandMark
          key={`${segmentIndex}-${brand.slug}`}
          brand={brand}
          instanceKey={`${segmentIndex}-${brand.slug}`}
          linkSuffix={linkSuffix}
          tabIndex={ariaHidden ? -1 : undefined}
        />
      ))}
    </div>
  );
}

/** Infinite marquee — duplicated strip; marks try SI → jsDelivr SI → favicon → DuckDuckGo → monogram. */
export function CompanyLogoMarquee() {
  const reducedMotion = usePrefersReducedMotion();
  const linkSuffixKey: TranslationKey = "site.marqueeBrandLinkSuffix";

  if (reducedMotion) {
    return (
      <div
        className="company-logo-marquee shrink-0 border-y border-[var(--twin-border)] bg-[var(--twin-surface)]/90 py-5 backdrop-blur-[2px] sm:py-5"
        role="presentation"
      >
        <div className="company-logo-marquee__viewport overflow-x-auto [-webkit-overflow-scrolling:touch] px-3 sm:px-5">
          <div className="flex w-max items-center py-1">
            <LogoRow segmentIndex={0} ariaHidden={false} linkSuffixKey={linkSuffixKey} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="company-logo-marquee shrink-0 border-y border-[var(--twin-border)] bg-[var(--twin-surface)]/90 py-5 backdrop-blur-[2px] sm:py-5"
      role="presentation"
    >
      <div className="company-logo-marquee__viewport overflow-x-clip px-3 sm:px-5" aria-hidden>
        <div className="marketing-marquee-track flex w-max items-center py-0.5 will-change-transform">
          {Array.from({ length: MARQUEE_SEGMENTS }, (_, segmentIndex) => (
            <LogoRow
              key={segmentIndex}
              segmentIndex={segmentIndex}
              ariaHidden={segmentIndex > 0}
              linkSuffixKey={linkSuffixKey}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
