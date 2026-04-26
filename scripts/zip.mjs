import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

for (const target of ['chrome', 'firefox']) {
  const distDir = path.join(root, 'dist', target);
  if (!fs.existsSync(distDir)) {
    console.error(`no dist/${target} - run "npm run build" first`);
    process.exit(1);
  }
  const outZip = path.join(root, `avby-convert-${target}.zip`);
  if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

  if (process.platform === 'win32') {
    // Build the command as a single inline string. Single-quote the paths so
    // backslashes don't need escaping; double any embedded single quotes.
    const q = (s) => `'${s.replace(/'/g, "''")}'`;
    const psCmd = `Compress-Archive -Path ${q(distDir + '\\*')} -DestinationPath ${q(outZip)} -Force`;
    execFileSync('powershell', ['-NoProfile', '-Command', psCmd], { stdio: 'inherit' });
  } else {
    execFileSync('zip', ['-r', outZip, '.'], { cwd: distDir, stdio: 'inherit' });
  }
  console.log(`packaged -> ${outZip}`);
}
