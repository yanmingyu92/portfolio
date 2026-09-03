# Medium upload-ready draft — From Mock Shell to RTF: How Clinical TLF Outputs Actually Ship

## Publish (paste path — recommended for this post: it has tables, which the importer mangles)

1. New story at https://medium.com/new-story
2. Title: From Mock Shell to RTF: How Clinical TLF Outputs Actually Ship
3. Paste everything between the BEGIN/END markers below.
   - The bare youtu.be line becomes an embedded player after a beat — leave it on its own line.
   - Tables are monospace blocks on purpose: Medium has no native table block.
   - Code fences, quotes and headings paste through as-is.
4. Set the canonical link (SEO): Story settings -> Advanced settings ->
   "This story was originally published elsewhere" -> https://jaimeyan.com/blog/tlf-shell-to-rtf-tutorial.html
5. Tags (Medium allows 5): clinical-sas, tlf, proc-report, qc
6. Preview, then Publish.

## Alternative: importer (fast, but no table fidelity)

- https://medium.com/p/import with https://jaimeyan.com/blog/tlf-shell-to-rtf-tutorial.html — sets canonical
  automatically, but Medium flattens HTML tables; prefer the paste path above
  for this series.

---

Canonical: https://jaimeyan.com/blog/tlf-shell-to-rtf-tutorial.html
Video: https://youtu.be/q_3AVwsb5wE

=== BEGIN PASTE BODY ===

The shell for output 14.1.1 says the safety column header reads "N=24"; your output says "N=26". The program is not wrong — it counted every subject with any study exposure. The shell is not wrong either: it was written against the SAP's safety population, first dose plus the 30-minute observation window. Both numbers are defensible, but only one is the deliverable, and that is the whole game with tables, listings, and figures: the mock shell is a contract, and most late-stage QC findings are contract violations, not math errors.

> **TL;DR** — How TLF outputs actually ship: reading a mock shell into a program plan, PROC REPORT patterns for tables and listings, figure conventions, ODS RTF delivery details, and the four-pass QC order that finds defects cheapest-first, with discrepancy handling that never fixes silently.

**Watch the companion video walkthrough:**

https://youtu.be/q_3AVwsb5wE


## The fundamentals

### The shell is a contract

A mock shell is a mock-up of the final output: an RTF sketch showing the title block, column headers, a fake data row or two, and footnotes. Every element in it is a commitment you can be checked against.

```text
Shell element             |  The commitment it carries
--------------------------+------------------------------------------------------------------
Output ID (e.g., 14.1.1)  |  Filing location and traceability back to the SAP
Title block               |  Exact wording, analysis population named
Population statement      |  Which flag defines every subject in the output
Column blocks             |  Grouping, order, and spanning headers
Denominators (N=…)        |  Which N every percentage uses
Row structure             |  Order of populations, parameters, or statistics
Footnotes                 |  Statistical methods, dictionary versions, SAP section references
Page conventions          |  Repeated headers, "(Continued)" markers, page x of y
```

*Table 1: Shell anatomy. Each cell is checkable, which is what makes QC against a shell possible.*

Read the table twice, because it defines your defect surface. A wrong percentage is one kind of finding. A footnote that says "MedDRA Version X" when the cut used Version Y is a different kind: same severity on submission day, far cheaper to catch.

### Reading a shell into a program plan

Before any code, convert the shell into decisions, in this order:

1. **Population**: which ADSL flag filters subjects (SAF, ITT, completers), and what the population statement says verbatim.
2. **Data source**: which analysis dataset and parameters feed the rows.
3. **Row structure**: populations, parameters, statistics, in shell order.
4. **Column blocks and denominators**: treatment groups, totals, and which N goes in each header.
5. **Statistics and formats**: n (%), medians, decimal precision exactly as the shell shows them.
6. **Footnotes and pagination**: method references, version stamps, page conventions.

Skipping step 1 produces the N=24/N=26 scene from the hook; it is the single most common serious discrepancy on a first QC cycle.

### The table pattern: PROC REPORT with computed percentages

The core of most tables is a count with a percentage against a denominator pulled from ADSL, never from the event dataset, which would silently change the denominator to "subjects with events".

```sas
proc sql noprint;
  create table den as select trt01p, count(distinct usubjid) as n
    from adam.adsl where saffl = "Y" group by trt01p;
  select n into :n_tot from den where trt01p = "Total";
quit;

data cells;
  set den;
  length npct $20;
  if n = &n_tot then npct = cats(n, " (100)");
  else npct = cats(n, " (", put(n / &n_tot * 100, 4.1), ")");
run;
```

Two conventions worth stealing. The denominator comes from ADSL with the population flag applied, once, in one place. And exact hundreds render as `n (100)` without decimals, matching the shell's precision rules instead of printing `100.0` because the format said so. A PROC REPORT step then displays `cells` with column definitions; the numbers are already strings, so what QC checks is exactly what ships.

### The listing pattern: sort, page, continue

Listings are simpler numerically and stricter structurally: one record per row, sort order exactly per shell, and page breaks under control.

```sas
data listing;
  set adam.adsl;
  retain rowcnt 0;
  rowcnt + 1;
  page = ceil(rowcnt / 15);
run;

proc report data=listing nowd;
  column page usubjid siteid trt01p saffl;
  define page / order noprint;
  break after page / page;
run;
```

The computed `page` variable fixes rows-per-page deterministically, and `break after page / page` forces the break. PROC REPORT repeats headers on every page by default, which the shell expects. When a listing runs multiple pages, the convention is a title or first-column marker reading "(Continued)"; check which one the shell shows, because reviewers look for exactly that.

### The figure pattern: population join and per-group n

Figures fail QC on the boring details: wrong population, missing n counts, unlabelled groups. The pattern that holds up joins the analysis data to ADSL with the population flag, and states per-group n in the title or legend exactly where the shell puts it.

```sas
proc sql;
  create table plot as
  select l.aval, s.agegr1
  from adam.adlb l join adam.adsl s
    on l.usubjid = s.usubjid
  where s.saffl = "Y" and l.param = "Creatinine (umol/L)";
quit;

proc sgplot data=plot;
  vbox aval / category=agegr1;
run;
```

The join does the population filtering: no subject outside the safety population reaches the plot axis. Axis labels, category order, and the n statement come from the shell, not from what looks reasonable on screen.

### ODS RTF conventions

Delivery details that separate a submitted output from a draft:

- **Titles and footnotes go through `titleN`/`footnoteN` statements inside the ODS block**, so they live in the RTF file itself, repeated per page as the shell specifies.
- **A style template sets fonts and margins once**: a `proc template` style off `styles.rtf` with a fixed-pitch font and one-inch margins, reused by every output in the study.
- **Page x of y** via `ods escapechar='^'` and `^{pageof}` in a footnote: reliable in RTF, and far safer than counting pages yourself.
- **Decimal precision per shell**: percentages 4.1 in one table, integers next door; precision is a shell property, not a programmer preference. Pass 4 of QC exists partly for this.
- **Program path or ID in a footnote**, per study convention, so every output traces to the program and version that produced it.

### The four-pass QC order

QC runs in a fixed pass order, cheapest first — no expensive recomputation on an output that would fail a format check anyway.

```text
Pass                |  Focus                                                                 |  Typical catch
--------------------+------------------------------------------------------------------------+------------------------------------------------------
1 Format            |  Titles, headers, footnotes, pagination vs. shell                      |  Wording drift, missing footnote, wrong "(Continued)"
2 Data definitions  |  Population flag, denominators, visit windows per SAP                  |  The N=24/N=26 class of defect
3 Numbers           |  Independent recomputation, cross-foot vs. another output              |  Wrong percentage, wrong sort, broken row integrity
4 Consistency       |  Same N everywhere the same population appears; terminology; decimals  |  Family drift across an output set
```

*Table 2: The four-pass order. Each pass gates the next; recompute nothing until format and definitions pass.*

Pass 3 is the only pass that needs real independent work: a hand recomputation of one row per block, or an independently generated QC program. Passes 1 and 2 are comparison against documents, which is where tooling (and agents, below) help most.

### Discrepancies: record, never silently fix

Every shell-vs-output difference gets a record before it gets a resolution:

```text
Field            |  Example
-----------------+----------------------------------------------------------------------------------------
Output ID        |  14.1.1
Shell reference  |  Column header, safety N
Observed         |  N=26
Expected         |  N=24 (SAP section 6.2, first dose + 30-min observation)
Disposition      |  Query to statistician — program used dosed-any flag; shell requires observation window
```

*Table 3: A discrepancy record. The disposition names the interpretation chosen and who approved it.*

The rule is absolute: never resolve ambiguity by editing code without writing down which interpretation was chosen and who signed it. A silently fixed discrepancy reappears at the next data cut, with nobody remembering why the number changed.

## The modern workflow

**Shells as machine-readable contracts.** The shell library stops being a folder of RTF sketches and becomes structured metadata (output IDs, population rules, column definitions, footnotes) that programs generate from and QC compares against. How well retrieval over such a library actually works, measured across 1,999 experiments, is the subject of [Benchmarking RAG for Clinical TLF Templates](https://jaimeyan.com/blog/benchmarking-rag-clinical-tlf-templates.html).

**QC without full duplication, where justified.** When the shell is machine-readable and the output is generated from the same contract, Passes 1 and 2 become comparisons a tool runs, and independent effort concentrates on Pass 3. Where that leaves double programming, and what it doesn't cover, is worked through in [Double Programming Without the Duplication](https://jaimeyan.com/blog/eliminating-qc-programming-duplication.html).

**Outputs as pipeline artifacts.** The RTF is produced inside the validated SCE run (environment pinned, program versioned, output hash logged), so "which program and which data cut produced this file" is answerable mechanically. Output-to-shell traceability then stops being a spreadsheet someone maintains.

## The agentic way

Agents are genuinely fast at Passes 1 and 2: comparing an output against a shell is document comparison, and they draft the finding table in minutes. The failure mode is the confident gloss, "output matches shell" with no evidence of what was compared. The interrogation that separates a real comparison from a gloss comes from the QC checklist: ask the agent to list the three closest mismatches it considered and rejected, since a real comparison produces that list immediately while a gloss hedges. Run comparisons with determinism in mind as well; temperature zero alone does not make an LLM reproducible, as [Temperature 0 Doesn't Buy You Reproducibility](https://jaimeyan.com/blog/note-temperature-zero.html) shows.

> The agentic way — Agents draft shell-conformance comparisons and first-pass TLF code in minutes; the failure mode is a confident "matches shell" that glosses denominators and footnote numbering. Require the three closest mismatches it considered before trusting any match claim.
>
> Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.

<a class="skill-card" href="/skills/tlf-qc-checklist/SKILL.md">
  <span class="skill-card-name">tlf-qc-checklist</span>
  <span class="skill-card-desc">Shell-to-output QC checklist for tables, listings, and figures — the four-pass order, denominator and footnote checks, and the discrepancy-record discipline.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- The mock shell is a contract: output ID, titles, column blocks, denominators, footnotes, and population statement are all checkable commitments.
- Pull every denominator from ADSL under the population flag, never from the event dataset, and render precision exactly as the shell specifies, including the `n (100)` convention.
- Listings ship on sort order, controlled page breaks, repeated headers, and "(Continued)" markers; figures ship on the population join and stated per-group n.
- QC in four passes (format, data definitions, numbers, consistency), cheapest first, and never recompute an output that fails an earlier pass.
- Every discrepancy gets a record with observed, expected, and a named disposition; silent fixes resurface at the next data cut.

## FAQ

### Do I need double programming for every output?

The intent of double programming is independent verification of the numbers. What that requires in practice is an independent Pass 3 on statistical outputs; format and definition passes are comparisons against documents and can be tool-assisted. Where the shell and output are generated from shared machine-readable contracts, the duplication question changes shape; see [Double Programming Without the Duplication](https://jaimeyan.com/blog/eliminating-qc-programming-duplication.html).

### Why does my RTF page break differently than the shell?

RTF pagination depends on font, margins, row height, and the viewer. Fix the style template first (one-inch margins, the specified font), then control breaks explicitly with a computed page variable and `break after … / page`, rather than letting the destination decide.

### What is the practical difference between a table and a listing?

A table summarizes: one row per category or statistic, counts and percentages against stated denominators. A listing displays records: one row per observation, sorted per shell, full detail, paginated. The QC emphasis follows: tables die on denominators, listings die on sort order and row integrity.

### Who approves a discrepancy disposition?

Whoever owns the interpretation being chosen. Code fixes are a programmer decision; shell-interpretation calls go to the statistician; anything touching the population definition goes back to the SAP owner. The record exists precisely so the approval is named and revisit-able.

---

Previous in the series: [ADSL derivation walkthrough](https://jaimeyan.com/blog/adsl-derivation-tutorial-trtstdt.html). Next: SDTM domain basics. The full path is in [the series roadmap](https://jaimeyan.com/blog/clinical-sp-bootcamp-roadmap.html), and the QC-side economics continue in [Double Programming Without the Duplication](https://jaimeyan.com/blog/eliminating-qc-programming-duplication.html).

---

*Prefer the interactive version? Step through the animated walkthrough: https://jaimeyan.com/explainers/clinical-data-journey.html*

=== END PASTE BODY ===
