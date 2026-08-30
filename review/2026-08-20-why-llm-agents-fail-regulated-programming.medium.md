# Medium import draft — Why LLM Agents Fail at Regulated Programming — and How a Process DAG Fixes It

## How to publish (Medium killed its public API, so import is the supported path)

1. Open the import tool: https://medium.com/p/import
2. Paste the canonical URL: https://jaimeyan.com/blog/why-llm-agents-fail-regulated-programming.html
3. Medium will fetch the post and set the canonical link back to jaimeyan.com automatically.
4. If the import fetch fails (JS-rendered page), copy the body below into a new
   story instead, then set the canonical link manually via
   Story settings -> Advanced settings -> "This story was originally published elsewhere".
5. Add tags manually (Medium allows 5): llm-agents, clinical-trials, gxp, statistical-programming
6. Review formatting, then Publish.

## Post body (fallback copy-paste source)

Canonical: https://jaimeyan.com/blog/why-llm-agents-fail-regulated-programming.html

---

If you point a general-purpose LLM agent at a real clinical trial programming task — derive an ADaM dataset, generate a TLF, then QC it independently — it will often produce something that *looks* right. In a GxP environment, "looks right" is worse than obviously wrong, because the failure surfaces during a regulatory review instead of a unit test.

After two years of building agentic systems for clinical trial statistical programming (ClinAgent, GxP-Agent, CAVE-Onc), I've converged on one structural insight: **for a given model, architecture is the decisive factor — the same model that scores 0% in a free-form loop can reach 100% structural match inside a fixed DAG, though model tier still matters under the DAG.**

## Why free-form agent loops break

A typical ReAct-style agent loop decides what to do next at runtime. That's a feature for open-ended research, and a liability for regulated programming:

- **No replayability.** Run the same task twice and the agent may take different paths. Auditors ask "how was this output produced?" and the honest answer is "it depends on the sampling."
- **No isolation.** When planning, generation, and verification share one context window, the model grades its own homework. Confirmation bias is baked in.
- **No typed handoffs.** The "specification" the code generator sees is whatever the planner happened to write in prose. Schema drift accumulates silently.

## The process-DAG topology

The fix is to stop letting the agent choose the workflow. In GxP-Agent, the workflow is a **process DAG** — a fixed graph of typed nodes (INGEST, MERGE, DERIVE, DERIVE_DATE, VALIDATE, METADATA, EXPORT). For an ADaM dataset like ADSL, the DAG is a concrete chain of derivation steps — `ingest → merge_dm → derive_treatment_vars → … → validate → apply_metadata → export` — where decomposition and ordering are predetermined by domain knowledge, not discovered by the LLM at runtime:

1. **Ingestion and merging** — source SDTM data is loaded and merged into typed, versioned `.rds` artifacts.
2. **Derivation** — each derivation node generates R code (pharmaverse: admiral, metacore, metatools, xportr) that runs in an isolated R subprocess and saves its own versioned artifact.
3. **Validation** — deterministic validation gates run domain-specific R assertions over the artifacts (12 assertions for ADSL: record-level, variable-level, and business-rule-level), plus a post-execution column check.
4. **Metadata and export** — metadata is applied and the dataset is exported, each step again producing a traceable artifact.

Each edge in the DAG carries a typed artifact with a schema. A node can only consume what its incoming edges provide. The LLM still does the reasoning inside each node — but it can no longer skip verification, improvise new steps, or quietly re-interpret the spec.

## What this buys you

- **Replayability**: the DAG is data. Re-run it and you get the same path, every time.
- **Auditability**: every artifact on every edge is logged — that *is* your GxP evidence trail.
- **Measurability**: because the structure is fixed, you can benchmark node-level accuracy and find the weak link (in the preprint's per-node analysis: the derivation nodes — disposition and completion derivations — and the downstream metadata/export nodes that cascade their failures).
- **Deterministic verification for free**: validation gates run fixed, domain-specific assertions over every artifact, so the check doesn't depend on a model's sampling.

## The broader lesson

Agentic AI in regulated domains won't be won by bigger models alone. It will be won by *constraining* models inside structures that make their behavior inspectable. The same principle sits behind our graph-constrained validation work in CAVE-Onc: put the LLM inside the graph, never above it.

Full technical details are in the [GxP-Agent preprint](/papers/gxp-agent.html) (arXiv) and the peer-reviewed [ClinAgent methodology paper](/papers/clinagent-methodology.html) in *Biology Methods and Protocols*.
