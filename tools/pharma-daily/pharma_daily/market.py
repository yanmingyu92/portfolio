"""Market-data adapter: 1-day % change for tickers appearing in deals.

Primary source is yfinance (Yahoo Finance chart API). If yfinance is not
installed, errors, or rate-limits, each ticker falls back to Stooq's CSV
quote endpoint (https://stooq.com/q/l/?s=<ticker>.us&f=sd2t2ohlcv&h&e=csv),
with the previous close taken from Stooq's daily-history CSV so the % change
is close-to-close, not intraday. Every ticker is isolated: one failure never
drops the others.
"""
from __future__ import annotations

import datetime as dt
import logging

import requests

from pharma_daily.sources.common import BROWSER_UA, TIMEOUT

log = logging.getLogger(__name__)

STOOQ_QUOTE = "https://stooq.com/q/l/?s={sym}&f=sd2t2ohlcv&h&e=csv"
STOOQ_HIST = "https://stooq.com/q/d/l/?s={sym}&i=d"


def _pct(close: float, prev: float) -> float:
    return round((close - prev) / prev * 100, 2)


def _yf_quote(ticker: str) -> dict | None:
    import yfinance as yf

    hist = yf.Ticker(ticker).history(period="5d", auto_adjust=False)
    closes = hist["Close"].dropna()
    if len(closes) < 2:
        return None
    as_of = hist.index[-1].date().isoformat()
    return {
        "ticker": ticker,
        "change_1d_pct": _pct(float(closes.iloc[-1]), float(closes.iloc[-2])),
        "as_of": as_of,
    }


def _stooq_quote(ticker: str) -> dict | None:
    sym = f"{ticker.lower()}.us"
    r = requests.get(STOOQ_QUOTE.format(sym=sym), headers=BROWSER_UA, timeout=TIMEOUT)
    r.raise_for_status()
    rows = [ln.split(",") for ln in r.text.strip().splitlines() if ln.strip()]
    if len(rows) < 2 or rows[1][0] == "N/D":
        return None
    _, date_s, _time, open_, _high, _low, close, _vol = rows[1][:8]
    close = float(close)
    prev = None
    try:
        h = requests.get(STOOQ_HIST.format(sym=sym), headers=BROWSER_UA, timeout=TIMEOUT)
        h.raise_for_status()
        hrows = [ln.split(",") for ln in h.text.strip().splitlines() if ln.strip()]
        hist = [row for row in hrows[1:] if len(row) >= 5 and row[1] != date_s]
        if hist:
            prev = float(hist[-1][4])  # last close before the quote date
    except Exception as e:  # noqa: BLE001 - fall through to open-vs-close
        log.debug("stooq history failed for %s: %s", ticker, e)
    change = _pct(close, prev) if prev else _pct(close, float(open_))
    return {"ticker": ticker, "change_1d_pct": change, "as_of": date_s}


def fetch_quotes(tickers: list[str]) -> list[dict]:
    """1-day % change per ticker: [{ticker, change_1d_pct, as_of}]."""
    quotes = []
    for t in dict.fromkeys(t.strip().upper() for t in tickers if t):
        row = None
        try:
            row = _yf_quote(t)
        except ImportError:
            log.warning("yfinance not installed — using Stooq for %s", t)
        except Exception as e:  # noqa: BLE001 - rate limits, network, schema changes
            log.info("yfinance failed for %s (%s) — trying Stooq", t, e)
        if row is None:
            try:
                row = _stooq_quote(t)
            except Exception as e:  # noqa: BLE001
                log.warning("market data unavailable for %s: %s", t, e)
        if row:
            quotes.append(row)
    log.info("market: %d/%d tickers quoted", len(quotes), len(dict.fromkeys(tickers)))
    return quotes
