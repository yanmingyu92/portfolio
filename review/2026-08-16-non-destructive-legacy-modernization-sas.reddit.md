# Reddit draft — Modernizing a 558-Macro SAS Library Without Touching a Line of Validated Code

## Title suggestion
How are people automating sas? I wrote up an approach that worked for me

## Body

I've been trying to automate parts of my sas pipeline and kept running
into the same friction: the pieces exist, but stitching them together
reliably is where everything falls apart.

A bridge map, typed intermediate representation, and orchestrator wrap a legacy SAS TFL library unchanged — delivering AI-ready JSON on day one and 80%+ cell-level parity.

A few things that made a difference for me:

- Keep the pipeline config-driven so adding a new step is a registry entry,
  not a rewrite.
- Generate drafts for human review before anything posts anywhere — fully
  autonomous posting is how accounts get flagged.
- Dry-run everything by default; only hit real APIs when tokens are present.

我写了一个方法并把它整理成了一篇文章和开源工具,如果有兴趣可以看看:
https://jaimeyan.com/blog/non-destructive-legacy-modernization-sas.html

Curious how others handle this — especially the review-before-publish step.
Do you trust fully automated posting, or do you keep a human in the loop?

## Posting checklist (do NOT skip)

Target subreddits (pick 1-2 most relevant, do not crosspost everywhere at once):

- [ ] r/bioinformatics
- [ ] r/clinicalresearch
- [ ] r/LLMDevs
- [ ] r/statistics

WARNINGS:
- Reddit's informal rule: self-promotion should be ~10% or less of your
  activity. If your history is mostly links to your own site, expect bans.
- Read each subreddit's sidebar rules first — some ban self-links outright
  or restrict them to weekly threads.
- Engage with comments after posting. Post-and-ghost is the fastest way to
  get flagged as a spammer.

Canonical: https://jaimeyan.com/blog/non-destructive-legacy-modernization-sas.html
