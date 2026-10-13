// Render selected PDF pages to PNG for visual inspection: node render.mjs <pdf> <outPrefix> <width> <page> [page...]
import fs from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const [pdf, out, width, ...pages] = process.argv.slice(2);
const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(pdf)), verbosity: 0, isEvalSupported: false }).promise;
for (const p of pages.map(Number)) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: Number(width) / page.getViewport({ scale: 1 }).width });
  const { canvas, context } = doc.canvasFactory.create(Math.ceil(vp.width), Math.ceil(vp.height));
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport: vp }).promise;
  fs.writeFileSync(`${out}-${p}.jpg`, canvas.toBuffer('image/jpeg', 80));
}
