// Builds the two single-file games from one engine and one set of scenarios:
//   v3.html = src/game.html     the office edition: bundled three.js office + embedded GLB
//   v4.html = src/desktop.html  the retro desktop edition: no 3D, so it is a fraction of the size
// Usage: node build.mjs          (run `npm run assets` first if blender/build_assets.py changed)
import { build } from 'esbuild';
import fs from 'node:fs';

const safe = s => s.replace(/<\/script/gi, '<\\/script');
// Scenarios are plain script fragments that register themselves on SCENARIOS; the game lists them in SCEN_ORDER.
const scenarios = fs.readdirSync('src/scenarios').filter(f => f.endsWith('.js')).sort()
  .map(f => safe(fs.readFileSync('src/scenarios/' + f, 'utf8'))).join('\n');
const engine = safe(fs.readFileSync('src/engine.js', 'utf8'));

function assemble(shell, out, parts) {
  let html = fs.readFileSync(shell, 'utf8');
  // the engine goes in first: it carries the scenarios token
  for (const [token, value] of [['/*__ENGINE__*/', engine], ['/*__SCENARIOS__*/', scenarios], ...parts]) {
    if (!html.includes(token)) throw new Error(`${shell}: missing token ${token}`);
    html = html.replace(token, () => value);
  }
  fs.writeFileSync(out, html);
  return html.length;
}

const office = await build({
  entryPoints: ['src/office/index.js'],
  bundle: true, format: 'iife', minify: !process.argv.includes('--dev'),
  target: 'es2020', write: false, legalComments: 'inline',   // keep three.js's MIT notice in the bundle
});
const js = safe(office.outputFiles[0].text);
const glb = fs.readFileSync('blender/out/office.glb').toString('base64');

const v3 = assemble('src/game.html', 'v3.html', [['/*__OFFICE_JS__*/', js], ['__OFFICE_GLB__', glb]]);
console.log(`v3.html ${(v3 / 1e6).toFixed(2)} MB  (office js ${(js.length / 1e3).toFixed(0)} kB, glb ${(glb.length / 1e6).toFixed(2)} MB base64)`);
if (fs.existsSync('src/desktop.html')) {
  // the desktop edition carries its interface font inside the file (fonts/sysfont, SIL Open Font License)
  const sysfont = fs.readFileSync('fonts/sysfont/sysfont.woff2').toString('base64');
  // ...and the same 3D office, which it shows only for the incident
  const v4 = assemble('src/desktop.html', 'v4.html', [['__SYSFONT__', sysfont], ['/*__OFFICE_JS__*/', js], ['__OFFICE_GLB__', glb]]);
  console.log(`v4.html ${(v4 / 1e6).toFixed(2)} MB  (retro desktop; the 3D office appears for the incident)`);
}
