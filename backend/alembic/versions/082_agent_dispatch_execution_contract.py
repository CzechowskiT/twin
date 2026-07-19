"""Persist normalized Agent Dispatcher execution contracts."""

import hashlib
import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "082_agent_dispatch_execution_contract"
down_revision: Union[str, None] = "081_agent_dispatch_operator"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _normalized_contract(value: str | None) -> dict[str, object]:
    try:
        raw = json.loads(value or "{}")
    except (json.JSONDecodeError, TypeError):
        raw = {}
    regression = bool(
        raw.get("regression_required", raw.get("production_regression_required", False))
    )
    mutating = bool(
        raw.get("mutation_required", False)
        or raw.get("execution_mode") == "mutating"
        or any(
            raw.get(key, False)
            for key in (
                "commit_required",
                "pr_required",
                "merge_required",
                "deployment_required",
                "production_regression_required",
                "operator_execution_required",
            )
        )
    )
    read_only = bool(raw.get("read_only", not mutating))
    mode = raw.get("execution_mode")
    if mode not in {"read_only", "mutating"}:
        mode = "read_only" if read_only else "mutating"
    return {
        "pr_required": bool(raw.get("pr_required", False)),
        "merge_required": bool(raw.get("merge_required", False)),
        "deployment_required": bool(raw.get("deployment_required", False)),
        "ci_required": bool(raw.get("ci_required", False)),
        "mutation_required": mutating,
        "operator_execution_required": bool(raw.get("operator_execution_required", mutating)),
        "execution_mode": mode,
        "regression_required": regression,
        "production_regression_required": regression,
        "commit_required": bool(raw.get("commit_required", False)),
        "read_only": read_only,
    }


def _backfill_contracts(bind) -> None:  # noqa: ANN001
    rows = bind.execute(
        sa.text("SELECT id, expected_artifacts_json FROM agent_dispatch_runs")
    ).mappings()
    for row in rows:
        contract = _normalized_contract(row["expected_artifacts_json"])
        canonical = json.dumps(contract, sort_keys=True, separators=(",", ":"))
        bind.execute(
            sa.text(
                "UPDATE agent_dispatch_runs SET "
                "execution_mode=:mode, read_only=:read_only, "
                "mutation_required=:mutation_required, "
                "operator_execution_required=:operator_required, "
                "execution_contract_hash=:contract_hash WHERE id=:run_id"
            ),
            {
                "mode": contract["execution_mode"],
                "read_only": contract["read_only"],
                "mutation_required": contract["mutation_required"],
                "operator_required": contract["operator_execution_required"],
                "contract_hash": hashlib.sha256(canonical.encode()).hexdigest(),
                "run_id": row["id"],
            },
        )


def upgrade() -> None:
    bind = op.get_bind()
    if not bind.dialect.has_table(bind, "agent_dispatch_runs"):
        return
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("agent_dispatch_runs")}
    additions = (
        ("execution_mode", sa.String(length=16)),
        ("read_only", sa.Boolean()),
        ("mutation_required", sa.Boolean()),
        ("operator_execution_required", sa.Boolean()),
        ("execution_contract_hash", sa.String(length=64)),
    )
    for name, column_type in additions:
        if name not in columns:
            op.add_column("agent_dispatch_runs", sa.Column(name, column_type, nullable=True))
    _backfill_contracts(bind)
    indexes = {
        index["name"] for index in sa.inspect(bind).get_indexes("agent_dispatch_runs")
    }
    for name in ("execution_mode", "execution_contract_hash"):
        index_name = f"ix_agent_dispatch_runs_{name}"
        if index_name not in indexes:
            op.create_index(index_name, "agent_dispatch_runs", [name])


def downgrade() -> None:
    bind = op.get_bind()
    if not bind.dialect.has_table(bind, "agent_dispatch_runs"):
        return
    inspector = sa.inspect(bind)
    indexes = {index["name"] for index in inspector.get_indexes("agent_dispatch_runs")}
    for name in ("execution_contract_hash", "execution_mode"):
        index_name = f"ix_agent_dispatch_runs_{name}"
        if index_name in indexes:
            op.drop_index(index_name, table_name="agent_dispatch_runs")
    columns = {column["name"] for column in inspector.get_columns("agent_dispatch_runs")}
    for name in (
        "execution_contract_hash",
        "operator_execution_required",
        "mutation_required",
        "read_only",
        "execution_mode",
    ):
        if name in columns:
            op.drop_column("agent_dispatch_runs", name)
