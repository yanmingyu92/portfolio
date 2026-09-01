---
name: define-xml-adrg-checklist
description: Pre-submission checklist for the define-XML and ADRG side of a CDISC data package — element-to-spec metadata map, reviewer's-guide section coverage, a pre-Pinnacle-21 defect sweep, and eCTD package assembly; use when preparing or reviewing define.xml, the ADRG/SRTG, or the m5 datasets package for a regulatory delivery.
license: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0) - cite: Yan, J., "define-xml-adrg-checklist skill", jaimeyan.com/skills/define-xml-adrg-checklist, 2026.
---

# Define-XML + ADRG Checklist

Run top to bottom before the package ships. Sections 1–2 build the
metadata and guide; sections 3–4 catch what engines and reviewers
otherwise catch late.

## 1 — Element-to-spec map (generation completeness)

For each define-XML element, confirm the spec source exists and flows:

- ItemGroupDef ← dataset sheet header (name, class, structure, keys)
- ItemDef ← variable rows: label, datatype, length, ORIGIN
- CodeList ← CT column; version pinned; external dictionaries (e.g.
  MedDRA) named with version
- ValueListDef + WhereClauseDef ← per-parameter transformation rows
- MethodDef / CommentDef ← transformation and notes columns;
  no "derived per program" placeholders

Rule: define.xml is generated from the spec, never hand-edited. A
finding is fixed in the spec row, then regenerated.

## 2 — ADRG / reviewer's guide sections

- [ ] Dataset inventory and purpose; ADaM-to-SDTM traceability stated
- [ ] Special or non-standard derivations explained (windows,
      composites, imputations)
- [ ] Population flags defined; which analyses use which population
- [ ] Custom domains: basis, structure, and why standard domains
      did not fit
- [ ] Known issues, data quirks, and decisions disclosed with owner
- [ ] Guide version matches the data cut it describes

## 3 — Pre-P21 defect sweep (run before the conformance engine)

- [ ] Origins: every ItemDef carries one (CRF / Derived / Assigned /
      Predecessor); CRF origins resolve to annotated-CRF pages
- [ ] Value-level metadata present wherever a rule varies by PARAM
- [ ] CT: define codelists and versions match the datasets as built
      at the current cut, not the last one
- [ ] No custom domain without a rationale in the guide
- [ ] Variable diff: spec variables vs dataset contents (PROC SQL
      over dictionary.columns) — zero rows in both directions
- [ ] define.pdf re-rendered from the same source as define.xml

## 4 — eCTD package checklist (m5 datasets section)

- [ ] Transport datasets (.xpt): final versions, locked
- [ ] define.xml + define.pdf regenerated after the last data change
- [ ] Reviewer's guide (ADRG / SRTG per current template), same
      version as the data
- [ ] Annotated CRF included
- [ ] Validation report archived; every finding dispositioned
- [ ] File names and folder layout follow current technical
      conventions

## Agent-era note

Agents draft guide prose and run define-vs-dataset diffs well. Before
trusting either, ask the agent to quote the ItemDef origin or the
ItemGroupDef behind every claim it made. Fluent text describing an
idealized package is the failure mode; the generated metadata is the
ground truth.
