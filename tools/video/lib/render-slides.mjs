import path from 'node:path';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { sha1, writeUtf8 } from './util.mjs';

function findChrome() {
  const candidates = [
    process.env.VIDEO_CHROME,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('No Chrome/Edge found. Set VIDEO_CHROME env to your browser executable.');
}

/**
 * Render slide states to PNGs.
 * @param {Array<{html:string}>} states - each state's full HTML
 * @param {string} htmlDir - cache dir for html files
 * @param {string} pngDir - cache dir for screenshots
 * @param {{width?:number, height?:number}} size - viewport size (default 1920x1080)
 * @returns {Array<{png:string, html:string, key:string}>} paths (files reused from cache)
 */
export async function renderStates(states, htmlDir, pngDir, size = { width: 1920, height: 1080 }) {
  const exe = findChrome();
  const results = [];
  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: true,
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 });
    for (const st of states) {
      const key = sha1(st.html);
      const htmlPath = path.join(htmlDir, `${key}.html`);
      const pngPath = path.join(pngDir, `${key}.png`);
      if (!fs.existsSync(pngPath)) {
        writeUtf8(htmlPath, st.html);
        await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
        await page.evaluateHandle('document.fonts.ready');
        await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: size.width, height: size.height } });
      }
      results.push({ png: pngPath, html: htmlPath, key });
    }
  } finally {
    await browser.close();
  }
  return results;
}
