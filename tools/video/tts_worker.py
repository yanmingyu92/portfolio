"""edge-tts worker: synthesizes a job file of segments to mp3 + word-timing json.

Job schema: {"segments": [{"id", "text", "voice", "rate", "mp3", "words"}]}
Word timings use edge-tts 100-ns offset/duration units.
"""
import asyncio
import json
import sys

import edge_tts


async def synth(seg: dict) -> None:
    com = edge_tts.Communicate(text=seg["text"], voice=seg["voice"], rate=seg.get("rate", ""))
    words = []
    with open(seg["mp3"], "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"t": chunk["text"], "o": chunk["offset"], "d": chunk["duration"]})
    with open(seg["words"], "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=True)


async def main() -> None:
    job_path = sys.argv[1]
    with open(job_path, encoding="utf-8") as f:
        job = json.load(f)
    for seg in job["segments"]:
        await synth(seg)
    print(f"OK {len(job['segments'])}")


if __name__ == "__main__":
    asyncio.run(main())
