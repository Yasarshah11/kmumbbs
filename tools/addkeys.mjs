// Merge "id:K" pairs (stdin, whitespace separated) into data/keys.json. K is A-E, X to drop a damaged question, or ? for "reviewed, too ambiguous to key".
import fs from 'fs';
const file = '../data/keys.json';
const keys = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
let n = 0;
for (const pair of fs.readFileSync(0, 'utf8').split(/\s+/).filter(Boolean)) {
  const [id, k] = pair.split(':');
  if (!/^[0-9a-f]{9}$/.test(id) || !/^[A-EX?]$/.test(k)) { console.log('bad pair', pair); continue; }
  keys[id] = k; n++;
}
fs.writeFileSync(file, JSON.stringify(keys, null, 0));
console.log(`added ${n}; total ${Object.keys(keys).length}`);
