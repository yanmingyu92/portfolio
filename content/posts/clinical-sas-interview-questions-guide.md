---
title: "Clinical SAS Interview Questions: What Actually Gets Asked"
date: 2026-08-31
description: "How clinical SAS interviews actually work: four rounds from SAS mechanics to GxP habits, real-format questions, and the signals strong answers contain."
tags: ["clinical-sas", "interview", "cdisc", "gxp"]
kind: tutorial
series: clinical-sp-bootcamp
seriesOrder: 10
canonicalPath: /blog/clinical-sas-interview-questions-guide.html
skillArtifact: /skills/clinical-sas-interview-drill/SKILL.md

---

The SAS round went fine. Merges, RETAIN, a PROC SQL question, all answered clean. Then the interviewer leaned in: "Walk me through building the AE domain from raw data." Ten seconds of silence. That silence is where clinical SAS interviews are decided. The mechanics round screens; the CDISC round decides. Almost everyone prepares for the screen and wings the decision. This guide covers both, plus the two rounds nobody drills, GxP practice and the modern workflow, including the AI question that now closes most loops. Four rounds, thirteen questions, and the specific signals interviewers listen for in each answer.

> **TL;DR** — Clinical SAS interviews run four rounds: SAS mechanics to screen, CDISC reasoning to decide, GxP practice to filter habits, and a modern-workflow round that increasingly asks about AI. Below are thirteen real-format questions with the signals strong answers contain, the failure mode each round filters, and a 48-hour re-drill protocol you can run with the companion skill.

## The fundamentals

### How the interview actually works

Hiring managers in this field are not looking for encyclopedias. The structure is consistent: screen on SAS mechanics, decide on CDISC reasoning, filter on GxP habits, then check currency in a modern-workflow round. The mechanics round is mostly pass or fail; either you can talk through a merge or the conversation ends early. The CDISC round is graded on how you reason toward an answer, and that is where the offer forms.

### Round 1 — SAS mechanics (screens for fluency)

**Q1. What is the difference between `MERGE` and `SET` with `BY`?**
Strong answers separate the operations: `SET` with `BY` stacks and interleaves sorted inputs vertically; `MERGE` matches them horizontally. Then the signals arrive: inputs must be sorted or indexed by the BY variable; and duplicate BY values are the trap. Two one-to-many inputs with repeated keys multiply rows silently. Strong candidates mention `in=` flags as the guard.

```sas
/* runs clean: no errors, no notes you would notice —
   and repeats every subject that has 2+ records in ex */
data adsl;
  merge dm (in = indm) ex (in = inex);
  by usubjid;
  if indm and inex;
run;
```

**Q2. When does `RETAIN` matter versus a sum statement?**
`RETAIN` holds a value across iterations of the DATA step loop, initialized before the first iteration. The sum statement `total + dose;` retains and adds in one step and initializes to zero implicitly. Signals: when an explicit RETAIN needs re-initialization per BY group; evaluation order inside the step; and the classic `_N_` misconception, where candidates treat it as an observation counter rather than a loop counter.

**Q3. PROC SQL join or DATA step merge — pick one and justify.**
There is no correct winner, and that is the point. Strong answers name the situation: many-to-many semantics differ (SQL builds a Cartesian product on duplicate keys; MERGE matches by position), readability for the next programmer matters, and indexed lookups can favor either. Absolutist answers are the red flag here.

**Q4. A macro runs without errors but produces nothing. How do you debug it?**
The signal is `OPTIONS MPRINT SYMBOLGEN MLOGIC;` followed by reading the generated code rather than counting log lines. Strong candidates check macro variable scope and resolution, loop boundary conditions, and whether a WHERE clause or empty input filtered everything out before the macro ever ran.

### Round 2 — CDISC reasoning (decides the hire)

**Q5. Walk me through building the AE domain from raw.**
This is the most common decider question. Strong answers start from the specification, not the data: map raw terms to MedDRA-coded variables, derive the serious and toxicity grading flags, handle dates as ISO 8601, derive `AESEQ` for uniqueness, and push non-standard attributes to SUPPAE rather than inventing variables. The strongest signal of all is a question back: "What does the raw structure look like?" before writing anything.

**Q6. Derive TRT01SDT when the first dose is missing.**
The trap is improvising. The strong answer names the source hierarchy: treatment start normally derives from the first exposure record in EX; when it is missing, you apply the fallback the SAP documents, whatever it documents, and flag the imputation rather than silently choosing a date. Partial dates get handled per the study's convention. The signal is citing the rule's provenance instead of inventing one.

**Q7. What belongs in SUPPQUAL versus a custom variable?**
SUPPQUAL holds non-standard values that belong to a standard parent domain: QNAM, QVAL, QLABEL mechanics, linkage back through IDVAR and the parent's `--SEQ`, and visibility through define-XML. A custom variable inside the domain keeps data visible in the main dataset but marks the domain non-standard wherever the value is not in the IG. Signals: conformance trade-offs stated out loud, and awareness that a custom domain is a bigger decision than either option.

### Round 3 — Practice and GxP (filters habits)

**Q8. How do you QC a table you did not program?**
The strong answer distinguishes independent programming from review: recreating the output from the specification alone is the gold standard, and structured review with a checklist is the fallback when time is short. Then the habit signals: checking titles, populations, denominators, sorting, and footnotes against the shell; comparing outputs record by record; documenting every discrepancy; escalating rather than quietly fixing.

**Q9. What changes about your programming in a validated environment?**
Signals: version control with reviewed check-ins; runs reproducible from locked inputs; an audit trail an inspector can follow; production artifacts separated from exploration; and no untracked changes after database freeze. The strongest answers describe these as habits rather than as rules imposed from outside.

**Q10. Your QC output disagrees with production. What happens next?**
What the interviewer listens for is process discipline. Reproduce both results, isolate whether the cause is data, spec interpretation, or code, document the discrepancy, and route it through the study's process rather than touching production first. Solo heroics are the wrong answer in a GxP shop; interviews listen for communication, not cleverness.

### Round 4 — Modern workflow (checks currency and judgment)

**Q11. How would you use an AI assistant in regulated programming?**
The strongest answers draw one line clearly: draft exploration versus validated artifacts. An assistant may draft mapping code, explain logs, and produce a first QC pass inside an approved boundary; nothing enters the validated environment without the same independent QC as human-written code; study data never leaves the approved boundary; and accountability stays with the person who signs. Candidates who cite where the evidence stands, proven for debugging and drafting versus unevidenced for autonomy, stand out.

**Q12. Which tasks would you not hand to an assistant?**
Anything that produces the validated artifact without independent verification, anything behind a signature, spec-interpretation decisions, and any flow that sends study data outside the validated boundary. The question is really testing where you believe the boundary sits.

**Q13. What is a pull request review for on a programming team?**
A second trained eye on logic and traceability, shared context across the team, and a review record that is itself GxP evidence. Candidates who call review bureaucracy fail quietly.

### The meta-signal: no absolutism

Across all four rounds, interviewers grade judgment, and judgment sounds like "it depends, and here is the decision rule." Absolutism reads as inexperience whether it is "always PROC SQL" or "never use macros." The strongest candidates state the rule they would follow and the condition that would change it.

| Round | Purpose | Failure mode it filters |
|---|---|---|
| 1 — SAS mechanics | Screen for fluency | Code that works until duplicate keys or scope bugs arrive |
| 2 — CDISC reasoning | Decide the hire | Tool users with no data model: right code, wrong domain logic |
| 3 — Practice and GxP | Filter habits | Soloists who cannot survive an audit or a lock deadline |
| 4 — Modern workflow | Check currency and judgment | Both extremes: AI-refusers and AI-overtrusters |

*Table 1: The four rounds. Each one exists to remove a specific failure mode, and each failure mode is a real colleague everyone has worked with.*

## The modern workflow

The interview's format has shifted along with its questions. SCE and Git questions moved from nice-to-have to standard over the last few hiring cycles. Take-home exercises and live log-reading have joined the classic whiteboard merge. The AI question now arrives from both directions: teams that use assistants probe whether you can work inside their guardrails, and conservative teams probe whether you know where the line sits.

Preparation method matters more than preparation volume. Reading these questions is the weak form. The strong form is drilling aloud, because the interview grades spoken reasoning under time pressure, a separate skill from knowing the answer quietly. The protocol below is the one the companion skill runs; it works alone too.

```text
48-hour re-drill protocol
1. One pass, all 13 questions, answers spoken aloud. Two minutes each.
2. Log every weak answer: hesitation, missing signal, wrong first instinct.
3. For each weak item, write the one-page answer yourself. Recall beats rereading.
4. Wait 48 hours. Re-drill only the weak items, timed, same standard.
5. Stop after two consecutive clean passes. Over-drilling flattens your delivery.
```

The 48-hour gap is the mechanism. It separates what you can recall from what you recognize, and interviews run on recall.

## The agentic way

The AI question fails candidates in both directions. Overtrusters say the assistant writes their QC and skip the verification habit; refusers say AI is not allowed and stop listening. Neither answer survives a follow-up. The strong answer names the boundary, describes the verification habit, and states where accountability lands: the assistant drafts, the signer owns. The evidence tiers for which uses are proven, debugging, QC drafting, templated generation, are in the state-of-field survey, and what makes an agentic system deployable in GxP is laid out in the agents-reality post.

<div class="era-callout">
  <p><strong>The agentic way</strong> — The AI round has become a standard filter in clinical programming interviews, and it cuts both ways: candidates who can state where assistant drafts may flow (exploration, debugging, QC first passes) and where they may not (validated artifacts without independent QC) are the ones who pass.</p>
  <p class="era-callout-asof">Volatile layer — last verified 2026-08-30. Re-verify before relying on tool specifics.</p>
</div>

<a class="skill-card" href="/skills/clinical-sas-interview-drill/SKILL.md">
  <span class="skill-card-name">clinical-sas-interview-drill</span>
  <span class="skill-card-desc">A four-round mock interview drill with the strong-answer signals interviewers listen for, plus the 48-hour re-drill protocol for weak items.</span>
  <span class="skill-card-download">Download SKILL.md — drop into Claude or Claude Code</span>
</a>

## Key takeaways

- Mechanics screen, CDISC decides, GxP filters, and the modern-workflow round checks judgment; weight your preparation in that order.
- The signals are reasoning behaviors: spec-first thinking, edge cases, documented fallbacks, and process discipline over heroics.
- "It depends, and here is the rule" beats absolutism in every round; always-and-never answers read as junior tells.
- The AI question fails both extremes; name the draft-versus-validated boundary and state that accountability stays with the signer.
- Drill aloud on a 48-hour cycle; recall is what the interview grades, and recall is built by retrieval, not rereading.

## FAQ

### Are these questions asked at junior and senior levels alike?

The four rounds are the same; the depth expected changes. Junior interviews weight Round 1 heavily and accept reasoning frameworks over experience in the CDISC round. Senior interviews compress mechanics and spend the time on design trade-offs, spec disputes, and how you have handled audits.

### Do I need CDISC experience for an entry-level clinical SAS role?

It helps, but plenty of juniors are hired on strong mechanics plus evidence of trainability, especially at CROs where volume demands it. What loses offers at entry level is failing the reasoning questions, not lacking a particular standard. Working through the SDTM and ADaM parts of this series is the fastest way to sound experienced in the CDISC round.

### How many interview rounds should I expect?

It varies by sponsor and CRO, and the common pattern is a recruiter screen, one technical round, and one behavioral or team round. Some processes add a take-home exercise or a live log-reading exercise. Treat the four rounds here as content categories rather than a literal schedule.

### Should I mention AI tools if the interviewer does not ask?

One sentence, positioned as a habit rather than a philosophy: you draft with an assistant and verify everything before it moves. It signals currency without inviting a debate. If the interviewer wants the full conversation, Round 4 above is the script.

### Can I practice these questions alone?

Yes, and aloud is the only way that works. Record yourself, hold the two-minute line, and log weak items. The companion skill runs the full drill against you in Claude or Claude Code, with the signals to compare against after each answer.

---

*Previously: Part 9 — ADaM ADTTE: time-to-event datasets. Next: Part 11 — Becoming a Clinical Statistical Programmer in 2026. For the evidence tiers behind every AI claim in this post, see [LLMs in Clinical Statistical Programming: Proven vs Hype](/blog/llm-clinical-statistical-programming-state-2026.html); for telling deployable systems from demos, see [LLM Agents in Clinical Trials: What's Real Beyond the Demos](/blog/llm-agents-clinical-trials-reality.html).*
