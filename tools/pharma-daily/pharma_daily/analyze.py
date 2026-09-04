"""Matplotlib charts for the daily brief — Pharma Daily visual identity.

Distinct from the tech sections: teal accent (#0f766e) on warm paper,
fixed 1200x630 canvas, left-aligned takeaway title + context subtitle +
source footnote. Sparse-data rules: with fewer than 3 disclosed deals the
"chart" becomes a typographic headline-number card (a one-bar bar chart is
worse than no chart); the market-reaction chart requires >=2 tickers and a
>=1pp spread, otherwise it is skipped as noise.

Every figure still carries a takeaway-style title (a conclusion), per
EDITORIAL.md. Each chart function returns (path, takeaway) or None when
there is nothing honest to draw.
"""
from __future__ import annotations

import html
import logging
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

log = logging.getLogger(__name__)

STYLE_PATH = Path(__file__).resolve().parent / "analysis" / "style.mplstyle"
plt.style.use(STYLE_PATH)

# Pharma Daily palette (teal, distinct from the site's rose tech identity)
INK = "#1c1917"
INK_SOFT = "#44403c"
INK_MUTE = "#78716c"
PAPER = "#fbfaf8"
LINE = "#e7e5e4"
TEAL = "#0f766e"
TEAL_SOFT = "#99e3d5"
TEAL_FAINT = "#d9f0ec"

FIG_W, FIG_H = 7.5, 3.9375  # 1200x630 @ 160dpi


def _money_m(usd: float) -> str:
    if usd >= 1e9:
        return f"${usd / 1e9:,.1f}B".replace(".0B", "B")
    return f"${usd / 1e6:,.0f}M"


def _new_fig():
    fig = plt.figure(figsize=(FIG_W, FIG_H))
    fig.patch.set_facecolor(PAPER)
    return fig


def _chrome(fig, title: str, subtitle: str, footnote: str) -> None:
    """Title (conclusion) + subtitle (context) + footnote (source/method)."""
    fig.text(0.055, 0.925, title, fontsize=15.5, fontweight="bold", color=INK,
             ha="left", va="top")
    fig.text(0.055, 0.855, subtitle, fontsize=10.5, color=INK_MUTE,
             ha="left", va="top")
    fig.text(0.055, 0.035, footnote, fontsize=8, color=INK_MUTE,
             ha="left", va="bottom")
    # brand mark
    fig.text(0.945, 0.035, "Pharma Daily · jaimeyan.com", fontsize=8,
             color=TEAL, ha="right", va="bottom", fontweight="bold")


def chart_deal_sizes(
    deals: list[dict], out: Path, top_n: int = 8, n_historical: int = 0
) -> tuple[Path, str] | None:
    """Disclosed deal values: bar chart, or a headline-number card when the
    disclosed set is too thin (<3) for a chart to be honest."""
    rows = [d for d in deals if d.get("total_usd")][:top_n]
    if not rows:
        log.warning("no disclosed deal sizes — skipping deal-size figure")
        return None
    rows.sort(key=lambda d: d["total_usd"])
    top = rows[-1]

    if len(rows) < 3:
        # headline-number card: one big number beats a one-bar chart
        fig = _new_fig()
        ax = fig.add_axes([0, 0, 1, 1])
        ax.axis("off")
        ax.add_patch(plt.Rectangle((0.055, 0.18), 0.012, 0.52, color=TEAL,
                                   transform=fig.transFigure, clip_on=False))
        fig.text(0.10, 0.62, _money_m(top["total_usd"]), fontsize=64,
                 fontweight="bold", color=TEAL, ha="left", va="center")
        fig.text(0.10, 0.40, (top.get("companies") or top.get("headline", ""))[:60],
                 fontsize=14, color=INK, ha="left", va="center")
        detail = "largest disclosed total in the window"
        if top.get("upfront_usd"):
            detail += f" — upfront {_money_m(top['upfront_usd'])} ({top['upfront_usd'] / top['total_usd'] * 100:.1f}% of headline)"
        fig.text(0.10, 0.30, detail, fontsize=11, color=INK_SOFT, ha="left", va="center")
        takeaway = f"Largest disclosed deal: {_money_m(top['total_usd'])} ({(top.get('companies') or 'undisclosed party')[:30]})"
        _chrome(fig, takeaway,
                f"{len(rows)} deal(s) disclosed terms this window — too few for a distribution view",
                "Source: first-hand filings and releases via the pharma-daily pipeline. Totals include contingent milestones.")
        fig.savefig(out)
        plt.close(fig)
        log.info("wrote %s (headline card)", out)
        return out, takeaway

    # bar chart (>=3 disclosed deals): labels sit above bars so long names
    # and headline-derived labels never get clipped by the axes
    values = [d["total_usd"] / 1e6 for d in rows]
    fig = _new_fig()
    n = len(rows)
    ax = fig.add_axes([0.055, 0.10, 0.89, 0.62])
    ax.set_facecolor(PAPER)
    colors = [TEAL_SOFT] * (n - 1) + [TEAL]
    bars = ax.barh(range(n), values, color=colors, height=0.52)
    vmax = max(values)
    for i, d in enumerate(rows):
        raw_label = d.get("companies") or d.get("headline", "")
        label = html.unescape(raw_label)
        if len(label) > 50:
            label = label[:49].rsplit(" ", 1)[0] + "…"
        ax.text(0, i + 0.42, label, fontsize=10.5, color=INK_SOFT,
                ha="left", va="bottom")
        note = _money_m(d["total_usd"])
        if d.get("percentile_total") is not None and n_historical >= 30:
            note += f"  ·  p{d['percentile_total']:.0f}"
        ax.text(values[i] + vmax * 0.015, i, note, va="center", fontsize=11,
                color=INK, fontweight="bold" if i == n - 1 else "normal")
    ax.set_xlim(0, vmax * 1.22)
    ax.set_ylim(-0.6, n - 0.1)
    ax.axis("off")

    hist_note = f"vs {n_historical} accumulated comps" if n_historical else "comp base still accumulating"
    takeaway = f"Largest disclosed total {_money_m(top['total_usd'])} — {hist_note}"
    _chrome(fig, takeaway,
            f"{len(rows)} deals disclosed terms this window; values are headline totals incl. milestones",
            "Source: SEC EDGAR 8-K filings and company releases via the pharma-daily pipeline.")
    fig.savefig(out)
    plt.close(fig)
    log.info("wrote %s", out)
    return out, takeaway


def chart_market_reaction(quotes: list[dict], out: Path) -> tuple[Path, str] | None:
    """1-day % change for deal tickers. Skipped unless >=2 tickers with a
    >=1pp spread — a single flat bar is noise, not signal."""
    rows = [q for q in quotes if q.get("change_1d_pct") is not None]
    if len(rows) < 2:
        log.warning("fewer than 2 quoted tickers — skipping market-reaction figure")
        return None
    rows.sort(key=lambda q: q["change_1d_pct"])
    values = [q["change_1d_pct"] for q in rows]
    if max(values) - min(values) < 1.0:
        log.warning("ticker spread <1pp — skipping market-reaction figure as noise")
        return None
    labels = [q["ticker"] for q in rows]
    colors = [TEAL if v >= 0 else "#b91c1c" for v in values]

    fig = _new_fig()
    ax = fig.add_axes([0.16, 0.14, 0.66, 0.60])
    ax.set_facecolor(PAPER)
    ax.barh(labels, values, color=colors, height=0.58)
    span = max(values) - min(values)
    pad = max(span * 0.30, 0.5)
    lo, hi = min(values) - pad, max(values) + pad
    # always include zero so sign is visible at a glance
    lo, hi = min(lo, -0.3), max(hi, 0.3)
    ax.set_xlim(lo, hi)
    ax.axvline(0, color=INK_MUTE, linewidth=0.9)
    for i, v in enumerate(values):
        ax.text(v + (pad * 0.06 if v >= 0 else -pad * 0.06), i, f"{v:+.1f}%",
                va="center", ha="left" if v >= 0 else "right", fontsize=10.5,
                color=INK, fontweight="bold")
    ax.set_xticks([])
    for s in ("top", "right", "bottom"):
        ax.spines[s].set_visible(False)
    ax.spines["left"].set_color(LINE)
    ax.tick_params(axis="y", labelsize=11, colors=INK_SOFT, length=0)
    ax.grid(False)

    up = sum(1 for v in values if v > 0)
    best = rows[-1]
    takeaway = f"{best['ticker']} led deal tickers at {best['change_1d_pct']:+.1f}%; {up} of {len(values)} rose"
    _chrome(fig, takeaway,
            f"1-day close-to-close change, as of {rows[-1].get('as_of', 'n/a')}",
            "Source: Yahoo Finance (Stooq fallback) via the pharma-daily pipeline. Not investment advice.")
    fig.savefig(out)
    plt.close(fig)
    log.info("wrote %s", out)
    return out, takeaway
