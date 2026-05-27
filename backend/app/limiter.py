"""Shared SlowAPI limiters.

The default `limiter` keys by client IP (per `get_remote_address`) and is
used by:

- public unauthenticated routes (beta waitlist signup);
- ops-only authenticated routes where the per-IP cap is a reasonable
  proxy for the operator's burst budget (auto-apply trigger-sweep).

The `user_or_ip_key` helper extracts the JWT subject from the inbound
`Authorization: Bearer …` header and returns a `user:<sub>` key. It
falls back to the remote-address key when the header is missing or the
token cannot be decoded — which covers logged-out probes hitting the
same endpoint. Pair it with the shared `limiter` like this:

    from app.limiter import limiter, user_or_ip_key

    @router.post("/expensive")
    @limiter.limit("60/minute", key_func=user_or_ip_key)
    def expensive(request: Request, ...): ...

Reasoning lives in
`docs/P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md`
(Layer 2): IP keying false-positives behind corporate NAT / CGNAT;
user keying caps a single bad actor's cost while leaving legitimate
multi-user behind-NAT traffic alone. The number stays deliberately
loose (60/minute) so real users never hit it — the layer is a sanity
cap against credential-stuffed bots and a runaway client loop, not a
product limit.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import decode_access_token

limiter = Limiter(key_func=get_remote_address)


def user_or_ip_key(request: Request) -> str:
    """Return a rate-limit key keyed by JWT subject, falling back to IP.

    Used as a per-decorator `key_func` override on authenticated
    mutating endpoints. We decode the JWT *without* touching the
    database — the rate-limit layer must not couple to DB liveness.
    """
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth:
        scheme, _, token = auth.partition(" ")
        if scheme.lower() == "bearer" and token:
            try:
                sub = decode_access_token(token.strip())
            except Exception:  # noqa: BLE001 — never raise from key_func
                sub = None
            if sub:
                return f"user:{sub}"
    return get_remote_address(request)
