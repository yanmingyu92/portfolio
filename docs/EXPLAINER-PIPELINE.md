# Explainer Pipeline — Blog Post → Interactive Walkthrough → /explainers/

> Status: pilot live (`clinical-data-journey`, 2026-09-01). Pipeline pieces:
> `templates/explainer-template.html` (engine + page spec), `tools/explainer-audit.mjs`
> (Playwright auditor, deps isolated in `tools/explainer/`), registry in
> `src/data/explainers.ts`. The site build never depends on any of it — explainers
> are self-contained HTML files under `public/explainers/`.

## What an explainer is (and is not)

A single self-contained HTML page that teaches one flagship topic as an animated,
step-by-step schematic: scenes of inline SVG revealed beat by beat, one short
narration sentence per beat, legend + honest label + source links per scene.

- **Is**: a teaching schematic with illustrative data, a visual spine that connects
  several posts, playable like a lecture (Space / → / ← / R, speed 1x/1.5x/2x).
- **Is not**: a dashboard, a measured-results figure, a JS framework app, or a
  replacement for the posts (the posts stay the authority; every scene links back).

## Page spec (S1–S9, enforced by the auditor where mechanical)

| # | Rule |
|---|---|
| S1 | Zero external runtime requests. Whitelist (only if genuinely needed): Google Fonts, jsdelivr (KaTeX) — and both must degrade to plain text offline. The pilot ships with zero: system fonts, no KaTeX. |
| S2 | File size ≤ 300 KB before gzip. |
| S3 | Usable at 375 px width; no horizontal overflow at 375 or 1280. |
| S4 | Keyboard: Space = play/pause, → = next beat, ← = previous, R = reset. Never hijack keys from links/buttons. |
| S5 | `prefers-reduced-motion: reduce` → every scene shows its complete final state; player bar is replaced by a static-mode notice. |
| S6 | JavaScript disabled → same complete final state (CSS default; beats/captions live in the DOM). |
| S7 | Beats only toggle opacity/transform inside fixed SVG viewBoxes — no layout-flow changes, no first-screen shift. |
| S8 | Every scene: legend + honest label ("teaching schematic — not measured") + source links to the posts it derives from. |
| S9 | Content discipline: scenes derive from `content/posts/*.md` and `src/data/publications.ts` ONLY. Schematic numbers are labelled illustrative; paper data must cite figure/table numbers. Nothing ever comes from `raw_resource/` — same red lines as the video pipeline (the literal identifiers are the QC REDLINE set in `scripts/blog-qc.mjs`; do not spell them out anywhere). |

## Architecture

```
content/posts/<slug>.md (+ publications.ts where relevant)
  → scene spec (this doc's checklist; human-reviewed BEFORE rendering — the gate
    mirrors the video pipeline's script review)
  → self-contained HTML drafted from templates/explainer-template.html
      (copy the engine verbatim; do not fork it casually)
  → public/explainers/<slug>.html            (zero build coupling)
  → src/data/explainers.ts                   (registry entry)
  → /explainers.html index + blog.html#explainers section (registry-driven)
  → source-post frontmatter: explainer: /explainers/<slug>.html
      → entry card renders under the post's TL;DR (before the video embed)
  → npm run explainer:audit -- public/explainers/<slug>.html   (must pass)
  → npm run build && npm run qc:blog                          (must stay green)
```

Why `public/` and not an Astro route: the hard requirement is self-containment —
no site CSS/JS inheritance, no framework runtime, no build coupling. Astro only
hosts the file; the index page (`src/pages/explainers/index.astro`, emitted as
`/explainers.html` per `build.format: 'file'`) carries the site chrome, canonical,
and CollectionPage JSON-LD; each explainer page carries its own TechArticle +
LearningResource JSON-LD inline.

## Production workflow (per explainer)

1. **Qualify the topic** — flagship only (see cadence below). Write one sentence:
   what the reader can *explain afterwards* that they couldn't before.
2. **Scene spec first (the gate).** For each of 6–8 scenes write: headline, 5–10
   beat narrations (one short sentence each), what the SVG shows at its final
   state, legend keys, honest label, source post + section. Review the spec
   against S8/S9 *before* drawing anything — this mirrors the video pipeline's
   "review the script before rendering" gate.
3. **Draft the page.** Copy `templates/explainer-template.html`; keep the engine
   `<script>` byte-identical; replace masthead/JSON-LD/scenes/footer. All data
   fictional and labelled (Study XYZ pattern; Subjects 001–004).
4. **Self-checks while drafting.** Unique SVG id prefixes per scene (`arr-s3`,
   …); text within viewBox; no absolute URLs except canonical/og/JSON-LD/sources;
   `data-dur` on reading-heavy beats (2000–3000 ms).
5. **Audit.** `npm run explainer:audit -- public/explainers/<slug>.html` →
   0 failures. Also glance at the rendered page at 375 and 1280 (the auditor
   checks overflow/errors mechanically, not aesthetics).
6. **Integrate.** Registry entry in `src/data/explainers.ts`; frontmatter
   `explainer:` on the source posts (entry card auto-renders under the TL;DR);
   rebuild; `npm run qc:blog` stays 0 errors.
7. **Distribute.** LinkedIn/dev.to with the source posts. If a companion video
   exists for any source post, append the explainer link to the YouTube
   description (see VIDEO-PIPELINE's description step); the roadmap post carries
   the card automatically via frontmatter.

## The auditor

```bash
npm run explainer:audit                          # all public/explainers/*.html
npm run explainer:audit -- public/explainers/<slug>.html
```

Checks: size ≤ 300 KB (A) · external requests vs whitelist (B) · overflow at
375/1280 (C) · JS/console errors (D) · reduced-motion full final state + hidden
player (E) · no-JS full final state + readable captions (F) · beat reveal causes
no body-height change (G) · keyboard handlers present (H) · beats-per-scene
guidance 5–10 (warn). Exit 1 on any failure; wire into CI later if the fleet
grows. Deps live in `tools/explainer/` (playwright-core; browsers from the shared
ms-playwright cache) — the site build is never touched.

## Cadence — flagship topics only (3–5 for the whole series)

Adopted 2026-09-01. An explainer costs a focused day (spec → draft → audit);
make one only when a topic is (a) visual, (b) spans multiple posts, (c) has no
comparable free resource. Planned fleet:

| # | Topic | Sources | Status |
|---|---|---|---|
| 1 | From Raw Data to TLF: the clinical data journey | Parts 2/3/4/5/6 (+7/17/16) | **live** — pilot |
| 2 | Graph-constrained validation (what rule engines can't see) | graph-constrained-validation post + paper | planned |
| 3 | The five-layer clinical agent architecture | five-layer-architecture post + paper | planned |
| 4 | Windowing / baseline / LOCF decision rules | Part 17 (+ Part 7) | planned |
| 5 | RAG over TLF template libraries | benchmarking-rag post + paper | planned |

Anything else: write a post, or extend a scene — do not add pages.

## Maintenance

- Engine changes: edit `templates/explainer-template.html`, then propagate the
  identical engine block to every live page, then re-audit all
  (`npm run explainer:audit`). Pages are self-contained by design; duplication
  is the cost of zero-dependency hosting.
- New post that a live explainer sources? No action needed — the explainer links
  to posts by URL, not content inclusion. If the *rules* in a sourced post
  change materially, update the affected scene beats and re-audit.
- Draft/undraft of a source post does not affect the explainer page; the index
  `Built from` links render only for published posts.
- The weekly drip checklist (BOOTCAMP-SERIES-PLAN.md) carries an optional
  "explainer touchpoint" step: verify audit still green if any sourced post
  changed that week.

## One-time setup (already done on this machine)

| Step | Command / Location |
|---|---|
| Auditor deps | `cd tools/explainer && npm install` (playwright-core only) |
| Browsers | shared `ms-playwright` cache (chromium-1234; no extra download) |
| Template | `templates/explainer-template.html` |
| Registry | `src/data/explainers.ts` |
| npm script | `explainer:audit` (root `package.json`) |
