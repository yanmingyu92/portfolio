"""ClinicalTrials.gov API v2 adapter: Phase 2/3 readouts due in the next
`days_ahead` days (primary completion date window)."""
from __future__ import annotations

import datetime as dt
import logging

from .common import MAJOR_SPONSORS, get

log = logging.getLogger(__name__)

API_URL = "https://clinicaltrials.gov/api/v2/studies"


def fetch(start: dt.date, end: dt.date, days_ahead: int = 90, page_size: int = 100, keep: int = 25) -> list[dict]:
    """Phase 2/3 studies with primary completion in [today, today+days_ahead].

    `start`/`end` are accepted for registry uniformity but the readout
    calendar is forward-looking, so the window is anchored on today.
    """
    today = dt.date.today()
    future = today + dt.timedelta(days=days_ahead)
    r = get(
        API_URL,
        params={
            "query.term": "AREA[Phase]PHASE2 OR AREA[Phase]PHASE3",
            "filter.advanced": f"AREA[PrimaryCompletionDate]RANGE[{today},{future}]",
            "pageSize": page_size,
            "fields": "NCTId,BriefTitle,LeadSponsorName,Phase,PrimaryCompletionDate,Condition,EnrollmentCount",
        },
    )
    rows = []
    for s in r.json().get("studies", []):
        proto = s.get("protocolSection", {})
        ident = proto.get("identificationModule", {})
        sponsor = proto.get("sponsorCollaboratorsModule", {}).get("leadSponsor", {}).get("name", "")
        status = proto.get("statusModule", {}).get("primaryCompletionDateStruct", {})
        design = proto.get("designModule", {})
        rows.append(
            {
                "source": "ctgov",
                "id": ident.get("nctId", ""),
                "url": f"https://clinicaltrials.gov/study/{ident.get('nctId','')}",
                "title": ident.get("briefTitle", ""),
                "date": status.get("date", ""),
                "entity": sponsor,
                "phase": (design.get("phases") or [""])[0].replace("PHASE", "Phase "),
                "enrollment": design.get("enrollmentInfo", {}).get("count", 0),
                "major": bool(MAJOR_SPONSORS.search(sponsor)),
            }
        )
    return rows
