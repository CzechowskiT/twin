# Epic 2.20 — Owner / Duplication Audit

NEW_ACCESS_GRANT_STORE=NONE. Derived inventory only. Parallel TOKEN/AUTH_SESSION/CONSENT/SHARE/AUDIT stores=NONE.

| Kind | Owner | List | Revoke | Include |
|------|-------|------|--------|---------|
| AUTH_SESSION | JWT/stateless | /auth/me meta | client logout only | yes (meta, no server revoke-all) |
| OAUTH_CONNECTION | calendar google/ms | status + calendar-sync | DELETE calendar/* + calendar-sync/disconnect | yes |
| CALENDAR_READ_CONSENT | calendar-sync consent | calendar-sync | PATCH consent false | yes |
| PRIVATE_CALENDAR_FEED | calendar-sync feeds | calendar-sync feeds | feeds/{id}/revoke | yes |
| CAREER_PACK_SHARE | career_pack_share | per-pack shares | shares/{key}/revoke | yes |
| TEMPORARY_CAREER_PACK_ARTIFACT | career_pack READY bytes | career-packs | pack revoke/delete | yes |
| TEMPORARY_PRIVACY_EXPORT | export.json / export-requests | export-requests + capability | N/A live; cancel open DSR | yes (capability/open) |

EXCLUDE: Continuity, Path, Data Trust, Daily OS, drafts, demo/preview, invite tokens, partner keys.
