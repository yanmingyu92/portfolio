import fs from 'node:fs';
import path from 'node:path';
import { SITE_ROOT, readUtf8, fmtClock } from './util.mjs';

/** Target keywords per slug — source of truth: docs/BOOTCAMP-SERIES-PLAN.md */
const TARGET_KEYWORDS = {
  'clinical-sp-bootcamp-roadmap': 'clinical statistical programmer learning path',
  'sce-statistical-computing-environment-guide': 'statistical computing environment clinical trials',
  'adsl-derivation-tutorial-trtstdt': 'ADSL derivation TRT01SDT',
  'tlf-shell-to-rtf-tutorial': 'clinical trial tables listings figures programming',
  'sdtm-tutorial-domain-basics': 'SDTM domains explained',
  'sdtm-ae-domain-mapping-example': 'SDTM AE domain mapping',
  'sdtm-mapping-spec-walkthrough': 'SDTM mapping specification',
  'adam-bds-adlb-advs-tutorial': 'ADaM BDS structure',
  'adam-occds-adae-tutorial': 'ADaM OCCDS',
  'adtte-survival-tutorial': 'ADaM ADTTE time to event',
  'clinical-sas-interview-questions-guide': 'clinical SAS interview questions',
  'statistical-programmer-career-2026': 'become a clinical statistical programmer 2026',
  'git-for-clinical-programmers': 'Git for SAS programmers',
  'pipeline-as-code-sdtm-adam': 'clinical trial data pipeline CI',
  'ai-in-validated-environments': 'AI GxP validated environment LLM',
};

const EXTRA_TAGS = [
  'clinical trials', 'statistical programming', 'clinical SAS', 'SAS programming',
  'CDISC', 'biostatistics', 'pharmaceutical industry', 'GxP', 'clinical programmer',
  'Clinical SP Bootcamp',
];

function fmtTs(sec) {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${m}:${String(ss).padStart(2, '0')}`;
}

/**
 * Build YouTube upload metadata from pipeline outputs.
 * @returns {{title, description, tags, categoryId, videoFile, thumbFile, chaptersHtml}}
 */
export function buildYouTubeMeta(slug, { videoFile, thumbFile }) {
  const script = JSON.parse(readUtf8(path.join(SITE_ROOT, 'temp', 'videos', slug, 'script.json')));
  const timeline = JSON.parse(readUtf8(path.join(SITE_ROOT, 'temp', 'videos', slug, 'timeline.json')));
  const { meta } = script;
  const keyword = TARGET_KEYWORDS[slug] || '';

  const hasSeries = meta.part !== null && meta.part !== undefined;
  const baseTitle = hasSeries
    ? `${meta.title} | Clinical SP Bootcamp Part ${meta.part}`
    : meta.title;
  const title = baseTitle.length <= 100 ? baseTitle : `${meta.title} — Bootcamp P${meta.part}`;

  const chapters = timeline.chapters.map((c) => `${fmtTs(c.start)} ${c.title}`).join('\n');

  const desc = [
    meta.postUrl,
    '',
    `Video companion for the article "${meta.title}" on jaimeyan.com — ${keyword ? `covers ${keyword} ` : ''}in a practical, example-driven way.`,
    meta.description,
    '',
    'CHAPTERS',
    chapters,
    ...(hasSeries
      ? ['', 'CONTINUE THE SERIES',
         `Full Clinical SP Bootcamp roadmap (all parts): https://jaimeyan.com/blog/clinical-sp-bootcamp-roadmap.html`]
      : []),
    '',
    `Narration is AI-generated (synthetic media disclosure per YouTube policy). Article content verified as of ${meta.asOf}.`,
  ].join('\n');

  const tags = [...new Set([
    keyword.toLowerCase(),
    ...EXTRA_TAGS.map((t) => t.toLowerCase()),
    ...(meta.tags || []),
  ])].filter(Boolean).slice(0, 15);
  while (tags.join(',').length > 480 && tags.length > 5) tags.pop();

  return {
    title,
    description: desc,
    tags,
    categoryId: '27', // Education
    videoFile,
    thumbFile,
    chaptersHtml: chapters,
    postUrl: meta.postUrl,
    language: 'en',
  };
}

export function writeManualChecklist(slug, m, outFile) {
  const txt = [
    `# Manual YouTube upload checklist — ${slug}`,
    `generated ${new Date().toISOString()}`,
    '',
    `Video file:    ${m.videoFile}`,
    `Thumbnail:     ${m.thumbFile}`,
    '',
    '## Title (copy)',
    m.title,
    '',
    '## Description (copy)',
    m.description,
    '',
    '## Tags (copy, comma-separated)',
    m.tags.join(', '),
    '',
    '## Other settings',
    '- Category: Education',
    '- Language: English',
    '- Not made for kids',
    '- In YouTube Studio: disclose "Altered content" (AI narration) under Editing > Altered content',
    '- Add chapters automatically from description timestamps (first must be 0:00)',
    '',
    '## After upload',
    `- Put the video id (from the video URL) into the article frontmatter: videoId: <id>`,
    `- Publish (video defaults to private when uploaded via API; flip to Public manually if desired)`,
  ].join('\n');
  fs.writeFileSync(outFile, txt, 'utf8');
  return outFile;
}
