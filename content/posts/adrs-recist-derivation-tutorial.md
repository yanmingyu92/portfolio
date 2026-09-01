---
title: "ADRS and RECIST: Programming Oncology Response Analyses"
date: 2026-09-01
description: "ADRS turns RECIST 1.1 assessments into analysis data: TU-TR-RS traceability, overall response per timepoint, best overall response, PD dates, and PDS hand-off to ADTTE."
tags: ["clinical-sas", "adam", "adrs", "recist", "oncology"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 20
skillArtifact: /skills/adrs-recist-derivation/SKILL.md
canonicalPath: /blog/adrs-recist-derivation-tutorial.html
draft: true
---

Best overall response says Stable Disease for a subject whose target lesions grew 14 percent since baseline. The investigation takes a week. The new lesion that should have triggered Progressive Disease at Week 8 was captured, but it sat in a supplemental qualifier nobody merged, so progression defaulted to the next scheduled assessment. The table was arithmetically correct and clinically wrong. ADRS is where that outcome gets written or prevented, and building it means running RECIST logic as code across three SDTM domains that were never designed to be joined.

> **TL;DR** — ADRS turns RECIST 1.1 assessments into analysis parameters, and its defects are clinical before they are statistical. You get RECIST as a decision table, the TU to TR to RS chain including the SUPP pockets where lesion data hides, the parameter derivations from overall response through best response to the PDS hand-off, and a defect gallery with the checks that catch each one.

## The fundamentals

### RECIST 1.1 as a decision table

RECIST 1.1, published in 2009, classifies baseline disease into target lesions, up to five measurable lesions tracked as the sum of longest diameters, and non-target lesions, present and evaluated without serial measurement. Lesions that appear during the study are new lesions, and finding one is progression evidence. At each assessment, per-lesion results combine into one overall category per subject per timepoint, and that combination is what ADRS programs.

| Target disease | Non-target disease | New lesions | Overall response |
|---|---|---|---|
| CR, all target lesions gone | CR | No | CR |
| PR, SLD decrease meets criteria | Non-PD | No | PR |
| SD, change inadequate for PR or PD | Non-PD | No | SD |
| PD, SLD increase meets criteria | Any | Any | PD |
| Any | PD | Any | PD |
| Any | Any | Yes | PD |
| None measurable | Persists without PD | No | Non-CR/non-PD |

*Table 1: RECIST 1.1 overall response as a programmer's lookup, simplified. The published criteria carry the thresholds; the code carries the category logic, and the SAP pins the version.*

Two thresholds do most of the work: PR requires at least a 30 percent decrease in the sum of longest diameters from baseline, and PD requires at least a 20 percent increase relative to the smallest sum recorded on study. Confirmation matters as much. Where the SAP requires it, a CR or PR counts only when a repeat assessment sustains it, conventionally at least four weeks later; randomized studies often waive the requirement, and the SAP states which variety of best response the primary tables carry.

The non-CR/non-PD row is the one programmers misplace. It applies to subjects whose disease is entirely non-target: persistent, neither cleared nor progressed. It is distinct from SD, which requires measurable target disease, and ordinal mappings commonly place it between SD and PD. The mapping table belongs in the spec, so nobody reorders it from memory.

### The chain: TU, TR, RS, and the SUPP pockets

| Domain | Grain | What it carries |
|---|---|---|
| TU | One row per identified lesion | Lesion identifiers, location, target or non-target status at identification |
| TR | One row per lesion per assessment | Per-lesion results: diameters for targets, status for non-targets, new-lesion findings |
| RS | One row per assessment per evaluator | Overall response per timepoint, evaluator type, dates |
| SUPP qualifiers | Keyed to the domain above | What the base domain could not hold: new-lesion detail, laterality, tracker identifiers |

*Table 2: The response chain. TR links to TU through lesion identifier variables; RELREC pairs formalize the link when vendors split it.*

The overall response in RS is recorded per evaluator, and RSEVAL separates the investigator's call from a blinded independent review. Two evaluator flows mean two parallel parameter sets, and mixing them is a defect, not a convenience.

The supplemental domains are where the hook's defect lived. New-lesion identifiers, the date a lesion was first observed, laterality: EDC maps push this detail into SUPPTR or SUPPRS when the base domain has no slot for it. Merge those qualifiers explicitly, early, with a row-count check, or the progression date silently defaults to the next scheduled assessment. The SDTM mapping spec tells you where the lesions hide, so read it before programming.

### ADRS parameters, one decision at a time

ADRS is BDS structure, the grain [Part 7](/blog/adam-bds-adlb-advs-tutorial.html) established: one record per subject, parameter, and timepoint, with subject-level parameters added as their own rows. The parameter set is the analysis plan in miniature.

| PARAMCD family | Content | Usual source |
|---|---|---|
| OVR | Overall response at each timepoint | RS per evaluator |
| BOR, with confirmed variant | Best response from first dose up to first PD, per SAP | Derived from OVR |
| Confirmed responder, Y/N | CR or PR sustained within the confirmation interval | Derived from OVR dates |
| Last assessment, optionally censored at first PD | Last valid disease assessment | Derived from OVR |
| PDS | First PD date plus censoring decision | Derived, feeds ADTTE |
| Reference events | Death, new anticancer therapy dates | ADSL dates, DS, concomitant-therapy domains |

*Table 3: The recurring ADRS parameter families. PARCAT1 separates tumor response from reference events, PARCAT2 carries the evaluator, PARCAT3 pins the RECIST version.*

```sas
/* Ordinal AVAL, then BOR pool = records up to first PD, Study XYZ */
data ovr;
  set rs_ovr(where=(anl01fl = "Y" and adt >= trtsdt));
  if avalc = "CR" then aval = 1;
  else if avalc = "PR" then aval = 2;
  else if avalc = "SD" then aval = 3;
  else if avalc = "PD" then aval = 4;
run;
proc sort data=ovr;
  by usubjid adt;
run;
data bor_pool;
  set ovr;
  by usubjid;
  retain stop;
  if first.usubjid then stop = 0;
  if stop = 0 then output;      /* BOR = min(AVAL) over these rows */
  if avalc = "PD" then stop = 1;
run;
```

Duplicates resolve before this step: several records on one date collapse to one analysis record per the spec, with ANL01FL marking the survivor. Best overall response takes the minimum AVAL across the pool. A subject whose pool holds only NE or incomplete records gets BOR = NE or missing, whichever the SAP names; the confirmed variant adds the confirmation interval before a CR or PR can win.

### The hard parts

PD date selection is where two correct programs diverge. The pool logic above finds the first PD on or after first dose; the remaining questions are which evidence wins when target-lesion PD and a new lesion carry different dates, and whether the recorded investigator date in RS outranks a recomputed earliest evidence date. Both answers exist in practice, the SAP picks one, and the choice moves PFS medians, so it gets cited and QC'd by listing. A PD before first dose is baseline progression, handled per SAP, not a PFS event.

Death is an event, usually. For PFS, a death without prior PD counts as an event on the death date, and a death after PD changes nothing, because the event already happened. The death date comes from ADSL or DS, partial dates impute per SAP convention, and the PDS parameter hands the event flag and date to [Part 9's ADTTE](/blog/adtte-survival-tutorial.html) with the index date, randomization or first dose, that the SAP anchors on.

Missing and partial assessments stay missing. An NE at a timepoint does not become SD by silence, a skipped visit does not retroactively change the best response, and month-only response dates impute per the convention the SAP states, commonly different for responses than for progressions. Write the convention down; it is the kind of rule that otherwise lives in one programmer's muscle memory.

### The defect gallery

| Defect | Looks like | Root cause |
|---|---|---|
| BOR over inconsistent visit schedules | Subjects with extra unscheduled assessments look better | BOR computed over every record instead of SAP-defined timepoints |
| Confirmed PR without the confirmation window | BOR = confirmed PR, confirmation visit six days later | Interval check never coded |
| PD missed because the lesion sat in SUPP | PD date defaults to a later assessment | SUPP merge omitted at build time |
| Evaluator mixing | One parameter blends investigator and blinded-review records | RSEVAL filter dropped |
| Death censored in PFS | Deceased subjects censored at last assessment | Event definition lost between ADRS and ADTTE |

*Table 4: The ADRS defects I look for first. None of them surfaces in structural validation.*

One defect class deserves special respect: a recorded overall response that contradicts its own lesion inputs. Verifying it requires TU, TR, and RS joined with clinical logic, a cross-domain traversal that domain-scoped rule engines cannot express. That is the gap my [graph-constrained validation work](/blog/graph-constrained-validation-cdisc-oncology.html) targets. Until graph checks are routine, the listing version works: recompute the expected overall response from per-lesion data for a sample and compare it against RS.

## The modern workflow

ADRS builds from locked SDTM with the RECIST version pinned in study metadata, and the parameter table is the contract: PARAMCD, source, rule, SAP section, one row per parameter, feeding define.xml from the same source. Two evaluator flows mean the investigator and blinded-review parameter sets stay parallel and distinct through PARCAT2, and every downstream table states which one it reports.

In R, the oncology derivations that started life as the admiralonco extension now ship inside admiral, covering best overall response, clinical benefit, and progression-style parameter families; admiralpython carries the pattern to Python. The modularity is real, and so is the boundary: the package implements the mechanics, while the pool definition, confirmation window, and PD evidence rule remain SAP sentences a human transcribes.

QC runs as double programming with disagreements resolved by subject listings, concentrated on BOR and PD date, the two derivations where a one-record difference changes a published number. Response-date imputations get their own listing, one row per imputed subject, because that is the listing a regulator asks for.

## The agentic way

An agent produces the parameter scaffolding and the ordinal mapping in minutes, and the failure modes are specific. A confirmation window of four weeks hardcoded regardless of what the SAP says. Non-CR/non-PD ordered better than SD because the mapping table was generated, not read. The RSEVAL filter dropped so the evaluators blend. Zero awareness that new-lesion data might live in a SUPP qualifier, because nothing in the prompt mentioned it.

Give the agent the SAP response section, then make it print the mapping and rule table it used, with the citation it believes each row comes from. Diff that table against the SAP before reading a line of code. Then hand-trace three subjects end to end, from TU through TR, RS, and the final TLF row. The trace is the QC; the diff is the lie detector.

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents scaffold ADRS parameters and RECIST mappings quickly, but they invent confirmation windows and skip SUPP qualifiers; the failure mode is an internally consistent dataset whose PD dates are clinically wrong.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-09-01. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/adrs-recist-derivation/SKILL.md">
  <span class="skill-card-name">adrs-recist-derivation</span>
  <span class="skill-card-desc">Drop-in Claude skill: the RECIST quick map, the TU-TR-RS build chain, BOR and PD-date rules, and the defect checklist, for your next response-analysis build.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- RECIST overall response is a lookup over target results, non-target status, and new lesions; program the category logic, cite the published thresholds, and pin the RECIST version in metadata.
- Read TU, TR, RS, and their SUPP qualifiers as one chain, because the lesion records that change PD dates are the ones hiding in qualifiers.
- BOR is computed over SAP-defined timepoints from first dose up to the first PD, with confirmation windows applied only where the SAP requires them.
- PDS hands ADTTE one decision per subject: first PD, death without PD, or censoring at the last valid assessment, all on the SAP's index date.
- Cross-domain contradictions between recorded response and lesion evidence need listings or graph validation; domain-scoped rule engines cannot express them.

## FAQ

### Is ADRS a BDS dataset?

Yes. It holds one record per subject, parameter, and analysis timepoint, with subject-level derived parameters such as BOR, PDS, and reference events added as additional rows. The grain discipline from Part 7 applies directly: duplicate keys within a parameter are defects.

### What is the difference between confirmed and unconfirmed BOR?

Unconfirmed BOR takes the best recorded response and ignores confirmation. Confirmed BOR requires a CR or PR sustained by a repeat assessment within the SAP's interval, conventionally at least four weeks later. The SAP names which variety the primary tables carry, and both often exist as separate parameters.

### How is the PD date selected when the evidence disagrees?

By the SAP rule, cited in the spec. The common choices are the earliest objective evidence across target-lesion progression and new lesions, or the investigator's recorded overall PD date in RS. The two can differ by weeks, which moves PFS medians, so the rule is transcribed once and QC'd by listing.

### Does death count as progression in PFS?

In most protocols, yes: PFS events are the first PD or death, whichever comes first, so a death without prior PD is an event on the death date. A death after PD does not change the PFS date. The protocol definition governs, and the spec quotes it.

### Where do new lesions live in SDTM?

New-lesion identification and results belong in TU and TR rows carrying new-lesion status, but EDC maps often push the detail, first-observation dates, laterality, tracker identifiers, into SUPP qualifiers. Merge the SUPP data explicitly, or the PD date silently defaults to the next scheduled assessment.

---

Series path from here: [Part 8, OCCDS and ADAE](/blog/adam-occds-adae-tutorial.html) covers the safety side of ADaM, [Part 9, ADTTE and survival](/blog/adtte-survival-tutorial.html) receives the PDS hand-off this post produces, and [Part 15, reading the protocol and SAP](/blog/protocol-sap-reading-guide.html) is the extraction pass that surfaces response rules at startup. [Part 7](/blog/adam-bds-adlb-advs-tutorial.html) built the BDS skeleton ADRS sits on. On the AI side, the [graph-constrained validation deep dive](/blog/graph-constrained-validation-cdisc-oncology.html) covers the cross-domain contradiction class this post's defect gallery keeps meeting. The [series roadmap](/blog/clinical-sp-bootcamp-roadmap.html) lists everything published.
