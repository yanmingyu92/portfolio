# Blog Style Guide — jaimeyan.com

All posts in `content/posts/` follow this guide. Enforced by `npm run qc:blog`.

## Two content types (`kind` in frontmatter)

| kind | Purpose | Length | Funnel role |
|---|---|---|---|
| `deep-dive` | Companion to a published paper (`paperRef` required) | 900–1,400 words | credibility → citations |
| `explainer` | Field guide / hot topic, no paper required | 1,200–1,800 words | search traffic → deep-dives |

Explainers are the drainage (引流) layer: they target what people actually search for
(CDISC CORE, SAS→R migration, LLMs in GxP, pharmaverse) and link inward to deep-dives
and `/papers/*.html`.

## Voice

- Direct, operator-style. Concrete first, explanation after.
- Short sentences. Specific numbers when they exist in the source material.
- First person is fine. Opinion is fine when earned by evidence shown earlier.
- **Never invent numbers, citations, study results, or quotes.** Every metric must
  come from the post's source material (the linked paper / `src/data/publications.ts`)
  or be common, verifiable field knowledge.

### Banned patterns (QC fails on these)

- "In today's rapidly evolving landscape" and any generic opening
- "Moreover", "Furthermore", "It's important to note", "In conclusion", "delve into"
- Hype: "game-changer", "cutting-edge", "revolutionary", "seamlessly", "unlock the power"
- Vague claims without evidence ("greatly improves", "significantly faster" with no number)
- Self-congratulation ("I am thrilled to share")

## Required structure

Every post, both kinds:

1. **Frontmatter** — `title` (≤70 chars), `date`, `description` (120–170 chars, this is
   the SERP snippet), `tags` (3–6, kebab-case), `canonicalPath`, `kind`,
   `paperRef` (deep-dives only).
2. **Hook** (≤120 words) — a concrete scene, contradiction, number, or result.
   No throat-clearing.
3. **TL;DR box** — a blockquote right after the hook: 2–3 sentences, what the reader gets.
4. **Body sections** — one idea per `##` section; section opens with evidence or example.
5. **TLF requirement** — every post ships at least:
   - one **Table** (comparison, results, checklist — markdown table), and
   - one **Figure or Listing** (SVG in `/public/figures/` referenced with `![alt](/figures/x.svg)`
     plus a `*Figure N: caption*` line, or a fenced code block).
   Tables and figures must carry information, not decoration.
6. **Key takeaways** — 3–5 bullets, each a standalone sentence a skimmer can use.
7. **FAQ** (explainers required, deep-dives optional) — 3–5 `### Question?` items with
   2–3 sentence answers. This is the AEO layer for answer engines.
8. **Inward links** — at least one link to `/papers/*.html` or another post.
   Deep-dives end with the paper link.

## Readability bar

- A skimmer reading only headings + tables + takeaways gets the full argument.
- No paragraph over 4 sentences. No section over ~250 words without a sub-break.
- Code blocks: keep under 15 lines; use pseudocode when the real code is longer.
- Figures: simple SVG, site palette (stone/rose: `#1c1917`, `#9f1239`, `#d6d3d1`,
  `#fafaf9`), legible at 700px wide, text ≥13px.

## Workflow

```bash
npm run new-post -- --slug my-topic --kind explainer --title "My Topic"
# write content/posts/my-topic.md per this guide
npm run qc:blog          # lint all posts
npm run build            # verify
node scripts/syndicate/run.mjs   # drafts into review/
```
