/* Scenario: the reasons pipeline. A refactor of the code every /assess response passes through.
   Written for the stages that refactor, bugfix and express run. Everything here is story. */
SCENARIOS.refactor=(()=>{
const REC='aidlc/spaces/identity/intents/261216-reasons-pipeline/';
const KB='aidlc/spaces/identity/codekb/aegle-api/';
const ASK='Refactor reason merging in /assess into a signal pipeline, with no change in behaviour';
const golden=()=>dv('2.1.golden')!==1;                                   // a real record of current behaviour exists
const orderKept=()=>dv('2.3.same')===0||!!S.flags.order;                  // reason order is a requirement
const truncKept=()=>dv('3.1.quirk')===0||!!S.flags.truncFix;              // the three-reason limit survives
const parallel=()=>dv('3.5.exec')!==1||!!S.flags.parFix;                  // signals still run side by side

const DEC={
 '2.1.golden':{own:'eng',by:'DEV',q:'Test coverage on the merge code is 71%, and finding CQ-03 says merging more than three reasons is untested. What do I take as the record of what this code does today?',ctx:'A refactor is only as safe as its record of current behaviour.',o:[
  {t:'Capture 10,000 real request and response pairs from production as a golden set, with personal data masked',s:10,q:5,fb:'Now "no behaviour change" is something you can run.'},
  {t:'The existing test suite is the record',s:2,r:10,fb:'The suite covers 71% of the merge code and none of the cases CQ-03 names. Whatever it misses is free to change.'},
  {t:'Capture real pairs unmasked. Masking takes a day.',s:0,r:20,fb:'Ten thousand applicants\' names and dates of birth now sit in a test fixture in the repository.'}]},
 '2.3.same':{own:'po',by:'PRD',q:'What does "no behaviour change" mean to a lender?',ctx:'Forty lenders parse this response. The requirement is the only place their view gets written down.',o:[
  {t:'Byte-identical responses for the recorded traffic: the same reasons, in the same order, with the same wording',s:10,q:5,r:-5,fb:'Strict, and checkable. Whatever lenders rely on today, they still get.'},
  {t:'The same reasons, in any order',s:3,r:10,fb:'Reasonable on paper. Nobody has checked whether a lender reads only the first reason.'},
  {t:'The tests pass',s:0,r:10,fb:'The tests are what finding CQ-03 says you cannot trust here.'}]},
 '2.3.freeze':{own:'pm',by:'PRD',q:'ID-VEL-03 is due to start in this same code next week. What happens to it while the refactor is open?',ctx:'Two changes to one 640-line function.',o:[
  {t:'Hold new signals until the pipeline lands. ID-VEL-03 starts on the new structure.',s:10,fb:'One change at a time in the code everything passes through.'},
  {t:'Build both at once and merge at the end',s:2,r:10,fb:'Two sets of agents rewriting one function. The merge becomes a second refactor.'}]},
 '3.1.quirk':{own:'eng',by:'ARC',q:'Writing down current behaviour turned up a quirk: when more than three reasons apply, the code silently drops everything after the third. Lenders have received at most three for two years. What does the refactor do with it?',ctx:'Functional Design records what the code does today, quirks included. The bugfix scope skips this stage.',o:[
  {t:'Keep it exactly, write it down as rule R-4, and open a separate intent to change it',s:10,q:5,fb:'The refactor stays a refactor, and the quirk becomes a decision somebody can make on purpose.'},
  {t:'Fix it now: return every reason that applies',s:2,r:15,fb:'Sensible, and a behaviour change. Lenders that sized a field for three reasons find out in production.'},
  {t:'Leave it to the Developer agent',s:0,r:10,fb:'An agent building a clean merge has no reason to rebuild a limit it was never told about.'}]},
 '3.5.exec':{own:'eng',by:'DEV',q:'The simplest pipeline runs the signals one after another. Today\'s code runs them side by side. Which do I build?',ctx:'A question raised mid-build. How fast the response arrives is behaviour too.',o:[
  {t:'Side by side, as today, with timings compared against the recorded traffic',s:10,fb:'p99 stays the slowest signal, not the sum of all of them.'},
  {t:'One after another. It is easier to read and to debug.',s:2,r:10,fb:'p99 becomes the sum of the signals: about 141 ms turns into about 260 ms.'}]},
 '3.6.compare':{own:'eng',by:'QA',q:'How do we show that nothing changed?',ctx:'Build and Test is the evidence. For a refactor, the evidence is a comparison.',o:[
  {t:'Run the old and new code side by side on recorded traffic, and diff every response and every timing',s:10,q:5,fb:'Differences show up here, as a failed build, and not at a lender.'},
  {t:'The unit tests pass on the new code',s:2,r:10,fb:'They were written for the old structure and cover 71% of it.'}]},
 '4.1.strategy':{own:'ops',by:'PIP',q:'How does the new pipeline reach all 40 lenders?',ctx:'This decides whether the old code path is still there when you need it.',o:[
  {t:'Canary 5% → 25% → 100%, keeping the old path deployable per lender',s:10,fb:'If one lender\'s parser objects, that lender goes back to the old path while the rest carry on.'},
  {t:'Blue/green switch',s:6,fb:'Fast to flip back, but for everyone at once.'},
  {t:'All at once. Nothing is supposed to change.',s:0,r:10,fb:'"Nothing is supposed to change" is the claim under test.'}]},
 '4.3.window':{own:'pm',by:'PIP',q:'The refactor is ready. Lenders start their month-end reconciliation runs in six days. When does it go out?',ctx:'Deployment Execution.',o:[
  {t:'Tuesday 10:00, well clear of month end, with the whole team online',s:10,fb:'A week of ordinary traffic on the new pipeline before the heaviest day.'},
  {t:'Friday 17:00, to free next week for ID-VEL-03',s:0,r:10,fb:'The first full week on the new code is month end.'}]},
 '4.4.alarm':{own:'ops',by:'OPS',q:'What would tell us that a lender is seeing something different?',ctx:'Observability Setup. A changed reason order is still a 200 OK in 140 ms.',o:[
  {t:'Replay a sample of the recorded traffic against production every day, and alarm on any mismatch',s:10,q:5,fb:'It watches the thing the refactor promised: the same answers.'},
  {t:'The latency and error alarms we already have',s:2,r:5,fb:'Neither one moves when the wrong reason comes first.'}]},
};

const units=()=>[{id:'aegle-api',kind:'service',st:'(no Units in this scope)',plan:'extract a signal pipeline from the reason-merging code',files:22,tests:118}];

const stages={
...initStages(REC,{ask:ASK,intent:'reasons-pipeline',ws:'brownfield · TypeScript 5 · Node 20 · AWS CDK · repo <code>aegle-api</code> (codekb found)'}),

'2.1':{
 why:'In a refactor the code is the specification. The scan has to capture what it does, not what anyone remembers it doing.',
 dec:['2.1.golden'],
 files:[
  {p:KB+'code-quality-assessment.md',b:()=>T(['ID','Finding','Where'],[['<b class="wa">CQ-10</b>','<b>one 640-line function assembles every reason; each new signal is wired in by hand</b>','src/reasons.ts:1–640'],['CQ-03','merging more than three reasons is untested','src/reasons.ts:40'],['<b class="wa">CQ-11</b>','<b>integration notes for three lenders say their systems read only <code>reasons[0]</code></b>','docs/lender-integrations/'],['CQ-01','test coverage on src/reasons.ts: 71%','src/']])+P('Record of current behaviour: '+pk('2.1.golden',['golden set of 10,000 masked request and response pairs, sampled across all 40 lenders','<span class="wa">the existing test suite only</span>','<span class="no">golden set of 10,000 pairs, unmasked: real names and dates of birth</span>']))},
  {p:KB+'code-structure.md',b:()=>PRE('src/\n  handler.ts          → calls mergeReasons()\n  reasons.ts         640 lines: vel01, device, vel02, vel00 fallback, ordering, truncation\n  rules/vel01.ts\n  rules/vel02.ts'+(golden()?'\nfixtures/golden/     10,000 pairs'+(dv('2.1.golden')===2?'   <span class="no">← unmasked</span>':''):''))},
  {p:KB+'reverse-engineering-timestamp.md',opt:1,b:()=>P('Diff scan at 2026-12-16T10:12Z: src/reasons.ts, src/rules/ and docs/lender-integrations/.')}],
 pre:[['DEV','Scanning <code>src/reasons.ts</code> and everything that depends on what it returns.'],['DEV','It is one function, 640 lines. And three lenders document that they read only the first reason. Flagging both.']],
 post:[['DEV','Findings written to the space-level codekb.']],
 finds:()=>dv('2.1.golden')===1?[{by:'DEV',t:'There is no record of what the merge code returns today beyond a suite that covers 71% of it.',src:'code-quality-assessment.md:L5',fix:'2.1.golden',ch:'Capture a masked golden set from production'}]:dv('2.1.golden')===2?[{by:'DEV',t:'The golden set holds 10,000 real names and dates of birth in the repository.',src:'fixtures/golden/',fix:'2.1.golden',ch:'Mask the golden set'}]:[]},

'2.3':{
 dec:['2.3.same','2.3.freeze'],
 files:[{p:REC+'inception/requirements-analysis/requirements.md',b:()=>H('Goal')+P('A new signal becomes a plug-in with its own tests, not an edit to a 640-line function '+SRC('CQ-10')+'.')+H('Functional')+L(['FR-1: no behaviour change, defined as: '+pk('2.3.same',['byte-identical responses for the recorded traffic','<span class="wa">the same reasons, in any order</span>','<span class="no">the tests pass</span>']),orderKept()&&dv('2.3.same')!==0?'<b>FR-2: reasons are returned in today\'s order</b> '+SRC('CQ-11'):null,'FR-3: adding a signal touches one new file and one registry line'])+H('Constraints')+L(['New signals: '+pk('2.3.freeze',['held until the pipeline lands','<span class="wa">ID-VEL-03 is built in the old code at the same time</span>'])])},
        {p:REC+'inception/requirements-analysis/traceability.json',opt:1,b:()=>PRE('{ "FR-1": ["CQ-03", "CQ-10"]'+(orderKept()?', "FR-2": ["CQ-11"]':'')+', "FR-3": ["CQ-10"] }')}],
 pre:[['PRD','A refactor has one requirement that matters: nothing changes for the people on the other side. The work is in saying what "nothing" means.']],
 post:[['PRD','Writing <code>requirements.md</code> and <code>traceability.json</code>.'],['PLR','Reviewing the requirements against the code scan…']],
 sfail:()=>orderKept()?null:{s:'upstream-coverage',t:'requirements.md never references finding CQ-11 from the code scan: three lenders read only reasons[0].',src:'requirements.md → code-quality-assessment.md:CQ-11',key:'order',ch:'Make reason order a requirement (CQ-11)',fixmsg:'FR-2 added: reasons are returned in today\'s order. Sensor re-run: pass.'},
 after:()=>{if(dv('2.3.freeze')===1)tick(6)},
 finds:()=>{const f=[];
  if(dv('2.3.same')===2)f.push({by:'PLR',t:'"The tests pass" cannot be the definition: CQ-03 and CQ-01 say the tests do not cover this code.',src:'requirements.md:FR-1',fix:'2.3.same',ch:'Define no change as byte-identical responses'});
  if(dv('2.3.freeze')===1)f.push({by:'PLR',t:'ID-VEL-03 and the refactor will both rewrite src/reasons.ts in the same fortnight.',src:'requirements.md:L6',fix:'2.3.freeze',ch:'Hold new signals until the pipeline lands'});
  return f}},

'3.1':{
 dec:['3.1.quirk'],
 files:[{p:REC+'construction/functional-design/rules.md',b:()=>L(['R-1: every signal is evaluated for every assessment','R-2: reasons are ordered by severity, then by signal registration order'+(orderKept()?'':' <span class="wa">(not a requirement)</span>'),'R-3: ID-VEL-00 replaces ID-VEL-02 when the network check is unavailable','R-4: more than three reasons: '+pk('3.1.quirk',['<b>only the first three are returned</b> (existing behaviour, kept; change tracked as its own intent)','<span class="wa">all are returned (behaviour change)</span>','<span class="no">not specified</span>'])])},
        {p:REC+'construction/functional-design/functional-spec.md',b:()=>PRE('assess(app):\n  results = '+(parallel()?'await all(signals.map(s => s.evaluate(app)))':'for s in signals: await s.evaluate(app)   # sequential')+'\n  reasons = order(results)'+(dv('3.1.quirk')===0?'\n  return reasons[0:3]                # R-4':'\n  return reasons'))},
        {p:REC+'construction/functional-design/entities.md',opt:1,b:()=>L(['Signal { code, evaluate(app) → Reason | null }','Registry: ordered list of Signals','Reason { code, severity, detail }'])}],
 pre:[['ARC','Functional design for the pipeline. First I write down what the current code does, line by line, so the new code has something to match.'],['ARC','There is behaviour in here that no document mentions.']],
 post:[['ARC','Rules and spec written.'],['ARV','Reviewing the functional design against the current code…']],
 finds:()=>dv('3.1.quirk')===1?[{by:'ARV',t:'Returning more than three reasons changes what every lender receives. FR-1 says no behaviour change.',src:'rules.md:R-4',fix:'3.1.quirk',ch:'Keep the three-reason limit; change it separately'}]:dv('3.1.quirk')===2?[{by:'ARV',t:'The three-reason limit is current behaviour and the spec is silent on it. Code generated from this spec will not have it.',src:'rules.md:R-4',fix:'3.1.quirk',ch:'Keep the three-reason limit; change it separately'}]:[]},

'3.5':{
 files:[{p:REC+'construction/code-generation/code-generation-plan.md',b:()=>P('This scope has no Units Generation, so there are no Units: one plan for the one change.')+L(['<code>src/pipeline/registry.ts</code>: ordered list of signals','<code>src/pipeline/signals/*.ts</code>: vel01, device, vel02 (with the ID-VEL-00 fallback), one file each','<code>src/pipeline/merge.ts</code>: ordering: '+(orderKept()?'today\'s order, pinned by test':'<span class="wa">by severity only</span>')+'; three-reason limit: '+pkd('3.1.quirk',['kept (R-4)','<span class="wa">removed</span>','<span class="no">not specified</span>'],S.flags.truncFix?'kept, after Build and Test found it':'not written down: Functional Design is not in this scope'),'Evaluation: '+pk('3.5.exec',['signals run side by side','<span class="wa">signals run one after another</span>'],0),'<code>src/reasons.ts</code>: deleted once the comparison is clean'])},
        {p:REC+'construction/code-generation/code-summary.md',b:()=>T(['Change','Files','Tests'],[['pipeline and registry',6,34],['three signals, one file each',9,61],['merge and ordering',4,23],['old reasons.ts removed',3,0]])+P('Evaluation: '+(parallel()?'side by side':'<span class="wa">one after another</span>')+'.')},
        {p:REC+'construction/code-generation/unit-test-instructions.md',opt:1,b:()=>PRE('npm test -- --coverage'+(golden()?'\nnpm run compare -- fixtures/golden/   # old vs new, responses and timings':''))}],
 pre:[['DEV','Drafting the code plan. No code is written until the plan is approved.']],
 post:[['DEV','Pipeline generated. Writing <code>code-summary.md</code>.'],['ARV','Reviewing the diff against the functional design…']],
 sfail:()=>({s:'traceability',t:'FR-3 has no test mapped to it in traceability.json.',src:'traceability.json: FR-3',auto:'DEV',fixmsg:'FR-3 mapped to registry.add-signal.test.ts. Sensor re-run: pass.'}),
 finds:()=>dv('3.5.exec')===1&&!S.flags.parFix?[{by:'ARV',t:'Sequential evaluation makes p99 the sum of the signals. The current code runs them in parallel.',src:'src/pipeline/registry.ts:22',fix:'3.5.exec',ch:'Run the signals side by side'}]:[]},

'3.6':{
 dec:['3.6.compare'],
 files:[{p:REC+'construction/build-and-test/test-results.md',b:()=>T(['Suite','Result'],[['unit','<span class="ok">531 passed</span>'],['integration','<span class="ok">44 passed</span>'],['old vs new: responses',pk('3.6.compare',[golden()?(truncKept()?'<span class="ok">10,000 of 10,000 '+(orderKept()?'identical':'equal, ignoring order')+'</span>':'<span class="no">212 differ</span>'):'<span class="wa">500 staging pairs equal; no production record to compare</span>','<span class="wa">not run</span>'])],['old vs new: p99',pk('3.6.compare',[parallel()?'<span class="ok">141 ms → 142 ms</span>':'<span class="no">141 ms → 262 ms</span>','<span class="wa">not measured</span>'])]])},
        {p:REC+'construction/build-and-test/build-instructions.md',opt:1,b:()=>PRE('npm ci && npm run build && npm test'+(dv('3.6.compare')===0?' && npm run compare':''))}],
 pre:[['QA','Building, then running the unit and integration suites.'],['QA','One question first: for a refactor, what is the test?']],
 post:[['QA','Writing <code>test-results.md</code>.']],
 finds:()=>dv('3.6.compare')===1?[{by:'QA',t:'Nothing compares the new pipeline with the old code. The suite that passed covers 71% of what was replaced.',src:'test-results.md:L3',fix:'3.6.compare',ch:'Compare old and new on recorded traffic'}]:[]},

'4.1':{
 dec:['4.1.strategy'],
 files:[{p:REC+'operation/deployment-pipeline/deployment-strategy.md',b:()=>P(pk('4.1.strategy',['<b>Canary</b> 5% → 25% → 100%, with the old path kept deployable per lender for 30 days','<b>Blue/green</b> switch with instant flip-back','<b>All at once</b>; src/reasons.ts is deleted in the same release']))},
        {p:REC+'operation/deployment-pipeline/rollback-runbook.md',b:()=>L(['Trigger: any lender reports a parsing difference, or p99 leaves the SLO','Action: '+pk('4.1.strategy',['route that lender to the old path (~1 min); full rollback ~2 min','flip to blue (~1 min), for all lenders','<span class="wa">redeploy the previous release (~8 min)</span>'])])},
        {p:REC+'operation/deployment-pipeline/cd-config.md',opt:1,b:()=>PRE('pipeline: aegle-api-cd\nstages: staging → prod')}],
 pre:[['PIP','Planning how the new pipeline reaches production, and how long the old path stays available.']],
 post:[['PIP','Writing the deployment strategy and rollback runbook.']],
 finds:()=>dv('4.1.strategy')===2?[{by:'PIP',t:'All-at-once deletes the old path in the same release. If one lender\'s parser breaks, the only way back is a full redeploy.',src:'deployment-strategy.md:L1',fix:'4.1.strategy',ch:'Use a canary and keep the old path'}]:[]},

'4.3':{
 dec:['4.3.window'],
 files:[{p:REC+'operation/deployment-execution/deployment-log.md',b:()=>PRE(pk('4.1.strategy',['09:58 canary 5%  ✓ responses match\n10:08 canary 25% ✓ responses match\n10:18 100%       ✓','10:00 green up ✓\n10:05 flip ✓','10:00 deploy 100% ✓']))},
        {p:REC+'operation/deployment-execution/smoke-test-results.md',b:()=>L(['/assess returns the same reasons for 200 sampled requests ✓',orderKept()?'reasons[0] unchanged for all 200 ✓':'<span class="wa">reasons[0] differs for 31 of 200 (order is not a requirement)</span>',parallel()?'p99 142 ms ✓':'<span class="no">p99 262 ms ✗</span>'])}],
 pre:[['PIP','Ready to deploy the pipeline to prod. The deploy window is a human call.']],
 post:[['PIP','Writing the deployment log and smoke test results.']],
 finds:()=>dv('4.3.window')===1?[{by:'PIP',t:'A Friday 17:00 deploy puts the first full week of the new pipeline on month end.',src:'deployment-log.md:L1',fix:'4.3.window',ch:'Move to Tuesday 10:00'}]:[]},

'4.4':{
 dec:['4.4.alarm'],
 files:[{p:REC+'operation/observability-setup/alarms.md',b:()=>L(pk('4.4.alarm',[['<b>daily replay of 500 recorded requests against production: any mismatch → page</b>','existing latency and error burn-rate alarms (unchanged)'],['existing latency and error burn-rate alarms (unchanged)']]))},
        {p:REC+'operation/observability-setup/slo-config.md',b:()=>PRE('slo: assess-availability  target: 99.9%  window: 30d   # unchanged\nslo: assess-latency       p99 < 300ms                # unchanged')},
        {p:REC+'operation/observability-setup/dashboards.md',opt:1,b:()=>L(['Reasons: count per code, reasons per response, first reason by lender'])}],
 pre:[['OPS','A refactor that goes wrong does not throw errors. I am looking for something that watches the answers.']],
 post:[['OPS','Writing alarms and dashboards.']],
 finds:()=>dv('4.4.alarm')===1?[{by:'OPS',t:'No alarm can tell that a lender is receiving a different answer.',src:'alarms.md:L1',fix:'4.4.alarm',ch:'Replay recorded traffic daily and alarm on mismatch'}]:[]},
};

/* ---------- the incident: month end, when forty parsers meet the new pipeline ---------- */
function incident(D){
  const ord=orderKept(),trunc=truncKept(),par=parallel(),noFD=D['3.1.quirk']===undefined;
  const waves=[
    {id:'order',n:'The first reason changed',sev:85,chart:'err',sym:'Three lenders report a wave of declines. Their systems read only <code>reasons[0]</code>, and a different reason now comes first.',
     rc:D['2.3.same']===1?'2.3 allowed "the same reasons, in any order". Three lenders read only the first one.':'2.3 defined no change as "the tests pass", and no test checks the order.',
     auto:ord,autoLog:'Reasons come out in the old order, because the requirements say they must. No parser notices a thing.'},
    {id:'trunc',n:'More than three reasons',sev:80,chart:'err',sym:'Two lenders\' batch jobs are failing on responses that carry four and five reasons.',
     rc:D['3.1.quirk']===1?'3.1 fixed the three-reason limit inside the refactor. That was a behaviour change.':D['3.1.quirk']===2?'3.1 left the limit to the Developer agent, which built a clean merge without it.':`Functional Design is not in the ${scope().n} scope, so nobody wrote the three-reason limit down, and the new merge does not have it.`,
     auto:trunc,autoLog:S.flags.truncFix?'The side-by-side comparison in 3.6 caught the missing three-reason limit before it shipped.':'Rule R-4 kept the three-reason limit. Nothing downstream overflows.'},
    par?{id:'load',n:'Month-end batch load',sev:40,chart:'rps',sym:'Reconciliation batches have tripled the request rate. Latency is flat.',rc:'Pure load. The signals still run side by side, so p99 is the slowest signal, not the sum.'}
       :{id:'slow',n:'Latency regression',sev:85,chart:'p99',sym:'p99 is at <b>262 ms</b> and climbing with the batch load.',rc:'3.5 runs the signals one after another, so p99 is the sum of all of them.'},
  ];
  const abil=[
   {id:'investigate',n:'Investigate',ag:'OPS',role:'ops',cast:()=>D['4.4.alarm']===0?1:2,cd:0,util:1,d:'Compare live responses with the recorded ones to find the cause.',src:()=>D['4.4.alarm']===0?'4.4: a daily replay already diffs production (fast)':'always available'},
   {id:'pin',n:'Hotfix: restore the old order',ag:'DEV',role:'eng',cast:5,cd:12,d:'Put the reasons back in the order lenders are used to.',dmg:{order:100},src:()=>'always available (slow)'},
   {id:'cap',n:'Hotfix: restore the limit',ag:'DEV',role:'eng',cast:4,cd:12,d:'Return at most three reasons again.',dmg:{trunc:100},src:()=>'always available (slow)'},
   {id:'par',n:'Hotfix: run signals in parallel',ag:'DEV',role:'eng',cast:6,cd:15,d:'Evaluate the signals side by side, as the old code did.',dmg:{slow:100},src:()=>'always available (slow)'},
   {id:'scale',n:'Scale out',ag:'AWS',role:'ops',cast:4,cd:10,d:'Raise capacity and concurrency.',dmg:{load:70,slow:25},src:()=>'always available'},
   {id:'oldpath',n:'Route a lender to the old path',ag:'PIP',role:'ops',cast:1.5,cd:6,util:1,d:'Send the affected lenders through the old code while the fix is made.',dmg:{order:40,trunc:40,slow:30},req:()=>D['4.1.strategy']===0,src:()=>D['4.1.strategy']===0?'4.1: the old path is still deployable per lender':'needs a canary that keeps the old path (4.1)'},
   {id:'rollback',n:'Roll back',ag:'PIP',role:'ops',cast:()=>[3,2,8][D['4.1.strategy']??2],cd:0,once:1,util:1,d:'A blunt fix: ends the incident, and the 640-line function is back.',src:()=>'4.1: '+(['canary (~3 s)','blue/green (~2 s)','all-at-once (~8 s)'][D['4.1.strategy']??2])},
   {id:'notify',n:'Notify lenders',ag:'PRD',role:'po',cast:2,cd:0,once:1,util:1,d:'Tell lenders what changed in the response and what to do meanwhile.',src:()=>'always available'},
   {id:'escalate',n:'Page incident commander',ag:'DLV',role:'pm',cast:2,cd:0,once:1,util:1,d:'An IC coordinates the response, so all casts are 40% faster.',src:()=>'always available'},
  ];
  return {
    h:'Month-end reconciliation',
    p:'Month end. Forty lenders run their reconciliation batches through /assess, and their parsers meet the new pipeline at full volume. Alarms are firing.',
    unshipped:'Month end. Forty lenders run their reconciliation batches through /assess. Alarms are firing.',
    comms:'Lenders who know what changed can hold their batches for an hour.',
    abil,waves,rps:4200,
    logs:{notify:'Lenders told what differs in the response, and asked to hold batch runs until it is put right.',rollback:'Rolled back. The old function is serving every lender again, and the refactor starts over.'},
    result:{won:'All three waves handled. Lenders got the answers they have always got, from code that is now easy to extend.',rollback:'The incident is over, but the pipeline is out and the 640-line function is back.',breach:'The error budget ran out. A change that was meant to be invisible was the most visible thing at month end.'},
    score:{notified:['Lenders notified','Lenders never notified'],rolled:'Refactor rolled back'},
    why(){const it=[];
      it.push([ord?'Reason order never moved':'Reason order changed under three lenders',ord?'good':'bad',D['2.3.same']===0?'2.3 defined no change as byte-identical responses.':ord?'The upstream-coverage sensor at 2.3 caught that CQ-11 was missing, and order became a requirement.':scope().sensors?'The sensor flagged CQ-11 at 2.3, and it was accepted as risk.':`The ${scope().n} scope runs no sensors, so nothing tied the requirements to CQ-11.`]);
      it.push([trunc?'The three-reason limit survived':'The three-reason limit was lost',trunc?'good':'bad',D['3.1.quirk']===0?'3.1 wrote the quirk down as rule R-4 and kept it.':S.flags.truncFix?'Nobody had written it down, but the side-by-side comparison in 3.6 caught it.':noFD?`No Functional Design in the ${scope().n} scope, and nothing compared old with new on real traffic.`:'3.1 changed or ignored the limit.']);
      it.push([par?'Latency stayed flat under batch load':'p99 became the sum of the signals',par?'good':'bad',D['3.5.exec']===1?(S.flags.parFix?'3.5 built it sequentially, and the timing comparison in 3.6 sent it back.':'3.5 chose sequential evaluation, and nothing measured it.'):'3.5 kept the signals running side by side.']);
      return it},
  };
}

function debrief(C2,D){
  C2('2.1',D['2.1.golden']===0,D['2.1.golden']===0?'A masked golden set from production made "no behaviour change" testable.':D['2.1.golden']===1?'The refactor had no record of current behaviour beyond a 71% test suite.':'The golden set put 10,000 applicants\' personal data into the repository.');
  C2('2.3',D['2.3.same']===0,D['2.3.same']===0?'Byte-identical responses was a definition lenders could rely on.':'The definition of "no change" left room for a change lenders could see.');
  if(D['2.3.same']!==0)C2('SENS',!!S.flags.order,S.flags.order?'The upstream-coverage sensor tied the requirements back to CQ-11, and reason order was pinned.':'CQ-11 (three lenders read only the first reason) never reached the requirements.');
  C2('2.3',D['2.3.freeze']===0,D['2.3.freeze']===0?'New signals waited for the pipeline, so one change at a time went through the code.':'ID-VEL-03 and the refactor rewrote the same function at once, and the merge cost most of a day.');
  C2('3.1',truncKept(),D['3.1.quirk']===undefined?(S.flags.truncFix?`The ${scope().n} scope has no Functional Design. The three-reason quirk was caught late, by the comparison in Build and Test.`:`The ${scope().n} scope has no Functional Design, so behaviour that lived only in the code was lost in the rewrite.`):D['3.1.quirk']===0?'Functional Design wrote the three-reason quirk down and kept it.':'The three-reason quirk was changed inside a refactor.');
  if(D['3.5.exec']!==undefined)C2('3.5',D['3.5.exec']===0,D['3.5.exec']===0?'Signals still run side by side, so the refactor cost no latency.':'Sequential evaluation nearly doubled p99.');
  if(D['3.6.compare']!==undefined)C2('3.6',D['3.6.compare']===0,D['3.6.compare']===0?'Running old and new side by side turned differences into failed builds.':'The new code was judged by tests written for the old structure.');
  if(D['4.4.alarm']!==undefined)C2('4.4',D['4.4.alarm']===0,D['4.4.alarm']===0?'A daily replay watches the answers, which is what the refactor promised to keep.':'Nothing in production can tell that an answer has changed.');
}

return {
 id:'refactor',n:'The Reasons Pipeline',kind:'refactor',col:'#2EE6C5',
 tag:'Pull the tangled reason-merging code apart without changing a single response.',
 d:'Every signal the team has shipped is wired by hand into one 640-line function, and three more signals are planned. Sam wants a pipeline where a signal is a plug-in. Forty lenders parse the output today, so nothing they receive may change.',
 ask:ASK,intent:'reasons-pipeline',REC,KB,
 boot:{repo:'aegle-api',ws:'brownfield · TypeScript + Python · 17,480 LOC · codekb found',note:'src/reasons.ts is 640 lines and every /assess response passes through it.'},
 scopes:['refactor','bugfix','express'],best:'refactor',
 fit:{
  refactor:{v:'best',t:'The bugfix path plus Functional Design, so current behaviour is written down, quirks included, before any code moves.'},
  bugfix:{v:'poor',t:'No Functional Design. The code is rebuilt from the requirements alone, and behaviour that nobody wrote down is free to change.'},
  express:{v:'poor',t:'No reviewers, no sensors and no plan approval, for a rewrite of the code every lender\'s response passes through.'},
 },
 composer:{E:[.20,.72,.66,.48,.52],why:'Codebase structural uncertainty is HIGH (0.72 ≥ 0.70): a 640-line function with untested paths, and behaviour that lives in the code and in no document. Refactor is the bugfix path plus Functional Design, where that behaviour gets written down before anything moves. Bugfix would rebuild from the requirements alone.'},
 DEC,stages,units,
 midBuild:{unit:'aegle',dec:'3.5.exec'},
 loopBack(){
  if(dv('3.6.compare')!==0)return null;
  const t=golden()&&!truncKept(),p=!parallel();
  if(!t&&!p)return null;
  if(t)S.flags.truncFix=true;if(p)S.flags.parFix=true;
  return {why:'Comparison failure: '+[t?'212 recorded responses differ. The old code returned three reasons where the new code returns four or five':null,p?'p99 went from 141 ms to 262 ms, because the signals now run one after another':null].filter(Boolean).join('; and ')+'.',
          fixed:'Second run: green. '+[t?'The merge keeps the three-reason limit':null,p?'the signals run side by side again':null].filter(Boolean).join(', and ')+'.'}},
 deploy:{what:'the new pipeline',all:'No blast-radius control: every lender moved to the new pipeline in the same second, and the old path is gone.'},
 addStage:{at:'2.3',add:'3.1',ask:'Functional Design is not in this scope, but this change rewrites the code that assembles every response. Add it?',sub:'Nobody has written down what the current code does, quirks included.'},
 traceGap:()=>S.ran.has('2.3')&&!orderKept(),
 humanSensor:'2.3',
 badge:{ic:'🧬',n:'Same Bytes Out',d:'Capture a masked golden set, define no change as byte-identical, and prove it side by side.',test:()=>S.dec['2.1.golden']===0&&S.dec['2.3.same']===0&&S.dec['3.6.compare']===0},
 incident,debrief,
};
})();
