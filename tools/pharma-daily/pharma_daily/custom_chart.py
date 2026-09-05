"""Chart-of-the-day renderer: LLM proposes a JSON spec, we render it
deterministically. The LLM never writes code or SQL strings — the spec is a
structured query builder over the pharma.db whitelist, so numbers always
come from the database itself and injection is impossible by construction.

Spec shape (validated by validate_spec):

{
  "chart_type": "barh" | "bar" | "line" | "scatter",
  "title_takeaway": "conclusion, not a description",   # required
  "subtitle": "context line",
  "query": {
    "table": "deals" | "items",
    "select": {"x": "<column>", "y": "<column or agg>"},
    "agg": "none" | "count" | "sum" | "avg" | "min" | "max",
    "where": [{"col": "...", "op": "=|!=|>=|<=|>|<|like", "val": "..."}],
    "group_by": "<column>",          # required when agg != none
    "order_by": "<column>",          # optional, add "desc" suffix for desc
    "limit": 50                       # hard cap 50
  },
  "labels": {"x": "...", "y": "..."},
  "source_note": "method shown under the figure"
}

CLI: uv run python -m pharma_daily.custom_chart spec.json out.png
Exit 2 on validation failure (caller falls back to template figures).
"""
from __future__ import annotations

import argparse
import json
import logging
import sqlite3
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

log = logging.getLogger(__name__)

DB_DEFAULT = Path(__file__).resolve().parent.parent / "data" / "pharma.db"

# pharma visual identity (mirrors analyze.py)
INK, INK_SOFT, INK_MUTE = "#1c1917", "#44403c", "#78716c"
PAPER, LINE = "#fbfaf8", "#e7e5e4"
TEAL, TEAL_SOFT = "#0f766e", "#99e3d5"
FIG_W, FIG_H = 7.5, 3.9375  # 1200x630 @ 160dpi

ALLOWED_TABLES = {
    "deals": {"source_url", "date", "companies", "deal_type", "upfront_usd",
              "total_usd", "headline", "source", "ticker", "licensor",
              "licensee", "therapeutic_area", "modality", "phase", "target"},
    "items": {"id", "source", "url", "title", "date", "category", "entity", "summary"},
}
ALLOWED_AGGS = {"none", "count", "sum", "avg", "min", "max"}
ALLOWED_OPS = {"=", "!=", ">=", "<=", ">", "<", "like"}
MAX_ROWS = 50
MIN_TAKEAWAY_LEN = 20


class SpecError(ValueError):
    pass


def validate_spec(spec: dict) -> dict:
    """Return a normalized spec or raise SpecError."""
    if not isinstance(spec, dict):
        raise SpecError("spec is not an object")
    ct = spec.get("chart_type")
    if ct not in ("barh", "bar", "line", "scatter"):
        raise SpecError(f"chart_type must be barh|bar|line|scatter, got {ct!r}")
    takeaway = (spec.get("title_takeaway") or "").strip()
    if len(takeaway) < MIN_TAKEAWAY_LEN:
        raise SpecError("title_takeaway missing or too short (a conclusion, >=20 chars)")

    q = spec.get("query")
    if not isinstance(q, dict):
        raise SpecError("query missing")
    table = q.get("table")
    if table not in ALLOWED_TABLES:
        raise SpecError(f"table must be one of {sorted(ALLOWED_TABLES)}")
    cols = ALLOWED_TABLES[table]
    sel = q.get("select") or {}
    x, y = sel.get("x"), sel.get("y")
    if x not in cols:
        raise SpecError(f"select.x {x!r} not a column of {table}")
    agg = q.get("agg", "none")
    if agg not in ALLOWED_AGGS:
        raise SpecError(f"agg must be one of {sorted(ALLOWED_AGGS)}")
    if agg == "count":
        y = "*"
    elif y not in cols:
        raise SpecError(f"select.y {y!r} not a column of {table}")
    if agg != "none" and not q.get("group_by"):
        raise SpecError("group_by required when aggregating")
    if q.get("group_by") and q["group_by"] not in cols:
        raise SpecError("group_by not a column")

    where = []
    for w in q.get("where", []):
        col, op = w.get("col"), w.get("op")
        if col not in cols or op not in ALLOWED_OPS:
            raise SpecError(f"bad where clause {w!r}")
        where.append({"col": col, "op": op, "val": w.get("val")})
    limit = min(int(q.get("limit", MAX_ROWS)), MAX_ROWS)
    order_by = q.get("order_by")
    if order_by:
        base = order_by.replace(" desc", "").replace(" asc", "")
        if base not in cols and base != "y":
            raise SpecError(f"order_by {order_by!r} not a column")

    return {
        "chart_type": ct,
        "title_takeaway": takeaway,
        "subtitle": (spec.get("subtitle") or "").strip(),
        "query": {"table": table, "x": x, "y": y, "agg": agg,
                  "group_by": q.get("group_by"), "where": where,
                  "order_by": order_by, "limit": limit},
        "labels": spec.get("labels") or {},
        "source_note": (spec.get("source_note") or "").strip(),
    }


def run_query(spec: dict, db_path: Path) -> tuple[list[str], list[float]]:
    """Execute the whitelisted query builder; return (x labels, y values)."""
    q = spec["query"]
    agg_sql = {"none": q["y"], "count": "COUNT(*)"}.get(q["agg"]) or f"{q['agg'].upper()}({q['y']})"
    sql = f"SELECT {q['x']}, {agg_sql} AS y FROM {q['table']}"
    params: list = []
    if q["where"]:
        clauses = []
        for w in q["where"]:
            clauses.append(f"{w['col']} {w['op']} ?")
            params.append(w["val"])
        sql += " WHERE " + " AND ".join(clauses)
    if q["group_by"]:
        sql += f" GROUP BY {q['group_by']}"
    if q["order_by"]:
        col = q["order_by"].replace(" desc", "").replace(" asc", "")
        col = "y" if col == "y" else col
        direction = " DESC" if q["order_by"].endswith(" desc") else ""
        sql += f" ORDER BY {col}{direction}"
    sql += f" LIMIT {q['limit']}"

    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        rows = conn.execute(sql, params).fetchall()
    finally:
        conn.close()
    rows = [(str(r[0]), float(r[1])) for r in rows if r[0] is not None and r[1] is not None]
    if not rows:
        raise SpecError("query returned zero rows — refusing to render an empty figure")
    return [r[0] for r in rows], [r[1] for r in rows]


def render(spec: dict, xs: list[str], ys: list[float], out: Path) -> None:
    import textwrap

    fig = plt.figure(figsize=(FIG_W, FIG_H))
    fig.patch.set_facecolor(PAPER)
    ct = spec["chart_type"]
    # barh needs a wide left gutter for category labels
    rect = [0.26, 0.18, 0.66, 0.54] if ct == "barh" else [0.10, 0.20, 0.82, 0.52]
    ax = fig.add_axes(rect)
    ax.set_facecolor(PAPER)
    if ct == "barh":
        ax.barh(xs, ys, color=TEAL, height=0.6)
        ax.tick_params(axis="y", labelsize=10, colors=INK_SOFT)
    elif ct == "bar":
        ax.bar(xs, ys, color=TEAL, width=0.6)
        plt.setp(ax.get_xticklabels(), rotation=20, ha="right")
    elif ct == "line":
        ax.plot(xs, ys, color=TEAL, marker="o", markersize=4, linewidth=2)
        plt.setp(ax.get_xticklabels(), rotation=20, ha="right")
    else:  # scatter
        ax.scatter(range(len(xs)), ys, color=TEAL, s=36, zorder=3)
        ax.set_xticks(range(len(xs)), xs)
        plt.setp(ax.get_xticklabels(), rotation=20, ha="right")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(LINE)
    ax.tick_params(colors=INK_MUTE, labelsize=9)
    ax.grid(axis="y" if ct != "barh" else "x", color=LINE, linewidth=0.6, alpha=0.7)
    ax.set_axisbelow(True)
    if ct != "barh":
        if spec["labels"].get("y"):
            ax.set_ylabel(spec["labels"]["y"], fontsize=9.5, color=INK_SOFT)
        if spec["labels"].get("x"):
            ax.set_xlabel(spec["labels"]["x"], fontsize=9.5, color=INK_SOFT)

    title = "\n".join(textwrap.wrap(spec["title_takeaway"], 88)[:2])
    fig.text(0.055, 0.945, title, fontsize=13.5, fontweight="bold", color=INK,
             ha="left", va="top")
    if spec["subtitle"]:
        fig.text(0.055, 0.845 if "\n" not in title else 0.80, spec["subtitle"],
                 fontsize=10, color=INK_MUTE, ha="left", va="top")
    note = spec["source_note"] or "pharma-daily deals database"
    fig.text(0.055, 0.030, f"Method: {note}", fontsize=8, color=INK_MUTE,
             ha="left", va="bottom")
    fig.text(0.945, 0.030, "Pharma Daily · jaimeyan.com", fontsize=8,
             color=TEAL, ha="right", va="bottom", fontweight="bold")
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out)
    plt.close(fig)


def main() -> int:
    ap = argparse.ArgumentParser(description="spec-driven chart renderer")
    ap.add_argument("spec", help="path to spec JSON")
    ap.add_argument("out", help="output PNG path")
    ap.add_argument("--db", default=str(DB_DEFAULT))
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    try:
        spec = validate_spec(json.loads(Path(args.spec).read_text(encoding="utf-8")))
        xs, ys = run_query(spec, Path(args.db))
        render(spec, xs, ys, Path(args.out))
    except (SpecError, json.JSONDecodeError, sqlite3.Error) as e:
        log.error("custom chart rejected: %s", e)
        return 2
    log.info("wrote %s (%d rows)", args.out, len(xs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
