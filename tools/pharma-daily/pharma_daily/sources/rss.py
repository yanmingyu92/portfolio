"""RSS feed adapters.

Feeds verified 2026-09-04 from this machine: all return HTTP 200 and parse
to real entries with a browser User-Agent (endpoints.news 403s non-browser
agents). The GlobeNewswire "biotech" feed was dropped — it is a multilingual
wire dump; the FDA/EMA/trade-press feeds below replace it.
"""
from __future__ import annotations

import datetime as dt
import logging
import re

import feedparser

from .common import BROWSER_UA, PHARMA_KEYWORDS

log = logging.getLogger(__name__)

FDA_PRESS = "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml"
EMA_NEWS = "https://www.ema.europa.eu/en/news.xml"
FIERCEPHARMA = "https://www.fiercepharma.com/rss/xml"
FIERCEBIOTECH = "https://www.fiercebiotech.com/rss/xml"
BIOPHARMADIVE = "https://www.biopharmadive.com/feeds/news"
ENDPOINTS = "https://endpoints.news/feed/"
PRNEWSWIRE = "https://www.prnewswire.com/rss/news-releases-list.rss"

# Fierce feeds stamp dates as "Sep 4, 2026 10:56am" — not RFC-822, so
# feedparser leaves published_parsed empty and we parse by hand.
_FIERCE_DATE = "%b %d, %Y %I:%M%p"


def _entry_date(e) -> dt.date | None:
    pub = e.get("published_parsed") or e.get("updated_parsed")
    if pub:
        return dt.date(pub.tm_year, pub.tm_mon, pub.tm_mday)
    raw = (e.get("published") or e.get("updated") or "").strip()
    for fmt in (_FIERCE_DATE,):
        try:
            return dt.datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def make_fetcher(name: str, url: str, keyword_filter: bool = False):
    """Build a source fetcher for one RSS feed."""

    def fetch(start: dt.date, end: dt.date) -> list[dict]:
        feed = feedparser.parse(url, request_headers=BROWSER_UA)
        items = []
        for e in feed.entries:
            lang = (e.get("language") or "").lower()
            if lang and not lang.startswith("en"):
                continue
            d = _entry_date(e)
            if d is None or d < start or d > end:
                continue
            title = re.sub(r"<[^>]+>", "", e.get("title", ""))
            title = re.sub(r"\s+", " ", title).strip()
            summary = re.sub(r"<[^>]+>", " ", e.get("summary", ""))
            summary = re.sub(r"\s+", " ", summary).strip()
            if keyword_filter and not PHARMA_KEYWORDS.search(f"{title} {summary}"):
                continue
            items.append(
                {
                    "source": name,
                    "id": e.get("id") or e.get("link") or title,
                    "url": e.get("link", ""),
                    "title": title,
                    "date": d.isoformat(),
                    "summary": summary[:600],
                }
            )
        return items

    return fetch
