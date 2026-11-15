/* Scenario: advisory AEG-SEC-014. A leaked CI credential could use the key that turns identities into fingerprints.
   Written for the stages that security-patch, bugfix and express run. Everything here is story. */
SCENARIOS.secpatch=(()=>{
const REC='aidlc/spaces/identity/intents/261209-sec-014-fingerprint-key/';
const KB='aidlc/spaces/identity/codekb/aegle-api/';
const ASK='Patch advisory AEG-SEC-014: revoke the leaked CI credential, restrict the fingerprint key and rotate it';
const blindScan=()=>dv('2.1.callers')===1;
/* How the key ends up being rotated: 'dual' (both keys readable for 14 days), 'hard' (switch and forget) or 'none'. */
const rotation=()=>dv('2.3.done')!==0||dv('3.2.rotate')===2?'none':dv('3.2.rotate')===0?'dual':'hard';
const grantClosed=()=>dv('2.3.done')!==2&&(dv('3.5.grant')!==2||!!S.flags.grantFix);

const DEC={
 '2.1.callers':{own:'sec',by:'DEV',q:'The repository shows three places that call the fingerprint key. Is the code enough to know who uses it?',ctx:'Reverse Engineering scans the repository. A key can also be used by things that are in no repository.',o:[
  {t:'No: compare the code scan with 90 days of CloudTrail for the key',s:10,q:5,fb:'CloudTrail shows a fourth caller that is in no repository: the fraud-ops ring notebook, running under a shared analyst role.'},
  {t:'Yes. The repository is the source of truth.',s:2,r:10,fb:'Three call sites found. Anything that uses the key from outside the repository is not in the scan.'}]},
 '2.3.done':{own:'sec',by:'PRD',q:'What does "patched" mean for AEG-SEC-014?',ctx:'The leaked credential was revoked 40 minutes ago. The requirements say what else has to be true.',o:[
  {t:'Credential revoked, the key usable only by named roles, the key rotated, and evidence of every use during the exposure',s:10,q:5,r:-10,fb:'Each part closes something different: the door, the lock, what was already taken, and what you can prove.'},
  {t:'Credential revoked and the key policy tightened. Rotation can wait for the yearly schedule.',s:3,r:10,fb:'Whoever held the credential may have kept what the key produced. Until the key rotates, every fingerprint they computed stays valid.'},
  {t:'Credential revoked. That closes the hole.',s:0,r:20,fb:'It closes one door. The wildcard grant that let a CI role use the key is still there for the next leaked credential.'}]},
 '2.3.tell':{own:'po',by:'PRD',q:'The data-sharing agreement gives lenders 72 hours\' notice of a security event involving shared data. The clock started at 09:12 today. Do we tell them now?',ctx:'Nothing so far shows that a fingerprint left our systems. Nothing shows that none did.',o:[
  {t:'Yes: tell all 40 lenders now what we know, and follow up when the patch is live',s:10,r:-5,fb:'Inside the agreement, and lenders hear it from you before they hear it from anyone else.'},
  {t:'Wait until the patch is live, then tell them once',s:4,r:5,fb:'One clean message, if the patch lands inside 72 hours. If anything slips, you have breached the agreement as well.'},
  {t:'No. Nothing left our systems, so there is nothing to tell.',s:0,r:15,fb:'You cannot show that. The agreement asks for notice of the event, not of proven harm.'}]},
 '3.2.rotate':{own:'sec',by:'ARC',q:'A new key means new fingerprints. The 14-day counters are keyed by fingerprint, and we do not keep the identities to re-key them. How do we rotate?',ctx:'NFR Requirements writes the security requirement down before anyone touches the key. The bugfix scope skips this stage.',o:[
  {t:'Dual-key window: write with the new key, read with both, retire the old key after 14 days',s:10,q:5,r:-10,fb:'ID-VEL-02 keeps its memory through the rotation, and the old key dies on a known date.'},
  {t:'Hard cutover: switch to the new key and let the counters rebuild',s:2,r:15,fb:'For 14 days every identity looks new. A ring that started last week becomes invisible again.'},
  {t:'Keep the key. The policy is tight now.',s:0,r:20,fb:'Everything computed with the key during the exposure stays valid for as long as the key lives.'}]},
 '3.2.latency':{when:()=>dv('3.2.rotate')===0,own:'ops',by:'ARC',q:'Reading with two keys doubles the KMS calls on the assessment path for 14 days. What budget does the rotation get?',ctx:'The network check has an SLO: p99 under 150 ms. Today it runs at 141 ms.',o:[
  {t:'Stay inside 150 ms: cache the data keys per request, and measure before and after',s:10,fb:'The rotation costs lenders nothing they can see.'},
  {t:'Accept the extra latency for 14 days',s:3,r:5,fb:'p99 moves to about 190 ms: outside the SLO for two weeks, by decision.'}]},
 '3.5.grant':{own:'eng',by:'DEV',q:'The wildcard that exposed the key lives in a shared CDK construct used by 11 other stacks. Where do I fix it?',ctx:'A question raised mid-build. The agent stops to ask instead of widening the patch by itself.',o:[
  {t:'Scope the grant in our stack now, and open a separate intent for the shared construct',s:10,fb:'The patch stays small and urgent. The wider cleanup gets its own plan and its own review.'},
  {t:'Rewrite the shared construct in this patch',s:3,r:10,fb:'An urgent security patch now redeploys 11 stacks that nobody planned to touch this week.'},
  {t:'Leave the wildcard and add an explicit deny for the CI role',s:0,r:10,fb:'The next role created under that wildcard gets the key again.'}]},
 '3.6.neg':{own:'sec',by:'QA',q:'How do we prove the key is closed?',ctx:'Build and Test is the evidence. The advisory was about who could use the key, not about whether the service works.',o:[
  {t:'Negative tests: assume every other role in the account, and show that each one is denied',s:10,q:5,fb:'A test that would have failed before the patch. It also tells you exactly who is now locked out.'},
  {t:'Show that the fingerprint service can still use the key',s:2,r:10,fb:'That proves the door opens for the right role. The advisory was about who else it opens for.'}]},
 '4.1.strategy':{own:'ops',by:'PIP',q:'How does the patch reach production?',ctx:'This decides how quickly and safely you can undo a key change.',o:[
  {t:'Canary 5% → 25% → 100%, rolling back automatically if fingerprint errors appear',s:10,fb:'A key change with a half-way point where you can still stop.'},
  {t:'Blue/green switch',s:6,fb:'Fast to flip back, but every assessment changes keys in the same second.'},
  {t:'All at once. It is urgent.',s:0,r:10,fb:'Urgent changes are the ones that most need a way back.'}]},
 '4.3.window':{own:'pm',by:'PIP',q:'The patch is ready at 15:30. When does it ship?',ctx:'The 72-hour notice clock runs out tomorrow at 09:12.',o:[
  {t:'Today at 16:00, with the whole team online',s:10,fb:'If the rotation misbehaves, everyone who understands it is watching.'},
  {t:'Tonight at 23:30, when traffic is lowest',s:0,r:10,fb:'The lowest traffic, and one person awake to watch a key rotation.'}]},
 '4.4.alarm':{own:'ops',by:'OPS',q:'The exposure ran for six days before Theo found it by hand. What tells us next time?',ctx:'Observability Setup.',o:[
  {t:'An alarm whenever any principal outside the allowed list calls the key',s:10,q:5,fb:'The next unexpected caller pages someone within minutes.'},
  {t:'A weekly report of key usage',s:3,fb:'The last exposure ran for six days. A weekly report finds the next one after it is over.'}]},
};

const units=()=>[{id:'aegle-api',kind:'service + infra',st:'(no Units in this scope)',plan:'restrict the fingerprint key and rotate it',files:11,tests:37}];
const rotTxt=()=>({dual:'dual-key window: write new, read both, retire the old key after 14 days',hard:'<span class="wa">hard cutover: switch keys, counters rebuild from zero</span>',none:'<span class="no">key not rotated</span>'})[rotation()];

const stages={
...initStages(REC,{ask:ASK,intent:'sec-014-fingerprint-key (AEG-SEC-014)',ws:'brownfield · TypeScript 5 · Node 20 · AWS CDK · repo <code>aegle-api</code> (codekb found)'}),

'2.1':{
 why:'You cannot restrict a key until you know everything that uses it.',
 dec:['2.1.callers'],
 files:[
  {p:KB+'code-quality-assessment.md',b:()=>T(['ID','Finding','Where'],[['<b class="wa">SEC-1</b>','<b>shared CI role is granted <code>kms:*</code> on <code>alias/aegle-*</code></b>','infra/constructs/ci-role.ts:27'],['SEC-2','the fingerprint key policy delegates everything to IAM','infra/kms.ts:14'],['SEC-3','three call sites for GenerateMac: fingerprint-svc, reconcile job, recompute job','src/, jobs/'],blindScan()?null:['<b class="wa">SEC-4</b>','<b>a fourth caller in no repository: the fraud-ops ring notebook, role <code>analyst-shared</code></b>','CloudTrail, 90 d']])+P('Exposure: 41,200 GenerateMac calls from 203.0.113.77 between 3 and 9 December '+SRC('CloudTrail')+'.')},
  {p:KB+'dependencies.md',b:()=>L(['KMS <code>alias/aegle-fp-hmac</code> ← fingerprint-svc','KMS <code>alias/aegle-fp-hmac</code> ← jobs/reconcile, jobs/recompute-counts',blindScan()?'<span class="muted">external callers: not checked</span>':'KMS <code>alias/aegle-fp-hmac</code> ← <b>fraud-ops notebook</b> <span class="wa">(not in any repository)</span>'])},
  {p:KB+'reverse-engineering-timestamp.md',opt:1,b:()=>P('Diff scan at 2026-12-09T09:58Z: infra/, src/fingerprint/ and jobs/.'+(blindScan()?'':' Cross-checked against CloudTrail for the key, 90 days.'))}],
 pre:[['DEV','Scanning for everything that touches <code>alias/aegle-fp-hmac</code>: grants, policies and call sites.'],['DEV','Found the grant: the shared CI role has <code>kms:*</code> on every aegle key. Flagging it as SEC-1.']],
 post:[['DEV','Findings written to the space-level codekb.']],
 finds:()=>blindScan()?[{by:'DEV',t:'The scan lists who can call the key according to the code. Nobody has checked who actually did.',src:'dependencies.md:L3',fix:'2.1.callers',ch:'Cross-check callers against CloudTrail'}]:[]},

'2.3':{
 dec:['2.3.done','2.3.tell'],
 files:[{p:REC+'inception/requirements-analysis/requirements.md',b:()=>H('Advisory')+P('AEG-SEC-014 · HIGH. A CI access key appeared in a public build log. It could call the key that turns identities into fingerprints.')+H('Security requirements')+L(['SR-1: the leaked credential is revoked <span class="ok">(done 09:12)</span>','SR-2: key policy: '+pk('2.3.done',['usable only by named roles','usable only by named roles','<span class="no">unchanged</span>']),'SR-3: key rotation: '+pk('2.3.done',['rotated in this patch','<span class="wa">left for the yearly schedule</span>','<span class="no">none</span>']),'SR-4: evidence: '+pk('2.3.done',['every use of the key from 3 to 9 December accounted for','<span class="muted">none required</span>','<span class="muted">none required</span>']),'SR-5: lenders: '+pk('2.3.tell',['told today, inside the 72-hour window','<span class="wa">told once the patch is live</span>','<span class="no">not told</span>']),S.flags.fourth?'<b>SR-6: the fraud-ops notebook gets its own role and its own scoped grant</b> '+SRC('SEC-4'):null])},
        {p:REC+'inception/requirements-analysis/traceability.json',opt:1,b:()=>PRE('{ "SR-2": ["SEC-1", "SEC-2"], "SR-3": ["AEG-SEC-014"], "SR-5": ["DSA §7.1"]'+(S.flags.fourth?', "SR-6": ["SEC-4"]':'')+' }')}],
 pre:[['PRD','Writing down what "patched" means, and who has to be told. Two questions need humans.']],
 post:[['PRD','Writing <code>requirements.md</code> and <code>traceability.json</code>.'],['PLR','Reviewing the requirements against the advisory…']],
 sfail:()=>blindScan()||S.flags.fourth?null:{s:'upstream-coverage',t:'requirements.md never references finding SEC-4 from the code scan: a fourth caller uses the key from outside the repository.',src:'requirements.md → code-quality-assessment.md:SEC-4',key:'fourth',ch:'Cover the fraud-ops notebook (SEC-4)',fixmsg:'SR-6 added: the notebook gets its own role and a scoped grant. Sensor re-run: pass.'},
 finds:()=>{const f=[];
  if(dv('2.3.done')===1)f.push({by:'PLR',t:'Without rotation, anything computed with the key during the six-day exposure stays valid until next year.',src:'requirements.md:SR-3',fix:'2.3.done',ch:'Include key rotation in the patch'});
  if(dv('2.3.done')===2)f.push({by:'PLR',t:'Revoking one credential leaves SEC-1 open: any CI role can still use the key.',src:'requirements.md:SR-2',fix:'2.3.done',ch:'Restrict the key and rotate it'});
  if(dv('2.3.tell')===2)f.push({by:'PLR',t:'DSA §7.1 requires notice of the event within 72 hours, whether or not harm is shown.',src:'requirements.md:SR-5',fix:'2.3.tell',ch:'Notify all 40 lenders today'});
  return f}},

'3.2':{
 dec:['3.2.rotate','3.2.latency'],
 files:[{p:REC+'construction/nfr-requirements/security-requirements.md',b:()=>L(['Key use: '+(dv('2.3.done')===2?'<span class="no">unchanged</span>':'GenerateMac allowed for named roles only; everything else denied in the key policy'),'Rotation: '+pk('3.2.rotate',['dual-key window: write with the new key, read with both, retire the old key on day 14','<span class="wa">hard cutover; counters rebuild from zero</span>','<span class="no">none</span>']),'Evidence: CloudTrail for the key retained 400 days'])},
        {p:REC+'construction/nfr-requirements/performance-requirements.md',b:()=>L(['Network check SLO: p99 &lt; 150 ms (today 141 ms)',dv('3.2.rotate')===0?'During the dual-key window: '+pkd('3.2.latency',['stay inside the SLO; data keys cached per request','<span class="wa">about 190 ms accepted for 14 days</span>'],'not decided yet'):'No change expected'])},
        {p:REC+'construction/nfr-requirements/observability-requirements.md',opt:1,b:()=>L(['Count of GenerateMac calls by principal','Count of fingerprints matched with the old key, by day'])}],
 pre:[['ARC','NFR requirements for the patch. The hard one is rotation: the counters are keyed by fingerprint, and the identities behind them are not stored anywhere.']],
 post:[['ARC','Writing the security and performance requirements.'],['ARV','Reviewing the NFR requirements…']],
 finds:()=>{const f=[];
  if(dv('3.2.rotate')===1)f.push({by:'ARV',t:'A hard cutover orphans every counter. ID-VEL-02 cannot see any ring that began in the last 14 days.',src:'security-requirements.md:L2',fix:'3.2.rotate',ch:'Rotate through a dual-key window'});
  if(dv('3.2.rotate')===2)f.push({by:'ARV',t:'Requirement SR-3 says the key is rotated in this patch. This stage says it is not.',src:'security-requirements.md:L2',fix:'3.2.rotate',ch:'Rotate through a dual-key window'});
  if(dv('3.2.latency')===1)f.push({by:'ARV',t:'190 ms breaks the network-check SLO for 14 days. Caching data keys per request avoids it.',src:'performance-requirements.md:L2',fix:'3.2.latency',ch:'Cache data keys and stay inside 150 ms'});
  return f}},

'3.5':{
 files:[{p:REC+'construction/code-generation/code-generation-plan.md',b:()=>P('This scope has no Units Generation, so there are no Units: one plan for the one change.')+L(['<code>infra/kms.ts</code>: '+(dv('2.3.done')===2?'<span class="no">no change</span>':'key policy names the allowed roles and denies everyone else'),'<code>infra/constructs/ci-role.ts</code>: '+pk('3.5.grant',['grant scoped in this stack; shared construct goes to the backlog','<span class="wa">shared construct rewritten (11 stacks redeploy)</span>',S.flags.grantFix?'grant scoped in this stack (after the negative test failed)':'<span class="no">wildcard kept; explicit deny for the CI role</span>'],0),'<code>src/fingerprint/</code>: '+rotTxt()+(dv('2.3.done')===0&&dv('3.2.rotate')===undefined?' <span class="wa">(no rotation requirement was written: NFR Requirements is not in this scope)</span>':''),'Fraud-ops notebook: '+(S.flags.fourth?'own role, own scoped grant '+SRC('SR-6'):blindScan()?'<span class="muted">not known to this plan</span>':'<span class="wa">not in the requirements; no grant planned</span>')])},
        {p:REC+'construction/code-generation/code-summary.md',b:()=>T(['Change','Files','Tests'],[['key policy and grants',4,12],rotation()==='none'?null:['key rotation ('+rotation()+')',5,19],S.flags.fourth?['notebook role',2,6]:null,dv('3.5.grant')===1?['<span class="wa">shared CI construct (11 stacks)</span>',9,4]:null])},
        {p:REC+'construction/code-generation/unit-test-instructions.md',opt:1,b:()=>PRE('npm test -- --coverage\nnpm run test:policy   # assumes each role and calls kms:GenerateMac')}],
 pre:[['DEV','Drafting the code plan. No code is written until the plan is approved.']],
 post:[['DEV','Patch generated. Writing <code>code-summary.md</code>.'],['ARV','Reviewing the diff against the security requirements…']],
 sfail:()=>({s:'required-sections',t:'code-summary.md is missing a required H2 heading.',src:'code-summary.md',auto:'DEV',fixmsg:'Heading restored. Sensor re-run: pass.'}),
 finds:()=>dv('3.5.grant')===1?[{by:'ARV',t:'The diff redeploys 11 stacks that have nothing to do with this advisory.',src:'infra/constructs/ci-role.ts',fix:'3.5.grant',ch:'Scope the grant here; backlog the construct'}]:dv('3.5.grant')===2&&!S.flags.grantFix?[{by:'ARV',t:'An explicit deny names one role. The wildcard still gives the key to any role created tomorrow.',src:'infra/constructs/ci-role.ts:27',fix:'3.5.grant',ch:'Scope the grant here; backlog the construct'}]:[]},

'3.6':{
 dec:['3.6.neg'],
 files:[{p:REC+'construction/build-and-test/test-results.md',b:()=>T(['Suite','Result'],[['unit','<span class="ok">489 passed</span>'],['integration','<span class="ok">43 passed</span>'],['policy: fingerprint-svc can use the key','<span class="ok">allowed</span>'],['policy: every other role is denied',pk('3.6.neg',[grantClosed()?'<span class="ok">36 of 36 denied</span>':'<span class="no">a new role under the wildcard is allowed</span>','<span class="wa">not run</span>'])],rotation()==='dual'?['rotation: old-key fingerprints still match','<span class="ok">pass</span>']:null])},
        {p:REC+'construction/build-and-test/build-instructions.md',opt:1,b:()=>PRE('npm ci && npm run build && npm test'+(dv('3.6.neg')===0?' && npm run test:policy':''))}],
 pre:[['QA','Building, then running the unit and integration suites.'],['QA','One question first: what counts as proof that the key is closed?']],
 post:[['QA','Writing <code>test-results.md</code>.']],
 finds:()=>dv('3.6.neg')===1?[{by:'QA',t:'No test shows that anyone is denied. The build proves only that the service still works.',src:'test-results.md:L4',fix:'3.6.neg',ch:'Add negative tests for every other role'}]:[]},

'4.1':{
 dec:['4.1.strategy'],
 files:[{p:REC+'operation/deployment-pipeline/deployment-strategy.md',b:()=>P(pk('4.1.strategy',['<b>Canary</b> 5% → 25% → 100%, 10 min bake each, automatic rollback on fingerprint errors','<b>Blue/green</b> switch with instant flip-back','<b>All at once</b>']))+P('Rotation: '+rotTxt()+'.')},
        {p:REC+'operation/deployment-pipeline/rollback-runbook.md',b:()=>L(['Trigger: fingerprint errors, or ID-VEL-00 above 1%','Action: '+pk('4.1.strategy',['canary auto-rollback (~2 min)','flip to blue (~1 min)','redeploy previous (~8 min)']),rotation()==='dual'?'The old key stays enabled until day 14, so rolling back loses nothing':rotation()==='hard'?'<span class="wa">The old key is scheduled for deletion; rolling back needs it re-enabled first</span>':null])},
        {p:REC+'operation/deployment-pipeline/cd-config.md',opt:1,b:()=>PRE('pipeline: aegle-api-cd\nstages: staging → prod')}],
 pre:[['PIP','Planning how the patch reaches production, and how it comes back out.']],
 post:[['PIP','Writing the deployment strategy and rollback runbook.']],
 finds:()=>dv('4.1.strategy')===2?[{by:'PIP',t:'All-at-once gives a key change no half-way point, and rollback takes about 8 minutes.',src:'deployment-strategy.md:L1',fix:'4.1.strategy',ch:'Use a canary with auto-rollback'}]:[]},

'4.3':{
 dec:['4.3.window'],
 files:[{p:REC+'operation/deployment-execution/deployment-log.md',b:()=>PRE(pk('4.1.strategy',['15:58 canary 5%  ✓ fingerprints match\n16:08 canary 25% ✓ fingerprints match\n16:18 100%       ✓','16:00 green up ✓\n16:05 flip ✓','16:00 deploy 100% ✓'])+'\n'+({dual:'16:20 new key live · old key readable until day 14',hard:'<span class="wa">16:20 new key live · old key disabled</span>',none:'<span class="no">key unchanged</span>'})[rotation()])},
        {p:REC+'operation/deployment-execution/smoke-test-results.md',b:()=>L(['fingerprint-svc computes a fingerprint ✓',grantClosed()?'CI role calls GenerateMac → AccessDenied ✓':'<span class="no">a new CI role calls GenerateMac → allowed ✗</span>',rotation()==='hard'?'<span class="wa">seeded ring from last week → no ID-VEL-02 (counters reset)</span>':'seeded ring from last week → ID-VEL-02 ✓'])}],
 pre:[['PIP','Ready to deploy the patch to prod. The deploy window is a human call.']],
 post:[['PIP','Writing the deployment log and smoke test results.']],
 finds:()=>dv('4.3.window')===1?[{by:'PIP',t:'A key rotation at 23:30 with one engineer online, hours before the notice deadline.',src:'deployment-log.md:L1',fix:'4.3.window',ch:'Ship at 16:00 with the team online'}]:[]},

'4.4':{
 dec:['4.4.alarm'],
 files:[{p:REC+'operation/observability-setup/alarms.md',b:()=>L(pk('4.4.alarm',[['<b>any principal outside the allowed list calls the key → page</b>','existing latency and error burn-rate alarms (unchanged)'],['weekly key-usage report by email','existing latency and error burn-rate alarms (unchanged)']]))},
        {p:REC+'operation/observability-setup/slo-config.md',b:()=>PRE('slo: network-check-availability  target: 99.9%  window: 30d   # unchanged\nslo: network-check-latency      p99 < 150ms                # unchanged')},
        {p:REC+'operation/observability-setup/dashboards.md',opt:1,b:()=>L(['Fingerprint key: GenerateMac calls by principal'])}],
 pre:[['OPS','The exposure was found by a person reading a build log. I am wiring up something that does not rely on that.']],
 post:[['OPS','Writing alarms and dashboards.']],
 finds:()=>dv('4.4.alarm')===1?[{by:'OPS',t:'A weekly report cannot catch an exposure while it is happening.',src:'alarms.md:L1',fix:'4.4.alarm',ch:'Alarm on unexpected principals'}]:[]},
};

/* ---------- the incident: whoever had the credential comes back ---------- */
function incident(D){
  const rot=rotation(),closed=grantClosed(),noNfr=D['2.3.done']===0&&D['3.2.rotate']===undefined;
  const fourthOk=!!S.flags.fourth;
  const W2={
    dual:{id:'lat',n:'Dual-key latency',sev:55,chart:'p99',sym:'The network check is at <b>190 ms</b> p99 with both keys being read.',rc:'3.2 accepted the extra KMS calls for the 14-day window.',auto:D['3.2.latency']===0,autoLog:'Data keys are cached per request (3.2). p99 is 148 ms with both keys live.'},
    hard:{id:'blind',n:'Blind counters',sev:90,chart:'err',sym:'Fraud ops: a ring that hit four lenders last week has just passed clean at a fifth.',rc:noNfr?`Nobody wrote down how to rotate: NFR Requirements is not in the ${scope().n} scope. The Developer switched keys, and every counter started again from zero.`:'3.2 chose a hard cutover, so every counter started again from zero.'},
    none:{id:'valid',n:'Old fingerprints still work',sev:80,chart:'err',sym:'Requests are arriving with well-formed fingerprints for identities no lender has ever submitted.',rc:D['2.3.done']===0?'3.2 kept the old key, so everything computed during the exposure still matches.':'The key was never rotated (2.3), so everything computed during the exposure still matches.'},
  }[rot];
  const waves=[
    {id:'replay',n:closed?'Replay with the old credential':'A new role, the same key',sev:closed?50:D['2.3.done']===2?90:85,chart:'rps',
     sym:closed?'203.0.113.77 is back, calling GenerateMac a thousand times a minute.':'GenerateMac calls are succeeding from a CI role that was created yesterday.',
     rc:closed?'The same actor, trying the revoked credential and then everything near it.':D['2.3.done']===2?'Only the credential was revoked (2.3). The wildcard grant that gives any CI role the key was never closed.':'The wildcard grant is still there (3.5). The deny covered one role, and the attacker used another.',
     auto:closed,autoLog:'AccessDenied on every call: the key policy names its callers, and this is not one of them.'},
    W2,
    {id:'locked',n:'Fraud ops locked out',sev:65,chart:'err',sym:'The fraud-ops ring notebook fails with AccessDenied, in the middle of the incident it exists for.',
     rc:blindScan()?'A fourth caller uses the key from outside the repository. The code scan (2.1) could not see it, so the lockdown cut it off.':'The fourth caller was in the scan (SEC-4), and the requirements never covered it. The lockdown cut it off.',
     auto:fourthOk,autoLog:'The notebook got its own role and scoped grant in the patch (SR-6). Fraud ops is already tracing the ring.'},
  ];
  const abil=[
   {id:'investigate',n:'Investigate',ag:'OPS',role:'ops',cast:()=>D['4.4.alarm']===0?1:2,cd:0,util:1,d:'Read CloudTrail and the key metrics to find the cause.',src:()=>D['4.4.alarm']===0?'4.4: unexpected callers already page (fast)':'always available'},
   {id:'lockdown',n:'Lock the key policy down',ag:'DSO',role:'sec',cast:3,cd:10,d:'Name the allowed roles in the key policy and deny everyone else.',dmg:{replay:100},src:()=>'always available'},
   {id:'block',n:'Block the source address',ag:'DSO',role:'sec',cast:1.5,cd:8,d:'Drop the caller at the edge. It will come back from somewhere else.',dmg:{replay:45,valid:35},src:()=>'always available'},
   {id:'dualread',n:'Hotfix: read with both keys',ag:'DEV',role:'eng',cast:6,cd:15,d:'Re-enable the old key for reads so the counters remember again.',dmg:{blind:100},src:()=>'always available (slow)'},
   {id:'rotate',n:'Emergency rotation',ag:'AWS',role:'ops',cast:6,cd:15,d:'Rotate the key now, through a dual-key window.',dmg:{valid:100},src:()=>'always available (slow)'},
   {id:'cache',n:'Cache data keys',ag:'DEV',role:'eng',cast:4,cd:10,d:'Cut the extra KMS calls on the assessment path.',dmg:{lat:100},src:()=>'always available'},
   {id:'grant',n:'Grant fraud ops access',ag:'AWS',role:'sec',cast:2,cd:10,d:'Give the ring notebook its own role and a scoped grant.',dmg:{locked:100},src:()=>'always available'},
   {id:'rollback',n:'Roll back the patch',ag:'PIP',role:'ops',cast:()=>[3,2,8][D['4.1.strategy']??2],cd:0,once:1,util:1,d:'A blunt fix: ends the incident, and the advisory is open again.',src:()=>'4.1: '+(['canary (~3 s)','blue/green (~2 s)','all-at-once (~8 s)'][D['4.1.strategy']??2])},
   {id:'notify',n:'Notify lenders',ag:'PRD',role:'po',cast:()=>D['2.3.tell']===0?1:2,cd:0,once:1,util:1,d:'Tell lenders what is happening and what to distrust.',src:()=>D['2.3.tell']===0?'2.3: lenders already know about the advisory (fast)':'always available'},
   {id:'escalate',n:'Page incident commander',ag:'DLV',role:'pm',cast:2,cd:0,once:1,util:1,d:'An IC coordinates the response, so all casts are 40% faster.',src:()=>'always available'},
  ];
  return {
    h:'The credential comes back',
    p:'Day five. The address from the CloudTrail logs is calling again, and it is trying everything near the key. Alarms are firing.',
    unshipped:'Day five. The address from the CloudTrail logs is calling again. Alarms are firing.',
    comms:'Lenders who know can treat network flags with care until this is over.',
    abil,waves,
    logs:{notify:'Lenders told: an active probe against the fingerprint key, and what the team has done.',rollback:'Rolled back. The key policy is open again and AEG-SEC-014 is back to HIGH.'},
    result:{won:'All three waves handled. The key answered only to the roles named in its policy.',rollback:'The incident is over, but the patch is out and the advisory is open again.',breach:'The error budget ran out while the key was still in play.'},
    score:{notified:['Lenders notified','Lenders never notified'],rolled:'Patch rolled back'},
    why(){const it=[];
      it.push([closed?'The replay hit a closed key':'The key was still open to other roles',closed?'good':'bad',closed?'2.3 required the key policy to name its callers, and 3.5 scoped the grant.':D['2.3.done']===2?'2.3 stopped at revoking one credential.':'3.5 left the wildcard grant and denied a single role.']);
      it.push([rot==='dual'?(W2.auto?'The rotation cost lenders nothing':'The dual-key window ran outside the SLO'):rot==='hard'?'The rotation blinded ID-VEL-02':'Nothing computed during the exposure was invalidated',rot==='dual'&&W2.auto?'good':'bad',rot==='dual'?(W2.auto?'3.2 wrote the dual-key window and its latency budget before anyone touched the key.':'3.2 chose the dual-key window and accepted 190 ms for it.'):rot==='hard'?(noNfr?`The ${scope().n} scope has no NFR Requirements stage, so the rotation rule was never written.`:'3.2 chose a hard cutover.'):'The key was never rotated.']);
      it.push([fourthOk?'Fraud ops kept working':'The lockdown cut off fraud ops',fourthOk?'good':'bad',fourthOk?'The upstream-coverage sensor at 2.3 caught that SEC-4 was missing, and someone asked for the fix.':blindScan()?'2.1 trusted the repository, so the fourth caller was never found.':scope().sensors?'The upstream-coverage sensor flagged SEC-4 at 2.3, and it was accepted as risk.':`The ${scope().n} scope runs no sensors, so nothing noticed the requirements had skipped SEC-4.`]);
      return it},
  };
}

function debrief(C2,D){
  C2('2.1',D['2.1.callers']===0,D['2.1.callers']===0?'Checking CloudTrail as well as the code found a caller that is in no repository.':'The scan knew who could call the key in code, and nothing about who really did.');
  C2('2.3',D['2.3.done']===0,D['2.3.done']===0?'"Patched" meant revoke, restrict, rotate and prove: four different things.':D['2.3.done']===1?'The key was restricted but never rotated, so the exposure outlived the patch.':'Revoking one credential left the grant that exposed the key.');
  C2('2.3',D['2.3.tell']===0,D['2.3.tell']===0?'Lenders were told inside the 72 hours the agreement gives.':D['2.3.tell']===1?'Notice was tied to the patch date, with the 72-hour clock still running.':'Lenders were never told about an event the agreement says they must hear about.');
  if(D['2.1.callers']===0)C2('SENS',!!S.flags.fourth,S.flags.fourth?'The upstream-coverage sensor caught a finding the requirements had skipped (SEC-4).':'The fourth caller (SEC-4) never made it into the requirements.');
  if(D['2.3.done']===0)C2('3.2',rotation()==='dual',D['3.2.rotate']===undefined?`NFR Requirements is not in the ${scope().n} scope, so nobody wrote down how to rotate a key that every counter depends on.`:rotation()==='dual'?'A dual-key window rotated the key without costing ID-VEL-02 its 14-day memory.':'The rotation rule that was written still lost the counters or kept the key.');
  if(D['3.5.grant']!==undefined)C2('3.5',D['3.5.grant']===0,D['3.5.grant']===0?'The grant was fixed where it mattered, and the shared construct went to the backlog.':D['3.5.grant']===1?'An urgent patch grew to redeploy 11 unrelated stacks.':'An explicit deny for one role left the wildcard for the next one.');
  if(D['3.6.neg']!==undefined)C2('3.6',D['3.6.neg']===0,D['3.6.neg']===0?'Negative tests proved who is locked out, which is what the advisory was about.':'The build proved the service still works, not that anyone is denied.');
  if(D['4.4.alarm']!==undefined)C2('4.4',D['4.4.alarm']===0,D['4.4.alarm']===0?'An unexpected caller on the key now pages someone within minutes.':'The next exposure will be found by a weekly report, after it is over.');
}

return {
 id:'secpatch',n:'Advisory AEG-SEC-014',kind:'security advisory',col:'var(--red)',
 tag:'A leaked CI credential could use the key that turns identities into fingerprints.',
 d:'Theo finds a CI access key in a public build log. CloudTrail shows 41,200 calls to the fingerprint key from an address nobody recognises. Revoke, restrict and rotate, without costing ID-VEL-02 the 14 days its counters remember, and inside the 72 hours lenders are owed notice.',
 ask:ASK,intent:'sec-014-fingerprint-key',REC,KB,
 boot:{repo:'aegle-api',ws:'brownfield · TypeScript + Python · 17,120 LOC · codekb found',note:'Advisory AEG-SEC-014 is open, severity HIGH. The leaked credential was revoked 40 minutes ago.'},
 scopes:['security-patch','bugfix','express'],best:'security-patch',
 fit:{
  'security-patch':{v:'best',t:'The bugfix path plus NFR Requirements, so the security requirement is written down before the patch. Reviews run at full strength.'},
  bugfix:{v:'poor',t:'Treats the advisory as a defect. No stage writes down how to rotate the key, and reviews are capped at advisory.'},
  express:{v:'poor',t:'The fastest way to production, with no reviewer, no sensors and no security requirement. A key rotation with nothing checking it.'},
 },
 composer:{E:[.22,.38,.61,.83,.44],why:'Risk is HIGH (0.83 ≥ 0.70): a key that every lender\'s fingerprints depend on, and a 72-hour notice clock. Security-patch is the bugfix path plus NFR Requirements, which is where the rotation rule gets written before anyone touches the key. Bugfix skips that stage. Express skips it and every check as well.'},
 DEC,stages,units,
 midBuild:{unit:'aegle',dec:'3.5.grant'},
 loopBack(){
  if(dv('3.6.neg')!==0||grantClosed()||dv('2.3.done')===2)return null;
  S.flags.grantFix=true;
  return {why:'Policy test failure: a role created under the CI wildcard can still call GenerateMac. The explicit deny names one role, and the test made another.',fixed:'Second run: green. The grant is scoped to this stack, and 36 of 36 other roles are denied.'}},
 deploy:{what:'the key patch',all:'No blast-radius control: every assessment changed keys in the same second.',when:['Today 16:00','Tonight 23:30'],late:'23:34 · one engineer is online'},
 addStage:{at:'2.3',add:'3.2',ask:'NFR Requirements is not in this scope, but this patch rotates a key that every counter depends on. Add it?',sub:'Nobody has written down how the key rotates without blinding the counters.'},
 traceGap:()=>S.ran.has('2.3')&&!blindScan()&&!S.flags.fourth,
 humanSensor:'2.3',
 badge:{ic:'🗝️',n:'Rotate Without Forgetting',d:'Restrict the key, rotate it through a dual-key window, and prove who is locked out.',test:()=>S.dec['2.3.done']===0&&S.dec['3.2.rotate']===0&&S.dec['3.6.neg']===0},
 incident,debrief,
};
})();
