// Parses the game's inline script so a syntax error is caught at build time, not in the browser.
import fs from 'node:fs';
const file = process.argv[2] || 'v3.html';
const h = fs.readFileSync(file, 'utf8');
const scripts = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = scripts[scripts.length - 1];
try { new Function(main); console.log(`${file}: game script parses (${main.length} chars)`); }
catch (e) { console.error(`${file}: SYNTAX ERROR in game script: ${e.message}`); process.exit(1); }
