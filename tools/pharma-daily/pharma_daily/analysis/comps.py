"""Deal-comp statistics against the accumulated deals table.

Method: percentile ranks are empirical-CDF (rank-based) percentiles —
Hyndman & Fan (1996) sample-quantile "type 1" (inverse of the empirical
distribution function): pct = 100 * |{h in hist : h <= x}| / n. Medians are
plain sample medians. With fewer than MIN_SAMPLE historical rows the stats
are reported with the sample size and flagged thin_sample instead of being
presented as meaningful benchmarks.
"""
from __future__ import annotations

import logging
import statistics

log = logging.getLogger(__name__)

MIN_SAMPLE = 30


def percentile_rank(value: float, reference: list[float]) -> float:
    """Empirical-CDF percentile of `value` within `reference` (0-100)."""
    if not reference:
        return 0.0
    n_le = sum(1 for h in reference if h <= value)
    return round(100.0 * n_le / len(reference), 1)


def comps_summary(historical_totals: list[float]) -> dict:
    """Pack-level comps block: {n_historical, median_total_usd, thin_sample}."""
    n = len(historical_totals)
    return {
        "n_historical": n,
        "median_total_usd": statistics.median(historical_totals) if n else None,
        "thin_sample": n < MIN_SAMPLE,
    }


def medians_by(deals: list[dict], key: str) -> dict[str, dict]:
    """Median upfront/total per group (deal_type, phase, ...). Groups with no
    disclosed values are omitted."""
    groups: dict[str, list[dict]] = {}
    for d in deals:
        g = d.get(key)
        if g:
            groups.setdefault(g, []).append(d)
    out = {}
    for g, rows in sorted(groups.items()):
        totals = [r["total_usd"] for r in rows if r.get("total_usd") is not None]
        upfronts = [r["upfront_usd"] for r in rows if r.get("upfront_usd") is not None]
        out[g] = {
            "n": len(rows),
            "median_total_usd": statistics.median(totals) if totals else None,
            "median_upfront_usd": statistics.median(upfronts) if upfronts else None,
        }
    return out


def annotate_percentiles(deals: list[dict], historical_totals: list[float]) -> list[dict]:
    """Attach percentile_total to each deal with a disclosed total."""
    for d in deals:
        d["percentile_total"] = (
            percentile_rank(d["total_usd"], historical_totals)
            if d.get("total_usd") is not None and historical_totals
            else None
        )
    return deals
