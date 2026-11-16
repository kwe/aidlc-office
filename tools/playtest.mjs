// Checks every scenario's data, then plays each scenario under each scope it offers, to the debrief, with the autoplay harness.
// Usage: npm run playtest                 (every scenario x its scopes x three play styles, office edition)
//        npm run playtest:retro           (the same, against the retro desktop edition; or --file=<built game>)
//        npm run playtest -- bug infra    (only these scenarios; scope names filter too: npm run playtest -- bug express)
//        npm run playtest -- --all-seats  (also play the worst answers from every one of the five seats)
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILE = (process.argv.find(a => a.startsWith('--file=')) || '--file=v3.html').slice(7);
const GAME = pathToFileURL(path.resolve(FILE)).href;
const ROLES = ['po', 'eng', 'pm', 'ops', 'sec'];
const MODES = ['1', 'fix', 'bad'];
const allSeats = process.argv.includes('--all-seats');
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--window-size=1280,800', '--use-angle=metal', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  defaultViewport: { width: 1280, height: 800 },
});

// ---- 1. static checks on the scenario data, run inside the page where the data lives
const lintPage = await browser.newPage();
await lintPage.goto(GAME, { waitUntil: 'load' });
const { scopesOf, bestOf, problems } = await lintPage.evaluate(() => {
  const problems = [], scopesOf = {}, bestOf = {};
  const bad = (k, m) => problems.push(`${k}: ${m}`);
  for (const k of SCEN_ORDER) {
    const sc = SCENARIOS[k]; scopesOf[k] = sc.scopes; bestOf[k] = sc.best;
    for (const f of ['n', 'kind', 'tag', 'd', 'ask', 'intent', 'REC', 'KB', 'boot', 'composer', 'DEC', 'stages', 'units', 'deploy', 'incident', 'debrief', 'fit', 'best']) if (sc[f] === undefined) bad(k, `missing field ${f}`);
    if (!sc.scopes.includes(sc.best)) bad(k, `best scope ${sc.best} is not offered`);
    for (const p of sc.scopes) {
      if (!PROFILES[p]) { bad(k, `unknown scope ${p}`); continue; }
      if (!sc.fit[p] || !FIT[sc.fit[p].v] || !sc.fit[p].t) bad(k, `no fit verdict for ${p}`);
      for (const id of PROFILES[p].st) if (!sc.stages[id]) bad(k, `scope ${p} runs stage ${id}, which has no content`);
    }
    if (sc.scopes.filter(p => sc.fit[p] && sc.fit[p].v === 'best').length !== 1 || sc.fit[sc.best].v !== 'best') bad(k, 'exactly one scope must be the best fit, and it must be `best`');
    if (sc.addStage && (!sc.stages[sc.addStage.at] || !sc.stages[sc.addStage.add])) bad(k, 'addStage points at a stage with no content');
    if (sc.midBuild && !sc.DEC[sc.midBuild.dec]) bad(k, `midBuild decision ${sc.midBuild.dec} does not exist`);
    const used = new Set();
    for (const [id, c] of Object.entries(sc.stages)) {
      const up = UPSTREAM[id]; if (!up) { bad(k, `stage ${id} is not an AI-DLC stage`); continue; }
      if (!Array.isArray(c.files)) bad(k, `stage ${id} has no files`);
      for (const d of c.dec || []) { used.add(d); if (!sc.DEC[d]) bad(k, `stage ${id} asks ${d}, which does not exist`); else if (!d.startsWith(id + '.')) bad(k, `decision ${d} is asked in stage ${id}`); }
      for (const l of [...(c.pre || []), ...(c.preSolo || []), ...(c.post || [])]) if (!AGENTS[l[0]] && !['SYS', 'CND'].includes(l[0]) && !(l[0][0] === '@' && PEOPLE[l[0].slice(1)])) bad(k, `stage ${id}: unknown speaker ${l[0]}`);
      for (const f of c.files || []) if (!f.p.startsWith('aidlc/')) bad(k, `stage ${id}: artifact path ${f.p} is outside aidlc/`);
    }
    if (sc.midBuild) used.add(sc.midBuild.dec);
    for (const [d, q] of Object.entries(sc.DEC)) {
      if (!used.has(d)) bad(k, `decision ${d} is never asked`);
      if (!PEOPLE[q.own]) bad(k, `decision ${d}: unknown owner ${q.own}`);
      if (!AGENTS[q.by]) bad(k, `decision ${d}: unknown agent ${q.by}`);
      if (!q.o || q.o.length < 2) bad(k, `decision ${d}: needs at least two options`);
      else if (q.o[0].s < Math.max(...q.o.map(o => o.s))) bad(k, `decision ${d}: option 0 must be the best`);
      for (const o of q.o || []) if (!o.t || !o.fb || typeof o.s !== 'number') bad(k, `decision ${d}: an option lacks text, feedback or score`);
    }
    for (const id of ['4.1', '4.3']) if (sc.stages[id]) { const d = id === '4.1' ? '4.1.strategy' : '4.3.window'; if (!sc.DEC[d]) bad(k, `stage ${id} needs the ${d} decision (the deploy animation reads it)`); }
  }
  return { scopesOf, bestOf, problems };
});
await lintPage.close();
if (problems.length) { console.log('Scenario data problems:\n  ' + problems.join('\n  ')); await browser.close(); process.exit(1); }
console.log(`scenario data ok: ${Object.entries(scopesOf).map(([k, v]) => `${k} (${v.length} scopes)`).join(', ')}`);

// ---- 2. play every scenario under every scope it offers
let failed = 0, n = 0, i = 0;
const runs = [];
for (const [scen, scopes] of Object.entries(scopesOf)) for (const prof of scopes) {
  const picked = !only.length || ((only.includes(scen) || !only.some(o => scopesOf[o])) && (only.includes(prof) || !only.some(o => !scopesOf[o])));
  if (picked) {
    const seen = new Set();
    const add = (auto, role) => { if (!seen.has(auto + role)) { seen.add(auto + role); runs.push({ scen, prof, auto, role }); } };
    MODES.forEach((auto, j) => add(auto, ROLES[(i + j * 2) % ROLES.length]));
    if (allSeats) ROLES.forEach(role => add('bad', role));
    // Network Velocity only: best answers apart from a hot-partition store, which reaches the backward jump and parks once
    if (scen === 'velocity' && ['feature', 'enterprise'].includes(prof)) add('hot', 'eng');
  }
  i++;
}
async function run({ scen, prof, auto, role }) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
  const tag = `${scen.padEnd(9)} ${prof.padEnd(15)} auto=${auto.padEnd(3)} ${role.padEnd(3)}`;
  try {
    await page.evaluateOnNewDocument(() => { window.__pkLog = new Set(); });
    await page.goto(`${GAME}?auto=${auto}&scen=${scen}&role=${role}&prof=${prof}&speed=120&rate=30`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__done || !!window.__err, { timeout: 150000, polling: 200 });
    const r = await page.evaluate(() => {
      const broken = [];   // every artifact must still render at the end of the run
      for (const f of Object.values(S.files)) { try { if (f.b && typeof f.b() !== 'string') broken.push(f.p); } catch (e) { broken.push(f.p + ': ' + e.message); } }
      return { d: window.__done, err: window.__err ? String(window.__err.stack || window.__err) : '', broken, undef: [...window.__pkLog], blocked: window.__blocked || [] };
    });
    const notes = [];
    if (r.broken.length) notes.push('artifacts that fail to render: ' + r.broken.join(', '));
    // Network Velocity predates pkd(); in the newer scenarios an artifact must not quietly show the best answer for a decision nobody made
    if (scen !== 'velocity' && r.undef.length) notes.push('artifacts read decisions that were never made, without saying so: ' + r.undef.join(', '));
    // best answers on the best-fit scope must be winnable: if this breaches, an incident wave has no fix
    if (auto === '1' && prof === bestOf[scen] && r.d && r.d.boss && !r.d.boss.won) notes.push('best answers on the best-fit scope did not hold the incident');
    // every teammate-gated stage must hold for the player (the harness presses Continue); zero would mean the pause never ran
    if (r.d && (r.d.pauses < r.d.teamGates || (r.d.teamGates > 0 && !r.d.pauses))) notes.push(`paused after ${r.d.pauses} of ${r.d.teamGates} teammate-gated stages`);
    // a prompt the player could not have clicked where it sat: covered by something, scrolled out of view or off screen
    if (r.blocked.length) notes.push(`${r.blocked.length} prompt(s) were not clickable on screen: ${[...new Set(r.blocked)].slice(0, 4).join(' | ')}`);
    const ok = r.d && !r.err && !errors.length && !notes.length && r.d.missing.length === 0 && r.d.prof === prof && r.d.scen === scen;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${tag} stages ${r.d ? r.d.stages + '/' + r.d.plan : '?'}  score ${r.d ? r.d.score : '?'}  incident ${r.d && r.d.boss ? (r.d.boss.won ? 'held' : r.d.boss.rolledBack ? 'rolled back' : 'breached') + ' (' + r.d.boss.cause + ')' : '?'}  jumps ${r.d ? r.d.loops : '?'}  pauses ${r.d ? r.d.pauses + '/' + r.d.teamGates : '?'}${[r.err, ...errors, ...notes].filter(Boolean).map(x => '\n     ' + x).join('')}`);
  } catch (e) {
    failed++;
    const where = await page.evaluate(() => `stuck at ${S.cur} (stage ${S.idx + 1}/${S.plan ? S.plan.length : '?'})`).catch(() => '');
    console.log(`FAIL ${tag} ${e.message.split('\n')[0]} ${where}${errors.length ? '\n     ' + errors.join('\n     ') : ''}`);
  }
  await page.close(); n++;
}
// a few pages at a time keeps the run short without starving timers
for (let k = 0; k < runs.length; k += 3) await Promise.all(runs.slice(k, k + 3).map(run));
await browser.close();
console.log(`${FILE}: ${n - failed}/${n} runs reached the debrief cleanly`);
process.exit(failed ? 1 : 0);
