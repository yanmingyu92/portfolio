#!/usr/bin/env node
// Weekly drip planner — prints the queue entries due for release as JSON.
// An entry is due when its date <= today AND the post file still has draft: true.
// Usage: node scripts/drip-next.mjs [--date YYYY-MM-DD]   (default: today UTC)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const i = args.indexOf('--date');
const today = (i !== -1 && args[i + 1]) || new Date().toISOString().slice(0, 10);

const queue = JSON.parse(readFileSync(join(root, 'docs', 'drip-queue.json'), 'utf8'));
const due = queue.filter(e => {
	if (e.date > today) return false;
	const p = join(root, 'content', 'posts', `${e.slug}.md`);
	return existsSync(p) && /^draft:\s*true\s*$/m.test(readFileSync(p, 'utf8'));
});
console.log(JSON.stringify(due));
