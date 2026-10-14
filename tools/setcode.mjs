// Change the app's access code, rebuild the encrypted data, and (with --push) publish it.
// usage: node setcode.mjs <NEW-CODE> [--push]
// Everyone using the old code is asked for the new one the next time the app updates on their phone.
import fs from 'fs';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const code = (args.find((a) => !a.startsWith('--')) || '').trim().toUpperCase().replace(/\s+/g, '');
if (code.length < 4) { console.error('Give a code of at least 4 characters, e.g. node setcode.mjs KMU-HEAL-2027 --push'); process.exit(1); }
fs.writeFileSync('../data/access-code.txt', code + '\n');
execSync('node build.mjs', { stdio: 'inherit' });
console.log(`\nAccess code is now: ${code}`);
if (args.includes('--push')) {
  execSync('git add -A app && git commit -m "Update access code and data" && git push', { cwd: '..', stdio: 'inherit' });
  console.log('Published. Phones pick up the change the next time the app is opened online.');
} else console.log('Not published yet. Run again with --push, or commit and push the app folder.');
