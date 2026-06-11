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
