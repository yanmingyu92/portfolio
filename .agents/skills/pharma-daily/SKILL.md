---
name: pharma-daily
description: Produce one day's pharma/biotech finance brief end-to-end — run the tools/pharma-daily pipeline, draft the post from the data pack under the editorial rules in tools/pharma-daily/EDITORIAL.md, fact-check against the pack, pass site QC, and stop at the human review gate before any video or git step. Use when writing the daily pharma brief on the jaimeyan.com Astro site.
---

# Pharma Daily brief — agent workflow

Produce one day's brief, from pipeline run to human review gate. Site root is
the Astro repo (this file lives at `.agents/skills/pharma-daily/SKILL.md`).
The binding style/method bible is `tools/pharma-daily/EDITORIAL.md` — read it
first and follow it exactly.

## Red lines (never cross, no exceptions)

- **No invented facts.** Every number, date, name, and claim in the post comes
  from the data pack JSON, or from a Kimi Datasource enrichment query whose
  result you actually received this session (step 3). Outside knowledge may
  shape the *framing* of the One Take but never introduces a factual claim
  that is not in one of those two places.
- **Undisclosed stays undisclosed.** Null pack fields render as "undisclosed".
  Never estimate, infer, or smooth over a null. A Datasource query that
  returns nothing means the fact stays out of the post — do not guess.
- **No full-text copying.** Summarize and link first-hand sources; never
  reproduce filings, press releases, or wire text beyond a short attributed
  fragment.
- **No investment advice.** No buy/sell/hold language, no price targets, no
  trading signals.
- **No git mutations** (commit, push, rebase, reset, branch changes) without
  explicit owner approval.
- Do not edit `tools/pharma-daily/` Python code, `scripts/new-post.mjs`, or
  the QC/video scripts as part of this workflow — report gaps instead.

## Steps

1. **Run the pipeline** (from site root):

   ```bash
   cd tools/pharma-daily && uv run python daily.py --days 1 --filing-text
   ```

   Load the data pack: `tools/pharma-daily/out/pack/<date>.json`. This is the
   only factual input for the post.

2. **Check provenance.** If `provenance.sources_failed` is non-empty, the post
   must name the failed source(s) and state what coverage is missing — in the
   TL;DR caveat and again in the Sources footer. If the pack itself is missing
   or empty, stop and report; do not draft from memory.

3. **Enrich via Kimi Datasource (optional, budget-disciplined).** If the
   `kimi-datasource` skill is available in this session, run at most 5
   targeted queries, only for facts that will appear in the final post:
   - For each of the top 1–3 deals by disclosed total: the public party's
     ticker confirmation and market context (e.g. market cap or latest
     close) — US/HK/A-share quotes via Wind/S&P Capital IQ.
   - For deals involving Chinese pharma companies: background via Wind /
     Caixin / Xinhua Finance (Chinese-language sources are a differentiator
     vs English-only trade press).
   - For a ticker in `market[]` with an outsized move: any company
     announcement that explains it (traceable to its original publisher).
   Rules: describe the need in natural language; record each query and its
   result in the fact-check list (step 5); cite the original publisher
   (Wind, S&P Capital IQ, SEC EDGAR, Caixin …) next to the enriched fact in
   the post. If the skill is unavailable or a query returns nothing, skip
   silently — enrichment is additive, never blocking. Datasource queries
   consume plan quota, so never query "just in case".
   Operational notes (learned 2026-09-04): realtime prices only during
   active trading hours — default to the historical-price API for the last
   ~5 sessions instead. Ticker suffixes differ by API: realtime uses `.US`,
   historical/financials use `.O` (Nasdaq) / `.N` (NYSE) — verify the
   exchange before querying, never guess.

4. **Draft the post.** Start from `templates/daily-template.md` (copy it
   manually — `scripts/new-post.mjs` has no "daily" kind; do not use it and do
   not edit it). Slug: `pharma-daily-<date>`; title:
   `Pharma Daily — <Month D, YYYY>`; kind stays `note`. Fill every section in
   the fixed order from EDITORIAL.md: hook → TL;DR → Deals (table + comp
   paragraph with upfront-vs-milestone honesty and percentile context;
   flag thin samples, n < 30) → Approvals → Readout Calendar → Market
   Reaction → One Take → Key takeaways → FAQ → Sources + provenance footer.
   Keep sections short and keep the narrative-essential content in the first
   three columns of each table — the video extractor narrates only those.
   Every figure gets a takeaway caption (a conclusion).

5. **Self fact-check pass (mandatory, separate from drafting).** Re-read the
   draft. For every number and factual claim: locate the exact pack field it
   came from, or the step-3 Datasource query result it came from (query text
   + publisher), and confirm the value matches (units, dates, spellings,
   money formatting). List any claim without provenance, then delete or fix
   each one. Verify figure captions match `figures[].takeaway` in the pack.

6. **Copy figures and write the post.** Copy the figures listed in
   `figures[].path` (`tools/pharma-daily/out/figures/<date>/*.png`) to
   `public/figures/pharma-daily-<date>-<name>.png` and reference them as
   `/figures/pharma-daily-<date>-<name>.png` (verify names against the
   existing post `content/posts/pharma-daily-2026-09-04.md`). Write the
   finished post to `content/posts/pharma-daily-<date>.md`.

7. **Generate the audio version.** Run:

   ```bash
   cd tools/pharma-daily && uv run python make_audio.py pharma-daily-<date>
   ```

   This synthesizes `public/audio/pharma-daily-<date>.mp3` (edge-tts, prose
   only — tables/figures are skipped by design) and stamps
   `audioPath: /audio/pharma-daily-<date>.mp3` into the frontmatter, which
   makes the article page render the "Listen to this article" player under
   the TL;DR (above the YouTube embed). Re-runs are cached by narration
   hash; use `--force` after editing the post text.

8. **QC and build** (from site root):

   ```bash
   npm run qc:blog
   npm run build
   ```

   Fix every error (banned phrases, missing frontmatter fields, h1 in body,
   missing inward `/blog/` link) and re-run until clean. Warnings worth
   fixing: description 120–170 chars, title ≤ 70 chars.

9. **STOP — human review gate.** Present to the owner: the TL;DR, the One
   Take, the fact-check list from step 5 (including any Datasource queries
   used), and every caveat (thin samples, failed sources,
   undisclosed-heavy deal rows). Do not proceed to video, commit, or push
   without explicit approval.

10. **After approval only** — hand off to the video pipeline for script review:

   ```bash
   npm run video:build -- pharma-daily-<date> --script-only
   ```

   Present `temp/videos/pharma-daily-<date>/script.md` for the owner's script
   gate. Rendering, upload, and any git step remain owner-triggered actions,
   not agent actions.
