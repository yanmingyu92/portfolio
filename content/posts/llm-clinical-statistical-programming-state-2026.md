---
title: "LLMs in Clinical Statistical Programming: Proven vs Hype (2026)"
date: 2026-08-30
description: "A tiered survey of LLM evidence in clinical trial statistical programming: benchmarked results, promising single-team studies, vendor hype, and the open gaps for 2026–2027."
tags: ["llm", "clinical-trials", "statistical-programming", "survey", "benchmarks", "gxp"]
kind: survey
canonicalPath: /blog/llm-clinical-statistical-programming-state-2026.html
---

Two numbers define the state of LLMs in clinical trial statistical programming in 2026. The first is 20 out of 20: in a pre-registered benchmark, a graph-constrained LLM validation system detected every injected cross-domain contradiction in CDISC oncology data, against 8 for the CDISC CORE engine and 6 for the Pinnacle 21 engine [1][17][23]. The second is 2.3%: the share of validation-topic papers in a structured review of this field that report any quantitative outcome at all [13].

Between those two numbers sits everything you need to know. Real, measured results now exist for specific statistical programming tasks. And most of what is said about AI in this field — conference talks, vendor decks, LinkedIn posts — carries no evaluation behind it. This survey separates the two, tier by tier, with the numbers attached.

> **TL;DR** — LLMs have proven, benchmarked value in six statistical programming tasks: cross-domain validation (20/20 vs 8/20 and 6/20 for the incumbent engines), independent QC code generation (97.1–100% variable-level match), local small-model ADaM coding (OPS 0.36→0.82 after fine-tuning), TLF template generation (85.7 vs 81.7 quality for RAG over prompting, p < 0.05), code debugging (>96% success across SAS, R, and Python), and SAS-to-R migration (78% of a production library converted, 66% of converted code used unmodified). Specification generation, natural-language data querying, synthetic data, and legacy modernization are promising but rest on single-team evidence. End-to-end "autonomous submission" claims are hype: zero published quantitative evaluations exist. Below: the evidence map, the numbers, and what to watch through 2027.

## Scope and method

This survey covers public evidence on LLM and LLM-adjacent automation for clinical trial statistical programming: SDTM/ADaM dataset work, TLF generation, QC and validation, code migration, and the tooling layer around them. The window is 2023 through August 2026, the period in which LLM-based approaches appear in the proceedings.

### Sources

Four pools of sources went in. First, the conference record: PhUSE US Connect and PharmaSUG proceedings from 2023–2026, plus the PHUSE/FDA Computational Science Symposium posters — the venues where this field actually publishes. Second, the peer-reviewed and preprint layer: PLOS One, Biology Methods and Protocols, medRxiv, and arXiv. Third, the regulatory record: FDA CDER's AI publications and guidance [20], the Part 11 scope-and-application guidance [21], and ICH E6(R3) [22]. Fourth, the tooling record: the CDISC CORE rules engine [17], the pharmaverse package ecosystem [18], Pinnacle 21 [23], the CDISC pilot datasets [19], and the R Consortium submission pilots [25][26].

On top of these, I drew on a 262-study structured review of statistical programming automation from 2020–2025 (reported per PRISMA-ScR, with GRADE evidence ratings) as the systematic backbone for claims about the literature as a whole [13].

### The inclusion bar

Every claim in this survey is sorted by what sits behind it, not by how plausible it sounds:

```
if claim has (quantitative metric AND comparator AND stated n):
    tier = "proven"          # benchmarked, with caveats on scope
elif claim has (working system AND single-team evaluation):
    tier = "promising"       # real but unreplicated
elif claim has (demo OR marketing OR no evaluation):
    tier = "hype"            # asserted, not measured
```

*Listing 1: The inclusion bar. A claim's tier comes from its evidence, not its source's confidence.*

"Proven" here means proven within a stated scope — a benchmark, a dataset, a study count — not proven for your pipeline. Every proven-tier entry below carries its scope with it. Where the only evidence is a single team's benchmark (which describes most of the quantified literature, including much of my own work), I say so.

### Disclosure and limits

Twelve of the primary sources are my own publications. That is partly selection — I know these systems from the inside — and partly the field's reality: the set of published, quantified LLM evaluations in this niche is small enough that one research program is a large fraction of it. I flag single-team evidence throughout, and the [full-text papers](/papers/cave-onc.html) carry the pre-registrations, ablations, and failure analyses this survey can only summarize. This is a practitioner survey, not a systematic review; for the systematic version, see the [PRISMA-ScR review](/papers/automation-scoping-review.html) [13]. Vendor claims were included only when I could attribute them to a public source; nothing in the hype tier is a strawman.

## How to read the evidence tiers

The tiers are a claim about evidence, not about eventual value. Some hype-tier ideas will mature into proven ones; the point is that they have not yet.

| Tier | Definition | Test it passed | Examples in this survey |
|---|---|---|---|
| Proven | Quantitative metric, named comparator, stated sample size | Benchmark evaluation with numbers you can re-run | Cross-domain validation, QC code generation, fine-tuned ADaM coding, TLF templates, debugging |
| Promising | Working system, plausible mechanism, single-team or single-study evaluation | Functional validation without replication | Specification generation, NL data querying, synthetic ADaM data, legacy modernization |
| Hype | Asserted capability with no public evaluation | None — marketing, demos, extrapolation | Autonomous end-to-end submissions, "self-validating" agents |

*Table 1: Evidence tiers used throughout this survey. Movement between tiers requires published evaluation, not better demos.*

One pattern shows up across every tier: the strongest results pair the LLM with deterministic machinery — rule engines, graph constraints, fixed workflows — and measure the combination. The weakest claims attribute everything to the model. Keep that pattern in mind; it is the closest thing this field has to a law.

## Tier 1 — What is proven, with numbers

Six results meet the inclusion bar. I order them by strength of evaluation design, not by headline number.

### Cross-domain validation: the strongest result in the field

Regulatory submissions must stay consistent across interdependent SDTM domains, and cross-domain contradictions routinely survive conventional validation because rule engines evaluate one domain at a time. [CAVE-Onc](/papers/cave-onc.html) models submission datasets as an RDF knowledge graph, combines SHACL-SPARQL graph constraints with a deterministic agent layer, and was evaluated in a pre-registered injected-contradiction benchmark [1].

The result: 20 of 20 clinician-reviewed contradiction archetypes detected, versus 8 of 20 for the CDISC CORE engine [17] and 6 of 20 for the Pinnacle 21 FDA engine [23] — both engines scored 0 of 10 on cross-domain RECIST contradictions, the class they structurally cannot express. On two real Project Data Sphere [24] oncology trials mapped to SDTM, the system stayed specific (0.06–0.09 flags per subject) while detecting 10 of 11 and 16 of 18 applicable archetypes.

Two honest caveats. First, this is a construction validation of expressiveness — it proves the graph layer can express checks rule engines cannot, not that every real submission contains those contradictions at that rate. Second, it is single-team. It is also, to my knowledge, the only pre-registered LLM-system benchmark in this field, which is why it anchors the tier.

### Independent QC programming

Independent double programming — recreating production outputs from specifications alone — consumes an estimated 30–50% of total clinical programming effort [2][13]. The obvious question is whether an LLM can generate the QC stream without collapsing the independence that makes QC meaningful.

The [PharmaSUG 2026 AI-201 framework](/papers/pharmasug-2026-ai-201.html) generates independent QC code in Python directly from ADaM specifications, using a QC Trace Tree, a Decision Router, and isolated AI instances for production and QC streams, with the human QC programmer as the genuinely independent review layer [2]. On the CDISCPilot01 benchmark [19], it achieved 97.1–100% variable-level match across five ADaM domains and passed all 13 assertions. Companion code is public.

The caveat is the benchmark itself: CDISCPilot01 is one small, clean study. The framework's real contribution is architectural — it shows how to keep AI in both streams without the two streams becoming one — and that claim does not depend on the dataset.

### Local small models for ADaM derivation code

Sponsors who cannot ship specifications to a cloud API need local models, and base small models are bad at this: stock LLaMA 3.1 8B scores an Overall Performance Score (OPS) of 0.36 on Admiral code generation, with code execution accuracy of 0.35 — code that resembles Admiral until it invents a parameter [4].

The [PhUSE 2025 OS08 pipeline](/papers/phuse-2025-os08.html) fine-tunes that same model with LoRA on knowledge-graph-filtered Admiral examples and validates output against a knowledge graph built from Admiral documentation [4]. Evaluated on 75 variables from a Phase II study across six ADaM domains and three complexity tiers, OPS rises from 0.36 to 0.82 — within 0.09 of GPT-4o's 0.91 on the same tasks. Complex derivations sit at 0.76 OPS, which is why the paper's own framing is "drafting assistant, not autopilot." Everything runs on a workstation GPU; no data leaves the building.

### TLF template generation

Naive LLM prompting for ICH E3-conformant TLF templates suffers schema drift: the model quietly restructures the template schema it was asked to fill. The [PharmaSUG 2026 AP-211 study](/papers/pharmasug-2026-ap-211.html) compared five generation methods across 1,999 instance-matched bootstrap experiments on three LLM providers, using JSON Patch to preserve schema fidelity [3].

A hybrid RAG approach with reranking beat direct prompting on mean quality score, 85.7 versus 81.7, significant at p < 0.05 and consistent across providers and therapeutic areas. Translating templates into executable R code, iterative LLM-guided debugging raised execution success from a low zero-shot rate to 70% within 3–5 rounds — and higher-fidelity templates needed fewer iterations, which ties the two halves of the pipeline together. This is the largest controlled experiment count in the field's published record, and the full methodology is in the [companion blog post](/blog/benchmarking-rag-clinical-tlf-templates.html).

### Code debugging and SAS-to-R migration

Two mature results sit at the code-maintenance end of the pipeline. The [ET01 debugging pipeline](/papers/phuse-2025-et01.html) translates natural-language queries into SAS, R, or Python, executes in a Jupyter kernel, and feeds runtime errors back to the LLM for iterative repair [6]. Across a factorial corpus of 2,700 runs with injected syntax, runtime, and logical/statistical errors, success rates exceeded 96% in all three languages — about 95% of syntax and 90% of runtime errors resolved, versus about 88% and 87% for logical and statistical errors. The gradient matters: the system is strongest exactly where errors are mechanical.

For migration, the [PharmaSUG 2025 AI-239 collaboration](/papers/pharmasug-2025-ai-239.html) converted a production SAS ADaM standards library to R using ChatGPT-4o and Claude 3.5 Sonnet inside a structured workflow — segmentation, accumulated conversion instructions, human validation against SAS-generated datasets [7]. About 78% of templates converted, and about 66% of the converted code was used without modification. Macro-heavy templates still required significant human intervention, which is the honest boundary of the result.

### Architecture as a multiplier, not a model property

The least intuitive proven result is about structure rather than capability. In the [GxP-Agent experiments](/papers/gxp-agent.html), the same model scored 0% on an ADaM derivation task in a free-form agent loop and reached 100% structural match when placed inside a fixed process DAG — typed nodes, versioned artifacts on every edge, deterministic validation gates between steps [5].

Structural match is not derived-value correctness; the DAG constrains the shape of the solution, and QC still checks the content. But for regulated work the shape is half the battle, because a workflow whose path changes run-to-run cannot be validated at all. The deeper analysis is in [Why LLM Agents Fail at Regulated Programming](/blog/why-llm-agents-fail-regulated-programming.html). The practical reading: before upgrading your model, fix your topology. Model tier still matters — it matters within a sound architecture, not instead of one.

### The benchmark table

| Study | Task | Benchmark | Result | Comparator | Scope caveat |
|---|---|---|---|---|---|
| CAVE-Onc [1] | Cross-domain validation | 20 injected archetypes, pre-registered | 20/20 detected | CORE 8/20, P21 6/20 [17][23] | Single team; expressiveness validation |
| AI-201 [2] | QC code generation | CDISCPilot01, 5 ADaM domains [19] | 97.1–100% variable match, 13/13 assertions | — | One small clean study |
| OS08 [4] | ADaM R code (local model) | 75 variables, 6 domains, 3 tiers | OPS 0.36→0.82 | GPT-4o 0.91 | Single study, single model family |
| AP-211 [3] | TLF templates + R code | 1,999 bootstrap runs, 3 providers | 85.7 vs 81.7 (p<0.05); 70% exec success in 3–5 rounds | Direct prompting | Template benchmark, not CSR production |
| ET01 [6] | Code debugging | 2,700 factorial runs, 3 languages | >96% success; ~95% syntax, ~88% logical | — | Injected errors, not organic failures |
| AI-239 [7] | SAS→R conversion | Production standards library | 78% converted; 66% used unmodified | — | Macro-heavy templates needed rework |
| GxP-Agent [5] | Agent reliability | ADaM derivation task | 0%→100% structural match | Free-form loop | Structural match, not value correctness |

*Table 2: Quantified LLM results in clinical statistical programming, 2025–2026. Every row has a named metric and comparator; every row also has a scope boundary.*


## Tier 2 — Promising but unproven

These systems work, their mechanisms make sense, and their evaluations are real — but each rests on a single team's evidence or a scope too narrow to generalize from. Adopt them with instrumentation; do not quote their numbers as field results.

### Specification generation

[ClinAgent](/papers/clinagent-methodology.html) is a skill-and-tool layer that gives any MCP-compatible coding agent clinical-programming capabilities — nine skills from study setup to eSub packaging, with deterministic rule engines beside the prompts [8]. Validated on artifacts from a single production Phase 2 study, its deterministic components matched all 56 ADSL variables, log analysis achieved 100% precision (1 error, 7 warnings over 10 logs), and prompt-based specification generation reached 72.1% derivation accuracy [8][9].

That 72.1% is the instructive number. It splits above 96% on simple domains and below 55% on complex ones, with confidence intervals wide enough that the paper calls its own point estimates upper bounds. And end-to-end productivity was never measured — the paper says so explicitly. A system that is honest about its own evaluation boundaries is worth more than a bigger number without them, which is exactly why this sits in tier 2 rather than tier 1.

### Natural-language data querying

Two studies benchmark LLM-generated queries over ADaM data held in graph versus relational stores. [DH03](/papers/phuse-2025-dh03.html) ran 90 protocol-derived questions against synthetic ADaM datasets in both PostgreSQL and Neo4j: LLM-generated Cypher beat SQL 73.33% to 66.67% overall, holding across difficulty tiers [10]. [SI-342](/papers/pharmasug-2025-si-342.html) scaled the comparison to 150 questions and added RagQL-Nav — query decomposition, routing, and dual-query validation — reaching 91% accuracy on complex queries, roughly 12 points above single-system approaches [11].

The mechanism is credible: routing beats monoliths, and graph queries help for relationship-heavy questions. But both studies use synthetic data and one question set each, and 73% accuracy means one answer in four is wrong — fine for exploration with a human checking, not for anything that feeds a deliverable directly.

### Synthetic ADaM data

[ML12](/papers/phuse-2025-ml12.html) builds knowledge graphs from trial documentation and uses LLMs to enrich the JSON schemas that drive Faker-based data generation [12]. In a three-way comparison, the template-based variant scored 0.70 on overall quality versus 0.45 for direct JSON-schema generation, with better structural integrity and cross-dataset relationships. Useful for testing pipelines without touching real data — but "realistic" is asserted against structural metrics, not against downstream analysis equivalence. Nobody has yet shown that conclusions drawn on LLM-generated synthetic ADaM match conclusions on the real thing.

### Legacy system modernization

Most large sponsors run validated SAS macro libraries they cannot rewrite without triggering re-validation. The [non-destructive modernization framework](/papers/legacy-modernization-framework.html) wraps a 558-component production library unchanged behind a typed intermediate representation, delivering machine-readable JSON from day one [14]. Parity validation reached 100% cell-level parity (4,764 cells) on the public CDISCPilot01 benchmark [19] and at least 80% cell parity on 11 of 14 reports from an internal Phase III study; optional consolidation achieved a 92% SAS code reduction.

The 80%-parity reports are the telling detail: the approach works, and the residual gap on complex internal reports is exactly where cost concentrates. One library, one organization — promising, unreplicated.

### Training and documentation assistants

The [SI-160 training agent](/papers/pharmasug-2024-si-160.html) — a GPT-4-based tutor grounded in SDTMIG, ADaMIG, and ICH E9 — reports positive pilot feedback [15], and the [IC08 RAG chatbot](/papers/phuse-2024-ic08.html) answers questions over indexed study documents with a local-deployment option [16]. Both work; neither was evaluated with anything harder than user feedback. That is acceptable for tools that never touch submission content, and it is the right ceiling for their claims.

## Tier 3 — What is hype

The hype tier is not speculative; it is defined by absence. Three claim types dominate it.

### "Autonomous end-to-end submission generation"

No published system generates a submission-ready ADaM dataset or TLF package autonomously, with evaluation, at any fidelity. The closest quantified results — ClinAgent's 72.1% specification accuracy [8], the QC framework's 97.1–100% match on one pilot study [2] — are component results with humans at every gate. A claim that chains these components into hands-off autonomy multiplies their error rates; 0.72 raised to even a few dependent steps is not a submission, it is a liability. Vendors demoing this are showing the happy path on clean data, which is a demo of model capability, not of a system — the distinction matters enough that I wrote a [separate post on telling the two apart](/blog/llm-agents-clinical-trials-reality.html).

### "Self-validating agents"

The claim that an agent checks its own work fails a test older than LLMs: the component that produces an output must not be the component that approves it. A model reviewing its own output inside one context window is grading its own homework, and the proven-tier systems all separate generation from verification — isolated QC instances [2], deterministic validation gates [5], graph constraints checked outside the model [1]. Any architecture whose verification story is "the agent double-checks" has no verification story.

### Unquoted workflow numbers

The field's most-cited efficiency figures — 15–25% development-time reduction for pharmaverse tooling, 30–50% validation-effort reduction for risk-based approaches — are real findings, but the structured review grades them Low to Very Low quality: before/after comparisons, case reports, no controls [13][18]. General-purpose LLM code generation at 60–85% accuracy is also Very Low grade, and real-world deployment success rates of 26–65% sit alongside 5–15% hallucination rates in clinical contexts [13]. Quote these numbers with the grade attached, or do not quote them.

Why does the hype persist? Because the review found only 42 of 262 included studies (16%) report quantitative outcomes at all [13]. In a literature that thin, a confident narrative faces no competition from data. Publication bias compounds it — successful implementations get written up, abandoned pilots do not. The countermeasure is the inclusion bar from the scope section: no metric, no comparator, no n, no tier above hype.

## Maturity by task type

Collapsing the tiers onto the task taxonomy a programming lead actually staffs:

| Task | Maturity | Best evidence | Practical posture |
|---|---|---|---|
| Code debugging and repair (SAS/R/Python) | Proven in benchmark | >96% success, 2,700 runs [6] | Deploy as assistant; review logical-error fixes hardest |
| SAS→R migration | Proven at production scale | 78% converted, 66% unmodified [7] | Deploy with human validation against SAS outputs |
| ADaM derivation code (local models) | Proven in benchmark | OPS 0.36→0.82; GPT-4o 0.91 [4] | Drafting assistant; complex derivations (0.76 OPS) need review |
| TLF template generation | Proven in benchmark | RAG 85.7 vs 81.7, p<0.05; 70% exec in 3–5 rounds [3] | Deploy RAG+reranking; budget debugging rounds |
| QC programming | Proven in benchmark | 97.1–100% match, 13/13 assertions [2] | Pilot on non-critical domains; keep human as independent layer |
| Cross-domain validation | Proven in benchmark | 20/20 vs 8/20, 6/20 [1] | Additive layer over CORE/P21, not a replacement [17][23] |
| Specification generation | Promising | 72.1%, wide CI; >96% simple, <55% complex [8] | Human-in-loop for complex domains only |
| NL data querying | Promising | 73–91% accuracy [10][11] | Exploration tool; verify before use in deliverables |
| Synthetic ADaM data | Promising | Quality 0.70 vs 0.45 [12] | Testing aid; not validated for analysis equivalence |
| SDTM mapping | Unevaluated | No public LLM benchmark found | Open gap — see below |
| End-to-end autonomous submission | Hype | No quantitative evaluation exists | Do not procure on this claim |

*Table 3: Maturity assessment by task type, August 2026. "Proven" always means proven within the stated benchmark scope.*

Two readings of this table matter for planning. The proven rows cluster where outputs are mechanically checkable — code either runs, matches, or passes assertions — while the weak rows cluster where correctness is judgment. And the single most valuable proven row is the validation row, because it attacks the 30–50% of effort the field spends on QC [2][13].

## Open gaps

Four gaps define the research agenda, and honesty about them is what makes this survey citable.

### No SDTM mapping benchmark

ADaM-side tasks have benchmarks; SDTM mapping — the upstream half of the pipeline — has none in the public LLM literature. The strongest SDTM automation evidence is rule-based (REDCap2SDTM, 75–85% conversion-time reduction, the review's only Moderate-grade efficiency finding) [13]. Whether LLMs help map raw data to SDTM is, remarkably, an open question.

### No replication across teams

Every tier-1 result in Table 2 is single-team. Independent replication on a shared substrate is cheap to run — CDISCPilot01 is public [19], the pharmaverse packages are open [18], and at least two frameworks publish companion code [2][3] — and it has not happened. Until it does, treat every number in this survey as an upper bound measured by the system's authors.

### No end-to-end productivity measurement

Not one published study measures whether an LLM-assisted programming team actually delivers a study faster. The components are benchmarked; the workflow is not. ClinAgent states the gap in its own abstract [8]. The obvious design — same study, two teams, one with tooling — has never been run, and the review's power calculation explains the difficulty for validation studies specifically: detecting a 10-point difference in error detection at 80% power needs roughly 200 programs per arm, and the largest available study had 15 [13].

### No validation-strategy evidence at all

Validation is the field's most discussed topic — 36.5% of topic mentions in the review corpus — and its least measured: 12 of 527 validation papers (2.3%) carry quantitative data, and the number of RCTs comparing validation approaches is zero [13]. The single quantitative double-programming study reports 92–98% error detection at 1.6–2.0× effort from 15 SAS programs, no confidence intervals. Every risk-based validation decision your organization makes, LLM or not, currently rests on expert opinion and tradition. The review scores this as the field's most severe research gap, and nothing published in 2026 has closed it [13].


## What to watch in the next 12 months

### Regulators are moving from posture to mechanics

FDA CDER's trajectory is concrete: over 500 submissions with AI components from 2016 to 2023, over 800 public comments on its May 2023 AI/ML discussion paper, a January 2025 draft guidance proposing a risk-based credibility framework for AI supporting regulatory decisions, and — in January 2026 — joint FDA/EMA Guiding Principles of Good AI Practice in Drug Development [20]. Watch how sponsors operationalize the credibility framework for programming-adjacent AI: the first company to document an LLM-assisted ADaM pipeline against it will set the de facto template. Note what none of these documents does: prohibit the technology. Part 11's guidance interprets scope narrowly, exercises enforcement discretion on specific provisions, and enforces predicate rules in full [21] — the obligation is trails and controls, not abstinence.

### ICH E6(R3) finishes landing

The E6(R3) principles and Annex 1 took effect in the EU on 23 July 2025, and Annex 2 — covering non-traditional designs, decentralized trials, and real-world data — reaches effect on 15 January 2027 [22]. The guideline's risk-proportionate, fit-for-purpose framing is the regulatory hook risk-based validation has been waiting for. Expect SOP rewrites through 2027, and expect "E6(R3)-aligned" to appear in every validation-strategy deck — mostly without new evidence behind it.

### Open-source submissions keep normalizing

The R Consortium Submissions Working Group, working with FDA participation, has run a series of pilot R-based submissions built on the public CDISC pilot data [19][26], with current pilots testing WebAssembly and container-based bundling and publishing synthetic benchmark datasets [25]. Each pilot lowers the friction of the open-source stack the LLM results above are built on — Admiral [4], pharmaverse tooling [18], R-based TLF generation [3]. The migration evidence [7] and the tooling evidence are converging on the same destination.

### The validation coverage boundary becomes a product category

CAVE-Onc's 8/20 and 6/20 baseline numbers for CORE and Pinnacle 21 [1][17][23] quantify something the field knew anecdotally: rule engines cover standards compliance, not cross-domain content consistency. Watch for CORE rule expansion [17], for graph-based checks appearing in commercial validators, and for audit-trail design — Merkle-chained, tamper-evident stores [1] — to become a procurement requirement rather than a paper feature.

### Someone runs the missing studies

The gaps above are cheap to close relative to their value: a shared multi-team benchmark on CDISCPilot01 [19], a two-team productivity study, a validation-strategy comparison adequately powered at ~200 programs per arm [13]. The first organization to publish any of these owns the reference everyone else cites. This survey will be updated when they do.

## Key takeaways

- The strongest LLM results in this field pair the model with deterministic machinery — graph constraints, fixed DAGs, rule engines — and measure the combination; pure-model claims have no tier-1 evidence.
- Proven with numbers: cross-domain validation (20/20 vs 8/20 for CORE, 6/20 for Pinnacle 21), QC code generation (97.1–100% variable match, 13/13 assertions), fine-tuned local ADaM coding (OPS 0.36→0.82), RAG TLF templates (85.7 vs 81.7, p<0.05), debugging (>96% across SAS/R/Python).
- Architecture is the decisive controllable factor: the same model moved from 0% to 100% structural match between a free-form loop and a process DAG.
- Promising but single-team: specification generation (72.1%, wide intervals), NL data querying (73–91%), synthetic ADaM data, legacy modernization — adopt with instrumentation, quote with caveats.
- Every end-to-end "autonomous submission" and "self-validating agent" claim on the market is unevidenced; no quantitative evaluation of either exists anywhere in the public record.
- Quote workflow efficiency numbers with their GRADE rating: 15–25% pharmaverse gains are Low grade, and validation research has zero RCTs in 527 papers.
- Regulators demand trails, not abstinence: Part 11 enforces predicate rules, E6(R3) rewards risk-proportionate design, and FDA's AI framework asks for documented credibility — all architecture problems, all solvable.

## FAQ

### Are LLMs actually proven to work for clinical statistical programming?

For specific tasks, yes — with scope attached. Cross-domain validation, QC code generation, TLF template generation, code debugging, and local ADaM code drafting all have published benchmark results with named comparators [1][2][3][4][6]. What is not proven is end-to-end autonomy or measured productivity gain at the study level; no published evaluation of either exists [8][13].

### What is the single strongest piece of evidence in the field?

The CAVE-Onc benchmark, because it is pre-registered and has real comparators: 20/20 injected cross-domain contradictions detected against 8/20 for the CDISC CORE engine and 6/20 for the Pinnacle 21 FDA engine, with specificity maintained on two real oncology trials [1][17][23]. The runner-up is not a number but a finding: architecture, not model tier, is the largest controllable reliability factor [5].

### Can LLM-generated code go into a regulatory submission?

Through the same controls as any other code: independent QC, review by a qualified person who owns the result, and a retained record of how it was produced. Part 11's guidance enforces predicate rules in full while interpreting its own scope narrowly [21], and FDA's AI draft guidance asks for documented credibility rather than prohibition [20]. Treat LLM output as work from a fast junior programmer — useful, and never submitted unreviewed.

### Do we need a frontier cloud model, or can local models do this work?

Local fine-tuned models are now viable for drafting: LoRA fine-tuning took LLaMA 3.1 8B from OPS 0.36 to 0.82 on Admiral code generation, within 0.09 of GPT-4o, on a single workstation GPU with no data leaving the environment [4]. The residual gap concentrates in complex derivations, which need human review regardless of model tier. For sponsors whose data cannot reach an external API, the fine-tuning route is the proven option.

### Why do vendor claims run so far ahead of the published evidence?

Because the evidence base is thin enough that narrative faces no competition: 42 of 262 studies in the structured review report any quantitative outcome, and 2.3% of validation papers do [13]. Demos are graded on plausibility, not replay; publication bias hides abandoned pilots; and no shared benchmark forces comparability. The fix is boring — ask for the metric, the comparator, and the n, and watch most claims leave the room.

## References

1. Yan J. CAVE-Onc: Graph-Constrained Agentic Validation for Cross-Domain Contradictions in CDISC Oncology Submissions. *PLOS One*, 2026. doi:10.1371/journal.pone.0350376. [Abstract](/papers/cave-onc.html)
2. Yan J, Zhang J. Eliminating QC Programming Duplication Through Claude AI-Assisted Independent Code Generation: A Practical Framework for Regulatory-Compliant Validation. *PharmaSUG 2026*, paper AI-201. [Abstract](/papers/pharmasug-2026-ai-201.html)
3. Yan J. Schema-Preserving Generation of Clinical TLF Templates and Executable R Code via Iterative LLM-Guided Debugging. *PharmaSUG 2026*, paper AP-211. [Abstract](/papers/pharmasug-2026-ap-211.html)
4. Yan J, Tian T. An End-to-End Approach to Fine-Tune Small LLMs for Generating Admiral R Code in Statistical Programming. *PhUSE US Connect 2025*, paper OS08. [Abstract](/papers/phuse-2025-os08.html)
5. Yan J. GxP-Agent: Process-DAG Topology for Reliable Clinical Trial Programming with LLM Agents. *arXiv*, 2026. [Abstract](/papers/gxp-agent.html)
6. Yan J, Tian T. Automating SAS and R Code Interpretation and Debugging: A Practical Pipeline for Statistical Programmers. *PhUSE US Connect 2025*, paper ET01. [Abstract](/papers/phuse-2025-et01.html)
7. Cheng J, Malipeddi S, Veeravel G, Yan J, Sanjee SR. GenAI Assisted Code Conversion: From SAS to R Standard ADaM Templates. *PharmaSUG 2025*, paper AI-239. [Abstract](/papers/pharmasug-2025-ai-239.html)
8. Yan J. ClinAgent: AI-Assisted Methodology for Clinical Trial Data Processing and Statistical Programming. *Biology Methods and Protocols*, 2026. doi:10.1093/biomethods/bpag032. [Abstract](/papers/clinagent-methodology.html)
9. Yan J. ClinAgent: A Five-Layer Architecture for Autonomous Clinical Trial Statistical Programming. *medRxiv*, 2026. doi:10.64898/2026.01.09.26343542. [Abstract](/papers/clinagent-five-layer.html)
10. Yan J, Shi C. Enhancing Clinical Trial Data Queries with LLMs and Neo4j: A Flexible Framework for ADaM Dataset Management. *PhUSE US Connect 2025*, paper DH03. [Abstract](/papers/phuse-2025-dh03.html)
11. Yan J. Comparing SQL and Graph Database Query Methods for Answering Clinical Trial Questions with LLM-Powered Pipelines. *PharmaSUG 2025*, paper SI-342. [Abstract](/papers/pharmasug-2025-si-342.html)
12. Yan J, Su C. A Novel Pipeline for Generating Realistic Synthetic CDISC ADaM Datasets Using Large Language Models and Knowledge Graphs. *PhUSE US Connect 2025*, paper ML12. [Abstract](/papers/phuse-2025-ml12.html)
13. Yan J, Zhang J, Tian T. Automation in Clinical Trial Statistical Programming: A Structured Review of TLF Generation, Validation Frameworks, and AI/ML Integration (2020–2025). *medRxiv*, 2025. doi:10.64898/2025.12.24.25342988. [Abstract](/papers/automation-scoping-review.html)
14. Yan J. A Non-Destructive Methodological Framework for Modernizing Legacy Clinical Reporting Systems for AI-Driven Pharmacoinformatics: A SAS Case Study. *arXiv*, 2026. doi:10.48550/arXiv.2605.13905. [Abstract](/papers/legacy-modernization-framework.html)
15. Zhang J, Yan J. LLM-Enhanced Training Agent for Statistical Programming. *PharmaSUG 2024*, paper SI-160. [Abstract](/papers/pharmasug-2024-si-160.html)
16. Yan J, Su C, Shi C. AI-Enhanced Chatbot for Streamlined Clinical Trials Analysis and Document Management. *PhUSE US Connect 2024*, paper IC08. [Abstract](/papers/phuse-2024-ic08.html)
17. CDISC. CDISC Rules Engine (CORE) — open-source validation engine for clinical trial data standards. GitHub repository. https://github.com/cdisc-org/cdisc-rules-engine
18. Pharmaverse. Curated open-source R packages for clinical reporting in pharma. https://pharmaverse.org/
19. CDISC. SDTM/ADaM Pilot Project (CDISCPilot01 source data). GitHub repository. https://github.com/cdisc-org/sdtm-adam-pilot-project
20. FDA Center for Drug Evaluation and Research. Artificial Intelligence for Drug Development — including the January 2025 draft guidance *Considerations for the Use of Artificial Intelligence to Support Regulatory Decision Making*, the May 2023 AI/ML discussion paper, and the January 2026 FDA/EMA *Guiding Principles of Good AI Practice in Drug Development*. https://www.fda.gov/about-fda/center-drug-evaluation-and-research-cder/artificial-intelligence-drug-development
21. FDA. Part 11, Electronic Records; Electronic Signatures — Scope and Application. Guidance for Industry. https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
22. European Medicines Agency. ICH E6 Good Clinical Practice — scientific guideline (E6(R3) principles and Annex 1 in effect 23 July 2025; Annex 2 effective 15 January 2027). https://www.ema.europa.eu/en/ich-e6-good-clinical-practice-scientific-guideline
23. Pinnacle 21. Clinical data standardization and validation platform. https://www.pinnacle21.com/
24. Project Data Sphere. Open-access oncology clinical trial data-sharing platform. https://www.projectdatasphere.org/
25. R Consortium. R Submissions Working Group: 2026 Plans and 2025 Success. https://r-consortium.org/posts/submissions-wg-2026/
26. Laxamana J, et al. R Consortium's R-Based Test Submission Package for FDA Evaluation: A Milestone and a New Frontier in R-Based Regulatory Submissions. *PhUSE US Connect 2025*, poster PP17. https://phuse.s3.eu-central-1.amazonaws.com/Archive/2025/Connect/US/Orlando/PAP_PP17.pdf
