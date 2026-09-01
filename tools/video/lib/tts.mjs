import path from 'node:path';
import fs from 'node:fs';
import { run, sha1, ensureDir } from './util.mjs';
import { TOOL_ROOT } from './util.mjs';

const PY_PROJECT = TOOL_ROOT;

/** Ensure all narration segments have mp3 + word timings. Cache keyed by voice|rate|text. */
export async function ensureTts(slides, settings, cacheDir) {
  const ttsDir = ensureDir(path.join(cacheDir, 'tts'));
  const jobs = [];
  const result = new Map(); // slideId -> {mp3, words}
  for (const s of slides) {
    if (!s.narration || !s.narration.trim()) { result.set(s.id, null); continue; }
    const key = sha1(`${settings.voice}|${settings.rate}|${s.narration}`);
    const mp3 = path.join(ttsDir, `${key}.mp3`);
    const words = path.join(ttsDir, `${key}.words.json`);
    result.set(s.id, { mp3, words });
    if (!fs.existsSync(mp3) || !fs.existsSync(words)) jobs.push({ id: s.id, text: s.narration, voice: settings.voice, rate: settings.rate, mp3, words });
  }
  if (jobs.length) {
    const jobFile = path.join(ttsDir, `job-${sha1(JSON.stringify(jobs.map((j) => j.mp3))).slice(0, 12)}.json`);
    fs.writeFileSync(jobFile, JSON.stringify({ segments: jobs }), 'utf8');
    await run('uv', ['run', '--project', PY_PROJECT, 'python', path.join(TOOL_ROOT, 'tts_worker.py'), jobFile]);
  }
  return result;
}

export function readWords(wordsPath) {
  return JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
}
