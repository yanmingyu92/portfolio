---
name: sdtm-mapping-conventions
description: Conventions for SDTM mapping from raw/EDC data — domain assignment, controlled terminology enforcement, date handling, SUPPQUAL usage, and key variable rules (DM/AE/CM/LB/VS focus). Use when mapping raw datasets to SDTM, writing or reviewing mapping specs, resolving CORE/pinnable validation findings, or preparing define-XML metadata.
license: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0) - cite: Yan, J., "sdtm-mapping-conventions skill", jaimeyan.com/skills/sdtm-mapping-conventions, 2026.
---

# SDTM Mapping Conventions

Rules that keep SDTM mapping consistent, CORE-clean, and define-XML-ready.

## Core rules

1. **Mapping spec is the source of truth.** Every mapped variable traces to
   a spec row (source dataset/variable → target domain.variable, with
   transformation). Code without a spec row is a finding.
2. **Controlled terminology before logic.** Resolve CT (CDISC codelist
   version per the study's CT package) at mapping time — downstream logic
   (flags, derivations) assumes CT-conformant values.
3. **Dates: keep --DTC as ISO 8601 strings** exactly as collected
   (including partials). Derived numeric --DT/--STDT lives where the IG
   allows it, imputed per SAP. Never hard-truncate partials silently.
4. **Supplemental qualifiers → SUPP--.** Any collected variable without a
   home in the IG model goes to SUPP-- with QNAM ≤ 8 chars, not a custom
   domain variable.

## Domain quick checks

| Domain | Frequent mapping defects |
|---|---|
| DM | duplicated USUBJID; SITEID vs actual site mismatch; RFSTDTC inconsistent with SV |
| AE | serious flags mapped from non-CT source; AEREL free text; missing AEDECOD (MedDRA version drift) |
| CM | truncation of trade names; CMOCCUR logic ignored; duplicate records by design |
| LB | LBTESTCD vs local lab units mapping; ranges (LBSTNRLO/HI) dropped |
| VS | position/late-early timing (VSPOS, VSLAT) lost; unit conversion double-applied |

## Variable naming discipline

- USUBJID = STUDYID-SUBJID composite, built once in a single point
- --SEQ: derive deterministically (sort by key variables, retain order),
  never from raw sequence numbers
- --CAT/--SCAT: from spec, not from EDC free text

## Validation workflow

Run CDISC CORE (or sponsor engine) after each domain build; triage findings
by rule ID, and record disposition per finding (fixed / waived with reason).
A clean run covers only what the rules express — cross-domain contradictions
(disposition vs exposure dates) still need eyeball QC listings.
