#!/usr/bin/env node
// Blog QC linter — enforces docs/BLOG-STYLE-GUIDE.md mechanically.
// Usage: node scripts/blog-qc.mjs [post.md ...]   (no args = all posts)
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'content', 'posts');

const BANNED = [
	/in today'?s (rapidly )?evolving/i, /fast-paced world/i, /\bmoreover\b/i, /\bfurthermore\b/i,
	/it'?s important to note/i, /in conclusion/i, /\bdelve into\b/i, /\bdelves into\b/i,
	/game-?chang(er|ing)/i, /cutting-edge/i, /revolutionar/i, /\bseamlessly\b/i,
	/unlock the power/i, /thrilled to (share|announce)/i, /ever-evolving/i, /\blandscape of\b/i,
];

const files = process.argv.slice(2).length
	? process.argv.slice(2)
	: readdirSync(postsDir).filter(f => f.endsWith('.md')).map(f => join(postsDir, f));

let errors = 0, warnings = 0;
const err = (f, m) => { errors++; console.log(`  ERROR  ${m}`); };
const warn = (f, m) => { warnings++; console.log(`  warn   ${m}`); };

for (const file of files) {
	const name = basename(file);
	const raw = readFileSync(file, 'utf8');
	console.log(`\n${name}`);

	const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!fmMatch) { err(name, 'missing frontmatter'); continue; }
	const [, fm, body] = fmMatch;
	const field = k => (fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1]?.replace(/^["']|["']$/g, '').trim();

	// frontmatter
	for (const k of ['title', 'date', 'description', 'canonicalPath'])
		if (!field(k)) err(name, `frontmatter missing ${k}`);
	const title = field('title') || '';
	const desc = field('description') || '';
	const kind = field('kind') || 'deep-dive';
	if (title.length > 70) warn(name, `title ${title.length} chars (>70)`);
	if (desc && (desc.length < 120 || desc.length > 170))
		warn(name, `description ${desc.length} chars (target 120–170)`);
	if (!/^tags:\s*\[.+\]/m.test(fm)) warn(name, 'no tags');
	if (kind === 'deep-dive' && !field('paperRef')) err(name, 'deep-dive missing paperRef');

	// structure
	const words = body.split(/\s+/).filter(Boolean).length;
	if (kind === 'note') {
		if (words < 150) err(name, `${words} words (< 150 for note)`);
	} else {
		const minWords = kind === 'explainer' ? 1000 : 700;
		if (words < minWords) err(name, `${words} words (< ${minWords} for ${kind})`);
		if (!/^>\s*\*\*TL;DR\*\*/m.test(body)) err(name, 'missing TL;DR blockquote');
		if (!/\|[\s:-]+\|[\s:-]+\|/.test(body)) err(name, 'no markdown table (TLF requirement)');
		if (!/!\[.+\]\(.+\)|```/.test(body)) err(name, 'no figure or code listing (TLF requirement)');
		if (!/^##\s+Key takeaways/im.test(body)) err(name, 'missing "## Key takeaways"');
		if (kind === 'explainer' && !/^##\s+FAQ/im.test(body)) err(name, 'explainer missing "## FAQ"');
	}
	if (!/\]\(\/(papers|blog)\//.test(body)) warn(name, 'no inward link to /papers/ or /blog/');
	if (/^#\s/m.test(body)) err(name, 'h1 in body (title comes from frontmatter)');
	const h2s = (body.match(/^##\s/gm) || []).length;
	if (kind !== 'note' && h2s < 3) warn(name, `only ${h2s} h2 sections`);

	// banned patterns
	for (const re of BANNED) {
		const hit = body.match(re);
		if (hit) err(name, `banned phrase: "${hit[0]}"`);
	}
}

console.log(`\n${files.length} file(s): ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
