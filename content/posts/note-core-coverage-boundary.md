---
title: "One Number That Explains Where Rule-Based Validation Stops"
date: 2026-08-30
description: "69.7% of oncology CORE rules port cleanly to a graph constraint language. The 30% that don't are exactly where the dangerous errors live."
tags: ["cdisc", "sdtm", "validation", "core"]
kind: note
canonicalPath: /blog/note-core-coverage-boundary.html
---

When I ported the oncology-scoped CDISC CORE rules into SHACL for the CAVE-Onc work, the result was suspiciously clean: **85 of 122 rules (69.7%) ported with zero expressiveness compromise — and the 37 that didn't port fell into exactly two buckets**. Thirty-one needed cross-domain joins the rule language can't express; six needed row-set uniqueness across records.

That number matters more than it looks. It tells you the coverage boundary of rule-based validation is not a backlog problem ("write more rules") but a structural one: a full third of the checks you'd want simply cannot be written in the engine's language. And the unwritable third is where cross-domain clinical contradictions live — a RECIST response that disagrees with its own lesion measurements, a disposition date that contradicts the exposure record.

So when someone says their datasets "pass CORE," the correct follow-up question is: pass the two-thirds that were expressible. The remaining third needs a different mechanism — in our case, graph constraints plus a small deterministic agent layer.

Full analysis in the [CAVE-Onc deep-dive](/blog/graph-constrained-validation-cdisc-oncology.html) and the [CDISC CORE field guide](/blog/cdisc-core-validation-explained.html).
