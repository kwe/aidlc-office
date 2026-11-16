// Build-time checks: every built game script must parse, and the engine must not contain any scenario's story.
import fs from 'node:fs';
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['v3.html', 'v4.html'].filter(f => fs.existsSync(f));
const scripts = h => [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const file of files) {
  // the game script is the last one; a shell may put its own scripts before it, and those must parse too
  const all = scripts(fs.readFileSync(file, 'utf8'));
  all.forEach((src, i) => {
    try { new Function(src); }
    catch (e) { console.error(`${file}: SYNTAX ERROR in script ${i + 1} of ${all.length}: ${e.message}`); process.exit(1); }
  });
  console.log(`${file}: ${all.length} script${all.length > 1 ? 's' : ''} parse (game script ${all[all.length - 1].length} chars)`);
}

// Story belongs in src/scenarios/*.js. If one of these words shows up in the engine, some scenario's text
// would appear while a different scenario is being played.
const STORY = /ID-VEL|\blenders?\b|fingerprint|quarter.end|\/assess\b|Kestrel|credit union/i;
const leaks = fs.readFileSync('src/engine.js', 'utf8').split('\n')
  .map((l, i) => [i + 1, l]).filter(([, l]) => STORY.test(l));
if (leaks.length) {
  console.error('src/engine.js: scenario wording in the engine (move it into src/scenarios/):');
  for (const [n, l] of leaks) console.error(`  line ${n}: ${l.trim().slice(0, 140)}`);
  process.exit(1);
}
const n = fs.readdirSync('src/scenarios').filter(f => f.endsWith('.js')).length;
console.log(`src/engine.js: free of scenario wording (${n} scenarios in src/scenarios/)`);
