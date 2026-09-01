#!/usr/bin/env node
/**
 * release-video.mjs <slug> [--public] [--skip-upload] [--dry-run]
 *
 * One command for everything AFTER the script review gate:
 *   1. build the video (idempotent, hash-cached)
 *   2. upload via upload-video.mjs (skipped if temp/videos/<slug>/video-id.txt
 *      already exists, or with --skip-upload; --public publishes immediately,
 *      default is private so Studio disclosure can be flipped first)
 *   3. write the videoId into the post frontmatter (lib/writeback)
 *   4. run blog-qc on the post
 *   5. git add + commit + push  → Vercel deploys the embed automatically
 *
 * --dry-run prints the plan and exits before build/upload/git.
 * On the manual-upload path (no OAuth files) it stops after the checklist.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { SITE_ROOT, TOOL_ROOT } from './lib/util.mjs';
import { setVideoId, getVideoId } from './lib/writeback.mjs';

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
	console.error('Usage: node tools/video/release-video.mjs <slug> [--public] [--skip-upload] [--dry-run]');
	process.exit(1);
}
const dryRun = args.includes('--dry-run');
const skipUpload = args.includes('--dry-run') || args.includes('--skip-upload');
const uploadFlags = args.includes('--public') ? ['--public'] : [];
const postFile = path.join('content', 'posts', `${slug}.md`);
const run = (cmd, argv, opts = {}) => spawnSync(cmd, argv, { stdio: 'inherit', cwd: SITE_ROOT, ...opts });

let videoId = getVideoId(slug);
console.log(`== video release: ${slug} ==`);
console.log(`videoId on file: ${videoId || '(none — will upload)'}`);
if (dryRun) {
	console.log(`dry-run plan: build → upload(${uploadFlags.join(' ') || 'private'}) → write videoId → qc → commit+push`);
	process.exit(0);
}

// 1. build (idempotent)
console.log('\n[1/5] build');
const build = run('node', [path.join(TOOL_ROOT, 'build-video.mjs'), slug]);
if (build.status !== 0) { console.error('build failed — aborting'); process.exit(1); }

// 2. upload (unless we already have an id)
if (!videoId && !skipUpload) {
	console.log('\n[2/5] upload');
	const up = run('node', [path.join(TOOL_ROOT, 'upload-video.mjs'), slug, ...uploadFlags]);
	if (up.status !== 0) { console.error('upload failed — aborting'); process.exit(1); }
	videoId = getVideoId(slug);
	if (!videoId) {
		console.error('\nNo videoId produced (manual-upload path). Complete the checklist at');
		console.error(`temp/videos/${slug}-youtube-upload.txt, then re-run with --skip-upload after`);
		console.error('placing the id in temp/videos/${slug}/video-id.txt or the frontmatter.');
		process.exit(0);
	}
} else {
	console.log('\n[2/5] upload skipped (existing videoId or --skip-upload)');
}

// 3. write-back
console.log(`\n[3/5] write videoId=${videoId} into ${postFile}`);
const written = setVideoId(slug, videoId);
console.log(`updated: ${written}`);

// 4. QC
console.log('\n[4/5] blog QC');
const qc = run('node', [path.join(SITE_ROOT, 'scripts', 'blog-qc.mjs'), '--all', postFile]);
if (qc.status !== 0) { console.error('QC failed — videoId written but NOT committed. Fix and commit manually.'); process.exit(1); }

// 5. commit + push
console.log('\n[5/5] commit + push (Vercel deploys the embed)');
const add = run('git', ['add', postFile]);
const staged = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd: SITE_ROOT, encoding: 'utf8' });
if (add.status !== 0 || !staged.stdout.trim()) {
	console.log('Nothing to commit (videoId already committed) — done.');
} else {
	const commit = run('git', ['commit', '-m', `feat(video): embed companion video for ${slug}`, '-m', `YouTube ${videoId}; via release-video.mjs (build + upload + write-back + QC).`]);
	const push = run('git', ['push', 'origin', 'main']);
	if (commit.status !== 0 || push.status !== 0) { console.error('git step failed — resolve and push manually.'); process.exit(1); }
}

console.log(`\nDone. https://youtu.be/${videoId}  → embedded on /blog/${slug}.html`);
console.log('Remaining manual steps in YouTube Studio:');
console.log('  1. flip "Altered content" disclosure (once per video)');
console.log('  2. set visibility to Public (or re-run with --public next time)');
