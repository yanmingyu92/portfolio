---
title: "The Contradictions Your Validator Can't See: Graph-Constrained Validation for CDISC Oncology Data"
date: 2026-08-27
description: "Rule-based SDTM validators can't express cross-domain contradictions. SHACL-SPARQL graph constraints plus a deterministic agent layer catch what they structurally miss."
tags: ["cdisc", "sdtm", "shacl", "recist", "clinical-data-validation"]
canonicalPath: /blog/graph-constrained-validation-cdisc-oncology.html
paperRef: cave-onc
---

A subject's Response (RS) domain records an overall response of Complete Response. Their target lesions shrank enough for Partial Response, non-target disease is Stable Disease, and no new lesions appeared. Under RECIST 1.1 that's a contradiction — the recorded response is clinically impossible given the inputs that were supposed to produce it. Run that dataset through the CDISC CORE engine or the Pinnacle 21 FDA engine and it comes back clean. Not because the rules are badly written, but because no rule in either engine can say it.

That gap is the subject of my CAVE-Onc paper, published in *PLOS One*.

## Why domain-scoped rules can't express this

CORE rules execute as vectorized pandas operations over isolated domain DataFrames. Each rule can reference at most one domain or a pre-joined pair. Verifying an overall response requires joining Tumor Results (TR), Tumor Identification (TU), and Response (RS), then applying multi-step clinical logic — a graph-shaped traversal, not a DataFrame filter. This isn't a coverage gap you can author your way out of; it's a structural expressiveness boundary.

I measured the boundary directly: of 122 oncology-scoped CORE rules, 85 (69.7%) ported to SHACL with zero expressiveness compromise. The 37 that didn't port fell into exactly two buckets — 31 cross-domain join rules and 6 row-set uniqueness rules. The unportable third is precisely where the dangerous contradictions live.

## The two-layer fix

CAVE-Onc converts nine oncology SDTM domains from XPT into an RDF knowledge graph (preserving RELREC foreign keys and expanding SUPPDM qualifiers into semantic triples), then validates in two layers:

- **L1 — 111 SHACL shapes**: the 85 CORE ports, 8 RECIST 1.1 derivation shapes, and 18 archetype-specific SHACL-SPARQL constraints that embed multi-domain JOINs, temporal comparisons, and conditional existence checks inside `sh:sparql` blocks.
- **L3 — a LangGraph agent (CaveAgent)** for the one thing that's genuinely awkward as a monolithic query: RECIST Table 7 overall-response verification. It runs a deterministic state machine over typed SPARQL tool calls:

```
sld_change    = query(TR)   # target lesion SLD vs baseline
nt_response   = query(RS)   # non-target overall response
new_lesions   = query(TU)   # new lesion status
expected      = RECIST_Table7[sld_change, nt_response, new_lesions]
if expected != RS.RSORRES:  emit trace
```

Every trace lands in a Merkle-chained, append-only audit store — the foundation for 21 CFR Part 11, though full Part 11 compliance is explicitly out of scope.

## What the evaluation showed

Pre-registered, two tracks. Track A (clean CDISC Pilot 1 data, 52 subjects): CAVE L1 and CORE produced nearly disjoint flag sets — Jaccard 0.004 across 5,803 vs 941 flags. Graph validation **augments** the industry engine; it doesn't replace it.

Track B injected 20 clinician-reviewed contradiction archetypes into clean data. The split that matters:

| Validator | All 20 | 10 cross-domain RECIST |
|---|---|---|
| Pinnacle 21 FDA engine | 6/20 | 0/10 |
| CORE engine | 8/20 | 0/10 |
| CAVE L1 only | 19/20 | 10/10 |
| CAVE L1+L3 | 20/20 | 10/10 |

Both industry engines detected only archetypes seeded from CORE's own rule corpus — and 0/10 of the cross-domain RECIST contradictions their rule languages cannot express (McNemar p=0.002). Nineteen of CAVE's detections came from L1 shapes; exactly one (A19, the Table 7 contradiction) required the L3 agent.

Why not write A19 as one big SPARQL constraint? I tried. SHACL-SPARQL forbids VALUES lookup tables, so the 34-row Table 7 matrix collapses into a 34-deep nested `IF()` with zero testable sub-components. The agent encodes the same matrix as a flat 34-row dictionary across 22 unit-testable blocks (max nesting 7 vs 34). The maintainability argument is structural, not aesthetic — and the agent path is fully deterministic: $0.000 API cost per subject, perfectly replayable.

## What I'd warn you about

The manuscript is careful about this, and I'll repeat it here:

- The 20/20 is a **construction validation** — the shapes were authored knowing the injected patterns. On five held-out archetypes written after the shape library froze, existing shapes caught 3/5, and only 2/5 via the intended mechanism. Novel contradictions need new shapes.
- The L3 agent was evaluated on a single archetype. Broader agent-layer evaluation is future work.
- The corpus is synthetic. On two real Project Data Sphere trials mapped to SDTM (325 and 227 subjects), the engine stayed specific on unmutated data (0.06–0.09 archetype flags per subject) and detected 10/11 and 16/18 of applicable injected archetypes — but that's a transfer study, not a prevalence estimate for real submissions.

Three oncology experts reviewed all 20 archetypes: Fleiss' κ = 0.705, zero rated invalid, though four archetypes came back "protocol-dependent" — meaning per-study configuration is a prerequisite for production, not an option.

The deployment model this argues for: keep CORE and Pinnacle 21 enforcing structural conformance, and add graph constraints plus constrained agent workflows for the cross-domain semantic layer they can't reach. Full details, shapes, and benchmark code are in the [full paper](/papers/cave-onc.html) in *PLOS One*.
