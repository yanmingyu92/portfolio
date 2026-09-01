---
title: "The Clinical SP Bootcamp: A Learning Path from Raw Data to TLF"
date: 2026-08-31
description: "A systematic path into clinical statistical programming: CDISC fundamentals, modern SCE workflow, and where AI agents fit — every part with runnable takeaways."
tags: ["clinical-sas", "career", "cdisc", "learning-path"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 0
canonicalPath: /blog/clinical-sp-bootcamp-roadmap.html

---

Most of us learned this field by ambush. Day one at a CRO: here is the mapping specification, there is the shared drive, the database locks in five weeks, ask the person beside you if the macros break. Nobody hands you a syllabus, because nobody has one. You learn SDTM when an AE domain lands on your desk, validation when an auditor asks who signed off on program version 3, and macros at 2 a.m., when a program that ran fine last week eats the deliverable.

The ambush eventually works. It just takes years. This series replaces it with a path: fourteen parts in three layers, in an order that works.

> **TL;DR** — This is the syllabus for a 14-part bootcamp covering clinical statistical programming from raw data to TLF. Every part runs the same three layers: timeless CDISC fundamentals, the modern SCE workflow, and where AI assistance honestly fits. This post maps the full path, groups the fourteen parts into four lines, and gives a minimum viable syllabus whether you have six weeks or twelve months.

## The fundamentals

### Three layers, three shelf lives

Nothing in this field decays at the same speed. The SDTMIG logic you learn this year will still be defensible in a decade; domains, controlled terminology, and traceability reasoning change slowly. The statistical computing environment you train on will be replaced within a contract or two; the habits transfer, the menus do not. And the AI tooling reshuffles every few months, which is why most written advice about it is stale on arrival.

Teaching all three as one pile is why ambush-training takes years: you never learn what to study deeply and what to study loosely. So every part, and this roadmap, splits the field into three layers:

- **L1, fundamentals.** CDISC structures, derivation logic, GxP reasoning. Learn it once; it holds for roughly ten years.
- **L2, the modern workflow.** Cloud SCE, Git, reproducible runs, the SAS/R/Python mix. Good for three to five years, then it needs a refresh.
- **L3, agentic practice.** Working with AI assistants inside regulated programming. Volatile; treat anything older than six months as unverified.

| Layer | Shelf life | What lives here | What hiring managers test |
|---|---|---|---|
| L1 — fundamentals | ~10 years | SDTM domains, ADaM structures, derivation rules, GxP reasoning | "Walk me through building the AE domain from raw data" — reasoning aloud, not term recall |
| L2 — modern workflow | 3–5 years | Cloud SCE, Git flow, reproducible runs, multi-engine practice | "What changes about your code in a validated environment?" — habits, not brand names |
| L3 — agentic practice | ~6 months | Assistants and agents drafting, reviewing, and debugging with you | "How would you use an AI assistant here?" — where drafts may flow and where accountability lands |

*Table 1: The three-layer stack. Interviews probe each layer differently, and none of it is memorization.*

L1 fluency is concrete, and it is smaller than people fear. By the end of the ADaM line you can write and defend code like this:

```sas
/* Study XYZ: treatment variables per the SAP */
data adsl;
  set dm;
  length trt01p $40 trt01pn 8;
  if armcd = "XYZ001" then do;
    trt01p = "Study Drug 50 mg"; trt01pn = 1;
  end; else if armcd = "PLC" then do;
    trt01p = "Placebo"; trt01pn = 0;
  end; else trt01p = "Screen Failure";
run;
```

Ten lines. Behind them sit a specification, a controlled-terminology decision, and a review question. That ratio of a little code under a lot of intent is the job, and it is why interviews grade reasoning over syntax recall.

### The roadmap: four lines, fourteen parts

The series runs four lines. The SDTM/TLF line is the production spine: raw data into standard domains, domains into analysis datasets, analysis into deliverable tables. The ADaM line goes deeper on the analysis layer. The SCE line covers the environment: where code runs, how it is controlled, how a run repeats. The career line covers getting in and moving up. Table 2 is the whole path.

| Part | Line | After this part you can… |
|---|---|---|
| [1 — The statistical computing environment](/blog/sce-statistical-computing-environment-guide.html) | SCE | Explain what an SCE actually enforces and stand up a study workspace that runs the same way twice |
| [2 — ADSL derivations: TRT01SDT](/blog/adsl-derivation-tutorial-trtstdt.html) | ADaM | Turn a SAP rule into a defended derivation with documented fallback behavior |
| [3 — TLF programming: shell to RTF](/blog/tlf-shell-to-rtf-tutorial.html) | SDTM/TLF | Take a static mock shell and ship the table behind it as a reviewable RTF |
| [4 — SDTM domain basics](/blog/sdtm-tutorial-domain-basics.html) | SDTM/TLF | Explain what a domain is and map one raw lab file into standard structure |
| [5 — SDTM AE domain mapping](/blog/sdtm-ae-domain-mapping-example.html) | SDTM/TLF | Build the AE domain end to end: MedDRA coding, flags, dates, and --SEQ |
| [6 — SDTM mapping specifications](/blog/sdtm-mapping-spec-walkthrough.html) | SDTM/TLF | Read and write the spec that lets someone else reproduce your mapping |
| 7 — ADaM BDS: ADLB and ADVS | ADaM | Structure BDS datasets with parameters, baselines, and analysis visits |
| 8 — ADaM OCCDS: ADAE | ADaM | Build occurrence datasets that answer who had what, and when |
| 9 — ADaM ADTTE: time to event | ADaM | Derive a time-to-event dataset that survives a statistician's questions |
| [10 — Clinical SAS interview questions](/blog/clinical-sas-interview-questions-guide.html) | Career | Walk into the interview knowing the four rounds and the signals they grade |
| 11 — The career guide | Career | Plan your entry with a realistic skill ladder and a 90-day study plan |
| 12 — Git for clinical programmers | SCE | Version-control programs and review changes the way modern teams do |
| 13 — Pipeline as code | SCE | Describe the SDTM-to-ADaM-to-TLF flow as runnable code instead of drive letters |
| 14 — AI in validated environments | SCE | State precisely where AI assistance may touch a GxP workflow and where it stops |
| 15 — Reading the protocol and SAP | Start Here | Turn protocol and SAP sentences into artifacts: datasets, flags, spec rows, or logged queries |
| 16 — Define-XML and the reviewer's guide | Submission | Ship submission metadata that answers the reviewer's questions before they ask them |
| 17 — Windowing, baseline, LOCF | ADaM | Apply the three rule families that decide whether a BDS dataset is right |
| 18 — SAS macros for TLF | TLF | Drive every output from one metadata table and debug the classics with MPRINT |
| 19 — P-values FAQ | Statistics | Explain and QC the tests your tables report, without pretending to be the statistician |
| 20 — ADRS and RECIST | ADaM | Derive oncology response analyses from TU/TR/RS without inventing rules |

*Table 2: The fourteen parts grouped by line.*

Numeric order is publication order, not learning order. If CDISC is new to you, read Part 4 before Part 2, because the ADaM line assumes you have seen a domain from the inside. If you already map data for a living, start where your gaps are; every part opens with enough context to stand alone.

## The modern workflow

### How each part works

Every part uses the same skeleton, so you always know where you are:

```text
The skeleton you get in every part:

  ## The fundamentals     L1 — should still read fine in ten years
  ## The modern workflow  L2 — SCE, Git, reproducibility; expect a rewrite by 2030
  ## The agentic way      L3 — what changes when an agent helps, in an
                          era-callout box stamped with its verify date
```

That skeleton is a reading contract. The fundamentals section teaches the part that stays true. The modern workflow section describes how the step runs inside a current cloud SCE, with Git flow and locked inputs, and it will date first. The agentic section is the volatile one: what changes at that step when an assistant can draft, read, and debug.

The volatile layer carries a stamp. Every agentic section ends with an era-callout box naming the date its claims were last verified against real tools. If you are reading a part months after that date, treat the L3 section as a hypothesis to re-check and treat L1 as still true. That split is honest, and the series holds it across all fourteen parts.

Several parts ship a companion skill: a downloadable SKILL.md you drop into Claude or Claude Code to practice interactively. Part 10's interview drill is the pattern: the post explains the rounds, and the skill runs them against you. They live under `/skills/` on this site and are optional; the posts stand alone.

### The minimum viable syllabus

Two readers plan differently. If you have an offer in hand and six weeks before your start date, you want the smallest set that makes you useful in week one. If you are switching careers over roughly twelve months, you want the full spine and time to practice on realistic data. Table 3 gives both.

| Phase | Offer in hand — six weeks | Switching careers — about twelve months |
|---|---|---|
| First stretch | Parts 4 and 2: SDTM basics plus ADSL, the two datasets you will touch in week one | Parts 4 to 6: the SDTM line, slowly, on public pilot data, with practice |
| Second stretch | Part 3 and Part 1: produce a TLF, then survive the environment | Parts 2, 7, 8, 9: the ADaM line; then Part 3 for TLF craft |
| Third stretch | Part 10: the interview drill, because internals hire through it too | Parts 1, 12, 13: environment, Git, pipeline; Part 11 to plan the entry |
| Ongoing | Part 14 before your first "can we use AI here?" meeting | Parts 14 and 10 when applications and interviews start |

*Table 3: Two honest syllabi. Six weeks makes you useful on day one, not finished. Twelve months makes you competitive, not guaranteed.*

## The agentic way

Each part closes with the same question: what changes at this step when an assistant can draft code, read logs, and generate QC passes? The answer differs by step, and the series refuses one blanket answer. Drafting derivation code and debugging have benchmarked results behind them; autonomous submission generation does not. The state-of-field survey separates the proven uses from the hype tier by tier, and the parts link into it rather than repeating it.

For learners the shift is already here. The value moves from typing programs toward specifying them precisely and verifying their output. That raises the stakes on L1, because you cannot verify code you cannot read, and you cannot catch a plausible-but-wrong derivation without knowing what right looks like. Use assistants while you learn. Write the code yourself until each line is routine.

<div class="era-callout">
  <p><strong>The agentic way</strong> — Assistants now draft competent SAS and R for CDISC tasks on demand, which moves a learner's value from writing programs to specifying and verifying them; the failure mode is shortcutting the reading fluency you will later be paid to check.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

## Key takeaways

- This series replaces ambush-learning with a structured path of fourteen self-contained parts.
- Learn L1 deeply, L2 serviceably, L3 loosely; their shelf lives run about ten years, three to five years, and six months.
- Publication order is not learning order. If CDISC is new to you, read Part 4 before Part 2.
- Six weeks on the five-part sprint makes you useful on day one; twelve months on the full spine makes you competitive.
- Verification skill is downstream of reading fluency, so the AI layer rewards people who know what correct looks like.

## FAQ

### Do I need SAS experience to start?

You need base mechanics by the end of the SDTM line: the DATA step, merges, the common PROCs. SAS Studio runs in a browser at no cost through SAS OnDemand for Academics, which covers everything the early parts ask you to type. If you have never written SAS, spend two weeks on mechanics first, then start at Part 4.

### Is SAS dying? Should I learn R instead?

Validated environments still run mostly SAS, and the R-based pharmaverse stack has real regulatory momentum; the R Consortium's submission pilots with FDA participation are public. Both engines get hired. The layer that transfers unchanged is L1, because CDISC logic and GxP reasoning are engine-agnostic. Start with the engine your target jobs list, then add the second.

### How long does the full path take?

With about an hour a day, the six-week sprint covers its five parts comfortably; the full spine takes most self-learners eight to twelve months alongside a job. Real study data compresses every horizon, and the career guide's ladder table gives rough rungs.

### Can I use AI assistants while working through the series?

Yes, with one rule: the assistant may explain and critique, but you write the code until each line is routine. Interviews and auditors grade your reasoning, and reasoning aloud is a skill built by doing, not by watching.

### Do I have to read the parts in order?

No. Each part is self-contained and opens with the context it needs. The two syllabi in Table 3 are tested orders, not requirements. Start where your gaps are.

---

Start where your syllabus says. New to CDISC means Part 4 — SDTM domain basics; setting up a study environment first means [Part 1 — the statistical computing environment guide](/blog/sce-statistical-computing-environment-guide.html). For which AI uses carry evidence rather than demos, read the [state-of-field survey](/blog/llm-clinical-statistical-programming-state-2026.html).
