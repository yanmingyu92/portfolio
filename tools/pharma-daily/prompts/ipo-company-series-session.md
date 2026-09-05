# Session prompt — per-company IPO analysis series (paste into a new Kimi session)

You are producing a series of per-company IPO analysis articles for
jaimeyan.com, companion pieces to the published deep-dive
`content/posts/biotech-ipo-class-2025-2026.md` (read it first — it is the
parent analysis and the quality bar). Work in the Astro site repo; the site
root is the current working directory.

## Task

Pick the next N companies from the 2026 US biotech IPO class (the class table
is in the parent article; the full 21-name list with tickers, raises, and
aftermarket returns is there). Suggested order — biggest checks and the
instructive losers first: Kailera, Parabilis, Veradermics, Eikon (below-offer
platform), Generate (below-offer platform), Aktis, Hemab, Braveheart Bio,
then the rest. Ask the owner how many to do this session; 2–3 is a good
batch.

For EACH company produce one `deep-dive` post
(`content/posts/ipo-<company-slug>-2026.md`):

## Data discipline (binding)

1. **First-hand sources first.** Pull the company's S-1/S-1A and 8-Ks from
   SEC EDGAR (full-text search API: `https://efts.sec.gov/LATEST/search-index`,
   header `User-Agent: PharmaDaily jaime@jaimeyan.com`), pricing press
   releases from the company IR page, and pipeline/trial context from
   ClinicalTrials.gov API v2. Trade press (BioPharma Dive, FierceBiotech,
   Endpoints) for context only, always linking the original.
2. **Kimi Datasource** (skill `kimi-datasource`, installed): use it for
   market data and fundamentals — latest close vs offer price, market cap,
   cash position from the latest 10-Q. Ticker suffix rules: realtime `.US`,
   historical/financials `.O` (Nasdaq) / `.N` (NYSE); realtime only during
   trading hours, otherwise use the historical-price API. Max 5 targeted
   queries per company; every enriched fact cites the original publisher.
3. **Deal-comp context from our own DB:** query
   `tools/pharma-daily/data/pharma.db` (read-only) for related deals on the
   company's modality/therapeutic area — e.g. a Kailera piece should reference
   the tracked GLP-1 licensing flow (Menarini/Gan & Lee) and any Hengrui
   in-licensing.
4. Nulls stay "undisclosed". No invented facts, no investment advice, no
   boilerplate disclaimers. `tools/pharma-daily/EDITORIAL.md` is binding
   (read it): evidence before opinion, thin-sample flags, takeaway captions.

## Article structure

1. Hook + TL;DR (numbers first: raise, stage at pricing, vs-offer today).
2. **The asset** — lead molecule(s), target, modality, phase, next readout
   (ClinicalTrials.gov link), origin (in-licensed? from whom?).
3. **The deal** — raise, pricing vs range, upsizing, anchor investors,
   syndicate structure; comp against the class median ($295M) and the
   closest stage/modality peers from the class table.
4. **The tape** — 1-day pop, vs-offer today, volume; what the aftermarket
   is pricing (tie to the parent's bifurcation finding: single-asset
   late-stage rewarded, platform punished — confirm or contradict for this
   name).
5. **What would change the story** — the binary catalysts and dates.
6. One Take + Key takeaways + FAQ + Sources (every claim linked).

## Figures

At least one figure per article, teal Pharma Daily identity. Two options:
- Quick custom figure: write a small matplotlib script under
  `tools/pharma-daily/` (follow `ipo_class_figure.py`: 1200x630+, paper
  background, teal #0f766e, takeaway title + subtitle + source footnote +
  "Pharma Daily · jaimeyan.com" brand mark; read the PNG back and check
  labels are not clipped before shipping).
- If the figure is a DB query, use the spec renderer:
  `cd tools/pharma-daily && uv run python -m pharma_daily.custom_chart spec.json out.png`
  (read its docstring for the spec schema; exit 2 = invalid spec, fix and
  retry; never bypass it).

## Cross-check (mandatory, cross-vendor)

Before publishing, run the adversarial critique on a DIFFERENT vendor than
the one you wrote with (you are Kimi; the critic is DeepSeek):

```bash
bash tools/pharma-daily/run-llm.sh deepseek "Read tools/pharma-daily/prompts/critique.md and follow it exactly. Draft: content/posts/ipo-<slug>-2026.md. There is no pack for this article; treat the linked sources as the evidence base and check every number against them by fetching the links. Report violations only; do not rewrite."
```

Fix every violation the critic finds, or defend each in the review note to
the owner with the source URL.

## Publish (per article)

```bash
cd tools/pharma-daily && uv run python make_audio.py ipo-<slug>-2026   # Listen player
cd ../.. && npm run qc:blog && npm run build                            # must be 0 errors
```

Then commit ONLY your own files (post + figures + audio + any figure script)
with message `feat(blog): IPO analysis — <Company>` and push. Do NOT commit
unrelated modified/untracked files (another session may be working in the
tree). Do not touch `tools/pharma-daily/` pipeline code, `scripts/`, or the
workflow files. Video companions: do not run the video pipeline yourself —
report the slug list to the owner at the end; videos are released separately.

## Red lines

- `tools/pharma-daily/EDITORIAL.md` red lines apply in full.
- Performance figures always carry an as-of date; prices move daily.
- The video pipeline's red-line scan does not apply to these posts (real
  company names are the content), but nothing from any training set may leak.
- Human gate: after each batch, present title + One Take + critic results
  and wait for owner confirmation before the NEXT batch, not before
  publishing (articles publish as you go).
