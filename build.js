/**
 * Cursorly build
 * ------------------------------------------------------------
 *   dist/cursorly.js        IIFE, window.Cursorly (+ data-attribute auto-init)
 *   dist/cursorly.min.js    minified IIFE
 *   dist/cursorly.esm.js    ES module
 *   dist/cursorly.css       styles (+ .min.css) — also inlined into the JS builds
 *   demo/demo.css           demo page styles
 *
 * Usage:
 *   npm run build        (inside this package)
 *   npm run dev          (watch mode)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import * as sass from 'sass';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(DIR, 'package.json'), 'utf8'));
const banner = `/*! Cursorly v${pkg.version} | MIT License | https://github.com/JuwelKhan/cursorly */`;
const watch = process.argv.includes('--watch');
const r = (...parts) => path.join(DIR, ...parts);

const cssBuilds = [
  { entry: r('scss/cursorly.scss'), out: r('dist/cursorly.css'), min: r('dist/cursorly.min.css') },
  { entry: r('demo/scss/demo.scss'), out: r('demo/demo.css') },
];

function buildCss() {
  for (const { entry, out, min } of cssBuilds) {
    if (!fs.existsSync(entry)) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${banner}\n${sass.compile(entry, { style: 'expanded' }).css}\n`);
    if (min) fs.writeFileSync(min, banner + sass.compile(entry, { style: 'compressed' }).css);
  }
}

function jsBuilds() {
  const common = {
    absWorkingDir: DIR, // same output whether built from this folder or the repo root
    bundle: true,
    target: 'es2022',
    banner: { js: banner },
    define: {
      __CURSORLY_VERSION__: JSON.stringify(pkg.version),
      // The core stylesheet ships inside the JS so a single <script> tag is enough.
      __CURSORLY_CSS__: JSON.stringify(sass.compile(r('scss/cursorly.scss'), { style: 'compressed' }).css),
    },
    logLevel: 'silent',
  };
  return [
    {
      ...common,
      entryPoints: [r('src/browser.js')],
      format: 'iife',
      globalName: 'Cursorly',
      footer: { js: 'Cursorly = Cursorly.default;' },
      outfile: r('dist/cursorly.js'),
    },
    {
      ...common,
      entryPoints: [r('src/browser.js')],
      format: 'iife',
      globalName: 'Cursorly',
      footer: { js: 'Cursorly=Cursorly.default;' },
      minify: true,
      outfile: r('dist/cursorly.min.js'),
    },
    { ...common, entryPoints: [r('src/index.js')], format: 'esm', outfile: r('dist/cursorly.esm.js') },
  ];
}

async function buildAll() {
  const started = Date.now();
  try {
    buildCss();
    await Promise.all(jsBuilds().map((options) => esbuild.build(options)));
    console.log(`✔ cursorly built in ${Date.now() - started}ms`);
    return true;
  } catch (error) {
    console.error(`✖ cursorly build failed:\n${error.message}`);
    return false;
  }
}

const ok = await buildAll();

if (!watch) process.exit(ok ? 0 : 1);

let timer;
for (const folder of ['src', 'scss', 'demo/scss']) {
  if (!fs.existsSync(r(folder))) continue;
  fs.watch(r(folder), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(buildAll, 100);
  });
}
console.log('👀 Watching libraries/cursorly (src, scss, demo/scss)');
