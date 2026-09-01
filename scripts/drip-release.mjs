#!/usr/bin/env node
// Weekly drip release helper for the clinical-sp-bootcamp series.
// Usage: node scripts/drip-release.mjs <slug> [<slug2> ...]
//
// For each slug:
//   1. flips the post live: date -> today, removes `draft: true`
//   2. linkifies its plain title in the roadmap post (if listed unlinked)
//   3. scans the released post for /blog/ links that still point at drafts
//   4. runs blog-qc on the released file
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'content', 'posts');
const ROADMAP = 'clinical-sp-bootcamp-roadmap';
const today = new Date().toISOString().slice(0, 10);
const slugs = process.argv.slice(2).filter(a => !a.startsWith('--'));

if (slugs.length === 0) {
	console.error('usage: node scripts/drip-release.mjs <slug> [<slug2> ...]');
	process.exit(1);
}

const isDraft = slug => {
	const p = join(postsDir, `${slug}.md`);
	return existsSync(p) && /^draft:\s*true\s*$/m.test(readFileSync(p, 'utf8'));
};

for (const slug of slugs) {
	const file = join(postsDir, `${slug}.md`);
	if (!existsSync(file)) { console.error(`error: ${slug}: not found`); process.exitCode = 1; continue; }

	let raw = readFileSync(file, 'utf8');
	if (!/^draft:\s*true\s*$/m.test(raw)) {
		console.log(`${slug}: already live, skipped flip`);
	} else {
		raw = raw.replace(/^date:.*$/m, `date: ${today}`)
			.replace(/^#*\s*draft:\s*true\s*$/m, '')
			.replace(/\n{3,}/g, '\n\n');
		writeFileSync(file, raw);
		console.log(`${slug}: published (date=${today})`);
	}

	// Linkify the roadmap row (skip for the roadmap itself).
	// Row format: "| N — Short name | Line | ..." — match by part number first,
	// fall back to exact full-title match.
	if (slug !== ROADMAP) {
		const roadmapPath = join(postsDir, `${ROADMAP}.md`);
		if (existsSync(roadmapPath)) {
			const roadmap = readFileSync(roadmapPath, 'utf8');
			const order = (raw.match(/^seriesOrder:\s*(\d+)\s*$/m) || [])[1];
			let updated = roadmap;
			if (order && roadmap.includes(`](/blog/${slug}.html)`)) {
				console.log(`  roadmap: already linked`);
			} else if (order) {
				const rowRe = new RegExp(`^(\\|\\s*)${order}\\s*[—-]\\s*([^|]+?)(\\s*\\|)`, 'm');
				updated = roadmap.replace(rowRe, `$1[${order} — $2](/blog/${slug}.html)$3`);
				if (updated !== roadmap) {
					writeFileSync(roadmapPath, updated);
					console.log(`  roadmap: row ${order} linked`);
				} else {
					console.log(`  roadmap: row ${order} not found (update manually)`);
				}
			}
		}
	}

	// Forward-reference hygiene: markdown links to still-draft posts are
	// de-linked to plain text (the series sidebar/nav already navigates
	// published parts, so prose next/previous links are redundant while a
	// neighbor is unreleased). Non-fatal by design — weekly drips always
	// link their unreleased neighbors.
	{
		let cur = readFileSync(file, 'utf8');
		let deLinked = 0;
		cur = cur.replace(/\[([^\]]+)\]\(\/blog\/([a-z0-9-]+)\.html\)/g, (m, text, target) => {
			if (target !== slug && isDraft(target)) { deLinked++; return text; }
			return m;
		});
		if (deLinked) {
			writeFileSync(file, cur);
			console.log(`  de-linked ${deLinked} forward reference(s) to still-draft posts`);
		}
		const dead = [...cur.matchAll(/\/blog\/([a-z0-9-]+)\.html/g)]
			.map(m => m[1]).filter(s => isDraft(s));
		if (dead.length) console.warn(`  WARN  plain-text refs to still-draft posts (informational): ${[...new Set(dead)].join(', ')}`);
	}

	try {
		execFileSync('node', [join(root, 'scripts', 'blog-qc.mjs'), '--all', file], { stdio: 'inherit' });
	} catch { process.exitCode = 1; }
}
