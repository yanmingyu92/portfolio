#!/usr/bin/env node
// Weekly dev.to publisher — flips the next N RSS-imported drafts to published.
//
// Order comes from the site's RSS feed (already date-desc): blog posts only.
// Paper abstracts (canonical /papers/...) are skipped unless --include-papers.
// No state file needed: each run re-reads the unpublished list, so the queue
// drains itself. Missing DEV_TO_API_KEY => dry-run, exit 0.
//
// Usage:
//   node scripts/devto-publish-weekly.mjs [--max 2] [--dry-run] [--include-papers]
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// load .env without overriding real env vars (CI provides the secret directly)
const envFile = join(root, '.env');
if (existsSync(envFile)) {
	for (const line of readFileSync(envFile, 'utf8').split('\n')) {
		const m = line.match(/^([A-Z_]+)=(\S.*)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
	}
}

const args = process.argv.slice(2);
const flag = n => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i !== -1 && args[i + 1] ? args[i + 1] : d; };

const MAX = parseInt(opt('max', '2'), 10);
const DRY = flag('dry-run') || !process.env.DEV_TO_API_KEY;
const INCLUDE_PAPERS = flag('include-papers');
const FEED = 'https://jaimeyan.com/rss.xml';

async function api(path, method = 'GET', body) {
	const res = await fetch(`https://dev.to/api${path}`, {
		method,
		headers: { 'api-key': process.env.DEV_TO_API_KEY, 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) throw new Error(`dev.to ${method} ${path} -> ${res.status}: ${await res.text()}`);
	return res.json();
}

// 1. canonical order from the RSS feed (date-desc by construction)
const xml = await (await fetch(FEED)).text();
const feedOrder = [...xml.matchAll(/<link>(https:\/\/jaimeyan\.com\/(blog|papers)\/[^<]+)<\/link>/g)]
	.map(m => m[1])
	.filter(l => INCLUDE_PAPERS || l.includes('/blog/'));
console.log(`feed order: ${feedOrder.length} candidate URLs${INCLUDE_PAPERS ? ' (papers included)' : ''}`);

if (DRY && !process.env.DEV_TO_API_KEY) console.log('no DEV_TO_API_KEY — dry-run');

// 2. unpublished drafts whose canonical URL is in the feed
const drafts = await api('/articles/me/unpublished?per_page=1000');
const queue = feedOrder
	.map(url => drafts.find(d => d.canonical_url === url))
	.filter(Boolean);
console.log(`unpublished drafts matching feed: ${queue.length} (of ${drafts.length} total drafts)`);

// 3. publish the next MAX
const batch = queue.slice(0, MAX);
if (batch.length === 0) { console.log('queue empty — nothing to publish'); process.exit(0); }

for (const d of batch) {
	console.log(`${DRY ? '[dry-run] would publish' : 'publishing'}: ${d.title}`);
	console.log(`  canonical: ${d.canonical_url}`);
	if (!DRY) {
		await api(`/articles/${d.id}`, 'PUT', { article: { published: true } });
		console.log(`  -> live at ${d.url}`);
	}
}
console.log(`done: ${batch.length} ${DRY ? 'would be' : ''} published, ${queue.length - batch.length} left in queue`);
