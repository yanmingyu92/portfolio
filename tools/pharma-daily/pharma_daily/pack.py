"""Data-pack builder: the JSON handoff artifact for the writing agent.

`out/pack/<date>.json` is the single contract between the deterministic
pipeline and any downstream writer (LLM agent or human). Every fact row
carries its source URL so the writer's fact-check pass can trace each
number back to a first-hand source. validate_pack() enforces the contract.
"""
from __future__ import annotations

import datetime as dt
import json
import logging
from pathlib import Path

log = logging.getLogger(__name__)

DEAL_KEYS = [
    "company", "ticker", "licensor", "licensee", "type", "upfront_usd",
    "total_usd", "therapeutic_area", "modality", "phase", "target",
    "percentile_total", "source_url", "source_title",
]
APPROVAL_KEYS = ["product", "sponsor", "date", "url", "application_type"]
READOUT_KEYS = ["nct", "phase", "sponsor", "title", "primary_completion", "enrollment", "score", "url"]
MARKET_KEYS = ["ticker", "change_1d_pct", "as_of"]
COMPS_KEYS = ["n_historical", "median_total_usd", "thin_sample"]


def _deal_row(d: dict) -> dict:
    return {
        "company": d.get("companies") or "",
        "ticker": d.get("ticker"),
        "licensor": d.get("licensor"),
        "licensee": d.get("licensee"),
        "type": d.get("deal_type") or "",
        "upfront_usd": d.get("upfront_usd"),
        "total_usd": d.get("total_usd"),
        "therapeutic_area": d.get("therapeutic_area"),
        "modality": d.get("modality"),
        "phase": d.get("phase"),
        "target": d.get("target"),
        "percentile_total": d.get("percentile_total"),
        "source_url": d.get("source_url") or "",
        "source_title": d.get("headline") or "",
    }


def _approval_row(a: dict) -> dict:
    return {
        "product": a.get("product") or "",
        "sponsor": a.get("entity") or "",
        "date": a.get("date") or "",
        "url": a.get("url") or "",
        "application_type": a.get("application_type") or "",
    }


def _readout_row(r: dict) -> dict:
    return {
        "nct": r.get("id") or "",
        "phase": r.get("phase") or "",
        "sponsor": r.get("entity") or "",
        "title": r.get("title") or "",
        "primary_completion": r.get("date") or "",
        "enrollment": r.get("enrollment"),
        "score": r.get("score"),
        "url": r.get("url") or "",
    }


def build_pack(
    run_date: dt.date,
    start: dt.date,
    deals: list[dict],
    approvals: list[dict],
    readouts: list[dict],
    market: list[dict],
    comps: dict,
    insights: list[dict],
    figures: list[dict],
    sources_ok: list[str],
    sources_failed: list[str],
) -> dict:
    """Assemble the pack dict in the exact contract shape."""
    source_links: dict[str, dict] = {}
    for row, outlet in (
        [(d, "sec-edgar") for d in deals]
        + [(a, "openfda") for a in approvals]
        + [(r, "ctgov") for r in readouts]
    ):
        url = row.get("source_url") or row.get("url")
        if url and url not in source_links:
            source_links[url] = {
                "title": (row.get("headline") or row.get("title") or url)[:140],
                "url": url,
                "outlet": row.get("source") or outlet,
            }
    return {
        "date": run_date.isoformat(),
        "window": {"start": start.isoformat(), "end": run_date.isoformat()},
        "deals": [_deal_row(d) for d in deals],
        "approvals": [_approval_row(a) for a in approvals],
        "readouts": [_readout_row(r) for r in readouts],
        "market": [{k: m.get(k) for k in MARKET_KEYS} for m in market],
        "comps": {k: comps.get(k) for k in COMPS_KEYS},
        "insights": insights,
        "figures": figures,
        "sources": list(source_links.values()),
        "provenance": {
            "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "sources_ok": sources_ok,
            "sources_failed": sources_failed,
        },
    }


def validate_pack(pack: dict) -> list[str]:
    """Contract check. Returns a list of violations (empty = valid)."""
    errors: list[str] = []
    for key in ("date", "window", "deals", "approvals", "readouts", "market",
                "comps", "insights", "figures", "sources", "provenance"):
        if key not in pack:
            errors.append(f"missing top-level key: {key}")
    for i, ins in enumerate(pack.get("insights", [])):
        for k in ("move", "text", "numbers", "confidence"):
            if k not in ins:
                errors.append(f"insights[{i}] missing key: {k}")
    for section, keys, url_field in (
        ("deals", DEAL_KEYS, "source_url"),
        ("approvals", APPROVAL_KEYS, "url"),
        ("readouts", READOUT_KEYS, "url"),
    ):
        for i, row in enumerate(pack.get(section, [])):
            for k in keys:
                if k not in row:
                    errors.append(f"{section}[{i}] missing key: {k}")
            if not row.get(url_field):
                errors.append(f"{section}[{i}] has no {url_field} (provenance required)")
    for k in COMPS_KEYS:
        if k not in pack.get("comps", {}):
            errors.append(f"comps missing key: {k}")
    for k in ("fetched_at", "sources_ok", "sources_failed"):
        if k not in pack.get("provenance", {}):
            errors.append(f"provenance missing key: {k}")
    return errors


def write_pack(pack: dict, pack_dir: Path) -> Path:
    pack_dir.mkdir(parents=True, exist_ok=True)
    path = pack_dir / f"{pack['date']}.json"
    path.write_text(json.dumps(pack, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info("pack written: %s (%d deals, %d approvals, %d readouts)",
             path, len(pack["deals"]), len(pack["approvals"]), len(pack["readouts"]))
    return path
