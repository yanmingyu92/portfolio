/** Minimal frontmatter parser for the flat YAML subset used by content/posts. */
export function parseFrontmatter(raw) {
  const fm = { __rest: raw };
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return fm;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      fm[key] = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      fm[key] = Number(value);
    } else {
      fm[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  return fm;
}
