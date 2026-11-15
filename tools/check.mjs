// Build-time checks: the built game script must parse, and the engine must not contain any scenario's story.
import fs from 'node:fs';
const file = process.argv[2] || 'v3.html';
const lastScript = h => { const s = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]); return s[s.length - 1]; };
const main = lastScript(fs.readFileSync(file, 'utf8'));
try { new Function(main); console.log(`${file}: game script parses (${main.length} chars)`); }
catch (e) { console.error(`${file}: SYNTAX ERROR in game script: ${e.message}`); process.exit(1); }

// Story belongs in src/scenarios/*.js. If one of these words shows up in the engine, some scenario's text
// would appear while a different scenario is being played.
const STORY = /ID-VEL|\blenders?\b|fingerprint|quarter.end|\/assess\b|Kestrel|credit union/i;
const leaks = lastScript(fs.readFileSync('src/game.html', 'utf8')).split('\n')
  .map((l, i) => [i + 1, l]).filter(([, l]) => STORY.test(l));
if (leaks.length) {
  console.error('src/game.html: scenario wording in the engine script (move it into src/scenarios/):');
  for (const [n, l] of leaks) console.error(`  script line ${n}: ${l.trim().slice(0, 140)}`);
  process.exit(1);
}
const n = fs.readdirSync('src/scenarios').filter(f => f.endsWith('.js')).length;
console.log(`src/game.html: engine script is free of scenario wording (${n} scenarios in src/scenarios/)`);
