#!/usr/bin/env node
// WeChat Official Account adapter — add a post to the account's draft box (草稿箱).
//
// Usage:
//   node scripts/syndicate/wechat.mjs <post.md> [--dry-run]
//
// Env: WECHAT_APPID, WECHAT_SECRET (from https://mp.weixin.qq.com -> 设置与开发 -> 基本配置)
// Without both envs this runs in dry-run mode.
//
// IMPORTANT LIMITATIONS (read before enabling):
// - WeChat strips external image URLs from article content. Images must be
//   uploaded first via the material API (cgi-bin/material/add_material or
//   cgi-bin/media/uploadimg) and referenced by the returned WeChat URLs.
// - A real article also wants thumb_media_id (cover image via material API);
//   we omit it here, which is accepted for drafts but the draft will need a
//   cover set manually in the MP console before publishing.

import { loadConfig, loadPost, parseArgs, printDryRun, fetchJson, markdownToSimpleHtml, isMainModule } from './lib.mjs';

const TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token';
const DRAFT_ADD_URL = 'https://api.weixin.qq.com/cgi-bin/draft/add';

async function getAccessToken(appId, secret) {
  const url = `${TOKEN_URL}?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.errcode) {
    throw new Error(`WeChat token error ${json.errcode}: ${json.errmsg}`);
  }
  return json.access_token;
}

/** Submit a post to the WeChat draft box. Returns { dryRun, mediaId? }. Exported for run.mjs. */
export async function syndicate(post, { dryRun = false } = {}) {
  const appId = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;

  const article = {
    title: post.title,
    author: 'Jaime Yan',
    digest: post.description,
    content: markdownToSimpleHtml(post.body),
    content_source_url: post.canonicalUrl,
  };

  if (dryRun || !appId || !secret) {
    printDryRun('wechat', {
      endpoint: `GET ${TOKEN_URL} -> POST ${DRAFT_ADD_URL}`,
      title: article.title,
      author: article.author,
      digest: article.digest,
      content_source_url: article.content_source_url,
      content_length: `${article.content.length} chars (HTML)`,
      reason: dryRun ? '--dry-run flag' : 'WECHAT_APPID / WECHAT_SECRET not set',
    });
    return { dryRun: true };
  }

  const accessToken = await getAccessToken(appId, secret);
  const json = await fetchJson(`${DRAFT_ADD_URL}?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    body: { articles: [article] },
  });
  if (json.errcode) {
    throw new Error(`WeChat draft/add error ${json.errcode}: ${json.errmsg}`);
  }
  console.log(`[wechat] draft added: media_id ${json.media_id}`);
  return { dryRun: false, mediaId: json.media_id };
}

// CLI entry point (skipped when imported by run.mjs).
if (isMainModule(import.meta.url)) {
  try {
    const { positional, flags } = parseArgs(process.argv.slice(2), {
      positional: 1,
      flags: { 'dry-run': 'boolean' },
    });
    const config = await loadConfig();
    const post = await loadPost(positional[0], config);
    await syndicate(post, { dryRun: !!flags['dry-run'] });
  } catch (err) {
    console.error(`[wechat] error: ${err.message}`);
    process.exit(1);
  }
}
