# LLM Agents in Clinical Trials: What's Real Beyond the Demos

<!-- Wechatsync target: Juejin. Canonical: https://jaimeyan.com/blog/llm-agents-clinical-trials-reality.html -->

The demo is always the same. Clean SDTM datasets, a prompt like "generate the baseline characteristics table," and ninety seconds later a formatted TLF appears on screen. The presenter calls it an autonomous agent for clinical submissions.

Then you ask three questions. Run it again with the same inputs and show me identical output. Show me the audit trail an inspector would see. Show me what happens when the input data is malformed. The room gets quiet.

This post is about that silence — and how to tell, in one meeting, whether you're looking at a system or a demo.

> **TL;DR** — Most agentic AI demos for clinical trials show model capability, not deployability. The gap is determinism, audit trails, and an architecture that constrains the model instead of following it. Below: the four properties that matter, how 21 CFR Part 11 reads as a design spec, and the exact questions that expose demo-ware.

## What a demo actually proves

A demo proves one thing: the model can, once, under curated conditions, produce output a human finds plausible. That is a useful signal about model quality. It is not evidence of a deployable system, because the demo format hides everything GxP cares about:

- **Replay variance.** LLM sampling means the same prompt can produce different code on run two. In a demo, nobody runs it twice.
- **The happy path.** Demo data is clean. Production data has partial dates, unexpected nulls, and a supplemental qualifier domain nobody mentioned.
- **The missing trail.** Nothing on screen records which tool ran, on which data version, with what inputs, producing which artifact.
- **"Looks right" grading.** The presenter eyeballs the output. In regulated work, plausible-but-wrong is worse than obviously broken, because it surfaces during regulatory review instead of in a unit test.

A system you can ship behaves the same on a bad Tuesday as it did in the demo. That bar is architectural, not cosmetic.

## The four properties that matter in GxP

Strip away branding and every deployable agentic system in a regulated environment needs the same four properties:

- **Determinism where it counts.** The LLM can be stochastic while writing an explanation of a derivation. It cannot be stochastic while classifying a SAS `ERROR:` line or checking a variable against its specification. Deployable systems push those decisions into deterministic rule engines and validation gates, and reserve the model for reasoning and prose.
- **Replayability.** Same inputs, same workflow, same artifacts. If re-running a task can take a different path through the system, you cannot validate it — full stop.
- **Auditability by construction.** Every model call, tool invocation, and intermediate artifact is logged with timestamps and inputs. This is ALCOA applied to machine actions: attributable, legible, contemporaneous, original, accurate.
- **Isolation of generation and verification.** The component that produces an output must not be the component that approves it. A model that checks its own output inside the same context window is grading its own homework, and confirmation bias is baked in.

Notice what is absent from this list: model size, benchmark scores, context window. Those matter, but they are not what fails inspections.

## 21 CFR Part 11 is a design spec

Part 11 gets treated as paperwork that lands after a system is built. Read it as an engineering requirements document instead, and it tells you exactly what an agentic system must do:

| Part 11 concept | What it demands of an agentic system |
|---|---|
| System validation | Behavior bounded enough to test; a workflow that changes path run-to-run cannot be validated |
| Audit trails | Every LLM call and tool invocation logged: who, what, when, inputs, outputs, data versions |
| Record protection | Intermediate artifacts versioned and immutable — not an agent scratchpad that gets overwritten |
| Authority and access controls | Role-based permissions; PHI/PII masked before data reaches the model's context |
| Electronic signatures | Human review steps attributable to a named person, structurally separate from generation |

*Table 1: Each Part 11 requirement maps to a concrete constraint on agent architecture.*

Two implications follow. First, compliance cannot be bolted on afterward — a system built for free-form autonomy has no seam where you can insert an audit trail retroactively. Second, predicate rules still apply: if your SOPs require independent QC of derived datasets, an agent producing the dataset does not change that obligation. The agent is a new author, not a new rule.

## Architecture decides, not the model

The least intuitive finding in my own work on this problem: for a given model, the surrounding architecture is the decisive reliability factor. In the GxP-Agent experiments, the same model that scored 0% on an ADaM derivation task in a free-form agent loop reached 100% structural match when placed inside a fixed process DAG. Model tier still matters — but it matters *within* a sound architecture, not instead of one. The details are in [Why LLM Agents Fail at Regulated Programming](/blog/why-llm-agents-fail-regulated-programming.html).

The two patterns side by side:

![Free-form agent loop versus constrained typed workflow](/figures/llm-agents-clinical-trials-reality-architecture.svg)

*Figure 1: A free-form loop chooses its path at runtime; a constrained workflow fixes the path, types the artifacts, and puts deterministic gates between steps.*

The constrained pattern has a concrete shape. Decomposition and ordering are predetermined by domain knowledge — the model does not discover the workflow at runtime. Each step produces a typed, versioned artifact, and deterministic validation gates check those artifacts with fixed assertions that never involve sampling. Tools stay thin and stateless; domain expertise lives in testable skill packages with rule files a senior programmer can read and sign off on. That second property — reviewability by a domain expert rather than a software engineer — is what makes the validation story work, and it is the subject of [the five-layer architecture post](/blog/five-layer-architecture-clinical-agents.html).

The LLM still does real reasoning inside each step. What it can no longer do is skip verification, improvise new steps, or quietly reinterpret the specification.

## The vendor checklist

Bring these six questions to any vendor claiming agentic AI for submissions. You will know within one meeting what you are looking at:

| Ask this | A real answer sounds like | Red flag |
|---|---|---|
| "Run the same task twice. Are the outputs identical?" | "The workflow path is; LLM-written prose may vary, derived data cannot" | "The model is very consistent" |
| "Show me the audit trail export" | A structured log of every call: timestamps, inputs, outputs, artifact hashes | A chat transcript |
| "Where does generation end and verification begin?" | Separate contexts or processes, with deterministic gates between them | "The agent double-checks its work" |
| "What happens on malformed input?" | A validation gate fails loudly, and the failure is logged | "The agent figures it out" |
| "How do I validate this for Part 11?" | Versioned fixed workflows plus testable rule sets your team can review | "We re-prompt until it behaves" |
| "Where does my data go?" | PHI/PII masked before model context; access controls documented | "It's encrypted in transit" |

*Table 2: Six questions that separate deployable systems from demo-ware.*

Better yet, run a thirty-minute bake-off with your own data. Same task twice — compare the artifacts, not the prose. One deliberately malformed input — watch whether it fails loudly or hallucinates a fix. Then ask for the audit export and check whether you could reconstruct every step without the vendor in the room. A real system survives this. Demo-ware does not.

## Key takeaways

- A demo proves a model can produce plausible output once; deployability requires replayability, audit trails, and deterministic gates.
- 21 CFR Part 11 reads as a design spec: validation, audit trails, record protection, access control, and signatures each map to an architecture constraint.
- For a given model, architecture is the decisive reliability factor — constrained typed workflows beat free-form agent loops in regulated programming.
- Generation and verification must live in separate contexts; an agent that checks itself is grading its own homework.
- Six questions — replay, audit export, verification isolation, malformed input, the validation story, and data handling — expose demo-ware in a single meeting.

## FAQ

### Are LLM agents allowed in GxP-regulated clinical programming?

Nothing in 21 CFR Part 11 or GCP prohibits LLMs; the regulations are technology-neutral about tools and specific about controls. What must hold is validated systems, complete audit trails, and attributable human review. An agent architecture that satisfies those is defensible, and one that cannot produce a trail is not — regardless of model quality.

### Does setting temperature to zero make an LLM deterministic?

No. Temperature zero reduces sampling randomness but does not guarantee identical outputs across runs, versions, or infrastructure. Even a perfectly deterministic model would not fix the deeper problem: a free-form agent still chooses its own workflow path at runtime. Determinism has to come from the architecture — fixed workflows and deterministic gates — not from a decoding parameter.

### What is the difference between an AI assistant and an AI agent in clinical programming?

An assistant drafts while you drive: code suggestions, log explanations, a first pass at a derivation, with a human initiating each step. An agent plans and executes multi-step work itself, which is exactly where replayability and audit-trail requirements start to bite. The compliance burden scales with autonomy, so the architecture questions in this post matter most for anything marketed as "agentic."

### Can LLM-generated code go directly into a regulatory submission?

Only through the same controls as any other code: independent QC, review by a qualified person who takes responsibility for it, and a retained record of how it was produced. Predicate rules do not change because a model wrote the first draft. Treat LLM output as work from a fast junior programmer — useful, and never submitted unreviewed.

## Go deeper

Two posts on this blog cover the architecture side in detail:

- [Why LLM Agents Fail at Regulated Programming — and How a Process DAG Fixes It](/blog/why-llm-agents-fail-regulated-programming.html): the failure modes of free-form loops and the benchmark numbers behind the DAG result.
- [Thin MCP, Thick Skills: A Five-Layer Architecture for Clinical Programming Agents](/blog/five-layer-architecture-clinical-agents.html): how to package domain expertise so it stays testable, auditable, and agent-agnostic.

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/llm-agents-clinical-trials-reality.html
