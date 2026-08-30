#!/usr/bin/env node
// dev.to adapter — publish a post as a draft (or published article) via the Forem API.
//
// Usage:
//   node scripts/syndicate/devto.mjs <post.md> [--publish] [--dry-run]
//
// Env: DEV_TO_API_KEY (from https://dev.to/settings/extensions). Without it the
// script runs in dry-run mode: prints exactly what would be sent and exits 0.

import { loadConfig, loadPost, parseArgs, printDryRun, fetchJson, isMainModule } from './lib.mjs';

const API_URL = 'https://dev.to/api/articles';

/** Build the dev.to article payload for a post. Exported for run.mjs. */
export function buildPayload(post, { publish = false } = {}) {
  return {
    article: {
      title: post.title,
      body_markdown: post.body,
      // dev.to allows max 4 tags, lowercase alphanumeric only.
      tags: post.tags
        .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(Boolean)
        .slice(0, 4),
      canonical_url: post.canonicalUrl,
      published: publish,
    },
  };
}

/** Submit a post to dev.to. Returns { dryRun, url? , id? }. Exported for run.mjs. */
export async function syndicate(post, { publish = false, dryRun = false } = {}) {
  const apiKey = process.env.DEV_TO_API_KEY;
  const payload = buildPayload(post, { publish });

  if (dryRun || !apiKey) {
    printDryRun('devto', {
      endpoint: `POST ${API_URL}`,
      title: payload.article.title,
      tags: payload.article.tags.join(', ') || '(none)',
      canonical_url: payload.article.canonical_url,
      published: payload.article.published,
      body_length: `${payload.article.body_markdown.length} chars`,
      reason: dryRun ? '--dry-run flag' : 'DEV_TO_API_KEY not set',
    });
    return { dryRun: true };
  }

  const json = await fetchJson(API_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey },
    body: payload,
  });
  console.log(`[devto] created: ${json.url || `id ${json.id}`} (published=${json.published})`);
  return { dryRun: false, id: json.id, url: json.url };
}

// CLI entry point (skipped when imported by run.mjs).
if (isMainModule(import.meta.url)) {
  try {
    const { positional, flags } = parseArgs(process.argv.slice(2), {
      positional: 1,
      flags: { publish: 'boolean', 'dry-run': 'boolean' },
    });
    const config = await loadConfig();
    const post = await loadPost(positional[0], config);
    await syndicate(post, { publish: !!flags.publish, dryRun: !!flags['dry-run'] });
  } catch (err) {
    console.error(`[devto] error: ${err.message}`);
    process.exit(1);
  }
}
