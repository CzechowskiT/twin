/**
 * One-shot builder: professional DE premium overlay from English premium tree.
 * Run: npx tsx scripts/build-de-premium-overlay.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { en } from "../src/lib/i18n";
import { extractPremiumTree } from "../src/lib/overlays/premium/extract-premium-tree";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/lib/overlays/premium/generated/de.ts",
);

function flattenStrings(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flattenStrings(value, path));
  }
  return out;
}

function unflattenStrings(flat: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let current = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part in current) || typeof current[part] !== "object") current[part] = {};
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]!] = value;
  }
  return out;
}

/** Curated DE premium copy — path → translation. Omitted paths use translateEn(). */
const DE: Record<string, string> = {
  "nav.login": "Anmelden",
  "nav.register": "Registrieren",
  "nav.profile": "Profil",
  "nav.jobs": "Stellen",
  "nav.applications": "Bewerbungen",
  "nav.integrations": "Integrationen",
  "nav.dashboard": "Übersicht",
  "nav.calculator": "B2B-ROI-Rechner",
  "nav.calculatorInvestor": "Investor-Rechner",
  "nav.calculatorB2bForCompanies": "B2B-ROI für Unternehmen",
  "nav.forCandidates": "Kandidaten",
  "nav.forRecruiters": "Recruiter",
  "nav.forCompanies": "Unternehmen",
  "nav.forInvestors": "Investoren",
  "nav.demo": "Demo",
  "nav.waitlist": "Warteliste",
  "nav.menu": "Menü",
  "nav.about": "Über uns",
  "nav.howItWorks": "So funktioniert's",
  "nav.pricing": "Preise",
  "nav.cases": "Fallstudien",
  "nav.contact": "Kontakt",
  "nav.faq": "FAQ",
  "nav.careers": "Karriere",
  "nav.media": "Medien",
  "nav.partners": "Partner",
  "nav.ariaCompanyNav": "Unternehmensnavigation",
  "nav.ariaAccountNav": "Kontonavigation",
  "nav.ariaMobileNav": "Hauptmenü",
  "nav.ariaSiteNav": "Seiten",
  "nav.ariaGrowthCta": "Marketing-Aktionen",
  "nav.ariaProductCta": "Produkt-Shortcuts",
  "nav.ariaProductNav": "Produkt & Personas",
  "nav.ariaPersonaNav": "Zielgruppe",
  "nav.personaCandidate": "Kandidat",
  "nav.personaRecruiter": "Recruiting",
  "nav.personaCompany": "Unternehmen",
  "nav.personaInvestor": "Investor",
  "nav.logoutToSwitchRole": "Abmelden, um die Rolle zu wechseln",

  "home.feature6Title": "Phasenweise Automatisierung (heute pausiert)",
  "home.feature6Line":
    "Bewerbungspakete zur Prüfung vorbereiten — Auto-Apply bleibt in Produktion pausiert, bis Freigaben es erlauben.",

  "login.title": "Anmelden",
  "login.hubTitle": "Wählen Sie Ihre Rolle",
  "login.hubLead":
    "Ein TWIN-Konto — unterschiedliche Tools nach der Anmeldung. Wählen Sie die Rolle, die zu Ihrer Nutzung passt.",
  "login.selectRoleHint": "Rolle für die Anmeldung wählen",
  "login.selectRoleModalTitle": "Zuerst Ihre Rolle wählen",
  "login.selectRoleModalMessage":
    "TWIN hat separate Anmeldepfade für Kandidaten, Recruiter, Unternehmen und Investoren. Wählen Sie die Rolle, die zu Ihrer Nutzung der Plattform passt.",
  "login.selectRoleModalDismiss": "Verstanden",
  "login.zoneCandidateTitle": "Kandidaten-Anmeldung",
  "login.zoneCandidateLead": "Dashboard, Matches, Auto-Apply und Interview-Kalender.",
  "login.zoneRecruiterTitle": "Recruiter-Anmeldung",
  "login.zoneRecruiterLead": "Annahme-Posteingang und B2B-ROI-Tools für Kundengespräche.",
  "login.zoneCompanyTitle": "Unternehmens-Anmeldung",
  "login.zoneCompanyLead":
    "Enterprise-Beschaffung — Jahrespreise und B2B-ROI finden Sie in der Spur „Unternehmen“.",
  "login.zoneCompanyDemoHint":
    "Gründer-Demo: Melden Sie sich mit demo@twin.career an (Passwort in docs/INVESTOR_DEMO_RUNBOOK.md), dann /for-companies oder /calculator/b2b öffnen.",
  "login.zoneInvestorTitle": "Investor-Anmeldung",
  "login.zoneInvestorLead": "Fonds-Szenario-Rechner und Traktionskennzahlen — keine Arbeitgeber-Beschaffung.",
  "login.allZones": "Alle Anmeldeoptionen",
  "login.email": "E-Mail",
  "login.password": "Passwort",
  "login.signingIn": "Anmeldung…",
  "login.submit": "Anmelden",
  "login.forgotPassword": "Passwort vergessen?",
  "login.noAccount": "Noch kein Konto?",
  "login.register": "Registrieren",
  "login.failed": "Anmeldung fehlgeschlagen",
  "login.configMissingApi":
    "Die Website erreicht die API nicht. Setzen Sie auf Vercel TWIN_API_BASE_URL (nur Server) oder NEXT_PUBLIC_API_URL auf Ihre Railway-API-URL (https://… ohne abschließenden Schrägstrich) und stellen Sie das Frontend erneut bereit.",
  "login.orContinue": "oder fortfahren mit",
  "login.linkedIn": "Weiter mit LinkedIn",
  "login.linkedInComingSoon":
    "LinkedIn-Anmeldung ist deaktiviert, bis die API Client-ID, Secret und LINKEDIN_REDIRECT_URI hat (siehe gelbes Feld). Nutzen Sie E-Mail unten.",
  "login.linkedInSetupTitle": "LinkedIn-Anmeldung aktivieren (Einmal-Einrichtung)",
  "login.linkedInSetupStep1":
    "App unter linkedin.com/developers erstellen → „Sign In with OpenID Connect“ hinzufügen.",
  "login.linkedInSetupStep2Intro":
    "Unter LinkedIn → Auth → Authorized redirect URLs jede Zeile unten exakt hinzufügen (muss mit API-Env übereinstimmen).",
  "login.linkedInSetupCallbackProd": "Produktions-API (NEXT_PUBLIC_API_URL auf Vercel / Railway):",
  "login.linkedInSetupCallbackLocal": "Lokale API (Entwicklung):",
  "login.linkedInSetupStep3":
    "Auf dem API-Host (z. B. Railway) LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET und LINKEDIN_REDIRECT_URI exakt auf die Produktions-Callback-URL oben setzen (oder localhost für Dev), dann API neu deployen.",
  "login.linkedInSetupDoc": "Vollständige Anleitung: docs/LINKEDIN_KONFIGURACJA_PL.md im Projektordner.",
  "login.errorLinkedinNotConfigured":
    "LinkedIn-Anmeldung ist auf dieser Website noch nicht verfügbar. Nutzen Sie E-Mail und Passwort — LinkedIn aktivieren wir, sobald Credentials hinterlegt sind.",
  "login.linkedInUnavailableTitle": "LinkedIn-Anmeldung demnächst",
  "login.linkedInUnavailableLead":
    "Nutzen Sie vorerst E-Mail und Passwort. LinkedIn erscheint hier, sobald der Betreiber OAuth auf der API aktiviert.",
  "login.useEmailLogin": "E-Mail-Anmeldung nutzen",
  "login.errorOAuthNotConfigured":
    "Dieser Anmeldeanbieter ist auf dem Server noch nicht eingerichtet. Nutzen Sie E-Mail oder fragen Sie einen Administrator.",
  "login.errorAppleNotConfigured":
    "Sign in with Apple ist auf dieser Website noch nicht aktiv — nutzen Sie E-Mail, Google oder LinkedIn. Apple erfordert ein kostenpflichtiges Apple-Developer-Konto (ca. 99 $/Jahr) und Einmal-Setup unter developer.apple.com.",
  "login.errorGithubNotConfigured":
    "Sign in with GitHub ist auf dieser Website noch nicht aktiv. Nutzen Sie E-Mail oder einen anderen Anbieter unten.",
  "login.oauthGoogle": "Weiter mit Google",
  "login.oauthGithub": "Weiter mit GitHub",
  "login.oauthApple": "Weiter mit Apple",
  "login.oauthMicrosoft": "Weiter mit Microsoft",

  "register.hubTitle": "Wählen Sie, wie Sie starten möchten",
  "register.hubLead":
    "Ein TWIN-Konto — wählen Sie, wie Sie das Produkt nutzen, und schließen Sie die Registrierung für diese Spur ab.",
  "register.hubCuriosity": "Sehen Sie, was drin ist",
  "register.hubBenefit": "Ranked Matches und Ihre Pipeline sind ~2 Minuten nach der Registrierung freigeschaltet.",
  "register.hubMicro": "Interviews, die sich lohnen — kein Posteingangs-Spam. Kostenlos starten.",
  "register.allZones": "Alle Registrierungsoptionen",
  "register.title": "Konto erstellen",
  "register.email": "E-Mail",
  "register.password": "Passwort",
  "register.privacyPolicy": "Datenschutzerklärung",
  "register.termsOfService": "Nutzungsbedingungen",
  "register.consentPrivacyBefore": "Ich akzeptiere die",
  "register.consentPrivacyAfter":
    "und willige in die Verarbeitung meiner personenbezogenen Daten zum Betrieb von TWIN ein (GDPR / UK GDPR, soweit anwendbar).",
  "register.consentTermsBefore": "Ich akzeptiere die",
  "register.consentTermsAfter": ".",
  "register.consentJobDataBefore":
    "Ich willige ein, dass TWIN Stellenanzeigen-Daten Dritter für meinen personalisierten Feed und meine Bewerbungen nutzt, wie beschrieben in der",
  "register.consentJobDataAfter": ".",
  "register.consentAiBefore":
    "Ich willige in KI-gestütztes Matching (z. B. Scoring) unter Nutzung meines Profils und von Stellenanzeigen ein, wie beschrieben in der",
  "register.consentAiAfter": ".",
  "register.creating": "Wird erstellt…",
  "register.submit": "Registrieren",
  "register.hasAccount": "Bereits ein Konto?",
  "register.login": "Anmelden",
  "register.acceptAll": "Alle akzeptieren",
  "register.acceptAllHint":
    "Aktiviert die vier erforderlichen Einwilligungen unten. Optionales Marketing bleibt deaktiviert, bis Sie es selbst ankreuzen — jedes Feld können Sie einzeln ändern.",
  "register.emailPasswordRequired": "E-Mail und Passwort eingeben.",
  "register.coreConsentsRequired":
    "Bitte akzeptieren Sie Datenschutz, AGB, Jobdaten-Nutzung und KI-Matching zur Registrierung.",
  "register.failed": "Registrierung fehlgeschlagen",
  "register.orContinue": "oder fortfahren mit",
  "register.errorLinkedinNotConfigured":
    "LinkedIn-Registrierung ist auf dem Server noch nicht eingerichtet. Nutzen Sie das Formular unten oder fragen Sie einen Administrator.",
  "register.errorOAuthNotConfigured":
    "Dieser Registrierungsanbieter ist auf dem Server noch nicht eingerichtet. Nutzen Sie das Formular unten oder fragen Sie einen Administrator.",
  "register.errorAppleNotConfigured":
    "Registrierung mit Apple ist auf dieser Website noch nicht aktiv — nutzen Sie das Formular unten oder Google/LinkedIn. Apple erfordert ein kostenpflichtiges Apple-Developer-Konto (ca. 99 $/Jahr).",
  "register.errorGithubNotConfigured":
    "Registrierung mit GitHub ist auf dieser Website noch nicht aktiv. Nutzen Sie das Formular unten oder einen anderen Anbieter.",
  "register.linkedIn": "Mit LinkedIn registrieren",
  "register.linkedInComingSoon":
    "LinkedIn-Registrierung ist deaktiviert, bis die API Client-ID, Secret und LINKEDIN_REDIRECT_URI hat (siehe gelbes Feld). Nutzen Sie das Formular unten.",
  "register.linkedInSetupTitle": "LinkedIn-Registrierung aktivieren (Einmal-Einrichtung)",
  "register.marketingOptIn": "Gelegentliche Produktupdates und Tipps per E-Mail senden (optional).",
  "register.marketingHint":
    "Sie können dies jederzeit im Profil ändern. Getrennt von der Kern-Matching-Einwilligung.",
  "register.referredByLabel": "Empfohlen von (optional)",
  "register.referredByPlaceholder": "Name oder E-Mail der Person, die Ihnen von TWIN erzählt hat",
  "register.referredByHint":
    "Freitext ist in Ordnung. Geben Sie die exakte E-Mail eines aktiven TWIN-Kontos ein — für eine künftige Empfehlungsprämie, sobald wir das Programm starten.",

  "dashboard.matchQualityExcellent": "Hervorragende Passung",
  "dashboard.matchQualityGood": "Gute Passung",
  "dashboard.matchQualityPossible": "Mögliche Passung",
  "dashboard.matchQualityWeak": "Schwache Passung",
  "dashboard.applicationTransparencyTitle": "Was TWIN dem Recruiter zeigt",
  "dashboard.applicationTransparencyContext": "Diese Ansicht dient der Bewerbungsprüfung durch Recruiter.",
  "dashboard.applicationTransparencySharedColumn": "Mit Recruiter geteilt",
  "dashboard.applicationTransparencyNotSharedColumn": "Standardmäßig nicht geteilt",
  "dashboard.applicationTransparencyHumanDecisionTitle": "Menschliche Entscheidung",
  "dashboard.applicationTransparencyWeShowLabel": "Wir zeigen:",
  "dashboard.applicationTransparencyWeShowName": "Name des Kandidaten",
  "dashboard.applicationTransparencyWeShowStatus": "Bewerbungsstatus",
  "dashboard.applicationTransparencyWeShowMatch": "Passungsscore und Match-Gründe",
  "dashboard.applicationTransparencyWeShowReviewCard": "KI-gestützte Prüfkarte",
  "dashboard.applicationTransparencyWeShowRoleInfo":
    "Informationen zur Beurteilung dieser Bewerbung für diese Rolle",
  "dashboard.applicationTransparencyNotShownLabel": "Standardmäßig nicht angezeigt:",
  "dashboard.applicationTransparencyNotShownPhone": "Telefonnummer",
  "dashboard.applicationTransparencyNotShownEmail": "E-Mail-Adresse",
  "dashboard.applicationTransparencyNotShownCv": "Vollständiger Lebenslauf-Text",
  "dashboard.applicationTransparencyNotShownAddress": "Genaue Adresse",
  "dashboard.applicationTransparencyNotShownSensitive": "Sensible Attribute",
  "dashboard.applicationTransparencyNotShownUnless":
    "es sei denn, eine gesonderte Funktion und Einwilligung erlauben es.",
  "dashboard.applicationTransparencyImportantLabel": "Wichtig:",
  "dashboard.applicationTransparencyImportant":
    "TWIN trifft keine Einstellungsentscheidungen. KI-gestütztes Ranking ordnet Signale. Der Recruiter entscheidet.",
  "dashboard.applicationTransparencyAutomationLabel": "Automatisierungsstatus:",
  "dashboard.applicationTransparencyAutomation":
    "Auto-Apply ist pausiert. Delegierte Bewerbung ist nicht live.",
  "dashboard.todayNbaRefineProfile": "Profil verfeinern",
  "dashboard.todayNbaConnectCalendar": "Kalender verbinden",
  "dashboard.todayNbaReasonProfile": "Profil ergänzen, damit TWIN Rollen für Sie ranken kann.",
  "dashboard.todayNbaReasonNoMatches":
    "Ihr Profil ist da — optimieren Sie Titel und Skills, während Matches aktualisiert werden.",
  "dashboard.todayNbaReasonCalendar":
    "Kalender verknüpfen, damit Interview-Reservierungen dort landen, wo Sie bereits planen.",
  "dashboard.todayNbaReasonPipeline":
    "Sie haben aktive Bewerbungen — Status prüfen, bevor Sie neue Schritte gehen.",
  "dashboard.todayNbaReasonMatches": "Starke Passungen sind gerankt — vor der Bewerbung prüfen.",
  "dashboard.calendarConfiguredHint":
    "Kalender verbunden — Interview-Reservierungen können synchronisiert werden, wo OAuth-Schreibzugriff aktiv ist.",

  "recruiterInbox.title": "Recruiter-Annahme-Posteingang",
  "recruiterInbox.lead":
    "Vorqualifizierte Bewerbungen für Ihr Unternehmen — zum Interview annehmen oder ablehnen, ohne Posteingangs-Rauschen.",
  "recruiterInbox.helperInvite":
    "Link aus Ihrer TWIN-Einladungs-E-Mail öffnen oder Zugangscode und Firmenname unten eingeben. Wir merken uns Ihre Wahl auf diesem Gerät.",
  "recruiterInbox.emptyStateTitle": "Was ist dieser Posteingang?",
  "recruiterInbox.emptyStateBody":
    "Eine kurze Warteschlange von Kandidaten, die TWIN bereits Ihren Rollen zugeordnet hat. Sie entscheiden per Klick, wer ein Interview-Slot erhält — kein CV-Spam, kein E-Mail-Ping-Pong.",
  "recruiterInbox.accessCodeLabel": "Zugangscode",
  "recruiterInbox.accessCodeHint": "Aus Ihrer TWIN-Einladungs-E-Mail (Einmal-Pilot-Link).",
  "recruiterInbox.accessCodePlaceholder": "Zugangscode einfügen",
  "recruiterInbox.companyLabel": "Unternehmen",
  "recruiterInbox.companyHint": "Arbeitgebername in Ihrem TWIN-Vertrag oder Ihrer Einladung.",
  "recruiterInbox.companyPlaceholder": "Unternehmen wählen",
  "recruiterInbox.companyOptionOther": "Anderes Unternehmen…",
  "recruiterInbox.load": "Warteschlange laden",
  "recruiterInbox.empty": "Derzeit keine Bewerbungen für dieses Unternehmen.",
  "recruiterInbox.missingAuth": "Zugangscode eingeben und Unternehmen wählen (aus Ihrer TWIN-Einladung).",
  "recruiterInbox.loadFailed":
    "Warteschlange konnte nicht geladen werden — Zugangscode und Unternehmen prüfen und erneut versuchen.",
  "recruiterInbox.errorUnavailable":
    "Recruiter-Posteingang ist in dieser Umgebung noch nicht verfügbar. TWIN für Pilotzugang kontaktieren.",
  "recruiterInbox.errorInvalidToken":
    "Zugangscode stimmte nicht — TWIN-Einladung prüfen und erneut versuchen.",
  "recruiterInbox.errorNetwork": "Netzwerkfehler — Verbindung prüfen und erneut versuchen.",
  "recruiterInbox.accept": "Für Interview annehmen",
  "recruiterInbox.decline": "Ablehnen",
  "recruiterInbox.back": "Für Recruiter",
  "recruiterInbox.jobsLink": "Stelle veröffentlichen",
  "recruiterInbox.demoCompanyCta": "Demo-Unternehmen nutzen (Nova Hiring PL)",
  "recruiterInbox.signedInCompanyHint":
    "Angemeldet — hinterlegtes Abrechnungsunternehmen: {company}. In der Liste wählen, wenn es zu Ihrem Posteingang passt.",
  "recruiterInbox.queueTitle": "Warteschlange · {company}",
  "recruiterInbox.changeWorkspace": "Unternehmen oder Zugangscode ändern",
  "recruiterInbox.filterStatusLabel": "Status",
  "recruiterInbox.filterStatusAll": "Alle Status",
  "recruiterInbox.filterStatusApplied": "Beworben",
  "recruiterInbox.filterStatusInterview": "Vorstellungsgespräch",
  "recruiterInbox.filterSearchPlaceholder": "Kandidat oder Rolle suchen…",
  "recruiterInbox.declineNoteLabel": "Interne Notiz (optional)",
  "recruiterInbox.declineNotePlaceholder":
    "Grund der Ablehnung — nur für Audit, nicht an Kandidaten gesendet",
  "recruiterInbox.declineConfirm": "Ablehnung bestätigen",
  "recruiterInbox.declineCancel": "Abbrechen",
  "recruiterInbox.selectAllVisible": "Alle sichtbaren auswählen",
  "recruiterInbox.selectedCount": "{count} ausgewählt",
  "recruiterInbox.batchAccept": "Ausgewählte annehmen",
  "recruiterInbox.batchDecline": "Ausgewählte ablehnen",
  "recruiterInbox.batchDeclineConfirm": "Sammel-Ablehnung bestätigen",
  "recruiterInbox.selectRow": "{name} auswählen",
  "recruiterInbox.humanDecisionNote": "KI-gestütztes Ranking. Recruiter-Entscheidung erforderlich.",
  "recruiterInbox.matchScoreBadge": "Passung {score}%",
  "recruiterInbox.matchScoreExcellent": "Hervorragende Passung",
  "recruiterInbox.matchScoreGood": "Gute Passung",
  "recruiterInbox.matchScorePossible": "Mögliche Passung",
  "recruiterInbox.matchScoreWeak": "Schwache Passung",
  "recruiterInbox.matchScoreUnknown": "Passungsscore",
  "recruiterInbox.statusAcceptedInterview": "Für Interview angenommen",
  "recruiterInbox.statusDeclined": "Abgelehnt",
  "recruiterInbox.decisionSaved": "Entscheidung gespeichert",
  "recruiterInbox.showReviewCard": "Prüfkarte anzeigen",
  "recruiterInbox.hideReviewCard": "Prüfkarte ausblenden",
  "recruiterInbox.reviewCardTitle": "Kandidaten-Prüfkarte",
  "recruiterInbox.reviewWhyThisCandidate": "Warum dieser Kandidat",
  "recruiterInbox.reviewRequirementsMatched": "Anforderungen erfüllt",
  "recruiterInbox.reviewUncertainOrMissing": "Unsicher oder fehlende Daten",
  "recruiterInbox.reviewWhatToVerify": "Was zu prüfen ist",
  "recruiterInbox.reviewDataConfidence": "Datenvertrauen",
  "recruiterInbox.reviewRedFlags": "Rote Flaggen",
  "recruiterInbox.reviewHumanDecision": "Menschliche Entscheidung erforderlich",
  "recruiterInbox.reviewDisclaimer": "Haftungsausschluss",
  "recruiterInbox.reviewDataConfidenceHigh":
    "Hoch — Profilfelder überlappen mit der Ausschreibung an mehreren Signalen",
  "recruiterInbox.reviewDataConfidenceMedium":
    "Mittel — teilweise Überlappung; Lücken vor Terminplanung prüfen",
  "recruiterInbox.reviewDataConfidenceLow": "Niedrig — spärliche Überlappung oder unvollständiges Profil",
  "recruiterInbox.reviewDataConfidenceUnknown": "Unbekannt — unzureichende strukturierte Daten",
  "recruiterInbox.reviewNoneListed": "Keine aufgeführt",
  "recruiterInbox.dataVisibilityNote":
    "Bewerbungskontext: Kandidatennamen und Profil-Match-Daten sind sichtbar für Interview-Entscheidungen. E-Mail, Telefon und vollständiger CV-Text werden in diesem Posteingang nicht angezeigt.",
  "recruiterInbox.dataVisibilityContextLabel": "Datensichtbarkeit",
  "recruiterInbox.decisionConsoleTitle": "Entscheidungskonsole",
  "recruiterInbox.decisionConsoleHeader": "{count} Kandidaten warten auf Ihre Entscheidung",
  "recruiterInbox.decisionConsoleHeaderOne": "1 Kandidat wartet auf Ihre Entscheidung",
  "recruiterInbox.decisionConsoleSubcopy":
    "KI-gestütztes Ranking zeigt Belege — Sie entscheiden, wer ein Interview-Slot erhält.",
  "recruiterInbox.segmentAll": "Alle",
  "recruiterInbox.segmentStrongFit": "Starke Passung",
  "recruiterInbox.segmentGoodFit": "Gute Passung",
  "recruiterInbox.segmentNeedsVerification": "Prüfung nötig",
  "recruiterInbox.segmentDecided": "Entschieden",
  "recruiterInbox.statusAwaitingDecision": "Entscheidung ausstehend",
  "recruiterInbox.evidenceChipPrefix": "Beleg",
  "recruiterInbox.missingChipPrefix": "Fehlende Daten",
  "recruiterInbox.reviewCardDueDiligence": "Due-Diligence-Prüfung",
  "recruiterInbox.cardMetaLine": "{job} · {company} · #{id}",

  "recruiterCalendar.eyebrow": "Roadmap",
  "recruiterCalendar.title": "Recruiter-Kalender",
  "recruiterCalendar.lead":
    "TWINs Nordstern ist ein kurzer Kalender annahmebereiter Interviews — für Kandidaten und Recruiter. Die Recruiter-Kalenderansicht ist in diesem Pilot noch nicht live.",
  "recruiterCalendar.notLiveTitle": "In dieser Umgebung nicht live",
  "recruiterCalendar.notLiveBody":
    "Google- und Microsoft-Kalendersync auf dieser Seite ist heute nur für Kandidaten. Recruiter-Slot-Vorschläge, Team-Holds und Outlook/Teams-Integration sind auf der Roadmap — noch nicht ausgeliefert.",
  "recruiterCalendar.roadmapItem1": "Annahme-Posteingang und Match-Prüfkarte — heute live.",
  "recruiterCalendar.roadmapItem2": "Recruiter-vorgeschlagene Interview-Slots + Kalendersync — Roadmap.",
  "recruiterCalendar.roadmapItem3": "Arbeitgeber-SSO und ATS-Webhooks — nur Pilotumfang.",
  "recruiterCalendar.pilotHint":
    "Nutzen Sie den Annahme-Posteingang, um zu entscheiden, wer ein Interview-Slot erhält. Kalenderexport für Recruiter folgt nach klarem Pilot-Feedback.",
  "recruiterCalendar.linkInboxDesc": "Vorqualifizierte Warteschlange mit Passungsscore und menschlicher Annahme/Ablehnung.",
  "recruiterCalendar.linkJobsDesc": "Rollen veröffentlichen, damit künftige Matches in Ihre Warteschlange kommen.",
  "recruiterCalendar.linkStoryDesc": "Was ist live vs. Roadmap im Recruiter-Pilot?",

  "demo.pageEyebrow": "Produkt-Walkthrough",
  "demo.pageTitle": "Vom Lebenslauf zu einem Kalender, für den es sich lohnt",
  "demo.pageLead":
    "Neun Schritte der TWIN-Kandidatenreise — Ranking, Abdeckung, Feedback, ehrliche Status und Interview-Reservierungen. Alles auf dieser Seite ist synthetisch und gekennzeichnet; es werden keine Bewerbungen eingereicht und kein Live-Portal-Volumen vorgetäuscht.",
  "demo.syntheticBadge": "DEMO · BEISPIELDATEN",
  "demo.heroSampleNote": "Beispiel-Demo-Flow — Ihre Live-Empfehlungen finden Sie im Dashboard.",
  "demo.modeGuestTitle": "Gast-Walkthrough",
  "demo.modeGuestBody":
    "Die ganze Story ohne Anmeldung erkunden. Konto erstellen oder Gründer-Warteliste beitreten, wenn Sie eigenes Profil, Matches und Kalender möchten.",
  "demo.modeLoggedInTitle": "Produkt-Demo — Live-Empfehlungen im Dashboard",
  "demo.modeLoggedInBody":
    "Unten ein Beispiel-TWIN-Flow — Ranking, Feedback und Kalender auf Demodaten. Ihre persönlichen Matches, Bewerbungsstatus und Interviews live im Dashboard.",
  "demo.modeLoggedInCtaDashboard": "Zum Dashboard",
  "demo.modeLoggedInCtaMatches": "Meine Matches ansehen",
  "demo.modeLoggedInCtaProfile": "Profil und Lebenslauf prüfen",
  "demo.stepNavAria": "Demo-Abschnitte",
  "demo.stepNav1": "Pipeline",
  "demo.stepNav2": "Profil",
  "demo.stepNav3": "Abdeckung",
  "demo.stepNav4": "Top-Matches",
  "demo.stepNav5": "Feedback",
  "demo.stepNav6": "Vorbereitung",
  "demo.stepNav7": "Status",
  "demo.stepNav8": "Kalender",
  "demo.stepNav9": "Nächste Schritte",
  "demo.heroPipelineTitle": "Eine Pipeline, nicht siebzehn Tabs",
  "demo.heroPipelineBody":
    "Lebenslauf hochladen → strukturiertes Profil → bis zu 200 gerankte Rollen → Top 20 hervorgehoben → vorbereiten → ehrliche Einreichungsstatus verfolgen → Interview-Reservierungen im Kalender.",
  "demo.heroCvLabel": "Beispiel-Profilsignal",
  "demo.heroRankLabel": "Ranking-Trichter",
  "demo.heroRankHint":
    "final_score zeigt zuerst die besten Passungen; der Rest bleibt bis zu 200 in Ihrem Workspace.",
  "demo.step2Eyebrow": "Profil",
  "demo.step2Title": "Lebenslauf wird zu einem Profil, dem Recruiter vertrauen",
  "demo.step2Lead":
    "Skills, Seniority, Gehaltsuntergrenze und Standort speisen den Matcher. Im Produkt laden Sie einen Lebenslauf hoch und verfeinern das Profil — Einwilligung zuerst, GDPR ab Tag eins.",
  "demo.step2ProfileHint": "Profil öffnen, um Lebenslauf hochzuladen oder Match-Grenzen anzupassen.",
  "demo.step3Eyebrow": "Marktabdeckung",
  "demo.step3Title": "Viele Quellen, ehrliche Zahlen",
  "demo.step3Lead":
    "TWIN übernimmt schrittweise Daten von Jobbörsen und Arbeitgeberseiten. Wir nennen echte Adapter-Zahlen — keine Marketing-Fiktion über fünfzig Live-Portale.",
  "demo.coverageActive": "aktive Quell-Adapter in Produktion heute",
  "demo.coverageRoadmap": "Adapter auf der Roadmap (PL-Boards und EU-Arbeitgeber-Stacks zuerst)",
  "demo.coverageSourcesLabel": "Beispielquellen in der Registry",
  "demo.coveragePlLabel": "PL-Priorität",
  "demo.step4Eyebrow": "Ranking",
  "demo.step4Title": "Top 20 zuerst, bis zu 200 in Ihrer Pipeline",
  "demo.step4Lead":
    "Rollen mit hohem final_score erscheinen zuerst. Die breitere Liste bleibt verfügbar — annehmen, überspringen oder Passung bewerten, damit der nächste Batch Ihre Latte respektiert.",
  "demo.top20Chip": "Top 20",
  "demo.top20SectionTitle": "Top 20 (Demo-Beispiel)",
  "demo.top200SectionTitle": "Breitere Pipeline (Demo-Beispiel)",
  "demo.step5Eyebrow": "Feedback",
  "demo.step5Title": "Passung bewerten — Ranking lernt, was zu überspringen ist",
  "demo.step5Lead":
    "Jede Karte unterstützt schnelles Feedback: Bewerbungsabsicht, relevant, nicht relevant oder nicht jetzt. Gespeicherte Signale verbessern den nächsten Ranking-Batch.",
  "demo.step5Explain":
    "Auf einer Demo-Karte oben tippen, um Feedback im Produkt zu spüren. Auf dieser Seite wird nichts gespeichert — im Dashboard formen Ihre Entscheidungen den nächsten Batch.",
  "demo.feedbackToast": "Nur Demo — „{action}“ würde Ihren nächsten Ranking-Batch verfeinern.",
  "demo.step6Eyebrow": "Vorbereitung",
  "demo.step6Title": "Bewerbungsvorbereitung vor dem Absenden",
  "demo.step6Lead":
    "TWIN stellt maßgeschneiderten Pitch-Text und ein Paket zusammen, das Sie prüfen können. Automatisierung nur dort, wo Boards und Ihre Einwilligung es erlauben.",
  "demo.prep1": "Passungsscore und Listing-Kontext am Bewerbungsdatensatz",
  "demo.prep2": "Maßgeschneiderter Pitch und rollenbezogene Bullets (vor dem Senden prüfen)",
  "demo.prep3":
    "PDF-Paket bereit — manuelle Bewerbung öffnet den Arbeitgeber-Flow, wenn Automatisierung nicht unterstützt wird",
  "demo.step7Eyebrow": "Ehrliche Status",
  "demo.step7Title": "Vorbereitet, manuell, versucht, bestätigt — kein Fake „eingereicht“",
  "demo.step7Lead":
    "Jeder Status ist evidenzbasiert. Wir markieren nie „bestätigt“ ohne Spur, Bestätigung oder ATS-Signal.",
  "demo.statusPrepared": "Vorbereitet",
  "demo.statusPreparedBody": "Material bereit — Sie oder der Agent prüfen vor dem Senden.",
  "demo.statusManual": "Manuell",
  "demo.statusManualBody": "Portal braucht Ihren Klick; TWIN hat das Paket vorbereitet.",
  "demo.statusAttempted": "Versucht",
  "demo.statusAttemptedBody": "Automatisierung versucht; Ergebnis mit Grund protokolliert, wenn nicht abgeschlossen.",
  "demo.statusConfirmed": "Bestätigt",
  "demo.statusConfirmedBody": "Einreichung mit Belegen — kein Marketing-Häkchen.",
  "demo.step8Eyebrow": "Nordstern",
  "demo.step8Title": "Kalender annahmebereiter Momente",
  "demo.step8Lead":
    "Nach der Abwesenheit zu einer kurzen Liste lohnender Interviews zurück — annehmen, ablehnen oder verschieben — nicht zu zufälligem Posteingangs-Spam.",
  "demo.calendarHoldTitle": "Interview-Reservierung (Demo)",
  "demo.calendarHint":
    "Google Calendar heute; Microsoft 365 und ICS-Abo auf der Roadmap — derselbe Nordstern für jeden Stack.",
  "demo.ctaSectionTitle": "Weiter in TWIN",
  "demo.ctaSectionLead": "Dieser Walkthrough ist die Karte; Ihr Konto ist das Territorium.",
  "demo.ctaDashboard": "Dashboard öffnen",
  "demo.ctaProfile": "Ihr Profil",
  "demo.ctaMatches": "Top-Matches",
  "demo.ctaMatchesGuest": "Matches nach Registrierung ansehen",
  "demo.ctaCalendar": "Kalender-Einstellungen",
  "demo.ctaFounding": "Gründungsmitglied · First 1.000",
  "demo.ctaWishlist": "Gründer-Warteliste beitreten",
  "demo.ctaRegister": "Kostenloses Konto erstellen",
  "demo.cvSkills": "Fähigkeiten",
  "demo.cvTitles": "Zieltitel",
  "demo.cvExperience": "Erfahrung",
  "demo.cvYears": "Jahre",
  "demo.liveEyebrow": "Produktvorschau",
  "demo.liveTitle": "Gerankte Rollen (Demo-Beispiel)",
  "demo.liveLead": "Fiktive Unternehmen und Scores für Marketing-Home — nicht Ihre Live-Kontodaten.",
  "demo.liveLoading": "Demo-Beispiel wird geladen…",
  "demo.liveOffline": "Demo-Beispiel nicht verfügbar",
  "demo.liveOfflineHint": "Der Walkthrough unter /demo funktioniert immer mit eingebauten synthetischen Karten.",
  "demo.signUpToApply": "Warteliste beitreten",
  "demo.fullExperienceCta": "Vollständiger Produkt-Walkthrough",
  "demo.footerNote":
    "GDPR: Echte Konten erfordern ausdrückliche Einwilligung bei der Registrierung. Diese Seite nutzt nur fiktive, als Demo/synthetisch gekennzeichnete Daten — keine Live-Einreichungen.",

  "interactiveDemo.pageEyebrow": "Interaktive Simulation",
  "interactiveDemo.pageTitle": "TWIN Schritt für Schritt — vom Profil zum Kalender",
  "interactiveDemo.pageLead":
    "Acht Schritte auf synthetischen Daten: Profilsignal, Marktscan, gerankte Matches, Transparenz, Recruiter-Prüfung, Annehmen oder Ablehnen, Kalender-Reservierung, dann Ihr nächster Schritt. Nichts auf dieser Seite reicht Bewerbungen ein oder nutzt Live-Konten.",
  "interactiveDemo.simulationLabel": "SIMULATION · NUR BEISPIELDATEN — nicht Ihr Live-Dashboard",
  "interactiveDemo.progressAria": "Walkthrough-Fortschritt",
  "interactiveDemo.autoplay": "Schritte automatisch abspielen",
  "interactiveDemo.back": "Zurück",
  "interactiveDemo.next": "Weiter",
  "interactiveDemo.step1Title": "Profil aus Lebenslauf",
  "interactiveDemo.step1Lead": "Skills, Titel und Grenzen werden zu strukturierten Signalen, denen Recruiter vertrauen.",
  "interactiveDemo.step2Title": "Job-Scan",
  "interactiveDemo.step2Lead":
    "Jobbörsen und Arbeitgeberseiten speisen den Matcher — ehrliche Adapter-Zahlen, keine Marketing-Fiktion.",
  "interactiveDemo.step3Title": "Gerankte Matches",
  "interactiveDemo.step3Lead":
    "Rollen mit hohem final_score zuerst; die breitere Pipeline bleibt bis zu 200 verfügbar.",
  "interactiveDemo.step4Title": "Transparenz",
  "interactiveDemo.step4Lead":
    "Jeder Score und Status ist erklärbar — keine Black-Box-„Magic-Match“-Behauptungen.",
  "interactiveDemo.step5Title": "Recruiter-Posteingang & Prüfkarte",
  "interactiveDemo.step5Lead":
    "Recruiter sehen Match-Kontext und eine strukturierte Prüfkarte — menschliche Entscheidung erforderlich.",
  "interactiveDemo.step6Title": "Annehmen oder ablehnen",
  "interactiveDemo.step6Lead":
    "Ein-Klick-Annahme plant den nächsten Schritt; Ablehnung hält Rauschen aus dem Kalender.",
  "interactiveDemo.step7Title": "Kalender-Reservierung (Simulation)",
  "interactiveDemo.step7Lead":
    "Interview-Reservierungen landen im Kalender — nur Simulation auf dieser Seite, keine Live-Buchung.",
  "interactiveDemo.step8Title": "Ihr nächster Schritt",
  "interactiveDemo.step8Lead":
    "Konto erstellen, Gründer-Warteliste beitreten oder Kandidaten-Spuren erkunden, wenn bereit.",
  "interactiveDemo.profileHint":
    "Lebenslauf hochladen und Match-Grenzen im echten Produkt anpassen — Einwilligung zuerst.",
  "interactiveDemo.transparencyBody":
    "Match-Scores nennen Überlappung mit der Ausschreibung und Profilfelder. Bewerbungsstatus bleiben evidenzbasiert: vorbereitet, manuell, versucht, bestätigt — nie ein Fake-„Eingereicht“-Häkchen.",
  "interactiveDemo.calendarSimulation":
    "Nur Simulation — Google-Calendar-Sync ist für Kandidaten im Produkt live; diese Reservierung ist fiktive Demodaten.",
  "interactiveDemo.decisionToast": "Nur Demo — „{action}“ würde die Recruiter-Pipeline aktualisieren.",
  "interactiveDemo.acceptedOutcome":
    "Für Interview angenommen (Demo) — Kalender-Reservierung erscheint im nächsten Schritt.",
  "interactiveDemo.declinedOutcome":
    "Abgelehnt (Demo) — Kandidat bleibt außerhalb des Annahme-Kalenders.",

  "persona.sectionCapabilities": "Funktionen",
  "persona.sectionPricing": "Pakete & Preise",
  "persona.sectionLogistics": "Gut zu wissen",
  "persona.talentPoolTitle": "Talentpool-Vorschau",
  "persona.talentPoolLead":
    "Nur anonyme Profile: Skills, Validierungs-Badge und Passungsscore. Keine Namen, E-Mails oder CV-Texte hier.",
  "persona.talentPoolJobTitle": "Beispiel-Rollentitel",
  "persona.talentPoolJobTitlePlaceholder": "z. B. Senior Account Executive",
  "persona.talentPoolSkills": "Erforderliche Skills (kommagetrennt)",
  "persona.talentPoolSkillsPlaceholder": "z. B. Sales, CRM, B2B",
  "persona.talentPoolValidated": "Validiert",
  "persona.talentPoolNoSkills": "Keine Skills aufgeführt",
  "persona.talentPoolEmpty": "Noch keine Kandidaten im Pool. Nach Opt-in der Nutzer erneut prüfen.",
  "persona.talentPoolLoadMore": "Mehr laden",
  "persona.growthRoadmapFootnote":
    "Lieferreihenfolge kann sich ändern; manche Items sind tier-gated beim Ship. Sagen Sie uns, was Sie wöchentlich öffnen würden — das steuert die Roadmap.",

  "ux.flowNavAria": "Ihre Workspace-Schritte",
  "ux.flowStepDashboard": "Übersicht",
  "ux.flowStepProfile": "Profil",
  "ux.flowStepMatches": "Passungen",
  "ux.flowStepActions": "Bewerbungen",
  "ux.profileStepEyebrow": "Schritt 2 · Profil",
  "ux.profileMissingLead": "Profil ergänzen, damit TWIN Jobs für Sie ranken kann.",
  "ux.profileIncompleteLead": "Skills und Ziel-Jobtitel ergänzen, damit Matches laufen können.",
  "ux.profileIncompleteCta": "Profil vervollständigen",
  "ux.jobsEmptyMessage": "Keine Einträge passen zu Ihren Filtern — Filter zurücksetzen oder Feed aktualisieren.",
  "ux.jobsEmptyCta": "Filter zurücksetzen",
  "ux.jobsEmptyNoProfileMessage": "Zuerst Profil einrichten, dann Job-Feed öffnen.",
  "ux.jobsEmptyNoProfileCta": "Profil einrichten",
  "ux.matchesEmptyMessage":
    "Noch keine Rolle hat die Qualitätslatte erreicht. Skills, Ziel-Jobtitel und Standort im Profil ergänzen und erneut prüfen.",
  "ux.matchesEmptyCta": "Profil verbessern",
  "ux.guidedEmptyMatchesTitle": "Noch keine starken Matches",
  "ux.guidedEmptyMatchesStep1": "Profil mit Zieltiteln und Kern-Skills vervollständigen.",
  "ux.guidedEmptyMatchesStep2": "Standort und Seniority setzen, damit Scoring Rollen ranken kann.",
  "ux.guidedEmptyMatchesStep3": "Nach dem nächsten Matching-Lauf erneut prüfen.",
  "ux.guidedEmptyApplicationsTitle": "Noch keine verfolgten Bewerbungen",
  "ux.guidedEmptyApplicationsMessage": "Ihre Pipeline startet, wenn Sie eine gerankte Rolle speichern oder bewerben.",
  "ux.guidedEmptyApplicationsStep1": "Starke Passungen im Dashboard prüfen.",
  "ux.guidedEmptyApplicationsStep2": "Rolle speichern oder „Bewerben“ öffnen, um Tracking zu starten.",
  "ux.guidedEmptyApplicationsStep3": "Hierher zurückkehren für Status und Transparenz.",
  "ux.guidedEmptyApplicationsCta": "Matches prüfen",
  "ux.guidedEmptyCalendarTitle": "Kalender nicht verbunden",
  "ux.guidedEmptyCalendarMessage":
    "Kalender verbinden, damit Interview-Reservierungen dort landen, wo Sie planen.",
  "ux.guidedEmptyCalendarStep1": "Google oder Microsoft auf diesem Streifen wählen.",
  "ux.guidedEmptyCalendarStep2": "Lesezugriff für Busy Times genehmigen (Schreiben, wo konfiguriert).",
  "ux.guidedEmptyCalendarStep3": "Angenommene Interview-Slots als ICS oder WebCal exportierbar.",
  "ux.guidedEmptyCalendarCta": "Kalender verbinden",
  "ux.guidedEmptyInboxTitle": "Entscheidungs-Warteschlange laden",
  "ux.guidedEmptyInboxStep1": "Zugangscode aus Ihrer TWIN-Pilot-Einladung einfügen.",
  "ux.guidedEmptyInboxStep2": "Company-Slug wählen und Warteschlange laden.",
  "ux.guidedEmptyInboxStep3": "Erste Karte prüfen — per Tipp annehmen oder ablehnen.",
  "ux.guidedEmptyInboxFilterTitle": "Keine Zeilen in diesem Segment",
  "ux.guidedEmptyInboxFilterMessage": "Anderes Segment-Tab probieren oder Suchfilter löschen.",
  "ux.guidedEmptyInboxFilterCta": "Alle Kandidaten anzeigen",
  "ux.guidedEmptyRecruiterJobsTitle": "Noch keine Stellen veröffentlicht",
  "ux.guidedEmptyRecruiterJobsMessage":
    "Rolle veröffentlichen, damit künftige Matches in Ihre Posteingangs-Warteschlange kommen.",
  "ux.guidedEmptyRecruiterJobsStep1": "Titel, Standort und Anforderungen hinzufügen.",
  "ux.guidedEmptyRecruiterJobsStep2": "Unter Ihrem Company-Slug veröffentlichen.",
  "ux.guidedEmptyRecruiterJobsStep3": "Zum Posteingang zurück, wenn Kandidaten sich bewerben.",
  "ux.guidedEmptyRecruiterJobsCta": "Stelle veröffentlichen",
  "ux.apiErrorGeneric": "Etwas ist schiefgelaufen. Bitte gleich erneut versuchen.",
  "ux.apiErrorSession": "Ihre Sitzung ist abgelaufen — bitte erneut anmelden.",
  "ux.apiErrorNetwork":
    "Server nicht erreichbar. Verbindung prüfen und erneut versuchen.",
};

function main() {
  const premiumEn = extractPremiumTree(en as unknown as Record<string, string | Record<string, string>>);
  const flatEn = flattenStrings(premiumEn);
  const flatDe: Record<string, string> = {};
  const missing: string[] = [];

  for (const [path, source] of Object.entries(flatEn)) {
    if (DE[path]) {
      flatDe[path] = DE[path];
    } else {
      missing.push(path);
      flatDe[path] = source;
    }
  }

  if (missing.length > 0) {
    console.error("Missing DE translations:", missing.join(", "));
    process.exit(1);
  }

  const nested = unflattenStrings(flatDe);
  writeFileSync(
    OUT,
    `/** Premium product overlay — de (curated). Review trust copy before ship. */\nexport const premiumDeOverlay: Record<string, unknown> = ${JSON.stringify(nested, null, 2)};\n`,
    "utf8",
  );
  console.log(`Wrote ${OUT} (${Object.keys(flatDe).length} keys)`);
}

main();
