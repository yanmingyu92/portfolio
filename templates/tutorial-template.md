---
title: "{{TITLE}}"
date: {{DATE}}
description: "{{DESCRIPTION_120_170_CHARS}}"
tags: ["clinical-sas", "tag-two", "tag-three"]
kind: tutorial
series: {{SERIES}}
seriesOrder: {{ORDER}}
canonicalPath: /blog/{{SLUG}}.html
# skillArtifact: /skills/<artifact-name>/SKILL.md   # uncomment when the companion skill ships
# draft: true   # keep until ready to publish
---

<Hook: one concrete scene from a real study workflow — a dataset, a spec cell, a query. ≤120 words. No generic opening.>

> **TL;DR** — <2–3 sentences: what the reader walks away with and can do afterwards.>

## The fundamentals

<Layer 1 — timeless mechanics: CDISC standard logic, derivation rules, GxP reasoning.
Open with the example, explain after. This layer should still read fine in 10 years.>

| Column A | Column B | Column C |
|---|---|---|
| ... | ... | ... |

*Table 1: <what the table shows, one sentence.>*

```sas
<Original, minimal code — rewritten from scratch, ≤15 lines. Never paste third-party
program headers, client names, or study identifiers.>
```

## The modern workflow

<Layer 2 — how this step runs in a cloud SCE (Statistical Computing Environment):
Git flow, reproducibility, multi-engine SAS/R/Python, data-lake access. 3–5 years
of shelf life; keep tool-neutral where possible.>

## The agentic way

<Layer 3 — what changes when an agent does this step: concrete failure modes,
where the human boundary sits (GxP accountability), and the verification habit.>

<div class="era-callout">
  <p><strong>The agentic way</strong> — <one-sentence summary of how Claude/agents change this step, plus the main failure mode to watch.></p>
  <p><Optional second paragraph: the specific verification question to ask before trusting agent output here.></p>
  <p class="era-callout-asof">Volatile layer — last verified {{DATE}}. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/<artifact-name>/SKILL.md">
  <span class="skill-card-name">&lt;artifact-name&gt;</span>
  <span class="skill-card-desc"><One sentence: what this drop-in Claude skill does for the reader.></span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- <Standalone sentence a skimmer can quote.>
- <...>
- <...>

## FAQ

### <Question a searcher would type?>

<2–3 sentence answer.>

### <Question 2?>

<2–3 sentence answer.>

---

<Close: link to the previous/next post in the series plus 1–2 inward links to
deep-dives/explainers (e.g. /blog/ai-coding-assistants-sas-gxp.html).>
