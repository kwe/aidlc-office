// Plays every scope to the debrief with the autoplay harness and reports page errors.
// Usage: npm run playtest               (all 11 scopes, three play styles)
//        npm run playtest -- poc mvp    (only these scopes)
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const GAME = pathToFileURL(path.resolve('v3.html')).href;
const SCOPES = ['feature', 'enterprise', 'workshop', 'mvp', 'classic', 'infra', 'express', 'refactor', 'security-patch', 'bugfix', 'poc'];
const ROLES = ['po', 'eng', 'pm', 'ops', 'sec'];
const MODES = ['1', 'fix', 'bad'];
const only = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--window-size=1280,800', '--use-angle=metal', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  defaultViewport: { width: 1280, height: 800 },
});
let failed = 0, n = 0;
const runs = [];
SCOPES.forEach((prof, i) => { if (only.length && !only.includes(prof)) return; MODES.forEach((auto, j) => runs.push({ prof, auto, role: ROLES[(i + j * 2) % ROLES.length] })); });
async function run({ prof, auto, role }) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
  const tag = `${prof.padEnd(15)} auto=${auto.padEnd(3)} ${role.padEnd(3)}`;
  try {
    await page.goto(`${GAME}?auto=${auto}&role=${role}&prof=${prof}&speed=120&rate=30`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__done || !!window.__err, { timeout: 150000, polling: 200 });
    const r = await page.evaluate(() => ({ d: window.__done, err: window.__err ? String(window.__err.stack || window.__err) : '', plan: S.plan.length, prof: S.prof }));
    const ok = r.d && !r.err && !errors.length && r.d.missing.length === 0 && r.prof === prof;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${tag} stages ${r.d ? r.d.stages + '/' + r.d.plan : '?'}  score ${r.d ? r.d.score : '?'}  incident ${r.d && r.d.boss ? (r.d.boss.won ? 'held' : r.d.boss.rolledBack ? 'rolled back' : 'breached') + ' (' + r.d.boss.cause + ')' : '?'}  jumps ${r.d ? r.d.loops : '?'}${r.err ? '\n     ' + r.err : ''}${errors.length ? '\n     ' + errors.join('\n     ') : ''}`);
  } catch (e) {
    failed++;
    const where = await page.evaluate(() => `stuck at ${S.cur} (stage ${S.idx + 1}/${S.plan ? S.plan.length : '?'})`).catch(() => '');
    console.log(`FAIL ${tag} ${e.message.split('\n')[0]} ${where}${errors.length ? '\n     ' + errors.join('\n     ') : ''}`);
  }
  await page.close(); n++;
}
// a few pages at a time keeps the run short without starving timers
for (let i = 0; i < runs.length; i += 3) await Promise.all(runs.slice(i, i + 3).map(run));
await browser.close();
console.log(`${n - failed}/${n} runs reached the debrief cleanly`);
process.exit(failed ? 1 : 0);
