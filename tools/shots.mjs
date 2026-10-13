// Smoke test: walk the app at phone size, report console errors, save screenshots.
// usage: node shots.mjs <outDir> [dark]   (expects serve.mjs running on :4173)
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const out = process.argv[2];
const dark = process.argv[3] === 'dark';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
if (dark) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('dialog', (d) => d.accept());

const base = 'http://localhost:4173/';
const shot = async (name, full = false) => { await new Promise((r) => setTimeout(r, 450)); await page.screenshot({ path: `${out}/${name}.png`, fullPage: full }); };
const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await new Promise((r) => setTimeout(r, 250)); };
const click = async (sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await new Promise((r) => setTimeout(r, 250)); };

await page.goto(base, { waitUntil: 'networkidle0' });
const code = fs.readFileSync('../data/access-code.txt', 'utf8').trim();
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await shot('00-gate');
await page.type('#code', 'WRONG-CODE'); await click('#gate .btn'); await new Promise((r) => setTimeout(r, 1500));
console.log('wrong code rejected:', await page.evaluate(() => !!document.querySelector('#gate') && /did not work/.test(document.body.innerText)));
await page.type('#code', code.toLowerCase()); await click('#gate .btn'); await new Promise((r) => setTimeout(r, 2000));
console.log('right code opens app:', await page.evaluate(() => !document.querySelector('#gate') && !!document.querySelector('.hero')));
await page.reload({ waitUntil: 'networkidle0' }); await new Promise((r) => setTimeout(r, 800));
console.log('stays unlocked after reload:', await page.evaluate(() => !!document.querySelector('.hero')));
await shot('01-home', true);
await go('#/study'); await shot('02-study', true);
await go('#/study/msk'); await shot('03-module', true);
await go('#/study/cvs/physiology'); await click('.check'); await click('details summary'); await shot('04-subject');
await go('#/practice'); await shot('05-practice', true);
await click('[data-act="start"]'); await shot('06-question');
await click('.opt:nth-child(2)'); await shot('07-answered', true);
for (let i = 0; i < 19; i++) { await click('[data-act="next"]'); await page.evaluate(() => document.querySelector('.opt:not([disabled])')?.click()); await new Promise((r) => setTimeout(r, 60)); }
await click('[data-act="finish"]'); await shot('08-result', true);
await go('#/practice'); await click('[data-act="mock"][data-b="B"]'); await click('.opt'); await shot('09-mock');
await click('[data-act="quit"]');
await go('#/review'); await shot('10-review');
await go('#/plan'); await shot('11-plan', true);
await go('#/decks/histo-id'); await click('[data-act="flip"]'); await shot('12-deck');
await go('#/stats'); await shot('13-stats', true);
await go('#/settings'); await shot('14-settings', true);
await go('#/links'); await shot('15-links');
await go('#/home'); await shot('16-home-after', true);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
console.log(errors.length ? errors.join('\n') : 'no console errors');
console.log('horizontal overflow:', overflow);
await browser.close();
