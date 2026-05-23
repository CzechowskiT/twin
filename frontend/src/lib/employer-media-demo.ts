/** Stable ids for i18n keys: employerMedia.{id}Title etc. */

export const DEMO_EMPLOYER_SLUG = "nordbridge-global";

export const EMPLOYER_STAT_IDS = ["employees", "countries", "offices", "openRoles"] as const;

export const EMPLOYER_VIDEO_IDS = ["lifeAt", "engineering", "product", "graduates", "belonging", "sustainability"] as const;

export const EMPLOYER_PRESS_IDS = ["reuters", "techcrunch", "bloomberg", "wired"] as const;

export const EMPLOYER_GALLERY_OFFICE_IDS = ["warsaw", "london", "singapore", "austin"] as const;

export const EMPLOYER_GALLERY_CULTURE_IDS = ["hackWeek", "volunteer", "pride", "summit"] as const;

export const EMPLOYER_AWARD_IDS = ["greatPlace", "carbon", "diversity", "innovation"] as const;

export const EMPLOYER_ROLE_IDS = [
  "staffPlatform",
  "seniorMl",
  "productLead",
  "securityArchitect",
  "campusEng",
  "chiefOfStaff",
] as const;

export const EMPLOYER_CONTENT_HUB_IDS = ["podcast", "blog", "events"] as const;

export const EMPLOYER_ASSET_IDS = ["brandGuidelines", "factSheet", "esgReport"] as const;

export const EMPLOYER_LEADER_ID = "ceo";

export type EmployerDemoId =
  | (typeof EMPLOYER_VIDEO_IDS)[number]
  | (typeof EMPLOYER_PRESS_IDS)[number]
  | (typeof EMPLOYER_GALLERY_OFFICE_IDS)[number]
  | (typeof EMPLOYER_GALLERY_CULTURE_IDS)[number]
  | (typeof EMPLOYER_AWARD_IDS)[number]
  | (typeof EMPLOYER_ROLE_IDS)[number]
  | (typeof EMPLOYER_CONTENT_HUB_IDS)[number]
  | (typeof EMPLOYER_ASSET_IDS)[number];

/** Decorative thumbnail gradients (no external assets). */
export const EMPLOYER_THUMB_CLASS: Record<string, string> = {
  lifeAt: "from-violet-950 via-indigo-900 to-slate-950",
  engineering: "from-cyan-950 via-blue-900 to-slate-950",
  product: "from-emerald-950 via-teal-900 to-slate-950",
  graduates: "from-amber-950 via-orange-900 to-slate-950",
  belonging: "from-fuchsia-950 via-pink-900 to-slate-950",
  sustainability: "from-lime-950 via-green-900 to-slate-950",
  warsaw: "from-slate-800 via-slate-900 to-black",
  london: "from-indigo-900 via-slate-900 to-black",
  singapore: "from-teal-900 via-slate-900 to-black",
  austin: "from-amber-900 via-slate-900 to-black",
  hackWeek: "from-violet-900 via-slate-900 to-black",
  volunteer: "from-rose-900 via-slate-900 to-black",
  pride: "from-fuchsia-900 via-slate-900 to-black",
  summit: "from-cyan-900 via-slate-900 to-black",
};
