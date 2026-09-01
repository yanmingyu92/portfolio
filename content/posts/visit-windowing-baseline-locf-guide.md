---
title: "Visit Windowing, Baseline, and LOCF: The Rules That Decide BDS"
date: 2026-09-01
description: "Visit windowing, baseline flags, and LOCF decide whether BDS datasets are right: anchor rules, ABLFL derivation, DTYPE discipline, and defect patterns reviewers find."
tags: ["clinical-sas", "adam", "bds", "windowing"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 17
skillArtifact: /skills/visit-windowing-rules/SKILL.md
canonicalPath: /blog/visit-windowing-baseline-locf-guide.html
draft: true
---

The Week 12 efficacy table is missing eleven subjects and the statistician wants an answer before the review meeting. The listing settles it in one screen: those visits happened between Day 130 and Day 141, and the Week 12 window in the SAP closes at Day 129. The next window opens at Day 155. Real patients, real measurements, collected and cleaned, and every one of them stranded between two windows because nobody extracted what the boundary arithmetic means. Windowing, baseline, and missing-data rules are where collected data becomes analysis data. This post covers the three rule families that decide it, and the listings that prove you got them right.

> **TL;DR** — Windowing, baseline, and LOCF are the rule families that decide whether a BDS dataset is right before any table runs. You get the three windowing strategies and when each applies, the baseline patterns that survive review, LOCF as a cited SAP rule rather than a habit, and a defect gallery with the listing that catches each defect.

## The fundamentals

### Three ways to draw a window

[Part 7](/blog/adam-bds-adlb-advs-tutorial.html) built ADVS and ADLB with windowing as one step among four. This post slows down on that step, because it decides which measurements exist as far as any efficacy table is concerned. A window is a day range that maps collected records onto an analysis timepoint. Three strategies show up in practice, and the SAP has usually picked one already.

| Strategy | How boundaries are set | Strength | Watch-out |
|---|---|---|---|
| Explicit SAP ranges | Fixed day-range table, Day 78 to Day 112 = Week 12 | Auditable; every row cites a SAP line | Gaps between windows strand records silently |
| Anchor-based | Edges computed per subject from an anchor, usually first dose, sometimes the previous visit | Absorbs variable and rolling schedules | One wrong anchor date contaminates every downstream window |
| Nearest-visit | Each record joins the scheduled visit with the smallest day distance | No orphan records; every measurement lands somewhere | A very late visit masquerades as an earlier timepoint |

*Table 1: The three windowing strategies. Efficacy SAPs default to the first; some safety summaries tolerate the third.*

Explicit ranges are the cleanest to audit because the code and the SAP table look alike. Anchor-based windows earn their keep when visits roll, tracking each subject's actual schedule instead of a calendar grid. Nearest-visit assignment leaves no record behind, which is also its flaw: a Day 200 assessment can attach itself to Week 24 and quietly change the analysis population. Whichever one the SAP names, the job is transcription with citations, and treating the choice as a programming preference is where stranded subjects come from.

Boundary arithmetic deserves respect before any code. Write boundaries once, inclusive on both ends, and document the gap policy. Remember that ADY has no day zero: it jumps from −1 to +1 around the first-dose anchor, a convention [Part 2](/blog/adsl-derivation-tutorial-trtstdt.html) established when TRT01SDT was derived. Transcribe protocol day ranges against that convention, or every window shifts by a day.

```sas
/* Assign AVISIT/N from ADY, Study XYZ. Boundaries from the SAP table. */
data advs_win;
  set advs_ady;
  length avisit $16;
  if -30 <= ady <= -1    then do; avisitn =  0; avisit = "BASELINE"; end;
  else if 1 <= ady <= 7  then do; avisitn =  1; avisit = "WEEK 1";  end;
  else if 64 <= ady <= 98  then do; avisitn = 12; avisit = "WEEK 12"; end;
  else if 141 <= ady <= 189 then do; avisitn = 24; avisit = "WEEK 24"; end;
  else if ady > 189 then do; avisitn = 99; avisit = "FOLLOW-UP"; end;
  else do; avisitn = .; avisit = "NOT IN WINDOW"; end;
run;
```

Records outside every window stay in the dataset, unflagged for analysis. Dropping them here destroys the query trail: when a monitor asks where a Day 131 measurement went, the answer is a listing, not an apology.

### Two records in one window

A scheduled visit plus an unscheduled recheck, or a repeat measurement at the same visit, and one window now holds two records. The SAP names the winner: last record, first record, worst value, or the record nearest the window's target day. The winner carries ANL01FL = "Y", the flag Part 7 introduced for exactly this situation, and the losers stay in the dataset with the flag off.

Whether an unscheduled record may fill an empty window at all is a separate SAP sentence, and SAPs genuinely disagree. Some allow unscheduled records when no scheduled record exists in the window. Some allow them for safety parameters only. Some exclude them from efficacy outright. If the sentence exists, transcribe it with its section number; if it does not, you have found a query.

### Baseline: which record speaks for the subject

Baseline is not the visit labeled BASELINE. Labels drift between studies and protocols amend; dates do not. The baseline rule keys on dates relative to an anchor, normally TRT01SDT, and it comes in three families.

| Baseline rule | What it selects | Where it fits |
|---|---|---|
| Last non-missing on or before first dose | Latest qualifying AVAL with ADT <= TRT01SDT | Efficacy change-from-baseline default |
| Pre-dose assessment only | The value from the designated pre-dose collection | Studies dosing on Day 1 with same-day draws |
| Per-parameter exceptions | A different rule per PARAMCD, worst screening value for selected safety labs | SAP lists the exceptions; the spec carries them row by row |

*Table 2: Baseline rule families. The SAP names one; the spec records it with the section number.*

```sas
/* ABLFL: last non-missing on/before first dose, Study XYZ */
proc sort data=bds;
  by usubjid paramcd adt adtm aseq;
run;
data bds_bl;
  set bds(where=(aval ne . and adt <= trtsdt));
  by usubjid paramcd;
  if last.paramcd then ablfl = "Y";
run;
```

The sort's tiebreakers are part of the rule. When several qualifying records share a date, time-of-day or sequence decides, and the tiebreak belongs in the spec where a reviewer can find it. Per-parameter exceptions live there too, one row per PARAMCD, never as a comment inside a program.

Two flags answer two different questions on the same rows. ABLFL names the record that supplies BASE, one per subject and parameter; ANL01FL names the records an analysis uses when a window holds several. Once the flag is set, BASE and BASEC copy onto every record for that subject-parameter, and CHG and PCHG follow on post-baseline rows. Keep the flagged baseline record in the dataset; deleting it breaks listings and traceability.

### LOCF: carry-forward is a cited rule

LOCF fills a missing analysis timepoint with the last observed analysis value and writes the result as a derived record carrying DTYPE = "LOCF". Whether that derived record exists in your dataset is a SAP decision. A carried value is an assumption about missing data wearing a measurement's clothes, and the whole point of DTYPE is keeping the disguise visible.

Modern SAPs handle missing data explicitly. A mixed-model repeated-measures analysis on observed values as the primary, with LOCF as a sensitivity analysis, is a common pairing; some SAPs order it the other way. Either way, the programmer ships both implementations, each with its citation. Reaching for an imputation because a table looks thin is someone else's decision to make.

Three rules travel with any carry-forward. Window first: carry the analysis value of a windowed record, never a raw measurement that never qualified for a timepoint. Stop where the SAP stops: if the analysis timepoints end at discontinuation, LOCF past that date fabricates visits nobody agreed to. Keep carried rows out of observed-data listings, and expect the table Ns to reconcile by DTYPE.

### The defect gallery

| Defect | Symptom | Listing that catches it |
|---|---|---|
| Two analysis records in one window | Duplicate subject-PARAMCD-AVISITN key downstream | PROC FREQ count on the key, or a NODUPKEY test |
| Baseline after first dose | ABLFL = "Y" with ADT > TRT01SDT | One-line where-listing |
| LOCF past discontinuation without SAP backing | DTYPE = "LOCF" rows after the DS discontinuation date | DTYPE listing joined to DS |
| Carried value counted as observed | Table Ns disagree with observed-data counts | Cross-tab DTYPE against table populations |
| Stranded records between windows | Subjects with collected data but no AVISITN at key visits | Anti-join raw versus windowed counts |

*Table 3: The five windowing and baseline defects I check on every BDS build. Each is a listing, and each runs in seconds.*

Two of these arrive looking harmless. The duplicate key usually traces to an unscheduled visit joining a window that already held a scheduled record, with no winner rule applied; the fix is the winner rule, not a dedup that hides evidence. The late baseline usually traces to a same-day dosing visit where the time component was missing, so the tie defaulted the wrong way.

### Query discipline

Every windowing ambiguity has the same disposition: a logged query to the statistician, carrying the section reference, the options, and the operational impact of each. This is the query discipline from [Part 15's extraction pass](/blog/protocol-sap-reading-guide.html), applied to the sentences that decide BDS correctness. A windowing decision that lives only in code is a decision the auditor will treat as invented, because it was.

## The modern workflow

The window table belongs in study metadata, one row per analysis visit: AVISIT, AVISITN, lower and upper ADY bounds, winner rule, SAP section. Code reads the table; define.xml generates from the same source. When the statistician moves a boundary, the change is one spec cell and a rerun, against a code edit a reviewer has to diff by eye.

In R, admiral implements this pattern as functions: relative-day derivations, visit windowing from a reference dataset, baseline flags. admiralpython carries the same family to Python. That regularity is also why windowing logic showed up among the derivation families a small fine-tuned model could draft usefully in my [admiral experiments](/blog/fine-tuning-small-llms-admiral-r.html), with the rule decisions still demanding a human hand.

In the SCE, SAP versions sit in the repository next to the spec, so a diff between SAP versions names the window rows to recheck. Double programming compares AVISIT assignments across the full key, and the disagreements concentrate at the boundaries: list the records with ADY exactly on a window edge.

## The agentic way

Ask an agent for windowing code and you get a fluent if-else chain in seconds, boundaries included, whether or not any SAP exists behind them. Weekly-habit windows, Day 1 to 7, Day 8 to 14, that match no study document. LOCF applied by reflex because it fills the skeleton. A baseline flag keyed on the record labeled BASELINE. Each output runs and produces plausible tables, which is what makes these defects expensive.

The countermeasure costs two minutes. Make the agent print the rules it implemented as a table, windows, boundaries, winner rule, baseline rule, imputation, with the citation it believes each comes from. Diff that table against the SAP before anyone reads the code. Then pull three subjects by hand across boundary days. Fabricated rules do not survive a diff.

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents draft window assignment and baseline code quickly, but they invent boundary arithmetic and apply LOCF by reflex; the failure mode is a complete dataset whose rules cite nothing.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-09-01. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/visit-windowing-rules/SKILL.md">
  <span class="skill-card-name">visit-windowing-rules</span>
  <span class="skill-card-desc">Drop-in Claude skill: window strategy selection, baseline rule routing, and LOCF gating, with the five defect listings, for your next BDS build.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- The SAP owns windowing, baseline, and imputation; the programmer transcribes with citations, and silence routes to the statistician as a logged query.
- Write window boundaries once, inclusive on both ends, and transcribe protocol day ranges against the ADY convention, which has no day zero.
- Baseline keys on date relative to TRT01SDT with a documented tiebreak; ABLFL names the source of BASE and ANL01FL names analysis records, and they answer different questions.
- LOCF exists only as a cited SAP rule: DTYPE marked, windowing first, and never past a discontinuation the SAP does not recognize.
- The five defect listings, duplicate keys, late baselines, post-discontinuation LOCF, carried-as-observed counts, stranded records, run in seconds and catch what structural validation cannot.

## FAQ

### How do I assign AVISIT when two records fall in the same window?

Apply the SAP's winner rule, commonly the last record, the first record, the worst value, or the record nearest the window's target day. Flag the winner ANL01FL = "Y" and keep the other records with the flag off. When the SAP names no winner, that is a query, and a silent dedup is the wrong answer.

### Should unscheduled visits be used to fill analysis windows?

Only when the SAP says so. Some SAPs allow an unscheduled record to fill an empty window, some restrict the practice to safety parameters, some exclude them from efficacy entirely. That sentence changes efficacy populations, so extract it at study startup.

### What is the difference between ABLFL and ANL01FL?

ABLFL names the one record per subject and parameter that supplies BASE. ANL01FL names the records an analysis uses, typically when several records share one window. Both flags can sit on the same row, and mixing up their jobs is a classic QC finding.

### Can baseline ever be a post-dose value?

No, under the standard rules. Baseline candidates are records on or before first dose, and pre-dose records on the dosing day qualify with time-of-day deciding the tie. ABLFL = "Y" with ADT after TRT01SDT means the rule or the date derivation is broken, and that listing is the finding.

### Why do modern SAPs pair LOCF with MMRM?

Because LOCF assumes missing values stay at their last observed level, which can bias change estimates when subjects worsen before dropping out. MMRM analyzes observed data under a missing-at-random framework instead. The pairing reports primary and sensitivity results, and the programmer implements both as specified.

---

Back in the series: [Part 7, the BDS walkthrough](/blog/adam-bds-adlb-advs-tutorial.html) built the structure these rules live in, [Part 2, ADSL and TRT01SDT](/blog/adsl-derivation-tutorial-trtstdt.html) derived the anchor every window and baseline key depends on, and [Part 15, reading the protocol and SAP](/blog/protocol-sap-reading-guide.html) covers the extraction pass that surfaces these sentences at startup. On the agent side, the [admiral fine-tuning experiments](/blog/fine-tuning-small-llms-admiral-r.html) show how far a small model gets at drafting these derivations. The [series roadmap](/blog/clinical-sp-bootcamp-roadmap.html) lists everything published.
