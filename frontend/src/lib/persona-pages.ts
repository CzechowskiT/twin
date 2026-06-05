/**
 * Three distinct product surfaces: candidate app vs recruiter workspace vs company program.
 * Copy is authoritative for marketing pages (EN/PL); other locales fall back to EN copy.
 * Numeric tier MSRP is localized to the active locale currency in getPersonaBundle.
 */
import { localizeTierPrice } from "@/lib/pricing-locale";

export type PersonaId = "candidates" | "recruiters" | "companies" | "investors";

export type PricingTier = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  /** Optional usage caps line under cadence (procurement shorthand). */
  quotaSummary?: string;
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
  /** Optional: post-hire retention / growth lane (candidates marketing). */
  growthLane?: {
    eyebrow: string;
    title: string;
    lead: string;
    items: FeatureBlock[];
  };
  pricingTitle: string;
  pricingLead: string;
  pricingFootnote: string;
  tiers: PricingTier[];
  logisticsTitle: string;
  logistics: string[];
  primaryCta: { label: string; href: string };
  /** Stacked under primary (e.g. wishlist under B2B calculator on for-companies). */
  stackedCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

const candidatesEn: PersonaBundle = {
  heroEyebrow: "Candidate workspace",
  heroTitle: "Let the boring career admin run in the background",
  heroLead:
    "One aggressive feed, profile-aware scores, CV smarts, and tracked applications for people who would rather stay in flow than live in job-tab hell. Phased auto-apply unlocks where boards, your plan, and production gates allow.",
  pillars: [
    {
      title: "Discovery & match",
      body: "Multi-board feed with filters and match scores tied to skills, titles, CV text, and salary or location signals — grouped into ready-now, near-miss with upskill paths, and stretch roles when you want interview practice. Not another siloed search tab.",
    },
    {
      title: "Profile & CV intelligence",
      body: "Structured profile, CV upload with text extraction, optional LLM enrichment for skills, suggested target titles, and a short CV readout for transparency.",
    },
    {
      title: "Applications & consent",
      body: "Statuses for pending, applied, rejected; manual apply opens the employer flow; phased auto-apply prepares packages on supported boards and paid tiers — delegated submit stays off on production until enabled. GDPR-first consent at registration.",
    },
  ],
  growthLane: {
    eyebrow: "After the offer",
    title: "Stay with TWIN after you land: growth, not just job search",
    lead:
      "The hire is a milestone, not an off-boarding event. We are building a second act in the same workspace: light-touch market awareness, review-ready artifacts, and nudges that respect employed life (quiet hours, digests). Depth ships in phases. This is the lane we want you to open monthly, not only when tabs spin out of control.",
    items: [
      {
        title: "Calibrated passive watch",
        body: "Turn the firehose into a trickle: a thin stream of high-signal roles, salary band deltas, and skill gaps versus your lane, enough to spot mis-hires early without doom-scrolling.",
      },
      {
        title: "30 / 60 / 90 + review pulse",
        body: "Structured checklists, prompts before probation milestones, and a lightweight wins log so “what did I ship?” isn’t reconstructed from memory the night before calibration.",
      },
      {
        title: "Skills & market drift radar",
        body: "Fresh listings vs your profile as a living diff: emerging stacks in your title family, certifications hiring managers suddenly mention, and suggested micro-upskills tied to real JD language.",
      },
      {
        title: "Promotion-ready packet",
        body: "One-click export: headline impact, quantified outcomes, languages, and internal mobility hooks from your CV and tracked applications, formatted for managers who live in PDFs.",
      },
      {
        title: "Quiet mode for employed life",
        body: "Weekly digest instead of intraday pings, calendar-aware nudges for review windows, and explicit “I’m heads-down” toggles so the twin whispers instead of shouts.",
      },
    ],
  },
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
      price: "$4.99",
      cadence: "per month · annual prepay −25%",
      highlight: true,
      bullets: [
        "Unlimited tracked applications",
        "Phased auto-apply where boards + automation support it (prepare-only on production today)",
        "Full CV intelligence when Anthropic is configured on the API",
      ],
      cta: "Upgrade after sign-in",
      href: "/dashboard/billing",
    },
    {
      id: "pro",
      name: "Pro",
      price: "$9.99",
      cadence: "per month · annual prepay −25%",
      bullets: [
        "Everything in Premium",
        "Priority roadmap input & earlier feature flags (as released)",
        "Higher-touch support lane (best-effort MVP)",
      ],
      cta: "Talk to us",
      href: "/contact",
    },
  ],
  logisticsTitle: "Good to know",
  logistics: [
    "Some employers still ask you to finish the application on their site — TWIN keeps track for you.",
    "Autonomous applying is rolling out in phases on supported boards (Premium or Pro when enabled) — production stays prepare-only until delegated apply ships.",
    "Scanned PDF résumés can take a moment to read — you can always edit your profile by hand.",
  ],
  primaryCta: { label: "Start free with TWIN", href: "/register" },
  secondaryCta: { label: "I already use TWIN · dashboard", href: "/dashboard" },
};

const candidatesPl: PersonaBundle = {
  heroEyebrow: "Przestrzeń dla kandydata",
  heroTitle: "Nudny admin kariery niech leci w tle",
  heroLead:
    "Jeden czytelny feed, scoring pod profil, inteligencja CV i śledzenie aplikacji dla ludzi, którzy wolą flow niż piekło tabów. Auto-apply fazowe tam, gdzie portal, plan i bramki produkcji pozwalają.",
  pillars: [
    {
      title: "Odkrywanie i dopasowanie",
      body: "Feed z wielu portali, filtry i scoring — w trzech pasach: gotowe teraz, blisko z ścieżką doszkolenia i role aspiracyjne (trening rozmów). Bez kolejnego „osobnego tylko wyszukiwarka”.",
    },
    {
      title: "Profil i inteligencja CV",
      body: "Profil strukturalny, upload CV z ekstrakcją tekstu, opcjonalne wzbogacenie LLM (umiejętności, propozycje stanowisk, krótka analiza), wszystko czytelnie w profilu.",
    },
    {
      title: "Aplikacje i zgoda",
      body: "Statusy pending/applied/rejected; ręczne „Aplikuj” otwiera flow pracodawcy; auto-apply fazowe przygotowuje pakiety na obsługiwanych portalach i płatnych planach — delegated submit wyłączony na produkcji, dopóki produkt tego nie włączy. RODO od rejestracji.",
    },
  ],
  growthLane: {
    eyebrow: "Po podpisaniu umowy",
    title: "Zostań z TWIN także w roli: rozwój, nie tylko poszukiwania",
    lead:
      "Zatrudnienie to kamień milowy, a nie powód do wylogowania. Budujemy drugi akt w tym samym workspace: lekki kontakt z rynkiem, materiały pod rozmowy o awansie i przypomnienia, które szanują tryb „jestem w pracy” (cisza, digest). Głębia wchodzi falami. Poniżej kontrakt produktowy, żebyś otwierał TWIN co miesiąc, nie tylko w kryzysie tabów.",
    items: [
      {
        title: "Uspokojony passive watch",
        body: "Zamiast zalewu: cienka struga sygnałów (wybrane role w Twojej ścieżce, zmiany widełek, luka kompetencyjna wobec świeżych JD), wystarczająco wcześnie, by wyczuć nietrafione dopasowanie, bez doom-scrolla.",
      },
      {
        title: "Puls 30 / 60 / 90 i okienek ocen",
        body: "Checklisty okresów próbnych, delikatne nudge przed ważnymi datami oraz lekki dziennik sukcesów („co dowiozłem?”), żeby nie składać narracji awansu z pamięci na dzień przed kalibracją.",
      },
      {
        title: "Radar dryfu umiejętności i rynku",
        body: "Świeże ogłoszenia vs Twój profil jako żyjąca różnica: stack w rodzinie stanowisk, certyfikacje, które nagle wracają w ofertach, i mikro-sugestie rozwoju osadzone w realnym języku JD.",
      },
      {
        title: "Pakiet pod rozmowę o awansie",
        body: "Eksport jednym kliknięciem: efekt, liczby, języki, wątki mobilności wewnętrznej z CV i historii aplikacji w TWIN, pod PDF-y managera i HRBP.",
      },
      {
        title: "Tryb ciszy dla etatu",
        body: "Digest tygodniowy zamiast pingów w ciągu dnia, szacunek dla kalendarza (np. okna ocen) i jawny przełącznik „jestem w głębokiej robocie”, żeby bliźniak szepnął, a nie krzyczał.",
      },
    ],
  },
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
      price: "19,99 zł",
      cadence: "miesięcznie · prepay roczny −25%",
      highlight: true,
      bullets: [
        "Nielimitowane śledzone aplikacje",
        "Auto-apply fazowe tam, gdzie portal i automatyzacja to umożliwiają (dziś prepare-only na produkcji)",
        "Pełna inteligencja CV przy skonfigurowanym Anthropic po stronie API",
      ],
      cta: "Ulepsz po zalogowaniu",
      href: "/dashboard/billing",
    },
    {
      id: "pro",
      name: "Pro",
      price: "39,99 zł",
      cadence: "miesięcznie · prepay roczny −25%",
      bullets: [
        "Wszystko z Premium",
        "Wcześniejszy dostęp do flag funkcji (gdy pojawią się w release)",
        "Kanał supportu o wyższym priorytecie (MVP, best effort)",
      ],
      cta: "Kontakt",
      href: "/contact",
    },
  ],
  logisticsTitle: "Warto wiedzieć",
  logistics: [
    "Niektórzy pracodawcy nadal chcą, żebyś dokończył aplikację na ich stronie — TWIN śledzi to za Ciebie.",
    "Autonomiczne aplikowanie wchodzi falami na obsługiwanych portalach (Premium/Pro, gdy włączone) — produkcja zostaje prepare-only, dopóki nie włączymy delegated apply.",
    "Skan CV w PDF? Może chwilę potrwać — profil zawsze możesz poprawić ręcznie.",
  ],
  primaryCta: { label: "Zacznij z TWIN za darmo", href: "/register" },
  secondaryCta: { label: "Już korzystam · panel", href: "/dashboard" },
};

const recruitersEn: PersonaBundle = {
  heroEyebrow: "Recruiter pilot workspace",
  heroTitle: "Pre-qualified queue — not a CV firehose",
  heroLead:
    "Live today: token-gated acceptance inbox with match scores and evidence-based reasons, batch accept/decline, and employer job POST. Pilot uses invite access codes — SSO and anonymized talent-pool browse are on the roadmap, not live yet.",
  pillars: [
    {
      title: "Acceptance inbox (live)",
      body: "Short queue of applications TWIN already matched to your roles. Each row shows a match score, up to three rule-based reasons, and accept/decline — recruiter decision always required.",
    },
    {
      title: "Match transparency (live)",
      body: "Deterministic ranking from profile overlap (skills, title, location, salary band). No black-box LLM on inbox rows — AI-assisted sorting only; you decide who gets an interview slot.",
    },
    {
      title: "Employer jobs + placement (pilot)",
      body: "Post roles via recruiter API; placement verification uses one-click employer attestation. Watchlists, HM packets, and governance presets are marketing roadmap — contact us for pilot scope.",
    },
  ],
  pricingTitle: "Recruiter pilot (invite-only)",
  pricingLead:
    "Named pilot partners get token inbox access and onboarding call. Seat packs and invoice billing are contractual — self-serve checkout does not apply during MVP.",
  pricingFootnote:
    "Pilot inbox shows candidate names for application review (not the anonymized B2B talent pool). Auto-apply is paused on production; delegated submit is not live.",
  tiers: [
    {
      id: "pilot",
      name: "Pilot inbox",
      price: "Invite",
      cadence: "token access",
      bullets: [
        "Batch accept/decline inbox",
        "Match score + reasons on each row",
        "Post jobs via recruiter API",
      ],
      cta: "Request pilot access",
      href: "/contact",
    },
    {
      id: "talent",
      name: "Talent team (roadmap)",
      price: "399 PLN",
      cadence: "per month (5 seats)",
      highlight: true,
      bullets: [
        "Shared watchlists + templates (not shipped)",
        "HM handoff packets (not shipped)",
        "Quarterly governance review call",
      ],
      cta: "Talk to sales",
      href: "/contact",
    },
    {
      id: "rpo",
      name: "RPO desk (roadmap)",
      price: "990 PLN",
      cadence: "per month (15 seats)",
      bullets: [
        "ATS export API slot (scaffold only today)",
        "Dedicated Slack / email bridge",
        "Custom retention policy per client BU",
      ],
      cta: "Request RPO desk",
      href: "/contact",
    },
  ],
  logisticsTitle: "What is live vs roadmap",
  logistics: [
    "Live: `/recruiter/inbox` (token), match scores, batch respond, `/recruiter/jobs` POST.",
    "Roadmap / not shipped: watchlists, HM packets, governance presets, employer SSO.",
    "Talent pool browse for recruiters is anonymized by design — separate from inbox application review.",
  ],
  primaryCta: { label: "Open recruiter inbox", href: "/recruiter/inbox" },
  secondaryCta: { label: "Contact pilot onboarding", href: "/contact" },
};

const recruitersPl: PersonaBundle = {
  heroEyebrow: "Pilotażowa przestrzeń rekrutera",
  heroTitle: "Pre-kwalifikowana kolejka — nie góra CV",
  heroLead:
    "Dziś na żywo: skrzynka akceptacji z kodem dostępu, wyniki dopasowania z uzasadnieniami, masowe akceptuj/odrzuć oraz POST ogłoszeń. Pilotaż na zaproszenie — SSO i anonimowa pula talentów to roadmapa, nie produkcja.",
  pillars: [
    {
      title: "Skrzynka akceptacji (live)",
      body: "Krótka kolejka aplikacji dopasowanych do Twoich ról. Każdy wiersz: wynik dopasowania, do trzech regułowych powodów, akceptuj/odrzuć — decyzja rekrutera zawsze wymagana.",
    },
    {
      title: "Transparentność dopasowania (live)",
      body: "Deterministyczny ranking z nakładki profilu (umiejętności, tytuł, lokalizacja, widełki). Bez black-box LLM w skrzynce — sortowanie wspomagane AI; Ty decydujesz o slocie na rozmowę.",
    },
    {
      title: "Ogłoszenia + placement (pilotaż)",
      body: "Publikacja ról przez API rekrutera; weryfikacja placementu przez attestację pracodawcy. Watchlisty, paczki HM i presety zgodności to roadmapa marketingowa — skontaktuj się w sprawie pilotażu.",
    },
  ],
  pricingTitle: "Pilotaż rekrutera (tylko zaproszenie)",
  pricingLead:
    "Partnerzy pilotażowi dostają token do skrzynki i rozmowę wdrożeniową. Pakiety miejsc i faktura są umowne — self-serve Stripe kandydata tu nie działa.",
  pricingFootnote:
    "Skrzynka pilotażowa pokazuje imiona kandydatów przy przeglądzie aplikacji (nie anonimowa pula B2B). Auto-apply wstrzymane na produkcji; delegated submit wyłączony.",
  tiers: [
    {
      id: "pilot",
      name: "Skrzynka pilotażowa",
      price: "Zaproszenie",
      cadence: "dostęp tokenem",
      bullets: [
        "Masowe akceptuj/odrzuć w skrzynce",
        "Wynik dopasowania + powody w wierszu",
        "Publikacja ogłoszeń przez API",
      ],
      cta: "Poproś o dostęp pilotażowy",
      href: "/contact",
    },
    {
      id: "talent",
      name: "Zespół talentów (roadmapa)",
      price: "399 PLN",
      cadence: "miesięcznie (5 miejsc)",
      highlight: true,
      bullets: [
        "Wspólne watchlisty + szablony (nieshipowane)",
        "Paczki HM (nieshipowane)",
        "Kwartalny przegląd polityk",
      ],
      cta: "Rozmowa sprzedażowa",
      href: "/contact",
    },
    {
      id: "rpo",
      name: "Biurko RPO (roadmapa)",
      price: "990 PLN",
      cadence: "miesięcznie (15 miejsc)",
      bullets: [
        "Slot API ATS (dziś tylko scaffold)",
        "Dedykowany kanał Slack / mail",
        "Retencja eksportów per BU klienta",
      ],
      cta: "Zapytaj o RPO desk",
      href: "/contact",
    },
  ],
  logisticsTitle: "Co jest live, a co roadmapą",
  logistics: [
    "Live: `/recruiter/inbox` (token), wyniki dopasowania, batch respond, POST `/recruiter/jobs`.",
    "Roadmapa / nieshipowane: watchlisty, paczki HM, presety zgodności, SSO pracodawcy.",
    "Przegląd puli talentów dla rekruterów jest anonimizowany — osobno od przeglądu aplikacji w skrzynce.",
  ],
  primaryCta: { label: "Otwórz skrzynkę rekrutera", href: "/recruiter/inbox" },
  secondaryCta: { label: "Kontakt: onboarding pilotażu", href: "/contact" },
};

const companiesEn: PersonaBundle = {
  heroEyebrow: "Company & procurement",
  heroTitle: "Economics, security, and delivery beyond per-seat sourcing",
  heroLead:
    "Enterprise programs bundle ROI modeling, DPA-ready documentation, SSO roadmap, and annual commitments. This lane owns the B2B calculator and vendor security reviews. It sits apart from recruiter seat SKUs.",
  pillars: [
    {
      title: "Finance-grade ROI",
      body: "Use the B2B calculator to compare agency success fees with a TWIN-style operating fee, HR hour savings, and illustrative candidate bonus pools. Exportable talking points for CFO decks.",
    },
    {
      title: "Security & data residency",
      body: "DPA templates, sub-processor transparency, EU-grade hosting posture, and named contacts for RfPs, separate from the consumer GDPR copy on the candidate privacy page.",
    },
    {
      title: "Delivery & SLA",
      body: "Named CSM, uptime targets on paid integrations, quarterly business reviews, and custom board contracts when volume warrants. Not the same support queue as Premium candidates.",
    },
  ],
  pricingTitle: "Company programs (annual)",
  pricingLead:
    "All tiers include workspace access for HRBP + finance viewers; candidate seats may be bundled separately during contracting.",
  pricingFootnote:
    "Numbers are directional for procurement conversations. Final statements of work define SLAs, data processing roles, and integration scope.",
  tiers: [
    {
      id: "flat-rate",
      name: "Vacancy flat rate",
      price: "10% of vacancy spend",
      cadence: "illustrative · high-volume hiring",
      quotaSummary: "Example: 1,000 FTE × 15% rotation → 150 roles · vs 500 PLN/vacancy floor",
      bullets: [
        "Modeled in the B2B ROI calculator (vacancy budget block)",
        "Alternative to per-hire % of salary for employers with predictable posting volume",
        "Combine with workspace seats or annual Growth/Scale programs in the SOW",
        "Placement verification and attestation still apply for fee eligibility",
      ],
      cta: "Model flat rate in calculator",
      href: "/calculator/b2b#flat-rate",
    },
    {
      id: "growth",
      name: "Growth",
      price: "2 900 PLN",
      cadence: "per month (billed annually)",
      quotaSummary: "1 business unit · 10 recruiter seats · HRBP + finance viewers",
      bullets: [
        "Single-country rollout with standard EU-hosted workspace",
        "B2B ROI calculator + CFO-ready export narrative",
        "Acceptance pipeline dashboard (accept / decline / reschedule)",
        "Standard DPA template + sub-processor list (self-serve)",
        "Google Calendar interview holds + ICS/WebCal export",
        "Email + shared Slack triage (business hours, 2-day response)",
      ],
      cta: "Request growth program",
      href: "/contact",
    },
    {
      id: "scale",
      name: "Scale",
      price: "7 900 PLN",
      cadence: "per month (billed annually)",
      quotaSummary: "Up to 5 BUs or countries · 50 recruiter seats · unlimited viewers",
      highlight: true,
      bullets: [
        "Everything in Growth, and:",
        "Multi-country policy packs + localized consent playbooks",
        "Named legal liaison for DPA + vendor security questionnaires",
        "SSO roadmap (Microsoft Entra ID / Google Workspace) with quarterly checkpoint",
        "RBAC: HRBP, finance, sourcer, and read-only auditor roles",
        "ATS outbound webhooks + employer one-click placement attestation",
        "Machine-assisted placement verification (no email ping-pong default)",
        "Microsoft 365 + Google org calendars for interview holds",
        "Ranked pipeline analytics + quarterly business review deck export",
        "Bundled talent-pool preview lanes for hiring managers (no CV dump)",
        "99.5% API uptime SLA · 24h business-day support",
      ],
      cta: "Talk to enterprise sales",
      href: "/contact",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      cadence: "multi-year option",
      quotaSummary: "Unlimited org units · flexible seats · custom commercial constructs",
      bullets: [
        "Everything in Scale, and:",
        "99.9% SLA with service credits on contractually named integrations",
        "Dedicated CSM, executive sponsor, and board-ready QBR cadence",
        "Custom data residency, subprocessors addendum, and insurance packet",
        "SSO/SCIM at scale + custom RBAC roles and audit log exports",
        "Bi-directional ATS sync workshops + private integration SLA",
        "Branded employer subdomain on candidate touchpoints",
        "Custom placement-fee economics + bonus pool rules in the SOW",
        "Isolated tenant / VPC peering / customer-managed keys (scope in SOW)",
        "Annual penetration-test summary + customer security review program",
        "Priority Slack + phone channel with negotiated response times",
        "Workforce analytics API (read-only exports) for your BI stack",
        "Offline procurement pack: legal, finance, and IT security in one thread",
      ],
      cta: "Start security review",
      href: "/contact",
    },
  ],
  logisticsTitle: "How this differs from recruiter seats",
  logistics: [
    "Company programs anchor on procurement, residency, and ROI, not on per-sourcer packet volume.",
    "Candidate marketing SKUs never include SSO or custom DPA unless upgraded through this lane.",
    "Calculator output remains illustrative; legal and financial sign-off stays with your teams.",
  ],
  primaryCta: { label: "Open B2B ROI calculator", href: "/calculator/b2b" },
  stackedCta: { label: "Join founding wishlist", href: "/waitlist" },
  secondaryCta: { label: "Contact enterprise", href: "/contact" },
};

const investorsEn: PersonaBundle = {
  heroEyebrow: "Investor workspace",
  heroTitle: "Scenario models and traction metrics — not employer procurement",
  heroLead:
    "This lane is for funds and angels: five-year scenario calculator, live-style metrics panels, and deck-ready exports. Employer pricing, DPA packs, and the B2B ROI calculator live under Companies — a separate commercial story.",
  pillars: [
    {
      title: "Scenario calculator",
      body: "Illustrative revenue mix, success-fee sensitivity, team and infra costs — tuned for investor diligence, not CFO procurement decks.",
    },
    {
      title: "Metrics & narrative",
      body: "Traction snapshots, cohort placeholders, and export hooks you can paste into a data room after sign-in.",
    },
    {
      title: "Clear boundary vs Companies",
      body: "No annual enterprise SKUs here. If you are HR or procurement, switch to Companies for program pricing and vendor security.",
    },
  ],
  pricingTitle: "Access (post sign-in)",
  pricingLead: "Tools open after investor workspace login. Marketing below is a preview; calculators are not mixed with employer checkout.",
  pricingFootnote: "Numbers are illustrative models only — not an offer or forecast.",
  tiers: [
    {
      id: "preview",
      name: "Public preview",
      price: "—",
      cadence: "marketing",
      bullets: [
        "Read the investor story and lane boundaries on this page",
        "See which tools exist before you authenticate",
      ],
      cta: "Sign in to workspace",
      href: "/login/investor",
    },
    {
      id: "workspace",
      name: "Investor workspace",
      price: "Invite",
      cadence: "gated",
      highlight: true,
      bullets: [
        "Five-year scenario calculator (/investor/calculator)",
        "Metrics panel (/investor/metrics)",
        "Deck-oriented exports (as shipped in workspace)",
      ],
      cta: "Open workspace",
      href: "/workspace/investor",
    },
  ],
  logisticsTitle: "Not the same as Companies",
  logistics: [
    "Companies owns B2B ROI, DPA templates, and annual program tiers.",
    "Investor owns fund-style models — sign in to run calculators, not to buy recruiter seats.",
    "Recruiter SKUs remain on the Recruiters lane.",
  ],
  primaryCta: { label: "Sign in to investor workspace", href: "/login/investor" },
  secondaryCta: { label: "Browse Companies pricing", href: "/for-companies" },
};

const investorsPl: PersonaBundle = {
  heroEyebrow: "Workspace inwestora",
  heroTitle: "Modele scenariusza i metryki — nie procurement pracodawcy",
  heroLead:
    "Ścieżka dla funduszy i aniołów: kalkulator pięcioletni, panele metryk i eksporty pod deck. Cennik firm, DPA i kalkulator ROI B2B są w sekcji Firmy — osobna historia komercyjna.",
  pillars: [
    {
      title: "Kalkulator scenariusza",
      body: "Ilustracyjny mix przychodów, wrażliwość success fee, koszty zespołu i infra — pod due diligence inwestora, nie decki CFO.",
    },
    {
      title: "Metryki i narracja",
      body: "Snapshoty trakcji, placeholdery kohort i eksporty do data room po zalogowaniu.",
    },
    {
      title: "Granica względem Firm",
      body: "Bez rocznych SKU enterprise. HR i procurement → przełącz na Firmy.",
    },
  ],
  pricingTitle: "Dostęp (po logowaniu)",
  pricingLead: "Narzędzia po zalogowaniu do workspace inwestora. Poniżej podgląd — kalkulatory nie są mieszane z checkoutem pracodawcy.",
  pricingFootnote: "Liczby to modele ilustracyjne — nie oferta ani prognoza.",
  tiers: [
    {
      id: "preview",
      name: "Podgląd publiczny",
      price: "—",
      cadence: "marketing",
      bullets: ["Historia inwestora i granice ścieżek", "Lista narzędzi przed autentykacją"],
      cta: "Zaloguj się",
      href: "/login/investor",
    },
    {
      id: "workspace",
      name: "Workspace inwestora",
      price: "Zaproszenie",
      cadence: "po logowaniu",
      highlight: true,
      bullets: [
        "Kalkulator pięcioletni (/investor/calculator)",
        "Panel metryk (/investor/metrics)",
        "Eksporty pod deck (wg workspace)",
      ],
      cta: "Otwórz workspace",
      href: "/workspace/investor",
    },
  ],
  logisticsTitle: "To nie to samo co Firmy",
  logistics: [
    "Firmy: ROI B2B, DPA, roczne programy.",
    "Inwestor: modele funduszowe — logowanie, nie zakup miejsc rekrutera.",
    "SKU rekrutera zostaje w ścieżce Rekruterów.",
  ],
  primaryCta: { label: "Zaloguj do workspace inwestora", href: "/login/investor" },
  secondaryCta: { label: "Cennik Firm", href: "/for-companies" },
};

const companiesPl: PersonaBundle = {
  heroEyebrow: "Firma i procurement",
  heroTitle: "Ekonomia, bezpieczeństwo i dostawa zamiast licencji per sourcer",
  heroLead:
    "Programy enterprise łączą model ROI, dokumentację pod DPA, roadmapę SSO i umowy roczne. To ścieżka kalkulatora B2B i przeglądów bezpieczeństwa, osobna od pakietów „miejsc dla rekruterów”.",
  pillars: [
    {
      title: "ROI pod finanse",
      body: "Kalkulator B2B: success fee agencji obok modelu operacyjnego w stylu TWIN, oszczędność czasu HR, przykładowe pule bonusów dla kandydatów. Materiał pod deck CFO.",
    },
    {
      title: "Security i residency",
      body: "Szablony DPA, transparentność subprocessors, hosting w stylu EU-grade i nazwany kontakt RfP, osobno od polityki prywatności kandydata.",
    },
    {
      title: "Dostawa i SLA",
      body: "Nazwany CSM, cele uptime na płatnych integracjach, QBR i kontrakty na portale przy wolumenie. Inna kolejka niż support Premium dla kandydatów.",
    },
  ],
  pricingTitle: "Programy dla firm (rocznie)",
  pricingLead:
    "Każdy tier obejmuje dostęp dla HRBP + widzów finansowych; miejsca kandydata mogą być doklejone osobno w umowie.",
  pricingFootnote:
    "Kwoty orientacyjne pod rozmowy zakupowe. Ostateczne SOW definiują SLA, role DPA i zakres integracji.",
  tiers: [
    {
      id: "flat-rate",
      name: "Flat rate wakatów",
      price: "10% budżetu publikacji",
      cadence: "ilustracja · duży wolumen rekrutacji",
      quotaSummary: "Przykład: 1 000 FTE × 15% rotacji → 150 ról · floor 500 PLN/wakat",
      bullets: [
        "Policz w kalkulatorze ROI B2B (sekcja flat rate)",
        "Alternatywa dla success fee od pensji przy przewidywalnym wolumenie ogłoszeń",
        "Możliwa hybryda z programem Growth/Scale i miejscami workspace w SOW",
        "Weryfikacja placementu i atestacja pracodawcy nadal obowiązują przy opłacie",
      ],
      cta: "Modeluj flat rate",
      href: "/calculator/b2b#flat-rate",
    },
    {
      id: "growth",
      name: "Growth",
      price: "2 900 PLN",
      cadence: "miesięcznie (fakturowane rocznie)",
      quotaSummary: "1 jednostka biznesowa · 10 miejsc rekruterów · HRBP + finanse",
      bullets: [
        "Wdrożenie w jednym kraju, workspace EU-grade",
        "Kalkulator ROI B2B + narracja pod deck CFO",
        "Panel akceptacji (accept / decline / reschedule)",
        "Standardowy DPA + lista subprocessors (self-serve)",
        "Google Calendar + eksport ICS/WebCal na sloty rozmów",
        "Mail + Slack triage w godzinach pracy (odpowiedź do 2 dni)",
      ],
      cta: "Zapytaj o program Growth",
      href: "/contact",
    },
    {
      id: "scale",
      name: "Scale",
      price: "7 900 PLN",
      cadence: "miesięcznie (fakturowane rocznie)",
      quotaSummary: "Do 5 BU lub krajów · 50 miejsc rekruterów · nieograniczeni widzowie",
      highlight: true,
      bullets: [
        "Wszystko z Growth, plus:",
        "Pakiety polityk multi-kraj + playbooki zgód",
        "Nazwany kontakt prawny przy DPA i kwestionariuszu security",
        "Roadmapa SSO (Entra ID / Google Workspace) + checkpoint co kwartał",
        "RBAC: HRBP, finanse, sourcer, audytor read-only",
        "Webhooki ATS + jednoklikowa atestacja placementu po stronie pracodawcy",
        "Weryfikacja placementu maszynowo — bez domyślnego ping-pongu mailowego",
        "Kalendarze org: Microsoft 365 + Google na holdy rozmów",
        "Analityka pipeline + eksport decku pod QBR",
        "Podgląd talent pool dla hiring managerów (bez zrzutu CV)",
        "SLA API 99,5% · support w dni robocze, reakcja 24h",
      ],
      cta: "Rozmowa enterprise",
      href: "/contact",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Indywidualnie",
      cadence: "opcja multi-year",
      quotaSummary: "Nieograniczone BU · elastyczne miejsca · konstrukty umowne na miarę",
      bullets: [
        "Wszystko ze Scale, plus:",
        "SLA 99,9% z kredytami serwisowymi na nazwane integracje",
        "Dedykowany CSM, sponsor wykonawczy i QBR pod zarząd",
        "Residency, aneks subprocessors i pakiet ubezpieczeniowy",
        "SSO/SCIM + własne role RBAC i eksport logów audytu",
        "Warsztaty sync ATS dwukierunkowy + prywatne SLA integracji",
        "Branded subdomena pracodawcy w touchpointach kandydata",
        "Własna ekonomia success fee i pul bonusów w SOW",
        "Tenant izolowany / VPC / klucze klienta (zakres w SOW)",
        "Roczne podsumowanie pentestu + program security review",
        "Priorytetowy Slack + telefon z negocjowanym SLA",
        "API analityki workforce (read-only) do Twojego BI",
        "Pakiet procurement: legal, finanse i IT w jednym wątku",
      ],
      cta: "Rozpocznij security review",
      href: "/contact",
    },
  ],
  logisticsTitle: "Różnica względem miejsc dla rekruterów",
  logistics: [
    "Program firmowy kotwiczy w procurement, residency i ROI, a nie w liczbie paczek sourcerskich.",
    "SKU kandydata nie obejmuje SSO ani custom DPA bez przejścia tę ścieżką.",
    "Wynik kalkulatora pozostaje ilustracyjny; akceptacja prawno-finansowa pozostaje po stronie klienta.",
  ],
  primaryCta: { label: "Otwórz kalkulator ROI B2B", href: "/calculator/b2b" },
  stackedCta: { label: "Dołącz do founding wishlist", href: "/waitlist" },
  secondaryCta: { label: "Kontakt enterprise", href: "/contact" },
};

export const PERSONA_PAGES: Record<PersonaId, { en: PersonaBundle; pl: PersonaBundle }> = {
  candidates: { en: candidatesEn, pl: candidatesPl },
  recruiters: { en: recruitersEn, pl: recruitersPl },
  companies: { en: companiesEn, pl: companiesPl },
  investors: { en: investorsEn, pl: investorsPl },
};

function withLocalePricing(bundle: PersonaBundle, locale: string): PersonaBundle {
  return {
    ...bundle,
    tiers: bundle.tiers.map((tier) => ({
      ...tier,
      price: localizeTierPrice(tier.id, tier.price, locale),
    })),
  };
}

export function getPersonaBundle(persona: PersonaId, locale: string): PersonaBundle {
  const copy = locale === "pl" ? PERSONA_PAGES[persona].pl : PERSONA_PAGES[persona].en;
  return withLocalePricing(copy, locale);
}
