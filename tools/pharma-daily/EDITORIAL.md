# Pharma Daily — Editorial & Method Bible

This document is the enforceable standard for the daily pharma/biotech finance
brief on jaimeyan.com. It binds both the AI writing agent and the human
reviewer. If a draft violates anything here, it does not publish.

Positioning: **a practitioner-grade pharma finance publication, not a news
aggregator.** Credibility is the asset. Accuracy red lines outrank volume,
speed, and engagement.

## 1. Audience & value proposition

Readers:

1. BD / strategy / investment analysts at biotech, pharma, and funds.
2. Industry practitioners who track the field professionally.

Every post must deliver **at least one** of:

- **Time saved** — the reader skips 30 minutes of EDGAR / openFDA /
  ClinicalTrials.gov scanning because we did it.
- **Unique data** — something not in the wire summaries: deal comps with
  historical percentiles, the 90-day readout calendar, disclosed-vs-headline
  deal economics.
- **Practitioner judgment** — the One Take: a reasoned opinion a colleague
  would argue with, not a summary.
- **Reusable asset** — a table, calendar, or figure the reader pastes into
  their own work.

If a draft delivers none of these, it is aggregation. Rewrite or cut.

## 2. Structure (CFA research-report discipline, daily-brief length)

Fixed section order. Do not rename, reorder, or skip sections; a section with
no data says so in one sentence ("No qualifying deals in the window.") rather
than disappearing.

1. **Hook** — 1–2 sentences, numbers first: what the window contained.
2. **TL;DR** (blockquote) — ≤3 sentences, numbers first: deal count and
   disclosed dollars, approval count, readout count, the single most
   important pattern, and any data caveat (thin sample, failed source).
3. **Deals** — table (company, type, upfront → total, comp context, source
   link) followed by a short comp paragraph:
   - Always separate **upfront cash** from **milestone-heavy headline totals**;
     headline totals overstate near-term cash and we say so.
   - Give the historical **percentile** (`percentile_total`) when the pack
     has it; state the comp base (`comps.n_historical`).
   - **Thin-sample honesty:** when `comps.thin_sample` is true or the comp
     base is n < 30, flag it explicitly ("based on only N historical comps —
     directional, not definitive").
4. **Approvals** — table (product, sponsor, date, regulator link).
5. **Readout Calendar** — table of Phase 2/3 primary completions due within
   90 days (date, phase, study, sponsor, registry link).
6. **Market Reaction** — short. Bold-lead list of tickers with 1-day change
   and `as_of` timestamp. Context only if the pack supports it; no causal
   storytelling from price moves.
7. **One Take** — one paragraph (3–5 sentences) of original practitioner
   judgment. **Required in every post.** It must be reasoned explicitly from
   that day's pack data, state a conviction level, and say what evidence
   would change the conclusion. If the take could have been written without
   reading today's data, it is generic — rewrite it.
8. **Key takeaways** — 3–5 bullets, each a standalone sentence a skimmer can
   quote.
9. **FAQ** — 2–3 questions a practitioner would actually type; 2-sentence
   answers.
10. **Sources** — every item linked to its first-hand source, plus a
    provenance footer (collection window, `fetched_at`, failed sources).

## 3. Insight doctrine — numbers are raw material, not the product

An **insight** is a claim that (a) is not stated in any single source we link,
(b) rests on a computed relationship in the day's data, and (c) changes what a
practitioner thinks or watches next. Listing numbers is the input to writing,
never the output.

**The seven canonical moves** (use at least two per post; the pipeline computes
candidates for each in `pack.insights[]`):

1. **Structure over headline** — split upfront cash from contingent milestones;
   an upfront share outside the 5–10% license band is the story, not the total.
2. **Historical position** — where this deal/approval rate sits vs the
   accumulated comp base (percentile, median distance), with thin-sample flags.
3. **Window pattern** — concentration by origin, therapeutic area, or modality:
   "3 of 4 largest checks went to China-originated assets" is insight;
   listing the three deals is not.
4. **Market verdict vs terms** — price/volume reaction read against deal
   structure (a +15% re-rate on an 8.5% upfront says the market prices the
   platform, not the cash).
5. **Calendar consequence** — what the item sets up: a readout, a PDUFA date,
   a milestone trigger, a competitive collision on the same target.
6. **Delta vs baseline** — today's counts against trailing-window averages from
   the deals DB; direction and magnitude, not vibes.
7. **Absence as signal** — zero approvals on a weekday, a hot TA going quiet;
   say what the absence means and what would confirm it.

**Anti-patterns (rejected at review):**

- Restating a table in prose ("Medicus announced X, Attovia announced Y").
- Momentum adjectives without a computed quantity behind them.
- Both-sides filler ("time will tell whether…").
- A prediction with no falsifier — every forward claim must name the evidence
  that would kill it.

**Placement rules:** every section either answers "so what" in ≤2 sentences or
stays a bare table. The One Take must lean on at least one `pack.insights[]`
item and cite its numbers. Key takeaways must include at least one computed
relationship (ratio, percentile, delta), not raw counts alone.

## 4. Voice rules

- **Evidence before opinion.** Number first, interpretation second.
- Short sentences. Concrete, sourced numbers over adjectives.
- Write "undisclosed" when the pack field is null. Never estimate, infer, or
  "approximately"-away a null.
- State uncertainty plainly: "we have not read the full agreement text",
  "the filing does not disclose the split", "based on only N comps".
- **Banned patterns** (also enforced mechanically by `scripts/blog-qc.mjs`):
  "in today's (rapidly) evolving …", "fast-paced world", "Moreover",
  "Furthermore", "it's important to note", "in conclusion", "delve into",
  "game-changer / game-changing", "cutting-edge", "revolutionary",
  "seamlessly", "unlock the power", "thrilled to share/announce",
  "ever-evolving", "landscape of". No hype adjectives generally: if a number
  doesn't say it, don't say it.
- No emoji. No exclamation marks.
- **No investment advice.** Never recommend buying, selling, or holding any
  security; never give price targets. Market moves are reported as data, not
  as signals to act on. Do not add a boilerplate disclaimer line either —
  the discipline is in never writing advice, not in disclaiming it.

## 5. Figure rules

- Every figure has a **takeaway caption**: a conclusion ("Disclosed totals
  cluster below $500M, with one outlier") not a description ("bar chart of
  deal values").
- Figures come only from the pack (`figures[]`, rendered by the pipeline
  from collected data). Never redraw, annotate, or alter them.
- Every figure must be referenced from the text it supports.
- **Chart of the day (optional, spec-driven).** The writer may propose ONE
  bespoke figure tied to the day's dominant insight — but only as a JSON
  spec rendered by `pharma_daily/custom_chart.py` (whitelisted query builder
  over the deals DB; LLM never writes code or SQL). The figure must carry a
  "Method:" footnote describing the query. If spec validation or rendering
  fails, the post ships with template figures only — a missing custom figure
  never blocks publication.

## 6. Fact-check protocol (three passes, all mandatory)

**Pass 1 — during drafting.** Every number, date, company name, and claim in
the draft must trace to a specific pack field or an evidence card
(`out/evidence/<date>.json`), and that source carries a URL. Maintain the
mapping mentally per sentence; if you cannot name the source, the claim does
not go in.

- Nulls stay "undisclosed". Missing percentile → say no comp context, don't
  approximate one.
- `provenance.sources_failed` non-empty → the post names the failed source
  and says what coverage is missing.
- Thin samples (n < 30, or `comps.thin_sample: true`) are flagged wherever
  the stat is used.

**Pass 2 — verification pass, after drafting, before publish.** Re-read the
draft top to bottom. For **each** number and factual claim: locate it in the
pack JSON or the evidence cards, confirm the value matches exactly (units,
dates, spellings), and
confirm the figure captions match the figure takeaways in the pack. Produce a
list of any claim without provenance — then delete or fix each one. Only
then hand to the critique pass.

**Pass 3 — independent critique, after pass 2.** A second model session (in
CI: the other vendor's model, never the writer's own) runs
`prompts/critique.md` against the draft, the pack, and the evidence cards;
it fixes violations in place and writes `out/review/<date>.md`. A draft
whose review file says `needs-human` does not go to the human gate as
"clean".

## 7. Copyright

- Summarize and link. Never reproduce full text (or near-verbatim chunks)
  from filings, press releases, or wire articles; short quoted fragments only
  when the wording itself is the story, with attribution.
- No images from sources. Figures are always our own pipeline output.
- Every external claim links the original source, not another aggregator.

## 8. What we do NOT do

- **No breaking-news speed competition.** We publish when the data is
  verified; being second and correct beats being first and wrong.
- **No stock recommendations, price targets, or trading signals.**
- **No anonymous sourcing.** Every claim traces to a first-hand public
  document; we do not have sources "familiar with the matter".
- **No LLM-invented facts.** The writing agent uses pack data and retrieved
  evidence cards only; outside knowledge may inform the *framing* of the One
  Take but never introduces a factual claim that is not in one of those two
  places.
- **No filler to hit length.** A thin day is a short post.
