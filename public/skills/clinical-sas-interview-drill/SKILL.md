---
name: clinical-sas-interview-drill
description: Interview drill for clinical SAS/statistical programmer roles — questions across SAS mechanics, CDISC (SDTM/ADaM), TLF/QC practice, and modern SCE/Git workflow, each with the strong-answer signals interviewers listen for. Use when preparing for clinical SAS programmer, statistical programmer, or SAS developer interviews, or conducting mock interviews.
license: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0) - cite: Yan, J., "clinical-sas-interview-drill skill", jaimeyan.com/skills/clinical-sas-interview-drill, 2026.
---

# Clinical SAS Interview Drill

Drill in rounds; answer aloud before reading the signals. The signals are
what a strong candidate's answer contains — interviewers listen for them.

## Round 1 — SAS mechanics

1. Difference between `MERGE` and `SET` with `BY`? 
   *Signal*: many-to-one vs concatenation; the need for sorted/pre-sorted
   inputs; what happens with duplicate BY values (implicit many-to-many trap).
2. When does `RETAIN` matter vs a sum statement?
   *Signal*: retaining values across iterations of one DATA step vs `sum`
   statement behavior; order of evaluation; `_N_` misconceptions.
3. `PROC SQL` join vs DATA step merge — pick one and justify.
   *Signal*: many-to-many semantics, readability, performance with indexes;
   no absolutism.
4. Debugging a macro that "runs but produces nothing"?
   *Signal*: `OPTIONS MPRINT SYMBOLGEN MLOGIC;`, resolving loop/scope,
   checking generated code not just logs.

## Round 2 — CDISC

5. Walk through building the AE domain from raw.
   *Signal*: spec-driven mapping, MedDRA coding, serious criteria flags,
   SUPPAE usage, --SEQ derivation.
6. TRT01SDT derivation with missing first dose?
   *Signal*: EX-based derivation, SAP fallback rule, partial dates.
7. What belongs in SUPPQUAL vs a custom domain?
   *Signal*: IG conformance, QNAM/QVAL mechanics, define-XML visibility.

## Round 3 — Practice & GxP

8. How do you QC a table you didn't program?
   *Signal*: independent programming vs review, the checklist habit,
   documentation of discrepancies.
9. What changes in a validated environment (SCE)?
   *Signal*: version control/PR review, reproducible runs, audit trail,
   separation of production and exploration.

## Round 4 — Modern workflow (increasingly asked)

10. How would you use an AI assistant in regulated programming?
    *Signal*: draft exploration vs validated artifacts; verification habit;
    data never leaving the validated boundary without approval; awareness
    that accountability stays with the human signer.

## Drill protocol

- 10 questions ≈ 45 minutes: 2 min answer, 2 min signal comparison
- Log weak answers; re-drill weak items after 48 hours
- For each weak item, write the one-page answer yourself — recall beats rereading
