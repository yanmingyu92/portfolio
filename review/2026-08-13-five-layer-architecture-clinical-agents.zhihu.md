# Thin MCP, Thick Skills: A Five-Layer Architecture for Clinical Programming Agents

<!-- Wechatsync target: Zhihu. Canonical: https://jaimeyan.com/blog/five-layer-architecture-clinical-agents.html -->

Ask your favorite AI coding agent — Claude Code, Cursor, Augment, Cline — to review the SAS log from an ADSL derivation. It will happily try. Now ask it to read the SAS7BDAT dataset itself, parse the ADaM specification Excel, or tell a real `ERROR:` apart from a harmless "Unable to copy SASUSER" warning. It can't — not because the model can't reason, but because none of the domain tools exist.

That gap — tooling, not reasoning — is what the ClinAgent architecture in my medRxiv preprint is built to close. The design rule is one sentence: **thin MCP, thick skills**.

## The five layers

ClinAgent is not an agent. It's a skill-and-tool layer that any MCP-compatible agent can invoke, organized as five layers:

1. **A2UI (results rendering)** — validation dashboards, log tables, RTF viewers: deterministic presentation of results for human review.
2. **Skill router** — maps incoming tool calls to the right skill and validates inputs before anything executes.
3. **Skills (thick)** — nine packages, SK-001 Study Setup through SK-009 eSub Packaging. Each bundles an embedded prompt template, few-shot examples, constraint specs, a deterministic rule engine, and the MCP tool bindings it needs.
4. **MCP tools (thin)** — stateless I/O only: read a SAS dataset, parse an Excel spec, read a log file. They don't know what ADSL is or which variables matter.
5. **Infrastructure** — AuditLogger (every tool invocation with timestamps, inputs, outputs), DataMasker (PHI/PII stripped before data reaches agent context), AccessControl, and context minimization.

The agent does the reasoning. ClinAgent supplies the domain expertise and the compliance trail.

## Why thick skills beat fat prompts

The obvious alternative is to stuff everything into one giant prompt — CDISC rules, error patterns, derivation conventions, QC logic — and hand it to the agent. I deliberately didn't do that, for reasons that become concrete the moment you try to maintain such a system:

- **Testability.** Rules buried in a prompt (or compiled into an MCP server) can only be exercised end-to-end with real files and a model in the loop. Rules in skill-side JSON are unit-testable with plain fixtures — no LLM call required.
- **Evolvability.** CDISC standards change and new SAS error patterns emerge. When a new warning pattern appears, the fix is one line in `warning_patterns.json` — no code change, no redeployment, no regression on the data-access layer.
- **Transparency.** A fat prompt is a black box even to its author. A JSON rule file is something a domain expert — a senior statistical programmer, not a software engineer — can read, review, and sign off on. In GxP work, that reviewability *is* the validation story.
- **Determinism where it matters.** Agent reasoning is stochastic, which is fine for writing a summary. It is not fine for classifying an `ERROR:` line or checking a dataset against its spec. So the skill splits the work: the rule engine classifies deterministically, and only then does the LLM write the human-readable interpretation:

```json
"rule_engine": {
  "error_patterns": ["^ERROR:", "^ERROR [0-9]+-"],
  "warning_patterns": ["^WARNING:"],
  "false_positive_warnings": ["Unable to copy SASUSER",
                              "BY-line has been truncated"]
}
```

Extensibility falls out of the same choice. Adding a new capability (the preprint walks through a hypothetical SK-010 define.xml generator) is primarily *configuration* — a skill JSON plus rules and prompt template — reusing the existing MCP tools untouched.

## What the validation showed

I validated all nine skills on artifacts from a production Phase 2 cardiovascular study: expert-written SAS programs, reviewed logs, and synthetic Faker-generated datasets matching the study structure (11 ADaM domains, 93,239 observations — no patient data). The evaluation targets tool correctness, not LLM reasoning, which is agent-dependent and out of scope.

- **9/9 skills passed** functional validation.
- **Log analysis (SK-005):** 1 error and 7 warnings across 10 logs, detected with 100% precision and zero false positives — against 13,595 clean NOTE lines.
- **Data validation (SK-006):** all 56/56 ADSL variables matched the specification.
- **Spec generation (the prompt-based component):** 72.1% derivation accuracy overall (95% Wilson CI [67.1%, 76.7%]), above 96% on simple domains like ADMH, ADEX, and ADCM.
- **TLF code generation (SK-007):** 12 of 16 programs generated; 4 skipped because the specs lacked macro names — a data-quality issue, not a skill failure.

The most interesting result is the failure mode. Derivation accuracy correlates strongly and negatively with the proportion of study-specific derived variables (Spearman ρ = −0.867, p = 0.003): ADSL hit 54.3% and ADBASE — almost entirely custom baseline flags — hit 0.0%. Of the 115 missing variables, 58.3% were study-specific derivations that no generic prompt can know about. That's exactly the knowledge that belongs in a thick, organization-specific skill, not in a fatter generic prompt.

## Honest limitations

The preprint is explicit about what this does *not* show. It's a single Phase 2 study; the log-detection result rests on exactly one real error (Wilson CI [20.7%, 100.0%]), so "100% precision" is a point estimate, not proof. End-to-end productivity gains were not measured — a controlled timing study is future work — and generative accuracy depends on well-structured input specs, as the four skipped TLFs demonstrate.

The architectural claim survives these caveats, though: put deterministic, testable domain logic in skills; keep data access thin and stateless; let the user's agent — whichever one their organization approved — do the reasoning.

Full details are in the [full paper](/papers/clinagent-five-layer.html) (medRxiv preprint; the peer-reviewed version appears in *Biology Methods and Protocols*).

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/five-layer-architecture-clinical-agents.html
