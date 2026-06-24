import type { Locale } from "@/lib/i18n";

type PersonaHubRecruiterOverlay = {
  companyTalentPool?: Record<string, string>;
  recruiterTrustReviewQueue?: Record<string, string>;
  recruiterOperationalWorkQueue?: Record<string, string>;
  recruiterDailyCockpit?: Record<string, string>;
};

const es: PersonaHubRecruiterOverlay = {
  companyTalentPool: {
    title: "Memoria de talento de la empresa",
    lead:
      "Vista estructurada de candidatos que su organización ya conoce — para futuras contrataciones y Talent Radar. Datos internos primero; revisión del reclutador antes de cualquier contacto.",
    navLink: "Memoria de talento",
    chipNoOutreach: "Sin contacto saliente automático",
    chipAtsPlanned: "Sincronización ATS planificada",
    trustCopy:
      "La memoria de talento no contacta candidatos — solo interno, sin contacto saliente automático, sin sincronización ATS en vivo. Revisión del reclutador antes del contacto.",
  },
  recruiterTrustReviewQueue: {
    pageEyebrow: "Cola de revisión de confianza",
    pageTitle: "Cola de revisión de confianza del reclutador",
    summaryLead:
      "Eventos de confianza/control del candidato agregados que requieren revisión humana — solo lectura, sin aprobaciones.",
    boundaryBody:
      "Esta cola es agregación demo de solo lectura. Sin botones de aprobación, correo, contacto saliente ni escritura en ATS. Decisión humana requerida en todas las acciones de confianza del candidato.",
    navLink: "Cola de revisión de confianza",
  },
  recruiterOperationalWorkQueue: {
    pageEyebrow: "Cola de trabajo operativo",
    pageTitle: "Cola de trabajo operativo del reclutador",
    summaryLead: "Elementos de trabajo demo agregados — sin acciones activas habilitadas.",
    boundaryBody:
      "Revisión humana requerida. Todas las acciones salientes deshabilitadas — cola solo demo.",
    navLink: "Cola de trabajo",
  },
  recruiterDailyCockpit: {
    navLink: "Cockpit diario",
    pageEyebrow: "Cockpit operativo diario del reclutador",
    title: "Lista de trabajo de hoy — piloto",
    lead:
      "Colas demo deterministas: decisiones, confianza, feedback, borradores, revisión ATS y pipeline — solo acciones humanas.",
    atsImportTitle: "Cola de revisión de importación ATS",
    atsImportLead: "Vista previa de mapeo y deduplicación — sin sincronización en vivo ni escritura en ATS en el piloto.",
    humanBoundaryBody:
      "TWIN agrega colas para revisión del reclutador. Los resúmenes asistidos por IA informan — no deciden. Sin contacto saliente automático, sin aplicación automática, sin escritura en ATS, sin correo enviado.",
  },
};

const ja: PersonaHubRecruiterOverlay = {
  companyTalentPool: {
    title: "企業のタレントメモリ",
    lead:
      "組織がすでに把握している候補者の構造化ビュー — 将来の採用とタレントレーダー向け。まず内部データ。連絡前にリクルーターの確認が必要です。",
    navLink: "タレントメモリ",
    chipNoOutreach: "自動アウトリーチなし",
    chipAtsPlanned: "ATS同期は計画中",
    trustCopy:
      "企業のタレントメモリは候補者に連絡しません — 内部のみ、自動アウトリーチなし、ライブATS同期なし。連絡前にリクルーターの確認が必要です。",
  },
  recruiterTrustReviewQueue: {
    pageEyebrow: "信頼レビューキュー",
    pageTitle: "リクルーター信頼レビューキュー",
    summaryLead:
      "人間のレビューが必要な候補者の信頼/制御イベントの集約 — 読み取り専用、承認なし。",
    boundaryBody:
      "このキューは読み取り専用のデモ集約です。承認ボタン、メール、アウトリーチ、ATS書き戻しはありません。候補者の信頼アクションはすべて人間の判断が必要です。",
    navLink: "信頼レビューキュー",
  },
  recruiterOperationalWorkQueue: {
    pageEyebrow: "運用ワークキュー",
    pageTitle: "リクルーター運用ワークキュー",
    summaryLead: "集約されたデモ作業項目 — 有効なライブアクションなし。",
    boundaryBody: "人間のレビューが必要です。すべての送信アクションは無効 — デモのみのキュー。",
    navLink: "ワークキュー",
  },
  recruiterDailyCockpit: {
    navLink: "デイリーコックピット",
    pageEyebrow: "リクルーター日次運用コックピット",
    title: "今日の作業リスト — パイロット",
    lead:
      "決定、信頼、フィードバック、下書き、ATSレビュー、パイプラインの決定論的デモキュー — 人間のみのアクション。",
    atsImportTitle: "ATSインポートレビューキュー",
    atsImportLead: "マッピングと重複排除のプレビュー — パイロットではライブ同期も書き戻しもありません。",
    humanBoundaryBody:
      "TWINはリクルーター向けにキューを集約します。AI支援の要約は情報提供のみ — 決定しません。自動アウトリーチなし、自動応募なし、ATS書き戻しなし、メール送信なし。",
  },
};

export const PERSONA_HUB_RECRUITER_OVERLAYS: Partial<Record<Locale, PersonaHubRecruiterOverlay>> = {
  es,
  ja,
};
