"""Executive Agent governance primitives; no production connector wiring."""

from .governance import (  # noqa: F401
    Action, Assessment, Decision, Domain, Reversibility, Risk,
    Verification, WorkKind, assess_action, classify_work,
)
