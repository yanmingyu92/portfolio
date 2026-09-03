# ADaM OCCDS Explained: Programming ADAE with Treatment Flags

<!-- Wechatsync target: Juejin. Canonical: https://jaimeyan.com/blog/adam-occds-adae-tutorial.html -->

A safety table reports 312 treatment-emergent adverse events. The independent QC program counts 315. The gap is three events with onset before first dose, every one flagged treatment-emergent because the flag compared onset against the randomization date instead of TRT01SDT. That is what an OCCDS flag defect looks like: invisible in the code, visible in the counts.

> **TL;DR** — OCCDS datasets keep one row per occurrence, and ADAE is the canonical case: AE records enriched with ADSL treatment variables, a treatment-emergent flag driven by ASTDT versus TRT01SDT, and MedDRA terms carried through untouched. This post covers the build, partial-date handling, the defects that surface in review, and a QC checklist you can run against your own ADAE.

## The fundamentals

### What OCCDS means

| Structure | Grain | Typical datasets |
|---|---|---|
| ADSL | One row per subject | ADSL |
| BDS | One row per subject, parameter, timepoint | ADVS, ADLB, ADRS |
| OCCDS | One row per occurrence | ADAE, ADCM, ADMH |

*Table 1: The three ADaM structures side by side. ADAE is neither a summary nor a transpose — it is the event grain itself.*

OCCDS, Occurrence Data Structure, preserves the grain of the SDTM domain it serves. ADAE carries exactly as many rows as the adverse events it holds: a subject reporting five events contributes five rows. Collapsing to one row per subject, or per subject per body system, is the defining mistake; those shapes belong in summary tables derived from ADAE, never in ADAE itself.

### Building ADAE: AE plus ADSL

The build is a disciplined merge. AE on the left, many rows per subject; ADSL on the right, exactly one row per subject. Keep every AE row and carry the ADSL variables onto it: TRTP and TRTA, SAFFL, ITT flags, and TRT01SDT itself, which the emergence flag needs.

Subjects appearing in AE but not in ADSL are a defect to resolve, not rows to drop silently. An adverse event with no known subject means the SDTM extracts disagree, and that goes to data management as a listing. The other direction, subjects in ADSL with no events, is normal; such subjects show up only in denominators.

Alongside the merge, character dates parse to numeric: ASTDT from AESTDTC, AENDT from AEENDTC, with ADY anchored to TRT01SDT where the SAP asks for relative days. Length-check the character string before INPUT; a partial date parsed as complete is a silent defect.

### The treatment-emergent flag

Treatment emergence is the analysis question ADAE exists to answer: did the event begin on or after the subject started treatment? The usual SAP convention is ASTDT >= TRT01SDT, sometimes with a one-day grace window the SAP defines explicitly. The comparison anchors on first dose, never randomization. An event between randomization and first dose is not treatment-emergent, which is precisely the defect in the opening scene.

```sas
/* Treatment-emergent flag per the SAP convention, Study XYZ */
data adae1;
  merge ae(in=a) adsl(keep=usubjid trtsdt trt01p trt01a saffl);
  by usubjid;
  if a;
  astdt = input(aestdtc, yymmdd10.);
  if astdt ne . and trtsdt ne . then do;
    if astdt >= trtsdt then trtemfl = "Y";
    else trtemfl = "N";
  end;
run;
```

Partial start dates get imputed per the SAP before the comparison, with the imputation recorded in an AESTDTCF-style flag. One common convention imputes a missing day to the first of the month. Whether month-only or unknown onsets can ever count as treatment-emergent is a SAP question, and SAPs genuinely differ: some accept earliest-plausible dates, others require a complete date before calling an event emergent. Transcribe the rule you were given; do not choose one.

| AESTDTC | Example imputation (earliest-plausible) | Emergent when TRT01SDT = 2026-01-15? |
|---|---|---|
| 2026-02-02 | none | Yes |
| 2026-02 | 2026-02-01 | Yes |
| 2026-01 | 2026-01-01 | No, under this convention |
| (missing) | none possible | Per SAP; usually not emergent |

*Table 2: Partial dates against the emergence comparison under one example convention. Your SAP governs; this table exists to be diffed against it, not copied from it.*

### Serious, severity, and dictionary variables

AEDECOD, AEBODSYS, and the rest of the MedDRA hierarchy ride through from AE untouched. ADAE is not the place to recode or respell dictionary terms. Serious flags (AESER and its components for death, hospitalization, life-threatening) plus severity (AESEV) and action taken (AEACN) map across with the merge; defects here are almost always recode bugs, so the QC listing recomputes them from source.

### The defects that reach reviewers

| Defect | Symptom | The check |
|---|---|---|
| Subjects in ADAE not in ADSL | Join drops rows downstream | Anti-join listing |
| TRTEMFL = Y with ASTDT before TRT01SDT | Overcounted events | Date comparison listing |
| ASTDT missing where AESTDTC exists | Parse failure | Missing-value listing |
| MedDRA version drift | AEDECOD differs from SDTM AE | Version traceability check |
| Duplicate rows after the merge | Fan-out | Key uniqueness check |

*Table 3: The recurring ADAE defects. Each one has a listing that catches it in seconds.*

The anti-join, because it is the one people skip:

```sas
/* Subjects in ADAE with no ADSL row, Study XYZ */
proc sql;
  select distinct a.usubjid
  from adae1 a
  left join adsl b on a.usubjid = b.usubjid
  where b.usubjid = "";
quit;
```

MedDRA drift deserves its own sentence. AE terms are coded against a specific MedDRA version. If ADAE builds against a different dictionary load than the AE domain carries, preferred terms and system organ classes shift between SDTM and ADaM, and a reviewer diffing the two watches events quietly change category. Keep one dictionary version per data-cut snapshot, recorded in the traceability metadata.

## The modern workflow

In the SCE, dictionary management is a first-class pipeline concern: MedDRA loads are versioned artifacts, the coding run is recorded, and the ADAE build stamps the version it used. The build follows the spec-driven pattern of the rest of the ADaM stack: the spec defines flag names, the emergence convention, and the analysis populations; the program transcribes; define.xml generates from the same metadata.

QC runs as independent double programming with the Table 3 listings attached to the review, plus structural conformance checks on every build. In R, admiral's occurrence functions express the same logic (flag derivation with explicit conventions, date handling under your control), and admiralpython mirrors them, so mixed-engine shops keep one spec as the source of truth across implementations. The wrap-up of my [admiral fine-tuning work](/blog/fine-tuning-small-llms-admiral-r.html) has a useful caveat for this step: multi-source merges were exactly where the small model degraded most, and the AE-plus-ADSL merge is a multi-source merge.

## The agentic way

Agents write a clean AE-to-ADSL merge in one pass, then quietly decide the two things they must not decide: the emergence convention and the partial-date rule. A one-day grace appears because many SAPs have one. Month-only dates get day 01 because that is the common default. Neither decision announces itself: the log is clean, the counts look sane, and only a diff against the SAP sentence exposes the invention.

The verification habit mirrors the one from the BDS post: the agent states its rule and the rule's source before anyone reads the code. Then hand-check three borderline subjects: one pre-dose event, one month-only onset, one event dated the same day as first dose. The accountability boundary stays put: whoever signs the QC document owns the flag logic, agent-drafted or not. The general argument is in [why LLM agents fail in regulated programming](/blog/why-llm-agents-fail-regulated-programming.html).

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents draft the AE-to-ADSL merge and treatment-emergent logic quickly, but they invent emergence conventions and partial-date defaults; the failure mode is a defensible-looking flag with no SAP citation behind it.</p>
  <p>Before trusting agent-drafted ADAE code, have it quote the emergence rule it implemented, then check three borderline subjects against source by hand.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

## Key takeaways

- OCCDS keeps one row per occurrence: ADAE carries exactly as many rows as the events it serves.
- Treatment emergence compares ASTDT against TRT01SDT per the SAP convention, never against randomization.
- Partial start dates are imputed per the SAP with the imputation flagged; the convention is transcribed, not chosen.
- Subjects in ADAE but not in ADSL become a data-management listing, never a silent drop.
- One MedDRA version per data-cut snapshot; dictionary drift between AE and ADAE is a review finding.

## FAQ

### What makes an adverse event treatment-emergent?

The SAP definition, usually onset on or after the first dose of study treatment (ASTDT on or after TRT01SDT), sometimes with an explicitly defined grace window. Emergence is a treatment question, so the anchor is first dose rather than randomization.

### Can ADAE contain subjects who are not in ADSL?

Only as a flagged discrepancy. An AE record with no ADSL row means the SDTM extracts disagree; it goes to data management as a listing. Silently dropping hides the problem, and silently keeping the row leaves it outside every analysis population.

### Which MedDRA version should ADAE use?

The same version the AE domain was coded against for that data-cut snapshot. Recoding between SDTM and ADaM shifts preferred terms and event counts. Version traceability in the metadata is what a reviewer checks.

### Does ADAE ever have one row per subject?

No. That shape is a summary output derived from ADAE, not ADAE itself. When an analysis needs event counts per subject, the counts derive downstream from the occurrence rows.

---

Next in the bootcamp: Part 9, ADTTE and time-to-event programming. Earlier in the arc: [Part 7, BDS structure for ADLB and ADVS](/blog/adam-bds-adlb-advs-tutorial.html) and [Part 2, the ADSL walkthrough](/blog/adsl-derivation-tutorial-trtstdt.html). The [series roadmap](/blog/clinical-sp-bootcamp-roadmap.html) tracks what is published.

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/adam-occds-adae-tutorial.html
