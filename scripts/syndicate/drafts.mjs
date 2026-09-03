#!/usr/bin/env node
// Manual-platform draft generator — writes human-review files into review/.
//
// Usage:
//   node scripts/syndicate/drafts.mjs <post.md> [platform...]
//
// Platforms: medium, zhihu, juejin, reddit, xiaohongshu (default: all).
// These platforms have no (working) write API, so we generate ready-to-paste
// drafts; a human reviews review/ and posts manually.

import { loadConfig, loadPost, parseArgs, writeReviewDraft, isMainModule } from './lib.mjs';

export const MANUAL_PLATFORMS = ['medium', 'zhihu', 'juejin', 'reddit', 'xiaohongshu'];

const FOOTER_ZH = (url) => `\n\n---\n原文发布于 jaimeyan.com: ${url}`;

// ---------------------------------------------------------------- medium ----
// Medium has no write API and no native table block, so we generate an
// upload-ready paste body engineered for Medium's editor:
//   - markdown tables  -> aligned monospace blocks (survive paste intact)
//   - videoId          -> bare https://youtu.be/<id> line (Medium auto-embeds)
//   - relative links   -> absolute https://jaimeyan.com/... (paste needs them)
//   - era-callout div  -> blockquote (Medium understands quotes)
//   - images           -> linked captions (SVG unsupported; PNG/JPG absolute)
const MEDIUM_SITE = 'https://jaimeyan.com';

function mdTableToMono(lines) {
  const rows = lines
    .filter((l) => !/^\|[\s:|-]+\|$/.test(l.trim()))
    .map((l) =>
      l.trim().replace(/^\||\|$/g, '').split('|').map((c) =>
        c.trim().replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')));
  if (!rows.length) return lines.join('\n');
  const cols = Math.max(...rows.map((r) => r.length));
  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(...rows.map((r) => (r[i] || '').length)));
  const fmt = (r) => r.map((c, i) => (c || '').padEnd(widths[i])).join('  |  ').trimEnd();
  const sep = widths.map((w) => '-'.repeat(w)).join('--+--');
  return [fmt(rows[0]), sep, ...rows.slice(1).map(fmt)].join('\n');
}

function mediumBody(post) {
  let body = post.body;

  // era-callout div -> blockquote (strip tags, keep paragraphs)
  body = body.replace(/<div class="era-callout">([\s\S]*?)<\/div>/g, (_, inner) => {
    const paras = [...inner.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ').trim())
      .filter(Boolean);
    return paras.map((p) => p.split('\n').map((l) => `> ${l}`).join('\n')).join('\n>\n');
  });

  // markdown tables -> aligned monospace blocks (fence them so Medium keeps layout)
  body = body.replace(/(?:^|\n)(\|[^\n]+\|\n\|[\s:|-]+\|\n(?:\|[^\n]+\|\n?)+)/g, (m, table) => {
    const block = mdTableToMono(table.trim().split('\n'));
    return `\n\`\`\`text\n${block}\n\`\`\`\n`;
  });

  // relative links/images -> absolute (Medium paste resolves nothing relatively)
  body = body.replace(/\]\(\//g, `](${MEDIUM_SITE}/`);
  // SVG figures can't embed on Medium: turn image syntax into a linked caption
  body = body.replace(/!\[([^\]]*)\]\(([^)]+\.svg)\)/g, 'Figure: [$1]($2)');

  // companion video: bare youtu.be URL on its own line -> Medium auto-embeds
  if (post.videoId) {
    const embed = `\n\n**Watch the companion video walkthrough:**\n\nhttps://youtu.be/${post.videoId}\n`;
    // insert right after the TL;DR quote block if present, else after first paragraph
    const tldr = body.match(/(^> \*\*TL;DR\*\*[^\n]*(?:\n> [^\n]*)*)/m);
    if (tldr) body = body.replace(tldr[0], tldr[0] + embed);
    else body = body.replace(/^(.*\n)/, `$1${embed}`);
  }
  // interactive explainer cross-link
  if (post.explainer) {
    body += `\n\n---\n\n*Prefer the interactive version? Step through the animated walkthrough: ${MEDIUM_SITE}${post.explainer}*\n`;
  }
  return body.trim();
}

function mediumDraft(post) {
  const hasVideo = !!post.videoId;
  const hasTables = /\|[^\n]+\|\n\|[\s:|-]+\|/.test(post.body);
  return `# Medium upload-ready draft — ${post.title}

## Publish (paste path — recommended for this post${hasTables ? ': it has tables, which the importer mangles' : ''})

1. New story at https://medium.com/new-story
2. Title: ${post.title}
3. Paste everything between the BEGIN/END markers below.
   ${hasVideo ? '- The bare youtu.be line becomes an embedded player after a beat — leave it on its own line.\n   ' : ''}${hasTables ? '- Tables are monospace blocks on purpose: Medium has no native table block.\n   ' : ''}- Code fences, quotes and headings paste through as-is.
4. Set the canonical link (SEO): Story settings -> Advanced settings ->
   "This story was originally published elsewhere" -> ${post.canonicalUrl}
5. Tags (Medium allows 5): ${post.tags.join(', ') || '(none)'}
6. Preview, then Publish.

## Alternative: importer (fast, but no table fidelity)

- https://medium.com/p/import with ${post.canonicalUrl} — sets canonical
  automatically, but Medium flattens HTML tables; prefer the paste path above
  for this series.

---

Canonical: ${post.canonicalUrl}
${hasVideo ? `Video: https://youtu.be/${post.videoId}\n` : ''}
=== BEGIN PASTE BODY ===

${mediumBody(post)}

=== END PASTE BODY ===
`;
}

// -------------------------------------------------------- zhihu / juejin ----
// Formatted for Wechatsync (https://github.com/wechatsync/Wechatsync):
// title line + markdown body; publish from the Wechatsync browser extension
// or CLI as a draft, then submit in each platform's editor.
function wechatsyncDraft(post, platformName) {
  return `# ${post.title}

<!-- Wechatsync target: ${platformName}. Canonical: ${post.canonicalUrl} -->

${post.body}${FOOTER_ZH(post.canonicalUrl)}
`;
}

// ---------------------------------------------------------------- reddit ----
// A conversational, help-first draft. Reddit punishes drive-by link drops, so
// the body leads with substance and mentions the site/paper unobtrusively.
function redditDraft(post) {
  const topic = post.tags[0] || 'this workflow';
  return `# Reddit draft — ${post.title}

## Title suggestion
How are people automating ${topic}? I wrote up an approach that worked for me

## Body

I've been trying to automate parts of my ${topic} pipeline and kept running
into the same friction: the pieces exist, but stitching them together
reliably is where everything falls apart.

${post.description}

A few things that made a difference for me:

- Keep the pipeline config-driven so adding a new step is a registry entry,
  not a rewrite.
- Generate drafts for human review before anything posts anywhere — fully
  autonomous posting is how accounts get flagged.
- Dry-run everything by default; only hit real APIs when tokens are present.

我写了一个方法并把它整理成了一篇文章和开源工具,如果有兴趣可以看看:
${post.canonicalUrl}

Curious how others handle this — especially the review-before-publish step.
Do you trust fully automated posting, or do you keep a human in the loop?

## Posting checklist (do NOT skip)

Target subreddits (pick 1-2 most relevant, do not crosspost everywhere at once):

- [ ] r/bioinformatics
- [ ] r/clinicalresearch
- [ ] r/LLMDevs
- [ ] r/statistics

WARNINGS:
- Reddit's informal rule: self-promotion should be ~10% or less of your
  activity. If your history is mostly links to your own site, expect bans.
- Read each subreddit's sidebar rules first — some ban self-links outright
  or restrict them to weekly threads.
- Engage with comments after posting. Post-and-ghost is the fastest way to
  get flagged as a spammer.

Canonical: ${post.canonicalUrl}
`;
}

// ----------------------------------------------------------- xiaohongshu ----
// Xiaohongshu (RED) is caption + image-carousel, not long-form. Generate a
// short Chinese caption (<=300 chars), a 5-slide carousel outline, and tags.
function xiaohongshuDraft(post) {
  const hook = post.description.length > 80 ? post.description.slice(0, 77) + '...' : post.description;
  const caption = [
    `✨ ${post.title}`,
    '',
    hook,
    '',
    '完整文章在我的个人博客,链接见主页 👉 jaimeyan.com',
  ].join('\n');

  const hashtags = post.tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ');

  return `# 小红书草稿 — ${post.title}

## 文案(需 ≤300 字,当前约 ${caption.length} 字)

${caption}

## 轮播图文案大纲(5 页)

1. **封面页**:标题「${post.title}」+ 一句钩子(${hook})
2. **痛点页**:大家在这个场景下最常遇到的 2-3 个问题
3. **方法页**:我的解决思路概览(对应文章核心部分)
4. **细节页**:关键步骤或代码/工具截图占位
5. **收尾页**:总结 + 引导「完整教程见主页链接」

## 话题标签

${hashtags || '(无标签)'} #科研 #效率工具

## 发布提示

- 手动发布,小红书没有开放写接口。
- 正文不能放外链,所以引导语写「主页链接」。
- 轮播图需要自己排版(稿定设计/Canva 均可)。

Canonical: ${post.canonicalUrl}
`;
}

const GENERATORS = {
  medium: mediumDraft,
  zhihu: (post) => wechatsyncDraft(post, 'Zhihu'),
  juejin: (post) => wechatsyncDraft(post, 'Juejin'),
  reddit: redditDraft,
  xiaohongshu: xiaohongshuDraft,
};

/**
 * Generate review drafts for the requested manual platforms.
 * Returns an array of { platform, path } results. Exported for run.mjs.
 */
export async function generateDrafts(config, post, platforms = MANUAL_PLATFORMS) {
  const results = [];
  for (const platform of platforms) {
    const generator = GENERATORS[platform];
    if (!generator) throw new Error(`Unknown manual platform: ${platform}`);
    const outPath = await writeReviewDraft(config, post, platform, generator(post));
    console.log(`[drafts] ${platform}: wrote ${outPath}`);
    results.push({ platform, path: outPath });
  }
  return results;
}

// CLI entry point (skipped when imported by run.mjs).
if (isMainModule(import.meta.url)) {
  try {
    const { positional } = parseArgs(process.argv.slice(2), { positional: 1 });
    const [postPath, ...platforms] = positional;
    for (const p of platforms) {
      if (!MANUAL_PLATFORMS.includes(p)) {
        throw new Error(`Unknown platform "${p}". Valid: ${MANUAL_PLATFORMS.join(', ')}`);
      }
    }
    const config = await loadConfig();
    const post = await loadPost(postPath, config);
    await generateDrafts(config, post, platforms.length ? platforms : MANUAL_PLATFORMS);
  } catch (err) {
    console.error(`[drafts] error: ${err.message}`);
    process.exit(1);
  }
}
