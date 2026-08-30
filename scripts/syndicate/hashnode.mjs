#!/usr/bin/env node
// Hashnode adapter — create a draft (and optionally publish it) via the GraphQL API.
//
// Usage:
//   node scripts/syndicate/hashnode.mjs <post.md> [--publish] [--dry-run]
//
// Env: HASHNODE_TOKEN (Personal Access Token from https://hashnode.com/settings/developer)
//      HASHNODE_PUBLICATION_ID (your publication's ObjectId)
// NOTE: Hashnode gated API-driven publishing behind Hashnode Pro ($50/yr); the
// platform is disabled by default in syndicate.config.json. Without both envs
// this runs in dry-run mode.

import { loadConfig, loadPost, parseArgs, printDryRun, fetchJson, isMainModule } from './lib.mjs';

const GQL_URL = 'https://gql.hashnode.com';

const CREATE_DRAFT = /* GraphQL */ `
  mutation CreateDraft($input: CreateDraftInput!) {
    createDraft(input: $input) {
      draft { id }
    }
  }
`;

const PUBLISH_DRAFT = /* GraphQL */ `
  mutation PublishDraft($input: PublishDraftInput!) {
    publishDraft(input: $input) {
      post { id url }
    }
  }
`;

async function gql(token, query, variables) {
  const json = await fetchJson(GQL_URL, {
    method: 'POST',
    headers: { Authorization: token },
    body: { query, variables },
  });
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

/** Submit a post to Hashnode. Returns { dryRun, draftId?, url? }. Exported for run.mjs. */
export async function syndicate(post, { publish = false, dryRun = false } = {}) {
  const token = process.env.HASHNODE_TOKEN;
  const publicationId = process.env.HASHNODE_PUBLICATION_ID;

  const input = {
    title: post.title,
    contentMarkdown: post.body,
    publicationId,
    tags: post.tags.slice(0, 5).map((t) => ({ name: t, slug: t.toLowerCase().replace(/[^a-z0-9]+/g, '-') })),
    originalArticleURL: post.canonicalUrl,
  };

  if (dryRun || !token || !publicationId) {
    printDryRun('hashnode', {
      endpoint: `POST ${GQL_URL} (createDraft${publish ? ' + publishDraft' : ''})`,
      title: input.title,
      tags: input.tags.map((t) => t.slug).join(', ') || '(none)',
      originalArticleURL: input.originalArticleURL,
      publish_after_draft: publish,
      body_length: `${input.contentMarkdown.length} chars`,
      reason: dryRun ? '--dry-run flag' : 'HASHNODE_TOKEN / HASHNODE_PUBLICATION_ID not set',
    });
    return { dryRun: true };
  }

  const created = await gql(token, CREATE_DRAFT, { input });
  const draftId = created.createDraft.draft.id;
  console.log(`[hashnode] draft created: ${draftId}`);

  if (publish) {
    const published = await gql(token, PUBLISH_DRAFT, { input: { draftId } });
    console.log(`[hashnode] published: ${published.publishDraft.post.url}`);
    return { dryRun: false, draftId, url: published.publishDraft.post.url };
  }
  return { dryRun: false, draftId };
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
    console.error(`[hashnode] error: ${err.message}`);
    process.exit(1);
  }
}
