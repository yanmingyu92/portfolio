---
title: "How to Read a Protocol and SAP as a Statistical Programmer"
date: 2026-09-01
description: "Turn a protocol and SAP into a programmer's work list: endpoints, populations, windowing, dates, and query discipline for what the documents leave silent."
tags: ["clinical-sas", "protocol", "sap", "cdisc", "study-startup"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 15
skillArtifact: /skills/protocol-sap-extraction-checklist/SKILL.md
canonicalPath: /blog/protocol-sap-reading-guide.html
draft: true
---

A new study lands with three documents: a 120-page protocol, a statistical analysis plan, and a shared drive letter. The statistician highlights two sentences in an email. Somewhere in those pages is the rule that decides whether visit 4 lands in the efficacy analysis, and nobody has told you which sentence it is. Finding it is not reading. Finding it is the extraction pass, and it is the single highest-leverage skill separating a study startup that takes six weeks from one that takes two.

> **TL;DR** — You get a protocol and SAP to produce datasets and TLFs, not summaries. This part walks the extraction pass in order: endpoints, populations, visits and windowing, dates and exposure, AE rules, derivations, and shells. Each step ends in an artifact (a map, a flag, a spec row) or a logged query — never a private guess. A companion Claude skill packages the checklist.

## The fundamentals

### Read like a producer, not a reviewer

A monitor reads the protocol for compliance. A statistician reads the SAP for analysis intent. A statistical programmer reads both for the sentences that become code. The difference sounds small; it changes what you underline. "Efficacy evaluated in the full analysis set" is background to a reviewer and an ADSL flag plus a denominator decision to you.

The practical habit: every time you meet a rule, name its artifact.

| Document sentence (generic example) | Artifact it owns |
|---|---|
| "Primary endpoint: change from baseline in X at Week 24" | ADXX baseline + Week-24 windowing rule + responder derivation |
| "Full analysis set: all randomized subjects" | ITT flag from DS randomization records in ADSL |
| "A dose is any exposure with documented administration" | EX selection rule behind TRT01SDT |
| "On-treatment adverse events: onset on or after first dose" | TE flag convention in ADAE |
| "Week 24 window: [Day 154, Day 238]" | BDS analysis-visit (AVISIT/NR) derivation |

*Table 1: The same documents, read two ways. The right column is your deliverable list.*

### The pass, in order

**1. Endpoints first.** List every primary and key secondary endpoint with its section number. For each: which analysis dataset carries it, and which TLF reports it. An endpoint with no owner is not trivia — it is a scope finding that belongs in the startup meeting, not in week nine.

**2. Populations.** ITT, safety, per-protocol, completers. The SAP gives criteria in words; your job is translating each into a source (randomization in DS, any dose in EX, completion per DS) and an ADSL flag with the SAP citation attached. When Part 2 derived TRT01SDT and the SAF flag, this table is where those rules came from.

**3. Visits and windowing.** Scheduled visits, unscheduled handling, and the windowing arithmetic. Is the window anchored to day 1 or to the previous visit? Are unscheduled visits eligible to fill a window? What defines baseline for each parameter class? These sentences decide whether your BDS datasets (Part 7) are right, and they are the sentences teams argue about at week twelve because nobody extracted them at week zero.

```sas
/* Analysis-visit assignment, generic Study XYZ pattern.
   The window boundaries come from the SAP table, not from habit. */
data advs_w;
  set advs_raw;
  if 1 <= ady <= 7   then avisit = "WEEK 1";
  else if 148 <= ady <= 168 then avisit = "WEEK 24";
  else if ady > 168   then avisit = "FOLLOW-UP";
run;
```

**4. Dates and exposure.** First dose, last dose, partial dates, discontinuation. What counts as a dose? Does documented administration outrank a positive EXDOSE? Every answer becomes a branch in the TRT01SDT cascade from Part 2 — and the fallback branch must cite the SAP, because the fallback is where studies differ and where generic habits go wrong.

**5. AE and medication rules.** Treatment-emergent definition, severity source, relatedness coding, MedDRA version, CT package. Pin the versions in one place; version drift between domains is a classic cross-domain finding of the kind rule engines cannot see.

**6. Named derivations.** Change from baseline, responders, LOCF-or-equivalent, any pooled analysis. Each gets its rule and its owning SAP section recorded in the spec — the same spec discipline as Part 6, applied one document earlier.

**7. Interim and DMC.** Extra populations, extra output sets, blinded and unblinded flows. These change the programming environment and the access model, not just the program list.

**8. Shells cross-check.** Close the loop by walking the TLF shells against the endpoint map: every output traces to an endpoint or a safety requirement. A shell nobody can justify is a query, and a justified analysis with no shell is a scope conversation.

### The query discipline

Documents go silent in exactly the places that matter: a windowing rule for an added visit, a fallback for a missing first dose, the handling of a dose recorded only in free text. The rule is blunt. When the SAP is silent, you do not choose. You log the ambiguity — section, the options, the operational impact — and route it to the statistician. The disposition lands in the spec with a citation, and programming resumes. A decision that lives only in someone's code is a decision the auditor will treat as invented, because it was.

## The modern workflow

Two shifts changed this pass. First, specs became the contract: the extraction worksheet feeds mapping specs and define-XML directly, so the worksheet format is worth keeping disciplined (Part 6 shows the downstream). Second, documents went electronic: tracked SAP amendments and shell libraries now live under version control in cloud SCEs (Part 1), which means your extraction worksheet can cite document versions the way programs cite dataset versions — and a two-line diff between SAP v1.3 and v1.4 tells you which derivations to re-check, instead of re-reading 90 pages. Teams that wire the worksheet into the study repository give the startup meeting a single artifact to argue about, which is the meeting working as intended.

## The agentic way

An agent reads a 120-page protocol in seconds and produces a plausible endpoint list. Use that speed for the first pass, then verify like an auditor: pick each extracted rule and ask for the section number, because the failure mode is confident paraphrase — an endpoint definition subtly softened, a window boundary stated as a convention rather than a citation. The habits that work: extraction with quotes (rule plus verbatim source sentence), explicit "not stated in document" markers instead of guessed values, and a human who owns the worksheet. The worksheet is the deliverable; the agent is the first drafter.

<div class="era-callout">
  <p><strong>The agentic way</strong> — agents make the first extraction pass cheap and the verification pass mandatory. The failure mode is confident paraphrase: a rule that reads right and cites nothing.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-09-01. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/protocol-sap-extraction-checklist/SKILL.md">
  <span class="skill-card-name">protocol-sap-extraction-checklist</span>
  <span class="skill-card-desc">Drop-in Claude skill: the eight-step extraction pass with query discipline, for your next study startup.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- Read as a producer: every rule sentence must name its artifact — a dataset, a flag, a spec row, or a logged query.
- Run the pass in order: endpoints, populations, visits and windowing, dates, AE rules, derivations, interim flows, shells.
- Windowing and baseline sentences decide BDS correctness; extract them at week zero, not at the week-twelve argument.
- When the SAP is silent, log and route. A decision that lives only in code is a decision invented by the programmer.

## FAQ

### What is the difference between a protocol and a SAP for programming?

The protocol states the scientific intent — design, objectives, population, visits, dosing. The SAP translates intent into analysis decisions — populations, derivations, statistical methods, output lists. Programmers need both: the protocol explains why a rule exists, the SAP states the rule you implement. When they disagree, the SAP governs analysis and the discrepancy is a query.

### The SAP does not mention windowing. What now?

Log it and route it. Common fallbacks exist (nearest visit, day-based windows), but a fallback chosen silently becomes an audit finding later. The query takes ten minutes; reprogramming an efficacy dataset after lock does not.

### When is the SAP final enough to program against?

Practically: when the draft stops moving on derivations and populations, with amendments tracked per version. Teams commonly start SDTM work on protocol alone (SDTM describes what happened, not what will be analyzed) and hold ADaM work until the SAP and shells stabilize. Cite the SAP version in your spec so later amendments are a diff, not a re-read.

### Does this pass apply to observational or real-world studies?

The artifact discipline transfers — endpoints to datasets, rules to spec rows, silences to queries. What changes is the source: instead of a protocol you may have a statistical analysis plan over external data, so the extraction pass adds provenance checks on the incoming data, and the windowing rules usually get looser and matter more.

---

Next in the series: the full arc continues with [Part 4, SDTM domain basics](/blog/sdtm-tutorial-domain-basics.html), the [mapping specification walkthrough](/blog/sdtm-mapping-spec-walkthrough.html), and the [ADSL derivation walkthrough](/blog/adsl-derivation-tutorial-trtstdt.html) that consumes the worksheet this part produces. For what agents can already do with study documents, see the [RAG benchmarking for TLF templates](/blog/benchmarking-rag-clinical-tlf-templates.html).
