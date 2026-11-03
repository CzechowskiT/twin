# PP1 rollback exercise (before final activation)

1. Deployed `/preview` with `PUBLIC_PREVIEW` unset → middleware returned **404** `Not Found` with `X-Robots-Tag: noindex,nofollow,noarchive,nosnippet,noimageindex` and `Cache-Control: private, no-store` (proven on twin-sooty before enable).
2. Enabled independent kill switch `PUBLIC_PREVIEW=READ_ONLY_SYNTHETIC` (+ `NEXT_PUBLIC_PUBLIC_PREVIEW`) on Vercel and Railway only — Launch/enrollment/signup/pilot/invite gates unchanged.
3. Immediate rollback path: unset/remove `PUBLIC_PREVIEW` / `NEXT_PUBLIC_PUBLIC_PREVIEW` → `/preview` returns 404 again without touching other gates.
