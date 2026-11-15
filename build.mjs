// Builds the single-file game: v3.html = src/game.html + bundled three.js office + embedded GLB.
// Usage: node build.mjs          (run `npm run assets` first if blender/build_assets.py changed)
import { build } from 'esbuild';
import fs from 'node:fs';

const out = await build({
  entryPoints: ['src/office/index.js'],
  bundle: true, format: 'iife', minify: !process.argv.includes('--dev'),
  target: 'es2020', write: false, legalComments: 'inline',   // keep three.js's MIT notice in the bundle
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const glb = fs.readFileSync('blender/out/office.glb').toString('base64');
let html = fs.readFileSync('src/game.html', 'utf8');
for (const [token, value] of [['/*__OFFICE_JS__*/', js], ['__OFFICE_GLB__', glb]]) {
  if (!html.includes(token)) throw new Error('missing token ' + token);
  html = html.replace(token, () => value);
}
fs.writeFileSync('v3.html', html);
console.log(`v3.html ${(html.length / 1e6).toFixed(2)} MB  (office js ${(js.length / 1e3).toFixed(0)} kB, glb ${(glb.length / 1e6).toFixed(2)} MB base64)`);
