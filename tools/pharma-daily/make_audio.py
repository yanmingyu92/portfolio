"""Generate the "Listen to this article" mp3 for a blog post via edge-tts.

Usage: uv run python make_audio.py <slug> [--voice en-US-AndrewNeural] [--rate +10%]

Reads content/posts/<slug>.md, condenses it to narration text (prose only —
tables, figures, code and markup are skipped; the post's TL;DR carries the
headline numbers), synthesizes public/audio/<slug>.mp3, and stamps
`audioPath: /audio/<slug>.mp3` into the post frontmatter (idempotent).
Re-running regenerates the mp3 only when the narration text changed.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import logging
import re
import sys
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent
SITE_ROOT = TOOL_DIR.parents[1]
AUDIO_DIR = SITE_ROOT / "public" / "audio"

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("make_audio")

DEFAULT_VOICE = "en-US-AndrewNeural"
DEFAULT_RATE = "+10%"


def post_to_narration(md: str) -> str:
    """Markdown post -> plain narration text (prose only)."""
    md = re.sub(r"\A---\n.*?\n---\n", "", md, flags=re.S)  # frontmatter
    lines: list[str] = []
    in_code = False
    for raw in md.splitlines():
        line = raw.rstrip()
        if line.strip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        stripped = line.strip()
        if stripped.startswith(("|", "![")):  # tables, figures
            continue
        line = re.sub(r"^#{1,6}\s*", "", line)  # headings -> plain sentences
        line = re.sub(r"^>\s*", "", line)  # blockquote markers
        line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
        line = re.sub(r"\*(.+?)\*", r"\1", line)
        line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)  # links -> label
        line = re.sub(r"`([^`]+)`", r"\1", line)
        line = re.sub(r"<[^>]+>", "", line)
        if line.strip():
            lines.append(line.strip())
    return "\n".join(lines)


def stamp_frontmatter(post_path: Path, audio_rel: str) -> bool:
    """Insert audioPath into frontmatter unless already present. True if changed."""
    text = post_path.read_text(encoding="utf-8")
    m = re.match(r"\A(---\n)(.*?)(\n---\n)", text, flags=re.S)
    if not m:
        raise ValueError(f"no frontmatter in {post_path}")
    fm = m.group(2)
    if re.search(r"^audioPath:", fm, flags=re.M):
        return False
    new = text[: m.start(2)] + fm + f'\naudioPath: {audio_rel}' + text[m.end(2):]
    post_path.write_text(new, encoding="utf-8")
    return True


async def synthesize(text: str, out: Path, voice: str, rate: str) -> None:
    import edge_tts

    await edge_tts.Communicate(text, voice=voice, rate=rate).save(str(out))


def main() -> int:
    ap = argparse.ArgumentParser(description="blog post -> narration mp3")
    ap.add_argument("slug", help="post slug, e.g. pharma-daily-2026-09-04")
    ap.add_argument("--voice", default=DEFAULT_VOICE)
    ap.add_argument("--rate", default=DEFAULT_RATE)
    ap.add_argument("--force", action="store_true", help="re-synthesize even if text unchanged")
    args = ap.parse_args()

    post_path = SITE_ROOT / "content" / "posts" / f"{args.slug}.md"
    if not post_path.exists():
        log.error("post not found: %s", post_path)
        return 1
    narration = post_to_narration(post_path.read_text(encoding="utf-8"))
    if len(narration) < 200:
        log.error("narration too short (%d chars) — refusing to synthesize", len(narration))
        return 1

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    out = AUDIO_DIR / f"{args.slug}.mp3"
    digest = hashlib.sha1(f"{args.voice}|{args.rate}|{narration}".encode()).hexdigest()
    # digest lives outside public/ so it never ships to dist/
    cache_dir = TOOL_DIR / "out" / "audio-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    digest_file = cache_dir / f"{args.slug}.sha1"
    if not args.force and out.exists() and digest_file.exists() and digest_file.read_text() == digest:
        log.info("narration unchanged — keeping existing %s", out)
    else:
        log.info("synthesizing %d chars -> %s (voice %s, rate %s)", len(narration), out, args.voice, args.rate)
        asyncio.run(synthesize(narration, out, args.voice, args.rate))
        digest_file.write_text(digest)

    audio_rel = f"/audio/{args.slug}.mp3"
    if stamp_frontmatter(post_path, audio_rel):
        log.info("frontmatter updated: audioPath: %s", audio_rel)
    else:
        log.info("frontmatter already has audioPath")
    log.info("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
