---
name: adrs-recist-derivation
description: Use when programming or reviewing ADRS oncology response datasets — RECIST 1.1 parameter derivations, the TU/TR/RS source chain, BOR and PD-date rules, and the PDS hand-off to ADTTE.
license: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0) - cite: Yan, J., "adrs-recist-derivation skill", jaimeyan.com/skills/adrs-recist-derivation, 2026.
---

# ADRS / RECIST Derivation Guide

## 1. RECIST 1.1 quick map

| Target disease | Non-target | New lesions | Overall |
|---|---|---|---|
| CR (all targets gone) | CR | No | CR |
| PR (SLD decrease meets criteria) | Non-PD | No | PR |
| SD | Non-PD | No | SD |
| PD (SLD increase meets criteria) | Any | Any | PD |
| Any | PD | Any | PD |
| Any | Any | Yes | PD |
| None measurable | Persists without PD | No | NON-CR/NON-PD |

- Ordinal AVAL order: CR < PR < SD < NON-CR/NON-PD < PD; NE placement per
  SAP; the mapping table lives in the spec, never in memory
- CR/PR confirmation: repeat assessment within the SAP interval
  (conventionally >= 4 weeks) where required; the SAP names confirmed vs
  unconfirmed BOR for primary tables

## 2. Source chain (read as one chain)

TU (lesion inventory) → TR (per-lesion results: target diameters,
non-target status, new-lesion findings) → RS (overall per timepoint;
RSEVAL separates investigator from blinded review)

- Merge SUPPTR/SUPPRS explicitly, early, with row-count checks — new-lesion
  dates, laterality, and tracker IDs hide there
- Collapse duplicate records on one date first, ANL01FL per spec, before
  deriving anything
- Two evaluator flows = two parallel parameter sets (PARCAT2); never blend

## 3. BOR rules

- Pool = records from first dose (ADT >= TRTSDT) up to and including first
  PD, unless the SAP censors elsewhere (new anticancer therapy, etc.)
- BOR = best AVAL in the pool; pool of only NE/incomplete → BOR = NE or
  missing per SAP
- Confirmed BOR applies the confirmation interval before a CR/PR can win;
  keep confirmed and unconfirmed as separate PARAMCDs

## 4. PD date and event rules

- First PD on or after first dose; pre-dose PD is baseline progression per
  SAP, not a PFS event
- Competing evidence dates (target PD vs new lesion): earliest-evidence rule
  or investigator-recorded RS date — the SAP picks, the spec cites it
- Death without prior PD = PFS event at the death date; death after PD
  changes nothing
- Month-only response dates: impute per SAP convention (commonly different
  for responses than progressions); one listing row per imputed subject
- PDS hands ADTTE: event flag, ADT, censoring basis, and the SAP's index
  date (randomization or first dose)

## 5. Defect checklist

1. BOR computed over unscheduled assessments the SAP excludes
2. Confirmed BOR with the confirmation visit outside the interval
3. PD date late because new-lesion data sat in SUPP unmerged
4. RSEVAL filter dropped, investigator and blinded review blended
5. Deaths censored in PFS instead of counted as events
6. Recorded overall response contradicts lesion evidence — cross-domain,
   invisible to rule engines; recompute expected overall for a sample and
   compare against RS

## 6. Agent failure modes

- Invented confirmation windows hardcoded regardless of SAP
- NON-CR/NON-PD ordered better than SD
- RSEVAL filter dropped; SUPP merges skipped because nothing mentioned them
- Countermeasure: agent prints its mapping and rule table with citations;
  diff against the SAP before reading code; hand-trace 3 subjects end to
  end from TU through TR, RS, and the final TLF row
