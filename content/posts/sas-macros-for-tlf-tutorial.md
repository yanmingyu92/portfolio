---
title: "SAS Macros for TLF: Design Patterns and Debugging"
date: 2026-09-01
description: "SAS macros for clinical TLF: the driver pattern over a metadata table, parameter discipline, %local hygiene, and MPRINT debugging for classic macro failures."
tags: ["clinical-sas", "sas", "macros", "tlf"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 18
skillArtifact: /skills/tlf-macro-patterns/SKILL.md
canonicalPath: /blog/sas-macros-for-tlf-tutorial.html
draft: true
---

The listing macro runs clean. Zero errors, zero warnings, one RTF on disk. You open it: headers, titles, footnotes, and not a single data row. You rerun it. Same result. The log tells you nothing because the log shows what SAS executed, and what SAS executed is not what you wrote; it is what the macro generated. The WHERE clause you cannot see resolved against a flag value that does not exist in this cut. That is macro work in clinical programming: the bug is rarely in the macro you typed. It is in the code the macro typed. This post covers the patterns that keep generated code predictable and the diagnostics that make it readable.

> **TL;DR** — How SAS macros pay off in TLF work: the driver pattern (a metadata table plus a small loop), parameter discipline, and %local hygiene. Then MPRINT, SYMBOLGEN, and MLOGIC on the three classic macro failures, an anti-pattern gallery, and a three-shell portability test.

## The fundamentals

### One logic, many outputs

Macros exist in TLF work because the outputs repeat with variation. Dozens of tables and listings share one skeleton: filter a population from ADSL, count subjects per treatment group, lay out the columns, hang the titles and footnotes, write the RTF. What differs between two outputs is small: the output ID, the population flag, the title set, sometimes the sort. [Part 3](/blog/tlf-shell-to-rtf-tutorial.html) covered reading one mock shell and shipping one output. Macros are the answer to your thirtieth shell.

Hard-code one block per treatment column, and a column-order change edits every block in every program. The one you miss ships, and at review it reads as an analysis error.

### The driver pattern: a metadata table and a loop

Keep the logic once. Put the variation in a table. Drive the loop.

```sas
data tlfmeta;
  length outid $10 popfl $8 ttl1 $60;
  infile datalines dlm="|";
  input outid popfl ttl1 $;
datalines;
14.1.1|SAFFL|Summary of Demographics
16.2.1.1|SAFFL|Assignment to Analysis Populations
16.2.2.1|SAFFL|Adverse Events by System Organ Class
;
run;
```

One row per output. Everything that varies lives in a column: the output ID that routes the file, the population flag that filters, the title set the shell requires.

```sas
%macro drive_listings;
  %local i nouts;
  proc sql noprint;
    select count(*) into :nouts trimmed from tlfmeta;
    select outid, popfl, ttl1 into :id1-, :fl1-, :t1-
      from tlfmeta;
  quit;
  %do i = 1 %to &nouts;
    %mk_listing(data=adam.adsl, outid=&&id&i,
                popfl=&&fl&i, ttl1=&&t1&i);
  %end;
%mend drive_listings;
```

The driver reads the table (SQL `INTO` ranges) and calls the workhorse once per row; note the `%local` on index and row count.

The workhorse stays short and generic; this one is a complete listing producer:

```sas
%macro mk_listing(data=, outid=, popfl=, ttl1=);
  %local nsub;
  proc sql noprint;
    select count(distinct usubjid) into :nsub trimmed
      from &data where &popfl = "Y";
  quit;
  title1 j=c "&ttl1";
  title2 j=c "Analysis Population: N=&nsub";
  ods rtf file="out_&outid..rtf" style=styles.tlf;
    proc report data=&data nowd;
      where &popfl = "Y";
      column usubjid siteid trt01p;
    run;
  ods rtf close;
%mend mk_listing;
```

The population enters exactly one place, the `where &popfl = "Y"` clause, and the header count uses the same filter, so the N in title2 and the body rows cannot diverge. The first dot in `&outid..rtf` terminates the reference; the second prints. Titles and the ODS destination live inside the macro: one call, one complete output.

### Parameter discipline

Everything the macro needs arrives through keyword parameters: dataset, output ID, population flag, title set. No globals read on the side, no `%let` at the top of the program that the macro silently depends on.

Two payoffs. The macro is testable: call it with any population and output ID and inspect the result without touching code. And it is safe to call from anywhere, including inside another macro's loop, which is what the driver does.

The discipline has an interview echo: [Part 10](/blog/clinical-sas-interview-questions-guide.html) asks "a macro runs without errors but produces nothing, how do you debug it." Half the strong answer is the switches below; the other half is the scope discipline that prevents the question.

### %local hygiene: why undeclared variables leak

A macro variable created without `%local` does not stay inside the macro. If the name exists somewhere outward, a driver's loop index, a counter set at startup, the assignment writes to that outer copy. The loop restarts, repeats a block, or skips outputs. No error in the log; 16.2.1.1 just ships twice and 16.2.2.1 never appears.

The failure recipe: two macros both looping with an index named `i`, only one declaring it. The helper overwrites the driver's index, and on return the `%to` check reads a mutated value. Iterative `%DO` uses whatever same-named variable it can see; without `%local` in the helper, that is the driver's copy.

The rule: declare `%local` for every macro variable the macro creates, indexes and counters first. One line per variable buys a macro safe to nest, safe to fork into a new study, safe to hand to QC.

### Titles, footnotes, and ODS routing belong to the macro

Titles are session-global in SAS: a title set in an earlier program survives into your output, which is how "Protocol 123 titles under a Study XYZ output" happens. The workhorse sets its full title block every call, adds the footnotes, opens the RTF destination, runs the report, closes it. Nothing inherited, nothing leaked.

The RTF style template is the same idea at study level: defined once, referenced by name. Its contents are in [Part 3](/blog/tlf-shell-to-rtf-tutorial.html); the rule here is that no macro redefines styles or titles another macro owns.

### The debugging trio

| Symptom | Likely cause | First switch |
|---|---|---|
| Runs clean, table empty | Population filter resolved to nothing: flag value wrong for this cut, dataset typo, empty input | MPRINT — read the generated WHERE clause |
| Wrong counts, stale N | A macro variable resolved to the wrong value: scope bleed, typo'd name, stale global | SYMBOLGEN — watch every resolution |
| Repeated blocks, runaway loop | Loop index leaking across nested macros; `%by` clause dropped in a copy; undeclared `%local` | MLOGIC — trace %DO boundaries |

*Table 1: The three classic macro failures. While debugging, switch all three on together: `options mprint symbolgen mlogic;`*

MPRINT prints the SAS code the macro generates; when the output is empty or wrong, the bug lives in this code, not the macro source. Resolved evidence from a healthy call:

```text
SYMBOLGEN:  Macro variable POPFL resolves to SAFFL
MPRINT(MK_LISTING):   where SAFFL = "Y" ;
```

When the same line reads `where POPFL = "Y"` because someone passed the flag value instead of the variable name, you have found the bug in ten seconds.

SYMBOLGEN prints each resolution as it happens, including the two-step `&&id&i` resolution in the driver. Wrong counts almost always show a value resolving from where you did not expect: a stale `&nsub`, a global set elsewhere. MLOGIC traces `%IF` branches and `%DO` iterations: a loop entered twice, a branch never taken.

All three are debugging settings: on for the debugging run, off for the validated run.

### Test across three shells before you trust it

The portability test: run the macro against three shells from three different studies, or three structurally different sections of one shell library. Different population. Different column count. A listing and a table if the macro claims both. Fix what breaks, then run all three again.

If each study still needs its own edit, you wrote a template, not a macro. Same discipline as the [SDTM mapping spec walkthrough](/blog/sdtm-mapping-spec-walkthrough.html) upstream: metadata carries the variation, the program carries the logic, and a new study changes the table, not the code.

### The anti-pattern gallery

| Anti-pattern | What it looks like | Why it hurts |
|---|---|---|
| Six-level nesting | %mk calls %fmt calls %pop calls %cnt | MPRINT output becomes unreadable; nobody, including you, can QC the resolved code |
| Macro-as-configuration | Forty %let statements at the top; macros read the globals silently | Changing one value is archaeology; the second caller breaks it |
| Copy-paste forks per output | %tab141, %tab142, %tab143, each "slightly different" | A fix lands in one fork; the others drift until the next data cut |

*Table 2: The three recurring anti-patterns. All three share one root: variation stored in code instead of in data.*

Nesting adds a resolution boundary per level; by level four, MPRINT shows code whose provenance you cannot trace. The %let chain is a driver table with worse ergonomics and invisible consumers. The per-output fork multiplies every QC fix by the number of forks, applied by hand, on deadline.

## The modern workflow

**The driver table becomes generated data.** The table above is hand-typed, and hand-typed metadata is transcription risk next to your logic. When the shell library is machine-readable, the table is generated from the shells: output IDs, population rules, titles extracted instead of retyped. How well retrieval over such a library works is measured in [Benchmarking RAG for Clinical TLF Templates](/blog/benchmarking-rag-clinical-tlf-templates.html). The macro layer does not change; the metadata layer stops being typed.

**Macros under CI.** The driver pattern makes TLF generation pipeline-able: one program, one metadata table, a full output set per run. Under Git with CI, every commit regenerates every output, and a scope bug that hides in an interactive session surfaces as a red build; the mechanics are in [Pipeline as Code for SDTM and ADaM](/blog/pipeline-as-code-sdtm-adam.html). Parameter discipline keeps it safe: the CI runner is a caller with no human nearby to rescue a hidden global.

**What ports to R and Python.** The driver pattern translates directly: a tibble or DataFrame holds the specifications, one function per output type replaces the workhorse, a `walk` or `apply` replaces the `%do` loop. `%local` hygiene comes free, because function scope is the default and a leaked variable is a visible bug. The syntax does not translate; titles, ODS destinations, and PROC REPORT layout have different idioms, mapped in [the SAS-to-R migration field guide](/blog/sas-to-r-migration-field-guide.html). The design, one logic driven by data, transfers completely.

## The agentic way

Agents draft macro code fast, and the code usually runs. The failure mode is structural, not syntactic: generated macros omit `%local` declarations, read undeclared globals, and bury parameters in `%let` chains, because that pattern is common in public SAS code the models learned from. None of it shows in a code review; all of it shows on the second call.

The verification habit follows: call the agent's macro twice from a driver with different parameters, under `options mprint symbolgen mlogic;`. Scope bugs surface on the second call, and the resolved log shows them in minutes. Then ask the agent to list every macro variable it creates and where each is declared; if it cannot, neither can your QC reviewer.

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents draft working macro skeletons and read resolved MPRINT logs fast; the failure mode is scope discipline — generated macros omit %local and hide parameters in %let chains, bugs that only surface on the second call.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-09-01. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/tlf-macro-patterns/SKILL.md">
  <span class="skill-card-name">tlf-macro-patterns</span>
  <span class="skill-card-desc">Driver-table schema, parameter and %local hygiene rules, the MPRINT/SYMBOLGEN/MLOGIC debugging trio, and the anti-pattern and portability checks for TLF macros.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- Keep the logic once and drive the variation from a metadata table: output ID, population flag, title set, one row per output.
- Everything the macro needs enters as a parameter; declare `%local` for every variable it creates, indexes first, or the second caller inherits the first caller's state.
- When a macro misbehaves, read the generated code: MPRINT for empty output, SYMBOLGEN for wrong counts, MLOGIC for runaway loops, all three on together.
- Test a macro against three shells from different studies; if each one needs an edit, it is a template, not a macro.
- Nesting, %let configuration chains, and per-output forks are the same debt: variation stored in code. Move it to the table.

## FAQ

### Do I need a macro for every TLF output?

No. A one-off output with unique logic is a plain program. Macros pay when logic repeats across outputs, populations, or treatment columns. If you cannot name what varies, you have a copy-paste plan.

### MPRINT, SYMBOLGEN, MLOGIC — which one first?

MPRINT, because it shows the code that actually ran; most empty-output bugs are visible as a resolved WHERE clause that filters everything. SYMBOLGEN when values are wrong rather than absent. MLOGIC when flow misbehaves.

### How many parameters is too many?

Past seven or eight, the macro is usually doing two jobs. Split it, or move the variation into the driver table and pass the row identifier. Keyword parameters with defaults keep call sites readable.

### Can an AI assistant write these macros?

For drafts, yes, and for reading resolved logs it is genuinely fast. The boundary is the one from [AI coding assistants in SAS and GxP environments](/blog/ai-coding-assistants-sas-gxp.html): agent-drafted code enters the validated library only after the same independent QC as human-written code. Run the second-call test on anything it produces.

---

*Part 18 of the [Clinical SP Bootcamp](/blog/clinical-sp-bootcamp-roadmap.html). It extends [Part 3 — From Mock Shell to RTF](/blog/tlf-shell-to-rtf-tutorial.html); macro scope questions open the interview round in [Part 10 — clinical SAS interview questions](/blog/clinical-sas-interview-questions-guide.html); the CI side is [pipeline as code](/blog/pipeline-as-code-sdtm-adam.html). For where assistant-drafted macros may flow inside a GxP boundary, see [AI Coding Assistants in SAS and GxP](/blog/ai-coding-assistants-sas-gxp.html).*
