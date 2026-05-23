/** Marketing FAQ copy — EN + PL only (other locales fall back to EN). */

export const FAQ_MESSAGES_EN = {
  homeTeaserLead:
    "{count} answers across general, candidates, recruiters, companies, and investors — open the full FAQ for persona tabs.",
  homeCta: "See all {count} answers",
  homeCtaHint: "Persona tabs on the full FAQ page",
  sectionGeneral: "General",
  sectionCandidates: "Candidates",
  sectionRecruiters: "Recruiters",
  sectionCompanies: "Companies",
  sectionInvestors: "Investors",

  general01Q: "What is TWIN today?",
  general01A:
    "A career agent that reduces tab chaos: aggregated job discovery from boards you enable, profile-aware ranking, application tracking, and early autopilot pieces (CV tailoring, career assistant, nightly auto-apply where boards and consent allow). The north star is a short calendar of acceptance-ready moments — not more inbox spam.",
  general02Q: "Who is TWIN for?",
  general02A:
    "Four lanes share one platform with separate surfaces: candidates hunting roles, recruiters running acceptance workflows, companies buying B2B programs, and investors reviewing traction. Pick the lane that matches how you sign up — SKUs and billing differ by persona.",
  general03Q: "How is this different from one job board?",
  general03A:
    "Boards remain where postings live. TWIN is the layer that normalizes discovery, match signals, follow-up, and (where allowed) automation in one UX. You still complete employer flows when a board requires it — we do not pretend to replace every ATS apply button on day one.",
  general04Q: "What is “calendar of acceptance”?",
  general04A:
    "After time away you should return to a short list worth acting on — interviews and profiles you can accept or decline in one motion — not thousands of raw CVs or random interview spam. Matching, consent, async work, batch acceptance UI, and calendar export/sync all serve that outcome.",
  general05Q: "What about privacy and GDPR?",
  general05A:
    "You give explicit consent at registration. Profile data powers ranking and product features. Retention, export, and your rights are documented in our Privacy Policy. We minimize surprise employer contact; placement verification defaults to in-product, self-serve flows.",

  candidates01Q: "How does job matching work?",
  candidates01A:
    "Live today: jobs from enabled boards are stored, deduplicated, and ranked against your profile signals (skills, preferences, history). Explanations are improving in public phases — the goal is fewer false positives, not maximum volume.",
  candidates02Q: "Which job boards are supported?",
  candidates02A:
    "Phase 1 scraping targets Polish boards such as pracuj.pl and rocketjobs.pl, plus LinkedIn where configured. You choose which sources to enable; ops may gate scrapers on allowlists in beta. More boards land as compliance and reliability allow.",
  candidates03Q: "What is auto-apply — and is it live?",
  candidates03A:
    "Nightly auto-apply runs only after explicit consent and where a board’s flow can be automated safely. It is in the repo with Celery scheduling — treat it as beta: not every posting or employer site is eligible. You can review what was sent and track status in your pipeline.",
  candidates04Q: "Can TWIN tailor my CV for a role?",
  candidates04A:
    "Yes — Career Assistant includes ATS-oriented CV optimization tied to a specific job when you have a CV on profile. Outputs are drafts you should review; we do not silently replace your master CV without you choosing to use the result.",
  candidates05Q: "What does the Career Assistant include?",
  candidates05A:
    "Live slices include company intel, cover letter drafts, hiring-manager insights, interview prep, negotiation briefs, follow-up emails, and LinkedIn suggestions — all gated on profile data and explicit product use. Features evolve; see in-app labels for what your build exposes.",
  candidates06Q: "How do calendars and interview holds work?",
  candidates06A:
    "Shipped: Google Calendar OAuth (busy times + writing holds where configured), WebCal subscribe links, and ICS-friendly exports. Microsoft 365 via Graph is wired in the product direction with OAuth when API credentials are set. Apple users typically subscribe via WebCal/ICS — there is no single “Sign in with Apple Calendar” for all apps.",
  candidates07Q: "What is the candidate acceptance queue?",
  candidates07A:
    "A short dashboard list of interview holds and strong matches you can keep, reschedule, or decline — so your calendar stays intentional. It complements recruiter-proposed slots; it is not a second spam inbox.",
  candidates08Q: "How does placement verification work for candidates?",
  candidates08A:
    "In-app self-declaration, optional work-email magic link, and employer one-click attestation links — not endless “did you sign yet?” email loops from our team. Full state machine and billing hooks are phased; see docs/PLACEMENT_VERIFICATION.md for design intent.",
  candidates09Q: "What does pricing look like for candidates?",
  candidates09A:
    "Candidate checkout uses Stripe for paid plans; a founders waitlist campaign can grant free access for early cohorts per published terms. Check billing screens after login for what your environment enables — we do not quote hidden fees in FAQ.",
  candidates10Q: "Is TWIN replacing recruiters?",
  candidates10A:
    "No. TWIN reduces noise on both sides: candidates get fewer, better-fit motions; recruiters get batch acceptance and ATS-friendly signals instead of blind CV floods. Humans still decide hires; software handles ranking, paperwork, and scheduling hygiene.",
  candidates11Q: "What should I do before relying on autopilot?",
  candidates11A:
    "Complete your profile, upload a CV, connect calendar if you want holds, enable only boards you trust, and read auto-apply consent carefully. Start with saves and manual applies, then turn on nightly auto-apply when you are comfortable with the audit trail.",

  recruiters01Q: "What is the recruiter acceptance inbox?",
  recruiters01A:
    "A pilot surface for a company slug: a short queue of applications you can accept for interview or decline without treating email as the system of record. You need a recruiter token from your TWIN pilot link — not a public open inbox.",
  recruiters02Q: "How does batch accept differ from a normal ATS inbox?",
  recruiters02A:
    "Batch accept is about pre-qualified rows: accept or pass in one screen, aimed at clearing a queue into calendar-ready next steps. It is not designed to maximize raw applicant count — quality and match bar come first.",
  recruiters03Q: "Can I post jobs into TWIN?",
  recruiters03A:
    "Yes — employer job publishing exists for recruiter workspaces tied to a company slug. Listings feed the same matching and application objects as scraped jobs where configured.",
  recruiters04Q: "Which ATS integrations exist today?",
  recruiters04A:
    "Hire webhooks for Greenhouse, Lever, and Ashby can mark placements verified when external_ats_id is linked on an application. Greenhouse/Lever OAuth connect buttons appear when API env vars are set; otherwise configure webhooks manually. This is integration plumbing — not a full two-way ATS replacement.",
  recruiters05Q: "How should we link applications to Greenhouse?",
  recruiters05A:
    "Store external_ats_id and external_ats_provider (greenhouse, lever, ashby) on the TWIN application row so hire events reconcile. See ATS_WEBHOOKS.md in the repo and the in-app ATS webhooks page for URL, signature header, and secret setup.",
  recruiters06Q: "What pipeline stages does TWIN track?",
  recruiters06A:
    "Candidates see application status in one pipeline; recruiters see acceptance-oriented queues and employer attestation flows. Deeper ATS stage sync is roadmap — today focus is acceptance-ready hand-offs, not mirroring every custom Greenhouse stage name.",
  recruiters07Q: "How is recruiter pricing billed?",
  recruiters07A:
    "Recruiter seats are invoice-oriented B2B SKUs (not the candidate Stripe checkout). Contracts define seat count, company slug access, and whether ATS webhooks or attestation links are included.",
  recruiters08Q: "Can employers confirm hire without a TWIN account?",
  recruiters08A:
    "Yes — candidates can share a one-click employer attestation URL (nonce, expires) so hiring managers confirm placement without creating a login. This supports machine-assisted verification instead of CS email ping-pong.",
  recruiters09Q: "What is not live yet for recruiters?",
  recruiters09A:
    "Full enterprise SSO, deep bi-directional ATS stage sync, and polished multi-tenant governance are still hardening. Pilot customers should expect token-based inbox access and webhook-first ATS hooks before a fully self-serve recruiter marketplace.",

  companies01Q: "What do companies buy from TWIN?",
  companies01A:
    "Annual B2B programs: sourcing coverage, recruiter seats, optional ATS webhook verification, and placement economics aligned to verified hires — not pay-per-resume spam. Procurement-friendly SKUs are separated from candidate subscriptions.",
  companies02Q: "How does procurement usually engage?",
  companies02A:
    "Standard path: security questionnaire, DPA, annual order form, and defined company slug(s). We document data flows (scraping, AI, calendar) in legal packs; confidential financials stay out of the public site.",
  companies03Q: "How is placement verified for fees?",
  companies03A:
    "Default: self-serve candidate declaration plus optional work-email proof and employer attestation or ATS hire webhooks — append-only events, no standing team chasing “signed yet?” emails. Disputes go to an exception queue, not manual ping-pong as the primary product.",
  companies04Q: "Can our ATS be the source of truth?",
  companies04A:
    "For hire confirmation, yes — webhooks from Greenhouse, Lever, or Ashby are the preferred collision profile when contracted. TWIN still surfaces discovery and match for candidates; ATS remains authoritative for requisition lifecycle if you want it that way.",
  companies05Q: "What data leaves our boundary?",
  companies05A:
    "Candidate profiles, application events, and optional calendar metadata you authorize. Employer attestation clicks log confirmation without requiring full TWIN accounts. Exact subprocessors and regions are listed in the Privacy Policy and B2B DPA.",
  companies06Q: "Do you contact our employees or candidates by surprise?",
  companies06A:
    "No surprise outbound employer campaigns. Transactional email is limited to consented flows (magic links, attestation requests the candidate initiates). Marketing to your workforce is not part of the B2B default.",
  companies07Q: "What is on the roadmap for enterprise?",
  companies07A:
    "Microsoft calendar at scale, richer SSO, HRIS beyond ATS webhooks, and automated invoice eligibility tied to the placement state machine. We ship when auditability is clear — not when a slide deck says “complete system.”",

  investors01Q: "Where is the investor data room?",
  investors01A:
    "Logged-in investor workspace: public traction pack (metrics dashboard, MVP stats JSON, OpenAPI, status page, calculator export) plus gated placeholders for cap table and audited financials. Request access for confidential downloads.",
  investors02Q: "Is there an NDA before confidential materials?",
  investors02A:
    "A browser-session NDA stub unlocks preview placeholders today; full cap table, financials, and legal downloads still require signed access via contact. Document registration can store metadata now; S3 presigned uploads depend on API env configuration.",
  investors03Q: "What metrics can I see without a meeting?",
  investors03A:
    "Live MVP stats and investor metrics dashboards (validated job counts, system health signals, product usage where instrumented). Treat numbers as beta traction, not audited financials — those sit behind confidential access.",
  investors04Q: "How do you think about placement verification economically?",
  investors04A:
    "We avoid marketplace “CS tennis” — machine-assisted, in-product verification with optional employer attestation and ATS webhooks. That scales gross margin better than manual email loops, with an exception path for disputes only.",
  investors05Q: "What is defensible vs job boards?",
  investors05A:
    "Cross-board normalization, consent-gated automation, acceptance-oriented UX on both sides, and calendar-synced outcomes. Boards optimize listings; TWIN optimizes the path from discovery to verified placement with less noise.",
  investors06Q: "What is the current phase and traction honest take?",
  investors06A:
    "Phase 1 MVP: FastAPI + Celery + Postgres, Polish board scrapers, matching, applications, early auto-apply and calendar integrations, multi-persona surfaces. Traction is pilot-shaped — validate on /status, metrics pages, and customer design partners, not vanity volume.",
  investors07Q: "How do I request a deeper diligence call?",
  investors07A:
    "Use confidential access request flows in the data room or contact paths listed on the investor workspace. Bring your checklist — we prefer concrete security and unit-economics questions over generic deck tours.",
  investors08Q: "I'm an angel — what dilution and cap table should I expect?",
  investors08A:
    "We are pre-institutional round: no public cap table on the marketing site. Confidential materials and round terms are shared after NDA and mutual fit — not on a landing page. Traction and product depth are inspectable without a meeting via live metrics and the demo path.",
  investors09Q: "We're VC — what is the Poland + EU wedge?",
  investors09A:
    "Phase 1 ships on Polish boards (pracuj.pl, rocketjobs.pl) with EU-remote roles in the feed, GDPR-first consent, and calendar-of-acceptance UX in English and Polish. Expansion is adapter-driven (registry of boards + compliance), not a single-country job board clone.",
  investors10Q: "We're PE — is there revenue and audited financials?",
  investors10A:
    "Honest answer: early MVP traction, not PE-scale revenue or audited statements on the public site. Enterprise programs and placement verification economics are the margin story we are building toward; financials stay in confidential diligence until appropriate.",
  investors11Q: "Can I see unit economics before a partner meeting?",
  investors11A:
    "Yes — the investor scenario calculator is illustrative (success-fee sensitivity, team costs, infra). It is a diligence model, not a forecast or offer. Live usage aggregates are on /investor/metrics with beta labels.",
  investors12Q: "What should YC partners open first?",
  investors12A:
    "Start at /for-investors/yc: interactive demo, live MVP stats JSON, metrics dashboard, and workspace sign-in for exports. We prefer concrete product questions over a generic deck walk.",
} as const;

export const FAQ_MESSAGES_PL = {
  homeTeaserLead:
    "{count} odpowiedzi: ogólne, kandydaci, rekruterzy, firmy, inwestorzy — pełne FAQ z zakładkami person.",
  homeCta: "Zobacz wszystkie {count} odpowiedzi",
  homeCtaHint: "Zakładki person na stronie FAQ",
  sectionGeneral: "Ogólne",
  sectionCandidates: "Kandydaci",
  sectionRecruiters: "Rekruterzy",
  sectionCompanies: "Firmy",
  sectionInvestors: "Inwestorzy",

  general01Q: "Czym jest TWIN dziś?",
  general01A:
    "Agent kariery, który porządkuje chaos kart: agregacja ofert z włączonych portali, ranking przy profilu, śledzenie aplikacji i wczesny autopilot (dopasowanie CV, asystent kariery, nocna auto-aplikacja tam, gdzie portal i zgoda na to pozwalają). Główny cel to krótki kalendarz momentów gotowych do akceptacji — nie więcej spamu w skrzynce.",
  general02Q: "Dla kogo jest TWIN?",
  general02A:
    "Cztery ścieżki na jednej platformie z osobnymi powierzchniami: kandydaci, rekruterzy, firmy (programy B2B) i inwestorzy. Wybierz personę przy rejestracji — plany i rozliczenia zależą od roli.",
  general03Q: "Czym to różni się od jednego portalu?",
  general03A:
    "Portale zostają źródłem ogłoszeń. TWIN to warstwa odkrywania, sygnałów dopasowania, dalszego kontaktu i (gdzie można) automatyzacji w jednym interfejsie. Tam, gdzie trzeba, nadal kończysz ścieżkę pracodawcy — nie udajemy, że od dnia pierwszego zastępujemy każdy przycisk ATS.",
  general04Q: "Co to jest „kalendarz akceptacji”?",
  general04A:
    "Po przerwie wracasz do krótkiej listy wartych działania — rozmów i profili do akceptacji lub odrzucenia jednym ruchem — a nie do tysięcy surowych CV ani losowego spamu rekrutacyjnego. Dopasowanie, zgoda, praca asynchroniczna, akceptacja zbiorcza i eksport lub synchronizacja kalendarza służą temu celowi.",
  general05Q: "Co z prywatnością i RODO?",
  general05A:
    "Wyrażasz zgodę przy rejestracji. Profil napędza ranking i funkcje produktu. Retencja, eksport i Twoje prawa są w Polityce prywatności. Ograniczamy zaskakujący kontakt z pracodawcą; weryfikacja placementu domyślnie jest self-serve w produkcie.",

  candidates01Q: "Jak działa dopasowanie ofert?",
  candidates01A:
    "Na żywo: oferty z włączonych portali są zapisywane, deduplikowane i rankowane do sygnałów profilu. Wyjaśnienia dopasowania rozwijamy etapami — celem jest mniej fałszywych trafień, nie maksymalny wolumen.",
  candidates02Q: "Które portale są obsługiwane?",
  candidates02A:
    "Faza 1: m.in. pracuj.pl, rocketjobs.pl oraz LinkedIn przy konfiguracji. Ty wybierasz źródła; w becie scrapery mogą być na allowliście ops. Kolejne portale, gdy compliance i niezawodność na to pozwalają.",
  candidates03Q: "Czym jest auto-aplikacja i czy działa?",
  candidates03A:
    "Nocna auto-aplikacja tylko po wyraźnej zgodzie i tam, gdzie ścieżka portalu da się bezpiecznie zautomatyzować. Jest w repozytorium z harmonogramem Celery — traktuj jako betę: nie każda oferta jest kwalifikowana. Możesz przeglądać wysyłki i status w ścieżce aplikacji.",
  candidates04Q: "Czy TWIN dopasuje CV pod rolę?",
  candidates04A:
    "Tak — Asystent kariery ma optymalizację CV pod ATS dla konkretnej oferty, gdy masz CV w profilu. To szkice do Twojej recenzji; nie podmieniamy głównego CV bez Twojej decyzji.",
  candidates05Q: "Co obejmuje Asystent kariery?",
  candidates05A:
    "Na żywo m.in.: informacje o firmie, szkice listów, spojrzenie hiring managera, przygotowanie do rozmowy, negocjacje, dalszy kontakt, sugestie LinkedIn — przy danych profilu i użyciu funkcji. Zakres rośnie; sprawdź etykiety w aplikacji dla swojej wersji.",
  candidates06Q: "Jak działają kalendarz i holdy na rozmowy?",
  candidates06A:
    "Wdrożone: OAuth Google Calendar (zajętość + zapisy holdów), subskrypcja WebCal, eksporty ICS. Kierunek Microsoft 365 przez Graph z OAuth, gdy API ma credentials. Użytkownicy Apple zwykle subskrybują WebCal/ICS — nie ma jednego „Zaloguj przez Apple Calendar” dla każdej aplikacji.",
  candidates07Q: "Czym jest kolejka akceptacji kandydata?",
  candidates07A:
    "Krótka lista holdów i mocnych dopasowań: zostaw, przełóż lub odrzuć — żeby kalendarz był świadomy. Uzupełnia sloty od rekrutera; to nie druga skrzynka spamu.",
  candidates08Q: "Jak działa weryfikacja placementu po stronie kandydata?",
  candidates08A:
    "Deklaracja w aplikacji, opcjonalny magic link na służbowy mail, link atestacji pracodawcy — bez pętli maili „podpisałeś już?”. Pełna maszyna stanów i billing są etapowe; szczegóły w docs/PLACEMENT_VERIFICATION.md.",
  candidates09Q: "Ile kosztuje dla kandydatów?",
  candidates09A:
    "Płatne plany przez Stripe; kampania founderska na liście życzeń może dać darmowy dostęp wg opublikowanych zasad. Po logowaniu sprawdź billing — bez ukrytych opłat w FAQ.",
  candidates10Q: "Czy TWIN zastępuje rekruterów?",
  candidates10A:
    "Nie. Mniej szumu: kandydat dostaje sensowniejsze ruchy; rekruter — akceptację zbiorczą i sygnały pod ATS zamiast zalewu CV. Ludzie nadal decydują o zatrudnieniu; oprogramowanie porządkuje ranking, papierologię i kalendarz.",
  candidates11Q: "Co zrobić przed włączeniem autopilota?",
  candidates11A:
    "Uzupełnij profil, wgraj CV, podłącz kalendarz jeśli chcesz rezerwacje slotów, włącz tylko zaufane portale, przeczytaj zgodę na auto-aplikację. Zacznij od zapisów i ręcznych aplikacji, potem włącz nocną auto-aplikację, gdy akceptujesz ślad audytowy.",

  recruiters01Q: "Czym jest skrzynka akceptacji rekrutera?",
  recruiters01A:
    "Powierzchnia pilota dla identyfikatora firmy: krótka kolejka aplikacji do akceptacji na rozmowę lub odrzucenia bez traktowania maila jako systemu. Potrzebujesz tokenu z linku pilota TWIN — to nie publiczna skrzynka.",
  recruiters02Q: "Czym akceptacja zbiorcza różni się od skrzynki ATS?",
  recruiters02A:
    "Chodzi o wstępnie kwalifikowane wiersze: akceptuj lub odrzuć na jednym ekranie, żeby przejść do kroków pod kalendarz. Nie maksymalizujemy liczby aplikacji — bar dopasowania jest pierwszy.",
  recruiters03Q: "Czy mogę publikować oferty w TWIN?",
  recruiters03A:
    "Tak — publikacja ofert pracodawcy w przestrzeni rekrutera pod identyfikatorem firmy. Oferty łączą się z tym samym dopasowaniem i aplikacjami co pobranie z portali, gdy skonfigurowane.",
  recruiters04Q: "Jakie integracje ATS są dziś?",
  recruiters04A:
    "Webhooki zatrudnienia dla Greenhouse, Lever i Ashby po powiązaniu identyfikatora ATS z aplikacją. OAuth Greenhouse/Lever, gdy API ma ustawione zmienne środowiskowe; inaczej ręczna konfiguracja webhooków. To integracja techniczna — nie pełny zamiennik ATS.",
  recruiters05Q: "Jak powiązać aplikacje z Greenhouse?",
  recruiters05A:
    "Zapisz external_ats_id i external_ats_provider (greenhouse, lever, ashby) na wierszu aplikacji TWIN. Zobacz ATS_WEBHOOKS.md i stronę webhooków ATS w aplikacji.",
  recruiters06Q: "Jakie etapy ścieżki aplikacji śledzicie?",
  recruiters06A:
    "Kandydat widzi status w jednej ścieżce; rekruter — kolejki akceptacji i atestację. Głębsza synchronizacja etapów ATS to roadmapa — dziś skupiamy się na przekazaniu gotowym do akceptacji.",
  recruiters07Q: "Jak rozliczane są miejsca rekrutera?",
  recruiters07A:
    "Miejsca B2B na fakturę (nie płatność Stripe kandydata). Umowa definiuje liczbę miejsc, identyfikator firmy i czy wchodzą webhooki ATS lub linki atestacji.",
  recruiters08Q: "Czy pracodawca potwierdzi zatrudnienie bez konta TWIN?",
  recruiters08A:
    "Tak — kandydat może udostępnić jednoklikowy link atestacji (nonce, wygasa). Hiring manager potwierdza bez logowania. To wspiera weryfikację maszynową zamiast ping-pongu CS mailem.",
  recruiters09Q: "Co dla rekruterów jest jeszcze przed nami?",
  recruiters09A:
    "Pełne SSO enterprise, dwukierunkową synchronizację etapów ATS i dojrzałe zarządzanie wieloma najemcami. Piloci powinni liczyć na skrzynkę na token i webhooki ATS przed samoobsługowym rynkiem rekruterów.",

  companies01Q: "Co firmy kupują w TWIN?",
  companies01A:
    "Roczne programy B2B: zasięg sourcingu, miejsca rekruterów, opcjonalna weryfikacja przez webhook ATS i ekonomia od zweryfikowanych zatrudnień — nie płatność za surowe CV. Plany pod zakupy są oddzielone od subskrypcji kandydata.",
  companies02Q: "Jak zwykle wygląda procurement?",
  companies02A:
    "Kwestionariusz bezpieczeństwa, DPA, roczny order form i zdefiniowane slug(i) firmy. Przepływy danych (scraping, AI, kalendarz) w pakietach prawnych; finanse poufne poza publiczną stroną.",
  companies03Q: "Jak weryfikujecie placement pod opłaty?",
  companies03A:
    "Domyślnie: deklaracja kandydata, opcjonalny mail służbowy, atestacja pracodawcy lub webhook hire z ATS — zdarzenia append-only, bez stałego zespołu „podpisałeś?”. Spory idą do kolejki wyjątków, nie do mailowego ping-ponga.",
  companies04Q: "Czy ATS może być źródłem prawdy?",
  companies04A:
    "Dla potwierdzenia zatrudnienia tak — webhooki Greenhouse, Lever, Ashby przy umowie. TWIN nadal pokazuje discovery i match kandydatom; ATS może prowadzić cykl requisition po Waszej stronie.",
  companies05Q: "Jakie dane wychodzą poza firmę?",
  companies05A:
    "Profile kandydatów, zdarzenia aplikacji i opcjonalne metadane kalendarza za zgodą. Klik atestacji loguje potwierdzenie bez konta TWIN. Podprocesory i regiony — w Polityce i DPA B2B.",
  companies06Q: "Czy kontaktujecie naszych pracowników bez zapowiedzi?",
  companies06A:
    "Nie — brak zaskakujących kampanii do pracodawcy. Mail transakcyjny tylko w flow ze zgodą (magic linki, atestacja inicjowana przez kandydata). Marketing do Waszej kadry nie jest domyślną częścią B2B.",
  companies07Q: "Co na roadmapzie enterprise?",
  companies07A:
    "Kalendarz Microsoft w skali, bogatsze SSO, HRIS poza webhookami ATS, automatyczna kwalifikowalność faktury od maszyny stanów placementu. Wdrażamy, gdy audyt jest jasny — nie gdy slajd mówi „kompletny system”.",

  investors01Q: "Gdzie jest data room inwestora?",
  investors01A:
    "Workspace inwestora po logowaniu: publiczny pakiet trakcji (metryki, JSON MVP, OpenAPI, status, eksport kalkulatora) oraz placeholdery na cap table i audyt — dostęp poufny na żądanie.",
  investors02Q: "Czy jest NDA przed materiałami poufnymi?",
  investors02A:
    "Stub NDA w sesji przeglądarki odblokowuje podgląd placeholderów; pełny cap table, finanse i legal wymagają podpisanego dostępu przez kontakt. Rejestracja dokumentów działa; upload S3 zależy od env API.",
  investors03Q: "Jakie metryki bez spotkania?",
  investors03A:
    "Na żywo: panel metryk MVP i kondycja systemu. To trakcja beta, nie audytowane finanse — te za poufnym dostępem.",
  investors04Q: "Jak myślicie o ekonomii weryfikacji placementu?",
  investors04A:
    "Unikamy mailowego ping-ponga typowego dla marketplace — weryfikacja w produkcie, atestacja i webhooki ATS. Lepsza skalowalność marży niż ręczne pętle mailowe, z wyjątkami tylko tam, gdzie trzeba.",
  investors05Q: "Co jest obronne względem portali?",
  investors05A:
    "Normalizacja między portalami, automatyzacja za zgodą, interfejs akceptacji po obu stronach, wynik w kalendarzu. Portale optymalizują ogłoszenia; TWIN — ścieżkę od odkrycia ofert do zweryfikowanego zatrudnienia z mniejszym szumem.",
  investors06Q: "Jaka faza i uczciwa trakcja?",
  investors06A:
    "MVP fazy 1: FastAPI, Celery, Postgres, scrapery PL, dopasowanie, aplikacje, wczesna auto-aplikacja i kalendarz, wiele person. Trakcja w kształcie pilota — patrz /status, metryki i partnerów wdrożeniowych, nie pusty wolumen.",
  investors07Q: "Jak poprosić o głębszy diligence?",
  investors07A:
    "Proces w data room lub kontakt z przestrzenią inwestora. Przyjdź z checklistą — wolimy konkretne pytania o bezpieczeństwo i ekonomię jednostkową niż generyczny pitch deck.",
  investors08Q: "Jestem aniołem — jaka rozwodnienie i cap table?",
  investors08A:
    "Przed rundą instytucjonalną: brak publicznego cap table na stronie marketingowej. Warunki rundy i materiały poufne po NDA i dopasowaniu stron. Trakcję i produkt można ocenić bez spotkania przez metryki na żywo i ścieżkę demo.",
  investors09Q: "Jesteśmy VC — jaka jest przewaga Polska + UE?",
  investors09A:
    "Faza 1 na polskich portalach (pracuj.pl, rocketjobs.pl) z ofertami remote UE, zgodą RODO i UX kalendarza akceptacji po PL i EN. Ekspansja przez adaptery portali i compliance, nie klon jednego portalu.",
  investors10Q: "Jesteśmy PE — czy są przychody i audyt?",
  investors10A:
    "Uczciwie: wczesna trakcja MVP, bez skali przychodów PE ani audytu na stronie publicznej. Programy enterprise i ekonomia weryfikacji placementu to kierunek marży; finanse w poufnej due diligence, gdy to ma sens.",
  investors11Q: "Czy zobaczę ekonomię jednostkową przed spotkaniem?",
  investors11A:
    "Tak — kalkulator scenariusza inwestora jest ilustracyjny (success fee, zespół, infra). To model do due diligence, nie prognoza ani oferta. Agregaty użycia: /investor/metrics z etykietą beta.",
  investors12Q: "Co partner YC powinien otworzyć najpierw?",
  investors12A:
    "Zacznij od /for-investors/yc: demo interaktywne, JSON metryk MVP, panel metryk i logowanie do workspace pod eksporty. Wolimy konkretne pytania o produkt niż generyczny deck.",
} as const;

export type FaqMessageKey = keyof typeof FAQ_MESSAGES_EN;

/** Section order and item counts for marketing FAQ UI. */
export const FAQ_SECTIONS = [
  { id: "general", count: 5 },
  { id: "candidates", count: 11 },
  { id: "recruiters", count: 9 },
  { id: "companies", count: 7 },
  { id: "investors", count: 12 },
] as const;

export type FaqSectionId = (typeof FAQ_SECTIONS)[number]["id"];

export function faqPairKey(section: FaqSectionId, index: number): FaqMessageKey {
  const num = String(index).padStart(2, "0");
  return `${section}${num}Q` as FaqMessageKey;
}

export function faqAnswerKey(section: FaqSectionId, index: number): FaqMessageKey {
  const num = String(index).padStart(2, "0");
  return `${section}${num}A` as FaqMessageKey;
}

export function faqSectionLabelKey(section: FaqSectionId): FaqMessageKey {
  const map: Record<FaqSectionId, FaqMessageKey> = {
    general: "sectionGeneral",
    candidates: "sectionCandidates",
    recruiters: "sectionRecruiters",
    companies: "sectionCompanies",
    investors: "sectionInvestors",
  };
  return map[section];
}

export const FAQ_TOTAL_QUESTIONS = FAQ_SECTIONS.reduce((sum, s) => sum + s.count, 0);
