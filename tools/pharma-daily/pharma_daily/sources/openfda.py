"""openFDA Drugs@FDA adapter: recent drug approvals (submission_status AP)."""
from __future__ import annotations

import datetime as dt
import logging
import re

import requests

from .common import get

log = logging.getLogger(__name__)

API_URL = "https://api.fda.gov/drug/drugsfda.json"


def fetch(start: dt.date, end: dt.date, limit: int = 40) -> list[dict]:
    """Approvals with submission_status_date inside [start, end]."""
    rng = f"[{start:%Y%m%d}+TO+{end:%Y%m%d}]"
    # build the URL by hand: openFDA needs literal '+' (not %2B) as its AND separator
    url = (
        f"{API_URL}?search=submissions.submission_status:AP+AND+"
        f"submissions.submission_status_date:{rng}&limit={limit}"
    )
    try:
        results = get(url).json().get("results", [])
    except requests.HTTPError as e:
        # openFDA answers 404 "No matches found!" when the window has no approvals
        if e.response is not None and e.response.status_code == 404:
            log.info("openFDA: no approvals in window (404 No matches)")
            return []
        raise
    items = []
    for rec in results:
        subs = [s for s in rec.get("submissions", []) if s.get("submission_status") == "AP"]
        subs.sort(key=lambda s: s.get("submission_status_date", ""), reverse=True)
        if not subs:
            continue
        latest = subs[0]
        d = latest.get("submission_status_date", "")
        date = f"{d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 else ""
        brands = list(
            dict.fromkeys(
                p.get("brand_name", "") for p in rec.get("products", []) if p.get("brand_name")
            )
        )
        actives = [p.get("active_ingredients", [{}])[0].get("name", "") for p in rec.get("products", [])[:1]]
        appl = rec.get("application_number", "")
        sponsor = rec.get("sponsor_name", "Unknown sponsor").title()
        items.append(
            {
                "source": "openfda",
                "id": f"{appl}-{latest.get('submission_type','')}{latest.get('submission_number','')}",
                "url": "https://www.accessdata.fda.gov/scripts/cder/daf/"
                f"index.cfm?event=overview.process&ApplNo={re.sub(r'[^0-9]', '', appl)}",
                "title": f"FDA approval: {', '.join(brands[:2]) or actives[0] or appl} ({sponsor})",
                "date": date,
                "entity": sponsor,
                "product": brands[0] if brands else (actives[0] if actives else ""),
                "application_type": re.match(r"[A-Za-z]+", appl).group(0).upper()
                if re.match(r"[A-Za-z]+", appl)
                else "",
            }
        )
    return items
