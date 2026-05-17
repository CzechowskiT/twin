"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

/** Corporate domain for Clearbit / Google favicon when Simple Icons slug fails. */
type Brand = {
  slug: string;
  name: string;
  domain: string;
  /** Extra Simple Icons slug attempts before leaving SI CDN. */
  altSlugs?: string[];
};

/**
 * Fortune 500–heavy mix. Each row has a working SI slug when possible + domain fallbacks.
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
  { slug: "capitalone", name: "Capital One", domain: "capitalone.com" },
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

const MARQUEE_SEGMENTS = 4;

function siUrl(slug: string) {
  return `https://cdn.simpleicons.org/${slug}`;
}

function clearbitUrl(domain: string) {
  return `https://logo.clearbit.com/${domain}`;
}

function googleFaviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
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
}: {
  brand: Brand;
  instanceKey: string;
}) {
  const urls = useMemo(() => {
    const slugs = [brand.slug, ...(brand.altSlugs ?? [])];
    const uniq = [...new Set(slugs)];
    const si = uniq.map(siUrl);
    const domain = [clearbitUrl(brand.domain), googleFaviconUrl(brand.domain)];
    /* Apple on Simple Icons is pure black — invisible on studio (dark) marquee; try favicon/Clearbit first. */
    if (brand.slug === "apple") {
      return [...domain, ...si];
    }
    return [...si, ...domain];
  }, [brand]);

  const [step, setStep] = useState(0);

  const onError = useCallback(() => {
    setStep((s) => (s + 1 < urls.length ? s + 1 : s));
  }, [urls.length]);

  if (step >= urls.length) {
    return (
      <span
        title={brand.name}
        className="inline-flex h-10 w-[7.25rem] shrink-0 items-center justify-center rounded-lg border border-[var(--twin-border)] bg-gradient-to-br from-[var(--twin-accent-muted)] to-[var(--twin-card)] text-sm font-bold tracking-tight text-[var(--twin-accent-hover)] shadow-sm sm:h-11 sm:w-[7.75rem]"
      >
        {initials(brand.name)}
      </span>
    );
  }

  return (
    <span className="inline-flex h-10 w-[7.25rem] shrink-0 items-center justify-center sm:h-11 sm:w-[7.75rem]">
      <Image
        key={`${instanceKey}-${step}`}
        src={urls[step]}
        alt=""
        width={120}
        height={40}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="max-h-10 w-auto max-w-[7.25rem] object-contain contrast-[1.12] drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.14)] transition-[filter,opacity] sm:max-h-11 sm:max-w-[7.75rem]"
        onError={onError}
      />
    </span>
  );
}

function LogoRow({ segmentIndex, ariaHidden }: { segmentIndex: number; ariaHidden?: boolean }) {
  return (
    <div
      className="inline-flex shrink-0 items-center gap-x-8 gap-y-3 px-6 sm:gap-x-12 sm:px-10"
      aria-hidden={ariaHidden}
    >
      {BRANDS.map((brand) => (
        <BrandMark key={`${segmentIndex}-${brand.slug}`} brand={brand} instanceKey={`${segmentIndex}-${brand.slug}`} />
      ))}
    </div>
  );
}

/** Infinite marquee — four segments; most marks try SI → Clearbit → favicon → monogram (Apple tries domain sources first). */
export function CompanyLogoMarquee() {
  return (
    <div
      className="border-y border-[var(--twin-border)] bg-[var(--twin-surface)]/90 py-4 backdrop-blur-[2px]"
      role="presentation"
    >
      <div className="overflow-hidden" aria-hidden>
        <div className="marketing-marquee-track flex w-max items-center will-change-transform">
          {Array.from({ length: MARQUEE_SEGMENTS }, (_, segmentIndex) => (
            <LogoRow key={segmentIndex} segmentIndex={segmentIndex} ariaHidden={segmentIndex > 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
