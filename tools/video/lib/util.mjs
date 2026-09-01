import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TOOL_ROOT = path.resolve(here, '..');
export const SITE_ROOT = path.resolve(here, '..', '..', '..');

export function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

export function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

/** Write file as explicit UTF-8 (no BOM). Returns true when content changed. */
export function writeUtf8(p, s) {
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === s) return false;
  fs.writeFileSync(p, s, { encoding: 'utf8' });
  return true;
}

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, ...opts });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} exited ${code}\nSTDOUT:${out.slice(-4000)}\nSTDERR:${err.slice(-4000)}`));
    });
  });
}

export function fmtSrtTime(totalSec) {
  const ms = Math.max(0, Math.round(totalSec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const rest = ms % 1000;
  const pad = (n, w) => String(n).padStart(w, '0');
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(rest, 3)}`;
}

export function fmtClock(sec) {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
