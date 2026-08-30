---
title: "SAS to R Migration in Clinical Programming: A Practical Field Guide"
date: 2026-08-30
description: "Why pharma is moving from SAS to R, what breaks in practice (procedures, XPT files, QC), and how to migrate a validated macro library without a rewrite."
tags: ["sas-to-r", "pharmaverse", "admiral", "clinical-programming", "xpt", "validation"]
kind: explainer
canonicalPath: /blog/sas-to-r-migration-field-guide.html
---

In 2021, Novo Nordisk submitted a regulatory package to the FDA built entirely on open-source R — the first of its kind — and the agency reviewed it without demanding SAS. Since then, Roche, GSK, and others have run R-based pilots, and the pharmaverse package family has matured into something a validation team can defend. The question at most sponsors has shifted from "can we use R?" to "which parts of a 15-year-old validated SAS library do we move, and in what order?"

That second question is where migrations actually fail — not on ideology, but on PROC UNIVARIATE percentile definitions, 8-character XPT variable names, and QC teams built around two SAS programmers typing the same code twice.

> **TL;DR** — SAS-to-R migration is a sequencing problem, not a translation problem. The pharmaverse stack (admiral, metacore, metatools, xportr) covers the ADaM-to-XPT pipeline today. Migrate by domain with dual-run QC as the exit gate, and keep validated legacy macros wrapped and untouched until each replacement proves parity.

## Why the industry is moving

The drivers are practical, not philosophical:

- **Cost and licensing.** SAS licenses are expensive and per-seat. R is free, which changes the economics of scaling a programming team from tens to hundreds.
- **Talent.** New graduates arrive fluent in R and Python. SAS-only hiring pools shrink every year, and cross-training takes months.
- **Reproducibility expectations.** Open-source code can be inspected by anyone — reviewers, collaborators, regulators — without a license check. Scripting languages also sit more naturally in version control and CI pipelines than a licensed runtime.
- **Regulator neutrality.** The FDA's guidance has never required SAS. It requires reproducible, reviewable analysis — and agencies have now reviewed real submissions produced in R, which removed the "but the agency expects SAS" objection.
- **The AI tooling gap.** Most LLM and automation tooling targets R and Python first. A validated SAS library that only emits RTF is invisible to that ecosystem.

None of this means SAS is dead. Most submissions in flight today still run on SAS, and nothing is gained by rewriting a macro library that regulators have reviewed for years. The mistake is treating migration as all-or-nothing.

## What actually breaks

Every migration I've seen stalls on the same four things. None of them are surprising; all of them are discovered the hard way.

**1. Statistical procedure equivalents aren't 1:1.** The function exists in R, but the defaults differ — missing-value handling, denominator definitions, rounding, tie-breaking, and degrees-of-freedom corrections all vary.

| SAS procedure | R equivalent | Where the results silently diverge |
|---|---|---|
| PROC FREQ | `table()`, `janitor::tabyl()`, `gtsummary` | Exact tests and CI methods default differently |
| PROC MEANS / SUMMARY | `dplyr::summarise()` | `NWAY`, missing-class handling, statistic keywords |
| PROC UNIVARIATE | `quantile()`, `psych::describe()` | SAS `PCTLDEF` offers five percentile definitions; R has nine |
| PROC GLM | `lm()` | Type I/II/III sums of squares |
| PROC MIXED | `lme4`, `glmmTMB`, **`mmrm`** | Kenward-Roger df, covariance structures — the `mmrm` package was built specifically to match SAS output |
| PROC LIFETEST | `survival::survfit()` | Survival CI methods, ties in log-rank |
| PROC PHREG | `survival::coxph()` | Ties handling: SAS `EXACT` vs R's Efron default |

*Table 1: Common procedure mappings. The risk column is the part that costs you weeks in QC, not the function name.*

**2. XPT transport files.** Submissions still require v5 transport files, which carry 1980s constraints: 8-character variable names, 40-character labels, 200-character string fields, and no support for datetime types. R's `haven` reads SAS formats well; writing valid XPT is where teams trip — the `xportr` package exists precisely to enforce the spec-driven metadata (lengths, labels, formats, types) that v5 requires. Test your XPT round-trip early, on real data, including Unicode in labels.

**3. Independent QC.** The traditional model is double programming: two programmers independently produce the same output, and a clean diff is the QC. That model survives a language change — but only if you compare artifacts, not code. Dataset-level comparison tools (`diffdf` in R, PROC COMPARE on the SAS side) plus TLF cell-level comparison become the shared contract. The QC programmer never needs to read the production language.

**4. Rounding and floating point.** SAS and R round halves differently in edge cases, and their internal numeric representations surface differently on export. You will spend a week on a `0.004999` somewhere. Budget for it.

## The pharmaverse stack

The pharmaverse is a curated family of open-source R packages maintained by pharma companies under the PHUSE umbrella, covering the clinical reporting pipeline end to end. For an ADaM-to-submission workflow, the core pieces are:

| Package | Role in the pipeline |
|---|---|
| `pharmaversesdtm` / `pharmaverseadam` | Example SDTM and ADaM data for development and testing |
| `metacore` | Reads your define.xml / spec spreadsheet into a standardized metadata object |
| `metatools` | Builds datasets from that metadata: derive from predecessors, check variables, order columns |
| `admiral` (+ therapeutic-area extensions like `admiralonco`) | ADaM derivations, one variable at a time, with traceable function calls |
| `xportr` | Applies spec-driven types, lengths, labels, and formats, then writes compliant v5 XPT |

*Table 2: The pharmaverse pipeline, in execution order.*

A minimal end-to-end shape looks like this:

```r
library(metacore); library(metatools); library(admiral); library(xportr)
spec <- spec_to_metacore("adam_spec.xlsx", quiet = TRUE)

adsl <- select_dataset(spec, "ADSL") |>
  build_from_derived(adsl_data) |>
  check_variables() |>          # spec conformance
  order_cols() |>
  xportr_type("ADSL.xpt") |>
  xportr_length("ADSL.xpt") |>
  xportr_label("ADSL.xpt") |>
  xportr_write("ADSL.xpt")      # validated v5 transport file
```

Two things to note. Admiral's one-variable-at-a-time design is deliberate — each derivation is independently reviewable and traceable back to the spec. And the packages are composable: you can adopt `xportr` alone to fix XPT export without touching anything else.

## Three migration patterns, one recommendation

There are three ways organizations actually do this, and they differ mostly in re-validation scope:

![Three SAS-to-R migration paths compared: big-bang rewrite, freeze and greenfield, and wrap-and-retire by domain](/figures/sas-to-r-migration-field-guide-paths.svg)

*Figure 1: Migration paths. Risk and re-validation scope drop from path 1 to path 3; elapsed time rises.*

- **Big-bang rewrite.** Everything is rewritten and cut over at once. The re-validation surface is the entire library, the old and new systems must agree on every output simultaneously, and any slip leaves you with two half-finished stacks. This is the path that gives migrations their bad reputation.
- **Freeze and greenfield.** Legacy stays in SAS; new studies start in R. Low risk, but the library never shrinks — you now maintain two toolchains, two hiring profiles, and two validation envelopes indefinitely. Many organizations are quietly living here.
- **Wrap and retire by domain.** Leave the validated macros untouched behind a wrapper so they keep running (and keep their regulatory standing), then replace one domain or report type at a time in R. A domain "retires" only when the R version passes dual-run QC against the SAS output at the cell level.

The third pattern is the one I recommend — it's the approach behind [wrapping a 558-macro legacy library without modifying it](/blog/non-destructive-legacy-modernization-sas.html). The wrapper captures legacy outputs in machine-readable form on day one and gives you a clean seam to retire components incrementally instead of betting the library on a cutover weekend.

## A sequence that works

If I were starting a migration next quarter, the order would be:

1. **Stand up the pipeline on new work.** New studies start on pharmaverse from day one. This builds team skill without touching validated code.
2. **Instrument the legacy library.** Wrap it so its outputs become comparable artifacts (datasets, typed cells), not just RTF. This is what makes automated parity checking possible at all.
3. **Fix XPT export early.** It is the least glamorous and most submission-blocking piece. Prove a compliant round-trip before you migrate anything that matters.
4. **Retire domain by domain, cheapest first.** Start with report types that have simple denominators and no mixed models. Demographics and disposition before efficacy and safety analyses with complex estimands.
5. **Make cell-level dual-run QC the only exit gate.** A domain retires when its R implementation matches the wrapped SAS output, not when someone feels confident.

One tail benefit: modular, spec-driven R derivations are a tractable target for LLM-assisted code generation — we explored that in [fine-tuning a small local model on admiral code](/blog/fine-tuning-small-llms-admiral-r.html), and the migration patterns above are what make that automation safe to adopt.

## Key takeaways

- SAS-to-R migration is a sequencing problem: the failure mode is a big-bang cutover, not the R language itself.
- Procedure equivalents exist for everything, but defaults differ — percentile definitions, tie handling, and Kenward-Roger df are where parity dies quietly.
- XPT v5 constraints (8-char names, 40-char labels, no datetimes) block submissions, so validate the export path before migrating analysis code.
- The pharmaverse stack (metacore → metatools → admiral → xportr) covers the ADaM-to-XPT pipeline with spec-driven, traceable derivations.
- Wrap validated legacy macros instead of rewriting them, and retire domains only after cell-level dual-run QC passes.

## FAQ

### Does the FDA accept submissions analyzed in R?

Yes. The FDA has never mandated a specific software package; it requires reproducible, well-documented analysis. The first all-R regulatory submission was reviewed in 2021, and several sponsors have run R-based pilots since.

### What is the pharmaverse?

The pharmaverse is a curated collection of open-source R packages for clinical trial reporting, maintained collaboratively by pharma companies under PHUSE. Key packages include admiral for ADaM derivations, metacore and metatools for metadata-driven dataset construction, and xportr for compliant XPT export.

### Can R read and write SAS XPT transport files?

Yes. The `haven` package reads SAS datasets and transport files, and `xportr` writes validated v5 XPT files with spec-driven types, lengths, and labels. Test the round-trip on real data early, including Unicode characters in labels.

### Do I have to rewrite all my validated SAS macros?

No. Non-destructive patterns wrap the legacy library so it runs unchanged behind a metadata layer, preserving its validation envelope. You then retire one domain or report type at a time, using cell-level dual-run QC as the exit gate for each retirement.

### How does double-programming QC work when production is in R and QC is in SAS?

Compare artifacts, not code. Dataset-level tools like `diffdf` and PROC COMPARE, plus cell-level TLF comparison, give both sides a shared contract. The independent QC programmer works in whichever language they know and never needs to read the production code.

## Further reading

- [Modernizing a 558-Macro SAS Library Without Touching a Line of Validated Code](/blog/non-destructive-legacy-modernization-sas.html) — the wrap-and-retire pattern applied to a real legacy TFL library, with cell-level parity results.
- [Fine-Tuning LLaMA 3.1 8B for Admiral R Code](/blog/fine-tuning-small-llms-admiral-r.html) — what becomes possible once your derivations live in modular, traceable R code.
