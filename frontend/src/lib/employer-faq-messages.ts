/** Employer-hub FAQ copy (fictional global enterprise) — EN + PL. */

export const EMPLOYER_FAQ_CATEGORY_DEFS = [
  { id: "applying", count: 6 },
  { id: "interview", count: 6 },
  { id: "remoteRelocation", count: 6 },
  { id: "compensation", count: 6 },
  { id: "visa", count: 6 },
  { id: "diversity", count: 6 },
  { id: "backgroundChecks", count: 6 },
  { id: "referrals", count: 6 },
  { id: "campus", count: 6 },
  { id: "contractors", count: 6 },
  { id: "privacy", count: 6 },
  { id: "globalMobility", count: 6 },
  { id: "roleSpecific", count: 6 },
] as const;

export type EmployerFaqCategoryId = (typeof EMPLOYER_FAQ_CATEGORY_DEFS)[number]["id"];

export type EmployerFaqMessageKey = keyof typeof EMPLOYER_FAQ_MESSAGES_EN;

export function employerFaqSectionLabelKey(category: EmployerFaqCategoryId): EmployerFaqMessageKey {
  const map: Record<EmployerFaqCategoryId, EmployerFaqMessageKey> = {
    applying: "sectionApplying",
    interview: "sectionInterview",
    remoteRelocation: "sectionRemoteRelocation",
    compensation: "sectionCompensation",
    visa: "sectionVisa",
    diversity: "sectionDiversity",
    backgroundChecks: "sectionBackgroundChecks",
    referrals: "sectionReferrals",
    campus: "sectionCampus",
    contractors: "sectionContractors",
    privacy: "sectionPrivacy",
    globalMobility: "sectionGlobalMobility",
    roleSpecific: "sectionRoleSpecific",
  };
  return map[category];
}

export function employerFaqQKey(category: EmployerFaqCategoryId, index: number): EmployerFaqMessageKey {
  const num = String(index).padStart(2, "0");
  return `${category}${num}Q` as EmployerFaqMessageKey;
}

export function employerFaqAKey(category: EmployerFaqCategoryId, index: number): EmployerFaqMessageKey {
  const num = String(index).padStart(2, "0");
  return `${category}${num}A` as EmployerFaqMessageKey;
}

export const EMPLOYER_FAQ_TOTAL = EMPLOYER_FAQ_CATEGORY_DEFS.reduce((s, c) => s + c.count, 0);

export const EMPLOYER_FAQ_MESSAGES_EN = {
  faqEyebrow: "Candidate help centre",
  faqTitle: "Frequently asked questions",
  faqLead:
    "Answers for candidates exploring roles worldwide — application mechanics, interviews, mobility, pay, and compliance. Demo content illustrating enterprise-scale career hubs.",
  faqSearchPlaceholder: "Search questions (demo filter)",
  faqSearchEmpty: "No questions match your search — try another keyword or open a category below.",
  faqStatCountries: "Countries hiring",
  faqStatTimeToHire: "Median time-to-hire",
  faqStatTimeToHireValue: "24 days",
  faqStatOpenRoles: "Open roles (demo)",
  faqStatArticles: "Articles in this hub",
  faqStillTitle: "Still have questions?",
  faqStillLead: "Our recruiting desk routes you to the right team — typically within two business days.",
  faqStillCta: "Go to Contact tab",
  faqRelatedTitle: "Related roles",
  faqRelatedLead: "Other openings at this employer (fictional demo listings).",
  faqRelatedCurrent: "You are viewing",
  faqRelatedView: "View role (demo)",

  sectionApplying: "Applying",
  sectionInterview: "Interview process",
  sectionRemoteRelocation: "Remote & relocation",
  sectionCompensation: "Compensation & benefits",
  sectionVisa: "Visa & work authorization",
  sectionDiversity: "Diversity & inclusion",
  sectionBackgroundChecks: "Background checks",
  sectionReferrals: "Referrals",
  sectionCampus: "University & campus",
  sectionContractors: "Contractors & contingent",
  sectionPrivacy: "Data privacy (GDPR)",
  sectionGlobalMobility: "Global mobility",
  sectionRoleSpecific: "Role-specific FAQs",

  applying01Q: "Do I need an account on your careers site to apply?",
  applying01A:
    "You can start an application as a guest; creating a profile lets you save drafts, track status, and reuse documents. Some regions require a verified email before submission.",
  applying02Q: "Can I apply to more than one role at once?",
  applying02A:
    "Yes — we encourage thoughtful applications per role. Recruiters see each submission separately; duplicate CV spam across unrelated requisitions may slow review.",
  applying03Q: "What file formats do you accept for CVs?",
  applying03A: "PDF is preferred; DOCX is accepted. Plain text exports from LinkedIn are fine if layout stays readable. Max size 10 MB per file (demo policy).",
  applying04Q: "Will you read my cover letter?",
  applying04A:
    "Hiring managers receive it when the role asks for one. For technical roles we weight work samples and structured interviews; for customer-facing roles narrative matters more.",
  applying05Q: "How do I withdraw or update an application?",
  applying05A:
    "Use the link in your confirmation email or sign in to your candidate profile. Updates are allowed until a recruiter moves you to an offer stage.",
  applying06Q: "Do you use AI to screen applications?",
  applying06A:
    "We use assistive ranking for high-volume requisitions — always with human review before rejections. You may request a manual re-check where local law allows.",

  interview01Q: "How many interview rounds should I expect?",
  interview01A:
    "Most professional roles: recruiter screen, hiring-manager conversation, and one to two technical or case interviews. Leadership roles add stakeholder panels.",
  interview02Q: "Are interviews remote or on-site?",
  interview02A:
    "Hybrid employers default to video for early stages; final rounds may be on-site at a hub city. You will receive calendar invites with time-zone clarity.",
  interview03Q: "How should I prepare for a technical loop?",
  interview03A:
    "Review the job description stack, bring examples of production incidents you owned, and be ready to whiteboard system boundaries — not trick puzzles.",
  interview04Q: "Can I request interview accommodations?",
  interview04A:
    "Yes — request adjustments when scheduling (extra time, interpreter, accessible materials). Our accessibility desk responds within one business day.",
  interview05Q: "Who will be in the room?",
  interview05A:
    "We share interviewer names and roles 24 hours ahead when possible. Panels aim for diverse interviewers trained on structured scorecards.",
  interview06Q: "When will I hear back after final round?",
  interview06A:
    "Target debrief within five business days globally; regulated or executive searches may take longer. Your portal status updates when a decision is recorded.",

  remoteRelocation01Q: "Which work models do you offer?",
  remoteRelocation01A:
    "Role-dependent: on-site, hybrid (2–3 days on-site), and remote-first where legal entities exist. Postings state the model explicitly.",
  remoteRelocation02Q: "Can I work from another country temporarily?",
  remoteRelocation02A:
    "Short business travel is common; long-term cross-border work requires mobility approval and tax review — initiate before you relocate.",
  remoteRelocation03Q: "Do you offer relocation packages?",
  remoteRelocation03A:
    "Key-hub moves may include shipping, temporary housing, and tax briefings. Packages are tiered by level and distance (demo ranges in offer letters).",
  remoteRelocation04Q: "How do you handle time-zone differences?",
  remoteRelocation04A:
    "Teams publish core collaboration hours; we avoid mandatory meetings outside local business hours except on-call rotations with comp time.",
  remoteRelocation05Q: "Is home-office equipment provided?",
  remoteRelocation05A:
    "Hybrid and remote employees receive a stipend or catalog allowance for chair, monitor, and connectivity — amounts vary by country entity.",
  remoteRelocation06Q: "Can I transfer between offices later?",
  remoteRelocation06A:
    "Internal mobility is encouraged after 12 months in role (exceptions for business need). Mobility coaches help with visa and payroll switches.",

  compensation01Q: "When are salary bands shared?",
  compensation01A:
    "Published bands appear on postings in EU, UK, and select US states. Elsewhere recruiters discuss range after initial screen.",
  compensation02Q: "How often is pay reviewed?",
  compensation02A:
    "Annual cycle plus promotion adjustments. High-inflation markets may receive interim benchmarks reviewed quarterly (demo policy).",
  compensation03Q: "What benefits start on day one?",
  compensation03A:
    "Medical where statutory, pension match where applicable, and wellness stipend. Some benefits have waiting periods — listed per country pack.",
  compensation04Q: "Do you offer equity?",
  compensation04A:
    "Corporate roles may include RSUs or local equivalents; subsidiaries use profit-sharing or bonus multipliers. Grants are in written offers only.",
  compensation05Q: "Are bonuses guaranteed?",
  compensation05A:
    "Variable pay depends on company and individual performance. On-target numbers in offers are illustrative, not guarantees.",
  compensation06Q: "How do you handle pay equity?",
  compensation06A:
    "We run annual statistical audits in major entities and correct unexplained gaps. Candidates may ask recruiting about band placement rationale.",

  visa01Q: "Do you sponsor work visas?",
  visa01A:
    "Yes for scarce-skill roles where entities are licensed sponsors. Postings note “sponsorship available” when pre-approved for the requisition.",
  visa02Q: "Which visa types do you commonly use?",
  visa02A:
    "US: H-1B, L-1, TN where eligible. UK: Skilled Worker. EU: Blue Card or local permits. Mobility team selects the best route.",
  visa03Q: "Can I apply while on a student visa?",
  visa03A:
    "Campus roles may offer CPT/OPT pathways in the US; elsewhere graduate permits vary. Recruiters coordinate with mobility after offer acceptance.",
  visa04Q: "How long does sponsorship take?",
  visa04A:
    "Plan 8–16 weeks depending on country and quota calendars. We provide paralegal support and document checklists after signed offer.",
  visa05Q: "Do you hire candidates who need relocation from abroad?",
  visa05A:
    "Yes when the role is approved for cross-border hire. You must have legal right to work on start date or an approved petition in flight.",
  visa06Q: "Are contractors eligible for visa sponsorship?",
  visa06A:
    "Generally no — sponsorship applies to employee entities. Contingent workers must hold independent work authorization.",

  diversity01Q: "What inclusion programs exist?",
  diversity01A:
    "Employee resource groups, mentorship circles, inclusive leadership training, and supplier diversity goals. Programs vary by region.",
  diversity02Q: "How do you reduce bias in hiring?",
  diversity02A:
    "Structured interviews, diverse panels where possible, and calibration debriefs. Job descriptions are reviewed for inclusive language.",
  diversity03Q: "Do you publish diversity metrics?",
  diversity03A:
    "Annual inclusion report with workforce composition and promotion rates in major entities (fictional demo mirrors Fortune-500 practice).",
  diversity04Q: "Are accommodations available during hiring?",
  diversity04A:
    "Yes — see interview FAQ. We never penalize candidates for requesting adjustments needed to demonstrate ability.",
  diversity05Q: "Do you support neurodiversity at work?",
  diversity05A:
    "Quiet rooms, flexible scheduling options, and coaching partners. Recruiters can connect you with workplace adjustment specialists pre-start.",
  diversity06Q: "How can allies participate?",
  diversity06A:
    "All-hands inclusion curriculum, ERG ally tracks, and volunteering days. Details on the internal belonging hub after onboarding.",

  backgroundChecks01Q: "When do background checks run?",
  backgroundChecks01A:
    "After conditional offer acceptance. Types depend on role: identity, employment history, education, criminal where legally permitted.",
  backgroundChecks02Q: "Will a misdemeanor disqualify me?",
  backgroundChecks02A:
    "We evaluate relevance to role and local law. Some regulated roles have statutory bars; recruiters cannot override those.",
  backgroundChecks03Q: "Do you check credit history?",
  backgroundChecks03A:
    "Only for roles with financial authority or access to sensitive payments data — disclosed upfront and permitted by local law.",
  backgroundChecks04Q: "How do I dispute inaccurate records?",
  backgroundChecks04A:
    "Contact the vendor link in your report copy; our compliance team pauses start dates while disputes are investigated fairly.",
  backgroundChecks05Q: "Are checks global?",
  backgroundChecks05A:
    "We verify in countries where you lived or worked the past seven years, subject to data-access rules in each jurisdiction.",
  backgroundChecks06Q: "Do contractors undergo the same checks?",
  backgroundChecks06A:
    "Contingent workers complete a lighter package unless system access equals employee risk — then parity applies.",

  referrals01Q: "How does the employee referral program work?",
  referrals01A:
    "Employees submit candidates through the internal portal; bonuses pay after probation ends. Amounts vary by level and region (demo table in HR policy).",
  referrals02Q: "Can I mention a referral in my application?",
  referrals02A:
    "Yes — include the referrer’s corporate email in the application form. It does not bypass skill assessment.",
  referrals03Q: "Do referrals get priority?",
  referrals03A:
    "They receive the same structured process with faster recruiter triage when the referrer is active on the hiring team.",
  referrals04Q: "Can external partners refer candidates?",
  referrals04A:
    "Agency submissions require a signed agreement and unique req ID. Unsolicited agency CVs may be declined per policy.",
  referrals05Q: "Is there a limit on referral bonuses per year?",
  referrals05A:
    "Caps apply per employee to prevent gaming — typically six paid referrals annually (demo).",
  referrals06Q: "What if my referral is already in the system?",
  referrals06A:
    "First valid source wins per our CRM rules; recruiters will clarify status if duplicate profiles appear.",

  campus01Q: "When do you hire interns and graduates?",
  campus01A:
    "Northern hemisphere: applications Sep–Nov for following summer. Southern hemisphere campuses run a mirrored cycle — check regional pages.",
  campus02Q: "Do you attend university career fairs?",
  campus02A:
    "Yes across 40+ campuses globally (demo). Virtual sessions supplement on-site fairs for students without travel budgets.",
  campus03Q: "What is your graduate interview format?",
  campus03A:
    "Behavioral screens plus technical exercises appropriate to degree. No brain-teasers unrelated to curriculum.",
  campus04Q: "Can final-year students apply for full-time roles?",
  campus04A:
    "Yes — select “expected graduation” in the form. Offers may be contingent on degree completion.",
  campus05Q: "Do you offer return offers after internships?",
  campus05A:
    "High-performing interns receive return offers before program end when headcount allows — not guaranteed for all.",
  campus06Q: "Are campus roles paid?",
  campus06A:
    "Internships are paid at or above local legal minimums; relocation support may apply for hub programs.",

  contractors01Q: "When do you use contractors vs employees?",
  contractors01A:
    "Employees own long-term product roadmaps; contractors fill surge capacity or specialized SOWs under procurement rules.",
  contractors02Q: "How long can contracts run?",
  contractors02A:
    "Typical 6–12 month extensions with quarterly governance. Some countries cap tenure — legal reviews apply automatically.",
  contractors03Q: "Can contractors convert to full-time?",
  contractors03A:
    "Conversion is possible when headcount opens and performance reviews support it; not automatic at contract end.",
  contractors04Q: "Who supplies equipment for contractors?",
  contractors04A:
    "Usually the staffing partner unless you receive corporate laptop access — security training is mandatory before access.",
  contractors05Q: "Do contractors get benefits?",
  contractors05A:
    "Benefits flow through the agency of record except where law mandates parity. Details are in the SOW, not this FAQ.",
  contractors06Q: "How do I apply as an independent consultant?",
  contractors06A:
    "Register on the supplier portal linked from the Partners tab; direct applications to reqs marked “contract” only.",

  privacy01Q: "What personal data do you collect when I apply?",
  privacy01A:
    "Contact details, CV, optional diversity self-ID, and interview notes. We minimize data to hiring purposes documented in our privacy notice.",
  privacy02Q: "Where is my data stored?",
  privacy02A:
    "Primary hosting in EU and US regions with SCCs for transfers. Subprocessors listed in the candidate privacy addendum (demo).",
  privacy03Q: "Can I request deletion of my profile?",
  privacy03A:
    "Yes — email privacy@ or use the self-service link. Retention exceptions apply for hired employees and legal holds.",
  privacy04Q: "Do you sell candidate data?",
  privacy04A:
    "No. We do not sell application data to brokers. Aggregated analytics are internal only.",
  privacy05Q: "How long do you keep rejected applications?",
  privacy05A:
    "Typically 24 months unless you opt in to talent community storage; jurisdictions with shorter limits override.",
  privacy06Q: "Who can access my application inside the company?",
  privacy06A:
    "Recruiters, hiring managers, interviewers on the loop, and HR systems admins under role-based access controls.",

  globalMobility01Q: "What is the global mobility team?",
  globalMobility01A:
    "Specialists who handle cross-border transfers, tax equalization, and immigration — engaged after offer acceptance.",
  globalMobility02Q: "Do you offer tax equalization for expats?",
  globalMobility02A:
    "Senior transfers may include equalization policies so you are not worse off than home country net — outlined in mobility letters.",
  globalMobility03Q: "Can my family relocate with me?",
  globalMobility03A:
    "Dependent visas and school search support are available on approved executive and critical-skill moves.",
  globalMobility04Q: "How do dual-career couples get support?",
  globalMobility04A:
    "We partner with placement firms in select hubs; success varies by market — disclosed during mobility consult.",
  globalMobility05Q: "What language support exists after move?",
  globalMobility05A:
    "Local onboarding buddies and optional language stipends in non-English hubs for customer-facing roles.",
  globalMobility06Q: "Are short-term assignments different from permanent transfers?",
  globalMobility06A:
    "Yes — assignments up to 24 months may use different tax and benefits shells; mobility explains before you sign.",

  roleSpecific01Q: "Is this role individual contributor or people manager?",
  roleSpecific01A:
    "Check the posting level — IC tracks use L3–L7 bands; manager roles include team charter and headcount in the description.",
  roleSpecific02Q: "Will I be on-call?",
  roleSpecific02A:
    "Platform and production roles publish on-call rotations with compensation or time-off in lieu — ask the hiring manager in final round.",
  roleSpecific03Q: "Is travel required?",
  roleSpecific03A:
    "Travel percentage is in the posting footer. Customer-facing roles may require 25–40%; engineering often ≤10%.",
  roleSpecific04Q: "Do you drug-test for this role?",
  roleSpecific04A:
    "Safety-sensitive and regulated roles may require tests where lawful. Corporate office roles typically do not.",
  roleSpecific05Q: "Can I see the team I would join?",
  roleSpecific05A:
    "Hiring managers share org charts at offer stage; during process you may meet peer interviewers from the squad.",
  roleSpecific06Q: "Is clearance required?",
  roleSpecific06A:
    "Defense and public-sector aligned reqs state clearance level upfront. Processing can add months — plan accordingly.",
} as const;

export const EMPLOYER_FAQ_MESSAGES_PL = {
  faqEyebrow: "Centrum pomocy kandydata",
  faqTitle: "Najczęściej zadawane pytania",
  faqLead:
    "Odpowiedzi dla kandydatów szukających ról na całym świecie — aplikacja, rozmowy, mobilność, wynagrodzenie i compliance. Treści demo pokazują hub kariery w skali korporacji globalnej.",
  faqSearchPlaceholder: "Szukaj pytań (filtr demo)",
  faqSearchEmpty: "Brak pytań pasujących do wyszukiwania — spróbuj innego słowa lub otwórz kategorię poniżej.",
  faqStatCountries: "Kraje rekrutacji",
  faqStatTimeToHire: "Mediana time-to-hire",
  faqStatTimeToHireValue: "24 dni",
  faqStatOpenRoles: "Otwarte role (demo)",
  faqStatArticles: "Artykułów w hubie",
  faqStillTitle: "Nadal masz pytania?",
  faqStillLead: "Biuro rekrutacji skieruje Cię do właściwego zespołu — zwykle w dwa dni robocze.",
  faqStillCta: "Przejdź do zakładki Kontakt",
  faqRelatedTitle: "Powiązane role",
  faqRelatedLead: "Inne oferty u tego pracodawcy (fikcyjne listingi demo).",
  faqRelatedCurrent: "Przeglądasz",
  faqRelatedView: "Zobacz rolę (demo)",

  sectionApplying: "Aplikowanie",
  sectionInterview: "Proces rozmów",
  sectionRemoteRelocation: "Zdalnie i relokacja",
  sectionCompensation: "Wynagrodzenie i benefity",
  sectionVisa: "Wiza i uprawnienia do pracy",
  sectionDiversity: "Różnorodność i inkluzja",
  sectionBackgroundChecks: "Weryfikacja przeszłości",
  sectionReferrals: "Polecenia",
  sectionCampus: "Uczelnie i campus",
  sectionContractors: "Kontraktorzy",
  sectionPrivacy: "Prywatność danych (RODO)",
  sectionGlobalMobility: "Mobilność globalna",
  sectionRoleSpecific: "FAQ pod konkretną rolę",

  applying01Q: "Czy muszę mieć konto na stronie kariery, żeby aplikować?",
  applying01A:
    "Możesz zacząć jako gość; profil pozwala zapisać szkic, śledzić status i używać dokumentów ponownie. W niektórych regionach wymagany jest zweryfikowany e-mail przed wysłaniem.",
  applying02Q: "Czy mogę aplikować na kilka ról naraz?",
  applying02A:
    "Tak — zachęcamy do przemyślanych aplikacji pod każdą rolę. Rekruterzy widzą je oddzielnie; masowe duplikaty CV na niepowiązane rekrutacje mogą spowolnić ocenę.",
  applying03Q: "Jakie formaty CV akceptujecie?",
  applying03A:
    "Preferowany PDF; DOCX też OK. Eksport tekstowy z LinkedIn jest w porządku, jeśli czytelny. Maks. 10 MB na plik (polityka demo).",
  applying04Q: "Czy czytacie list motywacyjny?",
  applying04A:
    "Hiring manager dostaje go, gdy rola tego wymaga. W rolach technicznych ważniejsze są przykłady pracy i rozmowy; w kontakcie z klientem — narracja.",
  applying05Q: "Jak wycofać lub zaktualizować aplikację?",
  applying05A:
    "Użyj linku z maila potwierdzającego lub zaloguj się do profilu kandydata. Aktualizacje możliwe, dopóki rekruter nie przeniesie Cię na etap oferty.",
  applying06Q: "Czy używacie AI do selekcji CV?",
  applying06A:
    "Wspomagamy ranking przy dużej liczbie aplikacji — zawsze z ludzką weryfikacją przed odrzuceniem. Tam, gdzie prawo pozwala, możesz poprosić o ponowny przegląd.",

  interview01Q: "Ile rund rozmów powinienem się spodziewać?",
  interview01A:
    "Typowo: screen rekrutera, rozmowa z hiring managerem i jedna–dwie techniczne lub case. Role leadership dodają panele interesariuszy.",
  interview02Q: "Czy rozmowy są zdalne czy stacjonarnie?",
  interview02A:
    "Hybrydowi pracodawcy domyślnie używają wideo na początku; finał może być on-site w hubie. Zaproszenia kalendarzowe z jasną strefą czasową.",
  interview03Q: "Jak przygotować się do loopu technicznego?",
  interview03A:
    "Przejrzyj stack z ogłoszenia, przygotuj historie incydentów produkcyjnych i granice systemu — nie sztuczne zagadki.",
  interview04Q: "Czy mogę poprosić o dostosowanie rozmowy?",
  interview04A:
    "Tak — przy planowaniu (dodatkowy czas, tłumacz, materiały). Biuro dostępności odpowiada w jeden dzień roboczy.",
  interview05Q: "Kto będzie na rozmowie?",
  interview05A:
    "Imiona i role interviewerów podajemy 24 h wcześniej, gdy to możliwe. Panele są zróżnicowane i trenowane w scorecardach.",
  interview06Q: "Kiedy dowiem się po finale?",
  interview06A:
    "Cel: debrief w pięć dni roboczych globalnie; regulowane lub executive mogą trwać dłużej. Status w portalu aktualizuje się po decyzji.",

  remoteRelocation01Q: "Jakie modele pracy oferujecie?",
  remoteRelocation01A:
    "Zależnie od roli: on-site, hybryda (2–3 dni), remote-first tam, gdzie mamy spółkę. Model jest w ogłoszeniu.",
  remoteRelocation02Q: "Czy mogę tymczasowo pracować z innego kraju?",
  remoteRelocation02A:
    "Krótkie podróże służbowe — tak; dłuższa praca za granicą wymaga zgody mobility i podatków — zgłoś przed przeprowadzką.",
  remoteRelocation03Q: "Czy są pakiety relokacyjne?",
  remoteRelocation03A:
    "Przeprowadzki do hubów mogą obejmować transport, mieszkanie tymczasowe i briefing podatkowy — poziomy zależą od rangi (demo w ofercie).",
  remoteRelocation04Q: "Jak radzicie sobie ze strefami czasowymi?",
  remoteRelocation04A:
    "Zespoły ustalają core hours; nie planujemy stałych spotkań poza lokalnym czasem pracy, poza on-call z kompensacją.",
  remoteRelocation05Q: "Czy zapewniacie sprzęt do home office?",
  remoteRelocation05A:
    "Hybryda i remote dostają stipend lub katalog na krzesło, monitor i łącze — kwoty zależą od kraju spółki.",
  remoteRelocation06Q: "Czy mogę później przenieść się między biurami?",
  remoteRelocation06A:
    "Mobilność wewnętrzna po 12 miesiącach w roli (wyjątki biznesowe). Coachowie mobility pomagają przy wizie i payroll.",

  compensation01Q: "Kiedy publikujecie widełki?",
  compensation01A:
    "W UE, UK i wybranych stanach USA na ogłoszeniu. Gdzie indziej zakres po pierwszym screenie z rekruterem.",
  compensation02Q: "Jak często przeglądacie pensje?",
  compensation02A:
    "Cykl roczny plus awanse. Rynki z wysoką inflacją mogą mieć przeglądy kwartalne (polityka demo).",
  compensation03Q: "Jakie benefity od pierwszego dnia?",
  compensation03A:
    "Medyczne tam, gdzie wymagane, dopłata emerytalna, wellness. Część benefitów ma okres karencji — w pakiecie kraju.",
  compensation04Q: "Czy jest equity?",
  compensation04A:
    "Role korporacyjne: RSU lub lokalny odpowiednik; spółki zależne — bonus/profit share. Tylko w pisemnej ofercie.",
  compensation05Q: "Czy premia jest gwarantowana?",
  compensation05A:
    "Zmienna zależy od firmy i wyników. Target w ofercie jest orientacyjny, nie gwarancją.",
  compensation06Q: "Jak zapewniacie równość płac?",
  compensation06A:
    "Roczne audyty statystyczne w głównych spółkach i korekty. Możesz zapytać rekrutera o uzasadnienie miejsca w paśmie.",

  visa01Q: "Czy sponsorujecie wizy pracy?",
  visa01A:
    "Tak przy rolach deficytowych, gdy spółka ma licencję. W ogłoszeniu: „sponsoring dostępny”, gdy req jest pre-approved.",
  visa02Q: "Jakie typy wiz są najczęstsze?",
  visa02A:
    "USA: H-1B, L-1, TN. UK: Skilled Worker. UE: Blue Card lub lokalne pozwolenia. Mobility wybiera trasę.",
  visa03Q: "Czy mogę aplikować na wizie studenckiej?",
  visa03A:
    "Campus: CPT/OPT w USA; gdzie indziej zależy od pozwoleń po studiach. Mobility po akceptacji oferty.",
  visa04Q: "Ile trwa sponsoring?",
  visa04A:
    "Planuj 8–16 tygodni zależnie od kraju i limitów. Wsparcie prawne i checklisty po podpisaniu oferty.",
  visa05Q: "Czy rekrutujecie z zagranicy?",
  visa05A:
    "Tak, gdy rola ma zgodę na hire cross-border. Na start potrzebujesz prawa do pracy lub zatwierdzonej petencji.",
  visa06Q: "Czy kontraktorzy dostają sponsoring?",
  visa06A:
    "Zwykle nie — sponsoring dotyczy etatu. Kontraktor musi mieć własne uprawnienia.",

  diversity01Q: "Jakie programy inkluzji macie?",
  diversity01A:
    "ERG, mentoring, szkolenia przywództwa inkluzywnego, cele supplier diversity — zależnie od regionu.",
  diversity02Q: "Jak ograniczacie bias w rekrutacji?",
  diversity02A:
    "Strukturyzowane rozmowy, zróżnicowane panele, kalibracja. Opisy stanowisk pod język inkluzywny.",
  diversity03Q: "Czy publikujecie metryki różnorodności?",
  diversity03A:
    "Roczny raport inkluzji ze składem i awansami w głównych spółkach (demo jak praktyka Fortune 500).",
  diversity04Q: "Czy są dostosowania na etapie rekrutacji?",
  diversity04A:
    "Tak — patrz FAQ rozmów. Nie karzemy za prośby o dostosowania potrzebne do pokazania kompetencji.",
  diversity05Q: "Czy wspieracie neuroróżnorodność?",
  diversity05A:
    "Ciche pokoje, elastyczny czas, coachowie. Rekruter może połączyć ze specjalistą dostosowań przed startem.",
  diversity06Q: "Jak mogą pomóc sojusznicy?",
  diversity06A:
    "Szkolenia inkluzji, ścieżki sojuszników w ERG, dni volunteeringu — szczegóły po onboardingu.",

  backgroundChecks01Q: "Kiedy robicie background check?",
  backgroundChecks01A:
    "Po warunkowej akceptacji oferty. Zakres zależy od roli: tożsamość, praca, wykształcenie, karne tam, gdzie legalne.",
  backgroundChecks02Q: "Czy drobne wykroczenie dyskwalifikuje?",
  backgroundChecks02A:
    "Oceniamy relewancję i prawo. Regulowane role mają twarde bariery — rekruter ich nie omija.",
  backgroundChecks03Q: "Czy sprawdzacie historię kredytową?",
  backgroundChecks03A:
    "Tylko przy dostępie do finansów/płatności — z uprzedzeniem i zgodnie z prawem lokalnym.",
  backgroundChecks04Q: "Jak kwestionować błędny raport?",
  backgroundChecks04A:
    "Link do vendora w kopii raportu; compliance wstrzymuje start do wyjaśnienia.",
  backgroundChecks05Q: "Czy checki są globalne?",
  backgroundChecks05A:
    "Weryfikujemy kraje zamieszkania/pracy z ostatnich 7 lat, zgodnie z dostępem do danych.",
  backgroundChecks06Q: "Czy kontraktorzy przechodzą te same checki?",
  backgroundChecks06A:
    "Lżejszy pakiet, chyba że dostęp do systemów jak u etatowca — wtedy parytet.",

  referrals01Q: "Jak działa program poleceń pracowniczych?",
  referrals01A:
    "Pracownicy zgłaszają przez portal wewnętrzny; premia po okresie próbnym. Kwoty zależą od poziomu i regionu (demo).",
  referrals02Q: "Czy mogę podać polecenie w aplikacji?",
  referrals02A:
    "Tak — e-mail służbowy polecającego w formularzu. Nie omija oceny umiejętności.",
  referrals03Q: "Czy polecenia mają priorytet?",
  referrals03A:
    "Ten sam proces, szybszy triage, gdy polecający jest na zespole rekrutującym.",
  referrals04Q: "Czy agencje mogą polecać?",
  referrals04A:
    "Wymagana umowa i ID req. Niezamówione CV agencji mogą być odrzucone.",
  referrals05Q: "Czy jest limit premii rocznie?",
  referrals05A:
    "Limity na pracownika — zwykle sześć wypłaconych poleceń rocznie (demo).",
  referrals06Q: "Co jeśli kandydat jest już w systemie?",
  referrals06A:
    "Wygrywa pierwsze ważne źródło wg CRM; rekruter wyjaśni status duplikatu.",

  campus01Q: "Kiedy rekrutujecie stażystów i absolwentów?",
  campus01A:
    "Półkula północna: aplikacje IX–XI na lato następnego roku. Południowa — lustrzany cykl na stronach regionalnych.",
  campus02Q: "Czy jesteście na targach pracy?",
  campus02A:
    "Tak na 40+ uczelniach (demo). Sesje wirtualne uzupełniają targi bez budżetu podróży.",
  campus03Q: "Jaki format rozmów dla absolwentów?",
  campus03A:
    "Behavioral plus ćwiczenia techniczne adekwatne do studiów. Bez zagadek oderwanych od programu.",
  campus04Q: "Czy studenci ostatniego roku mogą na pełny etat?",
  campus04A:
    "Tak — podaj planowany dyplom. Oferta może być warunkowa ukończeniem studiów.",
  campus05Q: "Czy po stażu są oferty powrotne?",
  campus05A:
    "Najlepsi stażyści mogą dostać ofertę przed końcem programu — nie gwarantowane dla wszystkich.",
  campus06Q: "Czy staże są płatne?",
  campus06A:
    "Płatne co najmniej wg lokalnego minimum; relokacja możliwa w programach hub.",

  contractors01Q: "Kiedy kontraktor, kiedy etat?",
  contractors01A:
    "Etat na długą roadmapę produktu; kontraktor na szczyt zapotrzebowania lub wąskie SOW wg procurement.",
  contractors02Q: "Jak długo mogą trwać kontrakty?",
  contractors02A:
    "Typowo 6–12 mies. z przedłużeniami kwartalnymi. W niektórych krajach limity tenure — legal to sprawdza.",
  contractors03Q: "Czy kontraktor może przejść na etat?",
  contractors03A:
    "Możliwe przy wolnym headcount i ocenie — nie automatycznie po zakończeniu kontraktu.",
  contractors04Q: "Kto daje sprzęt kontraktorowi?",
  contractors04A:
    "Zwykle agencja, chyba że dostajesz laptop firmowy — obowiązkowe szkolenie security przed dostępem.",
  contractors05Q: "Czy kontraktorzy mają benefity?",
  contractors05A:
    "Przez agencję, poza wyjątkami prawnymi. Szczegóły w SOW, nie w tym FAQ.",
  contractors06Q: "Jak aplikować jako niezależny konsultant?",
  contractors06A:
    "Portal dostawcy z zakładki Partnerzy; aplikuj tylko na req oznaczone „contract”.",

  privacy01Q: "Jakie dane zbieracie przy aplikacji?",
  privacy01A:
    "Kontakt, CV, opcjonalne self-ID różnorodności, notatki z rozmów. Minimum pod rekrutację — w notice o prywatności.",
  privacy02Q: "Gdzie są przechowywane dane?",
  privacy02A:
    "Głównie UE i USA z SCC przy transferach. Podprocesory w aneksie kandydata (demo).",
  privacy03Q: "Czy mogę usunąć profil?",
  privacy03A:
    "Tak — privacy@ lub self-service. Wyjątki dla zatrudnionych i legal hold.",
  privacy04Q: "Czy sprzedajecie dane kandydatów?",
  privacy04A: "Nie. Nie sprzedajemy aplikacji brokerom. Analityka zagregowana jest wewnętrzna.",
  privacy05Q: "Jak długo trzymacie odrzucone aplikacje?",
  privacy05A:
    "Zwykle 24 miesiące, chyba że zapiszesz się do talent community; krótsze limity prawa mają pierwszeństwo.",
  privacy06Q: "Kto w firmie widzi moją aplikację?",
  privacy06A:
    "Rekruterzy, hiring managerzy, interviewerzy w loopie i admini HR pod RBAC.",

  globalMobility01Q: "Czym jest zespół global mobility?",
  globalMobility01A:
    "Specjaliści od transferów, ekwalizacji podatkowej i imigracji — po akceptacji oferty.",
  globalMobility02Q: "Czy jest tax equalization dla expatów?",
  globalMobility02A:
    "Transfery senior mogą mieć politykę, by netto nie było gorsze niż w kraju domowym — w liście mobility.",
  globalMobility03Q: "Czy rodzina może jechać ze mną?",
  globalMobility03A:
    "Wizy zależnych i szkoły przy zatwierdzonych ruchach executive i critical-skill.",
  globalMobility04Q: "Wsparcie dla par dual-career?",
  globalMobility04A:
    "Partnerzy placement w wybranych hubach — skuteczność zależy od rynku; omawiamy na konsultacji.",
  globalMobility05Q: "Wsparcie językowe po przeprowadzce?",
  globalMobility05A:
    "Buddy lokalny i stipendium językowe w hubach nieanglojęzycznych dla ról z klientem.",
  globalMobility06Q: "Czym assignment różni się od transferu stałego?",
  globalMobility06A:
    "Do 24 mies. inna struktura podatków i benefitów — mobility wyjaśnia przed podpisem.",

  roleSpecific01Q: "IC czy manager w tej roli?",
  roleSpecific01A:
    "Sprawdź poziom w ogłoszeniu — IC L3–L7; manager z opisem zespołu i headcount.",
  roleSpecific02Q: "Czy będzie on-call?",
  roleSpecific02A:
    "Platforma/produkcja publikuje rotacje z kompensacją lub czasem wolnych — zapytaj w finale.",
  roleSpecific03Q: "Czy wymagane są podróże?",
  roleSpecific03A:
    "Procent w stopce ogłoszenia. Role z klientem 25–40%; inżynieria często ≤10%.",
  roleSpecific04Q: "Czy są testy na substancje?",
  roleSpecific04A:
    "Role safety-sensitive/regulowane tam, gdzie legalne. Biuro korporacyjne zwykle nie.",
  roleSpecific05Q: "Czy zobaczę zespół przed startem?",
  roleSpecific05A:
    "Hiring manager pokazuje org chart przy ofercie; w procesie spotkasz peerów z squadu.",
  roleSpecific06Q: "Czy wymagane jest clearance?",
  roleSpecific06A:
    "Role defense/public sector mają poziom w ogłoszeniu. Proces może dodać miesiące — planuj.",
} as const;
