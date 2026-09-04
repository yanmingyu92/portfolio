"""CLI entry: uv run python daily.py --days 7

Fetches the last N days from first-hand sources, structures deals into
SQLite, runs comps/readout/market analysis, renders charts, writes the
data pack (out/pack/<date>.json — the writer-agent contract), and
optionally writes the blog post + figures into the site.
"""
from __future__ import annotations

import argparse
import datetime as dt
import logging
import shutil
import sys
from pathlib import Path

from pharma_daily import analyze, build_post, extract, fetch, market, pack, store
from pharma_daily.analysis import comps, readouts as readout_rank

TOOL_DIR = Path(__file__).resolve().parent
SITE_ROOT = TOOL_DIR.parents[1]
DB_PATH = TOOL_DIR / "data" / "pharma.db"
FIG_DIR = TOOL_DIR / "out" / "figures"
PACK_DIR = TOOL_DIR / "out" / "pack"

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("daily")


def main() -> int:
    ap = argparse.ArgumentParser(description="pharma-daily pipeline")
    ap.add_argument("--days", type=int, default=1, help="lookback window in days (default 1)")
    ap.add_argument(
        "--filing-text",
        action="store_true",
        help="also stream EDGAR filing bodies to mine dollar amounts (slower)",
    )
    ap.add_argument("--no-post", action="store_true", help="skip writing into the site")
    args = ap.parse_args()

    end = dt.date.today()
    start = end - dt.timedelta(days=args.days - 1)
    log.info("window: %s .. %s", start, end)

    # --- fetch (registry: each source isolated, failures recorded) ---
    res = fetch.fetch_all(start, end)

    # --- structure ---
    text_getter = None
    if args.filing_text:
        fetched = 0

        def text_getter(url: str):  # noqa: F811
            nonlocal fetched
            if fetched >= 15:  # be polite to EDGAR
                return ""
            fetched += 1
            return fetch.fetch_filing_text(url)

    deals = extract.extract_deals(res.items + res.approvals, filing_text=text_getter)

    # --- store (idempotent upserts) ---
    conn = store.connect(DB_PATH)
    with conn:
        for it in res.items + res.approvals + res.readouts:
            store.upsert_item(conn, it, extract.categorize_item(it))
        for d in deals:
            store.upsert_deal(conn, d)
    db_counts = store.counts(conn)
    log.info("db: %d items, %d deals (total)", db_counts["items"], db_counts["deals"])

    # --- analysis ---
    s, e = start.isoformat(), end.isoformat()
    # dedupe at read time too: cross-outlet dupes can persist in the DB from
    # runs before the extractor-level dedupe existed
    period_deals = extract.dedupe_deals([dict(r) for r in store.deals_between(conn, s, e)])
    # comps compare like with like: licenses/collaborations/acquisitions only,
    # never financings (a $60M Series B is not a BD comp)
    COMP_TYPES = ("license", "collaboration", "acquisition")
    comp_deals = [d for d in period_deals if d.get("deal_type") in COMP_TYPES]
    historical_totals = store.all_deal_totals(conn, COMP_TYPES)
    comps.annotate_percentiles(comp_deals, historical_totals)
    comps_block = comps.comps_summary(historical_totals)

    ranked_readouts = readout_rank.rank_readouts([dict(r) for r in res.readouts], keep=25)

    tickers = [d["ticker"] for d in period_deals if d.get("ticker")]
    quotes = market.fetch_quotes(tickers) if tickers else []

    period_items = store.items_between(conn, s, e)
    cat_counts = store.category_counts(conn, s, e)
    # readouts carry future dates so the windowed count misses them; add explicitly
    if ranked_readouts:
        cat_counts = sorted(
            cat_counts + [("readout-calendar", len(ranked_readouts))],
            key=lambda t: t[1],
            reverse=True,
        )

    # --- figures ---
    fig_out = FIG_DIR / end.isoformat()
    fig_out.mkdir(parents=True, exist_ok=True)
    figs: dict[str, Path] = {}
    figures_meta: list[dict] = []
    for name, result in (
        ("deal-sizes", analyze.chart_deal_sizes(
            comp_deals, fig_out / "deal-sizes.png", n_historical=comps_block["n_historical"])),
        ("categories", analyze.chart_category_counts(cat_counts, fig_out / "categories.png")),
        ("market-reaction", analyze.chart_market_reaction(quotes, fig_out / "market-reaction.png")),
    ):
        if result:
            path, takeaway = result
            figs[name] = path
            figures_meta.append({
                "path": str(path.relative_to(TOOL_DIR)),
                "takeaway": takeaway,
            })

    # --- data pack (writer-agent contract) ---
    pack_dict = pack.build_pack(
        run_date=end,
        start=start,
        deals=period_deals,
        approvals=res.approvals,
        readouts=ranked_readouts,
        market=quotes,
        comps=comps_block,
        figures=figures_meta,
        sources_ok=res.ok,
        sources_failed=res.failed,
    )
    errors = pack.validate_pack(pack_dict)
    if errors:
        for err in errors:
            log.warning("pack validation: %s", err)
    pack_path = pack.write_pack(pack_dict, PACK_DIR)

    # --- render post ---
    md = build_post.build_markdown(
        run_date=end,
        start=start,
        deals=period_deals,
        approvals=res.approvals,
        readouts=ranked_readouts,
        counts=cat_counts,
        n_items=len(period_items),
        fig_names=list(figs),
    )

    if args.no_post:
        (TOOL_DIR / "out").mkdir(exist_ok=True)
        post_path = TOOL_DIR / "out" / f"pharma-daily-{end.isoformat()}.md"
        post_path.write_text(md, encoding="utf-8")
        log.info("post written to %s (not copied into site)", post_path)
    else:
        slug = f"pharma-daily-{end.isoformat()}"
        post_path = SITE_ROOT / "content" / "posts" / f"{slug}.md"
        post_path.write_text(md, encoding="utf-8")
        fig_site = SITE_ROOT / "public" / "figures"
        for name, src in figs.items():
            shutil.copy2(src, fig_site / f"{slug}-{name}.png")
        log.info("post -> %s; figures -> %s", post_path, fig_site)

    conn.close()
    log.info("done. pack: %s", pack_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
