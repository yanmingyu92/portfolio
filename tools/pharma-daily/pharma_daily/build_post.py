"""Render content/posts/pharma-daily-<date>.md from the collected data.

Frontmatter and structure follow templates/note-template.md and the hard
requirements enforced by scripts/blog-qc.mjs (kind=note, >=150 words, no h1,
no banned phrases, inward /blog/ link). Sources are linked, never reproduced.
"""
from __future__ import annotations

import datetime as dt
import statistics

# Must point to a PUBLISHED (non-draft) post — the bootcamp series is drip-fed,
# so most series posts 404. Check with: curl -sI https://jaimeyan.com<path>
SITE_INWARD_LINK = "[LLM agents in regulated programming](/blog/why-llm-agents-fail-regulated-programming.html)"


def _money(usd: float | None) -> str:
    if usd is None:
        return "undisclosed"
    if usd >= 1e9:
        return f"${usd / 1e9:,.2f}B".replace(".00B", "B")
    return f"${usd / 1e6:,.0f}M"


def _esc(text: str) -> str:
    return (text or "").replace("|", "\\|").replace("\n", " ").strip()


def _clip(text: str, n: int) -> str:
    """Truncate at a word boundary with an ellipsis."""
    text = _esc(text)
    if len(text) <= n:
        return text
    return text[:n].rsplit(" ", 1)[0].rstrip(" ,;:") + "…"


def build_markdown(
    run_date: dt.date,
    start: dt.date,
    deals: list[dict],
    approvals: list[dict],
    readouts: list[dict],
    counts: list[tuple[str, int]],
    n_items: int,
    fig_names: list[str],
) -> str:
    slug = f"pharma-daily-{run_date.isoformat()}"
    try:
        day = run_date.strftime("%B %-d, %Y")
    except ValueError:  # Windows strftime lacks %-
        day = run_date.strftime("%B %d, %Y").replace(" 0", " ")

    title = f"Pharma Daily — {day}"
    description = (
        f"One pipeline, five first-hand sources: {len(deals)} deals, "
        f"{len(approvals)} FDA approvals and {len(readouts)} upcoming readouts, "
        f"collected and charted without an LLM."
    )
    if len(description) < 120:
        description += " All rows link to the original filing or release."
    description = description[:170]

    fm = [
        "---",
        f'title: "{title}"',
        f"date: {run_date.isoformat()}",
        f'description: "{description}"',
        'tags: ["pharma", "biotech", "daily-brief", "data-pipeline"]',
        "kind: note",
        f"canonicalPath: /blog/{slug}.html",
        "---",
        "",
    ]

    span = f"{start.strftime('%b %-d') if _supports_dash() else start.strftime('%b %d').replace(' 0', ' ')}–{day}"
    tldr = (
        f"> **TL;DR** — A small Python pipeline pulled {n_items} items from SEC EDGAR, "
        f"openFDA, ClinicalTrials.gov and two wire feeds for {span}: {len(deals)} deal events, "
        f"{len(approvals)} FDA approvals and {len(readouts)} Phase 2/3 readouts due within 90 days. "
        "Everything below is extracted heuristically — regex and keyword rules, no LLM — "
        "and every row links back to the original filing or press release."
    )

    parts = fm + [
        "Daily pharma news is mostly second-hand aggregation. This post is the output of a "
        "pipeline that skips the aggregators and reads only first-hand sources: regulator "
        "databases, trial registries and company wire releases.",
        "",
        tldr,
        "",
        "## Today's Deals",
        "",
    ]

    dated = [d for d in deals if d["total_usd"] is not None]
    if deals:
        parts += [
            "| Company | Type | Upfront | Total (incl. milestones) | Source |",
            "|---|---|---|---|---|",
        ]
        for d in deals[:10]:
            parts.append(
                f"| {_esc(d['companies']) or '—'} | {d['deal_type']} | {_money(d['upfront_usd'])} "
                f"| {_money(d['total_usd'])} | [filing / release]({d['source_url']}) |"
            )
        parts += ["", "*Table 1: Deal events in the collection window, sorted by disclosed total value.*", ""]
    else:
        parts += ["No deal events with structuring signals surfaced in this window.", ""]

    if dated:
        med = statistics.median(d["total_usd"] for d in dated)
        top = dated[0]
        parts.append(
            f"Deal-comp context: across {len(dated)} deals with disclosed values in the window, "
            f"the median total is {_money(med)}; the largest is {_money(top['total_usd'])} "
            f"({top['companies'] or 'undisclosed party'}). Milestone-heavy structures dominate, "
            "so headline totals overstate near-term cash."
        )
        parts.append("")

    if "deal-sizes" in fig_names:
        parts += [
            f"![Horizontal bar chart of disclosed deal values in US$ millions](/figures/{slug}-deal-sizes.png)",
            "",
            "*Figure 1: Disclosed total deal values collected this window.*",
            "",
        ]

    parts += ["## FDA & Approvals", ""]
    if approvals:
        parts += ["| Product (sponsor) | Date | Link |", "|---|---|---|"]
        for a in approvals[:8]:
            label = _esc(a["title"].removeprefix("FDA approval: "))
            parts.append(f"| {label} | {a['date']} | [Drugs@FDA]({a['url']}) |")
        parts += ["", "*Table 2: Approvals recorded in openFDA's Drugs@FDA feed this window.*", ""]
    else:
        parts += ["No new approvals surfaced in openFDA for this window.", ""]

    parts += ["## Readout Calendar", ""]
    if readouts:
        parts += [
            "| Primary completion | Phase | Sponsor | Study |",
            "|---|---|---|---|",
        ]
        for r in readouts[:10]:
            parts.append(
                f"| {r['date']} | {r.get('phase', '')} | {_clip(r['entity'], 30)} "
                f"| [{_clip(r['title'], 70)}]({r['url']}) |"
            )
        parts += [
            "",
            "*Table 3: Phase 2/3 studies on ClinicalTrials.gov with primary completion dates "
            "in the next 90 days (major sponsors prioritized, ranked by enrollment).*",
            "",
        ]
    else:
        parts += ["No qualifying readouts in the next 90 days.", ""]

    src_links = {}
    for coll in (deals, approvals, readouts):
        for it in coll:
            key = it.get("source_url") or it.get("url")
            if key and key not in src_links:
                src_links[key] = it.get("headline") or it.get("title") or key
    parts += ["## Sources", ""]
    for url, label in list(src_links.items())[:15]:
        parts.append(f"- [{_esc(label)[:90]}]({url})")
    parts += [
        "",
        "All items above are drawn from first-hand public sources — SEC filings, "
        "trial registries, and company releases. The same source-first discipline "
        f"is what I apply to {SITE_INWARD_LINK}.",
        "",
    ]
    return "\n".join(parts)


def _supports_dash() -> bool:
    try:
        dt.date(2026, 1, 5).strftime("%-d")
        return True
    except ValueError:
        return False
