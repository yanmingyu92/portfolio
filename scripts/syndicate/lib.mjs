// Shared helpers for the syndication pipeline.
// Plain Node >=18, no dependencies. Everything here is import-safe (no side effects).

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** True when the module was run directly (`node script.mjs`), false when imported. Windows-safe. */
export function isMainModule(importMetaUrl) {
  return !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(importMetaUrl);
}

const CONFIG_PATH = path.join(REPO_ROOT, 'syndicate.config.json');

/** Load syndicate.config.json from the repo root. */
export async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Could not load ${CONFIG_PATH}: ${err.message}`);
  }
}

/**
 * Tiny YAML-subset parser for flat post frontmatter.
 * Supports exactly the field shapes our posts use:
 *   key: scalar            (string / number / true / false)
 *   key: "quoted string"   (single or double quotes)
 *   key: [a, b, c]         (inline array of scalars)
 *   key:                   (block array, one "- item" per line)
 * Anything more exotic throws — this is intentionally strict.
 */
export function parseFrontmatter(markdown, filePath = '<input>') {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error(`No YAML frontmatter block found in ${filePath}`);
  }
  const raw = match[1];
  const body = markdown.slice(match[0].length);

  const data = {};
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!kv) throw new Error(`Unsupported frontmatter line in ${filePath}: "${line}"`);
    const [, key, rest] = kv;

    if (rest === '') {
      // Block array: following "- item" lines.
      const items = [];
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
        i++;
        items.push(coerceScalar(lines[i].replace(/^\s+-\s+/, '').trim()));
      }
      data[key] = items;
    } else if (rest.startsWith('[')) {
      // Inline array: [a, b, c]
      const inner = rest.replace(/^\[/, '').replace(/\]\s*$/, '').trim();
      data[key] = inner === '' ? [] : splitInlineArray(inner).map(coerceScalar);
    } else {
      data[key] = coerceScalar(rest);
    }
  }
  return { data, body: body.trim() };
}

/** Split an inline YAML array on commas that are not inside quotes. */
function splitInlineArray(inner) {
  const parts = [];
  let current = '';
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
      current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ',') {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') parts.push(current.trim());
  return parts;
}

function coerceScalar(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

const REQUIRED_FIELDS = ['title', 'date', 'description', 'canonicalPath'];

/**
 * Load one post file: parse + validate frontmatter, derive slug/canonical URL.
 * Returns { filePath, slug, title, date, description, tags, draft, canonicalPath, canonicalUrl, videoId, explainer, body }.
 */
export async function loadPost(filePath, config) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
  const markdown = await readFile(abs, 'utf8');
  const { data, body } = parseFrontmatter(markdown, abs);

  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === '') {
      throw new Error(`Post ${abs} is missing required frontmatter field: ${field}`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date))) {
    throw new Error(`Post ${abs}: date must be YYYY-MM-DD, got "${data.date}"`);
  }

  const slug = path.basename(abs).replace(/\.md$/, '');
  const canonicalPath = String(data.canonicalPath);
  const canonicalUrl = config.siteUrl.replace(/\/$/, '') + canonicalPath;

  return {
    filePath: abs,
    slug,
    title: String(data.title),
    date: String(data.date),
    description: String(data.description),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    draft: data.draft === true,
    canonicalPath,
    canonicalUrl,
    videoId: data.videoId ? String(data.videoId) : null,
    explainer: data.explainer ? String(data.explainer) : null,
    body,
  };
}

/**
 * Enumerate posts from the configured posts directory.
 * Skips draft: true unless includeDrafts is set.
 */
export async function enumeratePosts(config, { includeDrafts = false } = {}) {
  const dir = path.join(REPO_ROOT, config.postsDir);
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
  const posts = [];
  for (const file of files) {
    const post = await loadPost(path.join(dir, file), config);
    if (post.draft && !includeDrafts) continue;
    posts.push(post);
  }
  return posts;
}

/** Write a human-review draft into <reviewDir>/<date>-<slug>.<platform>.md. Returns the path written. */
export async function writeReviewDraft(config, post, platform, content) {
  const dir = path.join(REPO_ROOT, config.reviewDir);
  await mkdir(dir, { recursive: true });
  const outPath = path.join(dir, `${post.date}-${post.slug}.${platform}.md`);
  await writeFile(outPath, content, 'utf8');
  return outPath;
}

/**
 * Tiny hand-rolled CLI arg parser.
 * spec: { positional: number|null, flags: { name: 'boolean'|'string' } }
 * Returns { positional: string[], flags: { name: value } }.
 */
export function parseArgs(argv, spec = {}) {
  const positional = [];
  const flags = {};
  const flagDefs = spec.flags || {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      if (!(name in flagDefs)) throw new Error(`Unknown flag: --${name}`);
      if (flagDefs[name] === 'boolean') {
        if (eq !== -1) throw new Error(`Flag --${name} does not take a value`);
        flags[name] = true;
      } else {
        flags[name] = eq === -1 ? argv[++i] : arg.slice(eq + 1);
        if (flags[name] === undefined) throw new Error(`Flag --${name} requires a value`);
      }
    } else {
      positional.push(arg);
    }
  }
  if (typeof spec.positional === 'number' && positional.length < spec.positional) {
    throw new Error(`Expected at least ${spec.positional} positional argument(s), got ${positional.length}`);
  }
  return { positional, flags };
}

/** Print a dry-run block describing what WOULD be sent, then let the caller exit 0. */
export function printDryRun(platform, summary) {
  console.log(`[dry-run] platform: ${platform}`);
  for (const [key, value] of Object.entries(summary)) {
    console.log(`[dry-run]   ${key}: ${value}`);
  }
}

/** Minimal fetch wrapper with JSON handling and readable errors. */
export async function fetchJson(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON response; keep raw text */
  }
  if (!res.ok) {
    const detail = json ? JSON.stringify(json) : text.slice(0, 500);
    throw new Error(`${method} ${url} -> HTTP ${res.status}: ${detail}`);
  }
  return json;
}

/** Very small markdown -> HTML-ish converter good enough for WeChat digest bodies. */
export function markdownToSimpleHtml(markdown) {
  const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) =>
    escapeHtml(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const out = [];
  let inList = false;
  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    const li = trimmed.match(/^[-*]\s+(.*)$/);
    if (li) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    if (trimmed === '') continue;
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
    } else {
      out.push(`<p>${inline(trimmed)}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}
