# Video Pipeline — Markdown Lecture → Teaching Video → YouTube → Blog Embed

> Status: pilot live (Part 1, SCE). Pipeline root: `tools/video/` (own deps, never
> touches the site build). One command per video; re-runs are cached and idempotent.

## Architecture

```
content/posts/<slug>.md
  → tools/video/build-video.mjs <slug>
      1. script extraction   (frontmatter + TL;DR + L1/L2/L3 + takeaways + FAQ,
                              deterministic condensation, red-line scan)
      2. TTS per slide       (edge-tts via uv; word timestamps → sentence sync)
      3. slides → HTML → PNG (puppeteer + system Chrome; site stone/rose design;
                              each slide renders N states = "dynamic PPT" reveals)
      4. timeline            (sentence ↔ state sync, SRT, chapter markers)
      5. cover               (1280×720 stone/rose thumbnail)
      6. ffmpeg assembly     (loudnorm, fades, faststart)
  → temp/videos/<slug>.mp4 | <slug>.srt | <slug>-cover.png
  → tools/video/upload-video.mjs <slug>   (YouTube API or manual checklist)
  → content/posts/<slug>.md  frontmatter `videoId: <id>`
  → blog article page: lazy embed under the TL;DR + ▶ badge on blog index
```

Content source of truth is **the blog Markdown only** (never `raw_resource/`).
Narration and subtitles are English; code samples stay the article's Study XYZ
generic versions. The extractor hard-fails on training-set identifiers
(AIRIS / ROSHE / Shiva / 043-1810 / MK-0616 / …) — the build refuses to run.

Non-series posts (no `seriesOrder` in frontmatter, e.g. `pharma-daily-*`) are
supported: the series kicker / "Part N" badge / outro line / YouTube title
suffix all degrade to a plain label (`Pharma Daily` when tagged
`daily-brief`, else the site name) instead of rendering "Part undefined".

## One-time setup (already done on this machine)

| Step | Command / Location |
|---|---|
| Node deps | `cd tools/video && npm install` |
| Python TTS env | `uv sync` inside `tools/video` (runs automatically on first build) |
| Fonts | `tools/video/assets/fonts/*.woff2` (Inter / Fraunces / JetBrains Mono) |
| Browser | system Chrome (or set `VIDEO_CHROME` env to another Chrome/Edge path) |
| ffmpeg / ffprobe | bundled via `ffmpeg-static` / `ffprobe-static` npm binaries |

### YouTube OAuth (already configured)

- `tools/video/.google-client-secret.json` — Desktop-app client JSON from Google
  Cloud Console (project with **YouTube Data API v3** enabled, consent screen
  **published to production**, own account as test user).
- `tools/video/.google-token.json` — refresh token from `npm run video:auth`.
- Both are gitignored (`tools/video/.google-*`). Scope is `youtube.upload` only.
- Re-auth (only if token revoked): `npm run video:auth`.

## Weekly workflow (per new part)

```powershell
# from the site root — human gate first:
npm run video:build -- <slug> --script-only   # 1. extract + review script
#                                             #    → temp/videos/<slug>/script.md
#                                             #    RED LINE: confirm script before rendering
# then everything else is one command:
npm run video:release -- <slug>               # 2. render + upload(private) + write videoId
#                                             #    into frontmatter + QC + commit + push
#                                             #    (Vercel deploys the embed automatically)
# remaining manual (Studio, API cannot set):
#   1. flip "Altered content" disclosure
#   2. set Public (or pass --public on release to skip step 2)
```

`release-video.mjs` flags: `--public` (upload public immediately),
`--skip-upload` (reuse the id in `temp/videos/<slug>/video-id.txt` — e.g.
after a manual upload), `--dry-run` (print the plan). Re-running release is
safe: existing videoId → upload skipped, git step no-ops when unchanged.
Without OAuth files the release stops after the manual-upload checklist.

`upload-video.mjs` writes the id to `temp/videos/<slug>/video-id.txt`; copy it
into the post frontmatter. Without OAuth files (or with `--dry-run`) the same
command emits `temp/videos/<slug>-youtube-upload.txt` — a copy-paste manual
upload checklist (title/description/tags/chapters/settings).

## Maintenance: content changed, re-render the video

When admiral / CDISC CORE / a tool claim changes:

1. Edit the **article Markdown** (single source of truth).
2. `npm run video:build -- <slug>` — unchanged narration audio and unchanged
   slide PNGs are reused from hash caches; only changed segments re-render.
   Typical full rebuild: 1–3 min.
3. Review `temp/videos/<slug>/script.md` and the new SRT.
4. Publishing the update:
   - **Keep the same videoId (preserves URL, stats, comments):** in YouTube
     Studio use *Editor → Re-upload* with the new mp4 (manual, keeps embeds
     valid), or
   - **New video:** `npm run video:upload -- <slug>` and update frontmatter.
5. Site rebuild (`npm run build`) picks up nothing new unless frontmatter changed.

## Idempotency & caches (all under `temp/videos/<slug>/`)

| Cache | Key | Invalidated by |
|---|---|---|
| `cache/tts/*` | sha1(voice\|rate\|narration) | narration/voice/rate change |
| `cache/slides|covers|html` | sha1(state HTML) | slide content or CSS/template change |
| `manifest.json` | input md + settings + template hashes | any upstream change |
| `script.json` / `script.md` | regenerated every run | markdown edit |

Re-running an unchanged build completes in ~1s and rewrites nothing.

## Tune the voice

- Default `en-US-AndrewNeural` at `+10%` (≈165 wpm effective).
- Alternates: `en-US-ChristopherNeural` (newscast), `en-US-AriaNeural` (female).
- Override per build: `npm run video:build -- <slug> --voice=en-US-AriaNeural --rate=+5%`.
- Voice/rate changes re-synthesize only narration (slides untouched).

## SEO alignment (automatic)

- Title: `<article title> | Clinical SP Bootcamp Part N` (≤100 chars).
- Description line 1 = article URL; chapters timestamped from `timeline.json`
  (chapter cards match the article H2s); tags from the target-keyword map in
  `tools/video/lib/youtube-meta.mjs` (source: `docs/BOOTCAMP-SERIES-PLAN.md`).
- AI-narration disclosure line is always appended (YouTube synthetic-media
  policy). Additionally set "Altered content" once per video in YouTube Studio.

## Hard red lines (enforced)

1. Content source = blog Markdown only. No `raw_resource` artifacts, program
   headers, or training identifiers (build fails on detection).
2. English narration/subtitles; Study XYZ generic code only.
3. Never present narration as a real human; disclose AI narration (description
   + outro slide + Studio disclosure).
4. No paid APIs; secrets only in gitignored files (`.google-*`, `.env`).
5. Script review before render (`--script-only` gate).

## Troubleshooting

| Symptom | Fix |
|---|---|
| edge-tts 403 / "NoAudioReceived" | transient service blocks: retry the build (cache resumes). Keep `edge-tts` current (`uv sync`). |
| ffmpeg "Cannot allocate memory" in `fps` filter, dies mid/late encode | fixed in `assemble.mjs` (2026-09-04): the `fps=30` filter's dup-fill queue can accumulate on concat-of-stills input until malloc fails — recurrence of the 2026-09-02 NOPTS class despite explicit durations. `fps` filter removed; rate conversion now via `-fps_mode cfr -r 30` (streaming, no queue). x264 threads also capped (`-threads 4`): default 1.5× core count (34 on this box) OOMs on memory-pressured runs. |
| Chrome not found | `set VIDEO_CHROME=C:\path\to\chrome.exe` |
| First build slow | uv creates the TTS venv once; later builds are fast |
| YouTube `quotaExceeded` | default 10k units/day ≈ 6 uploads; wait or request quota increase |
| Subtitle drift after manual script.json edit | regenerate with `--force` so TTS + timeline re-derive from the edited script |
| Blank/near-blank stretch while narration continues (minutes) | fixed in `extract-script.mjs` (2026-09-05): a `Sources` bullets chapter read the full reference list aloud over 2 frames (199s of white slide). Sources chapters now cap at 5 on-screen items + summary narration; chapter title is passed through (`sec.title ?? chapter.title`) because a lone-H2 chapter has `sec.title = null`. |
| Outro audio truncated mid-word | fixed in `assemble.mjs` (2026-09-05): silence assets come in fixed durations, so narration runs slightly longer than `timeline.total` and `-t` cut the tail. The final frame now stretches by the ffprobe-measured surplus and the encode target is `timeline.total + surplus`. |
| "PART NULL" on outro slide of non-series posts | fixed in `slides-html.mjs` (2026-09-05): the outro renderer had its own hard-coded `Part ${meta.part}` kicker, missed by the earlier non-series patch. |

## File map

```
tools/video/
  build-video.mjs        CLI entry (extract → tts → slides → timeline → cover → mp4)
  upload-video.mjs       YouTube upload / manual checklist  (alias: scripts/upload-video.mjs)
  auth-youtube.mjs       one-time OAuth (alias: npm run video:auth)
  lib/                   extract-script / slides-html / render-slides / tts / timeline / assemble / cover / youtube-meta
  templates/slide.css    slide design tokens (mirrors src/styles/global.css)
  tts_worker.py          edge-tts worker (uv project)
  assets/fonts/          bundled webfonts
```
