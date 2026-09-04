---
title: "{{TITLE}}"
date: {{DATE}}
description: "{{DESCRIPTION_120_170_CHARS}}"
tags: ["pharma", "biotech", "daily-brief"]
kind: note
canonicalPath: /blog/{{SLUG}}.html
---

<!--
  Daily brief template — copy manually to content/posts/pharma-daily-YYYY-MM-DD.md
  (scripts/new-post.mjs has no "daily" kind yet; do not run it for dailies).
  Placeholders: {{TITLE}} {{DATE}} {{SLUG}} {{KIND}} {{SERIES}} {{ORDER}} —
  kind is always "note"; {{KIND}} / {{SERIES}} / {{ORDER}} exist only for future
  new-post.mjs wiring.
  Title format: "Pharma Daily — Month D, YYYY". Slug: pharma-daily-YYYY-MM-DD.
  Editorial rules: tools/pharma-daily/EDITORIAL.md — follow them exactly.
  Delete every <!-- ... --> comment block before publishing.
  Keep prose tight: the video extractor (tools/video) builds a 3–4 minute
  script from this file — frontmatter + hook + TL;DR + each H2 chapter
  (tables, bold-lead lists, short paragraphs) + Key takeaways + FAQ.
  Table note: the extractor narrates only the FIRST THREE columns of any
  table, so put the narrative-essential content in columns 1–3.
-->

<Hook — 1–2 sentences, numbers first: how many deals / approvals / readouts in
the collection window, and the one pattern that matters. No generic opening.>

> **TL;DR** — <≤3 sentences, numbers first: N deals ($X disclosed upfront, $Y
> headline total), N FDA approvals, N Phase 2/3 readouts due within 90 days;
> the single most important data point; any caveat (thin comp sample, failed
> source). Every number from the pack.>

## Deals

<!-- One row per pack.deals[] entry, sorted by disclosed total value.
     Null money fields render as "undisclosed" — never estimate.
     Column 4: percentile_total vs comps.n_historical, or "—". -->

| Company | Type | Terms (upfront → total) | vs. history | Source |
|---|---|---|---|---|
| <company> | <type> | <$upfront or undisclosed> → <$total or undisclosed> | <e.g. 78th percentile of N comps> | [filing / release](<source_url>) |

*Table 1: Deal events in the collection window (<window.start> – <window.end>).*

<!-- Comp context paragraph, 2–3 sentences: comps.median_total_usd vs today's
     deals; upfront-vs-milestone split (headline totals overstate near-term
     cash — say so); if comps.thin_sample or n_historical < 30, flag it
     explicitly ("based on only N historical comps — directional"). -->

![<alt text: what the chart concludes>](/figures/{{SLUG}}-deal-sizes.png)

*Figure 1: <takeaway — a conclusion, not a description; from pack figures[].takeaway.>*

## Approvals

<!-- One row per pack.approvals[] entry. Empty window → one sentence saying so,
     no table. -->

| Product (sponsor) | Date | Link |
|---|---|---|
| <product> (<sponsor>) | <date> | [Drugs@FDA](<url>) |

*Table 2: Approvals recorded in the window (<application_type> mix noted if informative).*

## Readout Calendar

<!-- Phase 2/3 readouts from pack.readouts[], soonest first. Include the NCT
     link on the study title. Keep titles trimmed to the drug + indication. -->

| Primary completion | Phase | Study (sponsor) |
|---|---|---|
| <primary_completion> | <phase> | [<title> (<sponsor>)](<url>) |

*Table 3: Phase 2/3 primary completions due in the next 90 days.*

## Market Reaction

<!-- Bold-lead list, one item per pack.market[] entry — the video extractor
     turns these into one clean slide. Data only; no causal storytelling. -->

**<TICKER>** — <change_1d_pct>% on the day (as of <as_of>).

## One Take

<!-- REQUIRED. One paragraph, 3–5 sentences of original practitioner judgment,
     reasoned explicitly from today's pack data (cite the numbers you lean on).
     State conviction level and what evidence would change the conclusion.
     Judgment, not summary; facts still come only from the pack. -->

## Key takeaways

- <Standalone sentence a skimmer can quote — number included.>
- <...>
- <...>

## FAQ

### <Question a practitioner would type, e.g. "How does this deal's upfront compare to similar licenses?">

<2-sentence answer, pack-sourced.>

### <Question 2, e.g. "Which readouts in the next 90 days matter most?">

<2-sentence answer, pack-sourced.>

## Sources

<!-- Every item linked to its first-hand source (pack.sources[] + the
     source_url of each table row). Keep one line per source, short titles —
     the video extractor reads this list aloud, so no commentary here. -->

- [<source title>](<source url>) — <outlet>

<!-- Provenance footer (plain paragraph, READER-FACING): state the collection
     date and that sources are first-hand. If provenance.sources_failed is
     non-empty, say which coverage is missing today. NEVER mention internal
     tooling (tools/pharma-daily, pack files, idempotency, extraction
     heuristics) — readers must not see pipeline internals. Keep exactly one
     inward link to a related /blog/ post (site QC requires one). -->

All items above are drawn from first-hand public sources — SEC filings, trial
registries, and company releases — collected <provenance.fetched_at>. <If any
source failed: "Coverage of <X> is incomplete today; <source> was unreachable.">
Related: [<related post>](/blog/<related-slug>.html).
