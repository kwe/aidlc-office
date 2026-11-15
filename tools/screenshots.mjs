// Captures the README screenshots from v3.html with a locally installed Chrome.
// Usage: npm run screenshots            (writes docs/screenshots/*.jpg)
//        CHROME=/path/to/chrome npm run screenshots
// It opens v3.html straight from disk (file://), plays it with the autoplay harness, freezes on a moment and shoots.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = 'docs/screenshots';
const GAME = pathToFileURL(path.resolve('v3.html')).href;
const only = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Each shot: query string, a condition (evaluated inside the page) to freeze on, optional page-side setup, settle time.
const SHOTS = [
  { name: 'title', query: '', wait: 6000 },
  { name: 'tour', query: '?tour=1&tourstep=2', wait: 4200 },
  { name: 'scenarios', query: '', wait: 1200,
    start: () => { document.querySelector('#title').classList.remove('attract'); NET.layout(); pickTitle('scen', 'secpatch'); document.querySelector('#h-scen').scrollIntoView({ block: 'start' }); document.querySelector('#title').scrollTop -= 14; } },
  { name: 'predict', query: '', wait: 3500,
    start: () => { PREFS.sound = false; document.querySelector('#title').classList.remove('attract'); startMission('po', 'feature', true); },
    until: () => S.cur === '1.1' && !!ACTIVE && !!ACTIVE.opts },
  { name: 'stage', query: '?auto=1&role=sec&prof=enterprise&speed=60', wait: 3200,
    pauseIf: () => S.cur === '2.4' && NET.off._debug.bots.QA.role === 'col' && !!document.querySelector('#con .opts'),
    after: () => NET.speak('QA', 'Who speaks for the applicant who gets flagged wrongly?') },
  { name: 'gate', query: '?auto=1&role=po&prof=feature&speed=60', wait: 4200,
    pauseIf: () => S.cur === '2.3' && !!ACTIVE && !!ACTIVE.approve && NET.off.info().gateS === 1 },
  { name: 'swarm', query: '?auto=1&role=po&prof=enterprise&speed=60', wait: 3400,
    pauseIf: () => S.cur === '3.5' && document.querySelectorAll('.o3l.sat.on').length >= 3 },
  { name: 'incident', query: '?auto=bad&role=ops&prof=express&speed=60&hold=boss', wait: 3200,
    until: () => !!document.querySelector('#acts'),
    after: () => { document.querySelector('#acts [data-id=investigate]').click(); document.querySelector('#acts [data-id=ratelimit]').click(); } },
  { name: 'incident-infra', query: '?auto=1&scen=infra&prof=express&role=ops&speed=60&hold=boss', wait: 3400,
    until: () => !!document.querySelector('#acts'),
    after: () => { document.querySelector('#acts [data-id=investigate]').click(); } },
  { name: 'light', query: '?auto=1&role=po&prof=enterprise&speed=60', wait: 3200,
    before: () => applyTheme('light'),
    pauseIf: () => S.cur === '3.2' && NET.off._debug.bots.ARC.role === 'lead' && !!document.querySelector('#con .opts') },
  { name: 'debrief', query: '?auto=fix&role=eng&prof=feature&speed=80&rate=20', wait: 5200,   // let the last toasts clear
    until: () => !!window.__done && !document.querySelector('#debrief').hidden },
];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--window-size=1440,900', '--hide-scrollbars', '--use-angle=metal', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
});
let failed = 0;
for (const s of SHOTS) {
  if (only.length && !only.includes(s.name)) continue;
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  try {
    if (s.pauseIf) await page.evaluateOnNewDocument(`window.__pauseIf=()=>{try{return (${s.pauseIf.toString()})()}catch(e){return false}}`);
    await page.goto(GAME + s.query, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof NET !== 'undefined' && NET.off && NET.off.ready, { timeout: 30000 });
    if (s.before) await page.evaluate(s.before);
    if (s.start) await page.evaluate(s.start);
    if (s.pauseIf) await page.waitForFunction(() => window.__paused === true, { timeout: 120000, polling: 100 });
    if (s.until) await page.waitForFunction(s.until, { timeout: 120000, polling: 100 });
    await page.evaluate(() => { const b = document.querySelector('#speedBtn'); if (b) b.textContent = '1×'; });   // autoplay runs fast; show the normal label
    if (s.after) { await sleep(Math.min(1500, s.wait)); await page.evaluate(s.after); }
    await sleep(s.wait);
    const file = `${OUT}/${s.name}.jpg`;
    await page.screenshot({ path: file, type: 'jpeg', quality: 86 });
    console.log(`${file}  ${(fs.statSync(file).size / 1024).toFixed(0)} kB${errors.length ? '  PAGE ERRORS: ' + errors.join(' | ') : ''}`);
    if (errors.length) failed++;
  } catch (e) { failed++; console.error(`${s.name}: FAILED ${e.message}${errors.length ? ' | page errors: ' + errors.join(' | ') : ''}`); }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
