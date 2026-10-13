// Dump unkeyed questions in compact form for keying: node dump.mjs <kind|all> <offset> <count>
import fs from 'fs';
const [kind, off, cnt] = process.argv.slice(2);
const keys = fs.existsSync('../data/keys.json') ? JSON.parse(fs.readFileSync('../data/keys.json', 'utf8')) : {};
const qs = JSON.parse(fs.readFileSync('../data/questions.raw.json', 'utf8')).filter((q) => q.a < 0 && !keys[q.id] && (kind === 'all' || q.src.some((s) => s[0] === kind)));
console.log(`# ${qs.length} unkeyed (${kind}); showing ${off}..${Number(off) + Number(cnt)}`);
for (const q of qs.slice(Number(off), Number(off) + Number(cnt))) console.log(`${q.id} ${q.s}\n${q.o.map((o, i) => 'ABCDE'[i] + ') ' + o).join(' | ')}`);
