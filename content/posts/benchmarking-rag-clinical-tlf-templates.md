---
title: "Benchmarking RAG for Clinical TLF Templates: 1,999 Experiments"
date: 2026-08-22
description: "Five LLM generation methods benchmarked across 1,999 bootstrap experiments on ICH E3-conformant TLF templates: hybrid RAG with reranking beats direct prompting."
tags: ["rag", "llm-benchmarking", "tlf-templates", "clinical-trials", "r-code-generation"]
kind: deep-dive
canonicalPath: /blog/benchmarking-rag-clinical-tlf-templates.html
paperRef: pharmasug-2026-ap-211
---

Before a single line of production code is written, someone authors the mock TLF shells — the tables, listings, and figures that anchor the Clinical Study Report. They must conform to ICH E3 and CDISC ADaM conventions, they are tedious, and they are mostly copy-adapt-paste from precedent. Exactly the kind of work people hand to an LLM. And the first thing you learn when you do: naive prompting produces templates that *look* plausible but drift off-schema, invent variables, and ignore regulatory conventions.

So I ran the experiment properly. For my PharmaSUG 2026 paper, I benchmarked **five generation methods across 1,999 instance-matched bootstrap experiments**, spanning 15 templates, five prompt-complexity levels, three LLM providers (DeepSeek, OpenAI GPT-4, Anthropic Claude), and eight therapeutic areas.

> **TL;DR** — Hybrid RAG with reranking beats direct prompting on template quality (85.7 vs. 81.7, p < 0.05), but the effect size depends on the provider — and one provider went negative. An iterative LLM debugging loop then gets 70% of generated R scripts executing within 3–5 rounds, and better templates need fewer rounds.

## The setup: five methods, one rubric

All runs used deterministic decoding (temperature 0.1), and template edits were applied as JSON Patch (RFC 6902) operations to preserve schema fidelity. The five contestants:

| Method | What it does |
|---|---|
| LLM_DIRECT | Baseline single-turn prompting, no retrieval |
| LLM_RAG_VECTOR | Standard vector-store RAG |
| RAG_QUERY_EXPANSION | Expands the query first to improve retrieval recall |
| RAG_ADAPTIVE_CONTEXT | Selects and composes context snippets per instance |
| RAG_HYBRID_RERANK | Hybrid lexical + vector retrieval, then reranking |

*Table 1: The five generation methods in the benchmark, from bare prompting to hybrid RAG with reranking.*

Prompts ranged from L1 ("Create a demographics table") up to L5 (exception handling, edge-case footnotes, traceability requirements). Templates were scored by five domain-expert LLM personas — clinical researcher, regulatory specialist, biostatistician, data manager, medical writer — on structure fidelity, content accuracy, completeness, format compliance, and variable coverage. To check the rubric wasn't grading its own homework, I correlated the automated scores against five human domain experts on 250 instances: average Pearson r = 0.895, Spearman ρ = 0.825.

## What hybrid RAG buys you

The headline result: **RAG_HYBRID_RERANK scored 85.7 on average vs. 81.7 for direct prompting** — a statistically significant gain (p < 0.05) on paired, instance-matched bootstrap comparisons (B = 2000, fixed seed 42).

| Method | Mean quality score | Δ vs. direct |
|---|---|---|
| LLM_DIRECT | 81.7 | — |
| RAG_QUERY_EXPANSION | 80.0 | −1.7 |
| LLM_RAG_VECTOR | 83.0 | +1.3 |
| RAG_ADAPTIVE_CONTEXT | 83.1 | +1.4 |
| RAG_HYBRID_RERANK | 85.7 | +4.0 |

*Table 2: Mean quality scores across all 1,999 experiments. Query expansion underperformed even the no-retrieval baseline.*

Two things worth noting. Plain vector RAG and adaptive context land in between — retrieval helps, but reranking is what separates the top method. And query expansion *hurt*: on average it scored below doing no retrieval at all.

## The effect depends on the provider

The headline number hides real variance. Broken down by provider, with the honest caveats the numbers demand:

| Provider | n | Δ (hybrid − direct) | Cohen's d | Verdict |
|---|---|---|---|---|
| DeepSeek | 1,644 | +3.5 | 0.415 | Real, medium effect |
| OpenAI GPT-4 | 171 | +10.3 | 0.723 | p = 0.067, misses 0.05 |
| Anthropic Claude | 184 | −6.0 | −0.420 | Negative, not significant |

*Table 3: Hybrid RAG's advantage over direct prompting is not uniform across providers.*

The DeepSeek subset is my largest dataset and shows a genuine medium-sized gain. OpenAI shows the biggest gap but doesn't clear the significance threshold at this sample size. Anthropic went *negative* — small sample, but I report it as-is. If you're picking a stack, "RAG always helps" is not a claim this data supports.

## Harder prompts, harder templates

Two other findings held up across conditions.

Performance **degrades with prompt complexity** — from 88.5 at L1 down to 75.6 at L5 in the DeepSeek data — though the hybrid method kept its edge at every level. Keep prompts at medium complexity (L3–L4) where you can.

And some CSR categories are simply harder: demographics was the easiest (85.2), while adverse events (74.3) and safety labs (76.8) were the most challenging. If you're scoping automation, start with demographics and efficacy, not AE tables.

## From template to executable R: debugging converges

A good template is only half the deliverable — someone still has to write the R code. Zero-shot code generation from the templates had a low success rate, so I built an iterative LLM-guided debugging loop:

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

That last point makes this a pipeline argument, not just a benchmarking exercise. It directly motivates the four-agent architecture in the paper:

![Four-agent pipeline: query analysis feeds template generation with hybrid RAG and reranking, then R code generation, then an execute-and-debug loop that patches failures back into code generation](/figures/benchmarking-rag-clinical-tlf-templates-pipeline.svg)

*Figure 1: The four-agent pipeline — query analysis, template generation, code generation, and an execution/debug loop that iterates up to 14 rounds.*

## Limitations I'd flag before you adopt this

The manuscript is explicit about these, and they matter:

- The evaluation used mock templates conforming to standard conventions, **not a real regulatory submission pipeline**. Company-specific legacy templates are future work.
- Debugging success meant the script *executed* — I did not validate the statistical content of the outputs beyond shape checks. Human review remains essential in production.
- The debugging loop has a real compute cost at scale; the paper suggests flagging scripts that still fail after 3–4 rounds for human review.
- Even hybrid RAG fails on some L5 prompts where retrieved documents conflict or formatting rules are esoteric.
- The study had no statistician co-author — a limitation the paper states plainly.

## Key takeaways

- Hybrid RAG with reranking beat direct prompting on TLF template quality (85.7 vs. 81.7, p < 0.05) across 1,999 bootstrap experiments, while query expansion scored below no retrieval at all.
- The method effect is provider-dependent: +3.5 points on DeepSeek, +10.3 (n.s.) on OpenAI, and −6.0 (n.s.) on Anthropic — "RAG always helps" is not supported.
- Template quality degrades from L1 to L5 prompt complexity, and adverse-event and safety-lab templates are harder than demographics; scope automation accordingly.
- An iterative debugging loop raised R-code execution success from a low zero-shot rate to 70% within 3–5 rounds, and higher-fidelity templates needed fewer rounds — upstream quality pays out downstream.
- Execution success is not statistical correctness; keep human review behind validator gates in production.

The full details — all tables, the paired bootstrap methodology, and the reproducible analysis code — are in the [full paper](/papers/pharmasug-2026-ap-211.html), presented at PharmaSUG 2026, with code at the companion GitHub repo.
