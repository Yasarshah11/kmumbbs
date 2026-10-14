// NZ — offline-first study app. No framework: hash router + string templates.

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const tabsEl = $('#tabs');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LETTERS = 'ABCDE';
const SUBJ_ORDER = ['anatomy', 'physiology', 'biochemistry', 'histology', 'embryology', 'minor'];

const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  home: I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>'),
  book: I('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6"/>'),
  target: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
  repeat: I('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  grid: I('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
  chev: I('<path d="M9 6l6 6-6 6"/>', 'class="chev"'),
  left: I('<path d="M15 6l-6 6 6 6"/>'),
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.6"'),
  flag: I('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
  bolt: I('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  cards: I('<rect x="3" y="6" width="14" height="14" rx="2.5"/><path d="M7 3h11a3 3 0 0 1 3 3v11"/>'),
  play: I('<path d="M7 4.5v15l12-7.5z"/>'),
  link: I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  cal: I('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  chart: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.3-1.3L14 3h-4l-.3 2.5a7 7 0 0 0-2.3 1.3l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.3 1.3L10 21h4l.3-2.5a7 7 0 0 0 2.3-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z"/>'),
  x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  alert: I('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.1"/>'),
  doc: I('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
};

// ---------- state ----------
const KEY = 'nmh.v1';
const defaults = { name: '', pace: 4, goal: 40, theme: 'auto', t: {}, q: {}, flags: {}, keys: {}, days: {}, cards: {}, f: { block: 'all', module: 'all', subject: 'all', source: 'all', keyed: true, unseen: false, count: 20, mode: 'tutor' }, session: null };
let S = load();
function load() {
  try { return { ...structuredClone(defaults), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return structuredClone(defaults); }
}
let saveTimer;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Storage is full; progress was not saved'); } }, 150); }

let DB = null;
const QMAP = new Map();

// ---------- helpers ----------
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n, d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayLog = () => (S.days[ymd()] ||= { q: 0, ok: 0, t: 0 });
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ansOf = (q) => (q.a >= 0 ? q.a : S.keys[q.id] ?? -1);
const color = (sub) => `var(--c-${sub || 'minor'})`;
const subjName = (s) => DB.curriculum.subjects[s] || 'Unsorted';
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }
function ring(p, size = 54, stroke = 6, col = 'var(--primary)', track = 'var(--line)', label = null) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px"><svg class="ring" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${track}" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${col}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, p / 100))}"/></svg><span>${label ?? p + '%'}</span></div>`;
}
const bar = (p, col) => `<div class="bar"><i style="width:${Math.min(100, p)}%;${col ? `--c:${col}` : ''}"></i></div>`;
const back = (href, label) => `<a class="back" href="${href}">${ICON.left}${esc(label)}</a>`;

function topicsOf(filter = {}) {
  const out = [];
  for (const [mid, m] of Object.entries(DB.curriculum.modules)) {
    if (filter.block && m.block !== filter.block) continue;
    if (filter.module && mid !== filter.module) continue;
    for (const [sid, s] of Object.entries(m.subjects)) {
      if (filter.subject && sid !== filter.subject) continue;
      for (const t of s.topics) out.push({ ...t, mid, sid, w: s.w });
    }
  }
  return out;
}
function topicProgress(filter) {
  const ts = topicsOf(filter);
  return { done: ts.filter((t) => S.t[t.id]).length, total: ts.length, p: pct(ts.filter((t) => S.t[t.id]).length, ts.length) };
}
function streak() {
  let n = 0;
  let d = new Date();
  const active = (x) => { const l = S.days[ymd(x)]; return l && (l.q || l.t); };
  if (!active(d)) d = addDays(-1, d);
  while (active(d)) { n++; d = addDays(-1, d); }
  return n;
}
function pool(f) {
  return DB.questions.filter((q) => {
    if (f.block !== 'all' && q.b !== f.block) return false;
    if (f.module !== 'all' && q.m !== f.module) return false;
    if (f.subject !== 'all' && q.sub !== f.subject) return false;
    if (f.source !== 'all' && !q.src.some((s) => s[0] === f.source)) return false;
    if (f.keyed && ansOf(q) < 0) return false;
    if (f.unseen && S.q[q.id]) return false;
    return true;
  });
}
function accuracy(filter) {
  let n = 0, ok = 0;
  for (const [id, r] of Object.entries(S.q)) {
    const q = QMAP.get(id);
    if (!q || (filter && !filter(q))) continue;
    n += r.n; ok += r.ok;
  }
  return { n, ok, p: pct(ok, n) };
}
const srcLabel = (q) => q.src.map((s) => `<span class="pill ${s[0] === 'kmu' ? 'kmu' : ''}">${esc(s[1])}${s[2] ? ' ' + s[2] : ''}</span>`).join('');

// ---------- spaced review ----------
const INTERVALS = [1, 2, 5, 10, 21];
function record(q, ok) {
  const r = (S.q[q.id] ||= { n: 0, ok: 0, box: 0 });
  r.n++; if (ok) r.ok++;
  r.last = ok ? 1 : 0;
  r.box = ok ? Math.min(INTERVALS.length - 1, r.box + 1) : 0;
  r.due = ymd(addDays(ok ? INTERVALS[r.box] : 1));
  const d = dayLog(); d.q++; if (ok) d.ok++;
  save();
}
const mistakes = () => Object.entries(S.q).filter(([id, r]) => r.last === 0 && QMAP.has(id)).map(([id]) => id);
const dueIds = () => { const t = ymd(); return Object.entries(S.q).filter(([id, r]) => r.due && r.due <= t && QMAP.has(id)).map(([id]) => id); };
const flagged = () => Object.keys(S.flags).filter((id) => QMAP.has(id));

// ---------- sessions ----------
function startSession(ids, { mode = 'tutor', title = 'Practice', minutes = 0 } = {}) {
  if (!ids.length) return toast('No questions match that selection');
  S.session = { ids, i: 0, picks: {}, mode, title, start: Date.now(), limit: minutes * 60, graded: {} };
  save();
  location.hash = '#/session';
}
function mockIds(block) {
  const ids = [];
  for (const mid of DB.curriculum.blocks[block].modules) {
    for (const [sid, s] of Object.entries(DB.curriculum.modules[mid].subjects)) {
      const p = shuffle(pool({ block, module: mid, subject: sid, source: 'all', keyed: true, unseen: false }));
      ids.push(...p.slice(0, s.w).map((q) => q.id));
    }
  }
  return ids;
}

// ---------- views ----------
const V = {};

V.home = () => {
  const h = new Date().getHours();
  const greet = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const d = S.days[ymd()] || { q: 0, ok: 0, t: 0 };
  const all = topicProgress();
  const acc = accuracy();
  const next = topicsOf().find((t) => !S.t[t.id]);
  const due = dueIds().length;
  const weak = [];
  for (const [mid, m] of Object.entries(DB.curriculum.modules)) for (const sid of Object.keys(m.subjects)) {
    const a = accuracy((q) => q.m === mid && q.sub === sid);
    if (a.n >= 8) weak.push({ mid, sid, ...a, name: `${m.name} · ${subjName(sid)}` });
  }
  weak.sort((a, b) => a.p - b.p);
  return `
  <header class="hello row between">
    <div><p class="eyebrow">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${greet}${S.name ? ', ' + esc(S.name) : ''}</h1></div>
    <a class="iconbtn" href="#/settings" aria-label="Settings">${ICON.gear}</a>
  </header>
  <section class="hero">
    <div class="row between">
      <div>
        <p class="eyebrow">Questions today</p>
        <p class="big num">${d.q}<span style="font-size:1.1rem;opacity:.7"> / ${S.goal}</span></p>
      </div>
      ${ring(pct(d.q, S.goal), 78, 8, '#fff', 'rgba(255,255,255,.2)')}
    </div>
    <div class="hero-stats">
      <div><b>${streak()}</b><span>day streak</span></div>
      <div><b>${all.p}%</b><span>syllabus covered</span></div>
      <div><b>${acc.n ? acc.p + '%' : '–'}</b><span>accuracy</span></div>
    </div>
    <button class="btn" data-act="quick">${ICON.bolt}Quick 10 questions</button>
  </section>
  <section class="quick">
    <a class="card tap" href="#/practice"><div class="ico">${ICON.target}</div><h3>Practice</h3><p class="small muted">${DB.questions.length.toLocaleString()} past-paper MCQs</p></a>
    <a class="card tap" href="#/review"><div class="ico a">${ICON.repeat}</div><h3>Review</h3><p class="small muted">${due ? `${due} due today` : 'Nothing due yet'}</p></a>
    <a class="card tap" href="#/plan"><div class="ico g">${ICON.cal}</div><h3>Today's plan</h3><p class="small muted">${d.t} topic${d.t === 1 ? '' : 's'} done today</p></a>
    <a class="card tap" href="#/decks"><div class="ico v">${ICON.cards}</div><h3>OSPE & recall</h3><p class="small muted">Flashcard decks</p></a>
  </section>
  ${next ? `<div class="section-title"><h2>Continue studying</h2></div>
  <a class="card tap row" href="#/study/${next.mid}/${next.sid}"><span class="dot" style="--c:${color(next.sid)}"></span><div class="grow"><h3>${esc(next.t)}</h3><p class="small muted">${esc(DB.curriculum.modules[next.mid].name)} · ${subjName(next.sid)}</p></div>${ICON.chev}</a>` : ''}
  <div class="section-title"><h2>Your blocks</h2><a class="small" href="#/study">Study map</a></div>
  <div class="stack">${Object.entries(DB.curriculum.blocks).map(([bid, b]) => {
    const p = topicProgress({ block: bid });
    return `<a class="card tap row" href="#/study?b=${bid}">${ring(p.p, 50, 6)}<div class="grow"><h3>${b.name}</h3><p class="small muted">${b.modules.map((m) => DB.curriculum.modules[m].name).join(' + ')}</p></div><span class="small muted num">${p.done}/${p.total}</span>${ICON.chev}</a>`;
  }).join('')}</div>
  ${weak.length ? `<div class="section-title"><h2>Weak spots</h2></div><div class="card">${weak.slice(0, 3).map((w) => `<button class="brk" style="width:100%" data-act="drill" data-m="${w.mid}" data-s="${w.sid}"><span><b>${esc(w.name)}</b></span><span class="small muted num">${w.p}% of ${w.n}</span>${bar(w.p, color(w.sid))}</button>`).join('')}</div>` : ''}`;
};

V.study = (_, qs) => {
  const only = qs.get('b');
  return `<header><p class="eyebrow">First Year MBBS · KMU</p><h1>Study map</h1></header>
  ${Object.entries(DB.curriculum.blocks).filter(([bid]) => !only || bid === only).map(([bid, b]) => {
    const p = topicProgress({ block: bid });
    return `<section class="card block-card"><div class="row between"><div><h2>${b.name}</h2><p class="small muted">${b.mcqs} MCQs in the paper</p></div>${ring(p.p, 52, 6)}</div>
    <div class="mods">${b.modules.map((mid) => { const m = DB.curriculum.modules[mid]; const mp = topicProgress({ module: mid }); return `<a class="mod" href="#/study/${mid}"><div class="grow"><h3>${m.name}</h3><p class="small muted">${m.mcqs} MCQs · ${mp.done}/${mp.total} topics</p><div style="margin-top:8px">${bar(mp.p)}</div></div>${ICON.chev}</a>`; }).join('')}</div></section>`;
  }).join('')}
  ${only ? `<a class="btn ghost" href="#/study">Show all blocks</a>` : ''}`;
};

V.module = ([mid]) => {
  const m = DB.curriculum.modules[mid];
  if (!m) return V.study([], new URLSearchParams());
  const subs = SUBJ_ORDER.filter((s) => m.subjects[s]);
  const total = subs.reduce((a, s) => a + m.subjects[s].w, 0) || 1;
  return `${back('#/study', 'Study map')}
  <header><p class="eyebrow">${DB.curriculum.blocks[m.block].name}</p><h1>${m.name}</h1></header>
  <section class="card stack"><p class="eyebrow">Where the ${m.mcqs} MCQs come from</p>
    <div class="weights">${subs.filter((s) => m.subjects[s].w).map((s) => `<i style="--c:${color(s)};flex:${m.subjects[s].w}"></i>`).join('')}</div>
    <div class="legend">${subs.filter((s) => m.subjects[s].w).map((s) => `<span><i class="dot" style="--c:${color(s)}"></i>${subjName(s)} ${m.subjects[s].w}</span>`).join('')}</div></section>
  <div class="stack">${subs.map((sid) => {
    const s = m.subjects[sid]; const p = topicProgress({ module: mid, subject: sid });
    const nq = DB.questions.filter((q) => q.m === mid && q.sub === sid).length;
    return `<a class="card tap subj" style="--c:${color(sid)}" href="#/study/${mid}/${sid}"><div class="row between"><div class="grow"><h3>${subjName(sid)}</h3><p class="small muted">${s.w ? `${s.w} MCQs (${pct(s.w, total)}%) · ` : ''}${p.done}/${p.total} topics · ${nq} questions</p></div>${ICON.chev}</div><div style="margin-top:10px">${bar(p.p, color(sid))}</div></a>`;
  }).join('')}</div>`;
};

V.subject = ([mid, sid]) => {
  const m = DB.curriculum.modules[mid]; const s = m?.subjects[sid];
  if (!s) return V.study([], new URLSearchParams());
  const qs = DB.questions.filter((q) => q.m === mid && q.sub === sid);
  const keyed = qs.filter((q) => ansOf(q) >= 0).length;
  const lectures = DB.resources.lectures.filter((l) => l.m === mid && l.sub === sid);
  const tests = DB.resources.tests.filter((l) => l.m === mid && (l.sub === sid || (!l.sub && sid === 'anatomy')));
  const p = topicProgress({ module: mid, subject: sid });
  return `${back('#/study/' + mid, m.name)}
  <header class="row between"><div><p class="eyebrow" style="color:${color(sid)}">${m.name}${s.w ? ` · ${s.w} MCQs` : ''}</p><h1>${subjName(sid)}</h1></div>${ring(p.p, 56, 6, color(sid))}</header>
  ${s.book ? `<p class="small muted">${ICON.book.replace('<svg', '<svg style="display:inline;width:15px;height:15px;vertical-align:-2px"')} ${esc(s.book)}${s.ref ? ' — ' + esc(s.ref) : ''}</p>` : ''}
  ${s.tip ? `<p class="tip">${esc(s.tip)}</p>` : ''}
  <button class="btn" data-act="drill" data-m="${mid}" data-s="${sid}" ${qs.length ? '' : 'disabled'}>${ICON.target}Practise ${qs.length} question${qs.length === 1 ? '' : 's'}${keyed < qs.length ? ` <span style="opacity:.75;font-weight:500">(${keyed} with key)</span>` : ''}</button>
  <div class="section-title"><h2>Topics</h2><span class="small muted">tap to mark · twice = revised</span></div>
  <section class="card">${s.topics.map((t) => `<div class="topic"><button class="check" data-act="topic" data-id="${t.id}" data-s="${S.t[t.id] || 0}" aria-label="Mark ${esc(t.t)}">${ICON.check}</button><div class="grow"><p class="t">${esc(t.t)}</p>${t.ref ? `<p class="small muted">${esc(t.ref)}</p>` : ''}${t.lo ? `<details><summary class="small muted">${t.lo.length} learning objective${t.lo.length === 1 ? '' : 's'}</summary><ol class="los">${t.lo.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></details>` : ''}</div></div>`).join('')}</section>
  ${lectures.length ? `<div class="section-title"><h2>Lectures</h2><span class="small muted">${lectures.length} videos</span></div><section class="card">${lectures.map((l) => `<a class="linkrow" href="${esc(l.u)}" target="_blank" rel="noopener"><span class="ico">${ICON.play}</span><div class="grow"><p class="t" style="font-weight:600">${esc(l.t)}</p><p class="tiny muted">${esc(l.by)}</p></div></a>`).join('')}</section>` : ''}
  ${tests.length ? `<div class="section-title"><h2>Online tests</h2><span class="small muted">open in Google Forms</span></div><section class="card">${tests.map((l) => `<a class="linkrow" href="${esc(l.u)}" target="_blank" rel="noopener"><span class="ico">${ICON.doc}</span><div class="grow"><p style="font-weight:600">${esc(l.t)}</p><p class="tiny muted">${esc(l.by)}</p></div></a>`).join('')}</section>` : ''}`;
};

V.practice = () => {
  const f = S.f;
  const mods = Object.entries(DB.curriculum.modules).filter(([, m]) => f.block === 'all' || m.block === f.block);
  if (f.module !== 'all' && !mods.some(([id]) => id === f.module)) f.module = 'all';
  const n = pool(f).length;
  const chip = (k, v, label) => `<button class="chip" data-act="f" data-k="${k}" data-v="${v}" aria-pressed="${String(f[k]) === String(v)}">${label}</button>`;
  return `<header><p class="eyebrow">Question bank</p><h1>Practice</h1></header>
  <section class="card stack">
    <p class="eyebrow">KMU-pattern mock exam</p><p class="small muted">Questions drawn in the same subject proportions as the real paper, against the clock.</p>
    <div class="btns">${Object.keys(DB.curriculum.blocks).map((b) => `<button class="btn soft small" data-act="mock" data-b="${b}">Block ${b}</button>`).join('')}</div>
  </section>
  <div class="section-title"><h2>Build a session</h2></div>
  <section class="card stack">
    <div class="field"><span class="eyebrow">Block</span><div class="chips">${chip('block', 'all', 'All')}${Object.keys(DB.curriculum.blocks).map((b) => chip('block', b, 'Block ' + b)).join('')}</div></div>
    <div class="field"><span class="eyebrow">Module</span><div class="chips">${chip('module', 'all', 'All')}${mods.map(([id, m]) => chip('module', id, m.name)).join('')}</div></div>
    <div class="field"><span class="eyebrow">Subject</span><div class="chips">${chip('subject', 'all', 'All')}${SUBJ_ORDER.map((s) => chip('subject', s, subjName(s))).join('')}</div></div>
    <div class="field"><span class="eyebrow">Source</span><div class="chips">${chip('source', 'all', 'All')}${chip('source', 'kmu', 'KMU papers')}${chip('source', 'college', 'College papers')}</div></div>
  </section>
  <section class="card">
    <button class="switch" style="width:100%" data-act="tog" data-k="keyed" aria-pressed="${f.keyed}"><span><b>Only questions with an answer key</b><br><span class="small muted">Turn off to include unkeyed papers and mark them yourself</span></span><i></i></button>
    <button class="switch" style="width:100%" data-act="tog" data-k="unseen" aria-pressed="${f.unseen}"><span><b>Only questions I haven't seen</b></span><i></i></button>
  </section>
  <section class="card stack">
    <div class="field"><span class="eyebrow">How many</span><div class="chips">${[10, 20, 40, 120].map((c) => chip('count', c, c)).join('')}</div></div>
    <div class="field"><span class="eyebrow">Mode</span><div class="chips">${chip('mode', 'tutor', 'Tutor: answer shown after each')}${chip('mode', 'exam', 'Exam: timed, marked at the end')}</div></div>
  </section>
  <div class="sticky-cta"><div><button class="btn" data-act="start" ${n ? '' : 'disabled'}>${n ? `Start · ${Math.min(n, f.count)} of ${n.toLocaleString()} questions` : 'No questions match'}</button></div></div>
  <div style="height:60px"></div>`;
};

function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; }

V.session = () => {
  const s = S.session;
  if (!s) { location.hash = '#/practice'; return ''; }
  const q = QMAP.get(s.ids[s.i]);
  const pick = s.picks[q.id];
  const key = ansOf(q);
  const tutor = s.mode === 'tutor';
  const revealed = tutor && pick !== undefined && key >= 0;
  const needKey = tutor && pick !== undefined && key < 0;
  const last = s.i === s.ids.length - 1;
  const answered = Object.keys(s.picks).length;
  const m = q.m && DB.curriculum.modules[q.m];
  return `<div class="sess-top"><button class="iconbtn" data-act="quit" aria-label="End session">${ICON.x}</button><div class="bar"><i style="width:${pct(s.i + (pick !== undefined ? 1 : 0), s.ids.length)}%"></i></div>
    ${s.limit ? `<span class="pill num" id="timer">${ICON.clock.replace('<svg', '<svg style="width:13px;height:13px"')}<b></b></span>` : `<span class="small muted num">${s.i + 1}/${s.ids.length}</span>`}
    <button class="iconbtn" data-act="flag" data-id="${q.id}" aria-pressed="${!!S.flags[q.id]}" aria-label="Flag question">${ICON.flag}</button></div>
  <div class="qmeta">${m ? `<span class="pill"><i class="dot" style="--c:${color(q.sub)}"></i>${esc(m.name)}${q.sub ? ' · ' + subjName(q.sub) : ''}</span>` : ''}${srcLabel(q)}${q.src.filter((x) => x[0] === 'kmu').length > 1 ? '<span class="pill hot">Repeated in KMU</span>' : ''}</div>
  <p class="stem"><span class="muted num">${s.i + 1}. </span>${esc(q.s)}</p>
  <div class="opts">${q.o.map((o, i) => {
    let cls = '';
    if (revealed) cls = i === key ? 'right' : i === pick ? 'wrong' : '';
    else if (pick === i) cls = 'sel';
    return `<button class="opt ${cls}" data-act="pick" data-i="${i}" ${revealed || needKey ? 'disabled' : ''}><span class="l">${LETTERS[i]}</span><span class="grow">${esc(o)}</span></button>`;
  }).join('')}</div>
  ${revealed ? `<div class="explain"><b style="color:${pick === key ? 'var(--good)' : 'var(--bad)'}">${pick === key ? 'Correct' : `Not quite. The answer is ${LETTERS[key]}`}</b>${q.e ? esc(q.e) : `<span class="muted">${q.a < 0 ? 'Marked against the key you entered.' : q.ak ? 'Key suggested by AI; check it against your book.' : 'No explanation in the source for this one.'}</span>`}</div>` : ''}
  ${needKey ? `<div class="nokey stack"><p><b>This paper came without an answer key.</b></p><p class="small muted">Check your book or notes, then tap the correct option. It is saved for next time.</p><div class="chips">${q.o.map((_, i) => `<button class="chip" data-act="setkey" data-i="${i}">${LETTERS[i]}</button>`).join('')}<button class="chip" data-act="next">Skip</button></div></div>` : ''}
  <div class="sticky-cta low"><div class="btns">
    <button class="btn ghost" data-act="prev" ${s.i ? '' : 'disabled'}>Back</button>
    ${last ? `<button class="btn" data-act="finish">Finish${tutor ? '' : ` · ${answered}/${s.ids.length}`}</button>` : `<button class="btn" data-act="next">${tutor && pick === undefined ? 'Skip' : 'Next'}</button>`}
  </div></div>`;
};

function finishSession() {
  const s = S.session;
  if (!s || s.done) return;
  if (s.mode === 'exam') for (const id of s.ids) {
    const q = QMAP.get(id); const k = ansOf(q); const p = s.picks[id];
    if (p !== undefined && k >= 0) { s.graded[id] = p === k ? 1 : 0; record(q, p === k); }
  }
  s.done = Date.now();
  save();
  location.hash = '#/result';
}

V.result = () => {
  const s = S.session;
  if (!s) { location.hash = '#/practice'; return ''; }
  const ids = Object.keys(s.graded);
  const ok = ids.filter((id) => s.graded[id]).length;
  const by = {};
  for (const id of ids) { const q = QMAP.get(id); const k = q.sub || 'minor'; (by[k] ||= [0, 0])[1]++; if (s.graded[id]) by[k][0]++; }
  const wrong = ids.filter((id) => !s.graded[id]);
  const p = pct(ok, ids.length);
  const unmarked = s.ids.length - ids.length;
  return `<header><p class="eyebrow">${esc(s.title)}</p><h1>${!ids.length ? 'Session ended' : p >= 80 ? 'Excellent work' : p >= 60 ? 'Good progress' : 'Worth another pass'}</h1></header>
  <section class="card score">${ring(p, 104, 10, p >= 60 ? 'var(--good)' : 'var(--accent)')}<div><p><b class="num" style="font-size:1.3rem">${ok} / ${ids.length}</b> correct</p><p class="small muted">${fmtTime(((s.done || Date.now()) - s.start) / 1000)} min${unmarked ? ` · ${unmarked} not marked` : ''}</p></div></section>
  ${Object.keys(by).length ? `<section class="card">${SUBJ_ORDER.filter((k) => by[k]).map((k) => `<div class="brk"><span><b>${subjName(k)}</b></span><span class="small muted num">${by[k][0]}/${by[k][1]}</span>${bar(pct(by[k][0], by[k][1]), color(k))}</div>`).join('')}</section>` : ''}
  <div class="stack">${wrong.length ? `<button class="btn" data-act="retry">${ICON.repeat}Redo the ${wrong.length} I got wrong</button>` : ''}<a class="btn ghost" href="#/practice">New session</a><a class="btn ghost" href="#/home">Home</a></div>`;
};

V.review = () => {
  const m = mistakes(), d = dueIds(), f = flagged();
  const rowc = (act, icon, cls, title, sub, n) => `<button class="card tap row" data-act="${act}" ${n ? '' : 'disabled style="opacity:.55"'}><span class="quick"><span class="ico ${cls}" style="margin:0">${icon}</span></span><div class="grow"><h3>${title}</h3><p class="small muted">${sub}</p></div><b class="num">${n}</b>${ICON.chev}</button>`;
  return `<header><p class="eyebrow">Make it stick</p><h1>Review</h1></header>
  <p class="muted">Questions come back after 1, 2, 5, 10 and 21 days. A wrong answer sends one back to tomorrow.</p>
  <div class="stack">
    ${rowc('rev-due', ICON.clock, '', 'Due today', 'Spaced repetition', d.length)}
    ${rowc('rev-wrong', ICON.alert, 'a', 'My mistakes', 'Last answer was wrong', m.length)}
    ${rowc('rev-flag', ICON.flag, 'g', 'Flagged', 'Saved to look at again', f.length)}
  </div>
  ${!m.length && !d.length && !f.length ? `<div class="empty">${ICON.repeat}<p>Answer some questions and they will start appearing here.</p></div>` : ''}`;
};

V.more = () => {
  const row = (href, icon, cls, t, s) => `<a class="card tap row" href="${href}"><span class="quick"><span class="ico ${cls}" style="margin:0">${icon}</span></span><div class="grow"><h3>${t}</h3><p class="small muted">${s}</p></div>${ICON.chev}</a>`;
  return `<header><p class="eyebrow">Everything else</p><h1>More</h1></header><div class="stack">
  ${row('#/plan', ICON.cal, 'g', 'Study plan', 'A steady number of topics each day')}
  ${row('#/decks', ICON.cards, 'v', 'OSPE & recall decks', `${DB.resources.decks.reduce((a, d) => a + d.cards.length, 0)} flashcards`)}
  ${row('#/links', ICON.play, '', 'Lectures & online tests', `${DB.resources.lectures.length} videos · ${DB.resources.tests.length} tests`)}
  ${row('#/stats', ICON.chart, 'a', 'Statistics', 'Accuracy by subject and daily activity')}
  ${row('#/settings', ICON.gear, '', 'Settings', 'Exam date, daily goal, theme, backup')}</div>`;
};

V.plan = () => {
  const undone = topicsOf().filter((t) => !S.t[t.id]);
  const revise = topicsOf().filter((t) => S.t[t.id] === 1);
  const d = S.days[ymd()] || { t: 0 };
  const perDay = S.pace;
  const todays = d.t >= perDay ? [] : undone.slice(0, perDay - d.t);
  const trow = (t) => `<div class="topic"><button class="check" data-act="topic" data-id="${t.id}" data-s="${S.t[t.id] || 0}" aria-label="Mark ${esc(t.t)}">${ICON.check}</button><a class="grow" style="color:inherit;text-decoration:none" href="#/study/${t.mid}/${t.sid}"><p class="t">${esc(t.t)}</p><p class="small muted"><i class="dot" style="display:inline-block;--c:${color(t.sid)};width:8px;height:8px"></i> ${esc(DB.curriculum.modules[t.mid].name)} · ${subjName(t.sid)}</p></a></div>`;
  return `${back('#/more', 'More')}<header><p class="eyebrow">One day at a time</p><h1>Study plan</h1></header>
  <section class="kpis"><div class="card"><b>${undone.length}</b><span class="tiny muted">topics left</span></div><div class="card"><b>${perDay}</b><span class="tiny muted">per day</span></div><div class="card"><b>${Math.ceil(undone.length / perDay)}</b><span class="tiny muted">days to finish</span></div></section>
  <section class="card"><span class="lab">Topics per day</span><div class="chips">${[2, 4, 6, 8, 10].map((g) => `<button class="chip" data-act="set" data-k="pace" data-v="${g}" aria-pressed="${S.pace === g}">${g}</button>`).join('')}</div></section>
  <div class="section-title"><h2>Today</h2><span class="small muted num">${d.t}/${perDay} done</span></div>
  ${todays.length ? `<section class="card">${todays.map(trow).join('')}</section>` : `<div class="card empty">${ICON.check}<p>${undone.length ? "Today's topics are done. Do a mock or review your mistakes." : 'Every topic is covered. Revision time.'}</p></div>`}
  ${revise.length ? `<div class="section-title"><h2>Ready to revise</h2><span class="small muted">${revise.length} covered once</span></div><section class="card">${revise.slice(0, 6).map(trow).join('')}</section>` : ''}`;
};

V.decks = () => `${back('#/more', 'More')}<header><p class="eyebrow">Flashcards</p><h1>OSPE & recall</h1></header><div class="stack">${DB.resources.decks.map((d) => {
  const known = d.cards.filter((_, i) => S.cards[d.id + ':' + i]).length;
  return `<a class="card tap subj" style="--c:${color(d.sub)}" href="#/decks/${d.id}"><div class="row between"><div class="grow"><p class="eyebrow">${esc(d.kind)}</p><h3>${esc(d.name)}</h3><p class="small muted">${esc(d.note)}</p></div>${ICON.chev}</div><div class="row" style="margin-top:10px"><div class="grow">${bar(pct(known, d.cards.length), color(d.sub))}</div><span class="small muted num">${known}/${d.cards.length}</span></div></a>`;
}).join('')}</div>`;

let deckState = { id: null, order: [], i: 0, flip: false };
V.deck = ([id]) => {
  const d = DB.resources.decks.find((x) => x.id === id);
  if (!d) return V.decks();
  if (deckState.id !== id) {
    const todo = d.cards.map((_, i) => i).filter((i) => !S.cards[id + ':' + i]);
    deckState = { id, order: todo.length ? todo : d.cards.map((_, i) => i), i: 0, flip: false };
  }
  const st = deckState;
  if (st.i >= st.order.length) return `${back('#/decks', 'Decks')}<div class="card empty">${ICON.check}<h2>Deck complete</h2><p>You went through ${st.order.length} cards.</p></div><button class="btn" data-act="deck-reset" data-id="${id}">Start again with all cards</button>`;
  const c = d.cards[st.order[st.i]];
  return `${back('#/decks', 'Decks')}<div class="row between"><p class="eyebrow">${esc(d.name)}</p><span class="small muted num">${st.i + 1}/${st.order.length}</span></div>${bar(pct(st.i, st.order.length), color(d.sub))}
  <button class="card flash" style="width:100%" data-act="flip"><p class="eyebrow" style="margin-bottom:10px">${st.flip ? 'Points' : d.kind === 'OSPE' ? 'Identify' : 'Recall'}</p><h2>${esc(c.f)}</h2>${c.rep ? `<p style="margin-top:10px"><span class="pill hot">Repeated ${c.rep}×</span></p>` : ''}${st.flip ? `<ul>${c.b.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : `<p class="small muted" style="margin-top:18px">Say it out loud, then tap to check</p>`}</button>
  ${st.flip ? `<div class="btns"><button class="btn ghost" data-act="card" data-ok="0">Again</button><button class="btn" data-act="card" data-ok="1">Got it</button></div>` : `<button class="btn" data-act="flip">Show answer</button>`}`;
};

V.links = () => {
  const group = (items) => Object.entries(items.reduce((a, l) => ((a[l.m] ||= []).push(l), a), {}));
  const sect = (title, items, icon) => group(items).map(([mid, ls]) => `<div class="section-title"><h2>${title} · ${esc(DB.curriculum.modules[mid]?.name || 'General')}</h2><span class="small muted">${ls.length}</span></div><section class="card">${ls.map((l) => `<a class="linkrow" href="${esc(l.u)}" target="_blank" rel="noopener"><span class="ico">${icon}</span><div class="grow"><p style="font-weight:600">${esc(l.t)}</p><p class="tiny muted">${esc(l.by)}${l.sub ? ' · ' + subjName(l.sub) : ''}</p></div></a>`).join('')}</section>`).join('');
  return `${back('#/more', 'More')}<header><p class="eyebrow">Opens in a new tab · needs internet</p><h1>Lectures & tests</h1></header>${sect('Lectures', DB.resources.lectures, ICON.play)}${sect('Tests', DB.resources.tests, ICON.doc)}`;
};

V.stats = () => {
  const a = accuracy();
  const seen = Object.keys(S.q).filter((id) => QMAP.has(id)).length;
  const days = Array.from({ length: 14 }, (_, i) => { const d = addDays(i - 13); return { d, n: S.days[ymd(d)]?.q || 0 }; });
  const max = Math.max(1, ...days.map((x) => x.n));
  const rows = (keyFn, names, cols) => Object.keys(names).map((k) => ({ k, ...accuracy((q) => keyFn(q) === k) })).filter((r) => r.n).map((r) => `<div class="brk"><span><b>${esc(names[r.k])}</b></span><span class="small muted num">${r.p}% · ${r.n} answered</span>${bar(r.p, cols ? color(r.k) : '')}</div>`).join('');
  const bySub = rows((q) => q.sub, DB.curriculum.subjects, true);
  const byMod = rows((q) => q.m, Object.fromEntries(Object.entries(DB.curriculum.modules).map(([k, m]) => [k, m.name])), false);
  return `${back('#/more', 'More')}<header><h1>Statistics</h1></header>
  <section class="kpis"><div class="card"><b>${a.n}</b><span class="tiny muted">answered</span></div><div class="card"><b>${a.n ? a.p + '%' : '–'}</b><span class="tiny muted">accuracy</span></div><div class="card"><b>${pct(seen, DB.questions.length)}%</b><span class="tiny muted">of bank seen</span></div></section>
  <div class="section-title"><h2>Last 14 days</h2></div><section class="card"><div class="days">${days.map((x) => `<div title="${x.n} questions"><i style="height:${(x.n / max) * 100}%;${x.n ? '' : 'opacity:.25'}"></i><span>${x.d.getDate()}</span></div>`).join('')}</div></section>
  ${bySub ? `<div class="section-title"><h2>By subject</h2></div><section class="card">${bySub}</section><div class="section-title"><h2>By module</h2></div><section class="card">${byMod}</section>` : `<div class="empty">${ICON.chart}<p>Your accuracy by subject will show here after your first session.</p></div>`}`;
};

V.settings = () => `${back('#/more', 'More')}<header><h1>Settings</h1></header>
  <section class="card stack">
    <div><label class="lab" for="s-name">Your name (optional)</label><input class="input" id="s-name" data-set="name" value="${esc(S.name)}" autocomplete="given-name"></div>
    <div><span class="lab">Daily question goal</span><div class="chips">${[20, 40, 60, 100].map((g) => `<button class="chip" data-act="set" data-k="goal" data-v="${g}" aria-pressed="${S.goal === g}">${g}</button>`).join('')}</div></div>
    <div><span class="lab">Appearance</span><div class="chips">${['auto', 'light', 'dark'].map((t) => `<button class="chip" data-act="set" data-k="theme" data-v="${t}" aria-pressed="${S.theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
  </section>
  <div class="section-title"><h2>Backup</h2></div>
  <section class="card stack"><p class="small muted">Progress lives on this phone only. Export a backup file now and then, and before changing phones.</p>
    <div class="btns"><button class="btn ghost" data-act="export">Export</button><label class="btn ghost" style="cursor:pointer">Import<input type="file" accept="application/json" id="imp" hidden></label></div>
    <button class="btn ghost" style="color:var(--bad)" data-act="reset">Erase all progress</button></section>
  <section class="card stack"><p class="small muted">Lock the app on this device. The access code is needed to open it again.</p><button class="btn ghost" data-act="lock">Lock app</button></section>
  <p class="tiny muted" style="text-align:center">${DB.questions.length.toLocaleString()} questions · ${topicsOf().length} topics · data built ${esc(DB.built || '')}</p>`;

// ---------- router ----------
const TABS = [['home', 'Home', ICON.home], ['study', 'Study', ICON.book], ['practice', 'Practice', ICON.target], ['review', 'Review', ICON.repeat], ['more', 'More', ICON.grid]];
const TAB_OF = { module: 'study', subject: 'study', plan: 'more', decks: 'more', deck: 'more', links: 'more', stats: 'more', settings: 'more', result: 'practice' };
let timerInt;
function route() {
  const [pathPart, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const parts = pathPart.split('/').filter(Boolean);
  let name = parts[0] || 'home';
  let args = parts.slice(1);
  if (name === 'study' && args.length === 1) name = 'module';
  else if (name === 'study' && args.length >= 2) name = 'subject';
  else if (name === 'decks' && args.length) name = 'deck';
  if (!V[name]) name = 'home';
  if (name !== 'deck') deckState.id = null;
  return { name, args, qs: new URLSearchParams(query) };
}
function render(keepScroll = false) {
  const { name, args, qs } = route();
  const y = window.scrollY;
  const inSession = name === 'session';
  view.classList.toggle('bare', inSession);
  tabsEl.hidden = inSession;
  const active = TAB_OF[name] || name;
  tabsEl.innerHTML = `<div class="tabs-in">${TABS.map(([id, label, icon]) => `<a class="tab" href="#/${id}" ${active === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></a>`).join('')}</div>`;
  view.innerHTML = V[name](args, qs);
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  clearInterval(timerInt);
  if (inSession && S.session?.limit) {
    const tick = () => {
      const s = S.session; if (!s) return;
      const left = s.limit - (Date.now() - s.start) / 1000;
      const el = $('#timer b'); if (el) el.textContent = fmtTime(left);
      if (left <= 0) { clearInterval(timerInt); toast("Time's up"); finishSession(); }
    };
    tick(); timerInt = setInterval(tick, 1000);
  }
}
function applyTheme() {
  if (S.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', S.theme);
}

// ---------- actions ----------
const A = {
  quick() { startSession(shuffle(pool({ ...defaults.f })).slice(0, 10).map((q) => q.id), { title: 'Quick 10' }); },
  drill(el) {
    const f = { ...defaults.f, module: el.dataset.m, subject: el.dataset.s, keyed: false };
    const p = shuffle(pool(f)).sort((a, b) => (ansOf(b) >= 0) - (ansOf(a) >= 0) || !!S.q[a.id] - !!S.q[b.id]);
    startSession(p.slice(0, 20).map((q) => q.id), { title: `${DB.curriculum.modules[f.module].name} · ${subjName(f.subject)}` });
  },
  mock(el) {
    const ids = shuffle(mockIds(el.dataset.b));
    if (ids.length < 20) return toast('Not enough keyed questions for this block yet');
    startSession(ids, { mode: 'exam', title: `Block ${el.dataset.b} mock exam`, minutes: ids.length });
  },
  f(el) { const k = el.dataset.k; S.f[k] = k === 'count' ? Number(el.dataset.v) : el.dataset.v; save(); render(true); },
  tog(el) { S.f[el.dataset.k] = !S.f[el.dataset.k]; save(); render(true); },
  start() {
    const f = S.f; const ids = shuffle(pool(f)).slice(0, f.count).map((q) => q.id);
    startSession(ids, { mode: f.mode, title: f.mode === 'exam' ? 'Timed practice' : 'Practice', minutes: f.mode === 'exam' ? ids.length : 0 });
  },
  pick(el) {
    const s = S.session; const q = QMAP.get(s.ids[s.i]); const i = Number(el.dataset.i);
    s.picks[q.id] = i;
    if (s.mode === 'tutor') { const k = ansOf(q); if (k >= 0 && s.graded[q.id] === undefined) { s.graded[q.id] = i === k ? 1 : 0; record(q, i === k); } }
    save(); render(true);
  },
  setkey(el) {
    const s = S.session; const q = QMAP.get(s.ids[s.i]); const k = Number(el.dataset.i);
    S.keys[q.id] = k; const ok = s.picks[q.id] === k; s.graded[q.id] = ok ? 1 : 0; record(q, ok); render(true);
  },
  next() { const s = S.session; if (s.i < s.ids.length - 1) { s.i++; save(); render(); } },
  prev() { const s = S.session; if (s.i > 0) { s.i--; save(); render(); } },
  finish() { finishSession(); },
  quit() { if (confirm('End this session? Your answers so far are kept.')) finishSession(); },
  flag(el) { const id = el.dataset.id; if (S.flags[id]) delete S.flags[id]; else S.flags[id] = 1; save(); render(true); },
  retry() { const s = S.session; startSession(Object.keys(s.graded).filter((id) => !s.graded[id]), { title: 'Second attempt' }); },
  'rev-due'() { startSession(shuffle(dueIds()).slice(0, 40), { title: 'Due for review' }); },
  'rev-wrong'() { startSession(shuffle(mistakes()).slice(0, 40), { title: 'My mistakes' }); },
  'rev-flag'() { startSession(flagged().slice(0, 60), { title: 'Flagged questions' }); },
  topic(el) {
    const id = el.dataset.id; const cur = S.t[id] || 0; const nxt = (cur + 1) % 3;
    if (nxt) S.t[id] = nxt; else delete S.t[id];
    if (cur === 0) dayLog().t++;
    if (nxt === 0) { const d = dayLog(); d.t = Math.max(0, d.t - 1); }
    save(); render(true);
  },
  flip() { deckState.flip = !deckState.flip; render(true); },
  card(el) { const st = deckState; const key = st.id + ':' + st.order[st.i]; if (el.dataset.ok === '1') S.cards[key] = 1; else { delete S.cards[key]; st.order.push(st.order[st.i]); } st.i++; st.flip = false; save(); render(); },
  'deck-reset'(el) { for (const k of Object.keys(S.cards)) if (k.startsWith(el.dataset.id + ':')) delete S.cards[k]; deckState.id = null; save(); render(); },
  set(el) { const k = el.dataset.k; S[k] = k === 'goal' || k === 'pace' ? Number(el.dataset.v) : el.dataset.v; save(); applyTheme(); render(true); },
  export() {
    const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `nz-backup-${ymd()}.json` });
    a.click(); URL.revokeObjectURL(a.href); toast('Backup saved to your downloads');
  },
  lock() { localStorage.removeItem(CODE_KEY); location.hash = '#/home'; location.reload(); },
  reset() { if (confirm('Erase all progress, answers and settings on this device? This cannot be undone.')) { localStorage.removeItem(KEY); S = load(); applyTheme(); location.hash = '#/home'; render(); } },
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  e.preventDefault();
  A[el.dataset.act]?.(el);
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset?.set) { S[el.dataset.set] = el.value.trim(); save(); toast('Saved'); }
  if (el.id === 'imp' && el.files[0]) el.files[0].text().then((t) => {
    const data = JSON.parse(t);
    if (!data || typeof data !== 'object' || !('q' in data) || !('t' in data)) throw new Error('not a backup');
    S = { ...structuredClone(defaults), ...data }; save(); applyTheme(); render(); toast('Backup restored');
  }).catch(() => toast('That file is not an NZ backup'));
});

// ---------- access code + encrypted data ----------
// The study data ships as one AES-GCM bundle keyed by the access code, so the public site holds no
// readable questions. Layout: 16-byte salt | 12-byte iv | ciphertext of gzipped JSON.
const CODE_KEY = 'nmh.code';
const normCode = (c) => c.trim().toUpperCase().replace(/\s+/g, '');
async function openBundle(buf, code) {
  const bytes = new Uint8Array(buf);
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normCode(code)), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes.slice(0, 16), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(16, 28) }, key, bytes.slice(28));
  const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
function askCode(buf, wrong) {
  tabsEl.hidden = true;
  view.innerHTML = `<div class="gate"><img src="icons/icon.svg" alt="" width="72" height="72"><h1>NZ</h1><p class="muted">Enter your access code to open the app.</p>
    <form id="gate" class="stack"><input class="input" id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Access code" aria-label="Access code" required>
    ${wrong ? `<p class="small" style="color:var(--bad)">${wrong}</p>` : ''}<button class="btn">Unlock</button></form></div>`;
  $('#gate').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = $('#code').value;
    $('#gate .btn').textContent = 'Checking…';
    try {
      const data = await openBundle(buf, code);
      localStorage.setItem(CODE_KEY, normCode(code));
      start(data);
    } catch {
      askCode(buf, 'That code did not work. Check it and try again.');
    }
  });
  $('#code').focus();
}
function start(data) {
  DB = { ...data, built: data.curriculum.built };
  for (const q of data.questions) QMAP.set(q.id, q);
  if (S.session && !S.session.ids.every((id) => QMAP.has(id))) S.session = null;
  tabsEl.hidden = false;
  render();
}

// ---------- boot ----------
async function boot() {
  applyTheme();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  let buf;
  try {
    const r = await fetch('data/bundle.enc');
    if (!r.ok) throw new Error('bundle');
    buf = await r.arrayBuffer();
  } catch {
    view.innerHTML = `<div class="empty">${ICON.alert}<h2>Could not load the study data</h2><p>Check your connection and reopen the app. Once it has loaded once, it works offline.</p><button class="btn" style="margin-top:16px" onclick="location.reload()">Try again</button></div>`;
    return;
  }
  const saved = localStorage.getItem(CODE_KEY);
  if (!saved) return askCode(buf);
  // a saved code that no longer opens the bundle means the code was changed
  try {
    start(await openBundle(buf, saved));
  } catch {
    localStorage.removeItem(CODE_KEY);
    askCode(buf, 'The access code has changed. Enter the new one.');
  }
}
window.addEventListener('hashchange', () => { if (DB) render(); });
boot();
