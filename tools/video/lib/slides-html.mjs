import path from 'node:path';
import fs from 'node:fs';
import { SITE_ROOT, TOOL_ROOT } from './util.mjs';

const CSS_PATH = path.join(TOOL_ROOT, 'templates', 'slide.css');
const CSS_PATH_PHARMA = path.join(TOOL_ROOT, 'templates', 'slide-pharma.css');
const FONT_DIR = path.join(TOOL_ROOT, 'assets', 'fonts');
const cssCache = fs.readFileSync(CSS_PATH, 'utf8');
const cssCachePharma = fs.existsSync(CSS_PATH_PHARMA) ? fs.readFileSync(CSS_PATH_PHARMA, 'utf8') : cssCache;

/** Pharma/market-analysis videos use the teal financial theme, not the tech
 *  rose. Series posts keep their own label; pharma content is identified by
 *  its tags. */
const PHARMA_TAGS = new Set(['daily-brief', 'ipo', 'capital-markets', 'deal-comps']);

export function themeOf(meta) {
  if (meta?.seriesLabel === 'Pharma Daily') return 'pharma';
  if ((meta?.tags || []).some((t) => PHARMA_TAGS.has(t))) return 'pharma';
  return 'tech';
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Very small generic syntax highlighter (SAS/R-friendly). */
function highlightCode(src) {
  const e = esc(src);
  const re = /(\/\*[\s\S]*?\*\/|#[^\n]*|"[^"\n]*"|'[^'\n]*')|(%[A-Za-z_]+|\b(?:libname|proc|run|data|set|merge|if|then|else|do|end|length|format|keep|drop|input|card|cards|datalines|datalines4|infile|output|select|when|otherwise|function|return|library|require|mutate|filter|group_by|summarise|summarize|arrange|left_join|import|def|for|in|while|with|as|not|and|or|eq|ne|gt|lt|ge|le)\b)/g;
  return e.replace(re, (m, str, kw) => {
    if (str) {
      if (/^(\/\*|##?)/.test(str)) return `<span class="cmt">${str}</span>`;
      return `<span class="str">${str}</span>`;
    }
    if (kw) return `<span class="kw">${kw}</span>`;
    return m;
  });
}

function footer(meta, extra = '') {
  const right = meta.part !== null && meta.part !== undefined
    ? `${esc(meta.seriesLabel)} · Part ${esc(meta.part)}${extra}`
    : `${esc(meta.seriesLabel)}${extra}`;
  return `<div class="footer"><span>jaimeyan.com</span><span>${right}</span></div>`;
}

function kicker(text) {
  return text ? `<div class="kicker">${esc(text)}</div>` : '';
}

/* ---------- slide-type renderers ---------- */

function renderItems(items, upto, cls = 'item') {
  return items.slice(0, upto)
    .map((it) => `<div class="${cls}"><div class="marker"></div><div class="item-text">${it.lead ? `<b>${esc(it.lead)}${it.punc === ':' ? ':' : '.'}</b> ` : ''}${esc(it.text)}</div></div>`)
    .join('');
}

function renderBody(slide, state, meta, chapterTitle) {
  const visible = typeof state === 'number' ? state : 0;
  switch (slide.type) {
    case 'bullets':
    case 'faq':
      return renderItems(slide.items, visible);
    case 'takeaways':
      return slide.items.slice(0, visible)
        .map((it, i) => `<div class="takeaway"><div class="num">${String(i + 1).padStart(2, '0')}</div><div class="item-text">${esc(it.text)}</div></div>`)
        .join('');
    case 'table': {
      const rows = slide.rows.slice(0, visible)
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
      const head = `<tr>${slide.header.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
      const density = slide.rows.length >= 12 ? ' tbl-xs' : slide.rows.length >= 8 ? ' tbl-sm' : '';
      const caption = visible >= slide.rows.length && slide.caption ? `<div class="caption">${esc(slide.caption)}</div>` : '';
      return `<table class="tbl${density}">${head}${rows}</table>${caption}`;
    }
    case 'code':
      return state >= 1 ? `<div class="codepanel">${highlightCode(slide.code.text)}</div>` : '';
    case 'statement':
      return slide.derivedTitle
        ? `<div class="quote-mark">“</div><div class="big-statement">${esc(slide.subtitle)}</div>`
        : `<div class="statement-sub">${esc(slide.subtitle)}</div>`;
    case 'era': {
      const items = renderItems(slide.items, visible);
      return `<div class="era-box">${items}<div class="asof-chip">volatile layer — last verified ${esc(slide.asof)}</div></div>`;
    }
    default:
      return '';
  }
}

function renderSlideHtml(slide, state, ctx) {
  const { meta, chapterTitle } = ctx;
  const head = (title, extra = '') => kicker(chapterTitle) + `<h1 class="slide-title">${esc(title)}</h1>`;

  switch (slide.type) {
    case 'intro':
      return `
      <div class="slide dark intro-title">
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:60px">
          ${kicker(meta.part !== null && meta.part !== undefined ? meta.seriesLabel + ' · PART ' + meta.part : meta.seriesLabel)}
          <h1 class="slide-title">${esc(meta.title)}</h1>
          <div class="intro-meta">
            ${meta.part !== null && meta.part !== undefined ? `<span class="badge">Part ${esc(meta.part)}</span>` : ''}
            <span class="asof-chip">content verified ${esc(meta.asOf)}</span>
          </div>
        </div>
        ${footer(meta)}
      </div>`;
    case 'chapter':
      return `
      <div class="slide dark chapter-slide">
        <div class="chapter-num">${String(slide.chapterIndex).padStart(2, '0')}</div>
        ${kicker('CHAPTER ' + slide.chapterIndex)}
        <h1 class="slide-title">${esc(slide.title)}</h1>
        <div class="rose-rule"></div>
        ${footer(meta)}
      </div>`;
    case 'outro':
      return `
      <div class="slide dark">
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:60px">
          ${kicker((meta.part !== null && meta.part !== undefined ? meta.seriesLabel + ' · PART ' + meta.part : (meta.seriesLabel || 'jaimeyan.com')) + ' — READ THE FULL ARTICLE')}
          <div class="outro-host">jaimeyan.com</div>
          <div class="outro-path mono">${esc(slide.url.replace(/^https?:\/\/[^/]+/, ''))}</div>
          <div class="outro-note">Full tables, figures, and sources are in the article.<br>Narration is AI-generated — the article is the source of truth.</div>
        </div>
        ${footer(meta)}
      </div>`;
    case 'faq':
      return `
      <div class="slide">
        <div class="faq-qmark">?</div>
        <div style="height:26px"></div>
        ${head(slide.title)}
        <div class="content">${renderBody(slide, state, meta)}</div>
        ${footer(meta)}
      </div>`;
    default: {
      // null title (chapter-level content with no H3) -> kicker-only layout
      const showTitle = slide.title != null && !(slide.type === 'statement' && slide.derivedTitle);
      return `
      <div class="slide">
        ${showTitle ? head(slide.title) : ''}
        <div class="content">${renderBody(slide, state, meta)}</div>
        ${footer(meta)}
      </div>`;
    }
  }
}

export function slideToHtml(slide, state, ctx) {
  let css = themeOf(ctx?.meta) === 'pharma' ? cssCachePharma : cssCache;
  const fontUrl = FONT_DIR.replace(/\\/g, '/');
  css = css.replace('{{FONT_DIR}}', `file:///${fontUrl}/`);
  const fonts = [
    ['inter', 400], ['inter', 600], ['inter', 700],
    ['fraunces', 500], ['fraunces', 600],
    ['jetbrains-mono', 400], ['jetbrains-mono', 600],
  ].map(([fam, w]) => `@font-face{font-family:'${fam === 'jetbrains-mono' ? 'JetBrains Mono' : fam[0].toUpperCase() + fam.slice(1)}';font-style:normal;font-weight:${w};src:url('file:///${fontUrl}/${fam}-latin-${w}-normal.woff2') format('woff2');}`)
    .join('\n');
  const body = renderSlideHtml(slide, state, ctx);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}\n${css}</style></head><body>${body}</body></html>`;
}
