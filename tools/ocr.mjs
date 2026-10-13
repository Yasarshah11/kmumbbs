// OCR scanned PDFs: render each page with pdf.js, run Tesseract, write one .txt per PDF.
// usage: node ocr.mjs <listFile> <outDir> [workers] [--keep-png]
//   listFile: one "<pdfPath>\t<outName>" per line
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const TESS = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
const args = process.argv.slice(2);
const keepPng = args.includes('--keep-png');
const [listFile, outDir, workersArg] = args.filter((a) => !a.startsWith('--'));
const WORKERS = Number(workersArg || 6);
const flag = (n, d) => { const a = args.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const TARGET_WIDTH = Number(flag('width', 1700)); // px; 1700 is ~200 dpi for an A4 page
const PSM = flag('psm', '3'); // 1 = also detect page rotation

fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-'));

const ROTATE = args.includes('--rotate'); // detect sideways / upside-down photos and straighten them first
const osd = (png) =>
  new Promise((resolve) => {
    execFile(TESS, [png, 'stdout', '--psm', '0'], (err, stdout) => resolve(err ? 0 : Number((/Rotate: (\d+)/.exec(stdout) || [0, 0])[1])));
  });
const tesseract = (png) =>
  new Promise((resolve) => {
    execFile(TESS, [png, 'stdout', '-l', 'eng', '--psm', PSM], { maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => resolve(err ? '' : stdout));
  });

async function ocrPdf(pdfPath, outName) {
  const outFile = path.join(outDir, outName + '.txt');
  if (fs.existsSync(outFile)) return 'skip';
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)), verbosity: 0, isEvalSupported: false }).promise;
  const n = doc.numPages;
  const texts = new Array(n);
  let next = 1;
  // pdf.js rendering is serialised per document; Tesseract runs in parallel processes.
  let renderLock = Promise.resolve();
  const render = (i, turn = 0) => {
    const job = renderLock.then(async () => {
      const page = await doc.getPage(i);
      const rotation = (page.rotate + turn) % 360; // re-render straightened when OSD found the photo turned
      const base = page.getViewport({ scale: 1, rotation });
      const viewport = page.getViewport({ scale: TARGET_WIDTH / Math.min(base.width, base.height), rotation });
      const { canvas, context: ctx } = doc.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const png = path.join(keepPng ? outDir : tmp, `${outName}-p${String(i).padStart(4, '0')}.png`);
      fs.writeFileSync(png, canvas.toBuffer('image/png'));
      page.cleanup();
      return png;
    });
    renderLock = job.catch(() => {});
    return job;
  };
  const worker = async () => {
    while (next <= n) {
      const i = next++;
      try {
        const png = await render(i);
        const deg = ROTATE ? await osd(png) : 0;
        if (deg) await render(i, deg);
        texts[i - 1] = await tesseract(png);
        if (!keepPng) fs.unlinkSync(png);
      } catch (e) {
        texts[i - 1] = `[[render/ocr failed: ${e.message}]]`;
      }
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  await doc.destroy();
  fs.writeFileSync(outFile, texts.map((t, i) => `\n===== page ${i + 1} =====\n${(t || '').trim()}`).join('\n'));
  return `${n} pages`;
}

const jobs = fs.readFileSync(listFile, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
const t0 = Date.now();
for (const [pdfPath, outName] of jobs) {
  const t = Date.now();
  try {
    const r = await ocrPdf(pdfPath, outName);
    console.log(`${r.padEnd(10)} ${((Date.now() - t) / 1000).toFixed(0).padStart(5)}s  ${outName}`);
  } catch (e) {
    console.log(`ERR ${outName}: ${e.message}`);
  }
}
console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
