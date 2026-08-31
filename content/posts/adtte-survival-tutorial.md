---
title: "ADTTE and Time-to-Event: Programming the ADaM Analysis Dataset"
date: 2026-08-30
description: "ADTTE step by step: event and censoring definitions from the SAP, the censoring date cascade, CNSR semantics, partial dates at the event, and QC listings per subject."
tags: ["clinical-sas", "adam", "adtte", "survival-analysis"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 9
canonicalPath: /blog/adtte-survival-tutorial.html
draft: true
---

The Kaplan-Meier curves cross and the hazard ratio favors control, so the statistician asks exactly one question: what value does CNSR carry on the death records? The answer is 1, because every other flag in the program uses 1 for yes and the programmer coded 1 for event. In ADaM, CNSR = 1 means censored. The analysis estimated the hazard of the wrong process, and every conclusion drawn from the output reversed with it.

> **TL;DR** — ADTTE gives survival and other time-to-event analyses their shape: one row per subject per analysis, STARTDT as the origin, ADT as the event-or-censoring date, CNSR carrying the event semantics, and SRC variables tracing every date to a source record. This post builds a first-event ADTTE step by step, covers the censoring cascade and partial dates, and closes with the two QC listings that catch a broken TTE dataset.

## The fundamentals

### What a TTE dataset is

ADTTE, the time-to-event dataset, supports analyses where the question is a time rather than a value: overall survival, progression-free survival, time to first flare. Its grain is one record per subject per analysis, with the analysis named as a parameter, because one study routinely runs several time-to-event analyses off the same machinery.

| Variable | Meaning |
|---|---|
| PARAMCD / PARAM | The analysis, e.g. TTDE / "Time to First Event" |
| STARTDT | Time-to-event origin, often first dose |
| ADT | Event or censoring date, whichever applies |
| CNSR | Censoring indicator: 0 = event, 1 = censored |
| AVAL | Analysis value: the duration, usually days, per the SAP |
| EVNTDESC | What the event or censoring was |
| CNSDTDSC | Why a censored date was chosen |
| SRCDOM / SRCVAR / SRCSEQ | Domain, variable, and record ADT came from |

*Table 1: The ADTTE core. Everything else, treatment and populations, merges in from ADSL.*

Two variables do the analytic work. ADT says when. CNSR says whether that date is an event or a censoring. The SRC trio is not decoration: it is what makes the dataset auditable, and it powers the QC listings at the end of this post.

### Definitions live in the SAP, not the programmer's head

The event definition, the censoring rules, and the origin date are SAP content. "Event is the first occurrence per the adjudicated domain." "Censor at last known contact if no event." "Origin is first dose." The programmer's job is faithful transcription with traceability. When the SAP is silent (it happens), the answer is a spec query rather than a preference. Every invented censoring rule is a finding waiting for an inspector, and it is cheaper to ask before the build than to defend after it.

### The censoring date cascade

A subject with no event still needs an ADT. The cascade assigns one, in order of precedence, and the first applicable rule wins:

| Priority | Condition | ADT set to | CNSR | CNSDTDSC / EVNTDESC | Source |
|---|---|---|---|---|---|
| 1 | Event on record | Event date | 0 | Event description | Event domain |
| 2 | Discontinued the study | Discontinuation date | 1 | Study discontinuation | DS |
| 3 | Known alive at last contact | Last known alive date | 1 | Last contact | ADSL |
| 4 | None of the above | Data cut date | 1 | Data cut | Cut metadata |

*Table 2: A generic censoring cascade. The exact rules and their order come from the SAP; the principle (one date, one stated reason, one source row per subject) does not.*

The discipline the cascade enforces: every censored subject gets exactly one censoring date, with one stated reason, traceable to one source record. When two rules could apply, the priority order decides, and that order is SAP content too.

### CNSR semantics, and why they flip hazard ratios

CNSR = 0 is an event. CNSR = 1 is censored. This is an ADaM convention with no interest in how yes/no flags behave in the rest of your program.

Get it backwards and the analysis inverts. Survival methods model the hazard of the event; censored subjects contribute exposure time but no event. Swap the coding and you model the hazard of censoring — the curves flip, the hazard ratio reverses direction, and every conclusion reverses with it. The output still looks like a perfectly ordinary Kaplan-Meier plot, which is exactly why the defect survives long enough to reach a statistician, as the opening scene showed.

### Building it

A first-event analysis, generic Study XYZ:

```sas
/* Time to first event: one row per subject, Study XYZ */
data adtte;
  merge adsl(in=a keep=usubjid trtsdt lstalvdt) ev1(in=b keep=usubjid evdt);
  by usubjid;
  if a;
  startdt = trtsdt;
  if b then do;
    cnsr = 0; adt = evdt;
    evntdesc = "Event"; srcdom = "EVENTS"; srcvar = "EVDT";
  end;
  else do;
    cnsr = 1; adt = coalesce(lstalvdt, &dcut); cnsdtdsc = "Last known alive";
  end;
  aval = adt - startdt + 1;
run;
```

Duration arithmetic follows the SAP: days with or without the +1 anchor adjustment, and unit conversions applied at derivation so the statistical program reads a ready AVAL. Dividing by 30.4375 for months is a common SAP convention; whatever yours says, apply it in the derivation.

The downstream analysis is one call:

```sas
proc lifetest data=adtte;
  time aval * cnsr(1);
  strata trt01pn;
run;
```

The (1) tells the procedure which value means censored: the same convention this post keeps flagging, now at the analysis step. PROC PHREG for the hazard ratio carries identical semantics.

### Partial dates at the event

An event date known only to the month, or a death reported late and partially, is imputed per the SAP with the imputation flagged. The wrinkle specific to TTE: imputation direction can change whether a record counts as an event at all, or push ADT before STARTDT. Those consequences are for data review to settle.

### The two listings that catch broken TTE datasets

First: every subject with an event before the origin (ADT earlier than STARTDT with CNSR = 0). Every row on that listing is a misassigned origin or a source-date error.

Second: every censored subject with no censoring source (CNSR = 1 with SRCDOM or SRCVAR empty, or pointing at a record that does not exist). Table 2 promises one traceable source row per censored subject; this listing audits that promise. Both listings take minutes to write and catch the defects that reach statisticians.

## The modern workflow

ADTTE builds late in the ADaM stack. It typically consumes ADSL plus an event-bearing dataset (response parameters derived from ADRS, a death flag, whatever the SAP names), so it lands after both. The SRC variables make its QC automatable: an independent program re-derives ADT from the named source records and diffs against the submission copy, which is far cheaper than re-deriving the whole analysis.

The statistical side inherits the same reproducibility requirements: pinned procedure versions, outputs regenerated from program plus dataset inside the SCE, and the LIFETEST or PHREG runs stored with the build that produced them. Structural conformance tools check that ADTTE carries the variables it should; no rule engine can check that the censoring cascade matches the SAP. That diff belongs to the listings and the independent QC program. Mixed-engine shops can run the same dataset through R's survival package unchanged, one of the quieter wins on the [SAS to R migration path](/blog/sas-to-r-migration-field-guide.html).

## The agentic way

An agent drafting ADTTE code produces a censoring cascade that reads beautifully — numbered, prioritized, plausible. Given nothing better, it will also choose the rules itself, and it is weakest exactly on CNSR direction: the convention runs against every other flag habit, and models follow habit. A flipped CNSR is the most expensive silent error in this dataset, which is the opening scene in miniature.

Verification therefore carries two questions: which CNSR value marks an event in this draft, and which SAP section defines the censoring order. Then five censored subjects, SRC-traced to their source records by hand. What the agent cannot take over, the signature on the validation document and the spec query when the SAP is silent, is the boundary described in [why LLM agents fail in regulated programming](/blog/why-llm-agents-fail-regulated-programming.html).

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents draft the full TTE machinery, origin, cascade, duration, SRC traceability, in minutes, but they invent censoring rules and flip CNSR direction; the failure mode is a coherent dataset describing the wrong process.</p>
  <p>Before trusting agent-drafted ADTTE code, confirm which CNSR value marks an event, then SRC-trace five censored subjects to their source records by hand.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

## Key takeaways

- ADTTE is one row per subject per analysis; STARTDT is the origin, ADT the event-or-censoring date, CNSR the semantics.
- CNSR = 0 is event, 1 is censored; reversing them reverses the hazard ratio while the output still looks normal.
- The censoring cascade assigns one date, one reason, and one source row to every subject without an event, in SAP-defined priority order.
- Partial event dates are imputed per the SAP, flagged, and their consequences reviewed rather than silently coded.
- Two listings (events before origin, censored without source) catch what conformance tools cannot.

## FAQ

### What does CNSR = 0 mean in ADaM?

It means the record is an event: the subject experienced the analysis event at ADT. CNSR = 1 means censored. The convention is fixed by ADaM, regardless of how yes/no flags behave elsewhere in a program.

### What is STARTDT in an ADTTE?

The time-to-event origin, the date time zero begins. First dose for most treatment-focused analyses, randomization or diagnosis for others, exactly as the SAP defines it. Durations compute from it, so a wrong origin shifts every subject the same way.

### How are events after the data cut handled?

They are not in the dataset. Records after the cut do not exist in the snapshot, which is why the cascade's final rule censors at the cut date: a subject with no in-window event and no in-window contact is censored at the cut with that reason recorded.

### Why do SRCDOM, SRCVAR, and SRCSEQ exist?

They make every event and censoring date traceable to the exact source record it came from. That traceability lets an independent QC program re-derive ADT and diff, and lets a reviewer audit any single subject's row without reading the build program.

### Is ADTTE a BDS dataset?

It uses BDS structure (parameters, one row per subject per parameter) with TTE-specific variables layered on: STARTDT, CNSR, the event descriptions, and the SRC traceability. Conceptually it is the BDS grain applied to a duration analysis.

---

That closes the ADaM line for this wave. Previous: [Part 8, OCCDS and ADAE](/blog/adam-occds-adae-tutorial.html). From [Part 7](/blog/adam-bds-adlb-advs-tutorial.html) and [Part 2](/blog/adsl-derivation-tutorial-trtstdt.html), the line runs ADSL to BDS to OCCDS to TTE, and the [series roadmap](/blog/clinical-sp-bootcamp-roadmap.html) tracks what publishes next.
