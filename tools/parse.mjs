// Parse extracted / OCR'd text into a structured MCQ bank.
// usage: node parse.mjs <dataDir> <outJson> [--report]
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { classify, MODULES } from './taxonomy.mjs';

const [dataDir, outJson] = process.argv.slice(2);
const report = process.argv.includes('--report');
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json'), 'utf8'));
// AI-suggested keys for papers that came unsolved: { "<question id>": "C" }; "X" drops a question whose text is too damaged to use.
const keysFile = path.join(dataDir, 'keys.json');
const aiKeys = fs.existsSync(keysFile) ? JSON.parse(fs.readFileSync(keysFile, 'utf8')) : {};

const QUESTION_LABELS = new Set(['kmu', 'college', 'supersix', 'tendoctor', 'scorebooster', 'mcqpdf', 'misc', 'mh']);
const BOOKS = { supersix: 'Super Six', tendoctor: 'Ten Doctor', scorebooster: 'Score Booster', mcqpdf: 'MCQ bank', mh: 'Medico Healer', misc: 'MCQ bank' };

function sourceMeta(m) {
  const n = m.name;
  const blocks = [...n.matchAll(/(?:BLOCK|Paper|ppr|PREPROFF|proff)_([ABC])(?=_|$)/gi)].map((x) => x[1].toUpperCase());
  const combined = /_B_C_papers/i.test(n);
  const year = (n.match(/(20[12]\d)/) || [])[1];
  const college = (n.match(/_(KMC|KGMC|GMC|WMC|RMC|NWSM|BKMC)(?=_|$)/i) || [])[1];
  return {
    kind: m.label === 'kmu' || /^misc_KMU/.test(n) ? 'kmu' : m.label === 'college' ? 'college' : 'book',
    block: combined ? null : blocks.length ? blocks[blocks.length - 1] : null,
    year: year ? Number(year) : null,
    by: m.label === 'kmu' ? 'KMU' : college ? college.toUpperCase() : BOOKS[m.label] || m.label,
  };
}

const NOISE = [/^=+ page \d+ =+$/, /\|\s*P\s*a\s*g\s*e/i, /MEDICO\s*MENTOR/i, /\bTMM\b/, /HELPLINE/i, /facebook|instagram|whatsapp|telegram|youtube\.com|www\./i, /^BLOCK [ABC] PAST \d{4}$/i, /^KGMC.?\d\d$/, /^\s*Page \d+ of \d+\s*$/i, /SUPER\s*(6|SIX)\s*FOR KMU/i, /^(MEDICO|MENTOR|THE)$/];

function clean(raw) {
  return raw
    .replace(/\r/g, '')
    .replace(/Ɵ/g, 'ti').replace(/Ō/g, 'ft').replace(/Ʃ/g, 'tt').replace(/ƫ/g, 'tt').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬀ/g, 'ff').replace(/ﬃ/g, 'ffi')
    .replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/ /g, ' ')
    // common OCR misreads of option letters
    .replace(/(^|[ \t])[¢©](?=\s?[.)])/gm, '$1c').replace(/(^|[ \t])[€é](?=\s?[.)])/gm, '$1e')
    .split('\n')
    .filter((l) => !NOISE.some((re) => re.test(l.trim())))
    .join('\n');
}

const Q_START = /^\s*(?:Q(?:s|uestion)?\s*[.#\-]?\s*(?:No\.?\s*)?)?(\d{1,3})\s*(?:[.):\-]+|,(?=\s))\s*(?=\S|$)/i;
const ANSWER = /(?:^|\n|\s)(?:correct\s+)?(?:answer|ans|key)\s*(?:is)?\s*[:\-.;=]?\s*\(?([A-Ea-e])(?![a-z])\)?[.:)]?/i;

function findMarkers(chunk) {
  // Try line-start 'a' first, in either case; fall back to an inline 'a'.
  const tries = [
    { re: /(^|\n)[ \t]*\(?([Aa])\s?(?:[.)]|,(?= [A-Z0-9]))[ \t]*(?=\S)/g },
    { re: /([ \t\n])\(?([Aa])[.)][ \t]*(?=\S)/g },
  ];
  for (const { re } of tries) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(chunk))) {
      const upper = m[2] === 'A';
      const marks = [{ at: m.index + m[1].length, end: m.index + m[0].length }];
      let pos = marks[0].end;
      for (const L of ['b', 'c', 'd', 'e']) {
        const letter = upper ? L.toUpperCase() : L;
        const r = new RegExp(`(^|[ \\t\\n])\\(?${letter}\\s?(?:[.)]|,(?= [A-Z0-9]))[ \\t]*(?=\\S)`, 'g');
        r.lastIndex = pos;
        const x = r.exec(chunk);
        if (!x) break;
        marks.push({ at: x.index + x[1].length, end: x.index + x[0].length });
        pos = x.index + x[0].length;
      }
      if (marks.length >= 4) return marks;
    }
  }
  return null;
}

const squash = (s) => s.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
const garbage = (s) => { const a = (s.match(/[A-Za-z]/g) || []).length; return a / Math.max(1, s.replace(/\s/g, '').length) < 0.62; };
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

// Books that print the key as "(C)" on its own line after the options. OCR often mangles the
// option letters there, so fall back to treating each line before the key as one option.
const KEY_LINE = /\n[ \t]*\(([A-Ea-e])\)[ \t.,']*(?=\n|$)/;
const OPT_PREFIX = /^\s*\(?\S{1,2}[.,)]\s+|^\s*[a-eA-E]\s+(?=[A-Z])/;
function parseKeyed(chunk, kl) {
  const lines = chunk.slice(0, kl.index).split('\n').map((l) => l.trim()).filter(Boolean);
  let first = lines.findIndex((l, i) => i > 0 && /^\(?[aA][.,)]?\s+\S/.test(l));
  if (first < 0) first = lines.findIndex((l) => /[?:]$/.test(l)) + 1;
  if (first < 1) return null;
  const o = [];
  for (const l of lines.slice(first)) {
    if (OPT_PREFIX.test(l) || !o.length) o.push(l.replace(OPT_PREFIX, ''));
    else o[o.length - 1] += ' ' + l;
  }
  const stem = lines.slice(0, first).join(' ');
  const ans = kl[1].toUpperCase().charCodeAt(0) - 65;
  if (o.length < 4 || o.length > 5 || ans >= o.length) return null;
  return { stem, o, ans };
}

function parseChunk(chunk) {
  const kl = KEY_LINE.exec(chunk);
  if (kl) {
    const body = chunk.slice(0, kl.index);
    const mk = findMarkers(body);
    let r = null;
    if (mk && mk.length === 5) {
      const o = mk.map((m, i) => squash(body.slice(m.end, i + 1 < mk.length ? mk[i + 1].at : body.length)));
      r = { stem: squash(body.slice(0, mk[0].at)), o, ans: kl[1].toUpperCase().charCodeAt(0) - 65 };
    } else r = parseKeyed(chunk, kl);
    if (!r) return null;
    r.o = r.o.map((x) => squash(x).replace(/[\s.;,'‘]+$/, ''));
    if (r.stem.length < 12 || r.stem.length > 1100 || garbage(r.stem) || r.o.some((x) => !x || x.length > 240)) return null;
    return { ...r, exp: '' };
  }
  const marks = findMarkers(chunk);
  if (!marks) return null;
  const stem = squash(chunk.slice(0, marks[0].at));
  const opts = marks.map((mk, i) => chunk.slice(mk.end, i + 1 < marks.length ? marks[i + 1].at : chunk.length));
  let tail = opts[opts.length - 1];
  let ans = -1;
  let exp = '';
  const am = ANSWER.exec(tail);
  // answers given as text ("Answer: glucose") must not leak into the last option
  let ansText = '';
  if (!am) {
    const at = /\s(?:Answer|Ans)\s*[:;]\s*([^\n]*)/i.exec(tail);
    if (at) { ansText = norm(at[1].replace(/Hint.*$/i, '')); tail = tail.slice(0, at.index); }
  }
  if (am) {
    ans = am[1].toUpperCase().charCodeAt(0) - 65;
    exp = squash(tail.slice(am.index + am[0].length).replace(/^\s*[)\].:-]?\s*/, ''));
    // "Answer: C) Osteoblasts" repeats the option text; drop it from the explanation
    exp = exp.replace(/^(?:[^\n]{0,80}?)(?:Explanation|Hint|Reason(?:ing)?|Rationale)\s*[:;-]\s*/i, '').replace(/^[•\-\s]+/, '').replace(/^Reasoning:\s*/i, '');
    tail = tail.slice(0, am.index);
  }
  // the last option ends at a blank line or after three wrapped lines
  const tl = tail.split('\n');
  const keep = [];
  for (const l of tl) { if (!l.trim() && keep.length) break; if (l.trim()) keep.push(l); if (keep.length === 3) break; }
  if (!am && keep.length > 1 && keep.join(' ').length > 140) keep.length = 1;
  opts[opts.length - 1] = keep.join(' ');
  let o = opts.map((x) => squash(x));
  // OCR often reads the fifth letter as "c.", "@." or "¢," so option E ends up glued to D
  if (o.length === 4) {
    const parts = o[3].split(/\s+[-_~."'*\\/(]*(?:(?:@|©|[ceE]{1,2})\s?[.,)]\s+|E\s?-\s?|E\s+(?=[A-Z]))(?=\S)/);
    if (parts.length === 2 && parts[0].length > 1 && parts[1].length > 1 && parts[1].length < 130) o = [o[0], o[1], o[2], parts[0], parts[1]];
  }
  o = o.map((x) => x.replace(/Scanned with CamScanner/gi, '').replace(/[\s.;,:'"`~_\-|=><*]+$/, '').replace(/^[\s:'"`~_\-|=*]+/, '').trim());
  if (ansText && ans < 0) ans = o.findIndex((x) => norm(x) === ansText);
  if (stem.length < 12 || stem.length > 1100 || garbage(stem)) return null;
  if (o.some((x) => !x || x.length > 240)) return null;
  if (ans >= o.length) ans = -1;
  return { stem, o, ans, exp: exp.length > 15 && !garbage(exp) ? exp.slice(0, 900) : '' };
}

function parseSource(m) {
  const meta = sourceMeta(m);
  const file = ['text', 'ocr'].map((d) => path.join(dataDir, d, m.name + '.txt')).find((f) => fs.existsSync(f));
  if (!file) return { qs: [], candidates: 0 };
  const lines = clean(fs.readFileSync(file, 'utf8')).split('\n');
  const cands = [];
  lines.forEach((l, i) => {
    const mt = Q_START.exec(l);
    if (mt) cands.push({ i, n: Number(mt[1]), skip: mt[0].length });
  });
  const starts = [];
  let last = 0;
  let section = 1;
  cands.forEach((c, k) => {
    const n1 = cands[k + 1]?.n;
    const n2 = cands[k + 2]?.n;
    if (c.n > last && c.n <= last + 3) { /* in sequence */ }
    else if (c.n > last && n1 === c.n + 1) { /* a gap, confirmed by the next number */ }
    else if (c.n <= last && last >= 3 && n1 === c.n + 1 && (c.n === 1 || n2 === c.n + 2)) section++;
    else return;
    last = c.n;
    starts.push({ ...c, section });
  });
  const qs = [];
  const tables = [];
  lines.forEach((l, i) => {
    const pairs = [...l.matchAll(/(?:^|[\s,;|])(\d{1,3})\s*[.\-:)=]?\s*\(?([A-Ea-e])\)?(?=$|[\s,;|])/g)];
    if (pairs.length >= 4) tables.push({ i, pairs: pairs.map((p) => [Number(p[1]), p[2].toUpperCase().charCodeAt(0) - 65]) });
  });
  starts.forEach((st, k) => {
    const endLine = k + 1 < starts.length ? starts[k + 1].i : Math.min(lines.length, st.i + 40);
    const chunk = [lines[st.i].slice(st.skip), ...lines.slice(st.i + 1, endLine)].join('\n');
    const q = parseChunk(chunk);
    if (q) qs.push({ ...q, n: st.n, section: st.section, line: st.i, meta });
  });
  // answer-key tables apply to the closest section above them
  for (const t of tables) {
    const sec = [...qs].reverse().find((q) => q.line < t.i)?.section;
    if (!sec) continue;
    for (const [n, a] of t.pairs) {
      const q = qs.find((x) => x.section === sec && x.n === n);
      if (q && q.ans < 0 && a < q.o.length) { q.ans = a; q.keyFrom = 'table'; }
    }
  }
  // Keys and explanations read off a scan can sit against the wrong question, and a wrong key is
  // worse than none. Scanned sources only get keys through keys.json.
  if (file.includes(`${path.sep}ocr${path.sep}`)) for (const q of qs) { q.ans = -1; q.exp = ''; q.keyFrom = undefined; }
  for (const q of qs) {
    q.stem = q.stem.replace(/\s*Scanned (?:with|by) CamScanner\s*/gi, ' ').trim();
    // running headers and section titles that the page layout dropped into an option
    q.o = q.o.map((x) => x.replace(/\s+answe?r?\b.*$/i, '').replace(/\s+(?:BLOCK [A-Z] [A-Z]{2,5} \d{4}.*|(?:\d\s*)?[Ss][Tt] YEAR MBBS.*|SUPER 6 .*|AMBASSADOR OF UR CLASS.*|WOMEN MEDICAL COLLEGE.*|(MCQ [^)]*unavailable)|(?:ANATOMY|HISTOLOGY|EMBRYOLOGY|BIO0?CHEMISTRY|PHYSIOLOGY(?: FOUNDATION)?|MINOR|BLOOD?))\s*$/, '').trim());
    q.o = q.o.map((x) => x.replace(/\s*[-~.]*\s*(?:Page \d+\s*)?'?TEN DOCTORS? BY KMU.*$/i, '').replace(/\s+\((?:[A-E]|\d)\)?$/, '').trim());
    // watermarks and answer ticks from downloaded question banks
    q.o = q.o.map((x) => x.replace(/\s*\{?\[\]/g, '').replace(/\s*Livemcqs\.com/gi, '').replace(/\s*sh?ared by doctor of.*$/i, '').replace(/\s*This document is available free of charge.*$/i, '').trim());
    q.stem = q.stem.replace(/^.*?Page: \d+'?\s*Difficulty: \d\s*©?\s*Ans: [A-E]\s+/, '').replace(/\s*sh?ared by doctor of.*$/i, '').replace(/\s*\[(?:AIIMS|AIMS|PGI|JIPMER)[^\]]*\]/g, '');
    // Ten Doctor prints the key letter after the last option; it is not part of the option
    if (m.label === 'tendoctor' && q.o.length === 5 && !/(?:vitamin|hepatitis|type|group|factor|protein|ig|hb|h[ae]+moglobin|coenzyme|phase|grade|class|zone|band|cyclin|apo|blood)\s+[A-E]$/i.test(q.o[4])) q.o[4] = q.o[4].replace(/\s+[A-E]$/, '');
    q.stem = q.stem.replace(/\s*(?:Page \d+\s*)?'?TEN DOCTORS? BY KMU PAST EXAMS(?: IST YEAR)?/gi, '').replace(/\s*\bBLOCK [A-Z] [A-Z]{2,5} \d{3,4}\b/g, '').replace(/\s*\bST YEAR MBBS\b/g, '').replace(/\s{2,}/g, ' ').trim();
  }
  for (const q of qs) q.ref = `${m.name}#${q.section}.${q.n}`;
  return { qs, candidates: starts.length };
}

const bank = new Map();
const rows = [];
for (const m of manifest) {
  if (!QUESTION_LABELS.has(m.label)) continue;
  // Super Six is set in two columns, which plain OCR interleaves into nonsense; it needs a
  // column-aware pass before it can be trusted.
  if (/SUPER_6|^supersix/i.test(m.name)) continue;
  const { qs, candidates } = parseSource(m);
  rows.push({ name: m.name, pages: m.pages, candidates, parsed: qs.length, keyed: qs.filter((q) => q.ans >= 0).length });
  for (const q of qs) {
    const key = norm(q.stem).slice(0, 110) + '|' + norm(q.o[0]).slice(0, 30);
    const src = { k: q.meta.kind, by: q.meta.by, y: q.meta.year, b: q.meta.block };
    const had = bank.get(key);
    if (had) {
      if (!had.srcs.some((s) => s.by === src.by && s.y === src.y)) had.srcs.push(src);
      if (had.ans < 0 && q.ans >= 0) { had.ans = q.ans; had.keyFrom = q.keyFrom; }
      if (!had.exp && q.exp) had.exp = q.exp;
      had.refs.push(q.ref);
      continue;
    }
    bank.set(key, { ...q, key, srcs: [src], refs: [q.ref] });
  }
}

const out = [];
for (const q of bank.values()) {
  const blocks = [...new Set(q.srcs.map((s) => s.b).filter(Boolean))];
  const block = blocks.length === 1 ? blocks[0] : null;
  const c = classify(q.stem + ' ' + q.o.join(' '), block);
  const mod = c.module || (block === 'B' ? 'msk' : null);
  const id = crypto.createHash('md5').update(q.key).digest('hex').slice(0, 9);
  const ai = aiKeys[id];
  if (ai === 'X') continue;
  // another option letter or question number inside an option means the scan ran questions together
  if (q.o.some((x) => /\s[b-eB-E]\s?[.)]\s+\S/.test(x) || /\s\d{1,3}\s?[.,]\s?[A-Z][a-z]+\s\S+\s\S+/.test(x) || x.length > 170) || /PAPER CODE/.test(q.stem)) continue;
  if (q.ans < 0 && ai && 'ABCDE'.indexOf(ai) >= q.o.length) continue; // the keyed option was lost in OCR
  if (q.ans < 0 && ai && 'ABCDE'.indexOf(ai) >= 0 && 'ABCDE'.indexOf(ai) < q.o.length) { q.ans = 'ABCDE'.indexOf(ai); q.keyFrom = 'ai'; }
  out.push({
    id,
    s: q.stem,
    o: q.o,
    a: q.ans,
    ...(q.exp ? { e: q.exp } : {}),
    ...(q.keyFrom === 'ai' ? { ak: 1 } : {}),
    m: mod,
    b: block || (mod ? MODULES[mod].block : null),
    sub: c.subject,
    src: q.srcs.map((s) => [s.k, s.by, s.y || 0]),
    r: q.refs,
  });
}

if (report) {
  for (const r of rows) console.log(`${String(r.pages).padStart(4)}p  cand=${String(r.candidates).padStart(4)} parsed=${String(r.parsed).padStart(4)} keyed=${String(r.keyed).padStart(4)}  ${r.name}`);
  const by = (f) => Object.entries(out.reduce((a, q) => ((a[f(q)] = (a[f(q)] || 0) + 1), a), {})).sort().map(([k, v]) => `${k}=${v}`).join('  ');
  console.log(`\nunique questions=${out.length}  keyed=${out.filter((q) => q.a >= 0).length}  kmu=${out.filter((q) => q.src.some((s) => s[0] === 'kmu')).length}  repeated=${out.filter((q) => q.src.length > 1).length}`);
  console.log('block:   ', by((q) => q.b));
  console.log('module:  ', by((q) => q.m));
  console.log('subject: ', by((q) => q.sub));
}
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(out));
console.log(`wrote ${out.length} questions -> ${outJson} (${(fs.statSync(outJson).size / 1024).toFixed(0)} KB)`);
