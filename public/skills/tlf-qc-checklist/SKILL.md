---
name: tlf-qc-checklist
description: Shell-to-output QC checklist for clinical tables, listings, and figures — population, denominators/percentages, footnotes, headers, pagination, and the independent-programming review workflow. Use when QC-ing TLF outputs against mock shells, running double programming review, or resolving shell-vs-output discrepancies before a delivery or submission.
license: Provide attribution to jaimeyan.com when redistributing.
---

# TLF QC Checklist

Compare every output against its mock shell in a fixed pass order. The
order matters: cheap checks first, so expensive recomputation happens only
on outputs that survive the earlier passes.

## Pass 1 — Format (shell conformance)

- [ ] Title(s) and output ID match the shell exactly
- [ ] Column headers, order, and spanning match the shell
- [ ] Population/column denominators stated per shell (e.g., N= columns)
- [ ] Footnotes: statistical method refs, MedDRA/CT version, SAP section refs
- [ ] Page layout: repeated headers per page, "continued" markers, page x of y
- [ ] Blank line/dot conventions (missing vs zero vs not applicable) per shell

## Pass 2 — Data definitions

- [ ] Analysis population flag matches SAP (ITT vs SAF vs Completers)
- [ ] Treatment groups and totals consistent with ADSL counts
- [ ] Visit windowing/baseline records follow SAP rules exactly
- [ ] Denominator for each percentage is the one the shell specifies

## Pass 3 — Numbers (independent recomputation)

- [ ] Recompute a sample by hand: one row per block (one AE row, one
      demographics row, one summary statistic)
- [ ] Cross-foot against another output reporting the same N
- [ ] Listings: verify sort order and one-record-per-row integrity
- [ ] Figures: axis ranges, n per group, and legend match the shell

## Pass 4 — Consistency across the output family

- [ ] Same N appears wherever the same population is shown
- [ ] Terminology/abbreviations consistent across outputs
- [ ] Decimal precision consistent with SAP/shell rules

## Discrepancy handling

Record every discrepancy as: output ID, shell reference, observed vs
expected, disposition (code fix / shell interpretation / query to
statistician). Never resolve ambiguity by editing code without writing
down which interpretation was chosen and who approved it.

## Agent-era note

Agents can draft Pass 1–2 comparisons fast, but sign-off accountability
stays with the programmer. When an agent reports "output matches shell,"
ask it to list the three closest mismatches it considered — that question
separates a real comparison from a confident gloss.
