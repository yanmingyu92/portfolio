#!/usr/bin/env node
// Scaffold a new blog post from templates/post-template.md.
// Usage: node scripts/new-post.mjs --slug my-topic --kind explainer --title "My Topic"
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
	const i = args.indexOf(`--${name}`);
	return i !== -1 && args[i + 1] ? args[i + 1] : def;
};

const slug = opt('slug');
const kind = opt('kind', 'explainer');
const title = opt('title', slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null);

if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
	console.error('error: --slug is required (kebab-case, e.g. --slug sas-to-r-migration)');
	process.exit(1);
}
const TEMPLATES = { 'deep-dive': 'post-template.md', explainer: 'post-template.md', survey: 'survey-template.md', note: 'note-template.md' };
if (!TEMPLATES[kind]) {
	console.error(`error: --kind must be one of ${Object.keys(TEMPLATES).join(', ')}`);
	process.exit(1);
}

const target = join(root, 'content', 'posts', `${slug}.md`);
if (existsSync(target)) {
	console.error(`error: ${target} already exists`);
	process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const filled = readFileSync(join(root, 'templates', TEMPLATES[kind]), 'utf8')
	.replaceAll('{{TITLE}}', title)
	.replaceAll('{{DATE}}', date)
	.replaceAll('{{SLUG}}', slug)
	.replaceAll('{{KIND}}', kind);

writeFileSync(target, filled);
console.log(`created content/posts/${slug}.md (kind=${kind}, date=${date})`);
console.log('next: write the post per docs/BLOG-STYLE-GUIDE.md, then npm run qc:blog');
