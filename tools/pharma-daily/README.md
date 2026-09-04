# pharma-daily

Daily pharma/biotech brief generator. Collects one day of news from
**first-hand public sources only**, structures deal data heuristically
(regex/keyword rules — no LLM, no paid APIs), stores it in SQLite, runs
deal-comp/readout/market analysis, renders matplotlib charts, emits a
**data pack** (the writer-agent contract), a blog post draft, and an
AI-narrated mp3 for the article page.

Isolated tool: own uv environment, writes only into `tools/pharma-daily/`
plus, on a full run, one post under `content/posts/`, figures under
`public/figures/`, audio under `public/audio/`. Never touches the site
build config or `tools/video`.

Editorial rules live in `EDITORIAL.md`; the agent writing workflow lives in
`.agents/skills/pharma-daily/SKILL.md` (at the site root).

## Sources

| Source | What |
|---|---|
| SEC EDGAR full-text search | 8-K filings mentioning license / collaboration agreements, milestones (SIC 2834/2836/8731 filtered, name heuristic as secondary guard) |
| openFDA Drugs@FDA | recent drug approvals |
| ClinicalTrials.gov API v2 | Phase 2/3 readouts due in the next 90 days (ranked by transparent score) |
| FDA press releases RSS | regulatory news |
| EMA news RSS | EU regulatory news |
| FiercePharma / FierceBiotech RSS | trade press (topic discovery) |
| BioPharma Dive RSS | trade press |
| Endpoints News RSS | trade press (browser UA required) |
| PR Newswire RSS | wire releases (keyword-filtered to pharma) |
| yfinance → Stooq fallback | 1-day % change for deal tickers |

Each source is an isolated adapter under `pharma_daily/sources/`; one
failing source never kills the run (logged + recorded in pack provenance).

## Usage

```bash
cd tools/pharma-daily
uv sync
uv run python daily.py --days 2 --filing-text  # full run: site post + figures + pack
uv run python daily.py --days 1 --no-post      # collect only, leave site untouched
uv run python make_audio.py pharma-daily-<date>  # article narration mp3 + audioPath frontmatter
```

Outputs:

- `data/pharma.db` — `items` and `deals` tables (deals carry ticker,
  parties, TA/modality/phase/target), idempotent upserts; mined fields are
  never NULL-overwritten by poorer re-runs
- `out/pack/<date>.json` — the data pack: every fact row carries a source
  URL; validated by `pharma_daily/pack.py`
- `out/figures/<date>/*.png` — deal-size comps (percentile vs accumulated
  DB), category counts, market reaction; stone/rose style
- `content/posts/pharma-daily-<date>.md` + `public/figures/` +
  `public/audio/<slug>.mp3` (unless `--no-post`)

After a full run, from the site root: `npm run qc:blog` then `npm run build`.

## Automation (GitHub Actions)

`.github/workflows/pharma-daily.yml` runs daily at 13:07 UTC (09:07 ET,
off the herd marks) plus manual dispatch: pipeline → optional LLM polish →
audio → QC/build → **opens a review PR** (`pharma-daily/<date>`). The PR is
the human gate; merging deploys via Vercel. PR body carries pack stats,
failed sources, and the review checklist.

Optional LLM polish step: set repo variable `PHARMA_AGENT=1` and secrets
`KIMI_API` (Kimi Platform key; runs `kimi-k2.7-code`) and `DEEPSEEK_KEY`
(fallback: `deepseek-v4-pro` via OpenAI-compatible API). It runs `kimi -p`
headless against the pharma-daily skill with insight-first drafting
(datasource enrichment is skipped in CI — no OAuth). Without these, the
deterministic draft ships.

A second workflow, `pharma-video.yml`, closes the loop: merging a
`pharma-daily/*` PR triggers video rendering (teal theme) + YouTube upload
(public) + videoId writeback + push. Requires secrets
`YOUTUBE_CLIENT_SECRET_JSON` / `YOUTUBE_TOKEN_JSON` (contents of the
gitignored `tools/video/.google-*.json`).

Deals DB and packs are committed to the repo via the PR — they are the
longitudinal asset behind the comp percentiles.
