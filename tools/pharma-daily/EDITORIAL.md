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

## 3. Voice rules

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

## 4. Figure rules

- Every figure has a **takeaway caption**: a conclusion ("Disclosed totals
  cluster below $500M, with one outlier") not a description ("bar chart of
  deal values").
- Figures come only from the pack (`figures[]`, rendered by the pipeline
  from collected data). Never redraw, annotate, or alter them.
- Every figure must be referenced from the text it supports.

## 5. Fact-check protocol (two passes, both mandatory)

**Pass 1 — during drafting.** Every number, date, company name, and claim in
the draft must trace to a specific pack field, and that pack field carries a
`source_url`. Maintain the mapping mentally per sentence; if you cannot name
the field, the claim does not go in.

- Nulls stay "undisclosed". Missing percentile → say no comp context, don't
  approximate one.
- `provenance.sources_failed` non-empty → the post names the failed source
  and says what coverage is missing.
- Thin samples (n < 30, or `comps.thin_sample: true`) are flagged wherever
  the stat is used.

**Pass 2 — verification pass, after drafting, before publish.** Re-read the
draft top to bottom. For **each** number and factual claim: locate it in the
pack JSON, confirm the value matches exactly (units, dates, spellings), and
confirm the figure captions match the figure takeaways in the pack. Produce a
list of any claim without pack provenance — then delete or fix each one. Only
then hand to the human review gate.

## 6. Copyright

- Summarize and link. Never reproduce full text (or near-verbatim chunks)
  from filings, press releases, or wire articles; short quoted fragments only
  when the wording itself is the story, with attribution.
- No images from sources. Figures are always our own pipeline output.
- Every external claim links the original source, not another aggregator.

## 7. What we do NOT do

- **No breaking-news speed competition.** We publish when the data is
  verified; being second and correct beats being first and wrong.
- **No stock recommendations, price targets, or trading signals.**
- **No anonymous sourcing.** Every claim traces to a first-hand public
  document; we do not have sources "familiar with the matter".
- **No LLM-invented facts.** The writing agent uses pack data only; outside
  knowledge may inform the *framing* of the One Take but never introduces a
  factual claim that is not in the pack.
- **No filler to hit length.** A thin day is a short post.
