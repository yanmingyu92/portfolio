# What Hybrid RAG Buys You in TLF Template Generation: 1,999 Bootstrap Experiments

<!-- Wechatsync target: Zhihu. Canonical: https://jaimeyan.com/blog/benchmarking-rag-clinical-tlf-templates.html -->

Every statistical programmer knows the drill: before a single line of production code is written, someone has to author the mock TLF shells — the tables, listings, and figures that will anchor the Clinical Study Report. They must conform to ICH E3 and CDISC ADaM conventions, they are tedious, and they are mostly copy-adapt-paste from precedent. It is exactly the kind of work people hand to an LLM. And the first thing you learn when you do is that naive prompting produces templates that *look* plausible but drift off-schema, invent variables, and ignore regulatory conventions.

So I ran the experiment properly. For my PharmaSUG 2026 paper, I benchmarked **five generation methods across 1,999 instance-matched bootstrap experiments**, spanning 15 templates, five prompt-complexity levels, three LLM providers (DeepSeek, OpenAI GPT-4, Anthropic Claude), and eight therapeutic areas. This post is what I learned.

## The five methods

All runs used deterministic decoding (temperature 0.1). The contestants:

- **LLM_DIRECT** — baseline single-turn prompting, no retrieval.
- **LLM_RAG_VECTOR** — standard vector-store RAG.
- **RAG_QUERY_EXPANSION** — expand the query first to improve retrieval recall.
- **RAG_ADAPTIVE_CONTEXT** — adaptively select and compose context snippets per instance.
- **RAG_HYBRID_RERANK** — hybrid lexical + vector retrieval, then a reranking step to prioritize context.

Prompts ranged from L1 ("Create a demographics table") up to L5 (exception handling, edge-case footnotes, traceability requirements). Templates were scored by five domain-expert LLM personas (clinical researcher, regulatory specialist, biostatistician, data manager, medical writer) on structure fidelity, content accuracy, completeness, format compliance, and variable coverage. To check the rubric wasn't grading its own homework, I correlated the automated scores against five human domain experts on 250 instances: average Pearson r = 0.895, Spearman ρ = 0.825.

## What hybrid RAG buys you

The headline result: **RAG_HYBRID_RERANK scored 85.7 on average vs. 81.7 for direct prompting** — a statistically significant gain (p < 0.05) on paired, instance-matched bootstrap comparisons (B = 2000, fixed seed 42). Plain vector RAG (83.0) and adaptive context (83.1) landed in between; query expansion (80.0) actually underperformed the direct baseline on average.

The honest caveats, because the numbers demand them:

- On DeepSeek (n = 1644, my largest dataset), the advantage was +3.5 points with Cohen's d = 0.415 — a real but medium effect.
- On OpenAI (n = 171), the gap was +10.3 points (d = 0.723), but with p = 0.067 it missed the 0.05 threshold.
- On Anthropic (n = 184), the method effect was *negative* (−6.0 points, d = −0.420) and not significant. Small sample, but I report it as-is.

Two other findings held up across conditions. Performance **degrades with prompt complexity** — from 88.5 at L1 down to 75.6 at L5 in the DeepSeek data — though the hybrid method kept its edge at every level. And some CSR categories are simply harder: demographics was the easiest (85.2), while adverse events (74.3) and safety labs (76.8) were the most challenging. If you're scoping automation, start with demographics and efficacy, not AE tables.

## From template to executable R: debugging converges

A good template is only half the deliverable — someone still has to write the R code. Zero-shot code generation from the templates had a low success rate. So I built an iterative LLM-guided debugging loop:

```
round = 0
script = llm.generate_r(template)
while round < R_max:               # R_max = 14
    result = execute(script)       # exit code, output file, shape checks
    if result.ok: return script
    script = llm.fix(script, result.error, minimal_patch=True)
    round += 1
```

Success meant exit code 0, the required output file created, and basic shape checks passing. The results:

- **70% of scripts succeeded within 3–5 rounds**, approaching 90% by round 14. (R_max = 14 was chosen because preliminary runs showed it captured over 90% of resolutions.)
- Early-round failures were mundane — incorrect population flags, column-binding errors. Later rounds surfaced subtler, dataset-specific logic mismatches.
- Most usefully: **higher-fidelity templates needed fewer debugging rounds**. The quality you buy upstream with hybrid RAG pays out again downstream.

That last point is what makes this a pipeline argument, not just a benchmarking exercise — it directly motivates the four-agent architecture in the paper (query analysis → template generation → code generation → execution/debug).

## Limitations I'd flag before you adopt this

The manuscript is explicit about these, and they matter:

- The evaluation used mock templates conforming to standard conventions, **not a real regulatory submission pipeline**. Company-specific legacy templates are future work.
- Debugging success meant the script *executed* — I did not validate the statistical content of the outputs beyond shape checks. Human review remains essential in production.
- The debugging loop has a real compute cost at scale; the paper suggests flagging scripts that still fail after 3–4 rounds for human review.
- Even hybrid RAG fails on some L5 prompts where retrieved documents conflict or formatting rules are esoteric.
- The study had no statistician co-author — a limitation the paper states plainly.

My practical takeaway: use hybrid retrieval with reranking for template generation, keep prompts at medium complexity (L3–L4), and put an automated debugging loop behind validator gates. The full details — all tables, the paired bootstrap methodology, and the reproducible analysis code — are in the [full paper](/papers/pharmasug-2026-ap-211.html), presented at PharmaSUG 2026, with code at the companion GitHub repo.

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/benchmarking-rag-clinical-tlf-templates.html
