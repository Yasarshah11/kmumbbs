// One-off: collect lecture links (.txt) and saved Google Forms tests (MHTML) into data/links.json.
// usage: node links.mjs <linksDir> <testsDir> <out.json>
import fs from 'fs';
import path from 'path';

const [linksDir, testsDir, out] = process.argv.slice(2);
function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, o); else o.push(p);
  }
  return o;
}
const title = (s) => s.replace(/\.txt$/, '').replace(/\(\d\)$/, '').replace(/\b\d{3,4}p\b|\bmp4\b|\bu\b/gi, '').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());

const seen = new Set();
const lectures = [];
for (const f of walk(linksDir).filter((f) => f.endsWith('.txt')).sort()) {
  const url = fs.readFileSync(f, 'utf8').trim().replace(/[&?]si=[^&]+/, '');
  if (!/^https?:/.test(url) || seen.has(url)) continue;
  seen.add(url);
  lectures.push({ t: title(path.basename(f)), u: url, by: 'Dr Najeeb', m: 'cvs', sub: 'physiology' });
}
lectures.sort((a, b) => a.t.localeCompare(b.t, 'en', { numeric: true }));

const MOD = [[/FOUNDATION/i, 'foundation'], [/BLOOD/i, 'blood'], [/BLOCK B/i, 'msk'], [/CARDIOVASCULAR/i, 'cvs'], [/RESPIRATION/i, 'resp']];
const SUB = [[/ANATOMY/i, 'anatomy'], [/BIOCHEM/i, 'biochemistry'], [/PHYSIOLOGY/i, 'physiology'], [/EMBRYOLOGY/i, 'embryology'], [/HISTOLOGY/i, 'histology']];
const tests = [];
for (const f of walk(testsDir).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))) {
  const fd = fs.openSync(f, 'r');
  const buf = Buffer.alloc(600);
  fs.readSync(fd, buf, 0, 600, 0);
  fs.closeSync(fd);
  const head = buf.toString('utf8');
  if (!head.startsWith('From:')) continue;
  const url = (head.match(/Snapshot-Content-Location: (\S+)/) || [])[1];
  if (!url || seen.has(url)) continue;
  seen.add(url);
  const rel = path.relative(testsDir, f);
  const dir = path.dirname(rel);
  const m = (MOD.find(([re]) => re.test(dir)) || [])[1];
  const sub = (SUB.find(([re]) => re.test(dir)) || [])[1] || null;
  const name = path.basename(f).replace(/^\d+\.\s*/, '').replace(/_+$/, '').replace(/\s+/g, ' ').trim();
  tests.push({ t: /MODULE TEST|SPECIAL SESSION|MEGA/i.test(rel) ? `${name} (module test)` : name, u: url, m, sub, by: 'Medico Healer' });
}
fs.writeFileSync(out, JSON.stringify({ lectures, tests }, null, 1));
console.log(`lectures=${lectures.length} tests=${tests.length}`);
