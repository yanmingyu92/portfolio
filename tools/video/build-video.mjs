#!/usr/bin/env node
/**
 * build-video.mjs <slug> — Markdown tutorial -> 1080p lecture video.
 *
 * Stages (all cached & idempotent):
 *   1. extract script from content/posts/<slug>.md  -> temp/videos/<slug>/script.json (+ script.md for review)
 *   2. TTS per slide (edge-tts via uv)              -> temp/videos/<slug>/cache/tts/
 *   3. slide states -> HTML -> PNG (puppeteer+Chrome) -> temp/videos/<slug>/cache/slides/
 *   4. timeline (sentence<->state sync, SRT, chapters)
 *   5. ffmpeg assembly                              -> temp/videos/<slug>.mp4 + <slug>.srt
 *
 * Flags: --script-only  stop after step 1 (review script before rendering)
 *        --force        ignore caches / manifest
 *        --voice=...    override voice (default en-US-AndrewNeural)
 *        --rate=...     override rate (default +10%)
 */
import path from 'node:path';
import fs from 'node:fs';
import { SITE_ROOT, TOOL_ROOT, ensureDir, writeUtf8, readUtf8, sha1, fmtSrtTime, fmtClock, wordCount } from './lib/util.mjs';
import { extractScript } from './lib/extract-script.mjs';
import { slideToHtml } from './lib/slides-html.mjs';
import { renderStates } from './lib/render-slides.mjs';
import { ensureTts } from './lib/tts.mjs';
import { buildTimeline } from './lib/timeline.mjs';
import { assembleVideo } from './lib/assemble.mjs';
import { coverHtml } from './lib/cover.mjs';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
if (!slug) {
  console.error('Usage: node build-video.mjs <slug> [--script-only] [--force] [--voice=...] [--rate=...]');
  process.exit(1);
}
const flag = (name) => args.some((a) => a === `--${name}`);
const opt = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1];
const SCRIPT_ONLY = flag('script-only');
const FORCE = flag('force');

const PIPELINE_VERSION = 1;

const mdPath = path.join(SITE_ROOT, 'content', 'posts', `${slug}.md`);
if (!fs.existsSync(mdPath)) {
  console.error(`Post not found: ${mdPath}`);
  process.exit(1);
}
const md = readUtf8(mdPath);

const outRoot = ensureDir(path.join(SITE_ROOT, 'temp', 'videos', slug));
const workDir = ensureDir(path.join(outRoot, 'work'));
const cacheDir = ensureDir(path.join(outRoot, 'cache'));
const htmlDir = ensureDir(path.join(cacheDir, 'html'));
const pngDir = ensureDir(path.join(cacheDir, 'slides'));
const outMp4 = path.join(SITE_ROOT, 'temp', 'videos', `${slug}.mp4`);
const outSrt = path.join(SITE_ROOT, 'temp', 'videos', `${slug}.srt`);

/* ---------- 1. script ---------- */
const overrides = {};
if (opt('voice')) overrides.voice = opt('voice');
if (opt('rate')) overrides.rate = opt('rate');
const script = extractScript(md, slug, overrides);
const scriptJson = JSON.stringify(script, null, 2);
writeUtf8(path.join(outRoot, 'script.json'), scriptJson);
writeUtf8(path.join(outRoot, 'script.md'), renderScriptMd(script));

console.log(`Script: ${script.stats.words} words, ~${script.stats.estMinutes} min, ${script.chapters.flatMap((c) => c.slides).length} slides, voice ${script.settings.voice} ${script.settings.rate}`);
console.log(`  review copy: ${path.join(outRoot, 'script.md')}`);
if (SCRIPT_ONLY) {
  console.log('--script-only: stopping before render.');
  process.exit(0);
}

/* ---------- idempotency manifest ---------- */
const manifestPath = path.join(outRoot, 'manifest.json');
const inputHash = sha1(JSON.stringify({
  v: PIPELINE_VERSION, md: sha1(md), settings: script.settings,
  css: sha1(fs.readFileSync(path.join(TOOL_ROOT, 'templates', 'slide.css'), 'utf8')),
}));
const prev = fs.existsSync(manifestPath) ? JSON.parse(readUtf8(manifestPath)) : null;
const upToDate = !FORCE && prev && prev.inputHash === inputHash && fs.existsSync(outMp4) && fs.existsSync(outSrt);

/* ---------- 2. TTS ---------- */
const flatSlides = script.chapters.flatMap((c) => c.slides);
const ttsMap = upToDate && prev?.tts ? new Map(prev.tts.map((t) => [t.id, { mp3: t.mp3, words: t.words }])) : await ensureTts(flatSlides, script.settings, cacheDir);

/* ---------- 3. slide PNGs ---------- */
// chapterTitle context per slide
let currentChapter = null;
const ctxSlides = flatSlides.map((s) => {
  if (s.type === 'chapter') currentChapter = s.title;
  const chapterTitle = s.type === 'chapter' || s.type === 'intro' || s.type === 'outro' ? null : currentChapter;
  return { slide: s, chapterTitle };
});

const stateJobs = [];
for (const { slide, chapterTitle } of ctxSlides) {
  const n = numStatesLocal(slide);
  for (let st = 0; st < n; st++) {
    stateJobs.push({ slideId: slide.id, state: st, html: slideToHtml(slide, st, { meta: script.meta, chapterTitle }) });
  }
}
let statesBySlide = null;
if (!(upToDate && prev?.states)) {
  const keys = await renderStates(stateJobs, htmlDir, pngDir);
  statesBySlide = new Map();
  stateJobs.forEach((job, i) => {
    if (!statesBySlide.has(job.slideId)) statesBySlide.set(job.slideId, []);
    statesBySlide.get(job.slideId)[job.state] = keys[i].png;
  });
}

/* ---------- 4. timeline ---------- */
const timeline = await buildTimeline(script, ttsMap);

// attach pngs to frames (each frame renders the png of its mapped state)
if (statesBySlide) {
  for (const sl of timeline.slides) {
    const pngs = statesBySlide.get(sl.slide.id) ?? [];
    sl.framePngs = sl.frames.map((f) => pngs[Math.min(f.state, pngs.length - 1)]);
  }
  writeUtf8(path.join(outRoot, 'timeline.json'), JSON.stringify({
    total: timeline.total,
    chapters: timeline.chapters,
    slides: timeline.slides.map((sl) => ({ id: sl.slide.id, type: sl.slide.type, leadPad: sl.leadPad, audioDur: sl.audioDur, gapAfter: sl.gapAfter, framePngs: sl.framePngs, frames: sl.frames })),
  }, null, 2));
} else {
  const prevTl = JSON.parse(readUtf8(path.join(outRoot, 'timeline.json')));
  prevTl.slides.forEach((ps, idx) => { timeline.slides[idx].framePngs = ps.framePngs; });
}

/* ---------- 5. cover (1280x720, YouTube thumbnail) ---------- */
const outCover = path.join(SITE_ROOT, 'temp', 'videos', `${slug}-cover.png`);
const coverDir = ensureDir(path.join(cacheDir, 'covers'));
const [coverShot] = await renderStates([{ html: coverHtml(script.meta) }], htmlDir, coverDir, { width: 1280, height: 720 });
fs.copyFileSync(coverShot.png, outCover);

/* ---------- 6. SRT ---------- */
const srt = timeline.srt.map((c, i) => `${i + 1}\n${fmtSrtTime(c.start)} --> ${fmtSrtTime(c.end)}\n${c.text}\n`).join('\n');
writeUtf8(outSrt, srt);

/* ---------- 6. assemble ---------- */
if (!upToDate) {
  await assembleVideo({ timeline, ttsMap, script, outDir: workDir, outMp4 });
  writeUtf8(manifestPath, JSON.stringify({
    inputHash,
    builtAt: new Date().toISOString(),
    tts: flatSlides.filter((s) => ttsMap.get(s.id)).map((s) => ({ id: s.id, ...ttsMap.get(s.id) })),
  }, null, 2));
}

/* ---------- summary ---------- */
const sizeMb = (fs.statSync(outMp4).size / 1048576).toFixed(1);
console.log(`\nDone: ${outMp4}`);
console.log(`  ${fmtClock(timeline.total)} · ${(sizeMb)} MB · 1080p30 · ${timeline.chapters.length} chapters`);
console.log(`  cover: ${outCover} (${(fs.statSync(outCover).size / 1024).toFixed(0)} KB)`);
console.log(`  srt:   ${outSrt}`);
console.log('  Chapters:');
for (const c of timeline.chapters) console.log(`    ${fmtClock(c.start).padStart(6)}  ${c.title}`);

function numStatesLocal(slide) {
  switch (slide.type) {
    case 'bullets': case 'faq': case 'era': case 'takeaways': return (slide.items?.length ?? 0) + 1;
    case 'table': return (slide.rows?.length ?? 0) + 1;
    case 'code': return 2;
    default: return 1;
  }
}

function renderScriptMd(script) {
  const lines = [];
  lines.push(`# Video script — ${script.meta.title}`);
  lines.push('');
  lines.push(`- Slug: \`${script.meta.slug}\` · Part ${script.meta.part} · asOf ${script.meta.asOf}`);
  lines.push(`- Voice: \`${script.settings.voice}\` · rate \`${script.settings.rate}\``);
  lines.push(`- ~${script.stats.words} words ≈ ${script.stats.estMinutes} min @150wpm`);
  lines.push(`- Post: ${script.meta.postUrl}`);
  lines.push('');
  for (const ch of script.chapters) {
    lines.push(`## ${ch.title}`);
    for (const s of ch.slides) {
      const words = wordCount(s.narration || '');
      lines.push(`### [${s.id}] ${s.type} — ${s.title}`);
      lines.push(`*(${words}w, ${numStatesLocal(s)} states)*`);
      if (s.items?.length) {
        for (const it of s.items) lines.push(`- on-screen: ${it.lead ? `**${it.lead}.** ` : ''}${it.text ?? ''}`);
      }
      if (s.type === 'table') lines.push(`- on-screen: table ${s.rows.length} rows — ${s.header.join(' / ')}`);
      if (s.code) lines.push(`- on-screen: ${s.code.lang} code block (${s.code.text.split('\n').length} lines)`);
      if (s.subtitle) lines.push(`- on-screen: "${s.subtitle}"`);
      lines.push('');
      lines.push(`> ${s.narration}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}
