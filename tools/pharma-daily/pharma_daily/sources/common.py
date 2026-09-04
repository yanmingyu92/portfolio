"""Shared HTTP helpers and regexes for the source adapters."""
from __future__ import annotations

import re

import requests

# SEC requires an identifying User-Agent; trade-press RSS endpoints
# (endpoints.news) 403 non-browser agents, so RSS uses a browser UA.
SEC_UA = {"User-Agent": "PharmaDaily jaime@jaimeyan.com"}
BROWSER_UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )
}
TIMEOUT = 30


def get(url: str, headers: dict | None = None, **kw) -> requests.Response:
    r = requests.get(url, headers=headers or SEC_UA, timeout=TIMEOUT, **kw)
    r.raise_for_status()
    return r


PHARMA_KEYWORDS = re.compile(
    r"\b(pharma|pharmaceutical|radiopharma|biotech|biopharma|therapeutics|"
    r"bioscience|biologics|life sciences|lifesciences|medicine|"
    r"fda|ema|clinical trial|phase\s*[123i]|oncology|antibody|vaccine|"
    r"cell therapy|gene therapy|fda approv|pdufa|nda|bla)\b",
    re.I,
)

MAJOR_SPONSORS = re.compile(
    r"\b(pfizer|merck|roche|genentech|novartis|astrazeneca|eli lilly|lilly|"
    r"bristol.myers|bristol myers|sanofi|glaxosmithkline|gsk|amgen|gilead|"
    r"abbvie|johnson & johnson|janssen|novo nordisk|takeda|bayer|"
    r"boehringer|regeneron|vertex|moderna|biogen|daiichi|astellas)\b",
    re.I,
)

# filer-name heuristic to keep the cross-industry 8-K search on-sector
PHARMA_NAMES = re.compile(
    r"\b(pharma|pharmaceutical|therapeutics?|biosciences?|biologics?|"
    r"biotech|biopharma|bio\b|bio,|oncology|genomics?|medicines?|"
    r"health(?:care)?|medical|vaccines?|sciences?)\b",
    re.I,
)
