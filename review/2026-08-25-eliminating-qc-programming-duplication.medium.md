# Medium import draft — Double Programming Without the Duplication: AI-Generated Independent QC Code

## How to publish (Medium killed its public API, so import is the supported path)

1. Open the import tool: https://medium.com/p/import
2. Paste the canonical URL: https://jaimeyan.com/blog/eliminating-qc-programming-duplication.html
3. Medium will fetch the post and set the canonical link back to jaimeyan.com automatically.
4. If the import fetch fails (JS-rendered page), copy the body below into a new
   story instead, then set the canonical link manually via
   Story settings -> Advanced settings -> "This story was originally published elsewhere".
5. Add tags manually (Medium allows 5): qc-programming, clinical-trials, llm-agents, adam, validation
6. Review formatting, then Publish.

## Post body (fallback copy-paste source)

Canonical: https://jaimeyan.com/blog/eliminating-qc-programming-duplication.html

---

Every statistical programmer knows this scene. The production programmer finishes the ADaM dataset. Then a second programmer — the QC programmer — opens the *same* specification and writes the *same* derivations again, from scratch, deliberately without looking at the production code. Both parse identical specs. Both implement the same edge-case handling. QC effort scales linearly with production effort, and one estimate puts it at 30–50% of total programming effort (Lyons & Bae, PharmaSUG 2023).

That duplication is the price we pay for independence. In our PharmaSUG 2026 paper (AI-201, with Jason Zhang), we asked: can an AI agent generate the QC side of that pair — while keeping the operational independence that makes double programming meaningful?

## The independence problem with AI

The naive version of "AI writes the QC code" fails immediately: if the QC instance sees the production code, it's not independent QC, it's copy-editing. And there's a subtler problem — if both instances share model weights, they'll tend toward the same systematic misreadings of the spec. That's the common-cause failure problem from the N-version programming literature, applied to LLMs.

So the framework enforces **operational separation at the infrastructure level**: separate API sessions with distinct credentials and IAM roles, input isolation (the QC instance receives only specifications and SDTM data; production artifacts are blocked), and audit logging of all inputs, outputs, model versions, and skill versions. The human QC programmer remains the genuinely independent judgment layer — the paper is explicit that this is what mitigates same-model bias, not the second AI instance itself.

## Three mechanisms that make it auditable

Before any code is written, three author-built components shape the agent's work:

- **QC Trace Tree.** The agent must produce a structured tree — one node per derived variable, with spec source, extracted logic, edge cases, flagged ambiguities, and verification criteria — *before* generating code. This inverts traditional code review: intent is stated explicitly, and the reviewer checks that code matches stated intent.
- **Decision Router.** A four-gate pipeline (spec AI-readiness → ADaM class → per-variable complexity → risk override) that routes each dataset to full AI generation, AI with enhanced review, or manual QC.
- **Automated code review engine.** A static analysis tool checking 22 rules across 7 SOP categories, including hardcoding detection and — critically — ground-truth data leakage detection.

The trace tree looks like this in practice (ADSL excerpt):

```text
ADSL QC Trace Tree (31 nodes)
|-- TRTSDT [Spec: 3.1 Row 10] (standard)
|   |-- Source: SDTM.EX.EXSTDTC
|   |-- Logic: MIN(datepart(EXSTDTC)) per USUBJID
|   |-- Edge cases: partial dates -> FLAGGED (spec silent)
|   |-- Ambiguities: 1 (partial date handling)
|   +-- Verify: type=date, TRTSDT <= TRTEDT
```

The human reviews the tree, resolves flagged ambiguities, and only then does code generation proceed — with code comments referencing tree nodes.

## What the benchmark showed

We evaluated against the CDISCPilot01 eSubmission Benchmark: 254 ITT subjects, 5 ADaM domains (ADSL, ADAE, ADADAS, ADLBC, ADTTE). Across 138 trace tree nodes and 51,294 matched records:

- **Variable-level match against ground truth: 97.1%–100.0%** across the five domains. ADTTE hit 100% (6/6 variables); ADADAS was lowest at 97.1%.
- **All 13 property-based assertions passed** (e.g., TRTSDT ≤ TRTEDT, BASE = AVAL at baseline, CNSR ∈ {0,1}).
- The router sent 4 of 5 datasets to full AI generation; ADSL went to enhanced review (5 complex/custom variables, 6 ambiguities).
- The code review engine found **207 findings across 7 SOP categories, including 1 high-severity data leakage risk** — the agent had read the ground-truth ADSL to infer an unspecified SITEGR1 pooling threshold. Exactly the independence violation the engine exists to catch.

Every remaining mismatch traced to a specification ambiguity the trace tree had flagged before code generation: visit windowing rules (ADADAS AVISITN at 90.9%), baseline visit selection (WEIGHTBL at 93.7%), coding conventions (ANRIND at 96.2%).

On efficiency: the full run took about 84 minutes end-to-end for all 5 datasets, of which 46 minutes (55%) was human review of trace trees. Practitioners familiar with these datasets estimate manual QC at 3–5 programmer-days — so roughly one day of human–AI collaboration versus several, though that comparison needs real-world validation.

## What I'd be careful about

The manuscript is honest about the limits, and so am I:

- **One benchmark, one model.** CDISCPilot01 specs scored 5/6 on our AI-readiness checklist — cleaner than most production specs. Results with other LLMs and messier specs are unknown.
- **The router misjudged ADADAS.** It routed the dataset with the lowest match rate (97.1%) to *full* AI generation, same as ADTTE at 100%. LOCF imputation plus non-trivial visit windowing deserves enhanced review even when per-variable complexity counts look low. The thresholds need recalibration.
- **Same-model bias is real.** Two Claude instances are not statistically independent reasoners. The human reviewer is the independence, and AI-generated code must always be reviewed by qualified programmers before regulatory use.

The practical takeaway: the value of double programming was never the duplicated typing — it's the independent interpretation of the spec. If a trace tree surfaces the ambiguities and a human resolves them, you keep that value and drop the re-typing.

Full details, including the decision router breakdown and the complete code review rule reference, are in the [full paper](/papers/pharmasug-2026-ai-201.html) from PharmaSUG 2026. The experiment code is public at [github.com/yanmingyu92/ai-qc-code-generation](https://github.com/yanmingyu92/ai-qc-code-generation).
