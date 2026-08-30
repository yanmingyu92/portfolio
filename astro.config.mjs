// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://jaimeyan.com',
  // 'file' format emits /papers/<slug>.html so each abstract page sits in the
  // same directory as the PDFs under /papers/ — a Google Scholar requirement
  // for citation_pdf_url.
  build: { format: 'file' },
  integrations: [sitemap({
    // Pages are emitted as .html files (build.format: 'file'); keep sitemap
    // URLs identical to the rel=canonical each page declares.
    serialize(item) {
      if (!item.url.endsWith('.html') && item.url !== 'https://jaimeyan.com' && item.url !== 'https://jaimeyan.com/') {
        item.url = item.url.replace(/\/$/, '') + '.html';
      }
      return item;
    },
  })],
  vite: {
    plugins: [tailwindcss()]
  }
});
