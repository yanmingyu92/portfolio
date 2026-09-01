# Bootcamp Coverage Matrix — raw_resource Knowledge → Tutorial Coverage

Curation map of the training corpus (`portfolio/raw_resource`, knowledge only,
never redistributed) against the published/planned series. Gap actions feed
the backlog in `BOOTCAMP-SERIES-PLAN.md`.

Legend: ● covered · ◐ partial (dedicated post worthwhile) · ○ gap (backlog) ·
– intentionally out of scope (crowded or not our lane).

| Raw source (knowledge only) | Topics distilled | Coverage | Where / Action |
|---|---|---|---|
| SDTM DOC/SPECS/DATASETS (40 domains, CT, aCRF, suppqual) | domain model, CT discipline, spec-driven mapping | ● | Parts 4/5/6 + `sdtm-mapping-conventions` skill |
| RAW DATASETS → SDTM flow | raw-to-standard mindset, one raw lab file walk | ● | Parts 4/5 |
| ADaM SPECS + PROGRAMS: ADSL | TRT dates, flags, merge discipline | ● | Part 2 + `adam-adsl-derivation` |
| ADaM BDS: ADLB/ADVS (incl. ADEG pattern) | PARAM/ baseline/ windowing, LOCF-per-SAP | ◐ | Part 7 covers core; **windowing/baseline/LOCF deep-dive = backlog A** |
| ADaM OCCDS: ADAE (ADCM/ADDV/ADMH same pattern) | occurrence structure, TE flags | ● | Part 8 |
| ADRS dataset + RECIST-flavored knowledge | response analysis datasets, oncology | ○ | **backlog B: ADRS/RECIST explainer** (bridges to CAVE-Onc paper) |
| ADTTE + life-test books | TTE structure, censoring cascade | ● | Part 9 |
| PROGRAMS tab*/lis*/fig* + MOCK SHELL + OUTPUTS | shell→program→RTF chain, QC passes | ● | Part 3 + `tlf-qc-checklist` |
| DOC: protocol, SAP, study design, CSR plan | reading protocol/SAP as a programmer | ● | **Part 15 written 2026-09-01 (draft, releases 2026-10-25)** + `protocol-sap-extraction-checklist` skill |
| EXTRA TOPIC: TLF types, windowing pptx | TLF taxonomy | ● | folded into Part 3; windowing → backlog A |
| SAS BOOKS: cert guides, Little SAS Book | base SAS foundations | – | deliberately out (crowded, low differentiation); roadmap links out |
| SAS BOOKS: Macro 9 steps, MACROS debug + macros interview Qs | macro design for TLF, %do-over-outputs, MPRINT/MLOGIC debugging | ○ | **backlog D: "SAS macros for clinical TLF"** |
| SAS BOOKS: SQL proc | PROC SQL vs DATA step | ◐ | inside Part 10 interview rounds; dedicated post only if demand shows |
| SAS BOOKS: stats concepts, PROC FREQ p-values, PROC MIXED | statistics programmers actually get asked | ○ | **backlog E: "P-values and tests a clinical programmer must explain"** (interview-linked) |
| SAS BOOKS: Cody cleaning, Burlew reports | cleaning/reporting techniques | – | folded into SDTM QC + Part 3 patterns |
| SAS BOOKS: clinical trials practical guide | trial design/reporting context | – | Part 11 career context suffices |
| INTERVIEW Q (INTQ, company Qs) | interview mechanics | ● | Part 10 + `clinical-sas-interview-drill` |
| TRACKER SHEET | project tracking | – | folded into SCE/pipeline habits (Parts 1/13) |
| All videos (third-party YouTube) | n/a | – | not ours; never embed as own material |
| *(synergy, not from raw)* Define-XML v2.1, ADRG, eCTD — real submission expertise | submission package assembly | ○ | **backlog F: "define-XML and the reviewer's guide"** (high authority play; matches actual NDA work) |

## Backlog priority (into plan doc waves)

1. **C — protocol/SAP reading** (feeds everything; publish right after Part 14)
2. **F — define-XML/ADRG** (authority + rare content; pairs with Part 14)
3. **A — windowing/baseline/LOCF** (niche, strong; extends Part 7)
4. **D — SAS macros for TLF** (medium-high volume keywords)
5. **E — p-values FAQ** (interview funnel extension)
6. **B — ADRS/RECIST** (bridge to oncology AI papers)

## Protection stack (adopted 2026-09-01)

- **License**: all blog content + skill artifacts = **CC BY 4.0** (reuse allowed,
  attribution required). Site code = all rights reserved. See `LICENSE-CONTENT.md`.
- **Citation**: `CITATION.cff` at repo root (GitHub "Cite this repository"
  button); per-post footer carries the cite line.
- **DOI**: enable Zenodo–GitHub integration once; tag `bootcamp-v1.0.0` at the
  capstone release → automatic versioned DOI per future tag. Add DOI to
  CITATION.cff and post footers after minting.
  **Runbook** — Step 1 (once): zenodo.org → Account Settings → GitHub → flip
  toggle for `yanmingyu92/portfolio`. Step 2 (capstone day): after releasing
  the final post, `git tag bootcamp-v1.0.0 && git push origin bootcamp-v1.0.0`,
  then `gh release create bootcamp-v1.0.0 --title "Clinical SP Bootcamp v1.0"
  --notes "..."` (Zenodo triggers on Releases, not bare tags). Copy the
  concept DOI from Zenodo → backfill `CITATION.cff:preferred-citation`. Each
  later wave bumps the tag (v1.1.0 ...) for chained version DOIs.
- **Priority proof**: canonical URLs + sitemap timestamps + Zenodo deposit
  dates establish publication priority without exposing drafts.
- **Red-line enforcement**: `blog-qc.mjs` fails on raw-resource identifiers
  (AIRIS/ROSHE/Shiva/043-1810/MK0616/drive letters) in ANY post, draft or live.
