"""Candidate-insight computation: the seven EDITORIAL.md moves, computed
deterministically so the writer's judgment stays anchored to the data.

Each insight is {move, text, numbers, confidence}. `text` is a draft-ready
sentence with the numbers inline; the writer may rephrase but may not alter
the numbers. Every number is traceable to pack fields. Nothing here is ML —
transparent thresholds declared as constants.
"""
from __future__ import annotations

import logging
import re
import statistics

log = logging.getLogger(__name__)

# move 1: classic license upfront share band (of headline total)
UPFRONT_BAND = (0.05, 0.10)
# move 4: |1-day move| that counts as a market verdict
MARKET_MOVE_THRESHOLD = 3.0
# move 5: readouts this close count as imminent binary events
IMMINENT_DAYS = 14
# move 7: a weekday window with zero approvals is noteworthy
# (weekends/holidays are not)

# crude but honest China-origin markers for move 3 — extend as the DB grows
CN_MARKERS = re.compile(
    r"(china|chinese|hong kong|hutchmed|akeso|gan.{0,8}lee|"
    r"hengrui|beigene|zai lab|innovent|hansoh|simcere|neushen|"
    r"wu\s?xi|kelun|legen|carsgen|remegen|junshi)",
    re.I,
)


def _i(move: str, text: str, numbers: dict) -> dict:
    return {"move": move, "text": text, "numbers": numbers, "confidence": "computed"}


def _who(d: dict) -> str:
    """Deal rows come in two shapes: fresh extractions (company/headline/
    source_title) and DB rows (companies/headline). Accept both."""
    return d.get("company") or d.get("companies") or ""


def _title(d: dict) -> str:
    return d.get("source_title") or d.get("headline") or ""


def insight_upfront_shares(deals: list[dict]) -> list[dict]:
    """Move 1: upfront share vs the 5-10% band, for deals disclosing both."""
    out = []
    for d in deals:
        up, tot = d.get("upfront_usd"), d.get("total_usd")
        if not up or not tot:
            continue
        share = up / tot
        who = _who(d) or _title(d)[:40]
        if share < UPFRONT_BAND[0]:
            out.append(_i("structure-over-headline",
                          f"{who}: upfront is {share * 100:.1f}% of the headline total "
                          f"— below the classic 5–10% license band; the headline overstates near-term cash.",
                          {"company": who, "upfront_usd": up, "total_usd": tot, "share": round(share, 4)}))
        elif share > UPFRONT_BAND[1]:
            out.append(_i("structure-over-headline",
                          f"{who}: upfront is {share * 100:.1f}% of the headline total "
                          f"— above the classic 5–10% band; the buyer paid real cash up front.",
                          {"company": who, "upfront_usd": up, "total_usd": tot, "share": round(share, 4)}))
    return out


def insight_window_pattern(deals: list[dict]) -> list[dict]:
    """Move 3: China-origin concentration among disclosed-value deals."""
    disclosed = [d for d in deals if d.get("total_usd")]
    if len(disclosed) < 2:
        return []
    cn = [d for d in disclosed
          if CN_MARKERS.search(f"{_who(d)} {_title(d)}")]
    if len(cn) < 2:
        return []
    total_all = sum(d["total_usd"] for d in disclosed)
    total_cn = sum(d["total_usd"] for d in cn)
    share = total_cn / total_all if total_all else 0
    return [_i("window-pattern",
               f"{len(cn)} of {len(disclosed)} disclosed-value deals involve China-originated "
               f"assets, {share * 100:.0f}% of the window's disclosed dollars.",
               {"cn_deals": len(cn), "disclosed_deals": len(disclosed),
                "cn_total_usd": total_cn, "all_total_usd": total_all})]


def insight_market_verdict(deals: list[dict], market: list[dict]) -> list[dict]:
    """Move 4: outsized ticker moves attached to window deals."""
    tickers_in_deals = {d.get("ticker") for d in deals if d.get("ticker")}
    out = []
    for m in market:
        chg = m.get("change_1d_pct")
        if chg is None or abs(chg) < MARKET_MOVE_THRESHOLD:
            continue
        linked = m["ticker"] in (tickers_in_deals or set())
        note = "on a deal ticker" if linked else "on a tracked ticker"
        out.append(_i("market-verdict",
                      f"{m['ticker']} moved {chg:+.1f}% on the day ({note}, as of {m.get('as_of')}).",
                      {"ticker": m["ticker"], "change_1d_pct": chg, "as_of": m.get("as_of"),
                       "deal_linked": linked}))
    return out


def insight_imminent_readouts(readouts: list[dict], today: str) -> list[dict]:
    """Move 5: readouts landing within IMMINENT_DAYS days."""
    import datetime as dt
    t0 = dt.date.fromisoformat(today)
    soon = []
    for r in readouts:
        try:
            d = dt.date.fromisoformat(r.get("primary_completion", "")[:10])
        except ValueError:
            continue
        if 0 <= (d - t0).days <= IMMINENT_DAYS:
            soon.append(r)
    if not soon:
        return []
    names = "; ".join(f"{r['sponsor']} {r['phase']} ({r['primary_completion']})" for r in soon[:3])
    return [_i("calendar-consequence",
               f"{len(soon)} ranked readout(s) land within {IMMINENT_DAYS} days: {names}.",
               {"count": len(soon), "ncts": [r["nct"] for r in soon]})]


def insight_delta_vs_baseline(deals_today: int, approvals_today: int,
                              trailing_deals: float | None, trailing_approvals: float | None) -> list[dict]:
    """Move 6: today's counts vs trailing 28-day daily averages."""
    out = []
    if trailing_deals is not None and trailing_deals > 0:
        ratio = deals_today / trailing_deals
        if ratio >= 1.5 or ratio <= 0.67:
            out.append(_i("delta-vs-baseline",
                          f"{deals_today} deal events vs a 28-day daily average of "
                          f"{trailing_deals:.1f} ({ratio:.1f}x).",
                          {"today": deals_today, "trailing_avg": round(trailing_deals, 2)}))
    if trailing_approvals is not None and trailing_approvals > 0:
        ratio = approvals_today / trailing_approvals
        if ratio >= 1.5 or ratio <= 0.67:
            out.append(_i("delta-vs-baseline",
                          f"{approvals_today} approvals vs a 28-day daily average of "
                          f"{trailing_approvals:.1f} ({ratio:.1f}x).",
                          {"today": approvals_today, "trailing_avg": round(trailing_approvals, 2)}))
    return out


def insight_absence(approvals_today: int, window_is_weekday: bool) -> list[dict]:
    """Move 7: absence as signal."""
    if approvals_today == 0 and window_is_weekday:
        return [_i("absence-as-signal",
                   "Zero FDA approvals in a weekday window — quiet days cluster before "
                   "PDUFA batches; watch the next 5 sessions for a catch-up.",
                   {"approvals": 0})]
    return []


def compute_insights(deals: list[dict], approvals: list[dict], readouts: list[dict],
                     market: list[dict], run_date: str,
                     trailing_deals: float | None = None,
                     trailing_approvals: float | None = None) -> list[dict]:
    """All candidate insights for the pack. Order = editorial priority."""
    import datetime as dt
    d0 = dt.date.fromisoformat(run_date)
    insights = []
    insights += insight_upfront_shares(deals)
    insights += insight_window_pattern(deals)
    insights += insight_market_verdict(deals, market)
    insights += insight_imminent_readouts(readouts, run_date)
    insights += insight_delta_vs_baseline(len(deals), len(approvals),
                                          trailing_deals, trailing_approvals)
    insights += insight_absence(len(approvals), d0.weekday() < 5)
    log.info("insights: %d candidates (%s)", len(insights),
             ", ".join(sorted({i["move"] for i in insights})) or "none")
    return insights
