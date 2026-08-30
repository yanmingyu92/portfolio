---
title: "Why LLM Agents Fail at Regulated Programming — the Process-DAG Fix"
date: 2026-08-20
description: "Free-form agent loops break down in GxP clinical programming. Structuring the work as a typed process DAG makes LLM agents reliable, replayable, and auditable."
tags: ["llm-agents", "clinical-trials", "gxp", "statistical-programming"]
kind: deep-dive
canonicalPath: /blog/why-llm-agents-fail-regulated-programming.html
paperRef: gxp-agent
---

Point a general-purpose LLM agent at a real clinical programming task — derive an ADaM dataset, generate the TLFs, QC them independently — and it will often produce output that *looks* right. In a GxP environment, "looks right" is worse than obviously wrong: the failure surfaces during a regulatory review instead of a unit test.

After two years of building agentic systems for clinical trial statistical programming (ClinAgent, GxP-Agent, CAVE-Onc), I've converged on one structural finding: **architecture is the decisive factor for a given model. The same model that scores 0% in a free-form loop can reach 100% structural match inside a fixed process DAG — though model tier still matters once the DAG is in place.**

> **TL;DR** — Free-form agent loops fail regulated programming because they cannot replay a run, isolate verification from generation, or enforce typed handoffs between steps. Organizing the work as a fixed process DAG — typed nodes, versioned artifacts on every edge, deterministic validation gates — makes LLM output replayable and auditable, and in the GxP-Agent experiments it moved the same model from 0% free-form success to 100% structural match.

## Why free-form agent loops break

A ReAct-style agent loop decides what to do next at runtime. That is a feature for open-ended research and a liability for regulated programming, for three concrete reasons:

- **No replayability.** Run the same task twice and the agent may take different paths. When an auditor asks "how was this output produced?", the honest answer is "it depends on the sampling."
- **No isolation.** When planning, generation, and verification share one context window, the model grades its own homework. Confirmation bias is baked in.
- **No typed handoffs.** The "specification" the code generator sees is whatever the planner happened to write in prose. Schema drift accumulates silently across steps.

The differences are structural, not cosmetic:

| Property | Free-form agent loop | Process DAG |
|---|---|---|
| Next step | Chosen by the model at runtime | Fixed by the graph topology |
| Replayability | Sampling-dependent, paths diverge | Re-run yields the same path |
| Verification | Model checks its own output | Isolated deterministic gates |
| Step handoff | Prose written by the planner | Typed artifact with a schema |
| Audit trail | Transcript, if one is kept | Every edge artifact is logged |

*Table 1: The failure modes of free-form loops map one-to-one onto properties a process DAG enforces by construction.*

## The process-DAG topology

The fix is to stop letting the agent choose the workflow. In GxP-Agent, the workflow is a **process DAG** — a fixed graph of typed nodes (INGEST, MERGE, DERIVE, DERIVE_DATE, VALIDATE, METADATA, EXPORT). For an ADaM dataset like ADSL, the DAG is a concrete chain — `ingest → merge_dm → derive_treatment_vars → … → validate → apply_metadata → export` — where decomposition and ordering come from domain knowledge, not from the LLM improvising at runtime.

![Process DAG for ADaM ADSL derivation: typed nodes from ingest to export, connected by versioned .rds artifacts, with deterministic validation gates](/figures/why-llm-agents-fail-regulated-programming-dag.svg)

*Figure 1: The GxP-Agent process DAG for ADSL. The LLM reasons inside each node; the topology, the typed artifacts on each edge, and the validation gates are fixed.*

Each stage has a narrow contract:

1. **Ingestion and merging** — source SDTM data is loaded and merged into typed, versioned `.rds` artifacts.
2. **Derivation** — each derivation node generates R code (pharmaverse: admiral, metacore, metatools, xportr) that runs in an isolated R subprocess and saves its own versioned artifact.
3. **Validation** — deterministic gates run domain-specific R assertions over the artifacts (12 assertions for ADSL, at record, variable, and business-rule level), plus a post-execution column check.
4. **Metadata and export** — metadata is applied and the dataset is exported, each step again producing a traceable artifact.

Each edge carries a typed artifact with a schema, and a node can only consume what its incoming edges provide. The LLM still does the reasoning inside each node — but it can no longer skip verification, invent new steps, or quietly re-interpret the spec.

## What the DAG buys you

Four properties fall out of the topology, and each one answers a failure mode from Table 1:

- **Replayability.** The DAG is data. Re-run it and you get the same path, every time.
- **Auditability.** Every artifact on every edge is logged — that log *is* your GxP evidence trail, produced as a byproduct rather than reconstructed after the fact.
- **Measurability.** Because the structure is fixed, you can benchmark node-level accuracy and find the weak link instead of arguing about end-to-end vibes.
- **Deterministic verification for free.** Validation gates run fixed, domain-specific assertions over every artifact, so the check never depends on a model's sampling.

## Where the failures actually live

The measurability point pays off immediately. In the preprint's per-node analysis, the weak links are the derivation nodes — disposition and completion derivations — and the downstream metadata and export nodes that cascade their errors. That is actionable information: you know exactly which nodes need better prompts, more context, or human review, instead of staring at a single pass/fail score.

Two caveats keep the headline honest. First, 100% is a *structural* match — the DAG topology constrains the shape of the solution, which is precisely what regulated work needs, but it is not a claim that every derived value is correct without QC. Second, model tier still matters under the DAG: the architecture rescues a model from chaos, it does not make a weak model strong. The claim is that for a given model, topology is the largest controllable factor — not that models are interchangeable.

## Key takeaways

- Free-form agent loops fail GxP work structurally: no replayability, no isolation between generation and verification, no typed handoffs.
- A process DAG fixes the workflow in advance — typed nodes, schema-checked artifacts on every edge, deterministic validation gates — so the LLM reasons inside constraints instead of above them.
- In the GxP-Agent experiments, the same model moved from 0% success in a free-form loop to 100% structural match inside the DAG, while model tier still affected results under the DAG.
- Per-node benchmarking turns agent quality from a vibe into an engineering target: derivation nodes are the weak link, and their errors cascade downstream.
- In regulated domains, constrain the model inside an inspectable structure — put the LLM inside the graph, never above it.

Full technical details are in the [GxP-Agent preprint](/papers/gxp-agent.html) (arXiv) and the peer-reviewed [ClinAgent methodology paper](/papers/clinagent-methodology.html) in *Biology Methods and Protocols*.
