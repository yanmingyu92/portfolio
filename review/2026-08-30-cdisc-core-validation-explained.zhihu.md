# CDISC CORE Explained: Open-Source Validation for SDTM/ADaM Programmers

<!-- Wechatsync target: Zhihu. Canonical: https://jaimeyan.com/blog/cdisc-core-validation-explained.html -->

Open any FDA-bound submission folder and you'll find the same artifact: a validation report from a commercial engine, hundreds of findings sorted by severity, and a programmer triaging them one by one. The tool is paid per seat, and the rule behind each finding is a black box — you get a rule ID and a message, not the logic. CDISC CORE flips both of those. The engine is free and open source, and every rule it executes is a public YAML file you can read, diff, and argue with.

That changes who validation is *for*. It's no longer just a pre-submission gate. It's something you can run nightly, fork, and audit.

> **TL;DR** — CDISC CORE is CDISC's open-source engine for checking SDTM, ADaM, and SEND datasets against machine-readable conformance rules. Rules are public YAML, execution is Python over XPT files, and the output is a JSON or Excel report. What it can't express — cross-domain semantic contradictions — is a structural limit of rule languages, not a coverage gap.

## What CDISC CORE actually is

CORE — the CDISC Open Rules Engine — is two things that are easy to conflate:

1. **A rule corpus.** CDISC publishes its conformance rules as versioned YAML files in a public GitHub repository. Each rule is the machine-readable form of a requirement that already existed in a published standard — SDTMIG, ADaMIG, controlled terminology, Define-XML. The rule text isn't a vendor's interpretation; it traces back to a specific citation in the standard.
2. **An execution engine.** The `cdisc-rules-engine` Python project reads your datasets, pulls the relevant standard's metadata from the CDISC Library, and evaluates the rule corpus against your data. It reports each violation with the rule ID, the domain, the message, and the affected records.

The separation matters. Before CORE, "what does the validator check?" was a question you answered by reading a vendor's documentation. Now you answer it by reading the rule file — and if you think a rule is wrong, there's a public issue tracker where that argument happens.

## How a CORE rule is expressed

Every rule is a small, declarative YAML document. Simplified anatomy:

```yaml
#simplified anatomy of a CORE conformance rule
Core:
  Id: CG0001
  Status: Published
Standard: { Name: SDTMIG, Version: "3.4" }
Rule Type: Record Data
Description: "Start date must be on or before end date"
Check:
  all:
    - name: "--STDTC"
      operator: "less_than_or_equal_to"
      value: "--ENDTC"
```

Three properties of this design drive everything else:

- **A closed operator vocabulary.** Rules don't contain free-form code. They compose named operations — equality, date comparison, pattern matching, codelist membership, record counting. That makes every rule auditable and testable by anyone, not just the engine's authors.
- **Explicit provenance.** Each rule carries its standard, version, and the citation it implements. When a finding looks wrong, you can walk from the YAML back to the sentence in the IG and see who's misreading whom.
- **Data-shape assumptions.** Rules execute as vectorized operations over one domain's records, or at most a pre-joined pair of domains. A rule is a filter over a table — which is exactly what most conformance checks are.

The CDISC Library connection is the quiet enabler here: the engine fetches machine-readable codelists and variable metadata for the exact standard version you declare, so "Is AGEU's value in the codelist?" is checked against the published CT, not a spreadsheet someone saved in 2019.

## Running CORE today

The practical path is short. Install the engine, point it at a folder of XPT datasets, declare the standard and version:

```bash
pip install cdisc-rules-engine
core validate -s sdtmig -v 3.4 \
  -dp ./xpt_datasets \
  -o core_report.xlsx
```

A few operational notes from the workflow:

- **The engine needs CDISC Library access.** Standards metadata comes from the CDISC Library API, so you'll configure an API key rather than bundling codelists by hand.
- **Docker is the zero-setup route.** A container image lets you run the same validation in CI without managing a Python environment — useful when you want every dataset commit to re-validate automatically.
- **The report is the deliverable.** Output is JSON or Excel: one row per issue, with rule ID, domain, message, severity, and the affected records. That structure is built for triage — filter by severity, group by rule, annotate the explainable ones.

![CDISC CORE pipeline: standards metadata and YAML conformance rules feed the engine, XPT datasets come in, a JSON or Excel validation report comes out](/figures/cdisc-core-validation-explained-pipeline.svg)

*Figure 1: The CORE pipeline. The rule corpus and CDISC Library metadata are inputs on equal footing with your datasets — and both are public artifacts you can inspect.*

Because the engine is free and scriptable, the economics of *when* you validate change. Validation stops being a pre-submission event and becomes a pre-commit habit: run CORE on every dataset drop, and the submission-week report should contain zero surprises.

## What CORE checks well — and where rules stop

The honest way to think about CORE's coverage is by check class:

| Check class | Example | In scope for CORE? |
|---|---|---|
| Variable presence | A required variable exists in the domain | Yes |
| Type and format | Dates are ISO 8601; numerics are numeric | Yes |
| Codelist membership | AGEU value is in the published CT codelist | Yes |
| Within-domain consistency | --STDTC on or before --ENDTC | Yes |
| Paired-domain joins | Consistency across a RELREC-linked pair | Limited — pre-joined pairs only |
| Cross-domain semantics | Overall response consistent with tumor measurements | No — structurally inexpressible |

*Table 1: CORE's coverage by check class. The last row is a boundary of the rule language itself, not a TODO list.*

That last row deserves the emphasis. A rule that composes operators over one DataFrame can ask "is this date before that date?" It cannot ask "given the target-lesion measurements in TR, the non-target assessments and new-lesion status, does the recorded overall response in RS match what RECIST 1.1's derivation table requires?" That question is a multi-domain traversal plus a clinical lookup table — a graph-shaped query, not a row filter.

I hit this boundary directly in my own work. When I tried to port the 122 oncology-scoped CORE rules into SHACL graph constraints, 85 (69.7%) ported with zero expressiveness loss. The 37 that didn't fell into exactly two buckets: 31 cross-domain join rules and 6 row-set uniqueness rules. The unportable third is precisely where clinically dangerous contradictions live — a subject whose recorded Complete Response contradicts their own lesion measurements sails through every rule-based engine, because no rule in the language can say the sentence that would catch it.

The deployment model this argues for is additive, not adversarial: keep CORE (or your commercial validator) enforcing structural conformance, and add graph-based constraints for the cross-domain semantic layer the rule language can't reach.

## Key takeaways

- CDISC CORE is free and open source: the engine and the YAML conformance-rule corpus are both public CDISC artifacts.
- Rules are declarative compositions of a closed operator set, each traceable to a citation in the published standard — auditable by design.
- You can run CORE today with `pip install cdisc-rules-engine` and one `core validate` command, or via Docker in CI.
- CORE covers presence, format, codelist, and within-domain consistency checks; cross-domain semantic contradictions are structurally out of reach for any single-table rule language.
- The right architecture layers graph-based validation on top of rule engines instead of replacing them.

## FAQ

### Is CDISC CORE free to use?

Yes. The engine and the conformance-rule corpus are open source under CDISC's GitHub organization. The one external dependency is the CDISC Library API, which the engine uses to fetch standards metadata and controlled terminology — you'll need a CDISC Library API key configured.

### Does the FDA require a specific validation tool?

Regulators publish technical conformance criteria — the FDA's Study Data Technical Conformance Guide and the standards themselves — not a vendor mandate. What reviewers evaluate is whether your data conforms to the published standards. CORE implements CDISC's own conformance rules, which makes it a direct way to check against the standards' stated requirements.

### Can CORE validate ADaM datasets, or only SDTM?

The conformance-rule corpus spans the standards CDISC publishes machine-readable rules for, including SDTM, ADaM, SEND, and Define-XML. You declare the standard and version at runtime (`-s adamig -v 1.3`, for example), and the engine loads the matching rule set and metadata.

### How is CORE different from Pinnacle 21?

Both check standards conformance, but the provenance differs. CORE's rules are public YAML published by CDISC itself, so every check traces to a citation you can read and contest. Pinnacle 21 is a commercial product with its own rule implementations. In practice the two can differ in coverage and severity assignment, which is why a finding in one engine isn't automatically a finding in the other.

### Can I write custom rules for CORE?

The rule format is plain YAML against a documented operator vocabulary, so custom checks for study-specific or sponsor-specific requirements are feasible. The trade-off to manage is governance: custom rules should live in a separate, versioned layer so they don't get confused with the official CDISC conformance corpus.

## Keep reading

The boundary described above — what rule-based validation structurally cannot express — is the subject of my deep-dive on [graph-constrained validation for CDISC oncology data](/blog/graph-constrained-validation-cdisc-oncology.html), which walks through the RECIST contradiction example and the porting analysis rule by rule. The full evaluation, including the two-track benchmark against the CORE and Pinnacle 21 FDA engines, is in the [CAVE-Onc paper](/papers/cave-onc.html) in *PLOS One*.

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/cdisc-core-validation-explained.html
