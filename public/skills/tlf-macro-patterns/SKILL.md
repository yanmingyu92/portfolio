---
name: tlf-macro-patterns
description: Design and debugging rules for SAS macros that generate clinical TLF outputs: driver-table schema, parameter and %local hygiene, the MPRINT/SYMBOLGEN/MLOGIC trio mapped to symptoms, anti-pattern checks, and three-shell portability tests. Use when writing, reviewing, or debugging SAS macros for clinical tables, listings, or figures.
license: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0) - cite: Yan, J., "tlf-macro-patterns skill", jaimeyan.com/skills/tlf-macro-patterns, 2026.
---

# TLF Macro Patterns

Variation lives in a metadata table. Logic lives once in a macro. The
driver loop connects them. When a macro misbehaves, debug the code it
generated, not the code you typed.

## Driver table schema

One row per output. Minimum columns:

| Column | Carries | Example |
|---|---|---|
| outid | Output ID (file routing, traceability) | 16.2.1.1 |
| popfl | Population flag variable (ADSL) | SAFFL |
| ttl1, ttl2... | Title set per the shell | Assignment to Analysis Populations |
| sortvar | Sort variable(s) per the shell | usubjid |

- [ ] Everything that varies between outputs is a column, not a code edit
- [ ] A new study changes the table; the macro is untouched
- [ ] Driver reads the table (SQL INTO ranges); `&&id&i` resolves twice, and both resolutions appear under SYMBOLGEN

## Parameter discipline

- [ ] Every input arrives as a keyword parameter with a sensible default
- [ ] Population flag and output ID are parameters, never hidden globals
- [ ] No %let chain at program top that the macro silently reads
- [ ] Population enters in exactly one WHERE clause; header N uses the same filter, so N and rows cannot diverge

## %local hygiene

- [ ] Declare %local for every macro variable the macro creates — indexes and counters first
- [ ] Iterative %DO uses any same-named variable it can see; without %local in the inner macro, the inner loop mutates the outer index
- [ ] Undeclared variables leak outward: repeated blocks, skipped outputs, no error in the log
- [ ] When copying a loop, check the %by clause survived the copy

## Debugging trio (symptom → switch)

All three on together while debugging (`options mprint symbolgen
mlogic;`), off again for the validated run.

| Symptom | Likely cause | First switch |
|---|---|---|
| Runs clean, table empty | Filter resolved to nothing (wrong flag value, dataset typo) | MPRINT — read the generated WHERE |
| Wrong counts, stale N | Variable resolved from the wrong scope or a stale global | SYMBOLGEN — watch every resolution |
| Repeated blocks, runaway loop | Index leaking across nested macros; dropped %by | MLOGIC — trace %DO boundaries |

## Anti-pattern checklist

- [ ] Nesting deeper than two macro levels — MPRINT output becomes unreviewable; flatten before adding a third
- [ ] Macro-as-configuration: a %let chain the macro reads silently — move the values into driver-table columns
- [ ] Copy-paste forks per output (%tab141, %tab142, ...) — one fork gets the fix, the rest drift
- [ ] Titles/ODS outside the macro — titles are session-global and leak between outputs; the macro owns its title block and destination

## Portability tests

- [ ] Three shells, three studies (or structurally different sections): different population, different column count
- [ ] If each study needs an edit, it is a template, not a macro
- [ ] Double-call test: invoke twice from a driver with different parameters — scope bugs surface on the second call
- [ ] Agent-drafted macros: same double call under MPRINT, plus the list of every macro variable it creates and where it is declared

## Agent-era note

Agents draft macro skeletons fast and read resolved MPRINT logs fast,
but they omit %local and bury parameters in %let chains because that
pattern dominates public SAS code. Sign-off accountability stays with
the programmer; the second-call test is the cheapest scope check.
