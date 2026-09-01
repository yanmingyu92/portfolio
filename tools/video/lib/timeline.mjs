import path from 'node:path';
import ffprobe from 'ffprobe-static';
import { run, wordCount } from './util.mjs';
import { splitSentences } from './extract-script.mjs';

export function numStates(slide) {
  switch (slide.type) {
    case 'bullets': case 'faq': case 'era': case 'takeaways':
      return (slide.items?.length ?? 0) + 1;
    case 'table': return (slide.rows?.length ?? 0) + 1;
    case 'code': return 2;
    default: return 1;
  }
}

function leadPadFor(type) {
  if (type === 'intro') return 0.05;
  if (type === 'chapter') return 0.3;
  if (type === 'outro') return 0.35;
  return 0.5;
}

async function audioDuration(mp3) {
  const { out } = await run(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mp3]);
  return parseFloat(out.trim());
}

/**
 * Build the full frame timeline + SRT cues + chapter markers.
 * Sentence-to-frame mapping: sentences are distributed proportionally by word
 * count across the spoken span [0, lastWordEnd] of the segment audio.
 */
export async function buildTimeline(script, ttsMap) {
  const { settings } = script;
  const flatSlides = script.chapters.flatMap((c) => c.slides);
  const slides = [];

  for (let i = 0; i < flatSlides.length; i++) {
    const s = flatSlides[i];
    const tts = ttsMap.get(s.id);
    const next = flatSlides[i + 1];
    const gapAfter = !next ? 0.6 : (next.type === 'chapter' ? settings.chapterGapSec : settings.gapSec);

    let dur = 0;
    let frames = [{ state: 0, dur: 1.5 }];
    let sentenceCues = [];

    if (tts) {
      const audioDur = await audioDuration(tts.mp3);
      const events = JSON.parse((await import('node:fs')).readFileSync(tts.words, 'utf8'));
      const spokenEnd = events.length ? (events[events.length - 1].o + events[events.length - 1].d) / 1e7 : audioDur;
      const span = Math.min(spokenEnd + 0.15, audioDur);
      const sentences = splitSentences(s.narration);
      const totalW = sentences.reduce((a, x) => a + wordCount(x), 0) || 1;
      let cursor = 0;
      sentenceCues = sentences.map((text) => {
        const start = (cursor / totalW) * span;
        cursor += wordCount(text);
        const end = (cursor / totalW) * span;
        return { text, start, end };
      });
      const states = slideStates(s, sentences.length);
      frames = (sentences.length ? sentences : [{ text: '' }]).map((_, k) => ({
        state: states[Math.min(k, states.length - 1)],
        dur: 0,
      }));
      sentenceCues.forEach((c, k) => {
        const nextStart = k + 1 < sentenceCues.length ? sentenceCues[k + 1].start : span;
        frames[k].dur = Math.max(0.1, nextStart - c.start);
      });
      const framesSum = frames.reduce((a, f) => a + f.dur, 0);
      const scale = audioDur / framesSum;
      frames.forEach((f) => { f.dur *= scale; });
      dur = audioDur;
    } else {
      dur = 1.5;
    }

    slides.push({
      slide: s,
      leadPad: leadPadFor(s.type),
      audioDur: dur,
      frames,
      gapAfter,
      cues: sentenceCues,
    });
  }

  // global offsets
  let t = 0;
  const srt = [];
  const chapterMarkers = [];
  for (const sl of slides) {
    const slideStart = t;
    if (sl.slide.type === 'intro') chapterMarkers.push({ title: 'Introduction', start: slideStart });
    if (sl.slide.type === 'chapter') chapterMarkers.push({ title: sl.slide.title, start: slideStart });
    if (sl.slide.type === 'outro') chapterMarkers.push({ title: 'Read the full article', start: slideStart });
    for (const c of sl.cues) {
      srt.push({
        text: c.text,
        start: slideStart + sl.leadPad + c.start,
        end: slideStart + sl.leadPad + c.end,
      });
    }
    t += sl.leadPad + sl.audioDur + sl.gapAfter;
  }
  const total = t;

  // fix cue overlaps (cap end at next start)
  for (let i = 0; i < srt.length - 1; i++) {
    if (srt[i].end > srt[i + 1].start) srt[i].end = srt[i + 1].start;
    if (srt[i].end - srt[i].start < 0.4) srt[i].end = srt[i].start + 0.4;
  }

  return { slides, srt, chapters: chapterMarkers, total };
}

function slideStates(slide, sentenceCount) {
  const n = numStates(slide);
  if (Array.isArray(slide.sentStates) && slide.sentStates.length) {
    return slide.sentStates.map((v) => Math.max(0, Math.min(v, n - 1)));
  }
  // default: even distribution
  return Array.from({ length: sentenceCount }, (_, k) => Math.min(Math.round((k * n) / Math.max(1, sentenceCount)), n - 1));
}
