import path from 'node:path';
import fs from 'node:fs';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { run, ensureDir } from './util.mjs';

const FFMPEG = ffmpeg;
const SILENCE = { 0.05: null, 0.3: null, 0.35: null, 0.45: null, 0.5: null, 0.6: null, 0.7: null };

function toFileUrl(p) {
  return p.replace(/\\/g, '/');
}

async function ensureSilence(workDir) {
  for (const [dur, file] of Object.entries(SILENCE)) {
    const f = path.join(workDir, `silence-${dur.replace('.', '_')}.mp3`);
    if (!fs.existsSync(f)) {
      await run(FFMPEG, ['-y', '-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono`, '-t', dur, '-codec:a', 'libmp3lame', '-b:a', '48k', f]);
    }
    SILENCE[dur] = f;
  }
}

function silenceFor(dur) {
  const key = String(Math.round(dur * 100) / 100);
  if (!(key in SILENCE)) throw new Error(`No silence asset for duration ${dur}`);
  return SILENCE[key];
}

/**
 * Assemble final mp4: frames (png+durations) + narration audio -> H.264 1080p.
 */
export async function assembleVideo({ timeline, ttsMap, script, outDir, outMp4 }) {
  ensureDir(outDir);
  await ensureSilence(outDir);

  // ---- audio playlist: per slide [leadPad silence][mp3][gap silence] ----
  const audioFiles = [];
  for (const sl of timeline.slides) {
    const tts = ttsMap.get(sl.slide.id);
    if (sl.leadPad >= 0.049) audioFiles.push(silenceFor(sl.leadPad));
    if (tts) audioFiles.push(tts.mp3);
    if (sl.gapAfter >= 0.049) audioFiles.push(silenceFor(sl.gapAfter));
    else if (sl.gapAfter > 0) audioFiles.push(silenceFor(0.05));
  }
  const alist = path.join(outDir, 'audio-list.txt');
  fs.writeFileSync(alist, audioFiles.map((f) => `file '${toFileUrl(f)}'`).join('\n'), 'utf8');

  const rawAudio = path.join(outDir, 'narration-raw.mp3');
  await run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', alist, '-codec:a', 'copy', rawAudio]);
  const narration = path.join(outDir, 'narration.m4a');
  await run(FFMPEG, ['-y', '-i', rawAudio, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', '-codec:a', 'aac', '-b:a', '192k', narration]);

  // ---- video frame playlist ----
  // Silence assets come in fixed durations, so the assembled narration runs
  // slightly LONGER than timeline.total (rounding adds ~0.03s per gap).
  // `-t timeline.total` then cuts the outro mid-word (seen 2026-09-05: final
  // 2.7s lost). Measure the real audio and stretch the final frame to cover it.
  const { out: durStr } = await run(ffprobe.path, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', narration,
  ]);
  const audioDur = parseFloat(String(durStr).trim());
  const surplus = Number.isFinite(audioDur) ? Math.max(0, audioDur - timeline.total + 0.15) : 0;

  const vlist = path.join(outDir, 'frames-list.txt');
  const lines = [];
  timeline.slides.forEach((sl, si) => {
    sl.framePngs.forEach((png, k) => {
      let d = sl.frames[k].dur;
      if (k === 0) d += sl.leadPad;
      if (k === sl.framePngs.length - 1) d += sl.gapAfter;
      if (surplus > 0 && si === timeline.slides.length - 1 && k === sl.framePngs.length - 1) d += surplus;
      lines.push(`file '${toFileUrl(png)}'`);
      lines.push(`duration ${d.toFixed(3)}`);
    });
    // concat demuxer quirk: repeat last file so its duration applies.
    // Mid-stream repeats need an explicit tiny duration: a bare file line
    // makes the demuxer emit a NOPTS packet whose rescale the fps filter
    // turns into a dup-fill explosion ("Cannot allocate memory"). The final
    // slide keeps the bare terminator (no packets follow it).
    const last = sl.framePngs[sl.framePngs.length - 1];
    lines.push(`file '${toFileUrl(last)}'`);
    if (si < timeline.slides.length - 1) lines.push('duration 0.033');
  });
  fs.writeFileSync(vlist, lines.join('\n') + '\n', 'utf8');

  const total = timeline.total + surplus;
  const fadeOutStart = Math.max(0, total - 0.8);
  await run(FFMPEG, [
    '-y',
    '-f', 'concat', '-safe', '0', '-i', vlist,
    '-i', narration,
    '-map', '0:v', '-map', '1:a',
    // fps filter removed: on concat-of-stills inputs its dup-fill queue can
    // accumulate until "Cannot allocate memory" (seen 2026-09-04, died mid-
    // stream at ~4:39 despite the NOPTS duration fix). `-fps_mode cfr -r 30`
    // converts frame rate at output sync — streaming, no queue, verified on
    // this timeline (full 432s encode at ~5.5GB free RAM).
    '-vf', `format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=${fadeOutStart.toFixed(2)}:d=0.8`,
    '-fps_mode', 'cfr', '-r', '30',
    // cap encoder threads: x264 defaults to 1.5x core count (34 here) and its
    // per-thread frame buffers OOM on memory-pressured boxes ("malloc of size
    // N failed" mid-encode). 4 threads is plenty for stillimage 1080p.
    '-c:v', 'libx264', '-tune', 'stillimage', '-preset', 'veryfast', '-crf', '20', '-threads', '4',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    '-t', total.toFixed(3),
    outMp4,
  ]);
  return outMp4;
}
