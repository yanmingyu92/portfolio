# Fine-Tuning LLaMA 3.1 8B for Admiral R Code: From 0.36 to 0.82

<!-- Wechatsync target: Zhihu. Canonical: https://jaimeyan.com/blog/fine-tuning-small-llms-admiral-r.html -->

If you've ever pointed an off-the-shelf small model at an ADaM derivation task, you know the failure mode: it produces R code that *resembles* Admiral — right function names, roughly right arguments — and then quietly invents a parameter or drops a source dataset. In our benchmark, base LLaMA 3.1 8B scored an Overall Performance Score (OPS) of **0.36**, with code execution accuracy of just 0.35. GPT-4o scores 0.91 on the same tasks, but sending clinical trial specifications to a cloud API is a non-starter for many organizations.

So the question we set out to answer in our PhUSE US Connect 2025 paper: can a locally deployable 8B model, fine-tuned on curated Admiral examples, get close enough to be useful?

## Why Admiral is a good fit for this

Admiral processes **one variable at a time**, then merges results into the final dataset. That modularity maps naturally onto a question-answer training format:

- The **question** is the structured metadata for one variable — dataset name, variable name, specification.
- The **answer** is the Admiral R code for that derivation, preceded by explicit metadata: required functions, source datasets, and index variables.

That answer header (`<<admiral_functions: ...>>`, `<<source_datasets: ...>>`, `<<indexes: ...>>`, then the code) isn't decoration — it gives the validator something deterministic to check, and it keeps metadata separate from implementation.

## Building the training data

Raw question-answer pairs from an LLM aren't good enough to train on directly. The pipeline has three stages:

1. **Spec extraction.** A custom parser converts Excel-based ADaM specifications (content sheet, codelists, dataset structure) into hierarchical JSON, then into the Q-A format.
2. **Dual augmentation.** Evolution-based enhancement (in the spirit of Evol-Instruct) scales complexity — adding variable dependencies, error handling, domain constraints — while function-based generation systematically varies Admiral function signatures and parameters to cover edge cases.
3. **Knowledge-graph filtering.** We crawled the official Admiral documentation and built a knowledge graph linking functions, datasets, and derivation rules. Every candidate training record is scored by combining a graph-based score (vector similarity, deterministic term matching, path analysis) with an LLM validation score. **Records below a 0.8 confidence threshold are thrown out.**

That last step matters more than it looks. Fine-tuning on unfiltered LLM output just teaches the model to reproduce the base model's mistakes with more confidence.

## Training setup

Nothing exotic — that's the point. LoRA with rank 16 and alpha 32 on LLaMA 3.1 8B, trained with Unsloth's PEFT framework on a single NVIDIA L4 (22.5 GB VRAM): AdamW 8-bit, learning rate 2e-4, batch size 4 with 4 gradient accumulation steps, 1000 steps total. This fits comfortably on workstation-grade hardware.

## Results

We evaluated on 75 variables from a single Phase II cardiovascular study, spanning ADSL, ADAE, ADLB, ADTTE, ADVS, and ADRS, stratified into basic (30), intermediate (25), and complex (20) derivations. OPS combines validation confidence (weight 0.4), execution accuracy (0.35), and structural consistency with reference code (0.25).

| Metric | Fine-tuned LLaMA | GPT-4o | Base LLaMA |
|---|---|---|---|
| Confidence score | 0.82 | 0.91 | 0.42 |
| Execution accuracy | 0.85 | 0.94 | 0.35 |
| Structural consistency | 0.79 | 0.88 | 0.28 |
| **OPS** | **0.82** | **0.91** | **0.36** |

Fine-tuning buys **ΔOPS = 0.46** over the base model. The remaining 0.09 gap to GPT-4o is the price of staying local.

The complexity breakdown is where it gets interesting. Going from basic to complex derivations, GPT-4o degrades 6.5% (0.93 → 0.87), the fine-tuned model 10.6% (0.85 → 0.76), and the base model 44.4% (0.45 → 0.25). Domain-specific fine-tuning doesn't just raise the average — it makes the model dramatically more robust as derivations get harder. Multi-dataset merging and chained function calls are exactly where the base model falls apart.

## Honest limitations

- **Complex derivations are still weak.** 0.76 OPS on complex variables means human review is mandatory, and the error distribution confirms it: 8.2% complex-logic errors, 4.3% multiple-dataset handling, 2.1% parameter specification. The generated code requires user validation — this is a drafting tool, not an autopilot.
- **One study.** 75 variables from a single Phase II cardiovascular study is a real but narrow benchmark. Generalization across therapeutic areas is future work.
- **GPT-4o still wins outright.** If data privacy isn't a constraint, the cloud model is simply better. The fine-tuned model's case is regulatory and practical, not qualitative.

## Takeaway

The pipeline — structured spec extraction, dual augmentation, knowledge-graph-filtered training data, LoRA fine-tuning, and graph-based validation at inference — turns an 8B model from unusable (0.36) into a viable local assistant (0.82) for Admiral code generation, with zero data leaving your environment. The same approach should transfer to any modular, function-based programming package, including SAS macro pipelines.

Full methodology, training configuration, and the validation framework are in the [full paper](/papers/phuse-2025-os08.html), presented at PhUSE US Connect 2025.

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/fine-tuning-small-llms-admiral-r.html
