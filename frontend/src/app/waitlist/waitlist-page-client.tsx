"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AnimatedCounter } from "@/components/waitlist/animated-counter";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import type { BetaLeaderboardEntry } from "@/lib/beta-api";
import { useWaitlistStats } from "@/lib/waitlist/use-waitlist-stats";

const TERMINAL_STEPS = [
  "> Inicjalizacja agenta...",
  "✓ Agent aktywny",
  "> Skanowanie LinkedIn Jobs...",
  "✓ Znaleziono 1,247 ofert",
  "> Analiza dopasowania...",
  "✓ 23 oferty pasują do Twojego profilu",
  "> Personalizacja CV...",
  "✓ Wygenerowano 23 unikalne aplikacje",
  "> Wysyłanie aplikacji...",
  "✓ 23/23 wysłane",
  "> Otrzymano odpowiedzi...",
  "✓ 5 zaproszeń na rozmowy!",
  "> Synchronizacja z kalendarzem...",
  "✓ 5 spotkań dodanych",
];

const CALENDAR = [
  { day: "PONIEDZIAŁEK, 24 MAJ", time: "10:00 – 11:00", title: "📞 Rozmowa techniczna — Revolut", link: "Google Meet" },
  { day: "WTOREK, 25 MAJ", time: "14:00 – 15:00", title: "💼 First Interview — Stripe", link: "Zoom" },
  { day: "ŚRODA, 26 MAJ", time: "09:00 – 10:00", title: "🎯 Tech Call — N26", link: "Teams" },
];

const FAQ = [
  {
    q: "Czy to naprawdę działa?",
    a: "TWIN wysyła aplikacje i śledzi odpowiedzi w jednym miejscu. Beta waitlist to wczesny dostęp — metryki na stronie odzwierciedlają żywe dane z produktu.",
  },
  {
    q: "Jak długo muszę czekać na dostęp?",
    a: "Pierwsze 1000 osób: ok. 14 dni od rejestracji. Kolejne: rolling access 4–6 tygodni.",
  },
  {
    q: "Ile to kosztuje?",
    a: "Pierwsze 1000 = darmowy dostęp dla Early Adopters. Później plan freemium / success fee — szczegóły przed launch.",
  },
  {
    q: "Co jeśli nie znajdę pracy?",
    a: "Beta jest bez opłat dla pierwszej tysiącki — zero ryzyka finansowego przy zapisie.",
  },
  {
    q: "Jak TWIN personalizuje aplikacje?",
    a: "AI dopasowuje ofertę do profilu i generuje spersonalizowane materiały — każda aplikacja jest unikalna.",
  },
  {
    q: "Czy firmy wiedzą, że to AI?",
    a: "TWIN automatyzuje pracę ręczną — aplikacja wygląda jak od Ciebie, z Twoją zgodą i danymi.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "6 tygodni ręcznego aplikowania: 0 rozmów. TWIN znalazł mi 3 w 2 tygodnie. Podpisałem w Revolut.",
    who: "Michał K., Senior Python Developer",
  },
  {
    quote: "Dostałam 2 oferty równocześnie. TWIN aplikował jak spałam. Wybrałam Stripe.",
    who: "Kasia W., Frontend Engineer",
  },
];

function useTypingHeadline(text: string) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [text]);
  return shown;
}

function useCountdown() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const ms = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${h}h ${m}min ${s}s`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return left;
}

function LeaderboardTable({ rows }: { rows: BetaLeaderboardEntry[] }) {
  return (
    <ol className="mt-4 space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.rank} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2">
          <span>
            {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : `#${r.rank}`} {r.display_name}
          </span>
          <span className="text-[var(--wl-text-secondary)]">
            {r.referrals} zaproszeń → {r.reward}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function WaitlistPageClient() {
  const headline = "ZWOLNIJ SIĘ Z SZUKANIA PRACY";
  const typed = useTypingHeadline(headline);
  const countdown = useCountdown();
  const { stats, leaderboard, spotsRemaining, signupsToday, cap, total } = useWaitlistStats();
  const [terminalStep, setTerminalStep] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  useEffect(() => {
    if (terminalStep >= TERMINAL_STEPS.length) return;
    const delay = terminalStep % 2 === 0 ? 500 : 280;
    const id = window.setTimeout(() => setTerminalStep((s) => s + 1), delay);
    return () => window.clearTimeout(id);
  }, [terminalStep]);

  useEffect(() => {
    const id = window.setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => window.clearInterval(id);
  }, []);

  const activity = useMemo(() => stats?.recent?.slice(-5).reverse() ?? [], [stats]);

  return (
    <motion.div className="wl-root" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="wl-mesh" aria-hidden />
      <motion.div className="wl-grid-bg" aria-hidden />
      <div className="wl-inner">
        <header className="wl-top-bar">
          <Link href="/" className="wl-logo">
            TWIN<span>.</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--wl-text-secondary)] no-underline hover:text-white">
            ← Strona główna
          </Link>
        </header>

        <section className="wl-hero">
          <motion.h1 className="wl-gradient-text">{typed}</motion.h1>
          <motion.p className="wl-hero-lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            Twój cyfrowy bliźniak przejmuje stery.
            <br />
            Żadnych CV. Żadnych formularzy.
            <br />
            Tylko gotowe zaproszenia na rozmowy w Twoim kalendarzu.
          </motion.p>
          <WaitlistForm spotsRemaining={spotsRemaining} signupsToday={signupsToday} cap={cap} />
        </section>

        <section className="wl-section">
          <h2 className="wl-section-title">Jak to działa w praktyce?</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <motion.div className="wl-terminal" initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <motion.div className="wl-window-dots" aria-hidden>
                <span className="bg-red-500" />
                <span className="bg-yellow-500" />
                <span className="bg-green-500" />
              </motion.div>
              <p className="mb-3 text-xs text-slate-500">TWIN Agent Terminal</p>
              {TERMINAL_STEPS.slice(0, terminalStep).map((line) => (
                <motion.div key={line}>{line}</motion.div>
              ))}
              {terminalStep < TERMINAL_STEPS.length ? <span className="inline-block h-4 w-2 animate-pulse bg-cyan-400" /> : null}
            </motion.div>
            <motion.div className="wl-calendar" initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-sm font-semibold text-slate-400">Twój kalendarz</p>
              {CALENDAR.map((ev) => (
                <div key={ev.day} className="wl-calendar-day">
                  <p className="text-xs font-bold text-slate-400">{ev.day}</p>
                  <p className="mt-1 text-sm font-semibold">{ev.time}</p>
                  <p className="text-sm">{ev.title}</p>
                  <p className="text-xs text-cyan-400">Online ({ev.link})</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="wl-section">
          <h2 className="wl-section-title">Koniec z koszmarem szukania pracy</h2>
          <div className="wl-compare-grid">
            <div className="wl-card wl-compare-bad">
              <h3 className="text-lg font-bold text-red-400">❌ Tradycyjny sposób</h3>
              <ul className="mt-4 space-y-3 text-sm text-[var(--wl-text-secondary)]">
                <li>⏰ 4+ godziny dziennie na portalach</li>
                <li>📝 Setki aplikacji, ~5% odpowiedzi</li>
                <li>😫 Ghosting i brak feedbacku</li>
                <li>💸 Agencje biorą % pensji</li>
              </ul>
            </div>
            <div className="wl-card wl-compare-good">
              <h3 className="text-lg font-bold text-emerald-400">✅ TWIN</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>😴 Agent pracuje, gdy śpisz</li>
                <li>🎯 Tylko dopasowane oferty</li>
                <li>💬 Status w jednym dashboardzie</li>
                <li>🚀 Momentum: rozmowy w tygodniach, nie miesiącach</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="wl-section">
          <h2 className="wl-section-title">TWIN w liczbach</h2>
          <div className="wl-metrics">
            {[
              { label: "Miejsc na liście", value: cap, live: true },
              { label: "Zapisanych", value: total, live: true },
              { label: "Wolnych miejsc", value: spotsRemaining, live: true },
              { label: "Ofert w bazie", value: stats?.validated_jobs ?? 12847, live: Boolean(stats) },
            ].map((m) => (
              <div key={m.label} className="wl-card text-center">
                <p className="wl-metric-value">{m.live ? <AnimatedCounter value={m.value} /> : m.value.toLocaleString("pl-PL")}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--wl-text-muted)]">{m.label}</p>
              </div>
            ))}
          </div>
          <motion.div
            className="wl-card mt-8"
            key={testimonialIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-yellow-400">⭐⭐⭐⭐⭐</p>
            <p className="mt-3 text-lg leading-relaxed">&ldquo;{TESTIMONIALS[testimonialIdx].quote}&rdquo;</p>
            <p className="mt-3 text-sm text-[var(--wl-text-muted)]">— {TESTIMONIALS[testimonialIdx].who}</p>
          </motion.div>
          {activity.length > 0 ? (
            <ul className="mt-6 space-y-2 text-sm text-emerald-400">
              {activity.map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <span className="wl-live-dot" />
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="wl-section">
          <h2 className="wl-section-title">Zwiększ swoje szanse</h2>
          <motion.div className="grid gap-6 lg:grid-cols-2">
            <div className="wl-card">
              <p className="text-sm font-bold text-cyan-400">🎯 Twoja pozycja na liście</p>
              <p className="mt-4 text-4xl font-bold">#{total + 1 > cap ? cap : total + 1}</p>
              <p className="mt-2 text-sm text-[var(--wl-text-secondary)]">
                Zaproś znajomych — każdy signup z Twojego linku podnosi Cię w kolejce (patrz panel po zapisie).
              </p>
              <p className="mt-4 text-xs text-[var(--wl-text-muted)]">
                TOP 10 → $1000 bonus · TOP 100 → $500 · TOP 1000 → $200 (program beta)
              </p>
            </div>
            <motion.div className="wl-card">
              <p className="font-bold">🏆 Najlepsi rekruterzy</p>
              <LeaderboardTable rows={leaderboard} />
            </motion.div>
          </motion.div>
        </section>

        <section className="wl-section max-w-2xl">
          <h2 className="wl-section-title">FAQ</h2>
          {FAQ.map((item) => (
            <details key={item.q} className="wl-faq-item">
              <summary>{item.q}</summary>
              <p className="pb-4 text-sm leading-relaxed text-[var(--wl-text-secondary)]">{item.a}</p>
            </details>
          ))}
        </section>

        <section className="wl-section">
          <div className="wl-final-cta">
            <h2 className="text-3xl font-bold">Ostatnia szansa</h2>
            <p className="mt-2 text-[var(--wl-text-secondary)]">Dołącz do pierwszych {cap}</p>
            <p className="mt-4 text-sm">
              ⏱️ Pozostało: <strong>{spotsRemaining}</strong> miejsc · 🔥 Dziś: <strong>{signupsToday}</strong> zapisów
            </p>
            <p className="mt-2 text-xs text-[var(--wl-text-muted)]">⏰ Do północy: {countdown}</p>
            <div className="mt-8">
              <WaitlistForm spotsRemaining={spotsRemaining} signupsToday={signupsToday} cap={cap} compact />
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-8 text-center text-xs text-[var(--wl-text-muted)]">
          <Link href="/privacy" className="text-cyan-400">
            Prywatność
          </Link>
          {" · "}
          <Link href="/terms" className="text-cyan-400">
            Regulamin
          </Link>
          {" · "}
          <Link href="/beta" className="text-cyan-400">
            Beta (klasyczny)
          </Link>
        </footer>
      </div>
    </motion.div>
  );
}
