---
title: "Pipeline as Code: Automating the SDTM-to-ADaM-to-TLF Chain"
date: 2026-08-30
description: "How to turn the SDTM-to-ADaM-to-TLF chain into pipeline as code: explicit dependencies, pinned environments, hash-verified outputs, and stage-level failure isolation."
tags: ["clinical-sas", "sce", "pipeline", "reproducibility", "sdtm"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 13
canonicalPath: /blog/pipeline-as-code-sdtm-adam.html
draft: true
---

It is 17:00 on a Tuesday. Data management reissues DM with three corrected records; the ADaM programmer reruns the library by hand, in the right order, and the datasets refresh, while the TLF programmer reruns two tables, decides the listings "don't touch DM," and goes home. The package sent Wednesday mixes two vintages of analysis data, and nobody notices until a number in the safety appendix disagrees with the demographics table. The run order lived in one person's head, and that is the failure pipeline-as-code removes.

> **TL;DR** — The SDTM-to-ADaM-to-TLF chain is a dependency graph, and most rerun disasters come from executing it from memory. Pipeline as code makes the dependencies explicit, gives the study one entry script, pins the environment, and hashes every output so a rerun claim is checkable. This part shows the pattern, where it lives in a cloud SCE, and how it isolates failures to a single stage.

## The fundamentals

### The chain is a DAG

Every clinical programmer knows the shape: raw data feeds SDTM, SDTM feeds ADaM, ADaM feeds TLFs. What the folder view hides is that this is a directed acyclic graph. ADaM datasets depend on specific SDTM domains, each TLF depends on specific ADaM datasets, and a change anywhere upstream invalidates everything downstream of it. The dependency structure is real whether or not anyone writes it down.

When the structure lives only in a run sheet, a macro list, or a veteran's head, three traps follow:

- **Missed downstream runs.** An upstream dataset is refreshed; a far-downstream output is forgotten; the package mixes vintages.
- **Order drift.** Programs run in folder-listing order rather than dependency order; intermediate datasets get built from stale inputs.
- **Untracked knowledge.** The one person who knows the order takes leave, and the study stalls or silently misruns.

### What pipeline as code means

The fix is to make the graph executable. Pipeline as code is three commitments:

1. **Dependencies are declared, in a file, next to the code**: not in a document, not in memory.
2. **One entry script** can rebuild any output from its dependencies: `make output/tlf/t_14_1_1.rtf` and nothing else.
3. **The runner, not the human, decides order and scope.** Change SDTM.DM, and the runner, not you, computes that ADSL, ADAE, and every dependent table are stale.

A make-style rule file for Study XYZ is the clearest expression of the idea:

```bash
data/sdtm/dm.xpt data/sdtm/ae.xpt: programs/sdtm/*.sas raw/*.csv
	sas programs/sdtm/build_sdtm.sas

data/adam/adsl.xpt: data/sdtm/dm.xpt data/sdtm/ex.xpt programs/adam/adsl.sas
	sas programs/adam/adsl.sas

output/tlf/t_14_1_1.rtf: data/adam/adsl.xpt data/adam/adae.xpt
	sas programs/tlf/t_14_1_1.sas
```

Make is old technology, and that is the recommendation: the pattern predates every platform now selling it back to you. Modern runners and CI systems add triggers, logs, and artifacts; the idea is identical.

| Aspect | Manual run sheet | Pipeline as code |
|---|---|---|
| Run order | Human memory or a document | Computed from declared dependencies |
| Partial rerun | "Run everything, to be safe" | Stale outputs, and only those, rebuild |
| Provenance | Log files, if kept | Every run stamped: inputs, code, environment |
| Onboarding | Shadow someone for weeks | Read the pipeline file |
| Failure cost | The same mistake repeats weekly | Fixed once, in the graph |

*Table 1: The same study operation, run-sheet style versus pipeline style.*

## The modern workflow

### Pin the environment

A pipeline that runs differently on different machines is not a pipeline. Pinning means each run executes on a declared stack: the SAS maintenance release, R with an `renv` lockfile, Python with pinned `requirements.txt`. Cloud SCEs make this a first-class concept: each project, and often each pipeline stage, carries its compute environment as configuration, so "works in my workspace" stops being a category of excuse. Part 1 called this the run record's environment stamp; here is where it is earned.

Pinning also changes what a reviewer can do. When a three-year-old output is questioned, the manifest says which engines built it, and the SCE can stand up that environment again for a replay. Without the pin, the honest answer about how an output was produced degrades with every workstation refresh and every SAS site update, which is the old stack's failure mode wearing a new badge.

### Hash every output

A rerun claim should be checkable. The pattern: each stage writes a manifest recording the hash of every input it read and every output it produced. Study XYZ's ADaM stage does it in a few lines:

```python
import hashlib, json, pathlib
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
manifest = {
    "stage": "adam/adsl",
    "inputs":  {"dm.xpt": sha("data/sdtm/dm.xpt"),
                "ex.xpt": sha("data/sdtm/ex.xpt")},
    "outputs": {"adsl.xpt": sha("data/adam/adsl.xpt")},
    "environment": "sas 9.4m8 / r 4.4-renv / python 3.11",
}
pathlib.Path("runs/adsl_2026-08-30.json").write_text(json.dumps(manifest, indent=2))
```

Two capabilities come out of this habit. First, QC compares manifests instead of trusting timestamps: if an input hash changed and the output hash did not, someone skipped a rerun, and the mismatch is mechanical rather than investigative. Second, the inspection answer becomes "here is the exact data and code that produced this output": the run-record property from Part 1, now enforced per stage instead of per study.

### Where the pipeline lives in a cloud SCE

The pipeline file and the entry script belong in the same repository as the programs, reviewed in pull requests like any other code: the workflow Part 12 established. The SCE supplies the execution: the launcher runs the entry script in the pinned environment against the study's data connections, and every execution lands in run history with its stamps. Teams that want commit-triggered rebuilds connect the repository to a CI job; the SCE's scheduler can often do the same without an external system. Either way, the pipeline is versioned with the study, and an old run can be replayed from its record.

### Failure isolation

The operational payoff shows up on bad days. When a stage fails (a validation check trips in ADAE, say), the DAG gives you two lists, and only two: the outputs downstream of the failure, which are now suspect, and everything else, which stands. You fix and rerun one stage; the rest of the study holds its evidence. Tuesday's DM correction becomes a ten-minute scoped rebuild instead of an evening of re-running programs whose relationship to DM nobody was sure about.

The monolithic master macro offers the opposite deal: any failure anywhere means rerunning everything, usually overnight, usually discovering the next failure in the morning. Rerunning everything is also its own risk. Every unnecessary execution is another chance to fold in an unrelated drift. Scope discipline is a safety property in its own right.

For validated legacy macro libraries, you do not have to open them to get here. A wrapper layer can keep the library untouched while the pipeline drives it: the approach I described in [non-destructive modernization of a validated SAS library](/blog/non-destructive-legacy-modernization-sas.html), where a metadata layer wraps legacy macros and proves parity cell by cell. And when someone quotes you dramatic efficiency numbers for pipeline automation, ask what grade of evidence backs them; the published evidence base is thinner than conference talks suggest, as [the automation evidence review](/blog/evidence-automation-clinical-statistical-programming.html) shows.

## The agentic way

Agents are good at exactly the tedious parts of pipeline work: drafting rule files from program headers, diagnosing a failed run from its log, proposing the minimal rerun scope after a data correction. The failure mode is invented certainty, where an agent adds a dependency edge that feels right, or "fixes" a tripped check by weakening it, and presents either with full confidence. The graph is the study's ground truth: agents may propose edits to it, humans review those edits like any diff, and the gates stay deterministic. This is the process-DAG argument in work clothes — fix the workflow, let the model operate inside it — and the structural case is [why LLM agents fail at regulated programming](/blog/why-llm-agents-fail-regulated-programming.html).

<div class="era-callout">
  <p><strong>The agentic way</strong> — An agent can own the plumbing: draft the dependency rules, watch the run, triage the log, propose the fix. The failure mode is silent graph editing — a dependency added, a check relaxed, nothing in review. Protect the pipeline file the way you protect programs: every agent-proposed change is a diff a human merges, and gates never lose strictness without a recorded decision.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

## Key takeaways

- The SDTM-to-ADaM-to-TLF chain is a DAG; rerun disasters come from executing it from memory instead of from a file.
- Pipeline as code = declared dependencies + one entry script + a runner that computes order and rerun scope.
- Pin the environment per stage (SAS release, R with renv, Python with requirements) so runs are portable by construction.
- Hash inputs and outputs into per-stage manifests; QC compares hashes, and skipped reruns become mechanical mismatches.
- Isolation is the payoff: one failed stage reruns alone, while the monolithic master macro reruns the world.

## FAQ

### Does this replace the study master macro?

Not immediately, and maybe never. The master macro encodes validated logic; the pipeline wraps and orders it. A common path is to keep the macro library untouched, drive it from the pipeline, and let new development happen in pipeline-native stages. What retires is the master macro's role as run-order memory, which was always the wrong job for it.

### Do I need a CI server?

No. A cloud SCE gives you most of CI (scheduled and on-demand executions in pinned environments, with run history) without a separate system. A CI service earns its place when you want commit-triggered rebuilds and cross-study dashboards. Start with the SCE launcher; add CI when the pain is specific.

### How do hash manifests work with SAS datasets?

The format does not matter. XPT, SAS7BDAT, and parquet all hash the same way: read the bytes, take SHA-256, store the digest. What matters is that the hash is taken at run time by the pipeline, not by hand later, and that QC reads the manifest rather than comparing folder timestamps.

### Does the pipeline itself need qualification?

The pipeline is process tooling around GxP-relevant outputs, so give it a risk-based look: the runner and its configuration affect what gets built and what gets missed, which argues for review, versioning, and testing of the pipeline file itself. How formal that becomes depends on your organization's computer-system-validation posture; the same reasoning Part 14 applies to AI tooling applies here.

---

**Series navigation** — Previous: [Part 12: Git for SAS Programmers](/blog/git-for-clinical-programmers.html) · Next: [Part 14: AI in Validated Environments](/blog/ai-in-validated-environments.html)

Back to [Part 1: Statistical Computing Environments](/blog/sce-statistical-computing-environment-guide.html) for the platform layer these pipelines run on.
