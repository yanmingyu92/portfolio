"""Matplotlib charts for the daily brief.

All figures share pharma_daily/analysis/style.mplstyle (stone-800 #292524
text, rose #f43f5e accents) and carry takeaway-style titles — a conclusion,
not a description (per EDITORIAL.md §4). Each chart function returns
(path, takeaway) or None when there is nothing honest to draw.
"""
from __future__ import annotations

import logging
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

log = logging.getLogger(__name__)

STYLE_PATH = Path(__file__).resolve().parent / "analysis" / "style.mplstyle"
plt.style.use(STYLE_PATH)

STONE_800 = "#292524"
STONE_300 = "#d6d3d1"
ROSE_500 = "#f43f5e"
ROSE_300 = "#fda4af"


def _money_m(usd: float) -> str:
    if usd >= 1e9:
        return f"${usd / 1e9:,.1f}B"
    return f"${usd / 1e6:,.0f}M"


def chart_deal_sizes(
    deals: list[dict], out: Path, top_n: int = 10, n_historical: int = 0
) -> tuple[Path, str] | None:
    """Horizontal bar chart of disclosed deal values with percentile context.

    Bars are annotated with the empirical-CDF percentile of each total within
    the accumulated deals table (deals carry percentile_total when the
    pipeline computed one).
    """
    rows = [d for d in deals if d.get("total_usd")][:top_n]
    if not rows:
        log.warning("no disclosed deal sizes — skipping deal-size chart")
        return None
    rows.sort(key=lambda d: d["total_usd"])
    labels = [(d.get("companies") or d.get("headline", "")[:40])[:38] for d in rows]
    values = [d["total_usd"] / 1e6 for d in rows]

    fig, ax = plt.subplots(figsize=(7.2, 0.5 * len(rows) + 1.8))
    ax.barh(labels, values, color=ROSE_500, height=0.62)
    for i, d in enumerate(rows):
        note = _money_m(d["total_usd"])
        if d.get("percentile_total") is not None:
            note += f" · p{d['percentile_total']:.0f}"
        ax.text(values[i] + max(values) * 0.01, i, note, va="center", fontsize=9, color=STONE_800)
    ax.set_xlabel("Disclosed deal value (US$ millions, total incl. milestones)")
    ax.set_xlim(0, max(values) * 1.30)
    ax.grid(axis="x", color=STONE_300, linewidth=0.6, alpha=0.7)
    ax.grid(axis="y", visible=False)

    top = rows[-1]
    if top.get("percentile_total") is not None and n_historical:
        takeaway = (
            f"Largest disclosed total {_money_m(top['total_usd'])} — "
            f"p{top['percentile_total']:.0f} of {n_historical} comps"
        )
    else:
        takeaway = (
            f"{len(rows)} deals disclosed totals; largest {_money_m(top['total_usd'])}"
        )
    ax.set_title(takeaway, loc="left", fontsize=11, fontweight="bold", color=STONE_800)
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    log.info("wrote %s", out)
    return out, takeaway


def chart_category_counts(counts: list[tuple[str, int]], out: Path) -> tuple[Path, str] | None:
    """Bar chart of news-item counts by category for the period."""
    if not counts:
        log.warning("no items — skipping category chart")
        return None
    labels = [c for c, _ in counts]
    values = [n for _, n in counts]
    total = sum(values)

    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    bars = ax.bar(labels, values, color=[ROSE_500] + [ROSE_300] * (len(values) - 1), width=0.58)
    for b, v in zip(bars, values):
        ax.text(b.get_x() + b.get_width() / 2, v + max(values) * 0.02, str(v), ha="center", fontsize=9)
    ax.set_ylabel("Items collected")
    ax.set_ylim(0, max(values) * 1.18)
    plt.setp(ax.get_xticklabels(), rotation=20, ha="right")

    takeaway = f"{labels[0]} is the largest slice: {values[0]} of {total} first-hand items"
    ax.set_title(takeaway, loc="left", fontsize=11, fontweight="bold", color=STONE_800)
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    log.info("wrote %s", out)
    return out, takeaway


def chart_market_reaction(quotes: list[dict], out: Path) -> tuple[Path, str] | None:
    """1-day % change for tickers appearing in this window's deals."""
    rows = [q for q in quotes if q.get("change_1d_pct") is not None]
    if not rows:
        log.warning("no market quotes — skipping market-reaction chart")
        return None
    rows.sort(key=lambda q: q["change_1d_pct"])
    labels = [q["ticker"] for q in rows]
    values = [q["change_1d_pct"] for q in rows]
    colors = [ROSE_500 if v >= 0 else STONE_300 for v in values]

    fig, ax = plt.subplots(figsize=(7.2, 0.55 * len(rows) + 1.8))
    ax.barh(labels, values, color=colors, height=0.6)
    for i, v in enumerate(values):
        offset = 0.02 * (max(values) - min(values) or 1)
        ax.text(
            v + (offset if v >= 0 else -offset), i, f"{v:+.1f}%",
            va="center", ha="left" if v >= 0 else "right", fontsize=9, color=STONE_800,
        )
    ax.axvline(0, color=STONE_800, linewidth=0.8)
    ax.set_xlabel(f"1-day change, % (as of {rows[-1].get('as_of', 'n/a')})")
    pad = (max(values) - min(values) or 1) * 0.25
    ax.set_xlim(min(values) - pad, max(values) + pad)
    ax.grid(axis="x", color=STONE_300, linewidth=0.6, alpha=0.7)
    ax.grid(axis="y", visible=False)

    up = sum(1 for v in values if v > 0)
    takeaway = (
        f"{up} of {len(values)} deal tickers rose on the day; "
        f"moves span {min(values):+.1f}% to {max(values):+.1f}%"
    )
    ax.set_title(takeaway, loc="left", fontsize=11, fontweight="bold", color=STONE_800)
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    log.info("wrote %s", out)
    return out, takeaway
