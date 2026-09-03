# SDTM Domain Basics: The Model Every Clinical Programmer Must Know

<!-- Wechatsync target: Juejin. Canonical: https://jaimeyan.com/blog/sdtm-tutorial-domain-basics.html -->

Day one on Study XYZ: someone hands you a raw EDC export, forty-plus datasets with columns like `CMED_DOSE_TXT2`, and the SDTM Implementation Guide, several hundred pages of it. Your job is to turn the first into something a reviewer who has never seen your CRF can read. Nothing in the raw export hints at the target shape; the model does. Once you know its grammar, each raw dataset becomes a predictable table: one row per observation, standard variables, and a single identifier gluing every table together.

> **TL;DR** — This post explains SDTM domains from zero: the domain classes, the topic–timing–qualifier variable pattern every domain repeats, USUBJID composition, controlled terminology, SUPPQUAL mechanics, and how the SDTMIG relates to define-XML. You leave with a day-one reading order for a new study and a first minimal domain build in SAS.

## The fundamentals

### One row per observation, data as collected

SDTM, the Study Data Tabulation Model, answers one question: how do we hand over study data so a reviewer with no access to your CRF or your programs can find every value and trace it back to collection? The answer is a fixed table grammar. A domain is one table holding one kind of observation: adverse events are rows in AE, medications in CM, blood pressure readings in VS.

Two rules do most of the work:

1. **One row per observation per subject.** A subject reporting three separate events generates three AE rows.
2. **Data as collected.** No imputation and no analysis logic. If the site recorded a start date as "2023-05", the string `2023-05` is what ships. Derived, analysis-ready values live one step downstream in ADaM, the subject of [Part 2 of this series](/blog/adsl-derivation-tutorial-trtstdt.html).

Domain names are two-letter codes that become vocabulary fast: DM demographics, AE adverse events, CM concomitant medications, LB labs, VS vital signs, EX exposure, DS disposition, SV visits.

### The domain classes

The Implementation Guide sorts domains into three general classes, and the class predicts the variables.

| Class | Question it answers | Example domains | Topic variable |
|---|---|---|---|
| Interventions | What was administered to the subject? | CM, EX, PR, SU | `--TRT` |
| Events | What happened to the subject? | AE, MH, DS | `--TERM` |
| Findings | What was measured or observed? | LB, VS, EG, PE | `--TESTCD` |
| Special purpose | One row per subject or per visit | DM, SV | varies |
| Trial design | The protocol as data, no subjects | TA, TI, TV, TS | varies |

*Table 1: SDTM domain classes. Identify the class and you can predict most of the variable list before opening the chapter.*

DM carries exactly one row per subject: demographics plus the reference dates (`RFSTDTC`, `RFENDTC`) that anchor every study-day calculation. SV records which visits actually happened and when. DS and EX feel structural too, but they are classed as Events and Interventions. The trial design domains (TA arms, TI criteria, TV planned visits, TS study metadata) are built from the protocol and contain no subject data.

### Topic, timing, qualifier: the variable pattern

Every domain repeats the same skeleton, and learning it once makes every domain chapter read faster.

| Role | AE examples | What it does |
|---|---|---|
| Identifiers | `STUDYID`, `USUBJID`, `AESEQ` | The same three in every domain; `--SEQ` numbers records within a subject |
| Topic | `AETERM` | The thing itself, verbatim as reported |
| Timing | `AESTDTC`, `AEENDTC`, `AESTDY` | ISO 8601 strings; `--DY` relative to `RFSTDTC` |
| Result qualifiers | `AESEV`, `AESER`, `AEOUT`, `AEREL` | Describe the observation |
| Standardized topic | `AEDECOD` | Dictionary-derived version of the topic, e.g. the MedDRA preferred term |

*Table 2: The variable pattern, shown with AE. Swap the prefix and the same skeleton fits CM, MH, or VS.*

The pattern generalizes across domains: `CMTRT` and `CMDECOD` in CM, `MHTERM` and `MHDECOD` in MH, `LBTESTCD` as the findings topic in LB. `--DTC` variables are always character ISO 8601: `2023-04-02` fully collected, `2023-04` when the day was never captured. `--DY` counts from the reference start date: day 1 on or after treatment, negative down to −1 before it, and no day zero.

### USUBJID: built once, used everywhere

`USUBJID` is the join key for the entire submission, and `STUDYID` + `-` + `SUBJID` is the near-universal recipe. Build it in one place, one program, and let every domain reuse the identical string.

I once traced a study where DM carried `XYZ-001-004` and AE carried `XYZ-001-004 `, one trailing blank, because two programs had each built the identifier. Downstream subject counts quietly stopped adding up, and the hunt took days because both values looked right on screen.

### Controlled terminology and the CT package

Most qualifier values must come from published CDISC codelists. SEX is drawn from a short list (`M`, `F`, `U`, `UNDIFFERENTIATED`), AE severity is `MILD`/`MODERATE`/`SEVERE`, yes/no flags are `Y`/`N`. The codelists ship as dated CT packages tied to the IG version; the study locks one at the specification stage. Some codelists are extensible (sponsors may add study-specific values), but additions must be declared in define-XML, never left for a reviewer to discover.

The mapping consequence is simple: raw collected values ("Male", "Grade 1 (Mild)", a checked box) are never moved into SDTM as-is. Every CT-bound variable gets decision rows in the mapping spec: collected value → submission value. No decision row, no mapping.

### SUPPQUAL: the pressure valve

Real CRFs collect things the IG has no variable for. Those values go to a supplemental qualifier dataset (`SUPPAE`, `SUPPCM`, `SUPPVS`), which is vertical: one row per stored value instead of one extra column.

| SUPP-- variable | Content |
|---|---|
| `RDOMAIN`, `USUBJID` | Which domain and subject the value belongs to |
| `IDVAR`, `IDVARVAL` | The parent record's key variable and its value, usually `--SEQ` |
| `QNAM`, `QLABEL` | Short name (8 characters max) and a label for the stored value |
| `QVAL`, `QORIG`, `QEVAL` | The value itself, its origin, and who evaluated it |

*Table 3: SUPP-- structure. The link back to the parent record runs through `--SEQ`, which is one reason `--SEQ` must be derived deterministically.*

Example: the CRF asks "reason medication started (other, specify)" as free text. No IG variable exists for it. Each response becomes one SUPPCM row with `QNAM = "CMREASO"`, linked to its CM record through `IDVAR = "CMSEQ"` and the sequence number in `IDVARVAL`.

### SDTMIG and define-XML

The SDTMIG is the human-readable rulebook: per-domain chapters, required/expected/permissible variables, and each domain's assumptions. Define-XML is the machine-readable description of your actual datasets: variables, origins (CRF, derived, assigned), codelist bindings, and computational methods. The IG says what CM should look like in general; define-XML says what your CM looks like in particular. A reviewer reads the second alongside the data, and so does a validation engine, which is where [CDISC CORE](/blog/cdisc-core-validation-explained.html) enters the workflow.

### Your first-day reading order

| Order | Read | What you extract |
|---|---|---|
| 1 | Protocol synopsis and schedule of activities | Arms, visits, objectives, endpoints |
| 2 | Annotated CRF | Which page collects what; annotations name the target domains |
| 3 | SDTMIG chapter for each domain | Required versus expected versus permissible variables, assumptions |
| 4 | Study mapping specification | Every study-specific decision layered on top of the IG |

*Table 4: A reading order that keeps you from mapping into the wrong shape before you start.*

### A first build: four rows of CM

Here is a mock raw concomitant-medication extract for Study XYZ:

| SUBJID | CMTRT_RAW | CMDECOD_X | CMSTDTC_RAW | CMONGO | CMDOSE | CMDOSU |
|---|---|---|---|---|---|---|
| 001 | aspirin 81mg tab | ASPIRIN | 2023-04-02 | N | 81 | mg |
| 002 | Tylenol | ACETAMINOPHEN | 2023-05 | Y | 500 | mg |
| 003 | metFORMIN hcl | METFORMIN | . | Y | . | mg |

*Table 5: Mock raw CM extract, obviously synthetic. Note the partial date for 002 and the unstandardized verbatim terms.*

Ten lines of SAS turn it into a recognizable CM:

```sas
data cm;
  length studyid $8 domain $2 usubjid $40 cmtrt $200;
  set raw.conmeds;
  studyid = "XYZ-001";
  domain  = "CM";
  usubjid = cats(studyid, "-", subjid);
  cmtrt   = strip(cmtrt_raw);
  cmdecod = strip(cmdecod_x);
  cmcat   = "PRIOR AND/OR CONCOMITANT MEDICATION";
  cmstdtc = strip(cmstdtc_raw);
  if cmongo = "Y" then cmenrf = "ONGOING";
run;
```

The conventions are all visible in nine statements: identifiers assigned once, the verbatim term preserved exactly as collected, the standardized term taken from the coding column, and the collected date string passed through untouched: `2023-05` stays `2023-05`. Had the raw date arrived as a numeric SAS date, the pass-through would become `put(cmstdt, yymmdd10.)`, and nothing else would change.

The partial date for subject 002 and the missing dose for 003 are data queries, not programming problems.

## The modern workflow

Two shifts separate a current SDTM shop from its 2015 version.

**The spec is data.** The mapping specification lives as a structured, versioned file (per-domain sheets with source, target, transformation, and CT columns), not as a spreadsheet attachment in an email thread. Define-XML is generated from that same metadata, so a mapping change becomes a pull-request diff and the spec, the code, and define-XML cannot silently disagree. [Part 6](/blog/sdtm-mapping-spec-walkthrough.html) of this series is entirely about that document.

**Validation runs on every build, not at submission time.** CDISC CORE (free, open source, with every rule a public YAML file you can read) runs against each domain build in CI. Findings arrive as JSON or Excel rows carrying rule ID, domain, message, and affected records; you triage by rule ID and record a disposition per finding, fixed or waived with reason. The mechanics are covered in [CDISC CORE Explained](/blog/cdisc-core-validation-explained.html); the habit is simply "no domain merge without a validation run."

## The agentic way

An agent with the mapping spec and a raw extract drafts a first-pass domain program in minutes. That speed creates a specific trap: fluent invention. Models trained on public SDTMIG text will add a plausible variable nobody specified, complete a partial date to make rows joinable, and guess a CT value one codelist version stale. The defense is narrow and effective: every variable in the produced dataset must trace to a spec row, and every `--DTC` string must equal the collected string byte for byte; anything else is a finding, regardless of who or what wrote the program.

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents draft whole domain programs from a spec plus raw samples in minutes; the failure mode is fluent invention of unspecified variables, quiet completion of partial dates, and near-miss CT values. Accept a mapped variable only when a spec row names it.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/sdtm-mapping-conventions/SKILL.md">
  <span class="skill-card-name">sdtm-mapping-conventions</span>
  <span class="skill-card-desc">Distilled conventions for SDTM mapping from raw and EDC data — spec discipline, CT enforcement, date handling, SUPPQUAL, and key-variable rules for DM, AE, CM, LB, VS.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- SDTM domains are one-row-per-observation tables grouped into Interventions, Events, and Findings, plus special-purpose and trial-design tables.
- Every domain repeats the same grammar (identifiers, a topic variable, ISO 8601 timing, qualifiers), and `USUBJID`, the `STUDYID`-`SUBJID` composite, is built once and reused verbatim in all of them.
- Collected values without an IG home go vertical into SUPP--, keyed by `QNAM` (8 characters max) and linked back through `--SEQ`.
- Read a new study in order (protocol, annotated CRF, SDTMIG chapter, mapping spec), because the spec layer holds every study-specific decision.

## FAQ

### What are SDTM domains in simple terms?

A domain is one table holding one kind of observation, named by a two-letter code: AE for adverse events, CM for medications, LB for lab results. Each row is one observation for one subject, tabulated as collected.

### What is the difference between SDTM, SDTMIG, and define-XML?

SDTM is the model, the abstract table grammar. The SDTMIG is the implementation guide, the human-readable per-domain rulebook. Define-XML is the machine-readable description of your actual submitted datasets: variables, origins, codelists, and computational methods.

### Why is my date variable character instead of a numeric SAS date?

`--DTC` variables store ISO 8601 strings exactly as collected, including partials like `2023-05`, so character is the only safe type. Numeric study dates and imputations are derived later in ADaM under SAP rules.

### What happens to CRF fields with no SDTM variable?

They move to the domain's supplemental qualifier dataset (SUPP--), one row per value, with `QNAM`, `QLABEL`, and `QVAL`, linked back to the parent record through `IDVAR` and `IDVARVAL`, which usually reference `--SEQ`. Analysis derivations (imputed dates, treatment-emergent flags, population assignments) belong in ADaM, never in SDTM.

---

Previous in the series: [From Mock Shell to RTF](/blog/tlf-shell-to-rtf-tutorial.html). Next: [SDTM AE domain mapping, worked example](/blog/sdtm-ae-domain-mapping-example.html). For what a validation engine actually checks against these domains, and where rule-based checking structurally stops, read [CDISC CORE Explained](/blog/cdisc-core-validation-explained.html).

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/sdtm-tutorial-domain-basics.html
