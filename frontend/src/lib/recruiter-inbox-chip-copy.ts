/**
 * Maps known English inbox chip/review strings to PL when UI locale is Polish.
 * Used when upstream cached English or X-Locale was not applied at generation time.
 */

const EXACT_EN_TO_PL: Record<string, string> = {
  "Low algorithmic fit — recruiter decision required":
    "Niska zgodność algorytmiczna — wymagana decyzja rekrutera",
  "No skills list on profile": "Brak listy umiejętności w profilu",
  "Candidate location differs from posting": "Lokalizacja kandydata różni się od ogłoszenia",
  "Candidate target role title aligns with posting": "Docelowa rola kandydata pasuje do ogłoszenia",
  "Candidate location matches posting": "Lokalizacja kandydata zgodna z ogłoszeniem",
  "Salary band within posting range": "Widełki pensji kandydata mieszczą się w ogłoszeniu",
  "Experience level fits role seniority": "Doświadczenie profilu pasuje do poziomu roli",
  "Junior profile fits posting level": "Profil junior pasuje do poziomu ogłoszenia",
  "Strong profile overlap with posting requirements":
    "Silne nakładanie profilu z wymaganiami ogłoszenia",
  "Solid overall profile fit for role": "Dobre ogólne dopasowanie profilu do roli",
  "Partial overlap — worth manual review": "Częściowe dopasowanie — warto ocenić ręcznie",
  "Target role title aligns with posting": "Docelowa rola kandydata pasuje do ogłoszenia",
  "Location aligns with posting": "Lokalizacja zgodna z ogłoszeniem",
  "Expected salary within posting band": "Oczekiwane wynagrodzenie mieści się w widełkach",
  "No detected skill overlap with posting text":
    "Brak wykrytej nakładki umiejętności z tekstem ogłoszenia",
  "Target role title does not directly match posting title":
    "Preferowany tytuł roli nie pokrywa się wprost z tytułem ogłoszenia",
  "Expected salary above posting maximum": "Oczekiwane wynagrodzenie powyżej widełek ogłoszenia",
  "No full CV text on profile — structured fields only":
    "Brak pełnego tekstu CV w profilu — tylko pola strukturalne",
  "Low algorithmic fit — profile may miss baseline criteria":
    "Niskie dopasowanie algorytmu — profil może nie spełniać podstawowych kryteriów",
};

const PREFIX_EN_TO_PL: Array<{ prefix: string; pl: (rest: string) => string }> = [
  {
    prefix: "Profile skills overlap: ",
    pl: (rest) => `Umiejętności z profilu pokrywają się: ${titleCaseSkills(rest)}`,
  },
  {
    prefix: "Profile skills found in posting text: ",
    pl: (rest) => `Umiejętności z profilu znalezione w treści ogłoszenia: ${titleCaseSkills(rest)}`,
  },
  {
    prefix: "No skills list on profile (",
    pl: (rest) => `Brak listy umiejętności w profilu (${rest}`,
  },
];

function titleCaseSkills(sample: string): string {
  return sample
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s))
    .join(", ");
}

/** Localize a chip or review-card line when UI is PL and text is a known English reason. */
export function localizeRecruiterInboxChipText(text: string, locale: string): string {
  const trimmed = text.trim();
  if (!trimmed || !locale.toLowerCase().startsWith("pl")) return text;

  const exact = EXACT_EN_TO_PL[trimmed];
  if (exact) return exact;

  for (const { prefix, pl } of PREFIX_EN_TO_PL) {
    if (trimmed.startsWith(prefix)) {
      return pl(trimmed.slice(prefix.length));
    }
  }

  return text;
}

const SHORT_EN: Record<string, string> = {
  "Low algorithmic fit — recruiter decision required": "Low fit — review",
  "No skills list on profile": "No skills list",
  "Candidate location differs from posting": "Location differs",
  "Candidate target role title aligns with posting": "Role aligns",
  "Candidate location matches posting": "Location matches",
  "Salary band within posting range": "Salary in range",
  "Experience level fits role seniority": "Seniority fits",
  "Junior profile fits posting level": "Junior level fits",
  "Strong profile overlap with posting requirements": "Strong overlap",
  "Solid overall profile fit for role": "Solid fit",
  "Partial overlap — worth manual review": "Partial overlap",
  "Target role title aligns with posting": "Role aligns",
  "Location aligns with posting": "Location aligns",
  "Expected salary within posting band": "Salary in band",
  "No detected skill overlap with posting text": "No skill overlap",
  "Target role title does not directly match posting title": "Title mismatch",
  "Expected salary above posting maximum": "Salary above max",
  "No full CV text on profile — structured fields only": "No full CV text",
  "Low algorithmic fit — profile may miss baseline criteria": "Low fit — review",
};

const SHORT_PL: Record<string, string> = {
  "Niska zgodność algorytmiczna — wymagana decyzja rekrutera": "Niskie dopasowanie",
  "Brak listy umiejętności w profilu": "Brak umiejętności",
  "Lokalizacja kandydata różni się od ogłoszenia": "Inna lokalizacja",
  "Docelowa rola kandydata pasuje do ogłoszenia": "Rola pasuje",
  "Lokalizacja kandydata zgodna z ogłoszeniem": "Lokalizacja OK",
  "Widełki pensji kandydata mieszczą się w ogłoszeniu": "Pensja w widełkach",
  "Doświadczenie profilu pasuje do poziomu roli": "Poziom OK",
  "Profil junior pasuje do poziomu ogłoszenia": "Junior OK",
  "Silne nakładanie profilu z wymaganiami ogłoszenia": "Silne dopasowanie",
  "Dobre ogólne dopasowanie profilu do roli": "Dobre dopasowanie",
  "Częściowe dopasowanie — warto ocenić ręcznie": "Częściowe dopasowanie",
  "Lokalizacja zgodna z ogłoszeniem": "Lokalizacja OK",
  "Oczekiwane wynagrodzenie mieści się w widełkach": "Pensja w widełkach",
  "Brak wykrytej nakładki umiejętności z tekstem ogłoszenia": "Brak nakładki",
  "Preferowany tytuł roli nie pokrywa się wprost z tytułem ogłoszenia": "Tytuł nie pasuje",
  "Oczekiwane wynagrodzenie powyżej widełek ogłoszenia": "Pensja ponad widełki",
  "Brak pełnego tekstu CV w profilu — tylko pola strukturalne": "Brak pełnego CV",
  "Niskie dopasowanie algorytmu — profil może nie spełniać podstawowych kryteriów":
    "Niskie dopasowanie",
};

const SHORT_PREFIX_EN: Array<{ prefix: string; short: (rest: string) => string }> = [
  {
    prefix: "Profile skills overlap: ",
    short: (rest) => `Skills: ${titleCaseSkills(rest).split(", ").slice(0, 2).join(", ")}`,
  },
  {
    prefix: "Profile skills found in posting text: ",
    short: (rest) => `Skills in post: ${titleCaseSkills(rest).split(", ").slice(0, 2).join(", ")}`,
  },
];

const SHORT_PREFIX_PL: Array<{ prefix: string; short: (rest: string) => string }> = [
  {
    prefix: "Umiejętności z profilu pokrywają się: ",
    short: (rest) => `Umiejętności: ${rest.split(", ").slice(0, 2).join(", ")}`,
  },
  {
    prefix: "Umiejętności z profilu znalezione w treści ogłoszenia: ",
    short: (rest) => `W ogłoszeniu: ${rest.split(", ").slice(0, 2).join(", ")}`,
  },
];

/** Compact chip label for inbox card preview (full text remains in review card). */
export function shortRecruiterInboxChipText(text: string, locale: string): string {
  const localized = localizeRecruiterInboxChipText(text, locale);
  const trimmed = text.trim();
  const isPl = locale.toLowerCase().startsWith("pl");

  if (isPl) {
    const exact = SHORT_PL[localized];
    if (exact) return exact;
    for (const { prefix, short } of SHORT_PREFIX_PL) {
      if (localized.startsWith(prefix)) return short(localized.slice(prefix.length));
    }
    return localized.length > 42 ? `${localized.slice(0, 39)}…` : localized;
  }

  const exactEn = SHORT_EN[trimmed];
  if (exactEn) return exactEn;
  for (const { prefix, short } of SHORT_PREFIX_EN) {
    if (trimmed.startsWith(prefix)) return short(trimmed.slice(prefix.length));
  }
  return localized.length > 42 ? `${localized.slice(0, 39)}…` : localized;
}
