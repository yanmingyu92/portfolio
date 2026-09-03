# Temperature 0 Doesn't Buy You Reproducibility

<!-- Wechatsync target: Juejin. Canonical: https://jaimeyan.com/blog/note-temperature-zero.html -->

A question I get every time I show an LLM-in-the-loop pipeline to statistical programmers: "can't you just set temperature to 0 and call it deterministic?"

No. Temperature 0 makes sampling *greedy*, not *stable*. You still get different outputs across model versions, across serving hardware, across batching conditions on the provider's side, and sometimes across identical back-to-back calls. The provider gives you no reproducibility contract — and "it worked on my laptop in March" is not a validation story.

The practical consequence for GxP work: **reproducibility has to live outside the model**. The patterns that hold up:

- The LLM proposes; deterministic code disposes. Let the model draft code or mappings, then execute and check them with fixed, non-LLM assertions.
- Version and hash every artifact the model touches, so a re-run that produces a different draft is *detected*, not silently absorbed.
- Fix the workflow, not the sampler. A typed process DAG with validation gates gives you replayability even when the model's internal choices drift — the path through the pipeline is data, not sampling luck.

The longer version, with the free-form-loop failure modes this avoids, is in [Why LLM Agents Fail at Regulated Programming](/blog/why-llm-agents-fail-regulated-programming.html).

---
原文发布于 jaimeyan.com: https://jaimeyan.com/blog/note-temperature-zero.html
