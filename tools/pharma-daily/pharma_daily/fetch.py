"""Source registry for the pharma-daily pipeline.

Each source is a small adapter (see pharma_daily/sources/) declared as a
SourceSpec: name, canonical URL, and a parser callable. fetch_all() runs
them with failure isolation — one source raising never kills the run; the
failure is logged, recorded in provenance, and the rest still execute.
"""
from __future__ import annotations

import datetime as dt
import logging
from collections.abc import Callable
from dataclasses import dataclass, field

from pharma_daily.sources import ctgov, edgar, openfda, rss

log = logging.getLogger(__name__)

# Backward-compat re-exports (older scripts import these from fetch).
UA = {"User-Agent": "PharmaDaily jaime@jaimeyan.com"}
PRNEWSWIRE = rss.PRNEWSWIRE
fetch_filing_text = edgar.fetch_filing_text


@dataclass
class SourceSpec:
    """One data source: a named adapter with a fetch(start, end) parser."""

    name: str
    url: str
    fetch: Callable[[dt.date, dt.date], list[dict]]
    kind: str = "news"  # news | approval | readout


@dataclass
class FetchResult:
    items: list[dict] = field(default_factory=list)
    approvals: list[dict] = field(default_factory=list)
    readouts: list[dict] = field(default_factory=list)
    ok: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    counts: dict[str, int] = field(default_factory=dict)


SOURCES: list[SourceSpec] = [
    SourceSpec("sec-edgar", edgar.SEARCH_URL, edgar.fetch),
    SourceSpec("openfda", openfda.API_URL, openfda.fetch, kind="approval"),
    SourceSpec("ctgov", ctgov.API_URL, ctgov.fetch, kind="readout"),
    SourceSpec("fda-press", rss.FDA_PRESS, rss.make_fetcher("fda-press", rss.FDA_PRESS)),
    SourceSpec("ema-news", rss.EMA_NEWS, rss.make_fetcher("ema-news", rss.EMA_NEWS)),
    SourceSpec("fiercepharma", rss.FIERCEPHARMA, rss.make_fetcher("fiercepharma", rss.FIERCEPHARMA)),
    SourceSpec("fiercebiotech", rss.FIERCEBIOTECH, rss.make_fetcher("fiercebiotech", rss.FIERCEBIOTECH)),
    SourceSpec("biopharmadive", rss.BIOPHARMADIVE, rss.make_fetcher("biopharmadive", rss.BIOPHARMADIVE)),
    SourceSpec("endpoints", rss.ENDPOINTS, rss.make_fetcher("endpoints", rss.ENDPOINTS)),
    # cross-industry wire: keep the pharma keyword filter on
    SourceSpec(
        "prnewswire",
        rss.PRNEWSWIRE,
        rss.make_fetcher("prnewswire", rss.PRNEWSWIRE, keyword_filter=True),
    ),
]


def fetch_all(start: dt.date, end: dt.date, sources: list[SourceSpec] | None = None) -> FetchResult:
    """Run every registered source; failures are logged and skipped."""
    res = FetchResult()
    for spec in sources or SOURCES:
        try:
            rows = spec.fetch(start, end)
        except Exception as e:  # noqa: BLE001 - isolation by design
            log.warning("source %s failed: %s", spec.name, e)
            res.failed.append(spec.name)
            res.counts[spec.name] = 0
            continue
        res.ok.append(spec.name)
        res.counts[spec.name] = len(rows)
        log.info("source %-14s %3d items", spec.name, len(rows))
        if spec.kind == "approval":
            res.approvals += rows
        elif spec.kind == "readout":
            res.readouts += rows
        else:
            res.items += rows
    return res
