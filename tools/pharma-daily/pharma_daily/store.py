"""SQLite storage. Idempotent upserts keyed on url/id so re-runs are safe.

Schema migrations are additive and applied at connect() time: a
PRAGMA table_info check per column, ALTER TABLE ADD COLUMN when missing.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id          TEXT PRIMARY KEY,
    source      TEXT NOT NULL,
    url         TEXT,
    title       TEXT,
    date        TEXT,
    category    TEXT,
    entity      TEXT,
    summary     TEXT
);
CREATE TABLE IF NOT EXISTS deals (
    source_url  TEXT PRIMARY KEY,
    date        TEXT,
    companies   TEXT,
    deal_type   TEXT,
    upfront_usd REAL,
    total_usd   REAL,
    headline    TEXT,
    source      TEXT
);
"""

# columns added after the initial schema (v2)
DEAL_COLUMNS_V2 = {
    "ticker": "TEXT",
    "licensor": "TEXT",
    "licensee": "TEXT",
    "therapeutic_area": "TEXT",
    "modality": "TEXT",
    "phase": "TEXT",
    "target": "TEXT",
}
ITEM_COLUMNS_V2 = {
    "category": "TEXT",
}

DEAL_FIELDS = [
    "source_url", "date", "companies", "deal_type", "upfront_usd", "total_usd",
    "headline", "source", *DEAL_COLUMNS_V2,
]


def _ensure_columns(conn: sqlite3.Connection, table: str, columns: dict[str, str]) -> list[str]:
    existing = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
    added = []
    for name, ddl in columns.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
            added.append(f"{table}.{name}")
    return added


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    added = _ensure_columns(conn, "deals", DEAL_COLUMNS_V2)
    added += _ensure_columns(conn, "items", ITEM_COLUMNS_V2)
    if added:
        conn.commit()
    return conn


def upsert_item(conn: sqlite3.Connection, item: dict, category: str) -> None:
    conn.execute(
        """INSERT INTO items (id, source, url, title, date, category, entity, summary)
           VALUES (:id, :source, :url, :title, :date, :category, :entity, :summary)
           ON CONFLICT(id) DO UPDATE SET
             date=excluded.date, category=excluded.category,
             title=excluded.title, entity=excluded.entity, summary=excluded.summary""",
        {
            "id": item.get("id") or item.get("url") or item.get("title"),
            "source": item.get("source", ""),
            "url": item.get("url", ""),
            "title": item.get("title", ""),
            "date": item.get("date", ""),
            "category": category,
            "entity": item.get("entity", ""),
            "summary": item.get("summary", ""),
        },
    )


def upsert_deal(conn: sqlite3.Connection, deal: dict) -> None:
    row = {k: deal.get(k) for k in DEAL_FIELDS}
    cols = ", ".join(DEAL_FIELDS)
    vals = ", ".join(f":{k}" for k in DEAL_FIELDS)
    # Mined fields (amounts, ticker, parties, TA/modality/phase/target) keep
    # the first non-NULL value ever mined: a re-run with less fetch context
    # (e.g. no --filing-text) must not degrade previously enriched rows.
    coalesce = {
        "upfront_usd", "total_usd", "ticker", "licensor", "licensee",
        "therapeutic_area", "modality", "phase", "target",
    }
    updates = ", ".join(
        f"{k}=COALESCE(excluded.{k}, deals.{k})" if k in coalesce else f"{k}=excluded.{k}"
        for k in DEAL_FIELDS
        if k != "source_url"
    )
    conn.execute(
        f"INSERT INTO deals ({cols}) VALUES ({vals}) "
        f"ON CONFLICT(source_url) DO UPDATE SET {updates}",
        row,
    )


def items_between(conn: sqlite3.Connection, start: str, end: str) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM items WHERE date >= ? AND date <= ? ORDER BY date DESC", (start, end)
    ).fetchall()


def deals_between(conn: sqlite3.Connection, start: str, end: str) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM deals WHERE date >= ? AND date <= ? ORDER BY total_usd DESC NULLS LAST",
        (start, end),
    ).fetchall()


def all_deal_totals(conn: sqlite3.Connection, deal_types: tuple[str, ...] | None = None) -> list[float]:
    sql = "SELECT total_usd FROM deals WHERE total_usd IS NOT NULL"
    params: tuple = ()
    if deal_types:
        sql += f" AND deal_type IN ({','.join('?' * len(deal_types))})"
        params = deal_types
    return [r[0] for r in conn.execute(sql, params).fetchall()]


def category_counts(conn: sqlite3.Connection, start: str, end: str) -> list[tuple[str, int]]:
    return conn.execute(
        "SELECT category, COUNT(*) FROM items WHERE date >= ? AND date <= ? GROUP BY category ORDER BY 2 DESC",
        (start, end),
    ).fetchall()


def counts(conn: sqlite3.Connection) -> dict:
    return {
        "items": conn.execute("SELECT COUNT(*) FROM items").fetchone()[0],
        "deals": conn.execute("SELECT COUNT(*) FROM deals").fetchone()[0],
    }
