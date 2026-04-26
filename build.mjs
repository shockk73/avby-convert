import esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');
const watch = process.argv.includes('--watch');

const TARGETS = ['chrome', 'firefox'];

const ENTRY_POINTS = [
  { in: 'src/engine/index.ts',         out: 'content' },
  { in: 'src/background/index.ts',     out: 'background' },
  { in: 'src/ui/popup/popup.ts',       out: 'popup/popup' },
  { in: 'src/ui/options/options.ts',   out: 'options/options' },
];

async function buildTarget(target) {
  const outdir = path.join(__dirname, 'dist', target);
  await fs.rm(outdir, { recursive: true, force: true });
  await fs.mkdir(outdir, { recursive: true });

  // Known limitation: src/manifest/*.json declares background as
  //   { "type": "module" } (Chrome MV3 requires this for ES module workers),
  // but esbuild emits IIFE bundles here. This works today because the IIFE
  // wrapper esbuild generates is itself valid ES module syntax (a top-level
  // expression statement, no import/export), so Chrome accepts it as a module.
  // If we ever need real ES module features in any entry point (top-level
  // import, export, import.meta beyond what esbuild inlines), switch this to
  //   format: 'esm'
  // and audit the manifest entries that don't declare type: "module".
  const ctx = await esbuild.context({
    entryPoints: ENTRY_POINTS,
    bundle: true,
    minify: !dev,
    sourcemap: dev,
    target: 'es2022',
    outdir,
    format: 'iife',
    logLevel: 'info',
  });

  if (watch) {
    await ctx.watch();
    console.log(`[${target}] watching...`);
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }

  // Copy manifest
  await fs.copyFile(`src/manifest/${target}.json`, path.join(outdir, 'manifest.json'));

  // Copy popup HTML/CSS
  await fs.mkdir(path.join(outdir, 'popup'), { recursive: true });
  await fs.copyFile('src/ui/popup/popup.html', path.join(outdir, 'popup/popup.html'));
  await fs.copyFile('src/ui/popup/popup.css',  path.join(outdir, 'popup/popup.css'));

  // Copy options HTML/CSS
  await fs.mkdir(path.join(outdir, 'options'), { recursive: true });
  await fs.copyFile('src/ui/options/options.html', path.join(outdir, 'options/options.html'));
  await fs.copyFile('src/ui/options/options.css',  path.join(outdir, 'options/options.css'));

  // Copy engine styles (referenced by content_scripts.css in manifest)
  await fs.copyFile('src/engine/styles.css', path.join(outdir, 'styles.css'));

  // Copy icons
  await fs.mkdir(path.join(outdir, 'icons'), { recursive: true });
  for (const size of [16, 48, 128]) {
    await fs.copyFile(`src/icons/icon-${size}.png`, path.join(outdir, `icons/icon-${size}.png`));
  }

  console.log(`[${target}] built -> ${outdir}`);
}

await Promise.all(TARGETS.map(buildTarget));
if (!watch) console.log('build complete');
