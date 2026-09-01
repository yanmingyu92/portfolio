---
name: protocol-sap-extraction-checklist
description: Extraction pass that turns a clinical trial protocol and statistical analysis plan (SAP) into a statistical programmer's work list — endpoints to datasets, visits to windowing, populations to flags, with query discipline for silent sections. Use when starting a study's programming work, scoping SDTM/ADaM/TLF effort from protocol documents, or resolving ambiguities between protocol, SAP, and shells.
license: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0) - cite: Yan, J., "protocol-sap-extraction-checklist skill", jaimeyan.com/skills/protocol-sap-extraction-checklist, 2026.
---

# Protocol/SAP Extraction Checklist

Read a protocol and SAP the way a statistical programmer does: hunting for
the sentences that become datasets, flags, and tables — and the silences
that become queries.

## The extraction pass (in order)

1. **Objectives and endpoints.** For each primary and key secondary endpoint,
   write: endpoint sentence (with section number) → analysis dataset that
   carries it (ADSL/ADRS/ADTTE/...) → the TLF that reports it. An endpoint
   with no owner is a finding.
2. **Analysis populations.** ITT/SaF/Per-protocol/Completers: exact SAP
   wording, source domain for each criterion (randomization in DS, dosing in
   EX, completion in DS). Each becomes an ADSL flag with a SAP citation.
3. **Visit schedule and windowing.** List scheduled visits, unscheduled
   handling, and the windowing rule (per visit? rolling ±N days? day-based
   anchor?). Note baseline definition per parameter type — windowing and
   baseline decide BDS correctness.
4. **Treatment exposure and dates.** First/last dose definitions, partial
   date fallbacks, treatment discontinuation rules, and what counts as a
   dose (EXDOSE > 0? EXOCCUR?). These drive TRT01SDT/TRT01EDT and TE flags.
5. **AE and concomitant medication rules.** Treatment-emergent definition
   (onset on/after first dose per SAP convention), severity/relatedness
   handling, MedDRA version, CT package versions — pinned in one place.
6. **Derived variable specs.** Every derivation the SAP names (change from
   baseline, responders, LOCF or equivalent) with its exact rule and the
   SAP section that owns it.
7. **Interim analyses and DMC.** Extra populations, extra outputs, blinded
   vs unblinded flows — these change the programming environment, not just
   the programs.
8. **Shells cross-check.** Every shell output traces to an endpoint or a
   safety listing requirement. A shell without an analysis basis is a query.

## Query discipline

When the SAP is silent or ambiguous: do not choose. Log it — protocol/SAP
section, what is ambiguous, the options considered — and route to the
statistician. The disposition ("SAP v2.0 §5.3 clarifies X") goes into the
spec before programming resumes. Ambiguity resolved by code is ambiguity
invented by the programmer.

## Extraction worksheet output

One page per study: endpoint map, population definitions, windowing rules,
date handling, TE definition, derivation list, open queries with IDs. This
worksheet is the input to mapping specs, ADSL programming, and the QC plan.
