#!/usr/bin/env python3
"""Generate premium product overlays for es–ja from English source."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
EN_JSON = Path("/tmp/premium-en.json")
OUT_DIR = ROOT / "src/lib/overlays/premium/generated"

LOCALES = {
    "es": "es",
    "it": "it",
    "fr": "fr",
    "de": "de",
    "zh": "zh-CN",
    "ar": "ar",
    "ja": "ja",
}

TOKENS = re.compile(
    r"(\{[^}]+\}|TWIN|ICS|WebCal|GDPR|OAuth|API|PDF|CSV|XLSX|Google|Microsoft|"
    r"LinkedIn|GitHub|Apple|Zoom|Teams|Meet|CalDAV|B2B|ROI|ATS|CRM|SDR|PLN|"
    r"Authologic|Railway|Vercel|Redis|Celery|ANTHROPIC_API_KEY|NEXT_PUBLIC_API_URL|"
    r"TWIN_API_BASE_URL|CORS_ORIGINS|SCRAPE_ENABLED_BOARD_IDS|LINKEDIN_|BETA_WAITLIST_CAP)"
)

TRUST_OVERRIDES: dict[str, dict[str, str]] = {
    "es": {
        "dashboard.applicationTransparencyAutomation": "La autoaplicación está en pausa. La aplicación delegada no está activa.",
        "dashboard.applicationTransparencyImportant": "TWIN no toma decisiones de contratación. La clasificación asistida por IA organiza señales. El reclutador decide.",
        "home.feature6Title": "Automatización por fases (en pausa hoy)",
        "home.feature6Line": "Prepara paquetes de candidatura para revisión — la autoaplicación sigue en pausa en producción hasta que las condiciones lo permitan.",
        "recruiterInbox.humanDecisionNote": "Clasificación asistida por IA. Se requiere decisión del reclutador.",
        "recruiterInbox.reviewHumanDecision": "Se requiere decisión humana",
        "recruiterInbox.decisionConsoleSubcopy": "La clasificación asistida por IA muestra evidencia — usted acepta o rechaza quién obtiene una entrevista.",
        "interactiveDemo.simulationLabel": "SIMULACIÓN · SOLO DATOS DE MUESTRA — no es su panel en vivo",
        "dashboard.calendarConfiguredHint": "Calendario conectado: las reservas de entrevistas pueden sincronizarse donde OAuth permita escritura.",
    },
    "de": {
        "dashboard.applicationTransparencyAutomation": "Auto-Apply ist pausiert. Delegierte Bewerbung ist nicht live.",
        "dashboard.applicationTransparencyImportant": "TWIN trifft keine Einstellungsentscheidungen. KI-gestütztes Ranking ordnet Signale. Der Recruiter entscheidet.",
        "home.feature6Title": "Phasenweise Automatisierung (heute pausiert)",
        "home.feature6Line": "Bewerbungspakete zur Prüfung vorbereiten — Auto-Apply bleibt in Produktion pausiert, bis Freigaben es erlauben.",
        "recruiterInbox.humanDecisionNote": "KI-gestütztes Ranking. Recruiter-Entscheidung erforderlich.",
        "recruiterInbox.reviewHumanDecision": "Menschliche Entscheidung erforderlich",
        "recruiterInbox.decisionConsoleSubcopy": "KI-gestütztes Ranking zeigt Belege — Sie entscheiden, wer ein Interview-Slot erhält.",
        "dashboard.calendarConfiguredHint": "Kalender verbunden — Interview-Termine können synchronisiert werden, wo OAuth-Schreibzugriff aktiv ist.",
    },
    "fr": {
        "dashboard.applicationTransparencyAutomation": "La candidature automatique est en pause. La candidature déléguée n’est pas active.",
        "dashboard.applicationTransparencyImportant": "TWIN ne prend pas les décisions d’embauche. Le classement assisté par IA organise les signaux. Le recruteur décide.",
        "home.feature6Title": "Automatisation par phases (en pause aujourd’hui)",
        "home.feature6Line": "Préparez des dossiers de candidature pour relecture — l’auto-candidature reste en pause en production jusqu’aux validations.",
        "recruiterInbox.humanDecisionNote": "Classement assisté par IA. Décision du recruteur requise.",
        "recruiterInbox.reviewHumanDecision": "Décision humaine requise",
        "recruiterInbox.decisionConsoleSubcopy": "Le classement assisté par IA expose les preuves — vous acceptez ou refusez qui obtient un créneau d’entretien.",
        "dashboard.calendarConfiguredHint": "Calendrier connecté — les créneaux d’entretien peuvent se synchroniser lorsque l’OAuth autorise l’écriture.",
    },
    "it": {
        "dashboard.applicationTransparencyAutomation": "L’auto-candidatura è in pausa. La candidatura delegata non è attiva.",
        "dashboard.applicationTransparencyImportant": "TWIN non prende decisioni di assunzione. Il ranking assistito dall’IA organizza i segnali. Decide il recruiter.",
        "home.feature6Title": "Automazione a fasi (in pausa oggi)",
        "home.feature6Line": "Prepara pacchetti candidatura per revisione — l’auto-apply resta in pausa in produzione finché i gate non lo consentono.",
        "recruiterInbox.humanDecisionNote": "Ranking assistito dall’IA. Decisione del recruiter richiesta.",
        "recruiterInbox.reviewHumanDecision": "Decisione umana richiesta",
        "recruiterInbox.decisionConsoleSubcopy": "Il ranking assistito dall’IA mostra le evidenze — accetti o rifiuti chi ottiene un colloquio.",
        "dashboard.calendarConfiguredHint": "Calendario collegato: le prenotazioni colloquio possono sincronizzarsi dove OAuth consente la scrittura.",
    },
    "zh": {
        "dashboard.applicationTransparencyAutomation": "自动投递已暂停。委托投递尚未上线。",
        "dashboard.applicationTransparencyImportant": "TWIN 不做录用决定。AI 辅助排序用于整理信号，招聘方做决定。",
        "home.feature6Title": "分阶段自动化（当前暂停）",
        "home.feature6Line": "准备申请包供审阅 — 生产环境自动投递保持暂停，直至闸门允许。",
        "recruiterInbox.humanDecisionNote": "AI 辅助排序。需招聘方决策。",
        "recruiterInbox.reviewHumanDecision": "需人工决策",
        "recruiterInbox.decisionConsoleSubcopy": "AI 辅助排序展示依据 — 由您决定谁获得面试时段。",
        "dashboard.calendarConfiguredHint": "日历已连接 — 在 OAuth 写入权限已启用时可同步面试预留时段。",
    },
    "ar": {
        "dashboard.applicationTransparencyAutomation": "التقديم التلقائي متوقف. التقديم المفوَّض غير مفعّل.",
        "dashboard.applicationTransparencyImportant": "TWIN لا يتخذ قرارات التوظيف. التصنيف بمساعدة الذكاء الاصطناعي ينظّم الإشارات. القرار للموظّف.",
        "home.feature6Title": "أتمتة على مراحل (متوقفة اليوم)",
        "home.feature6Line": "جهّز حزم التقديم للمراجعة — التقديم التلقائي متوقف في الإنتاج حتى تسمح القيود.",
        "recruiterInbox.humanDecisionNote": "تصنيف بمساعدة الذكاء الاصطناعي. قرار الموظّف مطلوب.",
        "recruiterInbox.reviewHumanDecision": "قرار بشري مطلوب",
        "recruiterInbox.decisionConsoleSubcopy": "يعرض التصنيف بمساعدة الذكاء الاصطناعي الأدلة — تقبل أو ترفض من يحصل على موعد مقابلة.",
        "dashboard.calendarConfiguredHint": "تم ربط التقويم — يمكن مزامنة حجوزات المقابلات حيث يُفعَّل وصول الكتابة عبر OAuth.",
    },
    "ja": {
        "dashboard.applicationTransparencyAutomation": "自動応募は一時停止中です。委任応募は未稼働です。",
        "dashboard.applicationTransparencyImportant": "TWIN は採用決定をしません。AI 支援のランキングはシグナルを整理します。決定はリクルーターが行います。",
        "home.feature6Title": "段階的オートメーション（本日は一時停止）",
        "home.feature6Line": "応募パッケージをレビュー用に準備 — 本番の自動応募はゲートが許可するまで一時停止のままです。",
        "recruiterInbox.humanDecisionNote": "AI 支援ランキング。リクルーターの判断が必要です。",
        "recruiterInbox.reviewHumanDecision": "人の判断が必要",
        "recruiterInbox.decisionConsoleSubcopy": "AI 支援ランキングが根拠を示します — 面接枠を誰に渡すかはあなたが承認または辞退します。",
        "dashboard.calendarConfiguredHint": "カレンダー接続済み — OAuth の書き込みが有効な場合、面接ホールドを同期できます。",
    },
}


def flatten(obj: dict, prefix: str = "") -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in obj.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, str):
            out[path] = value
        elif isinstance(value, dict):
            out.update(flatten(value, path))
    return out


def unflatten(flat: dict[str, str]) -> dict:
    out: dict = {}
    for path, value in flat.items():
        parts = path.split(".")
        cur = out
        for part in parts[:-1]:
            cur = cur.setdefault(part, {})
        cur[parts[-1]] = value
    return out


def shield(text: str) -> tuple[str, dict[str, str]]:
    mapping: dict[str, str] = {}

    def repl(match: re.Match[str]) -> str:
        token = f"__TOK{len(mapping)}__"
        mapping[token] = match.group(0)
        return token

    return TOKENS.sub(repl, text), mapping


def unshield(text: str, mapping: dict[str, str]) -> str:
    for token, original in mapping.items():
        text = text.replace(token, original)
    return text


def translate_text(text: str, target: str, attempt: int = 0) -> str:
    shielded, mapping = shield(text)
    try:
        out = GoogleTranslator(source="en", target=target).translate(shielded[:4500])
        return unshield(out or text, mapping)
    except Exception:
        if attempt < 3:
            time.sleep(1.5 * (attempt + 1))
            return translate_text(text, target, attempt + 1)
        raise


def main() -> None:
    premium_en = json.loads(EN_JSON.read_text())
    premium_en["dashboard"]["calendarConfiguredHint"] = (
        "Calendar connected — interview holds can sync where OAuth write access is enabled."
    )
    flat_en = flatten(premium_en)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    only = __import__("sys").argv[1] if len(__import__("sys").argv) > 1 else None

    for code, google_to in LOCALES.items():
        if only and code != only:
            continue
        flat: dict[str, str] = {}
        overrides = TRUST_OVERRIDES.get(code, {})
        print(f"Translating {code} ({len(flat_en)} strings)…")
        for i, (path, source) in enumerate(sorted(flat_en.items())):
            if path in overrides:
                flat[path] = overrides[path]
                continue
            try:
                flat[path] = translate_text(source, google_to)
            except Exception as err:
                print(f"  fail {path}: {err}")
                flat[path] = source
            if i % 25 == 0:
                time.sleep(0.4)
            else:
                time.sleep(0.15)
        nested = unflatten(flat)
        export = f"premium{code[0].upper()}{code[1:]}Overlay"
        out = OUT_DIR / f"{code}.ts"
        out.write_text(
            f"/** Premium product overlay — {code} (generated). */\n"
            f"export const {export}: Record<string, unknown> = "
            f"{json.dumps(nested, ensure_ascii=False, indent=2)};\n",
            encoding="utf-8",
        )
        print(f"Wrote {out}")


if __name__ == "__main__":
    main()
