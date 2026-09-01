# Clinical SP Bootcamp — Series Plan

> **Status 2026-08-30**: all 15 posts (Parts 0–14) written, polish pass done,
> QC-clean (`npm run qc:blog -- --all` → 0 errors), build verified (99 pages).
> Red-line scan clean (no third-party identifiers). **Weekly drip ADOPTED** —
> Parts 0/1/2/3/10 LIVE as of 2026-08-30; see the drip calendar below.

Systematic tutorial series for `kind: tutorial` posts. Infrastructure:
`npm run new-post -- --kind tutorial --slug <slug> --order <n> [--series clinical-sp-bootcamp]`.
This doc is the syllabus source of truth; decide releases here.

## Positioning

Three knowledge layers per post (all three are QC-enforced structure):

| Layer | Shelf life | Content | Source |
|---|---|---|---|
| L1 `## The fundamentals` | ~10 yr | CDISC logic, derivations, GxP reasoning | third-party training corpus, **rewritten** |
| L2 `## The modern workflow` | 3–5 yr | Cloud SCE, Git, reproducibility, multi-engine | Field practice, Domino-class SCE docs |
| L3 `## The agentic way` + `.era-callout` | ~6 mo (asOf stamped) | Claude/agent concrete use + failure modes | Own AI posts + fresh verification |

Audience funnel: search visitors (junior programmers, job seekers) → series
→ existing explainer/deep-dive posts → papers. Series = traffic layer; the
AI posts stay the brand layer. Do not blend the two voices.

## Hard red lines (non-negotiable)

1. **Never redistribute third-party training artifacts**: no .sas7bdat datasets, no xlsx
   specs, no RTF shells/outputs, no screenshots of them, no program
   headers (client / author / protocol / project identifiers from the
   source corpus). The literal banned tokens live only in the REDLINE
   check (built from split literals) — do not spell them out in content
   or docs.
2. Code samples are **rewritten, minimal, generic** (Study XYZ), never
   adapted verbatim from the training programs.
3. SAS book PDFs: outline inspiration only; no content reuse.
4. Interview content: INTQ themes okay, questions rewritten with own answers.
5. Every L3 claim verified against the tool at time of writing; the
   `.era-callout` box carries the asOf date.

## Curriculum

Series slug: `clinical-sp-bootcamp`. Order = `seriesOrder`.

### Wave 0 — Syllabus (publish with Wave 1)

| # | Slug | Target keyword |
|---|---|---|
| 0 | `clinical-sp-bootcamp-roadmap` | clinical statistical programmer learning path |

Lists **only published posts**; update each wave.

### Wave 1 — Pilot (3 posts, publish together or 1/week)

| # | Slug | Line | Target keyword | Skill artifact |
|---|---|---|---|---|
| 1 | `sce-statistical-computing-environment-guide` | SCE | statistical computing environment clinical trials | sce-study-bootstrap |
| 2 | `adsl-derivation-tutorial-trtstdt` | ADaM | ADSL derivation TRT01SDT | adam-adsl-derivation |
| 3 | `tlf-shell-to-rtf-tutorial` | TLF | clinical trial tables listings figures programming | tlf-qc-checklist |

### Wave 2 — SDTM line (after 6–8 wk metrics review)

| # | Slug | Target keyword | Skill artifact |
|---|---|---|---|
| 4 | `sdtm-tutorial-domain-basics` | SDTM domains explained | sdtm-mapping-conventions |
| 5 | `sdtm-ae-domain-mapping-example` | SDTM AE domain mapping | (reuse #4 artifact) |
| 6 | `sdtm-mapping-spec-walkthrough` | SDTM mapping specification | (reuse) |

### Wave 3 — ADaM line rest + interview line

| # | Slug | Target keyword | Skill artifact |
|---|---|---|---|
| 7 | `adam-bds-adlb-advs-tutorial` | ADaM BDS structure | adam-adsl-derivation |
| 8 | `adam-occds-adae-tutorial` | ADaM OCCDS | — |
| 9 | `adtte-survival-tutorial` | ADaM ADTTE time to event | — |
| 10 | `clinical-sas-interview-questions-guide` | clinical SAS interview questions | clinical-sas-interview-drill |
| 11 | `statistical-programmer-career-2026` | become a clinical statistical programmer 2026 | — |

### Wave 4 — SCE line rest + flagship

| # | Slug | Target keyword | Skill artifact |
|---|---|---|---|
| 12 | `git-for-clinical-programmers` | Git for SAS programmers | sce-study-bootstrap |
| 13 | `pipeline-as-code-sdtm-adam` | clinical trial data pipeline CI | — |
| 14 | `ai-in-validated-environments` | AI GxP validated environment LLM | — |

Post 14 is the flagship bridge (AI governance in SCE, GAMP 5/CSA framing) —
links both directions to `ai-coding-assistants-sas-gxp` and `why-llm-agents-fail-regulated-programming`.

## Release strategy — ADOPTED: weekly drip (Sundays)

Released via `node scripts/drip-release.mjs <slug>` (flips date/draft,
linkifies the roadmap title, dead-link scan, QC).

| Date | Part(s) | Note |
|---|---|---|
| 2026-08-30 | 0, 1, 2, 3, 10 | layout check: one per line + roadmap entry point |
| 2026-09-01 | 4, 5, 6 | SDTM line released as one arc (hybrid strategy C) |
| 2026-09-06 | 7 | BDS |
| 2026-09-13 | 8 | OCCDS |
| 2026-09-20 | 9 | ADTTE |
| 2026-09-27 | 11 | career 2026 |
| 2026-10-04 | 12 | Git |
| 2026-10-11 | 13 | pipeline as code |
| 2026-10-18 | 14 | flagship: AI in validated environments (capstone) — then tag `bootcamp-v1.0.0` for the Zenodo version DOI |
| 2026-10-25 | 15 | protocol/SAP reading (Wave 5 opens, from coverage-matrix backlog C) |
| 2026-11-01 | 16 | define-XML + reviewer's guide (backlog F) |
| 2026-11-08 | 17 | windowing/baseline/LOCF (backlog A) |
| 2026-11-15 | 18 | SAS macros for TLF (backlog D) |
| 2026-11-22 | 19 | p-values FAQ (backlog E) |
| 2026-11-29 | 20 | ADRS/RECIST (backlog B) — series complete, tag `bootcamp-v1.1.0` |

Weekly maintenance (one command): `node scripts/drip-release.mjs <slug>` —
script linkifies the roadmap row automatically (upcoming rows keep the exact
plain title). Before each release, optionally refresh the post's era-callout
asOf date. Watch GSC at week 6-8: which line's keywords pull; adjust the
remaining calendar if one line dominates.

### Weekly distribution checklist (per release, ~15 min)

1. `node scripts/drip-release.mjs <slug>` then push (Vercel deploys)
2. YouTube (if the part has a companion video): `npm run video:build -- <slug>`
   → review `temp/videos/<slug>/script.md` → `npm run video:upload -- <slug>`
   → set "Altered content" + Public in Studio → put `videoId` in the post
   frontmatter → rebuild/deploy. Full runbook: `docs/VIDEO-PIPELINE.md`
3. LinkedIn post: one concrete takeaway + link (clinical programming audience)
4. dev.to: `node scripts/syndicate/run.mjs` (RSS import drafts into review/)
5. Communities where on-topic (rotate, don't spam): PharmaSUG/PhUSE forums,
   CDISC community, r/biostatistics — share the takeaway, not the link alone
6. Check Vercel Analytics + GSC for last week's post at week boundaries

### SEO backlog (adopted 2026-09, from external review)

- Pillar explainer: "The Modern Clinical Statistical Programming Stack (2026)"
  — targets mid-tail stack/overview terms; links every tutorial + AI post both
  directions (cluster → pillar). Write after Wave 2 lands.
- Gap explainer: "SDTM Mapping Automation with LLMs" — no post currently owns
  this query; bridges tutorials and the LLM deep-dives.
- Author E-E-A-T: done (byline + sameAs entity on all blog posts 2026-09-01).

Options once Wave 1 is written (superseded — kept for reference):

- **A. Drip weekly** — steady RSS/syndication cadence, builds habit audience
- **B. Batch per line** — publish each line as a coherent set (better for
  "complete guide" search intent, worse for cadence)
- **C. Hybrid** — drip Wave 1 weekly, batch SDTM line as one arc

Decision inputs at week 6–8: GSC impressions/CTR per post, which line's
keywords pull, newsletter signups from series vs AI posts.

## Cross-link map

- SDTM line → `/blog/cdisc-core-validation-explained.html`
- ADaM line → `/blog/fine-tuning-small-llms-admiral-r.html`, `/blog/sas-to-r-migration-field-guide.html`
- TLF line → `/blog/eliminating-qc-programming-duplication.html`, `/blog/benchmarking-rag-clinical-tlf-templates.html`
- SCE line → `/blog/ai-coding-assistants-sas-gxp.html`, `/blog/non-destructive-legacy-modernization-sas.html`
- Interview line → `/blog/llm-clinical-statistical-programming-state-2026.html`

## Workflow per post

```bash
npm run new-post -- --kind tutorial --slug <slug> --order <n>
# write per templates/tutorial-template.md + this plan's red lines
npm run qc:blog          # drafts are skipped; qc:blog --all to pre-lint
npm run build
# flip draft: false → qc:blog → build → release
```
