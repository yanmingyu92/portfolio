---
title: "Double Programming Without the Duplication: AI-Generated QC Code"
date: 2026-08-25
description: "Independent QC re-programming costs 30–50% of clinical programming effort. An AI framework matched 97.1–100% of variables while keeping independence intact."
tags: ["qc-programming", "clinical-trials", "llm-agents", "adam", "validation"]
kind: deep-dive
canonicalPath: /blog/eliminating-qc-programming-duplication.html
paperRef: pharmasug-2026-ai-201
---

Every statistical programmer knows this scene. Production finishes the ADaM dataset. Then a second programmer — the QC programmer — opens the *same* specification and writes the *same* derivations again, from scratch, deliberately without looking at the production code. Both parse identical specs. Both implement the same edge-case handling. QC effort scales linearly with production, at an estimated 30–50% of total clinical programming effort (Lyons & Bae, PharmaSUG 2023).

That duplication is the price of independence. In our PharmaSUG 2026 paper (AI-201, with Jason Zhang), we asked whether an AI agent can generate the QC side of that pair — while keeping the operational independence that makes double programming worth paying for.

> **TL;DR** — A Claude-based workflow generates independent QC code in Python directly from ADaM specifications, using a QC Trace Tree, a Decision Router, and an automated code review engine. On the CDISCPilot01 benchmark it matched 97.1%–100.0% of variables across five ADaM domains and passed all 13 property-based assertions — with the human QC programmer kept as the genuinely independent judgment layer.

## Why "just have AI write the QC code" fails

Two failure modes kill the naive version. The obvious one: if the QC instance sees the production code, it is not independent QC — it is copy-editing. The subtler one: if both instances share model weights, they tend toward the same systematic misreadings of the spec. That is the common-cause failure problem from the N-version programming literature, applied to LLMs.

The framework therefore enforces **operational separation at the infrastructure level**, not as a prompting convention:

- Separate API sessions with distinct credentials and IAM roles.
- Input isolation — the QC instance receives only specifications and SDTM data; production artifacts are blocked.
- Audit logging of all inputs, outputs, model versions, and skill versions.

One point the paper is explicit about: the human QC programmer is the genuinely independent judgment layer. The second AI instance is not what mitigates same-model bias — the human reviewer is.

## Three mechanisms that make the output auditable

Before any code is written, three author-built components shape the agent's work:

- **QC Trace Tree.** The agent must produce a structured tree — one node per derived variable, with spec source, extracted logic, edge cases, flagged ambiguities, and verification criteria — *before* generating code. This inverts traditional code review: intent is stated explicitly, and the reviewer checks that the code matches the stated intent.
- **Decision Router.** A four-gate pipeline (spec AI-readiness → ADaM class → per-variable complexity → risk override) that routes each dataset to full AI generation, AI with enhanced review, or manual QC.
- **Automated code review engine.** A static analysis tool checking 22 rules across 7 SOP categories, including hardcoding detection and — critically — ground-truth data leakage detection.

The trace tree looks like this in practice (ADSL excerpt):

```text
ADSL QC Trace Tree (31 nodes)
|-- TRTSDT [Spec: 3.1 Row 10] (standard)
|   |-- Source: SDTM.EX.EXSTDTC
|   |-- Logic: MIN(datepart(EXSTDTC)) per USUBJID
|   |-- Edge cases: partial dates -> FLAGGED (spec silent)
|   |-- Ambiguities: 1 (partial date handling)
|   +-- Verify: type=date, TRTSDT <= TRTEDT
```

The human reviews the tree, resolves flagged ambiguities, and only then does code generation proceed — with code comments referencing tree nodes.

![The four-gate Decision Router routing datasets to full AI generation, AI with enhanced review, or manual QC](/figures/eliminating-qc-programming-duplication-router.svg)

*Figure 1: The Decision Router's four gates and three routing outcomes, with benchmark routing results annotated.*

## What the benchmark showed

We evaluated against the CDISCPilot01 eSubmission Benchmark: 254 ITT subjects and five ADaM domains, across 138 trace tree nodes and 51,294 matched records.

| Metric | Result |
|---|---|
| ADaM domains | 5 — ADSL, ADAE, ADADAS, ADLBC, ADTTE |
| Variable-level match vs ground truth | 97.1%–100.0% (ADTTE 6/6; ADADAS lowest at 97.1%) |
| Property-based assertions | 13/13 passed (TRTSDT ≤ TRTEDT, BASE = AVAL at baseline, CNSR ∈ {0,1}, …) |
| Router decisions | 4 datasets to full AI generation; ADSL to enhanced review (5 complex variables, 6 ambiguities) |
| Code review findings | 207 across 7 SOP categories, including 1 high-severity data leakage risk |
| End-to-end run time | ~84 minutes, of which 46 (55%) was human trace-tree review |

*Table 1: CDISCPilot01 benchmark outcomes for the AI-generated QC workflow.*

The single high-severity finding deserves a pause. The review engine caught the agent reading the ground-truth ADSL to infer an unspecified SITEGR1 pooling threshold — exactly the independence violation the engine exists to catch. The mechanism worked on the failure it was built for.

Every remaining mismatch traced to a specification ambiguity the trace tree had already flagged before code generation: visit windowing rules (ADADAS AVISITN at 90.9%), baseline visit selection (WEIGHTBL at 93.7%), and coding conventions (ANRIND at 96.2%).

On efficiency: practitioners familiar with these datasets estimate manual QC at 3–5 programmer-days. The full run was roughly one day of human–AI collaboration. That comparison needs real-world validation before anyone budgets against it.

## Where the framework fell short

The manuscript is honest about the limits, and so am I:

- **The router misjudged ADADAS.** It routed the dataset with the lowest match rate (97.1%) to *full* AI generation, same as ADTTE at 100%. LOCF imputation plus non-trivial visit windowing deserves enhanced review even when per-variable complexity counts look low. The thresholds need recalibration.
- **One benchmark, one model.** CDISCPilot01 specs scored 5/6 on our AI-readiness checklist — cleaner than most production specs. Results with other LLMs and messier specs are unknown.
- **Same-model bias is real.** Two Claude instances are not statistically independent reasoners. The human reviewer is the independence, and AI-generated code must always be reviewed by qualified programmers before regulatory use.

## Key takeaways

- Independent QC programming re-derives production code from the spec alone and costs an estimated 30–50% of clinical programming effort — the value is the independent interpretation, not the re-typing.
- Enforce independence at the infrastructure level (separate sessions, blocked production inputs, audit logs), not as a prompting instruction the model can drift from.
- On CDISCPilot01 the framework matched 97.1%–100.0% of variables and passed 13/13 assertions; every residual mismatch was a spec ambiguity the trace tree had flagged before generation.
- The automated review engine caught a real ground-truth leakage attempt — the exact failure mode double programming exists to guard against.
- The human QC programmer remains the genuinely independent layer; AI-generated QC code still requires qualified human review before regulatory use.

## FAQ

### Does AI-generated QC code still count as independent QC?

Only if independence is enforced structurally. In this framework the QC instance runs in a separate API session, receives only specifications and SDTM data, and is blocked from production artifacts — with a human QC programmer as the final independent judgment. If the QC instance can see production code, it is copy-editing, not QC.

### What happens when the specification is ambiguous?

The QC Trace Tree forces the agent to flag ambiguities before any code is written, and the human resolves them at tree-review time. In the benchmark, every residual mismatch traced back to one of these flagged ambiguities — visit windowing, baseline selection, and coding conventions.

### How much time does this actually save compared with manual QC?

On CDISCPilot01, the full run took about 84 minutes for five datasets, 46 of them human review, against an estimated 3–5 programmer-days for manual QC. That is one clean benchmark with one model, so treat it as a directional signal, not a planning number.

---

Full details, including the decision router breakdown and the complete code review rule reference, are in the [full paper](/papers/pharmasug-2026-ai-201.html) from PharmaSUG 2026. The experiment code is public at [github.com/yanmingyu92/ai-qc-code-generation](https://github.com/yanmingyu92/ai-qc-code-generation).
