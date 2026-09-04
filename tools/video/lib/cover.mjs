import path from 'node:path';
import fs from 'node:fs';
import { TOOL_ROOT } from './util.mjs';
import { themeOf } from './slides-html.mjs';

const FONT_DIR = path.join(TOOL_ROOT, 'assets', 'fonts');

const COVER_THEMES = {
  tech:   { bg: '#1c1917', accent: '#9f1239', kicker: '#fda4af', bigNum: '#292524', pill: '#9f1239', text: '#fafaf9', sub: '#d6d3d1' },
  pharma: { bg: '#0c1714', accent: '#0f766e', kicker: '#5eead4', bigNum: '#14201c', pill: '#0f766e', text: '#f8faf9', sub: '#c6d4ce' },
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Split "Main Title: Subtitle" article titles for the cover. */
function splitTitle(title) {
  const idx = title.indexOf(':');
  if (idx === -1) return { main: title, sub: null };
  return { main: title.slice(0, idx).trim(), sub: title.slice(idx + 1).trim() };
}

export function coverHtml(meta) {
  const { main, sub } = splitTitle(meta.title);
  const T = COVER_THEMES[themeOf(meta)] || COVER_THEMES.tech;
  const fonts = [
    ['inter', 400], ['inter', 600], ['inter', 700],
    ['fraunces', 500], ['fraunces', 600],
    ['jetbrains-mono', 400], ['jetbrains-mono', 600],
  ].map(([fam, w]) => `@font-face{font-family:'${fam === 'jetbrains-mono' ? 'JetBrains Mono' : fam[0].toUpperCase() + fam.slice(1)}';font-style:normal;font-weight:${w};src:url('file:///${FONT_DIR.replace(/\\/g, '/')}/${fam}-latin-${w}-normal.woff2') format('woff2');}`)
    .join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1280px; height: 720px; overflow: hidden; }
.cover {
  position: relative;
  width: 1280px; height: 720px;
  background: ${T.bg};
  font-family: 'Inter', 'Segoe UI', sans-serif;
  color: ${T.text};
  padding: 72px 72px 56px 72px;
  display: flex; flex-direction: column;
}
.accent { position: absolute; left: 0; top: 0; bottom: 0; width: 14px; background: ${T.accent}; }
.big-num {
  position: absolute; right: 34px; top: -60px;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 400px; font-weight: 600; line-height: 1;
  color: ${T.bigNum};
}
.kicker {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 24px; letter-spacing: 0.16em; text-transform: uppercase;
  color: ${T.kicker}; font-weight: 600;
  margin-left: 42px;
}
h1 {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 500; font-size: 96px; line-height: 1.08;
  letter-spacing: -0.015em;
  color: ${T.text};
  margin-top: 34px; margin-left: 42px;
  max-width: 1000px;
}
.sub {
  font-size: 40px; color: ${T.sub}; margin-top: 26px; margin-left: 42px;
  font-weight: 400;
}
.foot {
  margin-top: auto; display: flex; justify-content: space-between; align-items: center;
  margin-left: 42px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 26px; color: #78716c;
  border-top: 1px solid #44403c; padding-top: 22px;
}
.part-pill {
  color: ${T.text}; border: 2px solid ${T.pill}; border-radius: 9999px;
  padding: 8px 24px; font-weight: 600;
}
</style></head><body>
<div class="cover">
  <div class="accent"></div>
  ${meta.part !== null && meta.part !== undefined ? `<div class="big-num">${String(meta.part).padStart(2, '0')}</div>` : ''}
  <div class="kicker">${esc(meta.seriesLabel || 'jaimeyan.com')}</div>
  <h1>${esc(main)}</h1>
  ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
  <div class="foot"><span>jaimeyan.com</span>${meta.part !== null && meta.part !== undefined ? `<span class="part-pill">Part ${esc(meta.part)}</span>` : ''}</div>
</div>
</body></html>`;
}
