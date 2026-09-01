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
| ADaM BDS: ADLB/ADVS (incl. ADEG pattern) | PARAM/ baseline/ windowing, LOCF-per-SAP | ● | Part 7 core; deep-dive = **Part 17** (drafts, releases 11/08) + `visit-windowing-rules` skill |
| ADaM OCCDS: ADAE (ADCM/ADDV/ADMH same pattern) | occurrence structure, TE flags | ● | Part 8 |
| ADRS dataset + RECIST-flavored knowledge | response analysis datasets, oncology | ● | **Part 20** (drafts, releases 11/29) + `adrs-recist-derivation` skill; bridges to CAVE-Onc paper |
| ADTTE + life-test books | TTE structure, censoring cascade | ● | Part 9 |
| PROGRAMS tab*/lis*/fig* + MOCK SHELL + OUTPUTS | shell→program→RTF chain, QC passes | ● | Part 3 + `tlf-qc-checklist` |
| DOC: protocol, SAP, study design, CSR plan | reading protocol/SAP as a programmer | ● | **Part 15 written 2026-09-01 (draft, releases 2026-10-25)** + `protocol-sap-extraction-checklist` skill |
| EXTRA TOPIC: TLF types, windowing pptx | TLF taxonomy | ● | folded into Part 3; windowing → backlog A |
| SAS BOOKS: cert guides, Little SAS Book | base SAS foundations | – | deliberately out (crowded, low differentiation); roadmap links out |
| SAS BOOKS: Macro 9 steps, MACROS debug + macros interview Qs | macro design for TLF, %do-over-outputs, MPRINT/MLOGIC debugging | ● | **Part 18** (drafts, releases 11/15) + `tlf-macro-patterns` skill |
| SAS BOOKS: SQL proc | PROC SQL vs DATA step | ◐ | inside Part 10 interview rounds; dedicated post only if demand shows |
| SAS BOOKS: stats concepts, PROC FREQ p-values, PROC MIXED | statistics programmers actually get asked | ● | **Part 19** (drafts, releases 11/22) |
| SAS BOOKS: Cody cleaning, Burlew reports | cleaning/reporting techniques | – | folded into SDTM QC + Part 3 patterns |
| SAS BOOKS: clinical trials practical guide | trial design/reporting context | – | Part 11 career context suffices |
| INTERVIEW Q (INTQ, company Qs) | interview mechanics | ● | Part 10 + `clinical-sas-interview-drill` |
| TRACKER SHEET | project tracking | – | folded into SCE/pipeline habits (Parts 1/13) |
| All videos (third-party YouTube) | n/a | – | not ours; never embed as own material |
| *(synergy, not from raw)* Define-XML v2.1, ADRG, eCTD — real submission expertise | submission package assembly | ● | **Part 16** (drafts, releases 11/01) + `define-xml-adrg-checklist` skill |

## Backlog status (all drafted 2026-09-01, releases per plan calendar)

All six gaps drafted as Parts 15–20 with 4 new skill artifacts
(visit-windowing-rules, define-xml-adrg-checklist, tlf-macro-patterns,
adrs-recist-derivation): C→Part 15 (10/25), F→16 (11/1), A→17 (11/8),
D→18 (11/15), E→19 (11/22), B→20 (11/29). Matrix rows above updated ●.

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
- **Red-line enforcement**: `blog-qc.mjs` fails on source-corpus identifiers
  (client/author/protocol/project names and drive letters — patterns built
  from split literals so the tokens never appear in this repo) in ANY post,
  draft or live.
