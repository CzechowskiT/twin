export type FilmLocale = "en" | "pl";

export type FilmSegment = {
  id: string;
  startSec: number;
  endSec: number;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export const FILM_DURATION_SEC = 42;
export const FILM_FPS = 30;

const EN_SEGMENTS: FilmSegment[] = [
  {
    id: "problem",
    startSec: 0,
    endSec: 5,
    eyebrow: "The problem",
    title: "Thousands of pings. Zero clarity.",
    subtitle: "Inboxes flood. CV piles grow. Nobody wins.",
  },
  {
    id: "context",
    startSec: 5,
    endSec: 10,
    eyebrow: "TWIN",
    title: "Signal over noise",
    subtitle: "Ranked matches. Human decisions. Calendar-first.",
  },
  {
    id: "candidate",
    startSec: 10,
    endSec: 18,
    eyebrow: "Candidate",
    title: "Matches worth your time",
    subtitle: "Career Compass surfaces roles that fit your bar.",
  },
  {
    id: "recruiter",
    startSec: 18,
    endSec: 26,
    eyebrow: "Recruiter",
    title: "Review cards, not blind piles",
    subtitle: "Accept, decline, or reschedule — you stay in control.",
  },
  {
    id: "company",
    startSec: 26,
    endSec: 33,
    eyebrow: "Company",
    title: "Talent memory that compounds",
    subtitle: "Hiring cockpit with explainable pipeline quality.",
  },
  {
    id: "calendar",
    startSec: 33,
    endSec: 38,
    eyebrow: "The result",
    title: "A calendar of acceptance",
    subtitle: "Pre-qualified interview holds — not random spam.",
  },
  {
    id: "cta",
    startSec: 38,
    endSec: 42,
    eyebrow: "TWIN",
    title: "The right talent. The right role. The right moment.",
    subtitle: "Explore the interactive demo — sample data only.",
  },
];

const PL_SEGMENTS: FilmSegment[] = [
  {
    id: "problem",
    startSec: 0,
    endSec: 5,
    eyebrow: "Problem",
    title: "Tysiące pingów. Zero jasności.",
    subtitle: "Skrzynki toną. Stosy CV rosną. Nikt nie wygrywa.",
  },
  {
    id: "context",
    startSec: 5,
    endSec: 10,
    eyebrow: "TWIN",
    title: "Sygnał ponad szumem",
    subtitle: "Ranking dopasowań. Decyzje człowieka. Kalendarz na pierwszym planie.",
  },
  {
    id: "candidate",
    startSec: 10,
    endSec: 18,
    eyebrow: "Kandydat",
    title: "Dopasowania warte Twojego czasu",
    subtitle: "Career Compass pokazuje role zgodne z Twoim progiem.",
  },
  {
    id: "recruiter",
    startSec: 18,
    endSec: 26,
    eyebrow: "Rekruter",
    title: "Karty review, nie ślepe stosy",
    subtitle: "Akceptuj, odrzuć lub przełóż — kontrola zostaje po Twojej stronie.",
  },
  {
    id: "company",
    startSec: 26,
    endSec: 33,
    eyebrow: "Firma",
    title: "Pamięć talentu, która rośnie",
    subtitle: "Kokpit hiringu z wyjaśnialną jakością pipeline.",
  },
  {
    id: "calendar",
    startSec: 33,
    endSec: 38,
    eyebrow: "Efekt",
    title: "Kalendarz akceptacji",
    subtitle: "Pre-kwalifikowane holdy rozmów — nie losowy spam.",
  },
  {
    id: "cta",
    startSec: 38,
    endSec: 42,
    eyebrow: "TWIN",
    title: "Właściwy talent. Właściwa rola. Właściwy moment.",
    subtitle: "Odkryj interaktywne demo — tylko dane próbki.",
  },
];

export function filmSegments(locale: FilmLocale): FilmSegment[] {
  return locale === "pl" ? PL_SEGMENTS : EN_SEGMENTS;
}

export function vttCaptions(locale: FilmLocale): string {
  const segments = filmSegments(locale);
  const lines = ["WEBVTT", ""];
  for (const seg of segments) {
    lines.push(`${formatVttTime(seg.startSec)} --> ${formatVttTime(seg.endSec)}`);
    lines.push(`${seg.title} — ${seg.subtitle}`);
    lines.push("");
  }
  return lines.join("\n");
}

function formatVttTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, "0")}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
