# ADSL Derivation Walkthrough: TRT01SDT, Flags, and the Merge Traps

<!-- Wechatsync target: Zhihu. Canonical: https://jaimeyan.com/blog/adsl-derivation-tutorial-trtstdt.html -->

An ADSL with 204 rows for a 200-subject study looks harmless until two programs read it the same morning. The demographic table reports an N of 204 in one block and 200 in the header. The Kaplan-Meier plot quietly double-counts the subjects who each got two rows. The defect sits upstream, in ADSL, where a merge against a two-records-per-subject disposition extract broke the one invariant ADSL exists to enforce.

> **TL;DR** — ADSL is one row per subject, and everything in this post defends that invariant: the TRT01SDT/TRT01EDT derivation cascade from exposure records, planned versus actual treatment, SAP-cited population flags, and a merge discipline that catches fan-out before QC does. Small SAS listings included, plus the checks I run before any ADSL leaves my desk.

## The fundamentals

### One row per subject is the whole job

ADSL, the Subject-Level Analysis Dataset, is the spine of the ADaM stack. Demographics, treatment variables, key dates, and population flags live here at exactly one record per subject. Every other analysis dataset (ADVS, ADLB, ADAE, ADTTE) merges ADSL in to inherit TRT01P, TRT01A, SAFFL, and the rest. If ADSL is wrong at the subject level, every downstream dataset inherits the same wrong answer on every row, in a way that looks perfectly consistent.

That is why the one-row-per-subject invariant organizes the entire build. For any source domain, the first question is how many rows per subject it brings and what happens to them before the merge; the variable list is the second question.

| Source domain | Rows per subject | Before it touches ADSL |
|---|---|---|
| DM | 1 | Merge directly, keep the spine intact |
| SV (visits) | Many | Aggregate first (earliest visit, last visit) |
| EX (exposure) | Many | Aggregate first (earliest/latest qualifying dose) |
| DS (dispositions) | Many | Subset by category, aggregate to one row per subject |
| SUPPDM | Many | Transpose wide to one row per subject, then merge |

*Table 1: Subject-level sources and what each needs first. Anything with "Many" in column two gets aggregated or transposed before the merge, never after.*

### The TRT01SDT derivation cascade

TRT01SDT, the date of first exposure to study treatment, is a cascade, not a lookup. In a generic Study XYZ build the order runs:

1. Restrict EX to qualifying records: EXDOSE > 0, or EXOCCUR = Y, whichever the SAP names.
2. Take the earliest EXSTDTC among qualifying records.
3. If no qualifying record exists, fall back to what the SAP specifies, often the DM-carried RFXSTDTC or a DS-recorded first-dose date. Follow the SAP rather than habit.
4. Partial dates (2026-01, 2026) get imputed the way the SAP says, with the imputation recorded in a flag variable. Never drop them silently.

```sas
/* Earliest qualifying exposure date per subject, Study XYZ */
proc sql;
  create table ex_first as
  select usubjid,
         min(input(exstdtc, yymmdd10.)) as trt01sdt format=date9.
  from sdtm.ex
  where exdose > 0 and length(exstdtc) = 10
  group by usubjid;
quit;
```

TRT01EDT mirrors this with the latest qualifying exposure date. Exposure dates arrive as ISO 8601 character strings, so parse defensively: a length check (10 for dates, 16 for datetimes) before INPUT prevents silent missing values. And some studies bound the last-dose window, for example doses counted only within a defined period after discontinuation. That boundary is a SAP question rather than a programmer judgment.

### TRT01P versus TRT01A

TRT01P, planned treatment, comes from randomization: the DS record carrying the randomization term, or DM ARM where the SAP accepts it. TRT01A, actual treatment, comes from what the subject received, usually via ACTARM or the exposure records. Different sources, deliberately.

When they disagree, the disagreement is data, not a bug. A subject randomized to A who received B belongs to the analysis as randomized for efficacy and as treated for safety, and keeping both variables is what makes that possible. Never rewrite TRT01A to match TRT01P. List the discrepancies for medical review and move on.

| Scenario | TRT01P | TRT01A | What the build does |
|---|---|---|---|
| Randomized to A, dosed with A | A | A | Nothing; the normal case |
| Randomized to A, first dose B | A | B | Keep both, list for medical review |
| Randomized, never dosed | A | Not exposed | ITT yes, safety no |
| Dosed without a randomization record | Not assigned | B | Data review; the SAP governs handling |

*Table 2: The common TRT01P/TRT01A discrepancy scenarios. All of them show up in real studies; none of them is a code fix.*

### Population flags

Every population flag needs three things to survive review: the SAP citation it implements, the derivation code, and a QC listing of subjects where the flag disagrees with its basis.

| Flag | Usual SAP basis | Typical source | QC listing that catches trouble |
|---|---|---|---|
| ITT01FL | Randomized into the study | DS randomization record / DM ARM | Randomized subjects missing the flag; flagged subjects with no randomization |
| SAFFL | Received at least one dose | EX with EXDOSE > 0, or RFXSTDTC non-missing | SAFFL = N subjects carrying a qualifying exposure record |
| COMP24FL | Completed through week 24 | DS disposition | COMP24FL = Y subjects with an earlier discontinuation date |

*Table 3: Population flags and their evidence chain. If a flag has no SAP citation behind it, raise a spec query before programming it.*

### Merge discipline

Most ADSL defects I have seen are merge defects. The discipline is short: aggregate before the merge, and verify the row count after every merge, not once at the end of the program.

SUPPQUAL datasets need a transpose first, plus one non-obvious step: IDVARVAL, the parent sequence number, is character, so convert it with INPUT before using it as a numeric BY variable.

```sas
/* SUPPQUAL to wide: numeric IDVARVAL before the sort, Study XYZ */
data supp_dm;
  set sdtm.suppdm;
  dmseq = input(idvarval, best.);
  keep usubjid dmseq qnam qval;
run;
proc transpose data=supp_dm out=t_suppdm(drop=_:);
  by usubjid dmseq;
  id qnam;
  var qval;
run;
```

Then the invariant check, cheap enough to run after every merge in the build:

```sas
/* One-row-per-subject check after each merge, Study XYZ */
proc sql;
  select "dm_plus_supp" as step, count(*) as rows,
         count(distinct usubjid) as subjects
  from dm_plus_supp
  union all
  select "adsl_final", count(*), count(distinct usubjid)
  from adsl_final;
quit;
```

Rows must equal subjects at every step. The moment they diverge, you know exactly which merge fanned out, which turns a mystery defect into a five-minute fix.

## The modern workflow

In a modern SCE the ADSL build is a pipeline step with a defined position: locked SDTM in, validated ADSL out, and every downstream ADaM dataset depending on it, so it builds first. The program runs from a single driver script under a pinned SAS version, logs are archived per run, and structural validation (CDISC CORE or a commercial engine) executes on every build rather than once before submission.

Two practices raise the output quality. First, spec-driven development: the ADaM spec, with variable-level metadata and derivation text, is the contract, and define.xml generates from the same metadata, so program, spec, and reviewer documentation cannot drift apart. Second, PR-based QC: the ADSL program, its independently written QC program, and the listing outputs (discrepancy listings included) attach to one pull request, so a reviewer sees each derivation next to its evidence.

The same derivations exist as admiral function calls in R, derive_vars_merged for the earliest-dose merge and flag functions for the populations, and the pharmaverse admiralpython package carries the pattern to Python shops. The intent reads more cleanly than stacked data-step merges, which is exactly what my fine-tuning experiments exploited: [fine-tuning a small LLM on admiral code](/blog/fine-tuning-small-llms-admiral-r.html) worked because one-variable-at-a-time derivations map onto a question-answer format a model can learn.

## The agentic way

An LLM drafting ADSL code produces plausible output fast: right variable names, a reasonable cascade, clean formatting. The failure mode is specific. When the exposure data has no qualifying record, the agent picks a fallback that looks right (earliest DS date, say) while the SAP specifies randomization date. The code reads well, the log is clean, and review passes unless someone checks the decision points.

So the verification habit: pick three random subjects, ask for the full derivation trace of their TRT01SDT, and hand-check against the SDTM records. An agent that invented a fallback fails exactly here. The accountability boundary does not move: the validation signature belongs to the programmer, not the tool, which is the core argument of [why LLM agents fail in regulated programming](/blog/why-llm-agents-fail-regulated-programming.html).

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents draft ADSL merges and cascades in minutes, but they invent SAP fallback rules and partial-date conventions that read plausibly; the failure mode is a clean log over an unsourced decision.</p>
  <p>Before trusting agent-drafted ADSL code, demand the derivation trace for three random subjects and the SAP citation behind every fallback step.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/adam-adsl-derivation/SKILL.md">
  <span class="skill-card-name">adam-adsl-derivation</span>
  <span class="skill-card-desc">Drop-in Claude skill carrying the ADSL derivation cascades, merge discipline, and QC checkpoints from this post, ready to run against your own spec.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- ADSL is one row per subject; assert the invariant after every merge, not once at the end.
- TRT01SDT is a cascade: qualifying EX records, earliest date, SAP-defined fallback, SAP-defined imputation for partial dates.
- TRT01P/TRT01A discrepancies are findings for medical review, never code fixes.
- Every population flag ships with a SAP citation, its derivation, and a QC listing of disagreements.
- SUPPQUAL transposes require a numeric INPUT on IDVARVAL before the BY sort.

## FAQ

### What if a subject has no qualifying exposure record?

TRT01SDT stays missing unless the SAP defines a fallback, and the subject is SAFFL = N while typically remaining in the ITT population. The subject lands on a QC listing (missing TRT01SDT despite exposure records present, or dosing that precedes consent) so data management can resolve the underlying record.

### Why do TRT01P and TRT01A differ for the same subject?

TRT01P records what randomization assigned; TRT01A records what the subject actually received. They differ after crossover, a dispensing error, or immediate discontinuation. Both are correct. The discrepancy is analytically meaningful and gets documented, not repaired.

### Where do SUPPQUAL values go in ADSL?

Transpose the supplemental qualifiers wide, one column per QNAM, after converting IDVARVAL to numeric, then merge by subject and parent sequence. The transposed values become ordinary ADSL variables under the same spec and QC as everything else.

### How do I prove ADSL kept one row per subject?

Count rows and distinct USUBJIDs after every merge and assert equality. Any source carrying multiple records per subject must be aggregated (earliest, latest, flag) before it merges. The running check catches the one you missed at the step where it happened.

---

That closes the ADSL walkthrough. Next in the bootcamp: [Part 3, programming TLFs from shell to RTF](/blog/tlf-shell-to-rtf-tutorial.html). If you arrived from [Part 1, the SCE guide](/blog/sce-statistical-computing-environment-guide.html), the ADaM line continues later with BDS structure in ADLB and ADVS, OCCDS and ADAE, and ADTTE. The [series roadmap](/blog/clinical-sp-bootcamp-roadmap.html) tracks everything published.

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/adsl-derivation-tutorial-trtstdt.html
