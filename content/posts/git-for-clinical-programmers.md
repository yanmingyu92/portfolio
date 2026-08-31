---
title: "Git for SAS Programmers: Version Control in a GxP World"
date: 2026-08-30
description: "Why filename-versioned SAS programs are an audit-trail liability, the minimum Git vocabulary a clinical programmer needs, and how branch-per-output maps to QC."
tags: ["clinical-sas", "sce", "git", "version-control", "gxp"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 12
skillArtifact: /skills/sce-study-bootstrap/SKILL.md
canonicalPath: /blog/git-for-clinical-programmers.html
draft: true
---

A submission package ships. Six weeks later a quality auditor points at one table and asks a plain question: which program version produced this, and what changed since the previous run? The study folder answers with a pile (`t_14_1_1.sas`, `t_14_1_1_final.sas`, `t_14_1_1_final_v2.sas`, `t_14_1_1_final_v2_JC.sas`) and nobody can say which copy ran; the honest answer lives in a log file nobody kept. Filename versioning is what most clinical teams use as an audit trail, and it is not one.

> **TL;DR** — Filename versioning fails as an audit trail because it cannot answer who changed what, when, and starting from what. Git answers those questions by construction. This part gives you the minimum vocabulary (clone, branch, commit, pull request, review), a branch-per-output workflow that maps onto programming and QC roles, and the rules for keeping data out of version control.

## The fundamentals

### Why the suffix pile is a liability

Four separate problems hide in that study folder:

- **No diff.** To see what changed between `_v1` and `_v2`, someone opens both files and compares by eye. In practice nobody does, so changes ship unreviewed.
- **Silent forking.** Two programmers fix two issues from the same base copy; both save "final" versions; one overwrites the other, or both survive and diverge.
- **Provenance is hearsay.** Which version produced the submitted output? The evidence is a log nobody archived, or a memory. Auditors prefer records.
- **"Final" always lies.** Every experienced programmer knows `_final` means "final until Friday."

The deeper issue is that the version suffix carries no enforced metadata. It is a label typed by a tired human at 6 p.m., with no author, no timestamp, no link to the output it produced, and no way to detect a later edit. An audit trail has to be something the system maintains; a suffix is something a person remembers to type.

### The minimum Git vocabulary

You need five words of Git to work in a modern SCE. Map them onto what you already know:

| Shared-drive habit | Git word | What it actually gives you |
|---|---|---|
| Copy the study folder to your machine | `clone` | A working copy plus the full change history |
| Save a new version of the file | `commit` | A timestamped change record: author, diff, message |
| Work on a copy without breaking shared state | `branch` | An isolated line of work, mergeable later |
| Email the folder for review | `pull request` | A proposed merge: diff visible, commentable, approvable |
| "Who changed this line?" asked into the void | `review` / `git log` / `git blame` | The answer, for every line, permanently |

*Table 1: The five-word Git vocabulary, mapped from shared-drive habits you already have.*

Study XYZ's daily loop is small enough to fit on one screen:

```bash
git switch -c tlf/t_14_1_1          # one branch per output
$EDITOR programs/tlf/t_14_1_1.sas   # make the change
git add programs/tlf/t_14_1_1.sas
git commit -m "t_14_1_1: denominator to SAF per spec v3"
git push -u origin tlf/t_14_1_1     # propose the change
gh pr create                        # or open the PR in the SCE UI
```

And the program header stops carrying the version story, because the repository owns it:

```sas
/* Study XYZ — t_14_1_1.sas (no suffix; history lives in Git) */
/* Purpose: AE summary by treatment group                      */
/* Change control: git log -- programs/tlf/t_14_1_1.sas        */
%include "setup.sas";               /* libnames, options        */

proc freq data=adam.adae;
  tables trta*aebodsys*aedecod / list;
run;
```

## The modern workflow

### Branch per output, mapped to roles

The pattern that maps cleanly onto clinical programming is one branch per deliverable: `tlf/t_14_1_1`, `adam/adsl`, `sdtm/ae-update`. The flow has four fixed points:

- `main` holds the released state: what the study currently reports.
- The production programmer branches, works, commits, and opens a pull request.
- The independent QC programmer (the other half of double programming) reviews the PR with the spec open, runs the QC comparison, and records the result on the PR itself.
- Merge is a release decision, made by a human, after the review evidence is on the record.

This is double programming with the evidence attached. Production code, QC program, QC output, and the review conversation live in one place, in one history, exportable when the inspection comes. On a cloud SCE this is also how the platform expects work to move: the repository and PR flow from [Part 1](/blog/sce-statistical-computing-environment-guide.html) are the substrate the whole study runs on.

### The pull request is the QC record

An approved PR answers, mechanically, the questions auditors ask: what changed (the diff), who reviewed it (the approval), when (timestamps), against what spec version (the PR description), with what QC evidence (the results recorded on the PR). Compare that with the shared-drive alternative (an email chain, a tracked-changes file, and hope) and the reason sponsors push Git becomes practical rather than fashionable. The reviewer's independence is the part worth protecting: the person who approves the PR should not be the person who wrote the branch, which is exactly the independence double programming already requires.

### What goes in the repository — and what never does

Code, specs, shells, documentation: yes. Data: never. Patient-level or even derived datasets do not belong in version control: they are large, they are access-controlled elsewhere, and putting them in Git quietly defeats the access model. A `.gitignore` file makes the rule enforceable rather than aspirational; Study XYZ's is five lines:

```gitignore
*.sas7bdat
*.xpt
*.csv
logs/
output/
```

Data reaches your session through the SCE's governed connections: the data layer from Part 1. Programs reference datasets by path or snapshot ID; run records tie each execution to the exact data snapshot it read. Nothing is lost relative to the shared drive, and access is scoped and logged instead of granted by drive letter.

### What actually changes

| Operational question | Shared-drive answer | Git answer |
|---|---|---|
| Which version ran? | Hopefully a log exists | The commit the run record stamps |
| What changed? | Open both files, compare by eye | The PR diff |
| Who reviewed it? | An email somewhere | The approval on the PR |
| Roll back a bad change? | Restore from a backup folder | Revert the commit |
| Onboard a new programmer? | "Ask her, she knows the folders" | Clone, read the history, start |

*Table 2: The same operational questions, answered two ways.*

The last row is underrated. On a Git-backed study, history is documentation: a new programmer reads the PR trail of a deliverable and learns what the program does and why it looks that way. The folder tree never carried that kind of context.

## The agentic way

Assistants change who types, and now who proposes: an agent can draft the program change, write the commit message, and open the pull request with a tidy description, all of it reviewable as a diff, which is why PR-based workflow and AI assistance fit together. The failure mode is approval by readability: a clean PR description on a diff nobody executed, reviewed by someone who trusted the summary. Keep the gate deterministic (the QC comparison and the checks run regardless of who or what wrote the code) and let a human approve on evidence, not prose. The drafting-versus-deciding split, with the failure modes spelled out, is in [AI coding assistants for clinical programmers](/blog/ai-coding-assistants-sas-gxp.html).

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents can draft the change, the commit message, and the pull-request description, which makes review faster and lazier at the same time. The failure mode is a plausible diff merged on prose confidence. The countermeasures are mechanical: agent-contributed changes ride the same branch-and-PR path as human ones, the deterministic gates run either way, and a human approves on gate evidence.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/sce-study-bootstrap/SKILL.md">
  <span class="skill-card-name">sce-study-bootstrap</span>
  <span class="skill-card-desc">The day-one companion from Part 1, including repo layout and branch-naming conventions for a new clinical study in a cloud SCE.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- Filename versioning is not an audit trail: no diff, no provenance, silent forking, and "final" is a label a tired human typed.
- Five Git words cover the clinical workflow (clone, commit, branch, pull request, review), mapped one-to-one from shared-drive habits.
- Branch per output, with the independent QC programmer as PR reviewer, turns double programming into an exportable record.
- Data never enters Git; the SCE's governed data connections carry it, and `.gitignore` makes the rule mechanical.
- On a Git-backed study, onboarding, rollback, and inspection response are repository operations, not archaeology.

## FAQ

### Do auditors accept Git history as an audit trail?

With the right controls, yes. What auditors want is a trustworthy record of what changed, who changed it, when, and under whose review; a Git platform with protected branches and recorded approvals provides exactly that. The record must be backed by access controls so history cannot be rewritten casually. That is a platform setting, not a hope.

### Where do datasets live if not in Git?

In the SCE's data layer: governed connections to the study data store or lake, with role-based access. Programs reference datasets by path or snapshot; run records tie each execution to the data snapshot it read. Access is scoped and logged, which is more than the shared drive ever offered.

### What is the minimum Git I need as a SAS programmer?

The five-word vocabulary from Table 1 plus the daily loop: branch, edit, commit, push, pull request. Add one reading habit early: `git diff` before every commit is what replaces "let me just check what I changed." Merge conflicts are rarer than feared under branch-per-output, because two people rarely edit the same deliverable at once.

### How does double programming work with Git?

Both roles stay. The production programmer authors on a branch; the independent QC programmer reviews the PR against the spec and runs the QC comparison, documenting the result on the PR; merge happens after both agree. Git does not remove double programming; it captures the evidence the method was always supposed to produce.

### Do I need the command line?

No. Every cloud SCE surfaces branch, commit, and pull request in its UI, and the UI is fine for daily work. The command line earns its keep on history archaeology (`git log`, `git blame`) and batch operations. Start in the UI; adopt one command a month.

---

**Series navigation** — Previous: [Part 1: Statistical Computing Environments](/blog/sce-statistical-computing-environment-guide.html) · Next: [Part 13: Pipeline as Code](/blog/pipeline-as-code-sdtm-adam.html)

For how assistants fit into this review flow, and where they must never sit, read [AI coding assistants for clinical programmers](/blog/ai-coding-assistants-sas-gxp.html). The structural argument for keeping verification deterministic is in [why LLM agents fail at regulated programming](/blog/why-llm-agents-fail-regulated-programming.html).
