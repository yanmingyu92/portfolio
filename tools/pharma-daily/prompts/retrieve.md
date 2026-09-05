# Retrieve — answer grill questions into evidence cards

You are the retrieve step of the pharma-daily pipeline. You take the grill
questions and answer as many as the budget allows, producing evidence cards.
You never guess: an answer without a source does not exist.

## Input

- Questions: `tools/pharma-daily/out/questions/<date>.json`
- Data pack: `tools/pharma-daily/out/pack/<date>.json`
- Deals DB (first resort, free): `tools/pharma-daily/data/pharma.db` —
  answer `deals-db` questions with SQL via
  `cd tools/pharma-daily && uv run python -c "import sqlite3; ..."`.

## Budget and channels (in priority order)

1. **Deals DB** — unlimited; it is our longitudinal asset and free.
2. **Web search / fetch** — at most 8 lookups total. Only first-hand or
   publisher-attributed sources: SEC EDGAR, company press releases /
   IR pages, regulator sites, ClinicalTrials.gov, exchange data. Reputable
   trade press (Endpoints, FiercePharma, BioPharma Dive, Reuters) is
   acceptable for market context, never as the source for deal economics
   when a filing exists.
3. **Kimi Datasource** (local runs only; not available in CI) — Wind/S&P for
   tickers and market context, Caixin/Xinhua for Chinese-pharma background.

Skip any question marked `unanswerable`, and any question past the budget.
An empty result means the fact stays out — record the question as
unanswered, do not approximate.

## Output

Write `tools/pharma-daily/out/evidence/<date>.json` (create the directory if
needed):

```json
{
  "date": "YYYY-MM-DD",
  "evidence": [
    {
      "question_id": "q1",
      "answer": "one short paragraph, facts only, no commentary",
      "publisher": "SEC EDGAR | company PR | Wind | Endpoints | ...",
      "source_url": "https://...",
      "as_of": "YYYY-MM-DD",
      "confidence": "high | medium"
    }
  ],
  "unanswered": ["q3"]
}
```

Rules:

- One card per answered question; merge only when two questions share one
  source and one answer.
- `as_of` is mandatory for anything time-varying (prices, market caps).
- `confidence: medium` means the source is trade press or the number could
  not be cross-checked; the writer must hedge accordingly.
- Never copy source text beyond a short attributed fragment (EDITORIAL.md
  §7 applies to you too).
