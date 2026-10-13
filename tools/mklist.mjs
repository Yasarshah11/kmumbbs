// Build the source manifest: every unique PDF in the given roots, classified TEXT or SCAN.
// TEXT pdfs get their text layer dumped to <dataDir>/text; SCAN pdfs are listed for ocr.mjs.
// usage: node mklist.mjs <dataDir> <root:label> [<root:label> ...]
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [dataDir, ...roots] = process.argv.slice(2);
fs.mkdirSync(path.join(dataDir, 'text'), { recursive: true });

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const slug = (s) => s.replace(/\.pdf$/i, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 110);

async function pageText(page) {
  const tc = await page.getTextContent();
  const lines = [];
  let line = '';
  let lastY = null;
  for (const it of tc.items) {
    const y = Math.round(it.transform[5]);
    if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line); line = ''; }
    line += it.str;
    lastY = y;
  }
  lines.push(line);
  return lines.join('\n').trim();
}

const seen = new Map();
const manifest = [];
const ocrList = [];
for (const spec of roots) {
  const i = spec.lastIndexOf(':');
  const root = spec.slice(0, i);
  const label = spec.slice(i + 1);
  for (const f of walk(root)) {
    const buf = fs.readFileSync(f);
    if (buf.slice(0, 5).toString() !== '%PDF-') continue;
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    const rel = path.relative(root, f);
    if (seen.has(hash)) { seen.get(hash).dupes.push(`${label}/${rel}`); continue; }
    const name = slug(`${label}__${rel}`);
    const entry = { name, label, rel, pages: 0, kind: '', dupes: [] };
    seen.set(hash, entry);
    manifest.push(entry);
    try {
      const doc = await getDocument({ data: new Uint8Array(buf), verbosity: 0, isEvalSupported: false }).promise;
      entry.pages = doc.numPages;
      const parts = [];
      let textPages = 0;
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const t = await pageText(page);
        if (t.length > 200) textPages++;
        parts.push(`\n===== page ${p} =====\n${t}`);
        page.cleanup();
        // a scan is obvious after a few pages; don't walk 400 empty pages
        if (p === 12 && textPages === 0) break;
      }
      await doc.destroy();
      entry.kind = textPages / entry.pages > 0.7 ? 'TEXT' : 'SCAN';
      if (entry.kind === 'TEXT') fs.writeFileSync(path.join(dataDir, 'text', name + '.txt'), parts.join('\n'));
      else ocrList.push(`${f}\t${name}`);
    } catch (e) {
      entry.kind = 'ERR ' + e.message;
    }
    console.log(`${entry.kind.padEnd(5)} ${String(entry.pages).padStart(4)}  ${name}`);
  }
}
fs.writeFileSync(path.join(dataDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
fs.writeFileSync(path.join(dataDir, 'ocr.list'), ocrList.join('\n'));
const sum = (k) => manifest.filter((m) => m.kind === k).reduce((a, m) => a + m.pages, 0);
console.log(`\nunique=${manifest.length} TEXT pages=${sum('TEXT')} SCAN pages=${sum('SCAN')} (to OCR: ${ocrList.length} files)`);
