---
name: adam-adsl-derivation
description: Guides ADSL subject-level derivations (TRT01SDT/TRT01EDT, TRT01P/TRT01A, treatment flags, population flags like ITT/SAF) using CDISC ADaMIG-compliant logic with QC checkpoints. Use when programming or reviewing ADSL, deriving treatment dates, merging subject-level source domains (DM, EX, DS, SV), or debugging ADSL discrepancy finds.
license: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0) - cite: Yan, J., "adam-adsl-derivation skill", jaimeyan.com/skills/adam-adsl-derivation, 2026.
---

# ADaM ADSL Derivation Guide

Derive ADSL subject-level variables correctly, with the checks that catch
real-world discrepancies.

## TRT01SDT / TRT01EDT (first/last treatment date)

Standard decision cascade for first dose exposure date:

1. `EX.EXSTDTC` where `EXDOSE > 0` (or `EXOCCUR = Y`), earliest record
2. If no qualifying EX record: fall back per SAP (often first study
   treatment date from DS or EC) — **follow the SAP, not habit**
3. Partial dates: impute per SAP convention; never silently drop

QC checkpoint: subjects with `TRT01SDT` missing but any exposure record
present; subjects dosed before informed consent (compare with DM.RFSTDTC
and consent date if available).

## TRT01P vs TRT01A

- `TRT01P` (planned): from randomization (DS term RANDOMIZED or the
  dedicated randomization domain), never from exposure
- `TRT01A` (actual): from treatment actually received (EX)
- Discrepancies between P and A are data, not bugs — keep both, flag for
  medical review; do not "fix" A to match P

## Merge discipline (the #1 ADSL defect source)

- Merge subject-level sources one at a time, verifying row counts after
  each merge: `dm(1) ← sv(1) ← ex-summary(1) ← ds-events(1) ...`
- Any source that can produce multiple rows per subject must be
  aggregated (earliest/latest/flag) **before** merging into ADSL
- SUPPQUAL: transpose QNAM/QVAL wide by subject before merge; numeric
  IDVARVAL needs `INPUT(..., BEST.)` conversion

## Population flags (ITT/SAF/COMP)

Derive from definitions in the SAP, typically:

| Flag | Usual basis |
|---|---|
| ITTRTT | randomized in DS |
| SAFFL | received ≥1 dose of study treatment (EX) |
| COMP24FL | completed week 24 per DS disposition |

Every flag needs three things: the SAP citation, the derivation code, and
a QC listing of subjects where the flag disagrees with its basis.

## Agent failure modes to watch

When an LLM drafts ADSL code, verify: (1) it used the SAP's fallback rule,
not a plausible invented one; (2) merges kept 1-row-per-subject; (3) date
imputation matches SAP partial-date rules. Ask for the derivation trace of
any TRT date for 3 random subjects and verify by hand.
