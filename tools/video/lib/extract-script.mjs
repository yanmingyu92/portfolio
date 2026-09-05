import { marked } from 'marked';
import { parseFrontmatter } from './frontmatter.mjs';
import { wordCount } from './util.mjs';

/* ---------- red-line guard (BOOTCAMP-SERIES-PLAN.md hard rules) ---------- */
const RED_LINE_TOKENS = [
  'AIRIS', 'ROSHE', 'Shiva', '043-1810', 'MK-0616', 'MK0616',
  'LIPFENDRA', 'enlicitide', 'tonlamarsen', 'Kardigan',
  '.sas7bdat',
];

export function redLineScan(text, where) {
  for (const tok of RED_LINE_TOKENS) {
    const m = text.match(new RegExp(tok, 'i'));
    if (m) {
      throw new Error(`RED LINE violated in ${where}: token "${m[0]}" must never appear in video script`);
    }
  }
}

/* ---------- sentence utilities (protect file names / decimals / abbrevs) ---------- */
const PROT = '\u0001';
function protectText(t) {
  const stash = [];
  const put = (str) => { stash.push(str); return `${PROT}${stash.length - 1}${PROT}`; };
  let s = t;
  s = s.replace(/\b(e\.g\.|i\.e\.|etc\.|vs\.|Dr\.|Mr\.|Mrs\.)\s/gi, (m) => put(m));
  s = s.replace(/\b[A-Za-z0-9_\-]+\.(sas|sas7bdat|r|py|csv|xlsx|log|rtf|dat|md|txt|pdf|js|mjs)\b/gi, (m) => put(m));
  s = s.replace(/\d+\.\d+/g, (m) => put(m));
  return { s, stash };
}
function unprotectText(s, stash) {
  return s.replace(new RegExp(`${PROT}(\\d+)${PROT}`, 'g'), (_, i) => stash[Number(i)]);
}

export function splitSentences(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const { s, stash } = protectText(clean);
  const parts = s.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\u201c])/).filter(Boolean);
  return parts.map((p) => unprotectText(p, stash).trim());
}

export function takeSentences(text, n) {
  return splitSentences(text).slice(0, n).join(' ');
}
function firstSentence(text) {
  return splitSentences(text)[0] || text;
}
function lastSentence(text) {
  const s = splitSentences(text);
  return s[s.length - 1] || '';
}
function shortTitleFrom(sentence, maxChars = 72) {
  if (sentence.length <= maxChars) return sentence;
  const cut = sentence.slice(0, maxChars);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.—-]+$/, '') + '…';
}

/** TTS-friendly cleanup: symbols TTS would read awkwardly. */
function speak(text) {
  return text
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/\s*→\s*/g, ' to ')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- markdown helpers ---------- */
function inlineToText(tokens) {
  if (!tokens) return '';
  let out = '';
  for (const t of tokens) {
    if (t.type === 'br') { out += ' '; continue; }
    if (t.text !== undefined && ['text', 'strong', 'em', 'del', 'codespan', 'link'].includes(t.type)) {
      out += t.tokens ? inlineToText(t.tokens) : t.text;
    } else if (t.tokens) {
      out += inlineToText(t.tokens);
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

/* ---------- parse markdown body into flat node list ---------- */
function parseNodes(md) {
  const body = md.replace(/^---[\s\S]*?---\s*/, '');
  const tokens = marked.lexer(body);
  const nodes = [];
  let stop = false;
  for (const t of tokens) {
    if (stop) break;
    switch (t.type) {
      case 'hr': continue;
      case 'space': continue;
      case 'heading':
        nodes.push({ kind: 'heading', depth: t.depth, text: inlineToText(t.tokens) });
        break;
      case 'paragraph': {
        const text = inlineToText(t.tokens);
        if (/^(Series navigation|In numbering order)/.test(text)) { stop = true; continue; }
        let lead = null;
        let punc = '.';
        let rest = null;
        const first = t.tokens?.[0];
        if (first?.type === 'strong') {
          lead = (first.tokens ? inlineToText(first.tokens) : first.text).replace(/\.$/, '').trim();
          const restRaw = inlineToText(t.tokens.slice(1));
          const m = restRaw.match(/^\s*(:|—|-)\s*/);
          if (m) { punc = ':'; rest = restRaw.slice(m[0].length); } else rest = restRaw;
        }
        const emOnly = t.tokens?.length === 1 && t.tokens[0].type === 'em';
        nodes.push({ kind: 'para', text, lead, rest, punc, emOnly: emOnly ? text : null });
        break;
      }
      case 'list': {
        const items = t.items.map((item) => {
          let lead = null;
          const flat = [];
          const walk = (toks) => {
            for (const x of toks ?? []) {
              if (x.type === 'text' && x.tokens) walk(x.tokens);
              else if (x.type === 'strong' && lead === null) lead = (x.tokens ? inlineToText(x.tokens) : x.text).replace(/\.$/, '').trim();
              else if (['text', 'strong', 'em', 'codespan', 'link', 'del'].includes(x.type)) flat.push(x);
              else if (x.tokens) walk(x.tokens);
            }
          };
          walk(item.tokens);
          let punc = '.';
          let rest = inlineToText(flat);
          if (lead) {
            const m = rest.match(/^\s*(:|—|-)\s*/);
            if (m) { punc = ':'; rest = rest.slice(m[0].length); }
          }
          return { lead, punc, rest, text: (lead ? lead + punc + ' ' : '') + rest };
        });
        nodes.push({ kind: 'list', ordered: t.ordered, items });
        break;
      }
      case 'table':
        nodes.push({
          kind: 'table',
          header: t.header.map((c) => inlineToText(c.tokens)),
          rows: t.rows.map((r) => r.map((c) => inlineToText(c.tokens))),
        });
        break;
      case 'code':
        nodes.push({ kind: 'code', lang: t.lang || 'text', text: t.text });
        break;
      case 'blockquote': {
        const text = inlineToText(t.tokens?.flatMap((x) => x.tokens ?? [x]));
        nodes.push({ kind: 'quote', text: text.replace(/^TL;DR\s*[—-]\s*/i, '') });
        break;
      }
      case 'html': {
        if (/era-callout/.test(t.text)) {
          const asof = (t.text.match(/last verified (\d{4}-\d{2}-\d{2})/i) || [])[1];
          const paras = t.text.split(/<p[^>]*>/).slice(1).map((p) => stripHtml(p)).filter(Boolean);
          nodes.push({ kind: 'era', asof, text: paras });
        }
        // skill-card and other raw HTML blocks intentionally skipped
        break;
      }
      default: break;
    }
  }
  return nodes;
}

/* ---------- group nodes into intro + chapters + h3 sections ---------- */
function toOutline(nodes) {
  const intro = [];
  const chapters = [];
  let cur = null;
  let curSec = null;
  const flushSec = () => { if (curSec) cur.sections.push(curSec); curSec = null; };
  const flushCh = () => { flushSec(); if (cur) chapters.push(cur); cur = null; };
  for (const n of nodes) {
    if (n.kind === 'heading' && n.depth === 2) { flushCh(); cur = { title: n.text, sections: [] }; continue; }
    if (n.kind === 'heading' && n.depth === 3 && cur) { flushSec(); curSec = { title: n.text, nodes: [] }; continue; }
    if (!cur) { intro.push(n); continue; }
    if (!curSec) curSec = { title: null, nodes: [] };
    curSec.nodes.push(n);
  }
  flushCh();
  return { intro, chapters };
}

/* ---------- slide builders ---------- */
function spokenDate(iso) {
  if (!iso) return 'the publication date';
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[m - 1]} ${d}, ${y}`;
}

function buildIntroSlides(introNodes, meta) {
  const hookPara = introNodes.find((n) => n.kind === 'para');
  const tldr = introNodes.find((n) => n.kind === 'quote');
  const narration = [
    hookPara ? firstSentence(hookPara.text) : '',
    tldr ? tldr.text : '',
    `Everything here is content-verified as of ${spokenDate(meta.asOf)}.`,
  ].filter(Boolean).join(' ');
  return [{
    id: 'intro', type: 'intro', title: meta.title,
    narration, items: [],
    badge: meta.part !== null && meta.part !== undefined
      ? `${meta.seriesLabel} · Part ${meta.part}`
      : (meta.seriesLabel || 'jaimeyan.com'),
    asof: meta.asOf,
  }];
}

function tableSlide(id, title, sec) {
  const table = sec.nodes.find((n) => n.kind === 'table');
  const tIdx = sec.nodes.indexOf(table);
  const pre = sec.nodes.slice(0, tIdx).reverse().find((n) => n.kind === 'para' && !n.emOnly);
  const afterPara = sec.nodes.slice(tIdx + 1).find((n) => n.kind === 'para' && !n.emOnly);
  const captionNode = sec.nodes.slice(tIdx + 1).find((n) => n.kind === 'para' && n.emOnly);
  // "versus" phrasing only for genuine old-vs-new comparison tables; neutral otherwise
  const isVersus = /desktop|old stack|legacy stack/i.test(table.header.join(' '));
  const joiner = isVersus ? ', versus ' : ' — ';
  const narrationPieces = [
    pre ? firstSentence(pre.text) : null,
    ...table.rows.map((r) => speak(`${r[0]}: ${r[1]}${joiner}${r[2]}.`)),
    afterPara ? firstSentence(afterPara.text) : null,
  ].filter(Boolean);
  return {
    id, type: 'table', title: title ?? null,
    narration: narrationPieces.join(' '),
    sentStates: narrationPieces.map((_, i) => Math.min(i, table.rows.length)),
    header: table.header, rows: table.rows,
    caption: captionNode ? captionNode.emOnly.replace(/^\*|\*$/g, '') : null,
  };
}

function codeSlide(id, title, sec, compact = false) {
  const code = sec.nodes.find((n) => n.kind === 'code');
  const idx = sec.nodes.indexOf(code);
  const pre = sec.nodes.slice(0, idx).filter((n) => n.kind === 'para').pop();
  const post = sec.nodes.slice(idx + 1).find((n) => n.kind === 'para');
  const narrationPieces = [
    pre ? firstSentence(pre.text) : null,
    post ? takeSentences(post.text, compact ? 1 : 2) : null,
  ].filter(Boolean);
  return {
    id, type: 'code', title: title ?? null,
    narration: narrationPieces.join(' '),
    sentStates: narrationPieces.map((_, i) => Math.min(i, 1)),
    code: { lang: code.lang, text: code.text },
  };
}

function bulletsSlide(id, title, sec) {
  const items = [];
  let opener = null;
  const closers = [];
  for (const n of sec.nodes) {
    if (n.kind === 'para' && n.lead) {
      items.push({ lead: n.lead, punc: n.punc, text: firstSentence(n.rest) });
    } else if (n.kind === 'list') {
      for (const it of n.items) {
        items.push({ lead: it.lead, punc: it.punc, text: firstSentence(it.rest) });
      }
    } else if (n.kind === 'para' && !n.lead && !n.emOnly) {
      const fs = firstSentence(n.text);
      const ls = lastSentence(n.text);
      if (items.length === 0 && opener === null && wordCount(fs) <= 25) opener = fs;
      else if (wordCount(fs) <= 20) closers.push(fs);
      else if (wordCount(ls) <= 20) closers.push(ls);
    }
  }
  // Sources chapters: never read the full reference list aloud — a 25-item
  // link list is minutes of blank-slide narration (seen 2026-09-05: 199s).
  // Cap the on-screen list and narrate a summary instead.
  if ((title || '').trim().toLowerCase().startsWith('sources')) {
    const shown = items.slice(0, 5);
    const pieces = [
      { t: `${items.length} first-hand sources are linked in the article.`, s: 0 },
      ...shown.map((i, idx) => ({ t: `${i.lead ? i.lead + ': ' : ''}${i.text}`, s: idx + 1 })),
      { t: 'The full list, with links, is on jaimeyan.com.', s: shown.length },
    ];
    return {
      id, type: 'bullets', title: title ?? null,
      narration: speak(pieces.map((p) => p.t).join(' ')),
      sentStates: pieces.map((p) => p.s),
      items: shown,
    };
  }
  const pieces = [];
  if (opener) pieces.push({ t: opener, s: 0 });
  items.forEach((i, idx) => pieces.push({ t: `${i.lead ? i.lead + (i.punc === ':' ? ': ' : ': ') : ''}${i.text}`, s: idx + 1 }));
  if (closers[0]) pieces.push({ t: closers[0], s: items.length });
  return {
    id, type: 'bullets', title: title ?? null,
    narration: speak(pieces.map((p) => p.t).join(' ')),
    sentStates: pieces.map((p) => p.s),
    items,
  };
}

function statementSlide(id, title, para, sentCount) {
  const sents = splitSentences(para.text);
  const n = sentCount || (sents.length > 1 ? 2 : 1);
  return {
    id, type: 'statement',
    title: title || shortTitleFrom(sents[0]),
    derivedTitle: !title,
    narration: sents.slice(0, n).join(' '),
    subtitle: sents[0],
  };
}

function eraSlide(id, eraNode) {
  const sents = splitSentences(eraNode.text[0] || '');
  const shown = sents.slice(0, 3);
  return {
    id, type: 'era', title: 'The agent failure mode',
    narration: shown.join(' '),
    sentStates: shown.map((_, i) => i + 1),
    items: shown.map((s) => ({ lead: null, punc: '.', text: shortTitleFrom(s, 120) })),
    asof: eraNode.asof,
  };
}

function buildChapterSlides(chapterIndex, chapter, opts = {}) {
  const compact = !!opts.compact;
  const slides = [{
    id: `ch${chapterIndex}-card`, type: 'chapter', title: chapter.title,
    narration: `Chapter ${chapterIndex} — ${chapter.title}.`, items: [], chapterIndex,
  }];

  if (/^FAQ$/i.test(chapter.title)) {
    const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
    const keep = opts.faqKeep ?? 6;
    chapter.sections.slice(0, keep).forEach((sec, i) => {
      const answer = sec.nodes.find((n) => n.kind === 'para');
      if (!answer) return;
      const a = splitSentences(takeSentences(answer.text, compact ? 2 : 3));
      const qPiece = `${ordinals[i] || 'Next'} question: ${sec.title}`;
      slides.push({
        id: `ch${chapterIndex}-faq${i}`, type: 'faq', title: sec.title,
        narration: speak([qPiece, ...a].join(' ')),
        sentStates: [0, ...a.map((_, j) => j + 1)],
        items: a.map((s) => ({ lead: null, punc: '.', text: s })),
      });
    });
    return slides;
  }

  if (/^Key takeaways$/i.test(chapter.title)) {
    const list = chapter.sections.flatMap((s) => s.nodes).find((n) => n.kind === 'list');
    const items = list ? list.items.map((it) => ({ lead: null, punc: '.', text: it.text })) : [];
    const pieces = [{ t: 'Key takeaways.', s: 0 }, ...items.map((i, idx) => ({ t: i.text, s: idx + 1 }))];
    slides.push({
      id: `ch${chapterIndex}-take`, type: 'takeaways', title: 'Key takeaways',
      narration: pieces.map((p) => p.t).join(' '),
      sentStates: pieces.map((p) => p.s),
      items,
    });
    return slides;
  }

  for (const sec of chapter.sections) {
    const id = () => `ch${chapterIndex}-s${slides.length}`;
    const eraNode = sec.nodes.find((n) => n.kind === 'era');
    const boldParas = sec.nodes.filter((n) => n.kind === 'para' && n.lead);
    const paras = sec.nodes.filter((n) => n.kind === 'para' && !n.lead && !n.emOnly);
    const has = (k) => sec.nodes.some((n) => n.kind === k);

    if (has('table')) {
      slides.push(tableSlide(id(), sec.title, sec));
    } else if (has('code')) {
      slides.push(codeSlide(id(), sec.title, sec, compact));
    } else if (has('list') || boldParas.length >= 2) {
      slides.push(bulletsSlide(id(), sec.title ?? chapter.title, sec));
    } else {
      paras.slice(0, 2).forEach((p, j) => {
        slides.push(statementSlide(id(), j === 0 ? sec.title : null, p, compact ? 1 : 2));
      });
    }
    if (eraNode) slides.push(eraSlide(id(), eraNode));
  }
  return slides;
}

/* ---------- main entry ---------- */
export function extractScript(md, slug, options = {}) {
  const fm = parseFrontmatter(md);
  const nodes = parseNodes(md);
  const { intro, chapters: outline } = toOutline(nodes);

  const eraNode = nodes.find((n) => n.kind === 'era');
  const hasSeries = fm.seriesOrder !== undefined && fm.seriesOrder !== null;
  const meta = {
    slug,
    title: fm.title,
    description: fm.description || '',
    tags: fm.tags || [],
    seriesLabel: hasSeries
      ? 'Clinical SP Bootcamp'
      : (fm.tags || []).includes('daily-brief')
        ? 'Pharma Daily'
        : '',
    part: hasSeries ? fm.seriesOrder : null,
    asOf: eraNode?.asof || (fm.date ? String(fm.date).slice(0, 10) : null),
    postUrl: `https://jaimeyan.com${fm.canonicalPath || `/blog/${slug}.html`}`,
  };

  const introSlides = buildIntroSlides(intro, meta);
  const seriesNarration = meta.part !== null
    ? ` This has been Part ${meta.part} of the ${meta.seriesLabel}.`
    : '';
  const outro = {
    id: 'outro', type: 'outro', title: meta.title,
    narration: `Read the full article, with the code and the comparison table, at jaimeyan.com — the link is in the description.${seriesNarration} This narration is AI-generated; the article on jaimeyan.com is the source of truth.`,
    items: [],
    url: meta.postUrl,
    badge: meta.part !== null ? `${meta.seriesLabel} · Part ${meta.part}` : (meta.seriesLabel || 'jaimeyan.com'),
  };

  // Pass 1: default density. Pass 2 (only when over the 8-min budget):
  // compact mode — shorter code narration, 1-sentence statements, FAQ capped at 2.
  const wordBudget = (built) => [...introSlides, ...built.flatMap((c) => c.slides), outro]
    .reduce((a, s) => a + wordCount(s.narration || ''), 0);
  let buildOpts = {};
  let built = outline.map((c, i) => ({ title: c.title, slides: buildChapterSlides(i + 1, c, buildOpts) }));
  if (wordBudget(built) > 1200) {
    buildOpts = { compact: true, faqKeep: 2 };
    built = outline.map((c, i) => ({ title: c.title, slides: buildChapterSlides(i + 1, c, buildOpts) }));
  }
  const totalWords = wordBudget(built);

  const allSlides = [...introSlides, ...built.flatMap((c) => c.slides), outro];
  // The red-line token list protects BOOTCAMP tutorials from leaking
  // training-set identifiers. Market-analysis posts (IPO classes, deal
  // briefs) legitimately name real public companies that collide with that
  // list (e.g. Kardigan) — gate the scan to series posts only.
  if (hasSeries) {
    for (const s of allSlides) {
      redLineScan(s.narration || '', `slide ${s.id} narration`);
      redLineScan(s.title || '', `slide ${s.id} title`);
      if (s.code) redLineScan(s.code.text, `slide ${s.id} code`);
      for (const it of s.items ?? []) redLineScan(it.lead || '', `slide ${s.id} item lead`), redLineScan(it.text || '', `slide ${s.id} item`);
    }
  }

  return {
    version: 1,
    meta,
    settings: {
      voice: options.voice || 'en-US-AndrewNeural',
      rate: options.rate || '+10%',
      gapSec: 0.45,
      chapterGapSec: 0.7,
    },
    chapters: [
      { title: 'Intro', slides: introSlides },
      ...built,
      { title: 'Outro', slides: [outro] },
    ],
    stats: { words: totalWords, estMinutes: Math.round((totalWords / 150) * 10) / 10, compact: Object.keys(buildOpts).length > 0 },
  };
}
