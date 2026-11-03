"""Deployment identity gate — negative control for mismatched runtime labels."""

from __future__ import annotations

import os

from app.services.deployment_identity import collect_deployment_identity, deployment_identity_gate


def test_mismatched_runtime_label_fails_gate(monkeypatch):
    monkeypatch.setenv("RAILWAY_GIT_COMMIT_SHA", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    monkeypatch.setenv("GIT_COMMIT_SHA", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
    identity = collect_deployment_identity()
    assert identity["provenance"] == "mismatched"
    gate = deployment_identity_gate(identity, require_platform=True)
    assert gate["passed"] is False
    assert any("runtime_label_mismatch" in f for f in gate["failures"])


def test_runtime_label_only_is_unverified(monkeypatch):
    monkeypatch.delenv("RAILWAY_GIT_COMMIT_SHA", raising=False)
    monkeypatch.delenv("VERCEL_GIT_COMMIT_SHA", raising=False)
    monkeypatch.setenv("GIT_COMMIT_SHA", "cccccccccccccccccccccccccccccccccccccccc")
    identity = collect_deployment_identity()
    assert identity["provenance"] == "runtime_label_only"
    gate = deployment_identity_gate(identity, require_platform=True)
    assert gate["status"] == "DEPLOYMENT_PROVENANCE_UNVERIFIED"
    assert gate["passed"] is False


def test_platform_match_passes(monkeypatch):
    monkeypatch.setenv("RAILWAY_GIT_COMMIT_SHA", "dddddddddddddddddddddddddddddddddddddddd")
    monkeypatch.setenv("GIT_COMMIT_SHA", "dddddddddddddddddddddddddddddddddddddddd")
    identity = collect_deployment_identity()
    gate = deployment_identity_gate(
        identity, expected_sha="dddddddddddddddddddddddddddddddddddddddd", require_platform=True
    )
    assert gate["passed"] is True
