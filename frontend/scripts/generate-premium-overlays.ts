/**
 * One-shot generator: premium product overlays for es/it/fr/de/zh/ar/ja.
 * Run: npx tsx scripts/generate-premium-overlays.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { translateViaMyMemory } from "./translate-via-mymemory";

import { en } from "../src/lib/i18n";
import { extractPremiumTree } from "../src/lib/overlays/premium/extract-premium-tree";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src/lib/overlays/premium/generated");

type LocaleCode = "es" | "it" | "fr" | "de" | "zh" | "ar" | "ja";

const TARGETS: { code: LocaleCode; googleTo: string }[] = [
  { code: "es", googleTo: "es" },
  { code: "it", googleTo: "it" },
  { code: "fr", googleTo: "fr" },
  { code: "de", googleTo: "de" },
  { code: "zh", googleTo: "zh-CN" },
  { code: "ar", googleTo: "ar" },
  { code: "ja", googleTo: "ja" },
];

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
      if (!(part in current) || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]!] = value;
  }
  return out;
}

/** Preserve placeholders and product tokens during machine translation. */
function shield(text: string): { shielded: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let i = 0;
  const shielded = text.replace(/\{[^}]+\}|TWIN|ICS|WebCal|GDPR|OAuth|API|PDF|CSV|XLSX|Google|Microsoft|LinkedIn|GitHub|Apple|Zoom|Teams|Meet|CalDAV|B2B|ROI|ATS|CRM|SDR|PLN|Authologic|Railway|Vercel|Redis|Celery|ANTHROPIC_API_KEY|NEXT_PUBLIC_API_URL|TWIN_API_BASE_URL|CORS_ORIGINS|SCRAPE_ENABLED_BOARD_IDS|LINKEDIN_|BETA_WAITLIST_CAP/g, (m) => {
    const token = `__TOK${i++}__`;
    map.set(token, m);
    return token;
  });
  return { shielded, map };
}

function unshield(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [token, original] of map) {
    out = out.replaceAll(token, original);
  }
  return out;
}

const CALENDAR_HINTS: Record<LocaleCode, string> = {
  es: "Calendario conectado: las reservas de entrevistas pueden sincronizarse donde OAuth permita escritura.",
  it: "Calendario collegato: le prenotazioni colloquio possono sincronizzarsi dove OAuth consente la scrittura.",
  fr: "Calendrier connecté — les créneaux d’entretien peuvent se synchroniser lorsque l’OAuth autorise l’écriture.",
  de: "Kalender verbunden — Interview-Termine können synchronisiert werden, wo OAuth-Schreibzugriff aktiv ist.",
  zh: "日历已连接 — 在 OAuth 写入权限已启用时可同步面试预留时段。",
  ar: "تم ربط التقويم — يمكن مزامنة حجوزات المقابلات حيث يُفعَّل وصول الكتابة عبر OAuth.",
  ja: "カレンダー接続済み — OAuth の書き込みが有効な場合、面接ホールドを同期できます。",
};

const TRUST_OVERRIDES: Partial<Record<LocaleCode, Record<string, string>>> = {
  de: {
    "dashboard.applicationTransparencyAutomation":
      "Auto-Apply ist pausiert. Delegierte Bewerbung ist nicht live.",
    "dashboard.applicationTransparencyImportant":
      "TWIN trifft keine Einstellungsentscheidungen. KI-gestütztes Ranking ordnet Signale. Der Recruiter entscheidet.",
    "home.feature6Title": "Phasenweise Automatisierung (heute pausiert)",
    "home.feature6Line":
      "Bewerbungspakete zur Prüfung vorbereiten — Auto-Apply bleibt in Produktion pausiert, bis Freigaben es erlauben.",
    "recruiterInbox.humanDecisionNote": "KI-gestütztes Ranking. Recruiter-Entscheidung erforderlich.",
    "recruiterInbox.reviewHumanDecision": "Menschliche Entscheidung erforderlich",
    "recruiterInbox.decisionConsoleSubcopy":
      "KI-gestütztes Ranking zeigt Belege — Sie entscheiden, wer ein Interview-Slot erhält.",
    "dashboard.calendarConfiguredHint": CALENDAR_HINTS.de,
  },
  fr: {
    "dashboard.applicationTransparencyAutomation":
      "La candidature automatique est en pause. La candidature déléguée n’est pas active.",
    "dashboard.applicationTransparencyImportant":
      "TWIN ne prend pas les décisions d’embauche. Le classement assisté par IA organise les signaux. Le recruteur décide.",
    "home.feature6Title": "Automatisation par phases (en pause aujourd’hui)",
    "home.feature6Line":
      "Préparez des dossiers de candidature pour relecture — l’auto-candidature reste en pause en production jusqu’aux validations.",
    "recruiterInbox.humanDecisionNote": "Classement assisté par IA. Décision du recruteur requise.",
    "recruiterInbox.reviewHumanDecision": "Décision humaine requise",
    "recruiterInbox.decisionConsoleSubcopy":
      "Le classement assisté par IA expose les preuves — vous acceptez ou refusez qui obtient un créneau d’entretien.",
    "dashboard.calendarConfiguredHint": CALENDAR_HINTS.fr,
  },
  it: {
    "dashboard.applicationTransparencyAutomation":
      "L’auto-candidatura è in pausa. La candidatura delegata non è attiva.",
    "dashboard.applicationTransparencyImportant":
      "TWIN non prende decisioni di assunzione. Il ranking assistito dall’IA organizza i segnali. Decide il recruiter.",
    "home.feature6Title": "Automazione a fasi (in pausa oggi)",
    "home.feature6Line":
      "Prepara pacchetti candidatura per revisione — l’auto-apply resta in pausa in produzione finché i gate non lo consentono.",
    "recruiterInbox.humanDecisionNote": "Ranking assistito dall’IA. Decisione del recruiter richiesta.",
    "recruiterInbox.reviewHumanDecision": "Decisione umana richiesta",
    "recruiterInbox.decisionConsoleSubcopy":
      "Il ranking assistito dall’IA mostra le evidenze — accetti o rifiuti chi ottiene un colloquio.",
    "dashboard.calendarConfiguredHint": CALENDAR_HINTS.it,
  },
  zh: {
    "dashboard.applicationTransparencyAutomation": "自动投递已暂停。委托投递尚未上线。",
    "dashboard.applicationTransparencyImportant":
      "TWIN 不做录用决定。AI 辅助排序用于整理信号，招聘方做决定。",
    "home.feature6Title": "分阶段自动化（当前暂停）",
    "home.feature6Line": "准备申请包供审阅 — 生产环境自动投递保持暂停，直至闸门允许。",
    "recruiterInbox.humanDecisionNote": "AI 辅助排序。需招聘方决策。",
    "recruiterInbox.reviewHumanDecision": "需人工决策",
    "recruiterInbox.decisionConsoleSubcopy": "AI 辅助排序展示依据 — 由您决定谁获得面试时段。",
    "dashboard.calendarConfiguredHint": CALENDAR_HINTS.zh,
  },
  ar: {
    "dashboard.applicationTransparencyAutomation": "التقديم التلقائي متوقف. التقديم المفوَّض غير مفعّل.",
    "dashboard.applicationTransparencyImportant":
      "TWIN لا يتخذ قرارات التوظيف. التصنيف بمساعدة الذكاء الاصطناعي ينظّم الإشارات. القرار للموظّف.",
    "home.feature6Title": "أتمتة على مراحل (متوقفة اليوم)",
    "home.feature6Line": "جهّز حزم التقديم للمراجعة — التقديم التلقائي متوقف في الإنتاج حتى تسمح القيود.",
    "recruiterInbox.humanDecisionNote": "تصنيف بمساعدة الذكاء الاصطناعي. قرار الموظّف مطلوب.",
    "recruiterInbox.reviewHumanDecision": "قرار بشري مطلوب",
    "recruiterInbox.decisionConsoleSubcopy":
      "يعرض التصنيف بمساعدة الذكاء الاصطناعي الأدلة — تقبل أو ترفض من يحصل على موعد مقابلة.",
    "dashboard.calendarConfiguredHint": CALENDAR_HINTS.ar,
  },
  ja: {
    "dashboard.applicationTransparencyAutomation": "自動応募は一時停止中です。委任応募は未稼働です。",
    "dashboard.applicationTransparencyImportant":
      "TWIN は採用決定をしません。AI 支援のランキングはシグナルを整理します。決定はリクルーターが行います。",
    "home.feature6Title": "段階的オートメーション（本日は一時停止）",
    "home.feature6Line":
      "応募パッケージをレビュー用に準備 — 本番の自動応募はゲートが許可するまで一時停止のままです。",
    "recruiterInbox.humanDecisionNote": "AI 支援ランキング。リクルーターの判断が必要です。",
    "recruiterInbox.reviewHumanDecision": "人の判断が必要",
    "recruiterInbox.decisionConsoleSubcopy":
      "AI 支援ランキングが根拠を示します — 面接枠を誰に渡すかはあなたが承認または辞退します。",
    "dashboard.calendarConfiguredHint": CALENDAR_HINTS.ja,
  },
  es: {
    "dashboard.applicationTransparencyAutomation":
      "La autoaplicación está en pausa. La aplicación delegada no está activa.",
    "dashboard.applicationTransparencyImportant":
      "TWIN no toma decisiones de contratación. La clasificación asistida por IA organiza señales. El reclutador decide.",
    "home.feature6Title": "Automatización por fases (en pausa hoy)",
    "home.feature6Line":
      "Prepara paquetes de candidatura para revisión — la autoaplicación sigue en pausa en producción hasta que las condiciones lo permitan.",
    "recruiterInbox.humanDecisionNote": "Clasificación asistida por IA. Se requiere decisión del reclutador.",
    "recruiterInbox.reviewHumanDecision": "Se requiere decisión humana",
    "recruiterInbox.decisionConsoleSubcopy":
      "La clasificación asistida por IA muestra evidencia — usted acepta o rechaza quién obtiene una entrevista.",
    "interactiveDemo.pageLead":
      "Ocho pasos con datos sintéticos: señal de perfil, escaneo del mercado, coincidencias ordenadas, transparencia, revisión del reclutador, aceptar o rechazar, reserva en calendario y su siguiente movimiento. Nada en esta página envía candidaturas ni usa cuentas en vivo.",
    "interactiveDemo.simulationLabel": "SIMULACIÓN · SOLO DATOS DE MUESTRA — no es su panel en vivo",
    "dashboard.calendarConfiguredHint": CALENDAR_HINTS.es,
  },
};

async function translateText(text: string, to: string): Promise<string> {
  const { shielded, map } = shield(text);
  const mm = await translateViaMyMemory(shielded, to);
  return unshield(mm, map);
}

async function main() {
  const onlyLocale = process.argv[2] as LocaleCode | undefined;
  const premiumEn = extractPremiumTree(en as unknown as Record<string, string | Record<string, string>>);
  const flatEn = flattenStrings(premiumEn);
  const paths = Object.keys(flatEn).sort();

  mkdirSync(OUT_DIR, { recursive: true });

  const targets = onlyLocale ? TARGETS.filter((t) => t.code === onlyLocale) : TARGETS;
  if (onlyLocale && targets.length === 0) {
    throw new Error(`Unknown locale: ${onlyLocale}`);
  }

  for (const { code, googleTo } of targets) {
    const flat: Record<string, string> = {};
    const existingPath = join(OUT_DIR, `${code}.ts`);
    let existingFlat: Record<string, string> = {};
    try {
      const mod = await import(existingPath);
      const key = `premium${code.charAt(0).toUpperCase()}${code.slice(1)}Overlay`;
      existingFlat = flattenStrings(mod[key] as Record<string, unknown>);
    } catch {
      /* fresh locale */
    }

    const todo = paths.filter((path) => {
      const source = flatEn[path]!;
      const prev = existingFlat[path];
      return !prev || prev === source;
    });

    console.log(`Translating ${code} (${todo.length}/${paths.length} pending)…`);
    for (const path of paths) {
      const source = flatEn[path]!;
      const prev = existingFlat[path];
      if (prev && prev !== source) {
        flat[path] = prev;
        continue;
      }
      try {
        flat[path] = await translateText(source, googleTo);
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        console.error(`Failed ${path}:`, err);
        flat[path] = prev ?? source;
      }
    }
    const overrides = TRUST_OVERRIDES[code];
    if (overrides) {
      for (const [path, value] of Object.entries(overrides)) {
        flat[path] = value;
      }
    }
    const nested = unflattenStrings(flat);
    const file = join(OUT_DIR, `${code}.ts`);
    writeFileSync(
      file,
      `/** Auto-generated premium product overlay — ${code}. Review trust copy before ship. */\nexport const premium${code.charAt(0).toUpperCase()}${code.slice(1)}Overlay: Record<string, unknown> = ${JSON.stringify(nested, null, 2)};\n`,
      "utf8",
    );
    console.log(`Wrote ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
