/* Scenario: the retry double-count. A production bug in what Network Velocity shipped.
   Written for the stages that bugfix, refactor and express run. Everything here is story. */
SCENARIOS.bug=(()=>{
const REC='aidlc/spaces/identity/intents/261204-vel02-retry-double-count/';
const KB='aidlc/spaces/identity/codekb/aegle-api/';
const ASK='ID-VEL-02 flags applicants seen at only one lender when that lender retries /assess';
/* The counter is right once each lender counts once: either the requirement said so, or Build and Test forced it. */
const setFix=()=>dv('2.3.fixed')===0||!!S.flags.setFix;
const stale=()=>dv('2.1.scan')===2;

const DEC={
 '2.1.scan':{own:'eng',by:'DEV',q:'The code knowledge base is three weeks old and predates two hotfixes. How much do I rescan before touching the counter?',ctx:'Reverse Engineering refreshes the codekb. A stale map sends a fix to the wrong place.',o:[
  {t:'Rescan the counter path and everything that calls it, then diff against the old codekb',s:10,q:5,fb:'The diff finds the cause, and a second writer nobody remembered: the nightly reconciliation job.'},
  {t:'Rescan the whole repository from scratch',s:6,fb:'Correct, and it finds everything. It also costs half a day to re-read 16,000 lines for a bug in one module.'},
  {t:'Trust the codekb as it is. Three weeks is recent.',s:1,r:10,fb:'The codekb predates hotfix #212, where the retry path changed. The agents are now reasoning about code that no longer exists.'}]},
 '2.3.fixed':{own:'po',by:'PRD',q:'What does "fixed" mean for this bug?',ctx:'In a bugfix, requirements are short: say what correct behaviour is, and how you will know.',o:[
  {t:'Each lender counts once per identity per window, however many times it calls. Proven by replaying Kestrel\'s retry traffic.',s:10,q:5,r:-5,fb:'A behaviour you can test, tied to the traffic that exposed the bug.'},
  {t:'Ignore repeat calls that arrive within 5 minutes of the first',s:3,r:5,fb:'That covers an instant retry. A lender that re-checks the same applicant the next morning is still counted twice.'},
  {t:'Raise the threshold from 3 lenders to 5, so retries stop tripping it',s:0,q:-5,r:10,fb:'That hides the symptom and weakens the signal: a real ring using four lenders now passes.'}]},
 '2.3.data':{own:'eng',by:'PRD',q:'About 11,400 identities already carry inflated counts in the 14-day window. What happens to them?',ctx:'Fixing the code does not fix the data the bug already wrote.',o:[
  {t:'Recompute their counts from the sighting log',s:10,r:-5,fb:'Wrongly flagged applicants are cleared the day the fix ships.'},
  {t:'Leave them. The 14-day window will age the bad counts out.',s:3,r:10,fb:'Honest applicants stay flagged for up to two more weeks, and every resubmission flags them again.'},
  {t:'Delete the counters for the affected identities',s:0,r:15,fb:'That clears the false flags, and erases the real evidence about rings in the same window.'}]},
 '2.3.tell':{own:'sec',by:'PRD',q:'1,870 assessments at 9 lenders were flagged wrongly. Do we tell the lenders which ones?',ctx:'Some of those applicants were declined. A decline needs a correct reason.',o:[
  {t:'Yes: send each lender the IDs of its affected assessments, so it can re-review them',s:10,q:5,r:-10,fb:'Lenders can put right what the bug got wrong, and they hear it from you first.'},
  {t:'Post a general notice on the status page',s:4,fb:'Honest, but no lender can tell which of its decisions to revisit.'},
  {t:'No. Fix it quietly.',s:0,r:15,fb:'Applicants declined on a wrong flag are owed a correct reason. Staying silent turns a bug into a compliance problem.'}]},
 '3.1.edge':{own:'eng',by:'ARC',q:'While pinning the rule down: one lender can see the same identity on a loan and on a card on the same day. Is that one lender or two?',ctx:'Functional Design writes the business rule before code moves. The bugfix scope skips this stage and lets the requirement stand in for it.',o:[
  {t:'One. The rule counts lenders, not applications.',s:10,fb:'Consistent with the requirement: each lender counts once.'},
  {t:'Two. Different products are different sightings.',s:2,r:5,fb:'That brings the bug back through another door.'}]},
 '3.5.sibling':{own:'eng',by:'DEV',q:'While fixing the counter I found the same per-request counting in ID-VEL-01, the single-lender check from v1. Fix it here too?',ctx:'A question raised mid-build. The agent stops to ask instead of widening the change by itself.',o:[
  {t:'No. Record it in the intent backlog as its own bugfix, with the evidence.',s:10,fb:'This fix stays small enough to review, and the second defect is not lost.'},
  {t:'Yes, fix both while the code is open',s:3,r:10,fb:'The change now touches a second live signal that has no requirement and no test in this intent.'},
  {t:'Leave it. Nobody has complained about ID-VEL-01.',s:0,r:5,fb:'A known defect with no ticket is one nobody will find again.'}]},
 '3.6.proof':{own:'eng',by:'QA',q:'How do we prove the fix against the traffic that exposed the bug?',ctx:'Build and Test is the evidence that the change does what the requirement says.',o:[
  {t:'Replay Kestrel\'s recorded retry traffic against the build, and compare flags before and after',s:10,q:5,fb:'A test that fails on the old code and passes on the new one. That is what a regression test is.'},
  {t:'The unit tests on the counter module are enough',s:3,r:5,fb:'They pass. They also passed three weeks ago, when the bug shipped.'}]},
 '4.1.strategy':{own:'ops',by:'PIP',q:'How does the fix reach all 40 lenders?',ctx:'This decides how quickly and safely you can undo it.',o:[
  {t:'Canary 5% → 25% → 100%, rolling back automatically if a lender\'s flag rate leaves its usual band',s:10,fb:'A small blast radius, watched by the metric the bug actually moved.'},
  {t:'Blue/green switch',s:6,fb:'Fast to flip back, but every lender gets the change in the same second.'},
  {t:'All at once. It is a small fix.',s:0,r:10,fb:'The bug it fixes was a small change too.'}]},
 '4.1.order':{when:()=>dv('2.3.data')===0,own:'ops',by:'PIP',q:'Two things ship: the code fix and the job that recomputes the inflated counts. In which order?',ctx:'The recompute reads the sighting log and rewrites every affected counter.',o:[
  {t:'Code first, then the recompute, so nothing can inflate the corrected counts',s:10,fb:'The corrected data is written once and stays correct.'},
  {t:'Recompute first, then the code',s:2,r:10,fb:'For the hours in between, retries inflate the freshly corrected counts all over again.'}]},
 '4.3.window':{own:'pm',by:'PIP',q:'The fix is ready on Thursday afternoon. When does it go out?',ctx:'Kestrel\'s ticket is four days old. Month end is nine days away.',o:[
  {t:'Tuesday 10:00, with the whole team online and Kestrel told in advance',s:10,fb:'If the recompute misbehaves, everyone is there to see it.'},
  {t:'Friday 17:00, so the ticket closes this week',s:0,r:10,fb:'A counter change and a data job, running unwatched over a weekend.'}]},
 '4.4.alarm':{own:'ops',by:'OPS',q:'The bug ran for three weeks before a lender told us. What would have caught it in week one?',ctx:'Observability Setup. Latency and error alarms stayed green the whole time.',o:[
  {t:'An alarm on the ID-VEL-02 flag rate for each lender, against that lender\'s own baseline',s:10,q:5,fb:'The service answered quickly and correctly formed. Only what it said was wrong, and this watches what it says.'},
  {t:'The latency and error alarms we already have',s:2,r:5,fb:'They were perfect for three weeks. This bug never slowed a request or threw an error.'}]},
};

const units=()=>[{id:'aegle-api',kind:'service',st:'(no Units in this scope)',plan:'correct the network counter, with a regression test from recorded traffic',files:14,tests:64}];
const fixTxt=()=>setFix()?'store the set of lender IDs seen per identity; the count is the size of the set':dv('2.3.fixed')===1?'<span class="wa">skip the write when the same lender called within the last 5 minutes</span>':'<span class="no">no change to counting; VEL02_THRESHOLD goes from 3 to 5</span>';

const stages={
...initStages(REC,{ask:ASK,intent:'vel02-retry-double-count (LND-2291)',ws:'brownfield · TypeScript 5 · Node 20 · AWS CDK · repo <code>aegle-api</code> (codekb found, 21 days old)'}),

'2.1':{
 why:'The codekb is three weeks old. Agents need the code as it is today, not as it was when Network Velocity shipped.',
 dec:['2.1.scan'],
 files:[
  {p:KB+'code-quality-assessment.md',b:()=>stale()?P('<span class="wa">Not refreshed.</span> Last scan 2026-11-13, before hotfixes #208 and #212.')+T(['ID','Finding','Where'],[['CQ-01','test coverage 84%','src/'],['CQ-03','reason merging is untested for &gt;3 reasons','src/reasons.ts:40']]):T(['ID','Finding','Where'],[['<b class="wa">CQ-07</b>','<b>the network counter adds 1 per request; rule R-1 says distinct lenders</b>','src/network/counter.ts:48'],['<b class="wa">CQ-08</b>','<b>the nightly reconciliation job replays the day\'s sightings into the same counter</b>','jobs/reconcile.ts:31'],['CQ-03','reason merging is untested for &gt;3 reasons','src/reasons.ts:40']])+P('Hotfix #212 cut the gateway timeout from 2 s to 800 ms. Lender gateways now retry about six times as often, which is when CQ-07 started to show.')},
  {p:KB+'architecture.md',b:()=>PRE(`lender ─▶ API GW ─▶ λ assess ─┬▶ ID-VEL-01 (per lender)
                              ├▶ ID-VEL-02 ─▶ network-counter (fp#0–9)
                              └▶ reasons[] ─▶ response${stale()?'':`
02:00 jobs/reconcile ─────────▶ network-counter   <span class="wa">← second writer</span>`}`)},
  {p:KB+'reverse-engineering-timestamp.md',opt:1,b:()=>P(pk('2.1.scan',['Diff scan at 2026-12-04T09:40Z: src/network/, jobs/ and their callers. 38 files re-read, 2 new findings.','Full scan at 2026-12-04T13:55Z, covering 100% of the repository. 2 new findings.','No new scan. Still the full scan from 2026-11-13.']))},
  {p:KB+'component-inventory.md',opt:1,b:()=>L(['assess λ','vel01 rule','vel02 rule','network-counter (DynamoDB, write-sharded)',stale()?null:'<b>reconcile job (nightly, 02:00)</b>'])}],
 pre:[['DEV','A codekb for <code>aegle-api</code> already exists at space level, written when Network Velocity was built. It is 21 days old.'],['DEV','Before I change anything I need to know how far to trust it.']],
 post:[['DEV','Code knowledge base written to the <b>space-level</b> store, so the next intent starts from today\'s code.']],
 after:()=>{if(dv('2.1.scan')===1)tick(4)},
 finds:()=>stale()?[{by:'DEV',t:'The codekb predates hotfixes #208 and #212. Whatever changed in the retry path is not in it.',src:'reverse-engineering-timestamp.md:L1',fix:'2.1.scan',ch:'Rescan the counter path and its callers'}]:[]},

'2.3':{
 dec:['2.3.fixed','2.3.data','2.3.tell'],
 files:[{p:REC+'inception/requirements-analysis/requirements.md',b:()=>H('Defect')+P('ID-VEL-02 fires for identities seen at one lender when that lender retries <code>/assess</code>. '+SRC('ticket LND-2291, Kestrel Finance'))+H('Functional')+L(['FR-1: '+pk('2.3.fixed',['each lender counts once per identity per 14-day window, however many calls it makes','<span class="wa">repeat calls within 5 minutes of the first are ignored</span>','<span class="no">the ID-VEL-02 threshold rises from 3 lenders to 5</span>']),'FR-2: the 11,400 identities with inflated counts are '+pk('2.3.data',['recomputed from the sighting log','<span class="wa">left to expire with the 14-day window</span>','<span class="no">deleted</span>']),'FR-3: lenders '+pk('2.3.tell',['each receive the IDs of their affected assessments','<span class="wa">see a general notice on the status page</span>','<span class="no">are not told</span>']),stale()?null:'FR-4: the nightly reconciliation job writes through the same distinct-lender path '+SRC('CQ-08')])+H('How we will know')+P(dv('2.3.fixed')===0?'Kestrel\'s recorded retry traffic, replayed against the build: no flags for single-lender identities.':'<span class="wa">No acceptance test is named.</span>')},
        {p:REC+'inception/requirements-analysis/traceability.json',opt:1,b:()=>PRE('{ "FR-1": ["LND-2291", "CQ-07"], "FR-2": ["CQ-07"], "FR-3": ["LND-2291"]'+(stale()?'':', "FR-4": ["CQ-08"]')+' }')}],
 pre:[['PRD','A bugfix needs short requirements: what correct behaviour is, what happens to the damage already done, and who needs to know.'],['PRD','Three questions need humans.']],
 post:[['PRD','Writing <code>requirements.md</code> and <code>traceability.json</code>.'],['PLR','Reviewing the requirements against the ticket and the code scan…']],
 finds:()=>{const f=[];
  if(dv('2.3.fixed')===1)f.push({by:'PLR',t:'"Within 5 minutes" describes one retry pattern, not the rule. A lender that re-checks an applicant the next day is still counted twice.',src:'requirements.md:FR-1',fix:'2.3.fixed',ch:'Define fixed as one count per lender'});
  if(dv('2.3.fixed')===2)f.push({by:'PLR',t:'Raising the threshold changes what ID-VEL-02 detects. Four-lender rings stop being flagged, and the counting is still wrong.',src:'requirements.md:FR-1',fix:'2.3.fixed',ch:'Define fixed as one count per lender'});
  if(dv('2.3.data')===1)f.push({by:'PLR',t:'11,400 identities keep inflated counts for up to 14 days. Each resubmission flags the same honest applicants again.',src:'requirements.md:FR-2',fix:'2.3.data',ch:'Recompute counts from the sighting log'});
  if(dv('2.3.data')===2)f.push({by:'PLR',t:'Deleting counters removes genuine cross-lender sightings for the same identities. Rings in that window go unseen.',src:'requirements.md:FR-2',fix:'2.3.data',ch:'Recompute counts from the sighting log'});
  if(dv('2.3.tell')===2)f.push({by:'PLR',t:'Lenders declined applicants on a flag we know was wrong. They need the assessment IDs to correct those decisions.',src:'requirements.md:FR-3',fix:'2.3.tell',ch:'Send each lender its affected assessments'});
  return f}},

'3.1':{
 dec:['3.1.edge'],
 files:[{p:REC+'construction/functional-design/rules.md',b:()=>L(['R-1: count distinct <i>other</i> lenders per fingerprint in a 14-day sliding window <span class="muted">(unchanged from Network Velocity)</span>','R-1a: '+(setFix()?'a lender is counted once, however many requests it sends':dv('2.3.fixed')===1?'<span class="wa">a repeat within 5 minutes is not a sighting</span>':'<span class="no">unchanged; threshold 5</span>'),'R-1b: two products at one lender on one day count as '+pk('3.1.edge',['one lender','<span class="wa">two sightings</span>'])])},
        {p:REC+'construction/functional-design/functional-spec.md',b:()=>PRE(setFix()?'record(fp, lender):\n  lenders[fp] ∪= { lender }        # idempotent\n  return |lenders[fp] − { lender }|':'record(fp, lender):\n  if seen(fp, lender, within=5min): return count[fp]\n  return ++count[fp]')},
        {p:REC+'construction/functional-design/entities.md',opt:1,b:()=>L(['Fingerprint (opaque, 32 bytes)','LenderSet { fp, lenders: Set&lt;LenderId&gt;, ttl 14 d }'])}],
 pre:[['ARC','Functional design for the counter. The rule from Network Velocity said "distinct lenders"; the code stored a number.'],['ARC','I am writing the rule and the data shape so that they cannot disagree again.']],
 post:[['ARC','Rules and spec written.'],['ARV','Reviewing the functional design…']],
 finds:()=>dv('3.1.edge')===1?[{by:'ARV',t:'Counting two products as two sightings contradicts FR-1: one lender would again be counted twice.',src:'rules.md:R-1b',fix:'3.1.edge',ch:'Count each lender once'}]:[]},

'3.5':{
 files:[{p:REC+'construction/code-generation/code-generation-plan.md',b:()=>P('This scope has no Units Generation, so there are no Units: one plan for the one change.')+L(['<code>src/network/counter.ts</code>: '+fixTxt(),'<code>jobs/reconcile.ts</code>: '+(S.flags.cq08?'write through the same path '+SRC('FR-4'):stale()?'<span class="muted">not known to this plan</span>':'<span class="wa">FR-4 asks for this; the plan does not cover it</span>'),'<code>jobs/recompute-counts.ts</code>: '+(dv('2.3.data')===0?'new one-off job that rebuilds each affected counter from the sighting log '+SRC('FR-2'):'<span class="muted">none</span>'),'Edge rule (one lender, two products): '+pkd('3.1.edge',['counts once','<span class="wa">counts twice</span>'],'not written down: Functional Design is not in this scope, so the Developer follows FR-1')])},
        {p:REC+'construction/code-generation/code-summary.md',b:()=>T(['Change','Files','Tests'],[['network counter',5,38],S.flags.cq08?['reconcile job',2,9]:null,dv('2.3.data')===0?['recompute job',3,17]:null,dv('3.5.sibling')===1?['<span class="wa">rules/vel01.ts (not in the requirements)</span>',4,0]:null])+P('Same counting pattern found in ID-VEL-01: '+pk('3.5.sibling',['recorded in the intent backlog as its own bugfix','<span class="wa">changed in this intent</span>','<span class="no">left, with no ticket</span>'],0))},
        {p:REC+'construction/code-generation/unit-test-instructions.md',opt:1,b:()=>PRE('npm test -- --coverage\nnpm run replay -- fixtures/kestrel-retries.ndjson')}],
 pre:[['DEV','Drafting the code plan. No code is written until the plan is approved.']],
 post:[['DEV','Change generated. Writing <code>code-summary.md</code>.'],['ARV','Reviewing the diff against the requirements…']],
 sfail:()=>stale()||S.flags.cq08?null:{s:'traceability',t:'FR-4 (the reconciliation job writes through the same path) is a GAP in traceability.json: no code change and no test is mapped to it.',src:'traceability.json: FR-4 · GAP',key:'cq08',ch:'Build and test FR-4 (the reconcile job)',fixmsg:'<code>jobs/reconcile.ts</code> now writes through the distinct-lender path, with a test. FR-4 is mapped. Sensor re-run: pass.'},
 finds:()=>dv('3.5.sibling')===1?[{by:'ARV',t:'The diff changes rules/vel01.ts. No requirement in this intent covers ID-VEL-01, and no test was added for it.',src:'rules/vel01.ts',fix:'3.5.sibling',ch:'Take ID-VEL-01 out and record it in the backlog'}]:dv('3.5.sibling')===2?[{by:'ARV',t:'A second copy of the same defect was found and nothing records it.',src:'code-summary.md:L5',fix:'3.5.sibling',ch:'Record the ID-VEL-01 defect in the backlog'}]:[]},

'3.6':{
 dec:['3.6.proof'],
 files:[{p:REC+'construction/build-and-test/test-results.md',b:()=>T(['Suite','Result'],[['unit','<span class="ok">476 passed</span>'],['integration','<span class="ok">41 passed</span>'],['replay: Kestrel retry traffic',pk('3.6.proof',[setFix()?'<span class="ok">0 single-lender flags (was 640)</span>':'<span class="no">single-lender flags remain</span>','<span class="wa">not run</span>'])],['network check p99','143 ms (was 141 ms)']])},
        {p:REC+'construction/build-and-test/build-instructions.md',opt:1,b:()=>PRE('npm ci && npm run build && npm test'+(dv('3.6.proof')===0?' && npm run replay':''))}],
 pre:[['QA','Building, then running the unit and integration suites.'],['QA','One question first: what counts as proof here?']],
 post:[['QA','Writing <code>test-results.md</code>.']],
 finds:()=>dv('3.6.proof')===1?[{by:'QA',t:'Nothing in this build replays the traffic that exposed the bug. The same unit tests passed three weeks ago.',src:'test-results.md:L3',fix:'3.6.proof',ch:'Replay Kestrel\'s recorded retry traffic'}]:[]},

'4.1':{
 dec:['4.1.strategy','4.1.order'],
 files:[{p:REC+'operation/deployment-pipeline/deployment-strategy.md',b:()=>P(pk('4.1.strategy',['<b>Canary</b> 5% → 25% → 100%, 10 min bake each, automatic rollback if any lender\'s flag rate leaves its baseline band','<b>Blue/green</b> switch with instant flip-back','<b>All at once</b>']))+(dv('2.3.data')===0?P('Order: '+pkd('4.1.order',['code fix first, then the recompute job','<span class="no">recompute job first, then the code fix</span>'],'not decided yet')):'')},
        {p:REC+'operation/deployment-pipeline/rollback-runbook.md',b:()=>L(['Trigger: a lender\'s ID-VEL-02 flag rate leaves its baseline band','Action: '+pk('4.1.strategy',['canary auto-rollback (~2 min)','flip to blue (~1 min)','redeploy previous (~8 min)']),dv('2.3.data')===0?'Data: the recompute job is idempotent and can be re-run after a rollback':null])},
        {p:REC+'operation/deployment-pipeline/cd-config.md',opt:1,b:()=>PRE('pipeline: aegle-api-cd\nstages: staging → prod')}],
 pre:[['PIP','Planning how the fix reaches production, and how it comes back out if it has to.']],
 post:[['PIP','Writing the deployment strategy and rollback runbook.']],
 finds:()=>{const f=[];
  if(dv('4.1.strategy')===2)f.push({by:'PIP',t:'All-at-once gives a counter change no blast-radius control, and rollback takes about 8 minutes.',src:'deployment-strategy.md:L1',fix:'4.1.strategy',ch:'Use a canary with auto-rollback'});
  if(dv('4.1.order')===1)f.push({by:'PIP',t:'Recomputing before the code fix lets retries inflate the corrected counts for as long as the old code is live.',src:'deployment-strategy.md:L2',fix:'4.1.order',ch:'Ship the code first, then recompute'});
  return f}},

'4.3':{
 dec:['4.3.window'],
 files:[{p:REC+'operation/deployment-execution/deployment-log.md',b:()=>PRE(pk('4.1.strategy',['09:58 canary 5%  ✓ flag rate in band\n10:08 canary 25% ✓ flag rate in band\n10:18 100%       ✓','10:00 green up ✓\n10:05 flip ✓','10:00 deploy 100% ✓'])+(dv('2.3.data')===0?(dv('4.1.order')===1?'\n<span class="wa">07:30 recompute-counts ran before the deploy</span>':'\n10:40 recompute-counts: 11,400 identities rebuilt ✓'):''))},
        {p:REC+'operation/deployment-execution/smoke-test-results.md',b:()=>L([setFix()?'one lender, 5 retries → no ID-VEL-02 ✓':'<span class="no">one lender, re-check next day → ID-VEL-02 fires ✗</span>',dv('2.3.fixed')===2?'<span class="no">seeded 4-lender ring → no flag ✗ (threshold is 5)</span>':'seeded 3-lender ring → ID-VEL-02 ✓','p99 143 ms ✓'])}],
 pre:[['PIP','Ready to deploy the fix to prod. The deploy window is a human call.']],
 post:[['PIP','Writing the deployment log and smoke test results.']],
 finds:()=>dv('4.3.window')===1?[{by:'PIP',t:'A Friday 17:00 deploy of a counter change and a data job, with month end nine days away and nobody watching over the weekend.',src:'deployment-log.md:L1',fix:'4.3.window',ch:'Move to Tuesday 10:00'}]:[]},

'4.4':{
 dec:['4.4.alarm'],
 files:[{p:REC+'operation/observability-setup/alarms.md',b:()=>L(pk('4.4.alarm',[['<b>ID-VEL-02 flag rate per lender vs its own 4-week baseline: outside ±40% → page</b>','existing latency and error burn-rate alarms (unchanged)'],['existing latency and error burn-rate alarms (unchanged)']]))},
        {p:REC+'operation/observability-setup/slo-config.md',b:()=>PRE('slo: network-check-availability  target: 99.9%  window: 30d   # unchanged\nslo: network-check-latency      p99 < 150ms                # unchanged')},
        {p:REC+'operation/observability-setup/dashboards.md',opt:1,b:()=>L(['Network Velocity: hits/s, ID-VEL-00 rate, p99, throttles',dv('4.4.alarm')===0?'<b>new panel: flag rate by lender, with baseline band</b>':null])}],
 pre:[['OPS','Reviewing what the dashboards showed while this bug was live. Every existing panel was green.']],
 post:[['OPS','Writing alarms and dashboards.']],
 finds:()=>dv('4.4.alarm')===1?[{by:'OPS',t:'Nothing watches what ID-VEL-02 says. The next wrong-answer bug will also be found by a lender.',src:'alarms.md:L1',fix:'4.4.alarm',ch:'Alarm on flag rate per lender'}]:[]},
};

/* ---------- the incident: month end, when every gateway retries at once ---------- */
function incident(D){
  const kind=D['2.3.fixed']===2?'ring':setFix()?'retry':'next';
  const W1={
    retry:{n:'Month-end retry burst',sev:45,sym:'Lender gateways are retrying six times as often while brokers push the month\'s pending applications. The flag rate is steady.',rc:'Pure retry volume. Each lender counts once now, so the counter is not fooled; the API just needs room.'},
    next:{n:'Flags on next-day rechecks',sev:85,sym:'ID-VEL-02 is firing for applicants that one lender checked last week and checked again today.',rc:'The fix only ignores repeats within 5 minutes (2.3). A recheck days later still counts as another lender.'},
    ring:{n:'Rings under the threshold',sev:95,sym:'Fraud ops has confirmed a ring that used four lenders this week. ID-VEL-02 never fired.',rc:'Raising the threshold to 5 (2.3) hid the retries and the rings together.'},
  }[kind];
  const sib=D['3.5.sibling']===1?15:0;
  const order=D['4.1.order']===1,data=D['2.3.data'];
  const staleOk=data===0&&!order;
  const reconOk=!!S.flags.cq08;
  const waves=[
    {id:kind,...W1,sev:W1.sev+sib,chart:kind==='retry'?'rps':'err'},
    {id:'stale',n:data===2?'Missing evidence':'Stale counters',sev:data===2?75:80,chart:'err',
     sym:data===2?'Fraud ops reports identities from a known ring coming back clean.':'Applicants flagged wrongly last week are flagged again as their applications are resubmitted. Manual review queues are filling.',
     rc:data===2?'The counters for 11,400 identities were deleted (2.3), and the genuine sightings went with them.':order?'The recompute ran before the code fix (4.1), so retries inflated the corrected counts again.':'The inflated counts were left to age out (2.3). They have days still to run.',
     auto:staleOk,autoLog:'The recompute job rebuilt these counters from the sighting log on deploy day. Nothing stale is left to flag.'},
    {id:'recon',n:'Counts jump overnight',sev:70,chart:'err',sym:'At 02:00 the counts rose for 3,100 identities that had no new applications.',
     rc:stale()?'A nightly reconciliation job also writes to the counter. The stale codekb (2.1) never showed it.':'The nightly reconciliation job also writes to the counter. FR-4 said to fix it, and no code was ever written for FR-4.',
     auto:reconOk,autoLog:'The reconciliation job was moved onto the distinct-lender write (FR-4). It ran at 02:00 and inflated nothing.'},
  ];
  const abil=[
   {id:'investigate',n:'Investigate',ag:'OPS',role:'ops',cast:()=>D['4.4.alarm']===0?1:2,cd:0,util:1,d:'Read the flag-rate panels and traces to find the cause.',src:()=>D['4.4.alarm']===0?'4.4: flag rate per lender is on a dashboard (fast)':'always available'},
   {id:'hotfix',n:'Hotfix: count lenders as a set',ag:'DEV',role:'eng',cast:6,cd:15,d:'Replace the number with the set of lenders seen, and restore the threshold.',dmg:{next:100,ring:100,retry:10},src:()=>'always available (slow)'},
   {id:'recompute',n:'Recompute counts',ag:'DEV',role:'eng',cast:()=>data===0?3:7,cd:12,d:'Rebuild affected counters from the sighting log.',dmg:{stale:100,recon:45,next:20},src:()=>data===0?'2.3: the recompute job already exists (fast)':'always available (slow: written during the incident)'},
   {id:'pause',n:'Pause the reconcile job',ag:'PIP',role:'ops',cast:2,cd:10,d:'Stop the nightly job from writing to the counter.',dmg:{recon:100},src:()=>'always available'},
   {id:'backoff',n:'Enforce retry backoff',ag:'DSO',role:'sec',cast:3,cd:10,d:'Rate-limit repeat calls per lender at the gateway.',dmg:{retry:80,next:15},src:()=>'always available'},
   {id:'scale',n:'Scale out',ag:'AWS',role:'ops',cast:4,cd:10,d:'Raise capacity and concurrency.',dmg:{retry:55},src:()=>'always available'},
   {id:'clear',n:'Bulk-clear wrong flags',ag:'QA',role:'po',cast:2,cd:0,once:1,util:1,d:'Withdraw the flags on assessments already known to be affected.',dmg:{stale:50,next:35,_:15},req:()=>D['2.3.tell']===0,src:()=>D['2.3.tell']===0?'2.3: lenders already hold their affected-assessment lists':'needs the affected-assessment lists (2.3)'},
   {id:'rollback',n:'Roll back the fix',ag:'PIP',role:'ops',cast:()=>[3,2,8][D['4.1.strategy']??2],cd:0,once:1,util:1,d:'A blunt fix: ends the incident, and the retry bug is live again.',src:()=>'4.1: '+(['canary (~3 s)','blue/green (~2 s)','all-at-once (~8 s)'][D['4.1.strategy']??2])},
   {id:'notify',n:'Notify lenders',ag:'PRD',role:'po',cast:()=>D['2.3.tell']===0?1:2,cd:0,once:1,util:1,d:'Tell lenders which flags to distrust until this is over.',src:()=>D['2.3.tell']===0?'2.3: lender contacts and lists are ready (fast)':'always available'},
   {id:'escalate',n:'Page incident commander',ag:'DLV',role:'pm',cast:2,cd:0,once:1,util:1,d:'An IC coordinates the response, so all casts are 40% faster.',src:()=>'always available'},
  ];
  return {
    h:'Month-end resubmission wave',
    p:'Month end. Brokers push every pending application, and lender gateways retry hard. The fix has been live for a week. Flag-rate alarms are firing.',
    unshipped:'Month end. Brokers push every pending application, and lender gateways retry hard. Flag-rate alarms are firing.',
    comms:'Lenders who know which flags to distrust can keep lending.',
    abil,waves,rps:5200,
    logs:{notify:'Lenders told which ID-VEL-02 flags to send to manual review rather than decline.',rollback:'Rolled back. The original retry bug is live again, and Kestrel\'s ticket reopens.'},
    result:{won:'All three waves handled. ID-VEL-02 kept counting lenders, not requests.',rollback:'The incident is over, but the fix is out and the bug it fixed is back.',breach:'The error budget ran out. Lenders spent month end reviewing flags they could not trust.'},
    score:{notified:['Lenders notified','Lenders never notified'],rolled:'Fix rolled back'},
    why(){const it=[];
      it.push([`Wave 1 was <b>${W1.n.toLowerCase()}</b>`,kind==='retry'?'good':'bad',kind==='retry'?(D['2.3.fixed']===0?'2.3 defined fixed as one count per lender, so month-end retries were only load.':'The replay in 3.6 failed the 5-minute rule and forced the real fix before it shipped.'):kind==='next'?'2.3 defined fixed as "ignore repeats within 5 minutes", and nothing replayed real traffic to show that it was not enough.':'2.3 raised the threshold instead of fixing the count.']);
      if(sib)it.push(['Severity +15: ID-VEL-01 changed without a test','bad','3.5 widened the fix to a second signal that had no requirement in this intent.']);
      it.push([staleOk?'Stale counters were already repaired':data===2?'Deleted counters hid a real ring':'Stale counters flagged honest applicants again',staleOk?'good':'bad',data===0?(order?'4.1 ran the recompute before the code fix.':'2.3 chose to recompute, and 4.1 shipped the code first.'):data===1?'2.3 left the inflated counts to age out.':'2.3 deleted the counters.']);
      it.push([reconOk?'The reconcile job had been fixed too':'The reconcile job re-inflated the counts',reconOk?'good':'bad',reconOk?'The traceability sensor at 3.5 caught that FR-4 had no code behind it, and someone asked for the fix.':stale()?'2.1 trusted a stale codekb, so the second writer was never found.':scope().sensors?'The traceability sensor flagged FR-4 at 3.5, and it was accepted as risk.':`The ${scope().n} scope runs no sensors, so nothing noticed that FR-4 was never built.`]);
      return it},
  };
}

function debrief(C2,D){
  C2('2.1',D['2.1.scan']!==2,D['2.1.scan']===2?'The fix was planned against a three-week-old map of the code.':'Rescanning before fixing found the cause and the second writer.');
  C2('2.3',D['2.3.fixed']===0,D['2.3.fixed']===0?'"Each lender counts once" was a definition of fixed that a test could prove.':D['2.3.fixed']===1?'"Ignore repeats within 5 minutes" fixed one retry pattern, not the rule.':'Raising the threshold hid the bug and weakened the signal.');
  C2('2.3',D['2.3.data']===0,D['2.3.data']===0?'Recomputing the counts cleared the applicants the bug had already flagged.':'The code was fixed and the damaged data was not.');
  C2('2.3',D['2.3.tell']===0,D['2.3.tell']===0?'Lenders got the IDs of their affected assessments and could correct their own decisions.':'Lenders could not tell which of their decisions rested on a wrong flag.');
  if(!stale())C2('SENS',!!S.flags.cq08,S.flags.cq08?'The traceability sensor caught a requirement with no code behind it (FR-4, the reconciliation job).':'FR-4 (the reconciliation job) was written down and never built.');
  if(D['3.5.sibling']!==undefined)C2('3.5',D['3.5.sibling']===0,D['3.5.sibling']===0?'The same defect in ID-VEL-01 went to the backlog as its own bugfix.':D['3.5.sibling']===1?'The fix grew to cover a second signal that nobody had specified or tested.':'A second copy of the defect was found and then forgotten.');
  if(D['3.6.proof']!==undefined)C2('3.6',D['3.6.proof']===0,D['3.6.proof']===0?'Replaying the traffic that exposed the bug made Build and Test real evidence.':'The fix shipped on the same unit tests that had passed when the bug shipped.');
  if(D['4.1.order']!==undefined)C2('4.1',D['4.1.order']===0,D['4.1.order']===0?'Code first, then recompute: the corrected data stayed correct.':'Recomputing before the code fix let retries undo the correction.');
  if(D['4.4.alarm']!==undefined)C2('4.4',D['4.4.alarm']===0,D['4.4.alarm']===0?'An alarm on flag rate per lender watches what the service says, not only whether it answers.':'Every alarm still watches latency and errors, which this bug never touched.');
}

return {
 id:'bug',n:'The Retry Bug',kind:'production bug',col:'#FF9F5A',
 tag:'ID-VEL-02 is flagging honest applicants whose lender retried a timed-out call.',
 d:'Three weeks after Network Velocity shipped, Kestrel Finance reports honest applicants sent to manual review. Its gateway retries a slow /assess call, and the network counter treats every retry as another lender. Find it, say what fixed means, fix it and ship it.',
 ask:ASK,intent:'vel02-retry-double-count',REC,KB,
 boot:{repo:'aegle-api',ws:'brownfield · TypeScript + Python · 16,940 LOC · codekb found (21 days old)',note:'ID-VEL-02 is live for 40 lenders. Ticket LND-2291 is open: honest applicants are being flagged.'},
 scopes:['bugfix','refactor','express'],best:'bugfix',
 fit:{
  bugfix:{v:'best',t:'One defect with a known symptom: read the code, say what fixed means, change it, test it, ship it. Reviewers and sensors still check the work.'},
  refactor:{v:'ok',t:'The bugfix path plus Functional Design. More than this fix needs, but it pins the counting rule down before the code moves.'},
  express:{v:'poor',t:'No reviewers, no sensors and no plan approval. Nothing checks a change to a live fraud signal before 40 lenders get it.'},
 },
 composer:{E:[.18,.44,.52,.41,.30],why:'Intent ambiguity is low: the symptom is known and reproducible. The uncertainty sits in the code (a three-week-old knowledge base) and in how the fix is verified. Bugfix keeps the code scan, a reviewer and the sensors. Express would drop every check, and Refactor adds a design stage this fix can live without.'},
 DEC,stages,units,
 midBuild:{unit:'aegle',dec:'3.5.sibling'},
 loopBack(){
  if(dv('3.6.proof')!==0||setFix())return null;
  S.flags.setFix=true;
  return {why:dv('2.3.fixed')===1?'Replay failure: 212 of Kestrel\'s applicants are still flagged. Their lender re-checked them the next morning, well outside the 5-minute window.':'Replay failure: 38 single-lender applicants are still flagged. Their gateway retried five times or more, so they clear even the raised threshold.',
          fixed:'Second run: green. The counter now stores the set of lenders seen, so no number of repeats can raise it.'}},
 deploy:{what:'the counter fix',all:'No blast-radius control: every lender got the new counter in the same second.'},
 traceGap:()=>S.ran.has('3.5')&&!stale()&&!S.flags.cq08,
 humanSensor:'3.5',
 badge:{ic:'🧮',n:'Cause, Not Symptom',d:'Define fixed as the behaviour, prove it with the traffic that broke it, and repair the data.',test:()=>S.dec['2.3.fixed']===0&&S.dec['3.6.proof']===0&&S.dec['2.3.data']===0},
 incident,debrief,
};
})();
