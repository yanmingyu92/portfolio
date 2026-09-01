---
title: "P-Values and Tests a Clinical Programmer Must Be Able to Explain"
date: 2026-09-01
description: "The tests a clinical SAS programmer must explain: p-values, confidence intervals, Wilcoxon, Fisher, MMRM, log-rank, multiplicity, and the QC craft behind every cell."
tags: ["clinical-sas", "statistics", "p-values", "interview"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 19
canonicalPath: /blog/p-values-statistical-programmer-faq.html
draft: true
---

"This SAP specifies Wilcoxon for the primary endpoint. Why?" Round two of the interview. The candidate who just wrote a clean merge on the whiteboard goes quiet, because the question sounds like statistics class. It is not. It asks whether the candidate can read a SAP, recognize what the statistician chose and roughly why, and QC the table that comes out of it. Part 10 covered the four rounds of the clinical SAS interview; this part goes a level deeper on the round that decides, because statistical reasoning is where programming candidates freeze, and the material is exactly what a working programmer replays every week at the desk.

> **TL;DR** — Programmers do not choose the tests; they explain them, program them, and prove the outputs right. This post covers the p-value, confidence intervals, and every test family a clinical programmer meets, from t-test to log-rank, plus why SAPs moved from LOCF to MMRM and the cell-level QC craft that makes a statistical table defensible in review.

## The fundamentals

### The p-value, in one honest paragraph

A p-value is the probability of observing data at least as extreme as what was observed, computed under a statistical model in which the null hypothesis holds. A small p-value says the data sit awkwardly with the null; a large one says they do not. That is the entire claim. A p-value is not the probability that the null is true, not the probability that the result was chance, and not a measure of how large or important an effect is. For the programmer it is one cell in a TLF with a narrow duty: the right test, run on the right records, with the right N, transcribed into the table without damage. Everything else in this post protects that one cell.

### Why TLFs pair estimates with confidence intervals

A confidence interval at the SAP-stated level (95 percent is the default) gives the range of parameter values compatible with the observed data under the model. The estimate says where the signal points; the interval says how precisely. A tiny p-value can ride on an interval so wide that no clinically meaningful conclusion survives it, and the pair is how a reviewer sees that. This is why shells give the two a shared row ([Part 3](/blog/tlf-shell-to-rtf-tutorial.html) covers the shell contract), and why QC checks them together: same population, same N, and the interval built around the exact estimate printed beside it.

### t-test or Wilcoxon: what the switch is telling you

The t-test compares two group means and assumes the data behave well enough for that comparison; Wilcoxon (the rank-sum test) compares two distributions using ranks and asks far less of the data. SAPs switch when the endpoint is skewed, such as lab deltas or pain scores, when it is ordinal, or when samples are small enough that no amount of theory rescues the mean. In SAS the pair is PROC TTEST and PROC NPAR1WAY with the WILCOXON option. The interview answer has two parts: name what each test compares, then name the condition that made the statistician switch. Nobody asks for a formula.

### Chi-square or Fisher: the expected-cell rule

For comparing proportions across groups, the chi-square test approximates the null distribution of the discrepancy between observed and expected counts, and the approximation degrades when counts get small. The working rule everyone quotes: when any expected cell count falls below about five, use Fisher's exact test, which computes the p-value rather than approximating it. In PROC FREQ the CHISQ option gives the asymptotic tests and the EXACT statement requests exact computation, which can get expensive as N grows. The programmer's duty is to confirm the table reports the one the SAP names, because the output contains both.

### ANOVA, ANCOVA, and why longitudinal SAPs moved to MMRM

ANOVA compares means across more than two groups. ANCOVA is that comparison adjusted for covariates, most classically the baseline value of the endpoint itself, which trims noise and corrects baseline imbalance. For repeated-measures endpoints the older approach imputed missing visits (LOCF, last observation carried forward) and analyzed the filled-in data; that manufactures flat trajectories and biases estimates when dropout is informative, and the industry spent years saying so. MMRM, the mixed model for repeated measures, analyzes all observed values under a missing-at-random assumption with no imputation, which is why longitudinal SAPs moved. In SAS that is PROC MIXED with a repeated effect and an unstructured covariance, and the denominator degrees of freedom in the output are how you confirm the model was fit as specified. The LOCF story, including the windowing decisions around it, gets a dedicated companion in [Part 17 on analysis windows, baselines, and LOCF](/blog/adam-windowing-baseline-locf-tutorial.html).

### CMH row mean scores: the engine inside shift tables

Shift tables cross baseline category against post-baseline category, and the question is whether the distribution moved differently by treatment. The Cochran-Mantel-Haenszel machinery answers it: the row mean scores statistic treats the ordinal categories as scores and tests whether the average score shifts across treatment, stratified by site or pool. PROC FREQ produces it when the strata variables sit on the left of the TABLES request and the CMH options are set. Two checks matter. The procedure emits several CMH statistics, so confirm the table prints the one the shell specifies. And confirm the score assignment behind it matches the SAP's category ordering. The datasets feeding these tables are the BDS builds from [Part 7](/blog/adam-bds-adlb-advs-tutorial.html).

### Log-rank, and why it ties straight to ADTTE

The log-rank test compares survival experience between groups across the whole follow-up time, using each event time and respecting censoring. It connects to the programmer's world through ADTTE, the dataset [Part 9](/blog/adtte-survival-tutorial.html) built: AVAL carries the durations, CNSR tells the procedure which records are events, and the Kaplan-Meier plot pairs with the test. In SAS it is PROC LIFETEST with a STRATA statement. The QC tie is exact: the number of events in the table must equal the count of CNSR = 0 records in the analysis population, and the censored count must reconcile the same way. A log-rank table that disagrees with its own ADTTE is wrong before any statistics get checked.

### Multiplicity in plain words

Every test run at the 0.05 level carries a five percent chance of a false alarm under the null; run a family of tests and those chances compound into a real probability of at least one spurious win. SAPs respond before the fact: a testing hierarchy, alpha split across endpoints or interim looks, adjusted p-values and adjusted intervals. The programmer's duty is transcription with fidelity: reproduce the adjusted values the SAP named, footnote the method the SAP named, and adjust nothing on initiative. When an interviewer asks what multiplicity means, two sentences above are the answer.

| Question the table answers | Test the SAP names | SAS procedure | What QC verifies |
|---|---|---|---|
| Do two group means differ? | t-test, or Wilcoxon when skewed | PROC TTEST / PROC NPAR1WAY | Ns tie to ADSL; means or medians match the data; CI pairs with the estimate |
| Do proportions differ? | Chi-square; Fisher when expected cells are small | PROC FREQ | Expected cell counts checked; the printed p is the test the SAP named |
| Do groups differ, adjusted for baseline? | ANCOVA | PROC GLM / PROC MIXED | Covariate set matches the SAP; LS-means and df checked |
| Does the trajectory differ over time? | MMRM | PROC MIXED | Visit structure, covariance type, denominator df |
| Did distributions shift from baseline? | CMH row mean scores | PROC FREQ | Correct CMH statistic printed; score order matches the SAP |
| Do survival curves differ? | Log-rank | PROC LIFETEST | Event and censored counts reconcile to ADTTE |

*Table 1: The test families a clinical programmer meets, the procedure that runs each, and what the QC pass verifies. The SAP names the test; the QC pass confirms it ran.*

```sas
/* Hand-verify one cell: responder comparison, Study XYZ */
proc freq data = adrs;
  where paramcd = "RSP24" and ittfl = "Y";
  tables trt01p * avalc / chisq expected;
  exact fisher;
run;

/* Cross-foot: analysis N against the ADSL population flag */
proc sql;
  select sum(ittfl = "Y") as n_itt,
         count(distinct usubjid) as n_subj
  from adsl;
quit;
```

### The QC craft: one cell per statistical block

Independently verifying an entire inferential output is expensive; verifying nothing is how defects reach reviewers. The working middle is to hand-verify one cell per statistical block. Pick a cell, rebuild it from the analysis data (the N, the numerator, the proportion or mean), then confirm the test statistic and its degrees of freedom against the procedure's ODS output rather than the rendered table. Three more passes cover the rest of the block. Cross-check every N against the ADSL population flag, because a wrong denominator is the most common defect in regulatory tables. Reconcile model outputs the same way: when a table shows a hazard ratio from PHREG or model-based means from GENMOD or MIXED, diff the ODS output dataset against the displayed cell instead of eyeballing the listing. And check rounding against the shell: p-values below the display floor shown as "< 0.001", percentages at one decimal, means at the decimals the shell specifies, because a rounded cell that cannot be traced back to the ODS value is a query in waiting.

## The modern workflow

The same tests exist in R with first-class implementations, and the pharmaverse stack packages the longitudinal ones: the mmrm package mirrors PROC MIXED's repeated-measures role, and the survival package covers LIFETEST territory. Regulators have accepted R-based submissions in the pilot programs, so equivalence QC is now a real skill: run both engines on the same analysis data, diff the outputs cell by cell, and document the tolerance. Inside the SCE the inferential outputs get the same reproducibility treatment as everything else: pinned procedure versions, ODS output datasets stored with the run rather than screenshots, and every table regenerable from locked ADaM by one build. That is the Part 1 contract applied to statistics.

Interview preparation is the other modern shift. The four-round structure from [Part 10](/blog/clinical-sas-interview-questions-guide.html) now regularly dips into this material in round two, and reading these sections is the weak form of preparation. The strong form is drilling aloud: answer spoken and timed, then compared against the signals. Part 10's companion skill, clinical-sas-interview-drill, runs exactly that loop, and the statistics questions above drop straight into it.

## The agentic way

Agents draft statistical SAS quickly and produce first-pass QC notes that read convincingly. Two failure modes dominate. The near-neighbor test: the agent implements something adjacent to the specified test, a t-test where the SAP says Wilcoxon, an asymptotic chi-square where the SAP says exact, and the output still looks complete. And reconciliation in the wrong direction: when table and program disagree, the agent edits the table to match the program instead of escalating the discrepancy. The verification habit handles both. Before it writes, the agent quotes the SAP sentence that names the test. After it runs, the ODS output dataset gets diffed against the rendered cells. What cannot be delegated is the judgment the SAP owns and the signature on the QC record, the boundary drawn in [AI coding assistants in GxP programming](/blog/ai-coding-assistants-sas-gxp.html).

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents draft inferential programs and QC notes fast; the failure modes are near-neighbor tests and reconciliation in the wrong direction. Make the agent quote the SAP sentence naming the test, then diff ODS output against every cell it reports.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-09-01. Re-verify before relying on tool specifics.</p>
</div>

## Key takeaways

- Explain-level statistics wins the interview and the QC desk: for each test, what it compares, when SAPs switch to it, and which procedure runs it.
- Confidence intervals ride next to estimates because precision is a separate axis from signal; verify the pair against one population and one N.
- The expected-cell rule (about five) decides chi-square versus Fisher; PROC FREQ prints both, so confirm the table reports the one the SAP names.
- Longitudinal SAPs moved to MMRM because LOCF manufactured flat data under informative dropout; the denominator df in PROC MIXED output confirms the model as specified.
- Hand-verify one cell per statistical block, tie every N to ADSL, and check rounding against the shell before any p-value is trusted.

## FAQ

### Do clinical SAS programmers need real statistics to get hired?

Explain-level statistics, yes; derivation-level, no. Interviews probe whether you can say what a test compares and why a SAP chose it, and whether you can QC its output. Working through this post and Part 10 covers the question space interviews actually draw from.

### What is the most common statistical defect in regulatory tables?

A wrong denominator: the N under a percentage that does not match the population flag in ADSL. It beats every subtle statistical error in frequency, and it is the cheapest to catch. Cross-foot every N against the population counts before reading any p-value.

### How do I explain multiplicity in one interview answer?

Running many tests at 0.05 multiplies the chance of a false positive, so the SAP pre-declares how alpha is spent: a hierarchy, splitting, or adjustment. Then say what you do about it as the programmer: reproduce the adjusted values and footnote the method, exactly as pre-specified.

### Why did SAPs move from LOCF to MMRM?

LOCF fills each missing visit with the last seen value, which invents flat data and biases results when dropout relates to outcome. MMRM analyzes all observed data under a missing-at-random assumption with no imputation. The full windowing and LOCF treatment is [Part 17](/blog/adam-windowing-baseline-locf-tutorial.html).

### How should I practice these questions?

Aloud and on a cycle: answer from memory, compare against the signals here, log the weak items, and re-drill them after 48 hours. Recall is what the interview grades, and recall is built by retrieval rather than rereading. The clinical-sas-interview-drill skill from Part 10 automates the loop.

---

Previously: [Part 10, the clinical SAS interview guide](/blog/clinical-sas-interview-questions-guide.html), whose CDISC round this part extends. The log-rank material assumes [Part 9's ADTTE](/blog/adtte-survival-tutorial.html); rounding and shell contracts come from [Part 3, TLF shell to RTF](/blog/tlf-shell-to-rtf-tutorial.html); and [Part 17](/blog/adam-windowing-baseline-locf-tutorial.html) takes the LOCF and windowing story from here. For where assistants may draft statistical programs at all, see [AI coding assistants in SAS and GxP](/blog/ai-coding-assistants-sas-gxp.html).
