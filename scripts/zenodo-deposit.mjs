#!/usr/bin/env node
// Zenodo deposit — upload a PDF as a record via the new InvenioRDM API.
//
// Usage:
//   node scripts/zenodo-deposit.mjs <pdf-path> --title "..." [--metadata meta.json] [--publish] [--dry-run]
//
// Env:
//   ZENODO_TOKEN    Personal access token from https://zenodo.org/account/settings/applications/
//                   (needs deposit:write + deposit:actions scopes). Missing -> dry-run.
//   ZENODO_BASE_URL API base URL, default https://zenodo.org/api.
//                   Use https://sandbox.zenodo.org/api for testing.
//
// --metadata: JSON file merged into the draft record's `metadata` object
// (e.g. { "description": "...", "publication_date": "2026-08-29", "keywords": [...] }).
// CLI-provided values take precedence over file-provided ones where both exist.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, printDryRun, fetchJson } from './syndicate/lib.mjs';

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2), {
    positional: 1,
    flags: { title: 'string', metadata: 'string', publish: 'boolean', 'dry-run': 'boolean' },
  });
  const pdfPath = positional[0];
  if (!flags.title) throw new Error('Missing required flag: --title "..."');

  const token = process.env.ZENODO_TOKEN;
  const baseUrl = (process.env.ZENODO_BASE_URL || 'https://zenodo.org/api').replace(/\/$/, '');
  const dryRun = !!flags['dry-run'] || !token;

  // Build record metadata: defaults <- optional JSON file <- CLI flags.
  let fileMetadata = {};
  if (flags.metadata) {
    fileMetadata = JSON.parse(await readFile(flags.metadata, 'utf8'));
  }
  const metadata = {
    title: flags.title,
    upload_type: 'publication',
    publication_type: 'article',
    creators: [
      { person_or_org: { type: 'personal', family_name: 'Yu', given_name: 'Yanming' } },
    ],
    description: fileMetadata.description || flags.title,
    publication_date: new Date().toISOString().slice(0, 10),
    ...fileMetadata,
    title: flags.title, // CLI title always wins
  };

  const fileName = path.basename(pdfPath);
  const pdfBytes = await readFile(pdfPath);

  if (dryRun) {
    printDryRun('zenodo', {
      base_url: baseUrl,
      steps: [
        `POST ${baseUrl}/records (create draft)`,
        `PUT <bucket>/${fileName} (upload ${pdfBytes.length} bytes)`,
        flags.publish ? `POST <record>/draft/actions/publish` : '(publish skipped: no --publish)',
      ].join(' -> '),
      title: metadata.title,
      upload_type: `${metadata.upload_type}/${metadata.publication_type}`,
      publication_date: metadata.publication_date,
      file: `${pdfPath} (${pdfBytes.length} bytes)`,
      reason: flags['dry-run'] ? '--dry-run flag' : 'ZENODO_TOKEN not set',
    });
    return;
  }

  const auth = { Authorization: `Bearer ${token}` };

  // 1. Create the draft record.
  const record = await fetchJson(`${baseUrl}/records`, {
    method: 'POST',
    headers: auth,
    body: { metadata },
  });
  console.log(`[zenodo] draft record created: ${record.id}`);
  const bucketUrl = record.links?.bucket;
  if (!bucketUrl) throw new Error('Draft record has no links.bucket; cannot upload file');

  // 2. Upload the file to the bucket (binary PUT, not JSON).
  const uploadRes = await fetch(`${bucketUrl}/${encodeURIComponent(fileName)}`, {
    method: 'PUT',
    headers: { ...auth, 'Content-Type': 'application/octet-stream' },
    body: pdfBytes,
  });
  if (!uploadRes.ok) {
    throw new Error(`File upload failed: HTTP ${uploadRes.status}: ${(await uploadRes.text()).slice(0, 500)}`);
  }
  console.log(`[zenodo] uploaded ${fileName} (${pdfBytes.length} bytes)`);

  // 3. Optionally publish.
  if (flags.publish) {
    const published = await fetchJson(record.links.publish, { method: 'POST', headers: auth });
    console.log(`[zenodo] published: ${published.links?.html || `record ${record.id}`}`);
  } else {
    console.log(`[zenodo] draft ready at ${record.links?.self_html || `${baseUrl}/records/${record.id}`} (use --publish to publish)`);
  }
}

main().catch((err) => {
  console.error(`[zenodo] error: ${err.message}`);
  process.exit(1);
});
