"""OpenAPI 3.1 document for Custom GPT Actions (TWIN Product Operator)."""

from __future__ import annotations

from typing import Any

from app.config import Settings
from app.services.agent_dispatch.oauth_as import public_api_base


def twin_product_operator_openapi(
    settings: Settings, request_base: str | None = None
) -> dict[str, Any]:
    base = public_api_base(settings, request_base)
    privacy = (
        (settings.chatgpt_twin_privacy_policy_url or "").strip()
        or "https://twin-sooty.vercel.app/privacy#custom-gpt-actions"
    )
    return {
        "openapi": "3.1.0",
        "info": {
            "title": "TWIN Product Operator",
            "version": "1.0.0",
            "description": (
                "Private Custom GPT Actions for the TWIN founder. "
                "Issue commands, read project state, resolve decisions, pause/cancel — "
                "long-running Product Agent / Dispatcher / Operator work stays inside TWIN. "
                f"Privacy: {privacy}. Keep this GPT private (do not publish to the Store)."
            ),
            "termsOfService": privacy,
        },
        "servers": [{"url": base}],
        "security": [{"bearerAuth": []}],
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "API_KEY",
                    "description": (
                        "Railway secret CHATGPT_TWIN_ACTIONS_API_KEY only. "
                        "Never paste into repo, Vercel, or OpenAPI examples."
                    ),
                }
            },
            "schemas": {
                "CreateTwinCommand": {
                    "type": "object",
                    "required": ["direction"],
                    "properties": {
                        "direction": {
                            "type": "string",
                            "minLength": 3,
                            "maxLength": 4000,
                            "description": "Founder goal in natural language (PL/EN).",
                        },
                        "action": {
                            "type": "string",
                            "enum": ["start", "analyze", "continue"],
                            "default": "start",
                        },
                        "autonomy_level": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 4,
                            "default": 3,
                        },
                        "max_batches": {"type": "integer", "minimum": 1, "maximum": 50, "default": 5},
                        "max_runtime_minutes": {
                            "type": "integer",
                            "minimum": 5,
                            "maximum": 1440,
                            "default": 360,
                        },
                        "approval_policy": {
                            "type": "string",
                            "default": "founder_decisions_and_high_risk_only",
                        },
                        "idempotency_key": {"type": "string", "maxLength": 128},
                    },
                },
                "CancelTwinCommand": {
                    "type": "object",
                    "required": ["reason", "confirmation"],
                    "properties": {
                        "reason": {"type": "string", "minLength": 3, "maxLength": 500},
                        "confirmation": {
                            "type": "boolean",
                            "description": "Must be true to cancel.",
                        },
                    },
                },
                "ChangeDirection": {
                    "type": "object",
                    "required": ["direction"],
                    "properties": {
                        "direction": {"type": "string", "minLength": 3, "maxLength": 4000}
                    },
                },
                "DecisionNote": {
                    "type": "object",
                    "properties": {"note": {"type": "string", "maxLength": 500}},
                },
                "ModifyDecision": {
                    "type": "object",
                    "required": ["modification"],
                    "properties": {
                        "modification": {"type": "string", "minLength": 3, "maxLength": 4000},
                        "note": {"type": "string", "maxLength": 500},
                    },
                },
            },
        },
        "paths": {
            "/api/v1/chatgpt/twin/state": {
                "get": {
                    "operationId": "getTwinProjectState",
                    "summary": "Canonical TWIN project state (redacted)",
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/commands": {
                "post": {
                    "operationId": "createTwinCommand",
                    "summary": "Create a Founder Command (returns promptly; work continues in TWIN)",
                    "parameters": [
                        {
                            "name": "Idempotency-Key",
                            "in": "header",
                            "required": False,
                            "schema": {"type": "string"},
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CreateTwinCommand"}
                            }
                        },
                    },
                    "responses": {
                        "201": {"description": "Command accepted"},
                        "202": {"description": "Command accepted (async)"},
                    },
                }
            },
            "/api/v1/chatgpt/twin/commands/latest": {
                "get": {
                    "operationId": "getLatestTwinCommand",
                    "summary": "Most recent Founder Command",
                    "responses": {"200": {"description": "OK"}, "404": {"description": "None"}},
                }
            },
            "/api/v1/chatgpt/twin/commands/{command_id}": {
                "get": {
                    "operationId": "getTwinCommand",
                    "summary": "Get command status",
                    "parameters": [
                        {
                            "name": "command_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/commands/{command_id}/result": {
                "get": {
                    "operationId": "getTwinCommandResult",
                    "summary": "Result / handoff summary for a command",
                    "parameters": [
                        {
                            "name": "command_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/commands/{command_id}/pause": {
                "post": {
                    "operationId": "pauseTwinCommand",
                    "summary": "Pause an active command",
                    "parameters": [
                        {
                            "name": "command_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/commands/{command_id}/resume": {
                "post": {
                    "operationId": "resumeTwinCommand",
                    "summary": "Resume a paused command",
                    "parameters": [
                        {
                            "name": "command_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/commands/{command_id}/cancel": {
                "post": {
                    "operationId": "cancelTwinCommand",
                    "summary": "Cancel a command (requires reason + confirmation=true)",
                    "parameters": [
                        {
                            "name": "command_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CancelTwinCommand"}
                            }
                        },
                    },
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/commands/{command_id}/direction": {
                "post": {
                    "operationId": "changeTwinCommandDirection",
                    "summary": "Change direction of a non-terminal command",
                    "parameters": [
                        {
                            "name": "command_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ChangeDirection"}
                            }
                        },
                    },
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/decisions/pending": {
                "get": {
                    "operationId": "getPendingTwinDecisions",
                    "summary": "List pending founder decisions",
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/decisions/{decision_id}/approve": {
                "post": {
                    "operationId": "approveTwinDecision",
                    "summary": "Approve a pending decision",
                    "parameters": [
                        {
                            "name": "decision_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/DecisionNote"}
                            }
                        }
                    },
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/decisions/{decision_id}/reject": {
                "post": {
                    "operationId": "rejectTwinDecision",
                    "summary": "Reject a pending decision",
                    "parameters": [
                        {
                            "name": "decision_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/DecisionNote"}
                            }
                        }
                    },
                    "responses": {"200": {"description": "OK"}},
                }
            },
            "/api/v1/chatgpt/twin/decisions/{decision_id}/modify": {
                "post": {
                    "operationId": "modifyTwinDecision",
                    "summary": "Modify direction then approve the decision",
                    "parameters": [
                        {
                            "name": "decision_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ModifyDecision"}
                            }
                        },
                    },
                    "responses": {"200": {"description": "OK"}},
                }
            },
        },
    }


def openapi_to_minimal_yaml(doc: dict[str, Any]) -> str:
    """Tiny YAML emitter for OpenAPI import (no PyYAML dependency)."""
    import json

    # GPT Actions editor accepts JSON; YAML is a convenience dump of the same doc.
    return (
        "# TWIN Product Operator — OpenAPI 3.1 (generated)\n"
        "# Prefer importing openapi.json if the Actions editor rejects YAML.\n"
        f"openapi: \"{doc.get('openapi', '3.1.0')}\"\n"
        "info:\n"
        f"  title: {json.dumps(doc.get('info', {}).get('title', 'TWIN Product Operator'))}\n"
        f"  version: {json.dumps(doc.get('info', {}).get('version', '1.0.0'))}\n"
        "servers:\n"
        f"  - url: {json.dumps((doc.get('servers') or [{}])[0].get('url', ''))}\n"
        "security:\n"
        "  - bearerAuth: []\n"
        "# Full paths/components: use /openapi.json — this YAML is a stub pointer.\n"
        "x_full_spec_json: true\n"
        f"x_json_url: \"/api/v1/chatgpt/twin/openapi.json\"\n"
    )
