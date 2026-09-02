#!/usr/bin/env node
// Explainer auditor — Playwright checks for self-contained interactive explainer pages.
// Usage:
//   node tools/explainer-audit.mjs                    (audits all public/explainers/*.html)
//   node tools/explainer-audit.mjs <file.html> ...    (audits specific files)
//   npm run explainer:audit -- <file.html>
//
// Checks (spec in templates/explainer-template.html, workflow in docs/EXPLAINER-PIPELINE.md):
//   A  size <= 300 KB before gzip (S2)
//   B  no external runtime requests, whitelist: Google Fonts + jsdelivr (KaTeX) (S1)
//   C  viewport 375 + 1280: no horizontal overflow (S3)
//   D  no JS errors / console errors
//   E  prefers-reduced-motion: full final state visible, player hidden (S5)
//   F  JavaScript disabled: full final state visible, captions readable (S6)
//   G  beat reveal causes no layout change (body height identical before/after full reveal) (S7)
//   H  keyboard contract present (Space/ArrowLeft/ArrowRight/R handlers) — static scan
//
// Playwright resolution: tools/explainer/node_modules (own deps, site build untouched;
// mirrors the tools/video pattern). Browsers are expected in the default
// ms-playwright cache (PLAYWRIGHT_BROWSERS_PATH honored if set).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPLAINERS_DIR = join(root, 'public', 'explainers');
const SIZE_LIMIT = 300 * 1024;
const HOST_WHITELIST = new Set([
	'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', // fonts + KaTeX (must degrade offline)
]);

const argv = process.argv.slice(2).filter(a => !a.startsWith('--'));
let files = argv.length
	? argv.map(f => resolve(process.cwd(), f))
	: (existsSync(EXPLAINERS_DIR) ? readdirSync(EXPLAINERS_DIR).filter(f => f.endsWith('.html')).map(f => join(EXPLAINERS_DIR, f)) : []);
if (!files.length) {
	console.error('no explainer files found (expected public/explainers/*.html or explicit paths)');
	process.exit(2);
}

// ---- resolve playwright-core from tools/explainer -------------------------------------------
const toolsReq = createRequire(join(root, 'tools', 'explainer', 'package.json'));
let chromium;
try {
	const pw = await import(pathToFileURL(toolsReq.resolve('playwright-core')).href);
	chromium = pw.chromium || pw.default?.chromium;
} catch (e) {
	console.error('playwright-core not found. Install once:  cd tools/explainer && npm install');
	console.error('(browsers live in the shared ms-playwright cache; nothing else is downloaded)');
	process.exit(2);
}

let failures = 0, warnings = 0;
const fail = (f, m) => { failures++; console.log(`  FAIL  ${m}`); };
const warn = (f, m) => { warnings++; console.log(`  warn  ${m}`); };
const ok = (m) => console.log(`  ok    ${m}`);

async function auditPage(browser, file) {
	const rel = relative(root, file);
	console.log(`\n${rel}  (${(readFileSync(file).length / 1024).toFixed(1)} KB)`);

	// A: size
	if (readFileSync(file).length > SIZE_LIMIT) fail(rel, `size > 300 KB (S2)`); else ok(`size within 300 KB (S2)`);

	// H: static keyboard-contract scan
	const src = readFileSync(file, 'utf8');
	for (const key of ["'Space'", 'ArrowRight', 'ArrowLeft', "'r'"]) {
		if (!src.includes(key)) fail(rel, `keyboard contract missing handler for ${key} (S4)`);
	}
	ok('keyboard contract handlers present (S4)');
	if (!/data-beat=/.test(src)) fail(rel, 'no [data-beat] groups found — not an explainer page?');

	const url = pathToFileURL(file).href;

	// B/C/D/G: normal mode, both viewports
	for ( const vp of [{ width: 375, height: 720 }, { width: 1280, height: 860 }] ) {
		const ctx = await browser.newContext({ viewport: vp });
		const page = await ctx.newPage();
		const jsErrors = [], requests = [];
		page.on('pageerror', e => jsErrors.push(String(e?.message || e)));
		page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });
		page.on('request', r => requests.push(r.url()));
		await page.goto(url, { waitUntil: 'load' });
		await page.waitForTimeout(250);

		const label = `viewport ${vp.width}`;
		// C: horizontal overflow
		const overflow = await page.evaluate(() => {
			const d = document.documentElement;
			return { sw: d.scrollWidth, cw: d.clientWidth, bw: document.body.scrollWidth };
		});
		if (overflow.sw > overflow.cw + 1 || overflow.bw > overflow.cw + 1)
			fail(rel, `${label}: horizontal overflow (scrollWidth ${overflow.sw}/${overflow.bw} > clientWidth ${overflow.cw}) (S3)`);
		else ok(`${label}: no horizontal overflow (S3)`);

		// D: errors
		if (jsErrors.length) fail(rel, `${label}: ${jsErrors.length} JS/console error(s): ${jsErrors.slice(0, 3).join(' | ')}`);
		else ok(`${label}: 0 JS errors (D)`);

		// B: external requests
		const ext = [...new Set(requests.filter(u => !u.startsWith('data:') && !u.startsWith('about:') && u !== url))];
		const bad = ext.filter(u => {
			try { return !HOST_WHITELIST.has(new URL(u).host); } catch { return true; }
		});
		if (bad.length) fail(rel, `${label}: non-whitelisted external request(s): ${bad.join(', ')} (S1)`);
		else ok(`${label}: external requests ${ext.length === 0 ? '0' : 'whitelisted only: ' + ext.join(', ')} (S1)`);

		// G: beat reveal must not change layout flow
		const layout = await page.evaluate(() => {
			const h0 = document.body.scrollHeight;
			document.querySelectorAll('svg [data-beat]').forEach(g => g.classList.add('on'));
			return { h0, h1: document.body.scrollHeight };
		});
		if (layout.h0 !== layout.h1)
			fail(rel, `${label}: body height changed ${layout.h0} -> ${layout.h1} after full beat reveal (S7)`);
		else ok(`${label}: beat reveal causes no layout change (S7)`);

		// content guidance: 5-10 beats per scene (warn only)
		if (vp.width === 1280) {
			const sceneStats = await page.evaluate(() =>
				[...document.querySelectorAll('.scene')].map(s => s.querySelectorAll('.beats li').length));
			if (!sceneStats.length) fail(rel, 'no .scene sections found');
			else {
				const odd = sceneStats.filter(n => n < 5 || n > 10).length;
				if (odd) warn(rel, `${odd}/${sceneStats.length} scene(s) outside 5-10 beats (${sceneStats.join(',')})`);
				else ok(`scene beats within 5-10 (${sceneStats.join(',')})`);
			}
		}
		await ctx.close();
	}

	// E: reduced motion -> full final state, player hidden
	{
		const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
		const page = await ctx.newPage();
		const errors = [];
		page.on('pageerror', e => errors.push(String(e?.message || e)));
		await page.goto(url, { waitUntil: 'load' });
		await page.waitForTimeout(250);
		const rm = await page.evaluate(() => {
			const beats = [...document.querySelectorAll('svg [data-beat]')];
			const invisible = beats.filter(g => parseFloat(getComputedStyle(g).opacity) < 0.95).length;
			const player = document.querySelector('.player');
			const playerHidden = !player || getComputedStyle(player).display === 'none';
			return { total: beats.length, invisible, playerHidden, staticMode: document.documentElement.classList.contains('static') };
		});
		if (rm.total === 0) fail(file, 'no [data-beat] elements found');
		if (rm.invisible > 0) fail(rel, `reduced-motion: ${rm.invisible}/${rm.total} beats still hidden (S5)`);
		else ok(`reduced-motion: all ${rm.total} beats visible (S5)`);
		if (!rm.playerHidden) fail(rel, 'reduced-motion: player bar still visible (S5)');
		else ok('reduced-motion: player bar hidden (S5)');
		if (!rm.staticMode) warn(rel, 'reduced-motion: html.static flag not set (CSS fallback still covers it)');
		if (errors.length) fail(rel, `reduced-motion: JS errors: ${errors.slice(0, 2).join(' | ')}`);
		await ctx.close();
	}

	// F: no JavaScript -> full final state + readable captions
	{
		const ctx = await browser.newContext({ viewport: { width: 375, height: 720 }, javaScriptEnabled: false });
		const page = await ctx.newPage();
		const requests = [];
		page.on('request', r => requests.push(r.url()));
		await page.goto(url, { waitUntil: 'load' });
		await page.waitForTimeout(150);
		const nojs = await page.evaluate(() => {
			const beats = [...document.querySelectorAll('svg [data-beat]')];
			const invisible = beats.filter(g => parseFloat(getComputedStyle(g).opacity) < 0.95).length;
			const caps = [...document.querySelectorAll('.beats li')];
			const emptyCaps = caps.filter(li => !li.textContent.trim()).length;
			const player = document.querySelector('.player');
			const playerHidden = !player || getComputedStyle(player).display === 'none';
			const noJsClass = document.documentElement.classList.contains('js');
			const d = document.documentElement;
			return { total: beats.length, invisible, caps: caps.length, emptyCaps, playerHidden, noJsClass, sw: d.scrollWidth, cw: d.clientWidth };
		});
		if (nojs.noJsClass) fail(rel, 'no-JS: html still has .js class (inline bootstrap missing?)');
		if (nojs.invisible > 0) fail(rel, `no-JS: ${nojs.invisible}/${nojs.total} beats hidden (S6)`);
		else ok(`no-JS: all ${nojs.total} beats visible (S6)`);
		if (nojs.emptyCaps > 0 || nojs.caps === 0) fail(rel, `no-JS: captions missing/empty (${nojs.emptyCaps}/${nojs.caps}) (S6)`);
		else ok(`no-JS: ${nojs.caps} narration captions readable (S6)`);
		if (!nojs.playerHidden) fail(rel, 'no-JS: player bar visible without JS (S6)');
		if (nojs.sw > nojs.cw + 1) fail(rel, `no-JS: horizontal overflow at 375px (${nojs.sw} > ${nojs.cw})`);
		await ctx.close();
	}
}

const browser = await chromium.launch();
try {
	for (const f of files) await auditPage(browser, f);
} finally {
	await browser.close();
}
console.log(`\n${files.length} file(s): ${failures} failure(s), ${warnings} warning(s)`);
process.exit(failures ? 1 : 0);
