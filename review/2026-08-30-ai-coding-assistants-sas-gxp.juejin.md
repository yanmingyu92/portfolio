# AI Coding Assistants for Clinical Programmers: What Works in GxP

<!-- Wechatsync target: Juejin. Canonical: https://jaimeyan.com/blog/ai-coding-assistants-sas-gxp.html -->

Last month I asked an AI assistant to write the header block for a SAS macro — purpose, parameters, assumptions, an example call. It produced a clean, correctly formatted block in under a minute. I edited two lines and moved on. That afternoon, the same tool gave me a `PROC LIFETEST` call with an option that does not exist in the procedure. Confident tone, plausible name, wrong. Same tool, same day: one hour saved, one near-miss. That split is the whole story of AI coding assistants in clinical programming.

> **TL;DR** — Assistants like ChatGPT, Claude, and Copilot are reliable drafters and unreliable deciders. They save real time on boilerplate, macro documentation, QC-spec first drafts, and code review. They fail on hallucinated procedure options and on anything whose correctness must be proven rather than read. Use them to draft, gate every output with deterministic checks, and archive the evidence.

## Where assistants genuinely save time

The tasks that work share one property: correctness is cheap to verify by reading. You were going to read the header comment anyway. If the assistant writes it in one minute instead of you writing it in twenty, that is found time with no added risk.

| Task | Why it works | What to watch |
|---|---|---|
| Program and macro header documentation | Formulaic text you will read before signing | Invented parameter defaults and assumptions |
| Boilerplate: libnames, options, program shells | High repetition, low novelty | Engine- or site-specific options written wrong |
| First-draft QC specs from a shell TLF | Structured rewrite of input you provided | Misread derivation intent, silently dropped rules |
| Code-review checklists | Redirects reviewer attention; a human still decides | False positives that burn review time |
| Log triage: find errors, unexpected notes | Pattern matching over long, boring text | Benign notes flagged as defects |
| SAS-to-R reading translations | Helps you understand legacy code faster | MERGE-vs-join semantics differ without complaint |

*Table 1: Tasks where assistants pay off immediately, and the failure mode each one still carries.*

Notice what is not on the list: derivation logic, TLF generation, anything headed to a submission. Also notice the caveat that hangs over all of it — SAS and clinical R (admiral, metacore) are thin slices of public training code compared with Python or JavaScript. The confident-error rate is higher than mainstream-language demos would lead you to believe.

## Where they fail

Three failure modes show up over and over in practice.

- **Hallucinated procedure options.** The model completes syntax by plausibility, not by consulting the SAS documentation. A nonexistent `PROC LIFETEST` option looks exactly as confident as a real one. The same thing happens with admiral function signatures, which have shifted across package versions — the model blends them.
- **Version drift.** SAS 9.4 versus Viya/CAS, older admiral releases versus current ones. The assistant rarely tells you which version it thinks it is writing for, and mixing idioms produces code that compiles in one environment and breaks in another.
- **Unverifiable output.** When the assistant writes a number — a count, a p-value, a summary stat — you cannot trust it because the prose sounds sure. The only way to believe a number is to recompute it deterministically from the data. At that point the assistant contributed nothing to the number itself.

The dangerous failure is not the obvious crash. It is the plausible-but-wrong result that survives a casual read and surfaces later — in QC, in review, or in an inspection.

## Why "unverifiable" is the real problem in GxP

In a regulated workflow, every output carries an implicit question: show me how this was produced and checked. "I asked ChatGPT and it looked right" is not an answer an auditor accepts, and it should not be an answer you accept from yourself.

This is the same structural problem I wrote about in [why LLM agents fail at regulated programming](/blog/why-llm-agents-fail-regulated-programming.html): no replayability, no isolation between generation and verification, and the model effectively grading its own homework. Pasting code into a chat box with no process around it is a free-form agent loop of one — it inherits every one of those failure modes.

## A working pattern: draft, gate, sign

The pattern that works treats the assistant as exactly one step in a pipeline that was deterministic before and stays deterministic after.

![Draft-gate-sign workflow for AI assistants in GxP programming](/figures/ai-coding-assistants-sas-gxp-workflow.svg)

*Figure 1: The assistant works only at the drafting step. Every step after it — the gate, the sign-off, the archive — is deterministic or human.*

```
1. Freeze the spec        — human-written, versioned
2. Assistant drafts code  — prompt stored alongside the code
3. Deterministic gate     — compile + assertions + QC compare
4. Human review           — reads gate evidence, not prose
5. Archive                — prompt, output, model version, gate log
```

*Listing 1: The draft-gate-sign loop. The assistant never touches steps 3–5.*

Three rules make this hold up. First, the gate is ordinary validation machinery — compilation, assertions, independent QC comparison — the same checks you would run on a colleague's code. Second, the assistant never sits inside the gate; verification stays model-free. Third, every regeneration re-runs the gate, because "it passed last time" means nothing after the code changes.

A few ground rules around the edges:

- Treat generated code as a first draft from a fast, careless junior programmer. You would not submit it unreviewed from them either.
- Pin the model, version, and prompt with the code in version control. Six months later, that is your process record.
- Never paste patient-level data or confidential protocol text into an external tool without your organization's explicit clearance.
- Check your company's policy before assuming any specific tool is permitted — policies differ and they change.

In my own work, this pattern scales up into a typed process DAG where the whole pipeline — not just one task — is fixed in advance, each step producing a traceable artifact. The [GxP-Agent preprint](/papers/gxp-agent.html) covers that architecture; the draft-gate-sign loop above is the same idea at the scale of a single programmer's day.

## Key takeaways

- Use AI assistants as drafters, not deciders: boilerplate, headers, QC-spec first drafts, and review checklists are the sweet spot.
- Expect hallucinated SAS procedure options and version-mixed admiral calls; never run generated code without compiling and checking it yourself.
- In GxP work, plausible-but-wrong is worse than obviously broken because it survives casual review and fails at inspection.
- Wrap every assistant interaction in a deterministic gate — compile, assertions, QC compare — plus human sign-off and an archived prompt-and-output trail.
- The assistant must never sit inside the verification step; verification stays deterministic and model-free.

## FAQ

### Can I use ChatGPT or Copilot for GxP-regulated SAS programming?

Yes, as a drafting aid — many organizations allow it under internal policy, and yours decides which tools are permitted. The generated code still goes through the same validation, QC, and human review as hand-written code. The assistant does not change your validation obligations; it changes who typed the first draft.

### Which tasks are safest to hand to an AI coding assistant?

Anything whose correctness you can verify by reading: header documentation, boilerplate, comment blocks, review checklists, and log triage. The more an output must be recomputed against data to be believed, the less you should trust the assistant's version of it.

### Why do AI assistants invent SAS procedure options that do not exist?

SAS is a small share of public training code compared with Python or JavaScript, so models hold weaker, blurrier knowledge of procedure syntax. They complete patterns by plausibility, which means a nonexistent option can look exactly as confident as a real one.

### Do I need to validate the AI assistant itself under GxP?

The pragmatic position most teams take: validate the process, not the model. Deterministic gates, independent QC, and archived prompts make the assistant's contribution inspectable without pretending to "validate" a black-box model you do not control. Confirm the approach with your QA group before relying on it.

### How do I make AI-assisted code auditable?

Store the prompt, the model and version, the raw output, and the gate log alongside the final code in version control. When someone asks how the code was produced, you show a process record instead of a chat screenshot.

## Go deeper

- [Why LLM Agents Fail at Regulated Programming — and How a Process DAG Fixes It](/blog/why-llm-agents-fail-regulated-programming.html) — the structural argument behind the draft-gate-sign pattern.
- [GxP-Agent: Process-DAG Topology for Reliable Clinical Trial Programming](/papers/gxp-agent.html) — how a typed process DAG makes LLM-driven clinical programming replayable and auditable end to end.

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/ai-coding-assistants-sas-gxp.html
