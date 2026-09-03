# Modernizing a 558-Macro SAS Library Without Touching Validated Code

<!-- Wechatsync target: Zhihu. Canonical: https://jaimeyan.com/blog/non-destructive-legacy-modernization-sas.html -->

Every large pharma company has one: a SAS macro library built up over 10–20 years that produces every table, figure, and listing in its regulatory submissions. Mine had 558 callable components across 400 source files — 372,698 lines of SAS 9.4 code, with some files over 3,000 lines. The macros encode validated statistical logic that regulators have reviewed for years. They also emit exactly one thing: RTF.

An LLM can't reason over a p-value buried in font directives. And the obvious fix — rewrite in R or Python — abandons validated logic and triggers re-validation costs that usually exceed the perceived benefit.

> **TL;DR** — A metadata layer (bridge map, typed intermediate representation, Python orchestrator) wraps the library unchanged: AI-ready JSON on day one, 11 of 14 real-study reports at ≥80% cell-level parity, and 100% parity on the public CDISCPilot01 benchmark. Consolidation is a separate opt-in track that cut SAS code 92% when exercised.

## The wall: validated code, RTF-only output

RTF is the wall. Cloud platforms can't run monolithic macros with hard-coded parameters. AI tools can't parse presentation markup into numbers. An estimated 70–80% of FDA electronic submissions still ride on SAS output that no AI tool can read.

So the choice looks binary: keep the validated library and stay AI-blind, or rewrite and re-validate. The framework I describe in a recent preprint takes a third path: **don't modify the legacy library at all. Wrap it.**

## The wrap: bridge map, typed IR, orchestrator

Three artifacts make up the metadata layer:

- **Bridge map** — a machine-readable registry with one entry per legacy macro call: `legacy_id`, `native_target`, `parameter_mapping`, `defaults`, plus optional `preamble_sas` and `post_calls`. Our map has 365 entries covering the library's calling surface.
- **Intermediate Representation (IR)** — every report becomes two typed datasets. `ir_cells` holds one row per cell with the raw numeric `cell_value`, the display string, and a `cell_type` from a controlled vocabulary (INTEGER, DECIMAL, PVALUE, PERCENTAGE, TEXT, HEADER, LABEL, FOOTNOTE, EMPTY). `ir_structure` defines the row/column grid. A reconcile step traces every numeric cell back to its source statistic within a 1×10⁻¹⁰ tolerance.
- **Python orchestrator** — 48 modules (15,855 LOC) that resolve YAML configuration, dispatch executions, and export the IR as JSON. It sits outside the regulated boundary; SAS keeps exclusive ownership of regulated computation.

![Pipeline: bridge map and orchestrator wrap unchanged legacy SAS macros and export a typed IR as AI-ready JSON](/figures/non-destructive-legacy-modernization-sas-arch.svg)

*Figure 1: Coexistence mode — metadata wraps the unchanged library, and the adapter captures output into the typed IR.*

In **coexistence mode**, a bridge entry's `native_target` points at the original legacy macro plus adapter metadata. The macro runs unchanged inside its existing validation envelope; the adapter captures its output into the IR. The deployment surface an organization manipulates is metadata, not source — so the library's regulatory standing is preserved by default, and AI-ready JSON is a Day-0 deliverable, not the end state of a multi-year rewrite.

## Proving the wrap doesn't break outputs

Wrapping is only credible if you can show the outputs still match. The parity harness runs each report through both a legacy driver and a native driver on identical input, then compares cell by cell, behind a seven-gate workflow (structural pre-flight, bridge-map self-audit, syntax smoke test, unit tests, live parity, triage, full matrix).

| Validation track | Reports | Cell-level parity result |
|---|---|---|
| Real data — PROT008-SR1 (internal Phase III) | 14 report types: AE, baseline, disposition, ECG, lab, compliance, listings | 11/14 ≥ 80% threshold (mean 82.7%, median 89.6%, best 99.2%) |
| Public benchmark — CDISC CDISCPilot01 | 5 report types | 100% — 4,764 cells, 0 mismatches |

*Table 1: Parity validation results for the wrapped library on real and public data.*

Getting from 8/14 to 11/14 on the real-data track took 72 targeted fixes — all at the framework layer, across twelve recurring divergence categories (denominator handling, zero-fill of sparse cells, TRT01A-vs-TRTA naming, RTF Unicode fallbacks). Fix once, apply everywhere.

The three real-data reports below 80% have a documented structural ceiling, not computational errors: the legacy macros use PROC TRANSPOSE to pivot treatments into rows, a different table geometry that cell-level comparison can't reconcile without a transpose-aware alignment layer.

## What the IR buys an LLM

Because the IR is typed, an LLM stops parsing and starts reasoning. In proof-of-concept tasks with Claude Opus 4.6 on CDISCPilot01-derived IR:

- **Summarization:** 100% exact-match extraction across all 74 cells of a demographics table — every count, percentage, mean, and SD correct, with `cell_type` used to separate headers from data rows.
- **Anomaly detection:** five of five expected clinical patterns found with zero false positives — including the dose-response in application-site erythema (8.1% placebo → 41.7% low dose → 61.9% high dose) and a SOC-vs-PT consistency check done arithmetically on raw `cell_value`s.
- **Configuration generation:** all five requirements from a natural-language SAP excerpt (Kaplan-Meier, Cox, log-rank, censoring, time variables) mapped to structurally valid YAML.

The table inputs came from legacy macros running *unchanged* in coexistence mode — this AI surface is what you get on day one, before any consolidation.

## Optional consolidation: the measured upper bound

Consolidation is a separate, opt-in track riding the same bridge map: flip an entry's `native_target` to a parameterized core macro. Exercising it across the whole library collapsed 558 components to 158 SAS files and cut SAS code 92% (28,340 vs. 372,698 LOC), with 147 YAML files covering 39 report types. I report that as a measured upper bound on the optional pathway, not a precondition — you can consolidate aggressively, conservatively, or never.

## Honest limitations

The methodology was validated on one library at one organization. Only 19 of 365 bridge entries have full end-to-end parity (the rest passed unit-level gate checks). The LLM experiments used a single model with no controlled IR-vs-RTF comparison. And the framework is Part 11-compatible by design but has not undergone formal IQ/OQ/PQ qualification — coexistence mode reduces that burden, it doesn't eliminate it.

## Key takeaways

- You can modernize a validated SAS library without modifying it: wrap it in a metadata layer and keep SAS inside the regulated boundary.
- Parity must be proven cell by cell — 11 of 14 real-study reports cleared the 80% threshold, and the public benchmark hit 100% across 4,764 cells.
- A typed IR turns RTF-bound tables into LLM input on day one: exact-match cell extraction, zero-false-positive anomaly detection, and SAP-to-YAML config generation all ran on coexistence output.
- Consolidation is optional and rides the same bridge map; exercised fully, it collapsed 558 components to 158 files and cut SAS code 92%.

Still, the core claim held up: you don't have to choose between keeping a validated SAS library and making it AI-readable. Wrap it, prove parity cell by cell, and modernize at your own pace. Details are in the [full paper](/papers/legacy-modernization-framework.html) (arXiv preprint, May 2026).

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/non-destructive-legacy-modernization-sas.html
