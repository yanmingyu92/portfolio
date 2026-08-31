#!/usr/bin/env node
// Zenodo kit — one-command DOI for a publication from src/data/publications.ts.
// Builds full metadata (authors + ORCID, abstract, keywords, related links back
// to jaimeyan.com) and drives scripts/zenodo-deposit.mjs for the actual upload.
//
// Usage:
//   node scripts/zenodo-kit.mjs <slug> [--pdf path/to.pdf] [--publish] [--sandbox]
//
// Defaults: DRY metadata preview against the sandbox — nothing is published
// unless --publish is passed (and ZENODO_TOKEN is set). Always test with
// --sandbox first.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const slug = args[0];
const flag = n => args.includes(`--${n}`);
const opt = n => { const i = args.indexOf(`--${n}`); return i !== -1 ? args[i + 1] : undefined; };

if (!slug || slug.startsWith('--')) {
	console.error('usage: node scripts/zenodo-kit.mjs <slug> [--pdf path] [--publish] [--sandbox]');
	process.exit(1);
}

const tmp = join(root, 'node_modules', '.cache', `pubs-${Date.now()}.mjs`);
mkdirSync(dirname(tmp), { recursive: true });
esbuild.buildSync({ entryPoints: [join(root, 'src', 'data', 'publications.ts')], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'silent' });
const { publications } = await import(pathToFileURL(tmp).href);

const pub = publications.find(p => p.slug === slug);
if (!pub) { console.error(`error: unknown slug "${slug}"`); process.exit(1); }
if (pub.doi) {
	console.log(`skip: ${slug} already has DOI ${pub.doi} — no Zenodo record needed.`);
	process.exit(0);
}

const pdf = opt('pdf') || (pub.pdfUrl ? join(root, 'public', pub.pdfUrl.replace(/^\//, '')) : undefined);
if (!pdf || !existsSync(pdf)) {
	console.error(`error: no PDF found. Pass --pdf <path> (or add pdfUrl to publications.ts).`);
	process.exit(1);
}

const PUB_TYPE = { journal: 'article', conference: 'conferencepaper', poster: 'poster', preprint: 'preprint' };
const creators = pub.authors.map(name => {
	const parts = name.trim().split(/\s+/);
	const c = { person_or_org: { type: 'personal', family_name: parts.at(-1), given_name: parts.slice(0, -1).join(' ') } };
	if (name === 'Jaime Yan') c.person_or_org.identifiers = [{ scheme: 'orcid', identifier: '0009-0007-1786-7259' }];
	return c;
});

const metadata = {
	upload_type: 'publication',
	publication_type: PUB_TYPE[pub.type] || 'article',
	creators,
	description: `${pub.abstract}\n\nPresented at / published in: ${pub.venue}${pub.paperId ? ` (paper ${pub.paperId})` : ''}, ${pub.date.slice(0, 4)}. Author page: https://jaimeyan.com/papers/${pub.slug}.html`,
	publication_date: pub.date.length === 4 ? `${pub.date}-01-01` : pub.date,
	keywords: pub.keywords,
	related_identifiers: [
		{ identifier: `https://jaimeyan.com/papers/${pub.slug}.html`, relation: 'isSupplementedBy', scheme: 'url' },
		...(pub.url ? [{ identifier: pub.url, relation: 'isIdenticalTo', scheme: 'url' }] : []),
	],
	license: 'CC-BY-4.0',
};

const metaFile = join(root, 'node_modules', '.cache', `zenodo-meta-${slug}.json`);
writeFileSync(metaFile, JSON.stringify(metadata, null, 2));

const publish = flag('publish');
const env = { ...process.env };
if (flag('sandbox') || !publish) env.ZENODO_BASE_URL = 'https://sandbox.zenodo.org/api';

console.log(`[zenodo-kit] ${slug} -> ${pdf}`);
console.log(`[zenodo-kit] mode: ${publish ? 'REAL deposit (zenodo.org)' : 'sandbox dry-check (pass --publish for the real DOI)'}`);
try {
	execFileSync('node', [join(root, 'scripts', 'zenodo-deposit.mjs'), pdf, '--title', pub.title, '--metadata', metaFile, ...(publish ? ['--publish'] : [])], { stdio: 'inherit', env });
} catch {
	process.exit(1);
}

console.log(`
next steps after a real deposit:
  [ ] add the Zenodo DOI to src/data/publications.ts:  doi: '10.5281/zenodo.XXXXXXX', url: 'https://doi.org/...'
  [ ] npm run build && vercel --prod  (citation_doi meta tag appears on /papers/${slug}.html)
  [ ] ORCID: if DataCite auto-update is authorized, the record appears automatically
`);
