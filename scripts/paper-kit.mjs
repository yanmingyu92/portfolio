#!/usr/bin/env node
// Paper kit — the "three-piece set" generator for a new publication.
// Given a slug from src/data/publications.ts, produces:
//   1. content/posts/<slug>.md      deep-dive scaffold (draft: true), prefilled from the abstract
//   2. review/<date>-<slug>.linkedin.md  LinkedIn post draft
//   3. a printed checklist for the manual steps (repo, Zenodo DOI, GSC indexing)
//
// Usage: node scripts/paper-kit.mjs <slug>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) {
	console.error('usage: node scripts/paper-kit.mjs <slug-from-publications.ts>');
	process.exit(1);
}

// Load publications.ts by bundling it with esbuild (it's TypeScript).
const tmp = join(root, 'node_modules', '.cache', `publications-${Date.now()}.mjs`);
mkdirSync(dirname(tmp), { recursive: true });
esbuild.buildSync({
	entryPoints: [join(root, 'src', 'data', 'publications.ts')],
	bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'silent',
});
const { publications } = await import(pathToFileURL(tmp).href);

const pub = publications.find(p => p.slug === slug);
if (!pub) {
	console.error(`error: no publication with slug "${slug}". Available:`);
	publications.forEach(p => console.error(`  ${p.slug}`));
	process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const year = pub.date.slice(0, 4);
const desc = pub.abstract.split(/(?<=\.)\s/)[0].slice(0, 165);
const tags = pub.keywords.slice(0, 5).map(k => k.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

// ── 1. deep-dive scaffold ────────────────────────────────────────────────────
const postPath = join(root, 'content', 'posts', `${slug}.md`);
if (existsSync(postPath)) {
	console.log(`skip: ${postPath} already exists`);
} else {
	const post = `---
title: "${pub.title.length > 70 ? `${pub.title.slice(0, 67)}...` : pub.title}"
date: ${date}
description: "${desc.replace(/"/g, "'")}${desc.length >= 165 ? '…' : ''}"
tags: [${tags.map(t => `"${t}"`).join(', ')}]
kind: deep-dive
canonicalPath: /blog/${slug}.html
paperRef: ${slug}
draft: true
---

<Hook: open on the concrete problem or the headline result. The abstract's key numbers: ${pub.abstract.match(/\d+[\d.,%/–-]*\S*/g)?.slice(0, 6).join(', ') || 'see abstract'}. ≤120 words.>

> **TL;DR** — <2–3 sentences: what the paper shows, why it matters.>

## <The problem>

<Evidence first. Venue context: published in ${pub.venue}${pub.paperId ? ` (${pub.paperId})` : ''}, ${year}.>

## <The approach>

<How it works. One idea per section. Add a table and a figure or listing — see docs/BLOG-STYLE-GUIDE.md.>

## <The results>

<Numbers only from the paper. Source abstract for reference:
${pub.abstract}>

## Key takeaways

- <3–5 standalone bullets drawn from the abstract's actual findings.>

Full details in the [paper](/papers/${pub.slug}.html) (${pub.venue}${pub.doi ? `, DOI ${pub.doi}` : ''}).
`;
	writeFileSync(postPath, post);
	console.log(`wrote content/posts/${slug}.md (draft: true — expand per style guide, then remove draft flag)`);
}

// ── 2. LinkedIn draft ────────────────────────────────────────────────────────
const reviewDir = join(root, 'review');
mkdirSync(reviewDir, { recursive: true });
const liPath = join(reviewDir, `${date}-${slug}.linkedin.md`);
const li = `# LinkedIn draft — ${pub.title}

> Post after the blog deep-dive is live. Paste into LinkedIn, attach the paper
> PDF or the blog link. Keep the first 2 lines strong — that's all the feed shows.

---

New ${pub.type === 'journal' ? 'paper' : 'work'} out in ${pub.venue}: "${pub.title}"

${desc}

Three things worth knowing:

1. <finding 1, one line, with the number>
2. <finding 2, one line, with the number>
3. <finding 3 or honest limitation, one line>

Write-up with the full analysis: https://jaimeyan.com/blog/${slug}.html
Paper: ${pub.url || `https://jaimeyan.com/papers/${pub.slug}.html`}

${tags.slice(0, 4).map(t => `#${t.replace(/-/g, '')}`).join(' ')} #ClinicalTrials #StatisticalProgramming
`;
writeFileSync(liPath, li);
console.log(`wrote review/${date}-${slug}.linkedin.md`);

// ── 3. manual checklist ──────────────────────────────────────────────────────
console.log(`
manual checklist for "${pub.title}":
  [ ] expand content/posts/${slug}.md → npm run qc:blog → remove draft: true
  [ ] GitHub repo: code + README linking back to https://jaimeyan.com/papers/${slug}.html${pub.codeUrl ? ` (already: ${pub.codeUrl})` : ''}
  [ ] Zenodo archive → DOI → add doi/url to src/data/publications.ts
  [ ] npm run build && vercel --prod
  [ ] GSC URL inspection → request indexing for /papers/${slug}.html and /blog/${slug}.html
  [ ] post review/${date}-${slug}.linkedin.md to LinkedIn
  [ ] dev.to: nothing — RSS import + weekly publisher handle it
`);
