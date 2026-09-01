---
title: "Define-XML and the Reviewer's Guide, Explained for Programmers"
date: 2026-09-01
description: "Define-XML 2.1 and the ADRG from the programming side: element-by-element metadata, spec-driven generation, and the defects to sweep before the package ships."
tags: ["clinical-sas", "define-xml", "adrg", "submission", "ecdt"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 16
canonicalPath: /blog/define-xml-reviewers-guide-tutorial.html
skillArtifact: /skills/define-xml-adrg-checklist/SKILL.md
draft: true
---

Submission week. The datasets locked weeks ago, conformance runs clean, and one artifact is still collecting comments: define.xml. A variable with no origin. A value-level method that reads "derived per program." A codelist that stopped matching the data two amendments ago. I have led Define-XML v2.1, ADRG, and eCTD assembly for NDA and BLA packages in a 21 CFR Part 11 validated environment, and the pattern holds every time: the reviewer meets your study through define.xml before opening a single dataset, and the metadata serves as a proxy for how controlled the whole program is. Programmers tend to treat it as a generated afterthought. For the reviewer, it is the front door.

> **TL;DR** — Define-XML is the machine-readable contract of your SDTM/ADaM package; the ADRG is its human preface. This post maps each define-XML element to the spec column it generates from and the reviewer question it answers, then walks the ADRG sections, eCTD placement, the validation loop, and the defect gallery to sweep before the package ships. A companion skill packages the whole checklist.

## The fundamentals

### The contract, not the documentation

Define-XML v2.1 is one XML file that describes every dataset in the package: what each dataset is, every variable inside it, where each value came from, which controlled terminology governs it, and how every derived value was computed. Reviewer tools load your submission through it. Remove define.xml and the package is a folder of transport files with labels nobody can resolve.

Two properties follow. It is machine-readable: the reviewer's software parses it, so a wrong codelist reference is a broken binding, not a cosmetic defect. And everything in it is a claim about your program. An origin of CRF claims the annotated CRF backs that value; a MethodDef claims the derivation happened the way the text says. Reviewers sample those claims against the data, so the metadata reads as evidence about program discipline.

### Five elements carry the weight

**ItemGroupDef** describes one dataset: its name, purpose, domain class, structure, and sort keys. **ItemDef** describes one variable: label, datatype, length, and the origin attribute, which states whether the value was collected on the CRF, derived, assigned, or inherited from a predecessor dataset. **CodeList** binds a variable to controlled terminology: a published CDISC list, a sponsor-defined list, or an external dictionary such as MedDRA with its version pinned.

The remaining pair is where define.xml earns its complexity. **ValueListDef** with **WhereClauseDef** implements value-level metadata: when one variable carries different rules for different parameters, the value list attaches a separate definition to each and the where clause states the condition that selects it. **MethodDef** and **CommentDef** carry the derivation text a reviewer reads instead of your program.

Value-level metadata deserves a concrete look. When VSSTRESN converts Fahrenheit to Celsius for TEMP but passes weight through unchanged, one variable holds two rules. The value list gives each branch its own definition with its own origin and method; the where clause states VSTESTCD = TEMP for the conversion branch. Reviewers query exactly this structure when asking how one parameter was derived differently from another; the decision lived in a spec row ([Part 6, row 9 of the VS walkthrough](/blog/sdtm-mapping-spec-walkthrough.html)) long before define.xml existed.

| define-XML element | What it describes | Spec column it generates from | Reviewer question it answers |
|---|---|---|---|
| ItemGroupDef | One dataset: class, structure, purpose, keys | Dataset sheet header (domain, class, key variables) | "What is this dataset and how is it keyed?" |
| ItemDef | One variable: label, datatype, length, origin | Variable, label, type, and origin columns | "Where did this value come from?" |
| CodeList | CT binding for a variable, with version | CT column | "Are these values controlled, and against which list?" |
| ValueListDef + WhereClauseDef | Value-level rules for one variable | Transformation column, when the rule varies by parameter | "Why is this parameter derived differently from that one?" |
| MethodDef / CommentDef | Derivation text, annotations | Transformation and notes columns | "Can I understand this derivation without reading the program?" |

*Table 1: The element-to-spec-to-reviewer map. If a cell in the middle column is blank, the element on the left ships wrong.*

### Generation: metadata as output, not authoring

Every element above should be generated from the specification [Part 6](/blog/sdtm-mapping-spec-walkthrough.html) built row by row: the origin column becomes the ItemDef origin attribute, the CT column becomes the codelist reference, the transformation column becomes MethodDef text, and a transformation that varies by parameter becomes a value list with where clauses. Hand-authoring define.xml severs that chain: someone edits the program, nobody regenerates the metadata, and the package ships describing a study that no longer exists. Generation is what makes disagreement between data and metadata structurally impossible rather than a hope.

### The ADRG: what the reviewer actually needs

The Analysis Data Reviewer's Guide is the human preface to the machine contract. Four things a reviewer actually needs from it, in the order they get read:

- **Orientation.** The dataset inventory, what each dataset is for, and how the analysis data trace back to SDTM. A reviewer with a stack of submissions spends about a page deciding whether yours is navigable.
- **Special derivations.** The analyses that break the standard pattern: composite endpoints, custom windows, unusual imputations. If a derivation has a story, the guide is where the story lives.
- **Population filters.** Which flag defines which population (ITT, safety, efficacy), and which analyses use which. Every denominator in every table traces to a sentence here.
- **Known issues.** Data quirks, protocol deviations with analysis impact, decisions taken and who took them. A guide that discloses its rough edges gets trusted; one that reads as marketing gets interrogated.

An ADRG that duplicates define.xml line by line wastes the reviewer's attention. The define file answers what is there; the guide answers why it is like that.

### eCTD placement and the package that arrives together

The data package lands in Module 5 of the eCTD, in the datasets section that sits alongside the clinical study report. What arrives as one unit: the transport datasets, define.xml, define.pdf, the reviewer's guide, and the annotated CRF. Define.pdf is the human-readable rendering of the same metadata from the same source, a companion view for people reading on screen, never a separately authored document. The guides themselves have been consolidating: the SDTM-side guide and the ADRG are converging into a single Study Data Reviewer's Guide (SRTG) template. The template churns; the content obligations do not. Whichever shell the guide ships in, it still owes the reviewer orientation, derivations, populations, and known issues.

### The defect gallery

Four defects account for most of the define and ADRG findings I have triaged:

1. **Missing origins.** Every ItemDef needs an origin. Blank or vague origins fail conformance checks outright, and they read as an unmanaged program even when they pass.
2. **Value-level gaps.** The derivation lives only in the program. Value-level metadata was skipped, so the reviewer must read SAS to learn how a parameter was derived. Conformance engines may not flag the silence; reviewers do.
3. **CT drift.** Define declares a codelist or a version the datasets stopped matching at an amendment. The fix is procedural: regenerate define.xml and revalidate at every data cycle, not once before filing.
4. **Unexplained custom domains.** A dataset nowhere in the implementation guide, with no rationale in the guide, reads as noncompliance. Custom structure is defensible when the ADRG states the basis, the structure, and why standard domains did not fit.

The cheap insurance is a sweep that runs before the conformance engine does:

```sas
/* Pre-submission sweep: SDTM variables vs spec, Study XYZ */
proc sql;
  create table ds_vars as
  select memname as dataset, name as variable
  from dictionary.columns
  where libname = "SDTM";
quit;
proc sort data = ds_vars; by dataset variable; run;
proc sort data = spec_vars(keep = dataset variable origin); by dataset variable; run;
data drift;
  merge ds_vars(in = d) spec_vars(in = s);
  by dataset variable;
  if d and not s then issue = "in data, missing from spec";
  else if s and not d then issue = "in spec, not built";
run;
```

Anything on that output is a variable with no spec row, or a spec row nobody built; both become origin findings.

## The modern workflow

In a spec-driven SCE, define.xml is build output. The spec lives as versioned sheets; the build regenerates datasets and define.xml from it; define.pdf renders from the same source; and the conformance engine runs on every data cut, not once at submission week. I have run automated Pinnacle 21-style compliance workflows on exactly that cadence, and the economics are the point: when validation is free, drift gets caught the night it happens and the package becomes machine-checkable end to end. The open-source side covers this layer too: [CDISC CORE](/blog/cdisc-core-validation-explained.html) ships a define-XML rule set alongside its dataset rules, making metadata conformance scriptable in CI. How the SCE enforces a regenerable build is [Part 1, the statistical computing environment](/blog/sce-statistical-computing-environment-guide.html).

One boundary stays human. Engines check internal consistency: origins present, codelists resolvable, value lists well formed. No engine checks that a MethodDef describes what the program actually did; that diff among spec, program, and metadata is the entire argument for generation. The ADRG sits under the same version control as the programs, reviewed diff by diff, because a guide describing last cycle's datasets is worse than no guide.

## The agentic way

Agents write ADRG prose fast and can diff define.xml against datasets mechanically, and both are real leverage. The failure mode is fluency: an agent describes the package it imagines rather than the one on disk. It writes "collected on the CRF" under a variable whose ItemDef origin is Derived, or drafts a methods paragraph that paraphrases the SAP instead of the program. The verification habit is to make claims checkable: ask the agent to quote the origin attribute for every variable it described, and to cite the ItemGroupDef for every dataset it named. Mismatches surface in seconds. Where the accountability line sits when an assistant touches submission artifacts is [Part 14's subject, AI in validated environments](/blog/ai-in-validated-environments.html): generation and diffing are assistive, and the shipped package is a validated artifact under a human signature.

<div class="era-callout">
  <p><strong>The agentic way</strong> — Agents draft reviewer-facing prose and run define-vs-dataset diffs in minutes; the failure mode is confident text describing an idealized package rather than the one on disk. Diff every claim against the generated metadata before it enters the ADRG.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-09-01. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/define-xml-adrg-checklist/SKILL.md">
  <span class="skill-card-name">define-xml-adrg-checklist</span>
  <span class="skill-card-desc">A pre-submission checklist covering define-XML metadata completeness, ADRG section coverage, the pre-Pinnacle-21 defect sweep, and eCTD package assembly.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- Define-XML is the machine-readable contract of the package; reviewer tools parse it, so metadata errors are broken bindings rather than typos.
- Generate it from the spec and never hand-edit: every element descends from a spec column, which keeps spec, code, and metadata in lockstep.
- The ADRG earns its pages by explaining what machines cannot: orientation, special derivations, population flags, and known issues.
- Sweep the four recurring defects before the engine finds them: missing origins, value-level gaps, CT drift, and unexplained custom domains.
- Conformance engines check consistency, not truth; the MethodDef-versus-program match remains a human diff built on generation.

## FAQ

### Is define.xml required, or is it a courtesy artifact?

When a submission carries standards-conformant SDTM or ADaM datasets, the metadata file is part of the package, because reviewer tooling consumes the datasets through it. A package without it is functionally unreadable to the reviewing tools, so treat it as required whenever the data standards apply.

### What is the difference between define.xml and define.pdf?

Define.pdf is the human-readable rendering of the same metadata, generated from the same source. One is parsed by software, the other is read by people; they should never disagree, and if they do, the generation process is broken rather than either file being wrong.

### A conformance finding names a variable. Can I edit define.xml directly?

No. Fix the spec row and regenerate. A hand-edited define.xml is silently reverted the next time the package builds from source, and the finding returns at the worst possible moment. Direct XML edits are how temporary fixes become permanent mysteries.

### Who writes the ADRG?

The statistical programming lead drafts it, biostatistics reviews the analysis descriptions, and data management reviews anything touching collection. It is a versioned deliverable under the same review flow as the programs, updated every data cycle alongside the define regeneration.

### How does a custom domain survive review?

When the ADRG states its structure, its basis in the implementation guides, and why standard domains did not fit the data. Custom is a design decision reviewers accept when it is argued; unexplained is what actually fails.

---

Previous in the series: [reading the protocol and SAP](/blog/protocol-sap-reading-guide.html). Next in the series: analysis windows, baseline selection, and LOCF. The spec that generates all of this is [Part 6, the SDTM mapping specification walkthrough](/blog/sdtm-mapping-spec-walkthrough.html); for where agents may touch submission artifacts at all, read [AI in validated environments](/blog/ai-in-validated-environments.html).
