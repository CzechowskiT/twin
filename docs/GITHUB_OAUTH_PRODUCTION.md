# GitHub OAuth (production)

TWIN uses a GitHub OAuth App for candidate/recruiter sign-in.

## One-time secret (founder)

GitHub shows the client secret **only once** when you generate it. The API cannot read it back later.

1. Open [TWIN Production API OAuth app](https://github.com/settings/applications/3619797) (Client ID `Ov23liAH27TBi1BdbEVf`).
2. Confirm **Authorization callback URL** is exactly:
   `https://twin-production-bcd9.up.railway.app/api/v1/auth/github/callback`
3. Click **Generate a new client secret** (verify email if prompted).
4. On your machine (do not commit the secret):

```bash
cd /path/to/twin
GITHUB_CLIENT_ID=Ov23liAH27TBi1BdbEVf \
GITHUB_CLIENT_SECRET='paste-new-secret-here' \
./scripts/railway-apply-github-oauth-secret.sh
```

5. Verify:

```bash
curl -s 'https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1' | grep github_oauth
curl -sI 'https://twin-production-bcd9.up.railway.app/api/v1/auth/github/login' | grep -i location
```

Expect `github_oauth_configured: true` and a `Location` pointing at `github.com/login/oauth/authorize` (not `error=github_not_configured`).

## UI without secret

Until the secret is on Railway, `github_oauth_configured` is `false`: the login/register UI hides the GitHub button and strips stale `?error=github_not_configured` from the URL after health loads.
