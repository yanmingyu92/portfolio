// Frontmatter write-back for the video pipeline: set `videoId: <id>` on a post.
// Replaces an existing videoId line in place; otherwise inserts after canonicalPath.
import fs from 'node:fs';
import path from 'node:path';
import { SITE_ROOT } from './util.mjs';

export function setVideoId(slug, videoId) {
	const file = path.join(SITE_ROOT, 'content', 'posts', `${slug}.md`);
	if (!fs.existsSync(file)) throw new Error(`post not found: ${slug}`);
	let raw = fs.readFileSync(file, 'utf8');
	if (!raw.startsWith('---\n')) throw new Error(`${slug}: missing frontmatter`);

	if (/^videoId:.*$/m.test(raw)) {
		raw = raw.replace(/^videoId:.*$/m, `videoId: ${videoId}`);
	} else {
		const anchor = /^canonicalPath:.*$/m;
		if (!anchor.test(raw)) throw new Error(`${slug}: no canonicalPath anchor for videoId`);
		raw = raw.replace(anchor, m => `${m}\nvideoId: ${videoId}`);
	}
	fs.writeFileSync(file, raw, 'utf8');
	return file;
}

export function getVideoId(slug) {
	const idFile = path.join(SITE_ROOT, 'temp', 'videos', slug, 'video-id.txt');
	if (!fs.existsSync(idFile)) return undefined;
	return fs.readFileSync(idFile, 'utf8').trim() || undefined;
}
