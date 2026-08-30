#!/usr/bin/env node
// Syndication orchestrator — iterate posts x enabled platforms and dispatch.
//
// Usage:
//   node scripts/syndicate/run.mjs [--include-drafts] [--dry-run] [--publish]
//
// Behavior:
// - API platforms (devto, hashnode, wechat) run in dry-run mode automatically
//   when their env tokens are missing, or when --dry-run is passed.
// - Manual platforms (medium, zhihu, juejin, reddit, xiaohongshu) always just
//   (re)generate review drafts in review/.
// - Exits non-zero if any adapter throws; per-platform failures are reported
//   in the summary table.

import { loadConfig, enumeratePosts, parseArgs } from './lib.mjs';
import * as devto from './devto.mjs';
import * as hashnode from './hashnode.mjs';
import * as wechat from './wechat.mjs';
import { generateDrafts, MANUAL_PLATFORMS } from './drafts.mjs';

const API_ADAPTERS = { devto, hashnode, wechat };

async function main() {
  const { flags } = parseArgs(process.argv.slice(2), {
    flags: { 'include-drafts': 'boolean', 'dry-run': 'boolean', publish: 'boolean' },
  });
  const dryRun = !!flags['dry-run'];
  const publish = !!flags.publish && !dryRun;

  const config = await loadConfig();
  const posts = await enumeratePosts(config, { includeDrafts: !!flags['include-drafts'] });
  if (posts.length === 0) {
    console.log(`[run] no posts found in ${config.postsDir} (drafts ${flags['include-drafts'] ? 'included' : 'skipped'})`);
    return;
  }

  const enabled = Object.entries(config.platforms)
    .filter(([, p]) => p.enabled)
    .map(([name, p]) => ({ name, ...p }));

  console.log(`[run] ${posts.length} post(s) x ${enabled.length} enabled platform(s)${dryRun ? ' [DRY-RUN]' : ''}${publish ? ' [PUBLISH]' : ''}`);

  /** @type {{ post: string, platform: string, result: string }[]} */
  const rows = [];
  let failures = 0;

  for (const post of posts) {
    for (const platform of enabled) {
      try {
        if (platform.mode === 'api' || platform.mode === 'draft-api') {
          const adapter = API_ADAPTERS[platform.name];
          if (!adapter) throw new Error(`no adapter module for API platform "${platform.name}"`);
          const result = await adapter.syndicate(post, { publish, dryRun });
          rows.push({ post: post.slug, platform: platform.name, result: result.dryRun ? 'dry-run' : 'sent' });
        } else {
          // manual-import / draft-file: (re)generate the review draft.
          await generateDrafts(config, post, [platform.name]);
          rows.push({ post: post.slug, platform: platform.name, result: 'draft written' });
        }
      } catch (err) {
        failures++;
        rows.push({ post: post.slug, platform: platform.name, result: `FAILED: ${err.message}` });
      }
    }
  }

  // Summary table.
  console.log('\n[run] summary');
  const widths = {
    post: Math.max(4, ...rows.map((r) => r.post.length)),
    platform: Math.max(8, ...rows.map((r) => r.platform.length)),
  };
  console.log(`  ${'post'.padEnd(widths.post)}  ${'platform'.padEnd(widths.platform)}  result`);
  console.log(`  ${'-'.repeat(widths.post)}  ${'-'.repeat(widths.platform)}  ${'-'.repeat(40)}`);
  for (const r of rows) {
    console.log(`  ${r.post.padEnd(widths.post)}  ${r.platform.padEnd(widths.platform)}  ${r.result}`);
  }

  const disabled = Object.entries(config.platforms).filter(([, p]) => !p.enabled);
  if (disabled.length) {
    console.log(`\n[run] disabled platforms (skipped): ${disabled.map(([n]) => n).join(', ')}`);
  }

  if (failures > 0) {
    console.error(`\n[run] ${failures} platform run(s) failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[run] error: ${err.message}`);
  process.exit(1);
});
