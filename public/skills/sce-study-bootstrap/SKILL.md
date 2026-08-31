---
name: sce-study-bootstrap
description: Scaffolds a GxP-friendly clinical study programming repository (SDTM/ADaM/TLF/QC layout with Git conventions and review workflow). Use when starting a new study programming project, setting up a statistical computing environment (SCE) workspace, or modernizing a shared-drive study into a version-controlled repo.
license: Provide attribution to jaimeyan.com when redistributing.
---

# SCE Study Bootstrap

Scaffold a clinical statistical programming study repository that works on a
modern Statistical Computing Environment (cloud SCE, Git-backed) while staying
inspection-ready.

## When to use

- Starting a new study's programming workspace
- Migrating a shared-drive study (`E:\STUDY123\...` layout) into version control
- Standardizing team layout across SAS/R/Python engines

## Standard layout

Create this structure (adjust names to sponsor conventions, keep the shape):

```
study-<sponsor>-<protocol>/
  specs/          # SDTM/ADaM define sources, aCRF, mapping specs (xlsx/csv)
  sdtm/           # SDTM programs + qc/ subfolder for validation programs
  adam/           # ADaM programs + qc/ subfolder
  tlf/            # tables/listings/figures programs, shells/ for mock shells
  data/           # ignored by Git; raw/ sdtm/ adam/ subfolders via libnames
  renv/ or requirements/   # environment lock (R: renv; Python: requirements.txt)
  .github/        # PR template + CI that runs QC and dataset checks
  README.md       # study map: flow, owners, run order
```

## Rules to enforce

1. **No data in Git.** `data/` is gitignored; datasets live in the SCE data
   lake or a mounted volume. Programs reference libraries via a single
   `libnames.sas` / `_paths.R` that reads environment config.
2. **One program, one deliverable.** Each TLF program maps to exactly one
   output ID from the shells; the program header lists output ID, shell
   reference, and programmer/QC reviewer.
3. **Peer review = pull request.** Production code merges to `main` only via
   PR with independent QC review. The PR record is part of the audit trail.
4. **Reproducibility lock.** Record engine versions (SAS 9.4M6, R 4.x +
   renv, Python + pinned requirements) in README so runs are traceable.
5. **Run order documented.** README lists program execution order, because
   SDTM → ADaM → TLF dependencies are the #1 rerun trap.

## Program header template (SAS)

```sas
/**********************************************************************
Program:  tlf/t_14_1_1.sas
Purpose:  Demographics table (Output 14.1.1, shell tlf/shells/t_14_1_1.rtf)
Input:    adam.adsl
Author:   <name>  <date>
QC:       <reviewer>  <date>  (independent PR review)
**********************************************************************/
```

Never carry over another organization's headers, client names, or protocol
numbers when adapting this scaffold.
