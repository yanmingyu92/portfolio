# Medium upload-ready draft — One Number That Explains Where Rule-Based Validation Stops

## Publish (paste path — recommended for this post)

1. New story at https://medium.com/new-story
2. Title: One Number That Explains Where Rule-Based Validation Stops
3. Paste everything between the BEGIN/END markers below.
   - Code fences, quotes and headings paste through as-is.
4. Set the canonical link (SEO): Story settings -> Advanced settings ->
   "This story was originally published elsewhere" -> https://jaimeyan.com/blog/note-core-coverage-boundary.html
5. Tags (Medium allows 5): cdisc, sdtm, validation, core
6. Preview, then Publish.

## Alternative: importer (fast, but no table fidelity)

- https://medium.com/p/import with https://jaimeyan.com/blog/note-core-coverage-boundary.html — sets canonical
  automatically, but Medium flattens HTML tables; prefer the paste path above
  for this series.

---

Canonical: https://jaimeyan.com/blog/note-core-coverage-boundary.html

=== BEGIN PASTE BODY ===

When I ported the oncology-scoped CDISC CORE rules into SHACL for the CAVE-Onc work, the result was suspiciously clean: **85 of 122 rules (69.7%) ported with zero expressiveness compromise — and the 37 that didn't port fell into exactly two buckets**. Thirty-one needed cross-domain joins the rule language can't express; six needed row-set uniqueness across records.

That number matters more than it looks. It tells you the coverage boundary of rule-based validation is not a backlog problem ("write more rules") but a structural one: a full third of the checks you'd want simply cannot be written in the engine's language. And the unwritable third is where cross-domain clinical contradictions live — a RECIST response that disagrees with its own lesion measurements, a disposition date that contradicts the exposure record.

So when someone says their datasets "pass CORE," the correct follow-up question is: pass the two-thirds that were expressible. The remaining third needs a different mechanism — in our case, graph constraints plus a small deterministic agent layer.

Full analysis in the [CAVE-Onc deep-dive](https://jaimeyan.com/blog/graph-constrained-validation-cdisc-oncology.html) and the [CDISC CORE field guide](https://jaimeyan.com/blog/cdisc-core-validation-explained.html).

=== END PASTE BODY ===
