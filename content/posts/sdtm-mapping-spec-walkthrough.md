---
title: "How to Write an SDTM Mapping Specification (Walkthrough)"
date: 2026-08-30
description: "How to write an SDTM mapping specification: column anatomy, a row-by-row VS domain walk, hygiene rules, and how specs become define-XML and machine-usable code."
tags: ["clinical-sas", "sdtm", "mapping-specification", "define-xml"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 6
canonicalPath: /blog/sdtm-mapping-spec-walkthrough.html
draft: true
---

Mid-inspection, a reviewer points at one value in VS: systolic blood pressure 142, subject 004, week 8. One question follows — where did this come from? The program answers *how* it was computed; only the specification answers *why it was computed that way*, and who approved it. Studies that survive that question calmly all have the same artifact: a mapping spec where every SDTM variable traces to a source, a transformation, and a decision owner. Studies that struggle have code, and opinions.

> **TL;DR** — The mapping specification is the contract between data management, programming, and inspection. This post covers its column anatomy, a complete row-by-row VS domain spec, hygiene rules that keep it defensible, and how the same rows become define-XML and machine-usable input for modern tooling.

## The fundamentals

### The spec is a contract with three parties

Three groups read the mapping specification, for different reasons: data management, to know what was assumed about collection and whether queries are needed; programmers, to know exactly what to build; reviewers and inspectors, to trace any submitted value back to a source. The spec exists so those three readings never conflict.

That is also the enforcement rule, stated bluntly: every mapped variable traces to a spec row. Code that produces a variable no spec row names is a finding, during internal QC or during inspection, whichever comes first.

### Column anatomy

A mapping spec row answers five things about one target variable:

| Column | Content | Example |
|---|---|---|
| Target | Domain.variable being produced | `VS.VSSTRESN` |
| Source | Raw dataset.variable (or "assigned") | `RAW.VS.RESULT` |
| Transformation | The formula, stated as a formula | `if TEMP and units=F: (input − 32) × 5/9` |
| CT / Origin | Codelist binding; CRF, derived, or assigned | `UNIT`; Origin = Derived |
| Notes / Query | Open questions, decision owner, dates | `Q-117 pending DM response` |

*Table 1: The five columns that make a spec row auditable. Drop any one of them and the row stops being a contract.*

The origin values matter more than they look: they flow straight into define-XML, where reviewers and validation engines check that CRF-origin values match the annotated CRF and derived values carry a method.

### A full domain, row by row

Here is a complete VS specification for Study XYZ, the entire domain in fourteen rows. Synthetic, but the shape is exactly what a real spec sheet holds.

| # | Target | Source | Transformation | CT / Origin | Notes / Query |
|---|---|---|---|---|---|
| 1 | `VS.STUDYID` | — | `"XYZ-001"` | Assigned | Constant |
| 2 | `VS.DOMAIN` | — | `"VS"` | Assigned | Constant |
| 3 | `VS.USUBJID` | `DM.USUBJID` | Join by `SUBJID` | Derived | Reuse DM-built value verbatim |
| 4 | `VS.VSSEQ` | All VS keys | Count within `USUBJID` after sort by `VSTESTCD, VSDTC, VSPOS` | Derived | Deterministic sort |
| 5 | `VS.VSTESTCD` | `RAW.VS.TESTCD_DEC` | `upcase(strip())` | VSTESTCD codelist; CRF | — |
| 6 | `VS.VSTEST` | `RAW.VS.TEST_DEC` | `upcase(strip())` | — ; CRF | — |
| 7 | `VS.VSORRES` | `RAW.VS.RESULT` | `strip()`, as collected | — ; CRF | Never rounded |
| 8 | `VS.VSORRESU` | `RAW.VS.UNIT_DEC` | `upcase(strip())` | UNIT; CRF | — |
| 9 | `VS.VSSTRESN` | `RAW.VS.RESULT`, `UNIT_DEC` | If `TEMP` and unit `F`: `(input − 32) × 5/9`; else `input(result)` | — ; Derived | Value-level rule per test |
| 10 | `VS.VSSTRESU` | `RAW.VS.UNIT_DEC` | `"C"` when converted; else `VSORRESU` | UNIT; Derived | Pairs with row 9 |
| 11 | `VS.VSSTAT` | `RAW.VS.NOTDONE` | `"NOT DONE"` when checked | — ; CRF | Reason text → SUPPVS |
| 12 | `VS.VSPOS` | `RAW.VS.POS_DEC` | `upcase(strip())` | POSITION; CRF | `Q-117`: collected "Supine" — confirm CT value |
| 13 | `VS.VSDTC` | `RAW.VS.VSDAT` | ISO 8601 string as collected | — ; CRF | Partials retained |
| 14 | `VS.VSDY` | `VSDTC`, `DM.RFSTDTC` | `if date >= ref then date − ref + 1; else date − ref` | Derived | No day 0, per IG |

*Table 2: The complete VS mapping specification. Fourteen rows, fourteen decisions, zero prose paragraphs.*

Read the interesting rows closely. Row 9 carries a transformation that differs by test, which is why one row per variable matters, and why define-XML has value-level metadata for exactly this case. Row 12 carries an open query: the collected "Supine" may or may not be the CT submission value, and until Q-117 closes, the row is unfinished and visibly so. Row 14 encodes the study-day convention (no day zero, pre-treatment days negative) as a formula rather than a description.

### Spec hygiene rules

Five rules keep a spec defensible:

1. **One row per target variable.** "VSORRES/VSSTRESN" packed into one row hides that the two variables have different sources and different rules.
2. **Transformations as formulas, not prose.** "Standardize units" is a wish; `(x − 32) × 5/9` is a specification. If a second programmer can't transcribe the row into code without asking a question, the row isn't done.
3. **Unresolved rows carry an open query ID.** A blank transformation is acceptable while Q-117 is open; a guessed transformation never is.
4. **Constants get rows too.** Rows 1 and 2 look trivial, and they are, and that is the point. Assigned variables appear in define-XML with an assigned origin, and the spec is where that is decided.
5. **Every revision dated and owned.** The spec is a versioned document; "someone changed the temperature rule in March" must be answerable from the file itself.

### From rows to code

A hygiene-compliant spec transcribes almost mechanically. Rows 7 through 10 of the table above become:

```sas
data vs;
  set raw.vs;
  vstestcd = upcase(strip(testcd_dec));
  vsorres  = strip(result);
  vsorresu = upcase(strip(unit_dec));
  if vstestcd = "TEMP" and vsorresu = "F" then do;
    vsstresn = (input(vsorres, best.) - 32) * 5 / 9;
    vsstresu = "C";
  end;
  else do;
    vsstresn = input(vsorres, ?? best.);
    vsstresu = vsorresu;
  end;
run;
```

Notice what the code does not contain: judgment. Every branch above exists because a spec row says it does. When the Q-117 answer arrives, the fix lands in one spec row first, then in one program line, and the two changes review together.

### How the spec becomes define-XML

The columns map across almost one-to-one: the origin column becomes the define-XML origin attribute (CRF, Derived, Assigned); the CT column becomes a codelist reference binding the variable to a published list; value-level transformations like row 9 become computational methods attached through value-level metadata. Because the mapping is mechanical, define-XML should be *generated* from the spec, never hand-typed; generation makes disagreement between the two structurally impossible. Validation engines then check define-XML conformance itself; [CDISC CORE](/blog/cdisc-core-validation-explained.html) ships a define-XML rule set alongside its dataset rules.

## The modern workflow

**Spec-as-data.** The specification lives as structured, machine-readable sheets (per-domain CSV or YAML) under version control, not as an Excel file attached to emails. A mapping change is a pull-request diff a data manager and a programmer can review line by line. Define-XML generates from the same source, and the spec, code, and define-XML stay in lockstep because two of the three are produced from the first.

**Spec-first QC.** When the QC programmer validates against the spec rather than against a reading of the production program, the independence that double programming exists to provide gets cheaper: the question becomes "does the output satisfy the contract" rather than "does a second program agree". Where that justifies trimming duplicated effort, I walked through the reasoning in [Double Programming Without the Duplication](/blog/eliminating-qc-programming-duplication.html).

**Contracts beyond SDTM.** The same spec-as-contract pattern now runs ahead of TLF production: shell libraries as structured, machine-readable artifacts that generation and retrieval tools read directly. How well retrieval over such libraries actually works was the subject of my [RAG benchmark over clinical TLF templates](/blog/benchmarking-rag-clinical-tlf-templates.html).

**CI closes the loop.** A spec change rebuilds the affected domains, regenerates define-XML, and re-runs validation. Spec–code–metadata drift stops being a discovery during QC and becomes a failing build.

## The agentic way

Agents transcribe spec rows into code accurately when the rows are formulas; that is a mechanical task and they are good at it. The failure mode is what happens around the edges: an agent "fixes" a program without the spec row moving, or fills a blank transformation row with a plausible rule of its own, and the contract silently drifts from the code that supposedly implements it. The defense is to make drift mechanical too: derive the expected variable list from the spec (or the generated define-XML) in CI and diff it against the produced datasets. Drift then fails the build instead of surprising a reviewer.

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents turn formula-grade spec rows into code in one pass; the failure mode is drift and gap-filling, where code or spec edits without the other following. Keep the spec authoritative and let a CI diff between spec variables and produced variables catch every divergence.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

## Key takeaways

- The mapping spec is a three-party contract (data management, programming, inspection), and every mapped variable must trace to a spec row.
- State transformations as formulas, not prose; a row a second programmer can't transcribe without asking a question isn't finished.
- Unresolved rows carry open query IDs visibly; guessed rules are worse than blank rows.
- Define-XML should be generated from the spec, never hand-typed, which makes spec–metadata disagreement structurally impossible.
- In agent-era tooling the spec stays authoritative and a CI diff between spec variables and produced datasets is what catches drift.

## FAQ

### Who owns the mapping specification?

Usually the statistical programming lead, with data management co-signing rows that touch collection or query decisions. Ownership matters less than the rule that no row changes without a name and a date attached to the change.

### Should the spec be Excel, CSV, or YAML?

Any structured format that diffs cleanly under version control works. Excel is common but painful to diff; per-domain CSV or YAML sheets give reviewers line-level changes in pull requests, which is the property that matters.

### When is a spec row "done"?

When target, source, transformation, CT/origin, and notes are all populated, no open query hangs on the row, and a second programmer can transcribe it into code without asking a question. Until then it is visibly unfinished, which is fine as long as it is visible.

### How does the spec relate to define-XML?

The spec's origin, codelist, and transformation columns generate define-XML's origin attributes, codelist references, and computational methods. Define-XML is the machine-readable projection of the spec for reviewers and validation engines, produced from it, never written separately.

### Can the spec change after programming starts?

Yes, constantly: data queries close, CT decisions land. The discipline is that the spec changes first, the program follows, and both changes land in the same reviewed commit so no revision of code ever exists without its matching spec revision.

---

Previous in the series: [SDTM AE domain mapping](/blog/sdtm-ae-domain-mapping-example.html). Next in the series: [ADaM BDS structure with ADLB and ADVS](/blog/adam-bds-adlb-advs-tutorial.html). For the engine that validates what the spec produces, and the define-XML rule set that checks the metadata side, read [CDISC CORE Explained](/blog/cdisc-core-validation-explained.html).
