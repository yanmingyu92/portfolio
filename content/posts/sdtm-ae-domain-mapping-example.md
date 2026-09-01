---
title: "SDTM AE Domain Mapping: A Worked Example from Raw EDC Data"
date: 2026-09-01
description: "A worked SDTM AE domain mapping example: MedDRA coding, serious flags, partial ISO dates, AESEQ derivation, SUPPAE, and CORE validation triage from a mock raw extract."
tags: ["clinical-sas", "sdtm", "adverse-events", "meddra"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 5
canonicalPath: /blog/sdtm-ae-domain-mapping-example.html

---

The AE extract for Study XYZ arrives on a Tuesday. Four subjects, eleven columns, three different date formats, a severity column that mixes "Grade 1 (Mild)" with "MODERATE", and a relatedness column full of free text like "possible". Nothing about it is unusual — this is what adverse event data looks like before anyone maps it. The distance between this table and a clean, submission-grade AE domain is about forty decisions, and every one of them belongs in the mapping spec before it belongs in code.

> **TL;DR** — A complete AE mapping walkthrough from a mock raw extract: AETERM and MedDRA coding with a pinned version, AESEV and AESER under controlled terminology, the six seriousness criteria, partial dates kept as ISO strings, deterministic AESEQ, SUPPAE routing, and CDISC CORE validation with rule-level triage.

## The fundamentals

### Start from the raw table

Here is the mock raw extract. Read it the way a mapper reads it: which columns move directly, which need a decision table, which need a data query.

| SUBJID | ROWID | AETERM_RAW | AESTDAT_RAW | AEENDAT_RAW | AESEV_RAW | AESER_RAW | AESHOSP | AEREL_RAW | AEOUT_RAW | MDRPT |
|---|---|---|---|---|---|---|---|---|---|---|
| 001 | 3 | Nausea and vomiting | 2023-03-04 | 2023-03-09 | Grade 1 (Mild) | No | N | possible | Recovered/Resolved | Nausea |
| 002 | 7 | pneumonia | 2023-02 | 2023-03-08 | Grade 3 (Severe) | Yes | Y | unlikely related | Not Recovered/Not Resolved (Continuing) | Pneumonia |
| 003 | 1 | head ache | 2023-01-20 | UNK | MODERATE | N | N | POSSIBLY RELATED | Recovering/Resolving | Headache |
| 004 | 12 | COVID-19 | UNK | . | . | . | . | . | . | . |

*Table 1: Mock raw AE extract for Study XYZ. Partial dates for 002, unknown dates for 003 and 004, mixed severity scales, free-text relatedness, and one row (004) with coding still pending.*

### Identifiers and the topic

The identifiers are assignments, not mappings: `STUDYID = "XYZ-001"`, `DOMAIN = "AE"`, and `USUBJID` built from the same single point every other domain uses: `cats("XYZ-001-", subjid)`.

`AETERM` takes the verbatim string, stripped. "head ache" stays "head ache"; normalization happens downstream in `AEDECOD`, never by rewriting the verbatim term. If you "clean" AETERM, the reviewer can no longer reconcile the submission against the CRF, and the coding file joins break.

```sas
data ae_map;
  set raw.ae;
  studyid = "XYZ-001";
  domain  = "AE";
  usubjid = cats("XYZ-001-", subjid);
  aeterm  = strip(aeterm_raw);
  aestdtc = strip(aestdat_raw);
  if aestdtc in ("UNK", "UNKNOWN") then call missing(aestdtc);
  if aeongo_raw = "Y" then aeenrf = "ONGOING";
run;
```

The `UNK` branch is deliberate: an unknown date is stored as missing in SDTM and raised as a data query; it is never dropped silently and never invented.

### MedDRA coding, pinned to a version

`AEDECOD` is the MedDRA preferred term, and it comes from the coding deliverable joined onto the raw extract (`MDRPT` here), never from memory or a lookup someone pasted into a program. Alongside it ride the hierarchy variables: `AELLT` (lowest level term), `AEHLT`, `AEHLGT`, and `AEBODSYS`/`AESOC` for the primary system organ class, each with its numeric code variable.

Version pinning is the discipline that makes the hierarchy trustworthy. One MedDRA version per data cut, declared in define-XML. When the coding vendor recodes under a new version mid-study without a controlled recode process, terms migrate between system organ classes and every AE summary built on the previous version quietly changes shape. That defect is called MedDRA drift, and it appears again in the defects table below.

Subject 004's coding is pending. `AEDECOD` stays blank, the row ships, and the gap is tracked with an open query ID. Filling it with a plausible guessed term is a submission defect dressed up as helpfulness.

### Severity, seriousness, and the six criteria

`AESEV` is controlled terminology (`MILD`, `MODERATE`, `SEVERE`), so the two raw scales collapse through decision rows in the spec: "Grade 1 (Mild)" → `MILD`, "Grade 3 (Severe)" → `SEVERE`, bare "MODERATE" → `MODERATE`. The blank for subject 004 stays blank and joins the query.

`AESER` maps to `Y`/`N`. The six seriousness criteria (`AESDTH`, `AESLIFE`, `AESHOSP`, `AESDISAB`, `AESCONG`, `AESMIE`) each get `Y` only when the CRF box was checked, and stay blank otherwise. Do not default them to `N`: a blank criterion and a denied criterion are different clinical statements.

One consistency check belongs in your QC list: every record with `AESER = "Y"` should carry at least one criterion flag of `Y`. A serious event with no seriousness criterion is a reviewer question, and usually it means the EDC form let a field through that should have driven a query.

### Relatedness under controlled terminology

`AEREL` draws from an extensible codelist: values such as `RELATED`, `POSSIBLY RELATED`, `NOT RELATED`. The raw column holds free text: "possible", "unlikely related", "POSSIBLY RELATED". Each distinct raw value gets a decision row in the spec mapping it to the study's CT value, and the collected verbatim is preserved in SUPPAE with `QNAM = "AERELVER"`. Free text in `AEREL` itself is one of the most common AE defects; CORE's codelist membership rules flag every instance.

### Dates as ISO strings, partials included

`AESTDTC` and `AEENDTC` are character ISO 8601, exactly as collected. Subject 002's onset "2023-02" ships as `2023-02`; a month-precision date is valid and common. Subject 003's unknown end date ships as missing with a query. The one unforgivable move is completing a partial to make a join or a sort behave: `2023-02` becoming `2023-02-01` changes clinical meaning and belongs nowhere in SDTM. Imputation, when the SAP calls for it, happens in ADaM and is documented there.

### AESEQ, derived deterministically

`AESEQ` numbers records within subject, and it must be reproducible: same raw in, same sequence out. Derive it from a deterministic sort: never reuse EDC row numbers like `ROWID`, which reshuffle every time data management re-extracts.

```sas
proc sort data=ae_map out=ae_srt;
  by studyid usubjid aedecod aestdtc aeterm;
run;

data ae;
  set ae_srt;
  by studyid usubjid;
  if first.usubjid then aeseq = 1;
  else aeseq + 1;
run;
```

The determinism matters beyond tidiness. SUPPAE rows link back through `IDVAR = "AESEQ"`, so any re-run that reshuffles sequence numbers silently orphans the supplemental qualifiers attached to those records.

### What goes to SUPPAE

Two things from this extract, by the standard rule that collected values with no IG home go vertical:

- Verbatim relatedness: `QNAM = "AERELVER"`, `QLABEL = "Causality, Verbatim"`, one row per AE with free-text relatedness.
- The local toxicity grade string ("Grade 1 (Mild)"): `QNAM = "AETOXLOC"`, retained because the study's safety review uses the raw scale.

Each row carries `RDOMAIN = "AE"`, `USUBJID`, `IDVAR = "AESEQ"`, `IDVARVAL`, `QVAL`, `QORIG = "CRF"`, `QEVAL = "INVESTIGATOR"`.

### Validate with CORE, then triage by rule ID

After the build, run [CDISC CORE](/blog/cdisc-core-validation-explained.html) against the domain (free, open source, every rule a public YAML file, output a JSON or Excel report with one row per finding). Triage grouped by rule ID, and record a disposition for every finding: fixed, or waived with a written reason. A typical first-run page for this extract:

| Finding area | Affected records | Disposition |
|---|---|---|
| Codelist membership, `AESEV` | Subject 004, blank severity | Fixed: decision table extended; blank retained, query Q-214 opened |
| Codelist membership, `AEREL` | Subject 001 ("possible") | Fixed: mapped to `POSSIBLY RELATED`; verbatim moved to SUPPAE |
| Required variable missing, `AEDECOD` | Subject 004 | Waived with reason: coding deliverable pending, tracked as query Q-215 |

*Table 2: Validation triage with dispositions. The waived finding ships with its justification, not behind it.*

Know the boundary too. A clean CORE run covers exactly what the rules express. Cross-domain contradictions (an AE ending after the death date in DM, the same event recorded in both AE and MH) are invisible to single-domain rule engines and need eyeball QC listings, or graph-based constraints on top of the rules; the boundary is walked through in [The Contradictions Your Validator Can't See](/blog/graph-constrained-validation-cdisc-oncology.html).

### The recurring defects, in one table

| Defect | Symptom in the data | Fix discipline |
|---|---|---|
| Serious flags from a non-CT source | `AESER` holding "Yes", "1", "N/A" | Decision table to `Y`/`N`; never take the first character on faith |
| Free-text relatedness | `AEREL` holding "possible", "unlikely related" | Map to CT via spec decision rows; verbatim to SUPPAE |
| MedDRA drift | Same event, different `AEDECOD` across data cuts | Pin one version per cut; controlled recode only, with define-XML updated |
| Silent partial-date completion | `AESTDTC` "2023-02" shipped as "2023-02-01" | Keep the collected string; imputation is ADaM territory |
| EDC row numbers as `AESEQ` | Sequence changes between extracts | Deterministic sort-and-count derivation, always |

*Table 3: The five AE defects that account for most validation findings on a first build.*

## The modern workflow

**Validation in CI, per data drop.** CORE runs against every rebuilt domain, and the triage table above lives as a versioned log next to the code, reviewer-accessible and diff-able between cuts. The economics of free, scriptable validation are covered in [CDISC CORE Explained](/blog/cdisc-core-validation-explained.html); the operational change is that validation becomes a build step, not an event.

**Coding deliverables are dated artifacts.** The MedDRA-coded extract lands in the study repository with a version tag, and define-XML carries the dictionary version. A cut whose data and metadata disagree becomes mechanically detectable instead of discoverable during review.

**The spec rules online.** Decision rows live in the shared mapping specification (the [sdtm-mapping-conventions](/skills/sdtm-mapping-conventions/SKILL.md) skill distills this discipline into a drop-in checklist), and the AE program reads as a direct transcription of those rows.

**Engines differ; the mapping does not.** SAS, R, and Python can all produce the identical XPT from the same decisions. Deterministic `AESEQ` is what makes byte-comparable outputs across engines possible at all, which is why it is a convention rather than a suggestion.

## The agentic way

Agents draft AE mapping code well, because the domain is among the most documented in the field, but two failure modes recur. First, invented coding: asked to "fill in the missing AEDECOD", a model produces a fluent MedDRA term that is not in your coding deliverable, and it will sound right. Second, date coercion: partials get completed because complete dates make cleaner data steps. The rules that hold: `AEDECOD` is only ever a join from the actual coding deliverable, and every `--DTC` string equals the collected string byte for byte.

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents draft a full AE mapping in minutes from spec plus raw extract; the failure mode is helpful invention of MedDRA terms and quiet completion of partial dates. Accept coded terms only when joined from the real coding file, and diff every date string against collection.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

## Key takeaways

- Map the verbatim (`AETERM`) untouched; standardization lives in `AEDECOD` from a version-pinned MedDRA coding deliverable, never from memory or a model's guess.
- `AESER` maps to `Y`/`N` through a decision table; the six seriousness criteria get `Y` when checked and stay blank otherwise, never defaulted.
- `--DTC` variables carry collected ISO 8601 strings including partials; completing a partial date in SDTM changes clinical meaning.
- `AESEQ` comes from a deterministic sort (study, subject, coded term, start date, verbatim), because SUPPAE links depend on it being reproducible.
- Run CORE after every build, triage by rule ID, and record a disposition for each finding; cross-domain contradictions still need human QC listings.

## FAQ

### Should AETERM be uppercase or title case?

Neither: it should be exactly as collected, stripped of leading and trailing blanks. `AETERM` is the verbatim term that reconciles against the CRF and the coding file; `AEDECOD` is where standardization happens.

### What if AESER is Yes but no seriousness criterion is checked?

Ship what was collected, and raise a data query. The pair is internally inconsistent, reviewers look for it, and resolving it by programming one side or the other falsifies the record.

### Can AEDECOD be blank when coding is pending?

Yes, temporarily. Ship the row with `AETERM` populated, keep `AEDECOD` missing, and track the gap with an open query. Never fill it with a guessed term to satisfy a validator.

### Why can't I store AESTDTC as a numeric SAS date?

Because of partial dates. `2023-02` has month precision, and a numeric date forces day-level fiction. SDTM keeps `--DTC` as character ISO 8601 precisely so collected precision survives; numeric dates with imputation rules come later, in ADaM.

### When does an event belong in MH instead of AE?

Medical history is a condition present at or before informed consent or first dose; adverse events arise after exposure starts. Borderline records need a data query and a documented decision in the spec; the boundary is clinical, and programming cannot resolve it by date logic alone.

---

Previous in the series: [SDTM domain basics](/blog/sdtm-tutorial-domain-basics.html). Next: [How to write an SDTM mapping specification](/blog/sdtm-mapping-spec-walkthrough.html). For the validation engine behind the triage table (public YAML rules, free execution, and its structural limits), read [CDISC CORE Explained](/blog/cdisc-core-validation-explained.html).
