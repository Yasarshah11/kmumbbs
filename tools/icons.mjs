// Draw the app icon (an NZ monogram on a rounded tile) as SVG + PNGs.
import fs from 'fs';
import { createCanvas } from '@napi-rs/canvas';

const out = '../app/icons';
fs.mkdirSync(out, { recursive: true });

function draw(size, maskable) {
  const c = createCanvas(size, size);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#0b6f72');
  g.addColorStop(1, '#17203a');
  x.fillStyle = g;
  if (maskable) x.fillRect(0, 0, size, size);
  else { x.beginPath(); x.roundRect(0, 0, size, size, size * 0.23); x.fill(); }
  const s = maskable ? 0.72 : 1; // keep the mark inside the maskable safe zone
  x.translate(size / 2, size / 2); x.scale((size / 100) * s, (size / 100) * s); x.translate(-50, -50);
  x.lineWidth = 8; x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = '#fff'; x.beginPath(); x.moveTo(20, 70); x.lineTo(20, 30); x.lineTo(44, 70); x.lineTo(44, 30); x.stroke();
  x.strokeStyle = '#f4b3ad'; x.beginPath(); x.moveTo(56, 30); x.lineTo(80, 30); x.lineTo(56, 70); x.lineTo(80, 70); x.stroke();
  return c.toBuffer('image/png');
}
fs.writeFileSync(`${out}/icon-192.png`, draw(192, false));
fs.writeFileSync(`${out}/icon-512.png`, draw(512, false));
fs.writeFileSync(`${out}/icon-maskable-512.png`, draw(512, true));
fs.writeFileSync(`${out}/icon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6f72"/><stop offset="1" stop-color="#17203a"/></linearGradient></defs><rect width="100" height="100" rx="23" fill="url(#g)"/><g fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 70V30l24 40V30" stroke="#fff"/><path d="M56 30h24L56 70h24" stroke="#f4b3ad"/></g></svg>`);
console.log('icons written');
