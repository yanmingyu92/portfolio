"""SEC EDGAR full-text search adapter.

Primary query filters 8-K filings to pharma SIC codes (2834 pharma
preparations, 2836 biological products, 8731 commercial biological research
— some biotechs file there). If the SIC filter returns nothing the adapter
retries without it; the PHARMA_NAMES filer-name heuristic stays on as a
secondary guard either way (the FTS query is cross-industry).
"""
from __future__ import annotations

import datetime as dt
import logging
import re

from .common import PHARMA_NAMES, SEC_UA, get

log = logging.getLogger(__name__)

SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
SICS = "2834,2836,8731"
QUERIES = ['"license agreement"', '"collaboration agreement"', '"milestone payment"']


def _search(query: str, start: dt.date, end: dt.date, max_hits: int, sics: str | None) -> list[dict]:
    hits_all: list[dict] = []
    for offset in range(0, max_hits, 10):
        params = {
            "q": query,
            "forms": "8-K",
            "startdt": start.isoformat(),
            "enddt": end.isoformat(),
            "from": offset,
        }
        if sics:
            params["sics"] = sics
        hits = get(SEARCH_URL, params=params).json().get("hits", {}).get("hits", [])
        hits_all += hits
        if len(hits) < 10:
            break
    return hits_all


def _hit_to_item(h: dict, query: str) -> dict | None:
    src = h.get("_source", {})
    names = src.get("display_names") or []
    raw_name = names[0] if names else ""
    entity = raw_name.split("  (")[0].strip() or "Unknown filer"
    if not PHARMA_NAMES.search(entity):
        return None  # out-of-sector filer (secondary guard)
    cik_m = re.search(r"CIK (\d+)", raw_name)
    adsh = src.get("adsh", "")
    fname = (h.get("_id") or "").split(":")[-1]
    if cik_m and adsh and fname:
        url = (
            f"https://www.sec.gov/Archives/edgar/data/"
            f"{int(cik_m.group(1))}/{adsh.replace('-', '')}/{fname}"
        )
    else:
        url = "https://www.sec.gov/edgar/search/"
    return {
        "source": "sec-edgar",
        "id": h.get("_id") or url,
        "url": url,
        "title": f"{entity} 8-K mentioning {query.strip(chr(34))}",
        "date": src.get("file_date", ""),
        "entity": entity,
        "query": query.strip('"'),
    }


def fetch(start: dt.date, end: dt.date, max_hits: int = 40) -> list[dict]:
    """8-K filings mentioning license/collaboration/milestone in [start, end]."""
    items, seen = [], set()
    used_sics = True
    for q in QUERIES:
        hits = _search(q, start, end, max_hits, sics=SICS)
        if not hits and used_sics:
            log.info("EDGAR: no hits with sics=%s for %s — retrying unfiltered", SICS, q)
            used_sics = False
            hits = _search(q, start, end, max_hits, sics=None)
        # one row per filing (adsh): prefer the press-release exhibit
        # (ex99/ex-99) which carries headline + dollar amounts
        by_filing: dict[str, tuple[int, dict]] = {}
        for h in hits:
            if h.get("_id") in seen:
                continue
            seen.add(h.get("_id"))
            fname = (h.get("_id") or "").split(":")[-1].lower()
            score = ("ex99" in fname or "ex-99" in fname) * 2 + ("8k" in fname or "8-k" in fname)
            adsh = h.get("_source", {}).get("adsh", "")
            if adsh not in by_filing or score > by_filing[adsh][0]:
                by_filing[adsh] = (score, h)
        for _, h in by_filing.values():
            item = _hit_to_item(h, q)
            if item:
                items.append(item)
    log.info("EDGAR: %d items (sics filter: %s)", len(items), "on" if used_sics else "fallback off")
    return items


def fetch_filing_text(url: str, max_bytes: int = 400_000) -> str:
    """Stream the first chunk of an EDGAR filing and strip markup. '' on failure."""
    import requests

    try:
        with requests.get(url, headers=SEC_UA, timeout=30, stream=True) as r:
            r.raise_for_status()
            buf = b""
            for chunk in r.iter_content(65_536):
                buf += chunk
                if len(buf) >= max_bytes:
                    break
        text = buf.decode("utf-8", errors="ignore")
        text = re.sub(r"<[^>]+>", " ", text)
        return re.sub(r"\s+", " ", text)
    except Exception as e:  # noqa: BLE001
        log.warning("filing text fetch failed %s: %s", url, e)
        return ""
