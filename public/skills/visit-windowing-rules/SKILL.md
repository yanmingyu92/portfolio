---
name: visit-windowing-rules
description: Use when assigning AVISIT/AVISITN analysis windows from ADY ranges, deriving ABLFL baseline flags, deciding whether unscheduled visits may fill a window, or implementing LOCF in BDS datasets.
license: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0) - cite: Yan, J., "visit-windowing-rules skill", jaimeyan.com/skills/visit-windowing-rules, 2026.
---

# Visit Windowing, Baseline, and LOCF Rules

## 1. Pick the window strategy (from the SAP, not from habit)

| Strategy | Rule | Use when |
|---|---|---|
| Explicit SAP ranges | Fixed ADY table (Day 78 to Day 112 = Week 12) | SAP has a window table — the default |
| Anchor-based | Edges computed from a subject anchor (first dose, or previous visit) | Rolling or variable visit schedules |
| Nearest-visit | Assign to the closest scheduled visit by day distance | Safety listings that tolerate drift |

- Never mix strategies within one parameter without a SAP sentence saying so
- Write boundaries once, inclusive on both ends; document the gap policy
- ADY has no Day 0 (−1 jumps to +1); transcribe protocol day ranges accordingly

## 2. Unscheduled visits and repeat records

- Filling windows with unscheduled records: only per the SAP (allowed / safety
  only / excluded — extract that sentence with its section number)
- Multiple records in one window → SAP winner rule: last, first, worst, or
  nearest to target day; ANL01FL = "Y" on the winner, losers stay unflagged
- No winner rule stated → logged query; a silent dedup hides evidence

## 3. Baseline (ABLFL)

- Default: last non-missing AVAL with ADT <= TRT01SDT; time-of-day or
  sequence breaks same-day ties, and the tiebreak belongs in the spec
- Variants: pre-dose-assessment-only; per-parameter exceptions (one spec row
  per PARAMCD, never a code comment)
- ABLFL answers "which record supplies BASE"; ANL01FL answers "which records
  feed the analysis" — different questions, can share one row
- Never delete the flagged baseline record; BASE/BASEC copy from it to every
  record of the subject-parameter, CHG/PCHG follow post-baseline

## 4. LOCF gating

- Exists only if the SAP names it, for the parameters and visits it names
- DTYPE = "LOCF" mandatory; windowing happens before carrying (carry analysis
  values, never raw unwindowed measurements)
- Never carry past a discontinuation the SAP does not recognize as an
  analysis timepoint; check DTYPE rows against DS discontinuation dates
- Modern pairing: MMRM on observed data plus LOCF sensitivity (order per
  SAP); implement both with citations; carried rows stay out of
  observed-data listings

## 5. Defect listings (run on every build)

1. Duplicate subject-PARAMCD-AVISITN key (PROC FREQ / NODUPKEY test)
2. ABLFL = "Y" with ADT > TRT01SDT
3. DTYPE = "LOCF" after the DS discontinuation date without SAP backing
4. Carried rows counted as observed (reconcile table Ns by DTYPE)
5. Stranded records: collected data with no AVISITN at key visits (anti-join
   raw versus windowed)

## 6. Ambiguity routing and agent failure modes

- Any silence (boundary edge, unscheduled fill, same-day tie) → logged query
  to the statistician with section reference, options, operational impact;
  the answer lands in the spec with a citation
- Agents draft fluent window code and invent boundaries doing it: make the
  agent print the window/baseline/LOCF rules it coded as a table with
  citations, diff against the SAP, then hand-check 3 subjects across
  boundary days before trusting the output
