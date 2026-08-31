---
title: "ADaM BDS Structure: Building ADLB and ADVS Step by Step"
date: 2026-08-30
description: "The BDS skeleton behind ADaM analysis datasets: PARAM/PARAMCD/AVAL, baseline flags, change from baseline, and how ADVS and ADLB are built visit by visit."
tags: ["clinical-sas", "adam", "bds", "adlb", "advs"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 7
skillArtifact: /skills/adam-adsl-derivation/SKILL.md
canonicalPath: /blog/adam-bds-adlb-advs-tutorial.html
draft: true
---

A change-from-baseline table shows a mean CHG of −7 mmHg for a vital-sign parameter nobody expected to move. The QC listing finds it in an afternoon: for eleven subjects, BASE came from the first record in the dataset, a screening value, while the SAP said last value on or prior to first dose. One baseline flag picked off the wrong record, and every change-from-baseline table in the study inherited the same error.

> **TL;DR** — BDS datasets carry one record per subject, parameter, and analysis timepoint, and most defects trace to violating that grain or the baseline rule. This post builds ADVS and ADLB step by step: the variable skeleton, baseline and analysis flags, visit windowing, change from baseline, shift from normal range, and the QC checkpoints that catch a wrong baseline before a reviewer does.

## The fundamentals

### The BDS skeleton

BDS, Basic Data Structure, is the grain behind most ADaM analysis datasets: one record per subject per parameter per analysis timepoint. ADVS for vital signs, ADLB for labs, ADRS for response — all of it builds on this shape. Compare ADSL (one row per subject, always) and OCCDS (one row per occurrence, the next post in this series).

| Variable | Role | Example |
|---|---|---|
| PARAMCD / PARAM | Parameter code and description | SYSBP / "Systolic Blood Pressure (mmHg)" |
| AVAL / AVALC | Analysis value, numeric and character | 118 / "118" |
| ADT / ADY | Analysis date and relative day | ADY anchored to TRT01SDT from ADSL |
| AVISIT / AVISITN | Analysis visit, after windowing | "WEEK 12" / 12 |
| ABLFL | Baseline record flag | "Y" on one record per subject-parameter |
| BASE / BASEC | Baseline value copied to every record | 118 |
| CHG / PCHG | Change from baseline | AVAL − BASE, and percent |
| ANL01FL | Analysis record flag | "Y" on records the analysis uses |
| DTYPE | Derivation type on derived records | "LOCF", "AVERAGE" |
| ASEQ | Analysis sequence number within subject | 1, 2, 3 |

*Table 1: The BDS skeleton. Treatment variables (TRTP, TRTA) and population flags merge in from ADSL and ride on every row.*

The grain is the contract. Duplicate a subject-parameter-avisitn key anywhere and downstream summaries double-count. Lose the distinction between collected and derived records, which is what DTYPE carries, and a reviewer cannot tell measurement from assumption.

### Baseline before everything

The baseline rule is a SAP sentence, usually "last non-missing value on or prior to first dose." Two properties matter. It keys on date relative to TRT01SDT, not on a visit label like "BASELINE", because labels drift between studies and dates do not. And it takes the last qualifying value, not the first.

```sas
/* Baseline flag: last non-missing value on/before first dose, Study XYZ */
proc sort data=vs1;
  by usubjid param adt avisitn;
run;
data vs_base;
  set vs1(where=(adt <= trtsdt and aval ne .));
  by usubjid param adt avisitn;
  if last.param then ablfl = "Y";
run;
```

Once the baseline record is flagged, BASE and BASEC copy onto every record for that subject-parameter, and CHG and PCHG follow: CHG = AVAL − BASE, PCHG = 100 × CHG / BASE where BASE is non-zero. Keep the baseline record in the dataset. The flag distinguishes it; deleting it breaks listings and traceability.

### ADVS step by step

Vital signs arrive in VS as one row per measurement. The build does four things in order.

First, parameters: PARAMCD from VSTESTCD, PARAM assembled from the test name and the standardized unit, so "Systolic Blood Pressure (mmHg)" cannot silently collapse with a record in different units. Second, dates and relative days: ADT parsed from VSDTC with a length check on the character string, ADY anchored to TRT01SDT, adding 1 on and after the anchor per the usual convention.

Third, windowing: protocol and unscheduled visits map into analysis windows per the SAP (a day range relative to first dose defines each window), and when several records land in one window the SAP picks the analysis record (last, first, or worst), with ANL01FL marking it. Fourth, derived records: replicate averages with DTYPE = AVERAGE, and LOCF rows only where the SAP asks for them.

### ADLB step by step

Labs arrive in LB with reference ranges attached. The same skeleton applies, plus two lab-specific moves.

Shift from normal range: classify each record against the standardized reference range (below, within, above), classify BASE the same way, and the shift table is a cross-tab of baseline class against worst post-baseline class. The comparison uses the subject's own reference range, which is why the range variables survive into ADLB.

```sas
/* Shift flag versus reference range at a visit, Study XYZ */
data shift;
  set adlb(where=(paramcd = "ALT"
                  and avisitn = 12
                  and anl01fl = "Y"));
  length shift $16;
  if base <= lnrhi and aval > lnrhi then shift = "NORM to HIGH";
  else if base > lnrhi and aval <= lnrhi then shift = "HIGH to NORM";
  else shift = "NO CHANGE";
run;
```

LOCF-style carrying, filling a missing visit with the last analysis value under DTYPE = LOCF, happens only when the SAP says so. It is a statistical assumption about missing data, not a programming convenience. A carried value is not a measurement and must stay distinguishable through DTYPE, or the tables will count it as one.

```sas
/* LOCF over a visit skeleton, only when the SAP asks, Study XYZ */
data locf;
  merge skel val;
  by usubjid paramcd avisitn;
  retain carry;
  if first.paramcd then carry = .;
  if aval ne . then carry = aval;
  else if carry ne . then do;
    aval = carry; dtype = "LOCF";
  end;
run;
```

Grade and toxicity mapping, conceptually: where the analysis reports CTCAE-style grades, the grade derives from the raw value against the subject's thresholds and lands as its own parameter rather than overwriting AVAL. The mapping table is standard- or study-specific, so it lives in the spec rather than in the program.

### Parameters first, or rows first

Every BDS build picks an order, and the choice is real:

| Approach | Build order | Fits when | Risk |
|---|---|---|---|
| Parameters first | Derive one PARAMCD at a time, stack results | Few parameters, different logic per parameter | Record-order surprises when stacking |
| Rows first | Build the full long dataset, flag and derive by parameter | Many parameters sharing one logic | Parameter-specific rules buried in a large step |

*Table 2: The design choice inside every BDS build. Mixed approaches are normal: response parameters usually go one at a time, lab panels go row-wise.*

### QC checkpoints

| Check | What it catches | How |
|---|---|---|
| Duplicates on subject-parameter-avisitn | Grain violations | NODUPKEY or FREQ check on the key |
| Baseline after first dose | Baseline rule violations | Listing: ABLFL = Y with ADT > TRT01SDT |
| More than one baseline per subject-parameter | Flag logic | Count of ABLFL = Y per key |
| Baseline record absent from the analysis set | Broken listings | Anti-join against the final dataset |
| CHG not equal to AVAL − BASE | Arithmetic drift | Recompute and compare |

*Table 3: The five checks I run on any BDS build before it leaves my desk. All of them are listings, because none of them is structural.*

## The modern workflow

In the SCE, ADVS and ADLB build after ADSL, from locked SDTM, under the same driver-script-and-archived-logs pattern as the rest of the stack. The spec is the contract: parameter sheets, windowing rules, and flag definitions live in study metadata, and define.xml generates from that same source, so program and reviewer documentation cannot drift apart.

QC runs as independent double programming with listings compared side by side, plus structural conformance checking (CDISC CORE or a commercial engine) on every build. Structural tools catch a missing PARAM or a bad variable length. They cannot catch a baseline picked from the wrong record; that is what the Table 3 listings do, and why they run as part of the pipeline rather than as a manual step.

In R, admiral implements these derivations as functions (baseline flags, analysis flags, change from baseline, visit windowing) and admiralpython carries the same pattern to Python. That modularity is also what makes BDS code learnable for models: my [admiral fine-tuning experiments](/blog/fine-tuning-small-llms-admiral-r.html) covered ADVS and ADLB variables among the ADaM derivations a small model could draft usefully, with complex multi-step logic still demanding review. For teams running both engines, the [SAS to R migration field guide](/blog/sas-to-r-migration-field-guide.html) covers how these builds translate.

## The agentic way

Ask an agent for a baseline flag and you get working code with a confident rule: first non-missing value, or the record where VISIT = "BASELINE". It runs, it produces a plausible table, and it is wrong in exactly the way this post opened with. The failure mode in BDS builds is rule invention on the decisions the SAP owns: the baseline definition, the windowing boundaries, which record in a window wins, whether LOCF applies at all.

The habit that catches it: make the agent quote its rule before anyone reads the code. "State the baseline rule you implemented in one sentence, and where it comes from." Diff that sentence against the SAP, then pull three random subject-parameter listings and check them against the source domain by hand. Two minutes of checking saves an hour of debugging a wrong table later.

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents generate BDS skeletons, flags, and change-from-baseline logic quickly, but they invent baseline and windowing rules that read plausibly; the failure mode is a correct-looking dataset built on an unsourced rule.</p>
  <p>Before trusting agent-drafted BDS code, have it state the baseline and windowing rules it implemented, then diff those sentences against the SAP.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/adam-adsl-derivation/SKILL.md">
  <span class="skill-card-name">adam-adsl-derivation</span>
  <span class="skill-card-desc">The subject-level spine every BDS build merges in — derivation cascades, merge discipline, and QC checkpoints from this series, as a drop-in Claude skill.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- BDS grain is one record per subject, parameter, analysis timepoint; check for duplicates on that key before anything else.
- Baseline keys on date relative to TRT01SDT per the SAP, not on visit labels, and takes the last qualifying value.
- LOCF and average rows are derived records marked with DTYPE, produced only when the SAP calls for them.
- Shift tables classify baseline and analysis values against the subject's own reference range.
- Structural validation cannot catch a wrong baseline; duplicate checks and baseline listings can.

## FAQ

### What does ANL01FL mean?

It marks the record an analysis uses when several records exist for the same subject, parameter, and analysis window, for example when a window catches two measurements and the SAP names which one wins. It is not a general quality flag, and it is not the baseline flag.

### When is LOCF allowed in a BDS dataset?

Only when the SAP specifies it, for the parameters and visits it names. LOCF is a statistical assumption about missing data. The carried record must carry DTYPE = LOCF so tables and reviewers can account for it or exclude it.

### What is the difference between PARAMCD and PARAM?

PARAMCD is the short code (SYSBP) used for programming and matching; PARAM is the human-readable description ("Systolic Blood Pressure (mmHg)") that appears in outputs. One PARAMCD maps to exactly one PARAM within a dataset.

### How do unscheduled visits get into analysis windows?

Per the windowing rules in the SAP. Each analysis visit is defined by a date range relative to an anchor, usually first dose, and an unscheduled measurement inside a range joins that window. Records outside every window stay in the dataset, unflagged for analysis.

---

From here in the series: [Part 8, OCCDS and ADAE](/blog/adam-occds-adae-tutorial.html), then [Part 9, ADTTE and time-to-event](/blog/adtte-survival-tutorial.html). Earlier in the arc: [Part 2, the ADSL walkthrough](/blog/adsl-derivation-tutorial-trtstdt.html) and [Part 3, TLF programming](/blog/tlf-shell-to-rtf-tutorial.html). The [series roadmap](/blog/clinical-sp-bootcamp-roadmap.html) lists everything published so far.
