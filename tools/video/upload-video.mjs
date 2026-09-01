#!/usr/bin/env node
/**
 * upload-video.mjs <slug> [--dry-run] [--public]
 *
 * With OAuth secrets present (.google-client-secret.json + .google-token.json):
 *   uploads mp4 + thumbnail via YouTube Data API v3, prints the video URL,
 *   saves the video id to temp/videos/<slug>/video-id.txt (for blog embed).
 * Without credentials: writes a manual upload checklist and exits 0.
 *
 * Videos upload as private by default; --public publishes immediately.
 * AI-narration disclosure line is always included in the description;
 * additionally flip "Altered content" once in YouTube Studio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { SITE_ROOT, TOOL_ROOT } from './lib/util.mjs';
import { buildYouTubeMeta, writeManualChecklist } from './lib/youtube-meta.mjs';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
if (!slug) {
  console.error('Usage: node upload-video.mjs <slug> [--dry-run] [--public]');
  process.exit(1);
}
const dryRun = args.includes('--dry-run');
const makePublic = args.includes('--public');

const videoFile = path.join(SITE_ROOT, 'temp', 'videos', `${slug}.mp4`);
const thumbFile = path.join(SITE_ROOT, 'temp', 'videos', `${slug}-cover.png`);
if (!fs.existsSync(videoFile)) {
  console.error(`Video not found (run build-video.mjs first): ${videoFile}`);
  process.exit(1);
}

const meta = buildYouTubeMeta(slug, { videoFile, thumbFile });

console.log('Title:', meta.title);
console.log('Tags:', meta.tags.join(', '));
console.log('Chapters:\n' + meta.chaptersHtml.split('\n').map((l) => '  ' + l).join('\n'));

const SECRET_PATH = path.join(TOOL_ROOT, '.google-client-secret.json');
const TOKEN_PATH = path.join(TOOL_ROOT, '.google-token.json');

if (dryRun || !fs.existsSync(SECRET_PATH) || !fs.existsSync(TOKEN_PATH)) {
  const out = writeManualChecklist(
    slug,
    meta,
    path.join(SITE_ROOT, 'temp', 'videos', `${slug}-youtube-upload.txt`),
  );
  console.log(`\nNo API credentials (${dryRun ? '--dry-run' : 'missing .google-client-secret.json / .google-token.json'}).`);
  console.log(`Manual upload checklist written:\n  ${out}`);
  process.exit(0);
}

/* ---------- API upload ---------- */
const { installed } = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'));
const client = new google.auth.OAuth2(installed.client_id, installed.client_secret, 'http://localhost');
client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
const youtube = google.youtube({ version: 'v3', auth: client });

const res = await youtube.videos.insert({
  part: 'snippet,status',
  requestBody: {
    snippet: {
      title: meta.title,
      description: meta.description,
      tags: meta.tags,
      categoryId: meta.categoryId,
      defaultLanguage: 'en',
      defaultAudioLanguage: 'en',
    },
    status: {
      privacyStatus: makePublic ? 'public' : 'private',
      selfDeclaredMadeForKids: false,
    },
  },
  media: { body: fs.createReadStream(videoFile) },
}, { onUploadProgress: (e) => process.stdout.write(`\ruploading... ${Math.round((e.bytesRead / fs.statSync(videoFile).size) * 100)}%`) });

const videoId = res.data.id;
console.log(`\nUploaded: https://youtu.be/${videoId} (privacy: ${res.data.status.privacyStatus})`);

try {
  await youtube.thumbnails.set({
    videoId,
    media: { body: fs.createReadStream(thumbFile) },
  });
  console.log('Thumbnail set.');
} catch (e) {
  console.warn(`Thumbnail upload failed (${e.message}) — set it manually in YouTube Studio.`);
}

fs.writeFileSync(path.join(SITE_ROOT, 'temp', 'videos', slug, 'video-id.txt'), videoId, 'utf8');
console.log(`Video id saved for blog embed: temp/videos/${slug}/video-id.txt`);
