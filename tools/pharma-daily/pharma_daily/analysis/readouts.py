"""Readout-calendar ranking.

Method: a transparent additive/multiplicative score, no ML —

    score = phase_weight * (1 + log1p(enrollment)) * sponsor_multiplier

phase_weight rewards later-stage binary risk (Phase 3 > Phase 2); the
log1p(enrollment) term rewards better-powered studies with diminishing
returns; sponsor_multiplier (1.5 for major pharma, else 1.0) proxies
sponsor size, since big sponsors are likelier to actually report on time.
Weights are constants declared below, not fitted.
"""
from __future__ import annotations

import math

from pharma_daily.sources.common import MAJOR_SPONSORS

PHASE_WEIGHT = {
    "Phase 3": 3.0,
    "Phase 2/3": 2.5,
    "Phase 2": 2.0,
    "Phase 1/2": 1.5,
    "Phase 1": 1.0,
}
DEFAULT_PHASE_WEIGHT = 1.0
MAJOR_SPONSOR_MULTIPLIER = 1.5


def score_readout(readout: dict) -> float:
    phase = (readout.get("phase") or "").strip()
    w = PHASE_WEIGHT.get(phase, DEFAULT_PHASE_WEIGHT)
    enrollment = readout.get("enrollment") or 0
    mult = MAJOR_SPONSOR_MULTIPLIER if readout.get("major") or MAJOR_SPONSORS.search(readout.get("entity") or "") else 1.0
    return round(w * (1.0 + math.log1p(enrollment)) * mult, 2)


def rank_readouts(readouts: list[dict], keep: int | None = None) -> list[dict]:
    """Attach `score` and sort best-first (ties broken by earliest date)."""
    for r in readouts:
        r["score"] = score_readout(r)
    ranked = sorted(readouts, key=lambda r: (-r["score"], r.get("date") or "9999"))
    return ranked[:keep] if keep else ranked
