// Assemble the app's data files from the pipeline outputs.
// usage: node build.mjs   (run from tools/, after parse.mjs)
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { BLOCKS, MODULES, SUBJECTS } from './taxonomy.mjs';
import { YEARS, TIPS } from './curriculum.mjs';

const DATA = path.resolve('../data');
const OUT = path.resolve('../app/data');
fs.mkdirSync(OUT, { recursive: true });
const read = (f) => fs.readFileSync(path.join(DATA, f), 'utf8');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

// ---- Block C learning objectives from the KMU syllabus -------------------------------------
function parseSyllabus() {
  const SUBJ = { 'GROSS ANATOMY': 'anatomy', HISTOLOGY: 'histology', EMBRYOLOGY: 'embryology', PHYSIOLOGY: 'physiology', BIOCHEMISTRY: 'biochemistry' };
  const out = {}; // module -> subject -> [{t, lo[]}]
  let mod = null;
  let sub = null;
  let prefix = '';
  let topic = null;
  for (const raw of read('text/syllabus.txt').split('\n')) {
    const l = raw.trim();
    if (/^OSPE DISTRIBUTION/.test(l)) break;
    if (/^MODULE 1 — /.test(l)) { mod = 'cvs'; continue; }
    if (/^MODULE 2 — /.test(l)) { mod = 'resp'; continue; }
    if (!mod || !l || /^(=====|BLOCK C —|Khyber Medical University|S\.No Learning Objective|KMU Central|\d+ MCQs \|)/.test(l)) continue;
    const h = /^([A-Z][A-Z ]+?) — (CVS|Respiratory|Clinical Integration)/.exec(l);
    if (h) {
      sub = SUBJ[h[1]] || 'minor';
      prefix = sub === 'minor' ? h[1][0] + h[1].slice(1).toLowerCase() + ': ' : '';
      topic = null;
      continue;
    }
    if (!sub) continue;
    const t = /^n (.+)$/.exec(l);
    if (t) {
      topic = { t: prefix + t[1], lo: [] };
      (((out[mod] ||= {})[sub]) ||= []).push(topic);
      continue;
    }
    if (!topic) continue;
    const lo = /^(\d{1,2}) (.+)$/.exec(l);
    if (lo) topic.lo.push(lo[2]);
    else if (topic.lo.length) topic.lo[topic.lo.length - 1] += ' ' + l;
  }
  return out;
}

// ---- curriculum ------------------------------------------------------------------------------
const syllabus = parseSyllabus();
const year = YEARS[0];
const built = new Date().toISOString().slice(0, 10);
const curriculum = {
  built,
  years: [{ id: year.id, name: year.name, exam: year.exam, blocks: Object.keys(BLOCKS) }],
  subjects: SUBJECTS,
  blocks: Object.fromEntries(Object.entries(BLOCKS).map(([id, b]) => [id, { name: b.name, modules: b.modules, mcqs: 120 }])),
  modules: {},
};
for (const [mid, m] of Object.entries(MODULES)) {
  const subjects = {};
  for (const sid of Object.keys(SUBJECTS)) {
    const hand = year.modules[mid][sid];
    const fromSyllabus = syllabus[mid]?.[sid];
    if (!hand && !fromSyllabus) continue;
    const topics = fromSyllabus
      ? fromSyllabus.map((t) => ({ id: `${mid}.${sid}.${slug(t.t)}`, t: t.t, lo: t.lo }))
      : hand.topics.map(([t, ref]) => ({ id: `${mid}.${sid}.${slug(t)}`, t, ...(ref ? { ref } : {}) }));
    subjects[sid] = {
      w: m.weights[sid] || 0,
      ...(hand ? { book: hand.book, ...(fromSyllabus ? { ref: hand.topics.map(([t, r]) => (r ? `${t} (${r})` : t)).join(' · ') } : {}) } : {}),
      ...(TIPS[mid]?.[sid] ? { tip: TIPS[mid][sid] } : {}),
      topics,
    };
  }
  curriculum.modules[mid] = { name: m.name, block: m.block, mcqs: Object.values(m.weights).reduce((a, b) => a + b, 0), subjects };
}

// ---- resources -------------------------------------------------------------------------------
const links = JSON.parse(read('links.json'));

function histologyCards() {
  const text = read('text/histology_id_points.txt').split('\n').filter((l) => !/^=====|Histology Points of Identification|year MBBS|^\s*(1|st)\s*$|No\. Tissue|COMPILED BY/.test(l)).join('\n');
  const cards = [];
  const re = /(?:^|\n)\s*(\d{1,2})\.?\s+(?=[A-Z])/g;
  const idx = [...text.matchAll(re)];
  idx.forEach((m, i) => {
    const body = text.slice(m.index + m[0].length, i + 1 < idx.length ? idx[i + 1].index : text.length);
    const [name, ...pts] = body.split('•');
    const points = pts.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const title = name.replace(/\s+/g, ' ').trim();
    if (title && points.length) cards.push({ f: title, b: points });
  });
  return cards;
}

function minorRecalls() {
  const text = read('text/minor_block_a.txt').replace(/=====.*=====/g, '').replace(/THE\s+MEDICO\s+MENTOR|0319[\d ]+TMM HELPLINE|1st Year MBBS · Block A · Side Subjects Recalls|\| *$/gm, '');
  const cards = [];
  for (const m of text.matchAll(/•([A-Za-z][^:•\n]{2,60}):([^•]*?)(?=•|\bQ:|\n\s*\d\. [A-Z]|$)/g)) {
    const body = m[2].replace(/REPEATED \d+X/g, '').replace(/\s+/g, ' ').trim();
    const rep = /REPEATED (\d+)X/.exec(m[2]);
    if (body.length > 25) cards.push({ f: m[1].replace(/\s+/g, ' ').trim(), b: [body], ...(rep ? { rep: Number(rep[1]) } : {}) });
  }
  return cards;
}

const decks = [
  { id: 'histo-id', name: 'Histology slide identification', kind: 'OSPE', sub: 'histology', note: 'Identification points for the slides asked at OSPE stations.', cards: histologyCards() },
  { id: 'minor-a', name: 'Minor subjects: Block A recalls', kind: 'High yield', sub: 'minor', note: 'Concepts that repeat across KMU Block A papers.', cards: minorRecalls() },
];

// ---- questions -------------------------------------------------------------------------------
const questions = JSON.parse(read('questions.raw.json')).map(({ r, ...q }) => q);

// The app's data is published as a single bundle encrypted with the access code, so the public
// repository never holds readable questions. Change the code with: node setcode.mjs <NEW-CODE>
const codeFile = path.join(DATA, 'access-code.txt');
if (!fs.existsSync(codeFile)) throw new Error('No access code set. Run: node setcode.mjs <CODE>');
const code = fs.readFileSync(codeFile, 'utf8').trim().toUpperCase().replace(/\s+/g, '');
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', crypto.pbkdf2Sync(code, salt, 150000, 32, 'sha256'), iv);
const plain = zlib.gzipSync(JSON.stringify({ curriculum, resources: { ...links, decks }, questions }), { level: 9 });
const sealed = Buffer.concat([salt, iv, cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f));
fs.writeFileSync(path.join(OUT, 'bundle.enc'), sealed);
console.log(`bundle.enc ${(sealed.length / 1024).toFixed(0)} KB (encrypted)`);
// stamp the service worker so installed phones fetch the new data
const swFile = path.resolve('../app/sw.js');
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
fs.writeFileSync(swFile, fs.readFileSync(swFile, 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${stamp}';`));
const topicCount = Object.values(curriculum.modules).reduce((a, m) => a + Object.values(m.subjects).reduce((b, s) => b + s.topics.length, 0), 0);
console.log(`topics=${topicCount} questions=${questions.length} keyed=${questions.filter((q) => q.a >= 0).length} decks=${decks.map((d) => `${d.id}:${d.cards.length}`).join(' ')}`);
