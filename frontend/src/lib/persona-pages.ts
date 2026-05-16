/**
 * Three distinct product surfaces: candidate app vs recruiter workspace vs company program.
 * Copy is authoritative for marketing pages (EN/PL); other locales fall back to EN in the UI.
 */

export type PersonaId = "candidates" | "recruiters" | "companies";

export type PricingTier = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  bullets: string[];
  cta: string;
  href: string;
  highlight?: boolean;
};

export type FeatureBlock = {
  title: string;
  body: string;
};

export type PersonaBundle = {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  pillars: FeatureBlock[];
  pricingTitle: string;
  pricingLead: string;
  pricingFootnote: string;
  tiers: PricingTier[];
  logisticsTitle: string;
  logistics: string[];
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

const candidatesEn: PersonaBundle = {
  heroEyebrow: "Candidate workspace",
  heroTitle: "One pipeline for every board you enable",
  heroLead:
    "TWIN aggregates listings, scores them to your profile when it exists, and tracks applications — CV intelligence and auto-apply ship where boards and your plan allow.",
  pillars: [
    {
      title: "Discovery & match",
      body: "Multi-board feed with filters, match scores tied to skills, titles, CV text, and salary/location signals — not another siloed search tab.",
    },
    {
      title: "Profile & CV intelligence",
      body: "Structured profile, CV upload with text extraction, optional LLM enrichment for skills, suggested target titles, and a short CV readout for transparency.",
    },
    {
      title: "Applications & consent",
      body: "Statuses for pending, applied, rejected; manual apply opens the employer flow; auto-apply runs only on supported boards and paid tiers — GDPR-first consent at registration.",
    },
  ],
  pricingTitle: "Candidate pricing (self-serve)",
  pricingLead: "Stripe checkout powers Premium/Pro today; numbers below are illustrative MSRP excluding VAT.",
  pricingFootnote:
    "Actual checkout amounts depend on region, tax, and live Stripe configuration. Free tier limits tracked applications per billing policy in the app.",
  tiers: [
    {
      id: "free",
      name: "Free",
      price: "0",
      cadence: "forever",
      bullets: [
        "Core pipeline: browse, save, dismiss",
        "Limited tracked applications (see app for current cap)",
        "Profile + manual apply links",
      ],
      cta: "Create account",
      href: "/register",
    },
    {
      id: "premium",
      name: "Premium",
      price: "49 PLN",
      cadence: "per month",
      highlight: true,
      bullets: [
        "Unlimited tracked applications",
        "Auto-apply where boards + automation support it",
        "Full CV intelligence when Anthropic is configured on the API",
      ],
      cta: "Upgrade after sign-in",
      href: "/dashboard/billing",
    },
    {
      id: "pro",
      name: "Pro",
      price: "99 PLN",
      cadence: "per month",
      bullets: [
        "Everything in Premium",
        "Priority roadmap input & earlier feature flags (as released)",
        "Higher-touch support lane (best-effort MVP)",
      ],
      cta: "Talk to us",
      href: "/contact",
    },
  ],
  logisticsTitle: "Operational realities",
  logistics: [
    "You still apply on the employer site where required; TWIN does not replace board contracts.",
    "Auto-apply requires Playwright-friendly boards and Premium/Pro entitlements.",
    "CV parsing reads PDF/DOCX/TXT; scanned PDFs without text remain a best-effort extraction.",
  ],
  primaryCta: { label: "Start as a candidate", href: "/register" },
  secondaryCta: { label: "Open dashboard", href: "/dashboard" },
};

const candidatesPl: PersonaBundle = {
  heroEyebrow: "Przestrzeń dla kandydata",
  heroTitle: "Jeden pipeline na wszystkie włączone portale",
  heroLead:
    "TWIN zbiera oferty, ocenia je względem profilu (gdy jest), śledzi aplikacje — inteligencja CV i auto-aplikacja tam, gdzie portal i plan na to pozwalają.",
  pillars: [
    {
      title: "Odkrywanie i dopasowanie",
      body: "Feed z wielu portali, filtry, scoring od umiejętności, tytułów, tekstu CV oraz płacy/lokalizacji — bez kolejnego „osobnego wyszukiwarka-only”.",
    },
    {
      title: "Profil i inteligencja CV",
      body: "Profil strukturalny, upload CV z ekstrakcją tekstu, opcjonalne wzbogacenie LLM (umiejętności, propozycje stanowisk, krótka analiza) — jasno pokazane w profilu.",
    },
    {
      title: "Aplikacje i zgoda",
      body: "Statusy pending/applied/rejected; ręczne „Aplikuj” otwiera flow pracodawcy; auto-apply tylko na obsługiwanych portalach i płatnych planach — RODO od rejestracji.",
    },
  ],
  pricingTitle: "Cennik kandydata (self-serve)",
  pricingLead: "Stripe obsługuje Premium/Pro; kwoty poniżej to ilustracyjne MSRP netto orientacyjnie.",
  pricingFootnote:
    "Rzeczywista kwota zależy od regionu, podatku i konfiguracji Stripe. Limit śledzonych aplikacji na Free wynika z polityki w aplikacji.",
  tiers: [
    {
      id: "free",
      name: "Free",
      price: "0",
      cadence: "bezterminowo",
      bullets: [
        "Rdzeń pipeline: przeglądaj, zapisuj, odrzucaj",
        "Limitowana liczba śledzonych aplikacji (aktualny limit w aplikacji)",
        "Profil + ręczne linki aplikacyjne",
      ],
      cta: "Załóż konto",
      href: "/register",
    },
    {
      id: "premium",
      name: "Premium",
      price: "49 PLN",
      cadence: "miesięcznie",
      highlight: true,
      bullets: [
        "Nielimitowane śledzone aplikacje",
        "Auto-apply tam, gdzie portal i automatyzacja to umożliwiają",
        "Pełna inteligencja CV przy skonfigurowanym Anthropic po stronie API",
      ],
      cta: "Ulepsz po zalogowaniu",
      href: "/dashboard/billing",
    },
    {
      id: "pro",
      name: "Pro",
      price: "99 PLN",
      cadence: "miesięcznie",
      bullets: [
        "Wszystko z Premium",
        "Wcześniejszy dostęp do flag funkcji (gdy pojawią się w release)",
        "Kanał supportu o wyższym priorytecie (MVP, best effort)",
      ],
      cta: "Kontakt",
      href: "/contact",
    },
  ],
  logisticsTitle: "Granice operacyjne",
  logistics: [
    "Nadal aplikujesz u pracodawcy tam, gdzie wymaga tego portal — TWIN nie zastępuje umów z boardami.",
    "Auto-apply wymaga Playwright + uprawnień Premium/Pro.",
    "PDF skanowany bez warstwy tekstu = ekstrakcja na najlepszym wysiłku.",
  ],
  primaryCta: { label: "Zacznij jako kandydat", href: "/register" },
  secondaryCta: { label: "Otwórz panel", href: "/dashboard" },
};

const recruitersEn: PersonaBundle = {
  heroEyebrow: "Recruiter & sourcer workspace",
  heroTitle: "Evidence-first sourcing without candidate PII leaks",
  heroLead:
    "A different SKU: multi-seat watchlists across boards you license, exportable hiring-manager packets with timestamps, and audit-friendly geography presets — not the candidate auto-apply product.",
  pillars: [
    {
      title: "Board-aware watchlists",
      body: "Curate role families per client, attach source URLs, and freeze snapshots for compliance — separate from individual candidate accounts.",
    },
    {
      title: "Handoff packets",
      body: "Generate concise PDF/Markdown summaries: role, last verified date, salary band signals, and sourcer notes — built for hiring manager inboxes, not consumer dashboards.",
    },
    {
      title: "Governance presets",
      body: "Per-workspace rules: allowed geos, excluded boards, retention windows for exports. API access is staged on higher tiers for ATS partners.",
    },
  ],
  pricingTitle: "Recruiter seat packs (invoice)",
  pricingLead:
    "Billed monthly per active seat; onboarding call included. Candidate self-serve checkout does not apply — agreements are manual in MVP.",
  pricingFootnote:
    "Seat limits and API SLAs are contractual. RocketJobs/Pracuj data usage still respects each board’s terms — TWIN surfaces links, not scraped redistribution for recruiters without entitlement.",
  tiers: [
    {
      id: "sourcer",
      name: "Sourcer",
      price: "149 PLN",
      cadence: "per seat / month",
      bullets: ["1 seat", "Up to 50 shortlist packets / month", "Email support (48h)"],
      cta: "Book sourcer pack",
      href: "/contact",
    },
    {
      id: "talent",
      name: "Talent team",
      price: "399 PLN",
      cadence: "per month (5 seats)",
      highlight: true,
      bullets: [
        "Shared watchlists + templates",
        "200 packets / month",
        "Quarterly governance review call",
      ],
      cta: "Talk to sales",
      href: "/contact",
    },
    {
      id: "rpo",
      name: "RPO desk",
      price: "990 PLN",
      cadence: "per month (15 seats)",
      bullets: [
        "Includes API roadmap slot for ATS export",
        "Dedicated Slack / email bridge",
        "Custom retention policy per client BU",
      ],
      cta: "Request RPO desk",
      href: "/contact",
    },
  ],
  logisticsTitle: "What recruiters do NOT get here",
  logistics: [
    "No bulk download of candidate CVs from TWIN consumer accounts — different legal basis.",
    "No promise of auto-apply into third-party ATS without integration work.",
    "Recruiter features roll out on a separate roadmap from the candidate mobile/web MVP.",
  ],
  primaryCta: { label: "Contact recruiter sales", href: "/contact" },
  secondaryCta: { label: "Partner integrations", href: "/partners" },
};

const recruitersPl: PersonaBundle = {
  heroEyebrow: "Przestrzeń rekrutera i sourcera",
  heroTitle: "Sourcing oparty o dowody, bez wycieku PII kandydatów",
  heroLead:
    "Odrębny produkt: wielostanowiskowe listy obserwowanych ofert na portalach, które licencjonujesz, eksportowalne paczki dla hiring managera ze znacznikami czasu i presetami geografii — to nie jest konsumencki auto-apply.",
  pillars: [
    {
      title: "Listy per portal",
      body: "Rodziny stanowisk per klient, URL źródeł, „zamrożone” snapshoty pod compliance — oddzielone od kont kandydata.",
    },
    {
      title: "Paczki przekazania",
      body: "PDF/Markdown: rola, data weryfikacji, widełki płacowe, notatki sourcera — pod inbox HM, nie pod dashboard konsumenta.",
    },
    {
      title: "Presety zgodności",
      body: "Reguły workspace: dozwolone GEO, wykluczone portale, retencja eksportów. API na wyższych tierach pod partnerów ATS.",
    },
  ],
  pricingTitle: "Pakiety miejsc dla rekruterów (faktura)",
  pricingLead:
    "Miesięcznie za aktywne miejsce; wdrożenie z calliem. Self-serve Stripe kandydata tu nie działa — umowy ręcznie w MVP.",
  pricingFootnote:
    "Limity miejsc i SLA API są umowne. Dane RocketJobs/Pracuj — nadal tylko zgodnie z regulaminem portalu; TWIN podaje linki, nie redystrybucję bez uprawnień.",
  tiers: [
    {
      id: "sourcer",
      name: "Sourcer",
      price: "149 PLN",
      cadence: "miejsce / miesiąc",
      bullets: ["1 miejsce", "Do 50 paczek shortlist / mies.", "Support mail (48h)"],
      cta: "Umów pakiet sourcer",
      href: "/contact",
    },
    {
      id: "talent",
      name: "Zespół talentów",
      price: "399 PLN",
      cadence: "miesięcznie (5 miejsc)",
      highlight: true,
      bullets: [
        "Wspólne watchlisty + szablony",
        "200 paczek / mies.",
        "Kwartalny przegląd polityk",
      ],
      cta: "Rozmowa sprzedażowa",
      href: "/contact",
    },
    {
      id: "rpo",
      name: "Biurko RPO",
      price: "990 PLN",
      cadence: "miesięcznie (15 miejsc)",
      bullets: [
        "Slot na roadmapę API pod eksport ATS",
        "Dedykowany kanał Slack / mail",
        "Retencja eksportów per BU klienta",
      ],
      cta: "Zapytaj o RPO desk",
      href: "/contact",
    },
  ],
  logisticsTitle: "Czego rekruter NIE dostaje w tej linii",
  logistics: [
    "Brak masowego pobierania CV z kont konsumenckich TWIN — inna podstawa prawna.",
    "Brak obietnicy auto-apply do ATS bez integracji.",
    "Funkcje rekrutera mają osobny roadmap od MVP kandydata.",
  ],
  primaryCta: { label: "Kontakt — sprzedaż dla rekruterów", href: "/contact" },
  secondaryCta: { label: "Integracje partnerskie", href: "/partners" },
};

const companiesEn: PersonaBundle = {
  heroEyebrow: "Company & procurement",
  heroTitle: "Economics, security, and delivery — not per-seat sourcing",
  heroLead:
    "Enterprise programs bundle ROI modeling, DPA-ready documentation, SSO roadmap, and annual commitments. This lane owns the B2B calculator and vendor security reviews — orthogonal to recruiter seat SKUs.",
  pillars: [
    {
      title: "Finance-grade ROI",
      body: "Use the B2B calculator to compare agency success fees vs a TWIN-style operating fee, HR hour savings, and illustrative candidate bonus pools — exportable talking points for CFO decks.",
    },
    {
      title: "Security & data residency",
      body: "DPA templates, sub-processor transparency, EU-grade hosting posture, and named contacts for RfPs — separate from consumer GDPR copy on the candidate privacy page.",
    },
    {
      title: "Delivery & SLA",
      body: "Named CSM, uptime targets on paid integrations, quarterly business reviews, and custom board contracts when volume warrants — not the same support queue as Premium candidates.",
    },
  ],
  pricingTitle: "Company programs (annual)",
  pricingLead:
    "All tiers include workspace access for HRBP + finance viewers; candidate seats may be bundled separately during contracting.",
  pricingFootnote:
    "Numbers are directional for procurement conversations. Final statements of work define SLAs, data processing roles, and integration scope.",
  tiers: [
    {
      id: "growth",
      name: "Growth",
      price: "2 900 PLN",
      cadence: "per month (billed annually)",
      bullets: [
        "Single business unit rollout",
        "ROI calculator + exportable narrative",
        "Email + shared Slack triage (business hours)",
      ],
      cta: "Request growth program",
      href: "/contact",
    },
    {
      id: "scale",
      name: "Scale",
      price: "7 900 PLN",
      cadence: "per month (billed annually)",
      highlight: true,
      bullets: [
        "Multi-country policy packs",
        "DPA + vendor questionnaire support",
        "Quarterly SSO roadmap checkpoint",
      ],
      cta: "Talk to enterprise sales",
      href: "/contact",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      cadence: "multi-year option",
      bullets: [
        "99.9% SLA on agreed integrations",
        "Dedicated CSM + executive sponsor",
        "Custom data residency & procurement flows",
      ],
      cta: "Start security review",
      href: "/contact",
    },
  ],
  logisticsTitle: "How this differs from recruiter seats",
  logistics: [
    "Company programs anchor on procurement, residency, and ROI — not per-sourcer packet volume.",
    "Candidate marketing SKUs never include SSO or custom DPA unless upgraded through this lane.",
    "Calculator output remains illustrative — legal/financial sign-off stays with your teams.",
  ],
  primaryCta: { label: "Open B2B ROI calculator", href: "/calculator" },
  secondaryCta: { label: "Contact enterprise", href: "/contact" },
};

const companiesPl: PersonaBundle = {
  heroEyebrow: "Firma i procurement",
  heroTitle: "Ekonomia, bezpieczeństwo i dostawa — nie licencja per sourcer",
  heroLead:
    "Programy enterprise łączą model ROI, dokumentację pod DPA, roadmapę SSO i umowy roczne. To jest ścieżka kalkulatora B2B i security review — prostopadle do pakietów „miejsca dla rekruterów”.",
  pillars: [
    {
      title: "ROI pod finanse",
      body: "Kalkulator B2B: success fee agencji vs model operacyjny w stylu TWIN, oszczędność czasu HR, przykładowe pule bonusów dla kandydatów — materiał eksportowalny na deck CFO.",
    },
    {
      title: "Security i residency",
      body: "Szablony DPA, transparentność subprocessors, hosting w stylu EU-grade i nazwany kontakt RfP — osobno od polityki prywatności kandydata.",
    },
    {
      title: "Dostawa i SLA",
      body: "Nazwany CSM, cele uptime na płatnych integracjach, QBR i kontrakty na portale przy wolumenie — inna kolejka niż support Premium dla kandydatów.",
    },
  ],
  pricingTitle: "Programy dla firm (rocznie)",
  pricingLead:
    "Każdy tier obejmuje dostęp dla HRBP + widzów finansowych; miejsca kandydata mogą być doklejone osobno w umowie.",
  pricingFootnote:
    "Kwoty orientacyjne pod rozmowy zakupowe. Ostateczne SOW definiują SLA, role DPA i zakres integracji.",
  tiers: [
    {
      id: "growth",
      name: "Growth",
      price: "2 900 PLN",
      cadence: "miesięcznie (fakturowane rocznie)",
      bullets: [
        "Wdrożenie dla jednej jednostki biznesowej",
        "Kalkulator ROI + narracja eksportowalna",
        "Mail + Slack triage w godzinach pracy",
      ],
      cta: "Zapytaj o program Growth",
      href: "/contact",
    },
    {
      id: "scale",
      name: "Scale",
      price: "7 900 PLN",
      cadence: "miesięcznie (fakturowane rocznie)",
      highlight: true,
      bullets: [
        "Pakiet polityk multi-kraj",
        "DPA + wsparcie przy kwestionariuszu vendora",
        "Kwartalny checkpoint roadmapy SSO",
      ],
      cta: "Rozmowa enterprise",
      href: "/contact",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Indywidualnie",
      cadence: "opcja multi-year",
      bullets: [
        "SLA 99,9% na uzgodnione integracje",
        "Dedykowany CSM + sponsor wykonawczy",
        "Residency i procurement na zamówienie",
      ],
      cta: "Rozpocznij security review",
      href: "/contact",
    },
  ],
  logisticsTitle: "Różnica względem miejsc dla rekruterów",
  logistics: [
    "Program firmowy kotwiczy w procurement, residency i ROI — nie w liczbie paczek sourcerskich.",
    "SKU kandydata nie obejmuje SSO ani custom DPA bez przejścia tą ścieżką.",
    "Wynik kalkulatora pozostaje ilustracyjny — akceptacja prawno-finansowa po stronie klienta.",
  ],
  primaryCta: { label: "Otwórz kalkulator ROI B2B", href: "/calculator" },
  secondaryCta: { label: "Kontakt enterprise", href: "/contact" },
};

export const PERSONA_PAGES: Record<PersonaId, { en: PersonaBundle; pl: PersonaBundle }> = {
  candidates: { en: candidatesEn, pl: candidatesPl },
  recruiters: { en: recruitersEn, pl: recruitersPl },
  companies: { en: companiesEn, pl: companiesPl },
};

export function getPersonaBundle(persona: PersonaId, locale: string): PersonaBundle {
  return locale === "pl" ? PERSONA_PAGES[persona].pl : PERSONA_PAGES[persona].en;
}
