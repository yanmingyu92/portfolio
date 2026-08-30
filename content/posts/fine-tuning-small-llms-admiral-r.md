---
title: "Fine-Tuning LLaMA 3.1 8B for Admiral R Code: From 0.36 to 0.82"
date: 2026-08-07
description: "Base LLaMA 3.1 8B scores 0.36 on Admiral code generation. LoRA fine-tuning plus knowledge-graph validation gets it to 0.82 — without sending data to an API."
tags: ["fine-tuning", "lora", "admiral", "adam", "small-llms"]
kind: deep-dive
canonicalPath: /blog/fine-tuning-small-llms-admiral-r.html
paperRef: phuse-2025-os08
---

Point a stock 8-billion-parameter model at an ADaM derivation task and you get R code that *resembles* Admiral — right function names, roughly right arguments — until it quietly invents a parameter or drops a source dataset. In our benchmark, base LLaMA 3.1 8B scored an Overall Performance Score (OPS) of **0.36**, with code execution accuracy of just 0.35. GPT-4o scores 0.91 on the same tasks, but shipping clinical trial specifications to a cloud API is a non-starter for many sponsors.

So the question behind our PhUSE US Connect 2025 paper (OS08): can a locally deployable 8B model, fine-tuned on curated Admiral examples, get close enough to be useful?

> **TL;DR** — Yes, mostly. LoRA fine-tuning on knowledge-graph-filtered Admiral examples lifts LLaMA 3.1 8B from OPS 0.36 to 0.82 — within 0.09 of GPT-4o — on a single workstation GPU, with no data leaving your environment. Complex derivations still require human review; this is a drafting tool, not an autopilot.

## Why Admiral is a good fit for fine-tuning

Admiral processes **one variable at a time**, then merges results into the final dataset. That modularity maps naturally onto a question-answer training format:

- The **question** is the structured metadata for one variable — dataset name, variable name, specification.
- The **answer** is the Admiral R code for that derivation, preceded by an explicit metadata header: required functions, source datasets, and index variables.

```
<<admiral_functions: derive_vars_dt, derive_vars_duration>>
<<source_datasets: dm, ae>>
<<indexes: STUDYID, USUBJID>>
## Admiral R code for the derivation follows
```

*Listing 1: The answer format — a machine-checkable metadata header, then the code.*

The header isn't decoration. It gives the validator something deterministic to check — does the code actually call the declared functions, from the declared datasets? — and it keeps metadata separate from implementation, so the model learns to state its plan before writing code.

## Building training data the model can trust

Raw question-answer pairs from an LLM aren't good enough to train on directly. Fine-tuning on unfiltered LLM output just teaches the model to reproduce the base model's mistakes with more confidence. The pipeline has three stages to prevent that:

1. **Spec extraction.** A custom parser converts Excel-based ADaM specifications (content sheet, codelists, dataset structure) into hierarchical JSON, then into the Q-A format above.
2. **Dual augmentation.** Evolution-based enhancement (in the spirit of Evol-Instruct) scales complexity — adding variable dependencies, error handling, domain constraints — while function-based generation systematically varies Admiral function signatures and parameters to cover edge cases.
3. **Knowledge-graph filtering.** We crawled the official Admiral documentation and built a knowledge graph linking functions, datasets, and derivation rules. Every candidate record is scored by combining a graph-based score (vector similarity, deterministic term matching, path analysis) with an LLM validation score. **Records below a 0.8 confidence threshold are thrown out.**

![End-to-end fine-tuning pipeline](/figures/fine-tuning-small-llms-admiral-r-pipeline.svg)

*Figure 1: The pipeline — Excel specs become filtered Q-A pairs; LoRA training and knowledge-graph validation all run on local hardware.*

The same graph does double duty: it filters training data before fine-tuning, and it validates generated code at inference.

## Training on one workstation GPU

Nothing exotic — that's the point. The whole training run fits comfortably on workstation-grade hardware:

| Setting | Value |
|---|---|
| Base model | LLaMA 3.1 8B |
| Method | LoRA, rank 16, alpha 32 |
| Framework | Unsloth PEFT |
| Hardware | Single NVIDIA L4 (22.5 GB VRAM) |
| Optimizer | AdamW 8-bit |
| Learning rate | 2e-4 |
| Batch | 4, with 4 gradient accumulation steps |
| Training length | 1,000 steps |

*Table 1: Training configuration — no datacenter required.*

## Results: 0.36 to 0.82

We evaluated on 75 variables from a single Phase II cardiovascular study, spanning ADSL, ADAE, ADLB, ADTTE, ADVS, and ADRS, stratified into basic (30), intermediate (25), and complex (20) derivations. OPS combines validation confidence (weight 0.4), execution accuracy (0.35), and structural consistency with reference code (0.25).

| Metric | Fine-tuned LLaMA | GPT-4o | Base LLaMA |
|---|---|---|---|
| Confidence score | 0.82 | 0.91 | 0.42 |
| Execution accuracy | 0.85 | 0.94 | 0.35 |
| Structural consistency | 0.79 | 0.88 | 0.28 |
| **OPS** | **0.82** | **0.91** | **0.36** |

*Table 2: Head-to-head on 75 ADaM variable derivations.*

Fine-tuning buys **ΔOPS = 0.46** over the base model. The remaining 0.09 gap to GPT-4o is the price of staying local.

## Where it still fails

The complexity breakdown is the honest part of the results. Going from basic to complex derivations:

| Model | Basic OPS | Complex OPS | Degradation |
|---|---|---|---|
| GPT-4o | 0.93 | 0.87 | 6.5% |
| Fine-tuned LLaMA | 0.85 | 0.76 | 10.6% |
| Base LLaMA | 0.45 | 0.25 | 44.4% |

*Table 3: OPS by derivation complexity — fine-tuning's biggest win is robustness.*

Domain-specific fine-tuning doesn't just raise the average — it makes the model dramatically more robust as derivations get harder. Multi-dataset merging and chained function calls are exactly where the base model falls apart.

But 0.76 on complex variables means human review is mandatory, and the error distribution confirms it: 8.2% complex-logic errors, 4.3% multiple-dataset handling, 2.1% parameter specification. Two more caveats: this is **one study** — 75 variables from a single Phase II cardiovascular trial is a real but narrow benchmark, and generalization across therapeutic areas is future work. And if data privacy isn't a constraint, GPT-4o simply wins. The fine-tuned model's case is regulatory and practical, not qualitative.

## Key takeaways

- LoRA fine-tuning on curated Admiral examples takes LLaMA 3.1 8B from OPS 0.36 (unusable) to 0.82 (viable drafting assistant) for ADaM code generation.
- Knowledge-graph filtering of training data — discarding anything below 0.8 confidence — is what keeps fine-tuning from amplifying the base model's own mistakes.
- The entire pipeline trains on a single NVIDIA L4 and runs locally, so no clinical trial data leaves your environment.
- Fine-tuning's largest gain is robustness: the base model degrades 44.4% from basic to complex derivations, the fine-tuned model only 10.6%.
- Complex derivations (0.76 OPS) still demand human review — treat generated code as a first draft, never a deliverable.

Full methodology, training configuration, and the validation framework are in the [full paper](/papers/phuse-2025-os08.html), presented at PhUSE US Connect 2025.
