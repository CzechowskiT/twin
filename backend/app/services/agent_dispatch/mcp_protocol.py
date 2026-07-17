"""Hosted MCP (JSON-RPC over HTTPS) for TWIN Agent Dispatcher.

Transport: Streamable HTTP-compatible JSON-RPC at
POST /api/internal/agent-dispatch/mcp
Auth: Authorization Bearer AGENT_DISPATCH_TOKEN (never query-string secrets).
Server-enforced execution_policy cannot be weakened by tool arguments.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import Settings
from app.services.agent_dispatch.auth import AgentDispatchPrincipal, require_scope
from app.services.agent_dispatch.constants import (
    AGENT_DISPATCH_SCOPE_ADMIN,
    AGENT_DISPATCH_SCOPE_CANCEL,
    AGENT_DISPATCH_SCOPE_CREATE,
    AGENT_DISPATCH_SCOPE_READ,
    CURSOR_CONTRACT_DOC_DATE,
    CURSOR_CONTRACT_VERSION,
    DEFAULT_EXECUTION_POLICY,
)
from app.services.agent_dispatch.service import (
    cancel_run,
    create_dispatch_run,
    get_run_handoff,
    list_dispatch_runs,
    reconcile_run,
    run_report_dict,
    run_to_public_dict,
)

MCP_PROTOCOL_VERSION = "2025-06-18"
MCP_SERVER_NAME = "twin-agent-dispatcher"
MCP_SERVER_VERSION = "1.0.0"

# Hard allowlist — mirrored in Settings defaults; MCP never expands beyond this.
MCP_REPO_ALLOWLIST = ("https://github.com/CzechowskiT/twin",)
MCP_BASE_BRANCH_ALLOWLIST = ("cursor/phase1-monorepo-scaffold",)


def mcp_server_info() -> dict[str, Any]:
    return {
        "name": MCP_SERVER_NAME,
        "version": MCP_SERVER_VERSION,
        "protocolVersion": MCP_PROTOCOL_VERSION,
        "cursor_contract_version": CURSOR_CONTRACT_VERSION,
        "cursor_contract_doc_date": CURSOR_CONTRACT_DOC_DATE,
        "capabilities": {"tools": {"listChanged": False}},
    }


def _tool(
    name: str,
    description: str,
    properties: dict[str, Any],
    required: list[str] | None = None,
    *,
    read_only: bool = False,
    destructive: bool = False,
) -> dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "inputSchema": {
            "type": "object",
            "properties": properties,
            "required": required or [],
            "additionalProperties": False,
        },
        "annotations": {
            "readOnlyHint": read_only,
            "destructiveHint": destructive,
            "idempotentHint": read_only,
            "openWorldHint": False,
        },
    }


def tool_definitions() -> list[dict[str, Any]]:
    policy_schema = {
        "type": "object",
        "description": "Must keep all flags true; server rejects weakening.",
        "properties": {
            "single_active_run": {"type": "boolean", "const": True},
            "manual_merge_only": {"type": "boolean", "const": True},
            "no_admin_override": {"type": "boolean", "const": True},
            "no_auto_merge": {"type": "boolean", "const": True},
            "final_report_once": {"type": "boolean", "const": True},
        },
        "additionalProperties": False,
    }
    return [
        _tool(
            "dispatch_twin_agent",
            "Create a TWIN Agent Dispatcher run (Cursor Cloud Agent). "
            "Repo/branch allowlisted; execution_policy server-enforced.",
            {
                "task_name": {"type": "string", "minLength": 1, "maxLength": 128},
                "prompt": {"type": "string", "minLength": 1, "maxLength": 200000},
                "repository": {
                    "type": "string",
                    "enum": list(MCP_REPO_ALLOWLIST),
                    "default": MCP_REPO_ALLOWLIST[0],
                },
                "base_branch": {
                    "type": "string",
                    "enum": list(MCP_BASE_BRANCH_ALLOWLIST),
                    "default": MCP_BASE_BRANCH_ALLOWLIST[0],
                },
                "execution_policy": policy_schema,
                "auto_create_pr": {"type": "boolean", "default": False},
                "idempotency_key": {"type": "string", "maxLength": 128},
                "model_id": {"type": "string", "maxLength": 128},
                "branch_name": {"type": "string", "maxLength": 255},
                "dispatch_now": {"type": "boolean", "default": True},
            },
            ["task_name", "prompt"],
        ),
        _tool(
            "get_twin_agent_status",
            "Get dispatcher run status; optional Cursor refresh.",
            {
                "run_id": {"type": "string", "minLength": 1},
                "refresh": {"type": "boolean", "default": False},
            },
            ["run_id"],
            read_only=True,
        ),
        _tool(
            "get_twin_agent_report",
            "Get structured final report for a run (no manual prompt copy).",
            {"run_id": {"type": "string", "minLength": 1}},
            ["run_id"],
            read_only=True,
        ),
        _tool(
            "get_twin_agent_handoff",
            "Get ChatGPT/MCP handoff package (status, report, PR, branch, CI).",
            {"run_id": {"type": "string", "minLength": 1}},
            ["run_id"],
            read_only=True,
        ),
        _tool(
            "cancel_twin_agent",
            "Cancel an active dispatcher run (and Cursor agent when possible).",
            {"run_id": {"type": "string", "minLength": 1}},
            ["run_id"],
            destructive=True,
        ),
        _tool(
            "list_twin_agent_runs",
            "List recent dispatcher runs (newest first).",
            {
                "limit": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20},
                "status": {"type": "string"},
            },
            read_only=True,
        ),
        _tool(
            "reconcile_twin_agent_run",
            "Force reconcile run state from Cursor + GitHub enrichment.",
            {"run_id": {"type": "string", "minLength": 1}},
            ["run_id"],
        ),
    ]


def _text_result(payload: Any, *, is_error: bool = False) -> dict[str, Any]:
    text = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False, indent=2)
    return {"content": [{"type": "text", "text": text}], "isError": is_error}


def _enforce_policy(raw: dict[str, Any] | None) -> dict[str, Any]:
    policy = {**DEFAULT_EXECUTION_POLICY, **(raw or {})}
    for key, expected in DEFAULT_EXECUTION_POLICY.items():
        if policy.get(key) is not True:
            raise HTTPException(400, detail=f"execution_policy.{key} must be true")
        policy[key] = expected
    return policy


def call_tool(
    name: str,
    arguments: dict[str, Any] | None,
    *,
    db: Session,
    settings: Settings,
    principal: AgentDispatchPrincipal,
) -> dict[str, Any]:
    args = arguments or {}
    try:
        if name == "dispatch_twin_agent":
            require_scope(principal, AGENT_DISPATCH_SCOPE_CREATE)
            policy = _enforce_policy(args.get("execution_policy") if isinstance(args.get("execution_policy"), dict) else None)
            repo = (args.get("repository") or MCP_REPO_ALLOWLIST[0]).strip().rstrip("/")
            base = (args.get("base_branch") or MCP_BASE_BRANCH_ALLOWLIST[0]).strip()
            if repo not in MCP_REPO_ALLOWLIST:
                raise HTTPException(403, detail="repository not allowlisted")
            if base not in MCP_BASE_BRANCH_ALLOWLIST:
                raise HTTPException(403, detail="base_branch not allowlisted")
            run = create_dispatch_run(
                db,
                settings,
                principal,
                task_name=str(args.get("task_name") or ""),
                prompt=str(args.get("prompt") or ""),
                repository_url=repo,
                base_branch=base,
                execution_policy=policy,
                auto_create_pr=bool(args.get("auto_create_pr") or False),
                branch_name=args.get("branch_name"),
                model_id=args.get("model_id"),
                idempotency_key=args.get("idempotency_key"),
                metadata={"source": "mcp", "tool": name},
                dispatch_now=bool(args.get("dispatch_now", True)),
            )
            return _text_result(run_to_public_dict(run))

        if name == "get_twin_agent_status":
            require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
            run_id = str(args.get("run_id") or "")
            if args.get("refresh"):
                run = reconcile_run(db, settings, run_id)
            else:
                from app.database.models import AgentDispatchRun

                run = db.get(AgentDispatchRun, run_id)
                if not run:
                    raise HTTPException(404, detail="run not found")
            return _text_result(run_to_public_dict(run))

        if name == "get_twin_agent_report":
            require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
            return _text_result(run_report_dict(db, str(args.get("run_id") or "")))

        if name == "get_twin_agent_handoff":
            require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
            return _text_result(get_run_handoff(db, str(args.get("run_id") or "")))

        if name == "cancel_twin_agent":
            require_scope(principal, AGENT_DISPATCH_SCOPE_CANCEL)
            run = cancel_run(db, settings, principal, str(args.get("run_id") or ""))
            return _text_result(run_to_public_dict(run))

        if name == "list_twin_agent_runs":
            require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
            limit = int(args.get("limit") or 20)
            status_filter = args.get("status")
            rows = list_dispatch_runs(db, limit=limit, status=status_filter)
            return _text_result({"runs": [run_to_public_dict(r) for r in rows], "count": len(rows)})

        if name == "reconcile_twin_agent_run":
            require_scope(principal, AGENT_DISPATCH_SCOPE_READ)
            # Admin may also reconcile; read scope is enough for poll.
            _ = AGENT_DISPATCH_SCOPE_ADMIN  # documented for ops; not required here
            run = reconcile_run(db, settings, str(args.get("run_id") or ""))
            return _text_result(run_to_public_dict(run))

        return _text_result({"error": "unknown_tool", "name": name}, is_error=True)
    except HTTPException as exc:
        detail = exc.detail
        return _text_result(
            {"error": "http_error", "status": exc.status_code, "detail": detail},
            is_error=True,
        )


def handle_jsonrpc(
    body: dict[str, Any],
    *,
    db: Session,
    settings: Settings,
    principal: AgentDispatchPrincipal,
) -> dict[str, Any]:
    """Handle a single JSON-RPC 2.0 request (MCP methods)."""
    req_id = body.get("id")
    method = body.get("method") or ""
    params = body.get("params") if isinstance(body.get("params"), dict) else {}

    def ok(result: Any) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": req_id, "result": result}

    def err(code: int, message: str, data: Any = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": code, "message": message}
        if data is not None:
            payload["data"] = data
        return {"jsonrpc": "2.0", "id": req_id, "error": payload}

    if method == "initialize":
        info = mcp_server_info()
        return ok(
            {
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": info["capabilities"],
                "serverInfo": {
                    "name": MCP_SERVER_NAME,
                    "version": MCP_SERVER_VERSION,
                },
                "instructions": (
                    "TWIN Agent Dispatcher MCP for ChatGPT. "
                    "Auth: OAuth 2.1 (ChatGPT connector) or Bearer AGENT_DISPATCH_TOKEN (CLI/Actions). "
                    "Never pass CURSOR_CLOUD_AGENTS_API_KEY. After runs, call get_twin_agent_handoff. "
                    "Manual merge only; do not copy prompts from the UI."
                ),
            }
        )

    if method in ("notifications/initialized", "initialized"):
        # Notification — no response body required; return empty ack for HTTP.
        return ok({"ok": True})

    if method == "ping":
        return ok({})

    if method == "tools/list":
        return ok({"tools": tool_definitions()})

    if method == "tools/call":
        name = str(params.get("name") or "")
        arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
        if not name:
            return err(-32602, "tools/call requires name")
        return ok(call_tool(name, arguments, db=db, settings=settings, principal=principal))

    if method in ("resources/list", "prompts/list"):
        return ok({method.split("/")[0]: []})

    return err(-32601, f"Method not found: {method}")
