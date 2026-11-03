# Correction to earlier Epic 2.26 COMPLETE_PROVIDER_BLOCKED / gaps-closed tip docs

The 2026-09-08 evidence and later tip-only docs overstated completion. The following claims were not supported by executable evidence at that time:

1. Consent was server-enforced — false; request/config could still reach the evaluator path.
2. Heuristic criteria were honest — false; digit/word-count could yield SUPPORTED_IN_RESPONSE.
3. next_turn was adaptive — false; fixed family/index list.
4. Browser journeys A–H were authenticated browser journeys — false; mint + HTTP API only.
5. PG concurrency was proven — false; string search for with_for_update only.
6. Live AI gate would run the matrix when a key existed — false; placeholder status PROVIDER_PRESENT_MATRIX_PENDING / skip certified path.

This remediation closes 1–5 with tests + deploy. Item 6 runner is real but remains NOT_RUN because ANTHROPIC_API_KEY length is 0 on Railway twin.
