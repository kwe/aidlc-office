/* Scenario: Network Velocity (ID-VEL-02), a new capability on a production hot path.
   Everything here is story. The method data (stage order, agents, sensors, scopes) lives in src/game.html. */
SCENARIOS.velocity=(()=>{
const REC='aidlc/spaces/identity/intents/261113-network-velocity/';
const KB='aidlc/spaces/identity/codekb/aegle-api/';
const U2='construction/u2-network-velocity/';

/* ---------- decisions: option 0 is always the best; display order is shuffled ---------- */
const DEC={
 '1.1.success':{own:'po',by:'PRD',q:'How will we know Network Velocity worked?',ctx:'Every later stage traces back to this success measure.',o:[
  {t:'Cut fraud losses from cross-lender identity rings by 30% within two quarters, without raising honest-applicant declines',s:10,q:5,r:-5,fb:'An outcome with a guardrail. Reviewers and sensors can check later work against it.'},
  {t:'Ship ID-VEL-02 to all 40 lenders by quarter end',s:3,fb:'That is an output. Shipping on time says nothing about whether fraud went down.'},
  {t:'Lenders tell us they like it',s:0,q:-5,fb:'Not measurable, so nothing downstream can be checked against it.'}]},
 '1.2.buy':{own:'po',by:'PRD',q:'Market Research found a consortium vendor that sells cross-lender velocity data. Build, buy or both?',ctx:'This decides what sits on the 300 ms assessment path.',o:[
  {t:'Build on our own network data. Revisit vendors next year.',s:10,fb:'You already see traffic from all 40 lenders, and building keeps the hot path under your control.'},
  {t:'Buy the vendor feed and call it on every assessment',s:2,r:10,fb:'This adds an external call to the hot path, so the vendor\'s latency becomes yours.'},
  {t:'Hybrid: build now, use the vendor later as offline enrichment',s:7,fb:'Reasonable: the vendor stays off the hot path.'}]},
 '1.3.legal':{own:'sec',by:'ARC',q:'Lenders must never see each other\'s applicants. What may cross the lender boundary?',ctx:'Compliance is supporting the Architect on this constraint.',o:[
  {t:'Only keyed HMAC fingerprints, under the network data-sharing agreement, with a DPIA',s:10,q:5,r:-10,fb:'This is privacy by design: you can match people without sharing who they are.'},
  {t:'Raw name, date of birth and address, matched centrally',s:0,r:20,fb:'Sharing raw PII between competitors needs a legal basis you do not have.'},
  {t:'Nothing. Keep checks within each lender.',s:2,fb:'Safe, but it cannot detect cross-lender rings, so the intent fails.'}]},
 '1.4.scope':{own:'po',by:'PRD',q:'What is in scope for this intent?',ctx:'Scope sets the units that Inception will create.',o:[
  {t:'API only: add ID-VEL-02 to the existing /assess response',s:10,fb:'The smallest scope that moves the outcome metric.'},
  {t:'API, plus a lender dashboard, plus case management',s:0,q:-5,r:5,fb:'Scope creep: it adds a whole unit without moving the fraud metric.'}]},
 '1.5.team':{own:'pm',by:'DLV',q:'This intent ends in production. Nobody on the team has run on-call for /assess. How do you staff it?',ctx:'Team Formation shapes who is in the mob for later stages.',o:[
  {t:'Mob: pair Sam with Maya (SRE) from Inception onward',s:10,q:5,fb:'Ops knowledge enters the design early, not at deploy time.'},
  {t:'Bring in a contractor for the ops work at the end',s:3,r:5,fb:'Ops concerns arrive after the design has been decided.'},
  {t:'Add nobody. The AI agents cover ops.',s:0,r:10,fb:'Agents do the work, but a human still owns production decisions.'}]},
 '1.6.resp':{own:'po',by:'DSN',q:'What does a lender\'s underwriter see when ID-VEL-02 fires?',ctx:'Design is sketching the reason-code panel.',o:[
  {t:'Reason code + count: "Identity seen at 4 other lenders in 14 days" (no names)',s:10,fb:'Actionable and private.'},
  {t:'Reason code + the names of the other lenders',s:0,r:15,fb:'This reveals a competitor\'s applicants and breaks the data-sharing agreement.'},
  {t:'A risk score only, with no reason',s:3,fb:'Underwriters can\'t explain a decline, which fails adverse-action rules.'}]},
 '1.7.go':{own:'pm',by:'DLV',q:'The RAID log has 6 open risks. How do you hand off to Inception?',ctx:'Approval & Handoff writes the initiative brief.',o:[
  {t:'Hand off with a named owner and a due date for every open risk',s:10,fb:'Risks are tracked and will not be forgotten.'},
  {t:'Hand off now and sort out the risks in Inception',s:3,r:5,fb:'Unowned risks tend to stay unowned.'}]},
 '2.2.flag':{own:'eng',by:'PIP',q:'11 of the last 12 endpoint releases shipped behind a feature flag. Is that how this team works?',ctx:'Practices you confirm are promoted to team memory when you approve this stage. Agents then apply them on every future intent.',o:[
  {t:'Yes: "New endpoints ship behind a feature flag" is our practice',s:10,fb:'Recorded in the draft. It reaches team memory when the stage is approved.'},
  {t:'Reject it. We don\'t always do that.',s:2,fb:'The evidence says you do. If you reject it, agents won\'t plan a flag.'},
  {t:'Defer and decide later',s:4,fb:'The rule is not saved, so nothing changes yet.'}]},
 '2.3.rule':{own:'po',by:'PRD',q:'When should ID-VEL-02 fire?',ctx:'This is the core business rule.',o:[
  {t:'Identity seen at 3+ other lenders in 14 days',s:10,fb:'This catches rings while sparing people who shop around a little.'},
  {t:'Seen at any other lender in 30 days',s:0,q:-5,fb:'Too noisy: honest people shop around for loans.'},
  {t:'5+ other lenders within 24 hours',s:4,fb:'Precise, but slow rings slip through.'}]},
 '2.3.fail':{own:'eng',by:'ARC',q:'If the network check is slow or down, what does /assess do?',ctx:'Lenders call /assess on every loan application.',o:[
  {t:'Fail open: return the other checks plus ID-VEL-00 "network check unavailable"',s:10,r:-5,fb:'Lending continues, and underwriters can see that the check was skipped.'},
  {t:'Wait for it, however long it takes',s:0,r:10,fb:'One slow dependency makes every assessment slow.'},
  {t:'Fail closed and decline the application',s:0,r:10,fb:'An outage would block every loan in the network.'}]},
 '2.3.hash':{own:'sec',by:'CMP',q:'Reverse Engineering found v1 fingerprints identities with unsalted SHA-256. These will now be shared across lenders. What do you use?',ctx:'Source: code-quality-assessment.md, finding CQ-04.',o:[
  {t:'Keyed HMAC-SHA-256 with a KMS-held key, rotated yearly',s:10,r:-10,fb:'Without the key, fingerprints can\'t be reversed.'},
  {t:'Keep v1\'s unsalted SHA-256 for consistency',s:0,r:20,fb:'Unsalted hashes of names and birth dates can be reversed with a dictionary attack.'}]},
 '2.4.honest':{own:'po',by:'QA',q:'The mob drafted 6 stories. QA asks: do we need a story for honest applicants who get flagged?',ctx:'False positives are the cost of any fraud signal. Someone has to own them.',o:[
  {t:'Yes: "As an honest applicant flagged by ID-VEL-02, I am cleared by manual review within one day"',s:10,q:5,fb:'Now false positives have an owner, a test and a metric.'},
  {t:'No. Lenders handle that.',s:0,fb:'Then nobody designs for false positives.'}]},
 '2.6.store':{own:'eng',by:'ARC',q:'Where do the 14-day cross-lender counters live?',ctx:'Every assessment reads and writes these counters.',o:[
  {t:'DynamoDB with a write-sharded key (fingerprint#0–9) and a TTL',s:10,fb:'Load spreads across partitions, even for very busy identities.'},
  {t:'DynamoDB with one item per fingerprint',s:2,r:10,fb:'Simple, but one busy identity hammers a single partition.'},
  {t:'Redis only, in memory',s:3,r:5,fb:'Fast, but the 14-day history is lost on failover.'}]},
 '2.7.skel':{when:()=>scope().skeleton,own:'eng',by:'ARC',q:'This scope ships with the walking skeleton on, so the first Unit is the smallest working end-to-end slice. Keep it?',ctx:'The stance comes from the Walking Skeleton practice (org → team → project), with the scope setting as fallback. A human can still switch it off for one piece of work.',o:[
  {t:'Keep it: u0 is the thinnest slice through /assess → fingerprint → counter → reason',s:10,fb:'Integration risk is retired first, and building Units side by side becomes safe.'},
  {t:'Switch it off. Build each unit in full and integrate at the end.',s:2,r:5,fb:'Integration problems surface at the end, when they cost the most.'}]},
 '2.8.contract':{own:'eng',by:'ARC',q:'How does /assess return the new signal to 40 lenders?',ctx:'Contract Design covers public APIs.',o:[
  {t:'Additive: a new entry in the existing reasons[] array (non-breaking)',s:10,fb:'Every lender gets the signal without changing anything.'},
  {t:'A new /v2/assess endpoint',s:2,fb:'Every lender has to migrate before they get any value.'}]},
 '2.9.verify':{own:'eng',by:'DLV',q:'Which Construction Verification Command should prove each Unit works?',ctx:'The engine runs the authorized command at every Unit checkpoint. A checkpoint can only be approved with that receipt; a hand-written note cannot verify a Unit.',o:[
  {t:'make e2e: build, run the slice locally and smoke-test /assess',s:10,fb:'Every checkpoint is backed by a real end-to-end run.'},
  {t:'npm run lint: it is fast',s:0,q:-5,r:5,fb:'A lint pass proves the code parses, not that the Units work together.'}]},
 '2.9.exec':{own:'pm',by:'DLV',q:'How should Construction run?',ctx:'Unit-major is the default: one Unit walks its design stages and Code Generation, then the next. Building side by side needs stage-major plus swarm.',o:[
  {t:'Unit-major, serial: one Unit at a time, each approved at its own checkpoint',s:10,fb:'Safe and steady.'},
  {t:'Stage-major with swarm: design every Unit first, then build the independent Units side by side in git worktrees',s:10,fb:'Faster. Every plan is approved before the batch starts, and the batch ends in one checkpoint.'}],auto:()=>S.dec['2.7.skel']===0?1:0},
 '3.2.slo':{own:'ops',by:'ARC',q:'What availability and latency target should the network check have?',ctx:'The SLO sets the error budget you\'ll fight with during an incident.',o:[
  {t:'99.9% monthly, with p99 under 150 ms for the network check',s:10,fb:'This gives a 43-minute monthly error budget, which is realistic for one region.'},
  {t:'99.99%',s:3,fb:'That needs multi-region at ten times the cost. The budget is 4 minutes a month.'},
  {t:'No SLO for now',s:0,r:10,fb:'Without an SLO there is no error budget and nothing to alarm on.'}]},
 '3.2.threat':{own:'sec',by:'DSO',q:'Threat model: fraudsters could probe the API to learn the threshold. Mitigate now?',ctx:'DevSecOps is supporting the Architect on NFR Requirements.',o:[
  {t:'Yes: rate-limit each lender and never reveal the exact threshold',s:10,r:-10,fb:'Probing becomes slow and noisy.'},
  {t:'No, it\'s an edge case',s:0,r:10,fb:'Edge cases are exactly what fraud rings look for.'}]},
 '3.3.res':{own:'eng',by:'ARC',q:'How does /assess protect itself from a slow counter store?',ctx:'NFR Design turns targets into patterns.',o:[
  {t:'A circuit breaker with a 120 ms timeout that falls back to ID-VEL-00',s:10,fb:'A slow store degrades only this one signal, not the whole API.'},
  {t:'Retry 3 times with backoff',s:2,r:10,fb:'Retries triple the load on a store that is already slow, causing a retry storm.'},
  {t:'Nothing. It\'s fast.',s:0,r:10,fb:'Without a timeout, p99 latency has no upper bound.'}]},
 '3.4.cap':{own:'ops',by:'AWS',q:'Capacity for the quarter-end surge (forecast: 4× normal)?',ctx:'AWS Platform is drafting the infrastructure specification.',o:[
  {t:'On-demand DynamoDB, with Lambda provisioned concurrency scaled on a schedule',s:10,fb:'Capacity follows demand, including the surge.'},
  {t:'Fixed provisioned capacity sized for average traffic',s:0,r:10,fb:'The surge will hit the ceiling and be throttled.'}]},
 '3.5.addr':{own:'eng',by:'DEV',q:'While building u2, the agents found 6% of applications have no address. What should the matcher do?',ctx:'A question raised mid-build. The agent stops to ask instead of guessing.',o:[
  {t:'Fall back to postcode + date of birth, and return ID-VEL-00 if still incomplete',s:10,fb:'Coverage stays high, and gaps are visible to underwriters.'},
  {t:'Skip the network check silently',s:2,r:5,fb:'Silent skips are invisible to lenders and to your metrics.'},
  {t:'Match on name + date of birth only',s:0,r:10,fb:'Name and birth date collide often in shared housing, which will cause a false-positive storm.'}]},
 '3.7.gates':{own:'sec',by:'PIP',q:'Which CI checks block a merge?',ctx:'Quality gates are recorded in quality-gates.md.',o:[
  {t:'SAST, dependency and secrets scans block, and so does coverage below 80%',s:10,fb:'Problems are caught before they reach main.'},
  {t:'Make them all advisory and just report',s:2,r:10,fb:'Advisory checks get ignored once a deadline is close.'}]},
 '4.1.strategy':{own:'ops',by:'PIP',q:'Which deployment strategy?',ctx:'This decides how quickly and safely you can roll back.',o:[
  {t:'Canary 5% → 25% → 100%, with automatic rollback on alarm',s:10,fb:'A small blast radius and a fast rollback.'},
  {t:'Blue/green switch',s:6,fb:'Fast rollback, but every lender switches at once.'},
  {t:'All at once',s:0,r:10,fb:'No way to limit the blast radius, and rollback is slow.'}]},
 '4.2.kms':{own:'sec',by:'AWS',q:'Who can use the fingerprint KMS key?',ctx:'The key turns PII into shareable fingerprints.',o:[
  {t:'Only the fingerprint service role, enforced by the key policy',s:10,fb:'Least privilege.'},
  {t:'Any role in the account',s:0,r:15,fb:'Any compromised role could compute fingerprints.'}]},
 '4.3.window':{own:'pm',by:'PIP',q:'When do you deploy?',ctx:'The quarter-end surge is in 9 days.',o:[
  {t:'Tuesday 10:00, with the whole team online',s:10,fb:'If something breaks, everyone is there.'},
  {t:'Friday 17:00, before the weekend',s:0,r:10,fb:'If something breaks, nobody is around.'}]},
 '4.4.alarm':{own:'ops',by:'OPS',q:'How should alarms page on-call?',ctx:'Observability Setup.',o:[
  {t:'SLO burn-rate alarms (fast: 2% of budget in 1 h; slow: 5% in 6 h)',s:10,fb:'On-call gets paged when users are hurting, not when a CPU twitches.'},
  {t:'Static alarm when CPU is above 80%',s:2,r:5,fb:'CPU can look fine while users suffer.'}]},
 '4.5.esc':{own:'pm',by:'OPS',q:'How do you escalate during a SEV-1?',ctx:'Incident Response.',o:[
  {t:'An escalation matrix with an incident commander and a lender status page',s:10,fb:'Everyone knows who decides, and lenders hear it from you first.'},
  {t:'Email the team mailing list',s:0,r:5,fb:'Lenders find out from their own dashboards.'}]},
 '4.6.load':{own:'ops',by:'QA',q:'How do you load test?',ctx:'Performance Validation checks the NFRs in a production-like environment.',o:[
  {t:'Production-shaped traffic at 2× the sourced peak, including repeated identities',s:10,fb:'This is realistic enough to find hot keys.'},
  {t:'Replay last month\'s traffic at 1×',s:2,fb:'Last month had no quarter end and no fraud ring, so this test won\'t find hot keys.'}]},
 '4.7.next':{own:'po',by:'OPS',q:'Production taught you something. What is the next intent?',ctx:'Feedback & Optimization closes the loop back to Intent Capture.',o:[
  {t:'ID-VEL-03: lenders confirm or clear flags, and that feedback tunes the threshold',s:10,fb:'Production data becomes the next intent. That closes the loop.'},
  {t:'Add the dashboard that was cut earlier',s:4,fb:'Possible, but it isn\'t what the data is asking for.'},
  {t:'Nothing. We\'re done.',s:0,fb:'AI-DLC is a loop. Production is the best input to the next intent.'}]},
};

const storeTxt=()=>dv('2.6.store')===undefined?'<span class="wa">not designed (Domain Design was skipped)</span>':pk('2.6.store',['DynamoDB, write-sharded key <code>fp#0–9</code>, TTL 14 d','DynamoDB, one item per fingerprint','Redis only (in-memory)']);
const peakTxt=()=>S.flags.peakSourced?`peak 1,180 assessments/s ${SRC('CloudWatch, /assess, Q3 quarter end')}`:'peak 1,200 assessments/s';

function unitList(){
  if(zeroUnit())return[{id:'aegle-api',kind:'service',st:'(no Units in this scope)',plan:'add ID-VEL-02 to /assess: fingerprint, network counter, rule, reasons[] merge',files:31,tests:310}];
  const u=[];
  if(S.dec['2.7.skel']===0)u.push({id:'u0-walking-skeleton',kind:'service',st:'US-01 (thin)',plan:'smallest working slice: /assess → fingerprint → counter → reason stub',files:9,tests:14});
  u.push({id:'u1-fingerprint-vault',kind:'library',st:'US-04, US-06',plan:'HMAC via KMS GenerateMac; '+(S.dec['2.3.hash']===1?'unsalted SHA-256 (v1)':'key rotation'),files:7,tests:41});
  u.push({id:'u2-network-velocity',kind:'service',st:'US-01, US-03'+(S.dec['2.4.honest']===0?', US-07':''),plan:'counter store + rule; '+(S.dec['3.3.res']===0||S.dec['2.3.fail']===0?'breaker → ID-VEL-00':'no breaker'),files:16,tests:173});
  u.push({id:'u3-assess-integration',kind:'service',st:'US-02, US-05',plan:'merge into reasons[]; per-lender flag',files:8,tests:96});
  if(S.dec['1.4.scope']===1)u.push({id:'u4-case-dashboard',kind:'ui',st:'(scope creep)',plan:'React dashboard + case workflow',files:44,tests:88});
  return u;
}

/* ---------- load test (4.6) ---------- */
async function loadTest(st){
  const hot=S.dec['2.6.store']===undefined||S.dec['2.6.store']===1;const real=S.dec['4.6.load']===0;
  setTurn('agents',null,'The Quality agent is running the load test.');
  if(!S.flags.peakSourced&&S.plan.includes('2.3')){
    await say('QA','I can\'t size the test: the requirements say "peak 1,200/s" and nothing backs that number. Is it real?');
    await say('@ops','Pulling it from CloudWatch now… the Q3 quarter-end peak on /assess was <b>1,180/s</b>.');
    S.flags.peakSourced=true;reviseFiles('2.3');if(S.files[REC+'ideation/intent-capture/intent-statement.md'])reviseFiles('1.1');tick(4);adj(-2,0);
    await say('QA','Requirements amended with the sourced figure. That cost half a day this late in the lifecycle. <b>Clock +4h</b>.');
  }
  const target=real?'2,360 rps (2× peak, ring identities repeated)':'1,180 rps (October replay)';
  const c=card('',`<div class="ck"><span>Load test</span><span>${real?'production-shaped':'replay 1×'}</span></div><div class="ubar"><div class="ub"><div class="l"><span>Ramp → ${target}</span><span class="pc">0</span></div><div class="t"><i style="width:0"></i></div></div></div><div class="blog"></div>`);
  const lg=c.querySelector('.blog'),bar=c.querySelector('.t i'),pc=c.querySelector('.pc');
  const max=real?2360:1180;let failAt=null;const hist=[];
  for(let i=1;i<=10;i++){const rps=Math.round(max*i/10);bar.style.width=i*10+'%';pc.textContent=rps+' rps';
    const p99=hot&&real&&rps>900?Math.round(400+(rps-900)*1.3):Math.round(118+i*2.4);
    hist.push(p99);NET.noc({title:`LOAD TEST · ${rps} rps`,p99:[110,...hist],max:2600,alert:p99>300,wave:'load test',hp:Math.min(100,p99/26),budget:100});
    lg.appendChild(el('div',p99>300?'r':'g',`${rps} rps · p99 ${p99} ms${p99>300?' · ThrottlingException on partition fp#7c2e…':''}`));lg.scrollTop=lg.scrollHeight;
    if(p99>300&&!failAt)failAt=rps;await wait(260)}
  if(failAt){
    S.flags.loadP99='<span class="no">2.3 s @ 2,360 rps</span>';
    await say('QA',`<b>NFR-1 fails</b> above ${failAt} rps. One ring identity is hammering a single partition: <b>hot partition</b>.`);
    await say('QA','Root cause traces to <code>decisions.md:ADR-003</code> (one item per fingerprint). That decision has to change upstream; I can\'t fix it from here.');
    await say('@eng','Jump back to Domain Design.');
    if(!S.plan.includes('2.6')){S.plan.splice(S.plan.indexOf('2.3')+1,0,'2.6');S.idx++;audit('RECOMPOSED','stages added: domain-design')}
    await jumpBack('4.6','2.6','A hot partition showed up under load, so the team jumps back to Domain Design to write-shard the counter key.',8,()=>{S.dec['2.6.store']=0;S.done.add('2.6');reviseFiles('2.6');reviseFiles('3.3')});
    hist.push(141);NET.noc({title:'LOAD TEST · 2,360 rps · after reshard',p99:hist.slice(-3).map(()=>141),max:2600});
    lg.appendChild(el('div','c','re-run after reshard: 2,360 rps · p99 141 ms ✓'));
    await say('QA','Re-run after the reshard: p99 <b>141 ms</b> at 2,360 rps. NFR-1 passes.');
    S.flags.loadP99='<span class="ok">141 ms @ 2,360 rps</span> (after the jump back)';
  }else{
    S.flags.loadP99=`<span class="ok">${real?'139':'131'} ms @ ${max.toLocaleString()} rps</span>`;
    await say('QA',real?'All NFRs pass at 2× peak.':'All NFRs pass at 1× October traffic.'+(hot?' <span class="muted">(Repeated ring identities were not in the replay.)</span>':''));
  }
  S.flags.loadPeak=real?'2× peak':'1× replay';NET.noc({});
}

/* ---------- stage content ---------- */
const stages={
/* ===== 0 INITIALIZATION ===== */
'0.1':{
 files:[{p:REC+'project-description.json',opt:1,b:()=>PRE(`<span class="s">"Warn lenders in real time when one identity is being used across many lenders in the network. Ship it to production and keep it up through the quarter-end surge."</span>`)+P('Your request, stored as one JSON string exactly as you typed it.')}],
 pre:[['SYS','<code>WORKSPACE_SCAFFOLDED</code>: record dir <code>intents/261113-network-velocity/</code> created']]
},
'0.2':{
 files:[],
 pre:[['SYS','<code>WORKSPACE_SCANNED</code>: brownfield · TypeScript 5 · Node 20 · AWS CDK · repo <code>aegle-api</code> (v1 found)']]
},
'0.3':{
 files:[{p:REC+'aidlc-state.md',opt:1,b:()=>H('Workflow state')+T(['Field','Value'],[['Intent','network-velocity (ID-VEL-02)'],['Scope',S.prof],['Workspace','brownfield'],['Current stage',S.cur||'—'],['Depth',scope().depth],['Guard Policy',scope().guard],['Collaborators',scope().collab?'on':'off'],['Sensors',scope().sensors?'on':'off'],['Plan approval',scope().planApproval?'on':'off'],['Walking skeleton',scope().skeleton?'on':'off']])},
        {p:REC+'audit/devbox-a1f3.md',opt:1,b:()=>P('Append-only audit shard for this clone. See the Audit tab for the live view.')}],
 pre:[['SYS','<code>WORKSPACE_INITIALISED</code> · <code>WORKFLOW_STARTED</code>']]
},
/* ===== 1 IDEATION ===== */
'1.1':{
 dec:['1.1.success'],
 files:[{p:REC+'ideation/intent-capture/intent-statement.md',b:()=>H('Intent: Network Velocity (ID-VEL-02)')+P('Fraud rings now spread one identity across many lenders, so each lender sees only one application, and v1\'s per-lender ID-VEL-01 never fires.')+H('Success measure')+P(pk('1.1.success',['<b>Cut fraud losses from cross-lender rings by 30% within two quarters</b>, with no rise in honest-applicant declines.','<b>Ship ID-VEL-02 to all 40 lenders by quarter end.</b> <span class="wa">(output, not outcome)</span>','<b>Lenders like it.</b> <span class="no">(not measurable)</span>']))+P(TAG('Q2'))+H('Claims and assumptions')+L(['Fraud rings now spread one identity across many lenders '+TAG('desc'),'Lenders accept a shared fingerprint index '+TAG('assumption'),'Quarter-end peak is '+(S.flags.peakSourced?'1,180 assessments/s '+TAG('Q4')+' <span class="muted">CloudWatch, /assess, Q3 quarter end</span>':'1,200 assessments/s <span class="no">← no source tag</span>')])},
        {p:REC+'ideation/intent-capture/stakeholder-map.md',b:()=>T(['Stakeholder','Interest','Influence'],[['40 lenders (underwriting)','fewer losses, explainable flags','high'],['Honest applicants','not wrongly declined','medium'],['Fraud ops','fewer manual reviews','medium'],['Regulator','privacy, adverse-action rules','high']])}],
 pre:[['PRD','Framing the request. v1 caught one identity reused <i>within</i> a lender. This intent covers reuse <i>across</i> lenders.'],['PRD','I need one thing from a human: what does success mean?']],
 post:[['PRD','Writing <code>intent-statement.md</code> and <code>stakeholder-map.md</code>. Every claim should carry a source tag: <code>[desc]</code>, <code>[Q&lt;n&gt;]</code>, <code>[memory:&lt;id&gt;]</code> or <code>[assumption]</code>.'],['PLR','Reviewing the intent against the outcome rubric…']],
 sfail:()=>S.flags.peakSourced?null:{s:'claim-sources',t:'The intent statement claims "quarter-end peak is 1,200 assessments/s" with no source tag.',src:'intent-statement.md:L9',key:'peakSourced',ch:'Source the peak figure from CloudWatch',fixmsg:'The claim now reads <b>peak 1,180/s</b> <code>[Q4]</code>, answered from CloudWatch for the Q3 quarter end. Sensor re-run: pass.'},
 finds:()=>dv('1.1.success')!==0?[{by:'PLR',t:'The success measure is not an outcome. Later stages cannot be checked against "'+(dv('1.1.success')===1?'ship by quarter end':'lenders like it')+'".',src:'intent-statement.md:L6',fix:'1.1.success',ch:'Restate success as a fraud-loss outcome'}]:[]
},
'1.2':{
 dec:['1.2.buy'],
 files:[{p:REC+'ideation/market-research/competitive-analysis.md',b:()=>T(['Option','Coverage','Latency','Notes'],[['Consortium vendor X','62 lenders','180–900 ms','sync API, per-call fee'],['In-house network index','our 40 lenders','~8 ms','we already receive every application'],['Bureau alerts','national','batch (daily)','too slow for point-of-application']])+P(SRC('vendor docs, 2026-10; v1 traffic logs'))},
        {p:REC+'ideation/market-research/build-vs-buy.md',b:()=>H('Decision')+P(pk('1.2.buy',['<b>Build.</b> Use our own network data, and revisit vendors next year.','<b>Buy.</b> Call vendor X on every assessment. <span class="wa">Adds 180–900 ms to the hot path.</span>','<b>Hybrid.</b> Build now and use the vendor as offline enrichment later.']))}],
 pre:[['PRD','Scanning the market: vendors, bureau products and what we already own.'],['PRD','There\'s a consortium vendor with 62 lenders. Its latency, though, is 180–900 ms.']],
 post:[['PRD','Writing the competitive analysis and the build-vs-buy recommendation.']]
},
'1.3':{
 dec:['1.3.legal'],
 files:[{p:REC+'ideation/feasibility/feasibility-assessment.md',b:()=>T(['Dimension','Verdict'],[['Technical','feasible: v1 already ingests all 40 lenders\' applications'],['Legal',pk('1.3.legal',['<span class="ok">feasible</span> with HMAC fingerprints + data-sharing agreement + DPIA','<span class="no">blocked</span>: raw PII across competitors','<span class="wa">feasible but useless</span>: per-lender only'])],['Operational','needs on-call for a new hot path']])},
        {p:REC+'ideation/feasibility/constraint-register.md',b:()=>L(['C-1: lenders must never see another lender\'s applicants '+SRC('network DSA §4.2'),'C-2: /assess p99 must stay under 300 ms '+SRC('lender SLA'),'C-3: data retention 14 days for network counters '+SRC('DPIA draft')])},
        {p:REC+'ideation/feasibility/raid-log.md',opt:1,b:()=>T(['ID','Type','Item'],[['R-1','Risk','fingerprint reversal'],['R-2','Risk','quarter-end surge 4× traffic'],['A-1','Assumption','lenders sign DSA addendum'],['D-1','Dependency','KMS key for HMAC']])}],
 pre:[['ARC','Checking feasibility. The technical side is easy: v1 already sees every application.'],['CMP','Supporting on legal: the network data-sharing agreement §4.2 forbids revealing one lender\'s applicants to another.'],['ARC','The real question is what\'s allowed to cross the lender boundary.']],
 post:[['ARC','Recording constraints C-1 to C-3 and the RAID log.']],
 finds:()=>dv('1.3.legal')===1?[{by:'CMP',t:'Raw PII crossing the lender boundary has no lawful basis under DSA §4.2.',src:'feasibility-assessment.md:L3',fix:'1.3.legal',ch:'Use HMAC fingerprints + DPIA'}]:dv('1.3.legal')===2?[{by:'ARC',t:'Keeping checks per lender cannot detect cross-lender rings, so the intent is infeasible as framed.',src:'feasibility-assessment.md:L3',fix:'1.3.legal',ch:'Share HMAC fingerprints under the DSA'}]:[]
},
'1.4':{
 dec:['1.4.scope'],
 files:[{p:REC+'ideation/scope-definition/scope-document.md',b:()=>H('In scope')+L(pk('1.4.scope',[['ID-VEL-02 in the existing /assess reasons[]','Network fingerprint index (14-day window)','Ops: SLOs, alarms, runbooks'],['ID-VEL-02 in /assess','Network fingerprint index','<span class="wa">Lender dashboard</span>','<span class="wa">Case management workflow</span>','Ops: SLOs, alarms, runbooks']]))+H('Out of scope')+L(pk('1.4.scope',[['Lender dashboard → backlog','Lender feedback loop → backlog'],['Lender feedback loop → backlog']]))},
        {p:REC+'ideation/scope-definition/intent-backlog.md',b:()=>L(['ID-VEL-03: lender feedback tunes thresholds','Network dashboard for fraud ops','Vendor enrichment (offline)'])}],
 pre:[['PRD','Proposing scope. Everything that does not move the fraud-loss outcome goes to the backlog.']],
 post:[['PRD','Writing <code>scope-document.md</code> and <code>intent-backlog.md</code>.'],['PLR','Reviewing scope against the success measure…']],
 finds:()=>dv('1.4.scope')===1?[{by:'PLR',t:'The dashboard and case management do not move the 30% fraud-loss outcome. They add a whole unit.',src:'scope-document.md:L4',fix:'1.4.scope',ch:'Cut to API-only, and move the dashboard to the backlog'}]:[]
},
'1.5':{
 dec:['1.5.team'],
 files:[{p:REC+'ideation/team-formation/team-assessment.md',b:()=>T(['Skill','Covered by'],[['Product / lending','Priya'],['Service design','Sam'],['Production on-call',pk('1.5.team',['Maya (SRE), in the mob from Inception','<span class="wa">contractor, late</span>','<span class="no">gap</span>'])],['Privacy / DPIA','Theo'],['Delivery','Jordan']])},
        {p:REC+'ideation/team-formation/mob-composition.md',opt:1,b:()=>P('Mob for Inception design sessions: Priya, Sam, '+(dv('1.5.team')===0?'Maya, ':'')+'Theo, with Jordan facilitating.')}],
 pre:[['DLV','Mapping the skills this intent needs against the team. There\'s a production on-call gap.']],
 post:[['DLV','Writing the team assessment and mob composition.']]
},
'1.6':{
 dec:['1.6.resp'],
 files:[{p:REC+'ideation/rough-mockups/wireframes.md',b:()=>PRE(`┌─ Assessment #A-88213 ───────────────┐
│ Decision hint: <span class="k">REVIEW</span>                │
│ ⚠ ID-VEL-02  ${pk('1.6.resp',['Seen at 4 other lenders / 14 d','Seen at: NorthBank, Avia, Kestrel…','Risk score 0.82              '])} │
│ ID-VEL-01  –                        │
└─────────────────────────────────────┘`)},
        {p:REC+'ideation/rough-mockups/user-flow.md',opt:1,b:()=>L(['Underwriter submits application','/assess returns reasons[] in under 300 ms','ID-VEL-02 shown → route to manual review','Applicant cleared or declined'])}],
 pre:[['DSN','Sketching what an underwriter sees when ID-VEL-02 fires.']],
 post:[['DSN','Wireframes and user flow written.']],
 finds:()=>dv('1.6.resp')===1?[{by:'CMP',t:'Showing other lenders\' names reveals competitors\' applicants, which breaches DSA §4.2.',src:'wireframes.md:L3',fix:'1.6.resp',ch:'Show the count only, with no lender names'}]:dv('1.6.resp')===2?[{by:'PLR',t:'A bare score cannot be explained to an applicant, which fails adverse-action notice rules.',src:'wireframes.md:L3',fix:'1.6.resp',ch:'Add the reason code and count'}]:[]
},
'1.7':{
 dec:['1.7.go'],
 files:[{p:REC+'ideation/approval-handoff/initiative-brief.md',b:()=>H('Initiative brief')+L(['Intent: ID-VEL-02 Network Velocity','Outcome: '+pk('1.1.success',['−30% cross-lender fraud losses in 2 quarters','ship by quarter end','lenders like it']),'Scope: '+pk('1.4.scope',['API only','API + dashboard + case mgmt']),'Data: '+pk('1.3.legal',['HMAC fingerprints under DSA + DPIA','raw PII','per-lender only'],0),'Open risks: 6 → '+pk('1.7.go',['all owned, with due dates','<span class="wa">unowned</span>'])])},
        {p:REC+'ideation/approval-handoff/decision-log.md',b:()=>T(['#','Decision','By'],Object.keys(S.dec).filter(k=>k<'2').map((k,i)=>[i+1,DEC[k].o[S.dec[k]].t.slice(0,70)+'…',PEOPLE[DEC[k].own].n]))},
        {p:REC+'verification/phase-check-ideation.md',opt:1,b:()=>P('Phase check: every scope item traces to the intent; every constraint has a source.')}],
 pre:[['DLV','Assembling the initiative brief from every Ideation artifact.']],
 post:[['DLV','Brief and decision log ready. Writing <code>phase-check-ideation.md</code>.'],['PLR','Reviewing the brief for completeness…']],
 finds:()=>dv('1.7.go')===1?[{by:'PLR',t:'Six RAID items have no owner. Ideation exits with unmanaged risk.',src:'initiative-brief.md:L6',fix:'1.7.go',ch:'Assign owners and due dates'}]:[]
},
/* ===== 2 INCEPTION ===== */
'2.1':{
 why:'Agents must understand v1 before changing it. The codekb is shared with every future intent.',
 files:[
  {p:KB+'architecture.md',b:()=>PRE(`lender ─▶ API GW ─▶ λ assess ─┬▶ ID-VEL-01 (per-lender, DynamoDB)
                              ├▶ device check
                              └▶ reasons[] ─▶ response (p99 210 ms)`)+P('Single region (eu-west-1). Reasons are computed in parallel and merged.')},
  {p:KB+'code-quality-assessment.md',b:()=>T(['ID','Finding','Where'],[['CQ-01','test coverage 71%','src/'],['CQ-02','no timeout on DynamoDB client','src/store.ts:14'],['CQ-03','reason merging is untested for >3 reasons','src/reasons.ts:40'],['<b class="wa">CQ-04</b>','<b>identities fingerprinted with unsalted SHA-256</b>','src/fingerprint.ts:22']])},
  {p:KB+'business-overview.md',opt:1,b:()=>P('Aegle API: real-time identity risk signals for 40 lenders at the point of application.')},
  {p:KB+'code-structure.md',opt:1,b:()=>PRE('src/\n  handler.ts\n  fingerprint.ts\n  reasons.ts\n  store.ts\n  rules/vel01.ts')},
  {p:KB+'api-documentation.md',opt:1,b:()=>PRE('POST /assess → { decisionHint, reasons: [{code, detail}] }')},
  {p:KB+'component-inventory.md',opt:1,b:()=>L(['assess λ','vel01 rule','fingerprint lib','DynamoDB table identity-events'])},
  {p:KB+'technology-stack.md',opt:1,b:()=>L(['TypeScript 5 / Node 20','AWS Lambda, API Gateway, DynamoDB','CDK v2'])},
  {p:KB+'dependencies.md',opt:1,b:()=>L(['@aws-sdk/client-dynamodb 3.x','zod 3.x'])},
  {p:KB+'reverse-engineering-timestamp.md',opt:1,b:()=>P('Full scan at 2026-11-13T11:02Z, covering 100% of src/.')}],
 pre:[['DEV','Pipeline step 1/2: scanning <code>aegle-api</code>. 4,812 lines, 63 files.'],['DEV','Found it: <code>src/fingerprint.ts:22</code> hashes name+DOB with unsalted SHA-256. Flagging it as CQ-04.'],['ARC','Pipeline step 2/2: synthesising architecture and component inventory from the scan.']],
 preSolo:[['DEV','Scanning <code>aegle-api</code>: 4,812 lines, 63 files. Collaborators are off in this scope, so I run the whole pipeline myself.'],['DEV','Found it: <code>src/fingerprint.ts:22</code> hashes name+DOB with unsalted SHA-256. Flagging it as CQ-04.']],
 post:[['DEV','Nine codekb files written to the <b>space-level</b> store. Future intents reuse them while they\'re current.']]
},
'2.2':{
 dec:['2.2.flag'],
 files:[{p:REC+'inception/practices-discovery/discovered-rules.md',b:()=>T(['Rule','Evidence','Status'],[['ALWAYS ship a new endpoint behind a feature flag','11 / 12 releases',pk('2.2.flag',['<span class="ok">confirmed</span>','<span class="no">rejected</span>','<span class="wa">deferred</span>'])],['PRs need 1 approval + green CI','branch protection','affirmed'],['Infra changes via CDK only','no console drift in 90 d','affirmed']])},
        {p:REC+'inception/practices-discovery/team-practices.md',b:()=>L(['Trunk-based, short-lived branches','Feature flags via AppConfig','Unit tests with vitest; coverage target 80%'])},
        {p:REC+'inception/practices-discovery/evidence.md',opt:1,b:()=>P('vitest config, 71% coverage. AppConfig flags in 11 of 12 release PRs. Secrets scan in CI, advisory only.'+(scope().collab?' Support contributions are kept under <code>contributions/&lt;agent&gt;.md</code>.':''))}],
 pre:[['PIP','Drafting the practices from the repo: way of working, walking skeleton, testing posture, deployment, code style.'],['PIP','Sending my draft to three support agents. They inspect it independently and cannot see each other\'s notes.'],['QA','Contribution: vitest with 71% coverage, and the stated target is 80%.'],['DEV','Contribution: 11 of the last 12 endpoint releases used AppConfig feature flags.'],['DSO','Contribution: the secrets scan runs in CI but is advisory only.'],['PIP','Contributions in. Now interviewing the humans before I integrate.']],
 preSolo:[['PIP','Drafting the practices from the repo: way of working, walking skeleton, testing posture, deployment, code style.'],['PIP','Evidence: vitest at 71% coverage; AppConfig flags on 11 of the last 12 endpoint releases; secrets scan advisory only. Collaborators are off, so no support agents check my draft.'],['PIP','Now interviewing the humans before I finalize.']],
 post:[['PIP','<code>PRACTICES_DISCOVERED</code>. Drafts written; they are promoted to team memory only when this stage is approved.']],
 onApprove:()=>{S.mem.practices=true;S.mem.flag=dv('2.2.flag')===0;writeMemory('2.2');audit('PRACTICES_AFFIRMED',`5 sections → memory/team.md · ${S.mem.flag?2:1} rule${S.mem.flag?'s':''} → memory/project.md`)}
},
'2.3':{
 dec:['2.3.rule','2.3.fail','2.3.hash'],
 files:[{p:REC+'inception/requirements-analysis/requirements.md',b:()=>H('Functional')+L(['FR-1: fire ID-VEL-02 when an identity is '+pk('2.3.rule',['seen at 3+ other lenders in 14 days','seen at any other lender in 30 days','seen at 5+ other lenders in 24 h']),'FR-2: return the count of other lenders, never their names '+SRC('C-1'),'FR-3: on network-check failure, '+pk('2.3.fail',['return ID-VEL-00 and continue (fail open)','<span class="wa">wait until it answers</span>','<span class="no">decline (fail closed)</span>']),'FR-4: fingerprint = '+pk('2.3.hash',['HMAC-SHA-256, KMS key, rotated yearly','<span class="no">unsalted SHA-256 (v1)</span>'])])+H('Non-functional')+L(['NFR-1: /assess p99 &lt; 300 ms '+SRC('C-2'),'NFR-2: sized for '+peakTxt()+(S.flags.peakSourced?'':' <span class="no">← no source</span>'),'NFR-3: counters retained 14 days '+SRC('C-3')])},
        {p:REC+'inception/requirements-analysis/traceability.json',opt:1,b:()=>PRE('{ "FR-1": ["intent#success"], "FR-2": ["C-1"], "NFR-1": ["C-2"], "NFR-2": [] }')}],
 pre:[['PRD','Drafting requirements from the intent, constraints and codekb. Three questions need humans.']],
 post:[['PRD','Writing <code>requirements.md</code> and <code>traceability.json</code>.'],['PLR','Reviewing requirements…']],
 finds:()=>{const f=[];
  if(dv('2.3.rule')===1)f.push({by:'PLR',t:'"Any lender in 30 days" will flag people who shop around. Projected false-positive rate: 9%.',src:'requirements.md:L2',fix:'2.3.rule',ch:'Use 3+ lenders in 14 days'});
  if(dv('2.3.fail')!==0)f.push({by:'PLR',t:'If the network check fails, lending '+(dv('2.3.fail')===1?'stalls':'stops')+' for 40 lenders.',src:'requirements.md:L4',fix:'2.3.fail',ch:'Fail open with ID-VEL-00'});
  if(dv('2.3.hash')===1)f.push({by:'CMP',t:'Unsalted SHA-256 fingerprints shared across lenders can be reversed with a name+DOB dictionary (CQ-04).',src:'requirements.md:L5',fix:'2.3.hash',ch:'Use keyed HMAC with KMS'});
  return f}
},
'2.4':{
 dec:['2.4.honest'],
 files:[{p:REC+'inception/user-stories/stories.md',b:()=>L(['US-01 As an underwriter, I see ID-VEL-02 with the other-lender count','US-02 As an underwriter, I see ID-VEL-00 when the check is unavailable','US-03 As fraud ops, I can tune the threshold by config','US-04 As a lender, my applicants are never named to others','US-05 As an SRE, I can disable the signal per lender','US-06 As compliance, I can audit fingerprint key use',dv('2.4.honest')===0?'<b>US-07 As an honest applicant flagged by ID-VEL-02, I am cleared by manual review within one day</b>':null])},
        {p:REC+'inception/user-stories/personas.md',opt:1,b:()=>L(['Ana, underwriter at a mid-size lender','Dev, fraud analyst','Kai, student renting in shared housing'+(dv('2.4.honest')===0?' (honest applicant)':'')])}],
 pre:[['PRD','Draft stories written. Mob round: Design, Developer and Quality each write a contribution without seeing the others.'],['DSN','Contribution: the underwriter journey needs the count, not a score.'],['DEV','Contribution: each story is buildable inside one unit.'],['QA','Contribution: who speaks for the applicant who gets flagged wrongly?']],
 preSolo:[['PRD','Drafting stories from the requirements. Collaborators are off, so there is no mob round.'],['PRD','One gap I can see myself: who speaks for the applicant who gets flagged wrongly?']],
 post:[['PRD','Consolidating mob output into <code>stories.md</code> and <code>personas.md</code>.']],
 finds:()=>dv('2.4.honest')!==0?[{by:'QA',t:'No story covers honest applicants flagged by mistake, so false positives have no test and no owner.',src:'stories.md:L7',fix:'2.4.honest',ch:'Add the honest-applicant story'}]:[]
},
'2.5':{
 why:'Lenders render reasons[] in their own UIs, so the copy and semantics must be exact.',
 files:[{p:REC+'inception/refined-mockups/mockups.md',b:()=>PRE(`ID-VEL-02 · Network velocity
"This identity was used at ${pk('1.6.resp',['4 other lenders','4 other lenders','several lenders'])} in the last 14 days.
 Route to manual review."`)},
        {p:REC+'inception/refined-mockups/interaction-spec.md',b:()=>L(['reasons[] item: { code, severity, detail, count }','ID-VEL-00 shown as grey "check unavailable", never red','Copy reading level: grade 7'])},
        {p:REC+'inception/refined-mockups/accessibility-checklist.md',opt:1,b:()=>L(['Severity never conveyed by colour alone','Detail text is screen-reader friendly'])}],
 pre:[['DSN','Refining the reason panel: copy, severity and the ID-VEL-00 state.']],
 post:[['DSN','Mockups, interaction spec and accessibility checklist written.']]
},
'2.6':{
 dec:['2.6.store'],
 files:[{p:REC+'inception/domain-design/components.md',b:()=>T(['Component','Responsibility'],[['fingerprint-svc','HMAC fingerprints via KMS'],['network-counter','14-day per-fingerprint lender counts: '+storeTxt()],['vel02-rule','evaluate the threshold, emit a reason'],['assess (existing)','merge into reasons[]']])},
        {p:REC+'inception/domain-design/decisions.md',b:()=>H('ADR-003 Counter store')+P(storeTxt())+P('Write pattern: 1 write + 1 read per assessment; '+peakTxt()+'.')}],
 pre:[['ARC','Designing components. The counter store is on the hot path of every assessment.']],
 post:[['ARC','Writing <code>components.md</code> and ADRs.'],['ARV','Reviewing domain design…']],
 finds:()=>dv('2.6.store')===1?[{by:'ARV',t:'One item per fingerprint: a ring identity used 2,000×/min hits one partition (limit ~1,000 writes/s). Hot partition risk.',src:'decisions.md:ADR-003',fix:'2.6.store',ch:'Write-shard the key (fp#0–9)'}]:dv('2.6.store')===2?[{by:'ARV',t:'Redis-only counters lose the 14-day window on failover, which violates NFR-3.',src:'decisions.md:ADR-003',fix:'2.6.store',ch:'Use DynamoDB with a write-sharded key'}]:[]
},
'2.7':{
 dec:['2.7.skel'],
 files:[{p:REC+'inception/units-generation/unit-of-work.md',b:()=>T(['Unit','Kind','Stories'],unitList().map(u=>[u.id,u.kind,u.st]))},
        {p:REC+'inception/units-generation/unit-of-work-dependency.md',b:()=>PRE(dv('2.7.skel')===0?'u0-walking-skeleton\n  ├─▶ u1-fingerprint-vault\n  ├─▶ u2-network-velocity\n  └─▶ u3-assess-integration'+(dv('1.4.scope')===1?'\n  └─▶ u4-case-dashboard':''):'u1-fingerprint-vault ─▶ u2-network-velocity ─▶ u3-assess-integration'+(dv('1.4.scope')===1?' ─▶ u4-case-dashboard':''))},
        {p:REC+'inception/units-generation/unit-of-work-story-map.md',opt:1,b:()=>P('Every story US-01 to US-0'+(dv('2.4.honest')===0?'7':'6')+' maps to at least one unit.')}],
 pre:[['ARC','Decomposing into units of work and drawing the dependency DAG.']],
 post:[['ARC','Writing units, DAG and story map.']],
 sfail:()=>({s:'traceability',t:'US-05 (disable per lender) has no downstream Unit in traceability.json.',src:'traceability.json: US-05',auto:'ARC',fixmsg:'US-05 mapped to u3-assess-integration. Sensor re-run: pass.'}),
 finds:()=>dv('2.7.skel')===1?[{by:'ARV',t:'Without a walking skeleton, integration of 3 units is first tested at the end.',src:'unit-of-work-dependency.md:L1',fix:'2.7.skel',ch:'Restore u0-walking-skeleton as the first Unit'}]:[]
},
'2.8':{
 why:'40 lenders integrate with /assess, so contracts outlive code.',
 dec:['2.8.contract'],
 files:[{p:REC+'inception/contract-design/contract-summary.md',b:()=>PRE(pk('2.8.contract',[`POST /assess  (unchanged)
reasons[] += { <span class="s">"code"</span>: <span class="s">"ID-VEL-02"</span>, <span class="s">"count"</span>: 4, <span class="s">"windowDays"</span>: 14 }
           | { <span class="s">"code"</span>: <span class="s">"ID-VEL-00"</span>, <span class="s">"detail"</span>: <span class="s">"network check unavailable"</span> }`,`POST <span class="wa">/v2/assess</span>  (new, breaking)
{ networkVelocity: { hit, count } , ... }`]))}],
 pre:[['ARC','Designing the public contract. 40 lenders parse reasons[] today.']],
 post:[['ARC','Writing <code>contract-summary.md</code>.'],['ARV','Reviewing the contract…']],
 finds:()=>dv('2.8.contract')===1?[{by:'ARV',t:'A new endpoint forces 40 lenders to migrate before they get any value. reasons[] is already designed for extension.',src:'contract-summary.md:L1',fix:'2.8.contract',ch:'Make it an additive reasons[] entry'}]:[]
},
'2.9':{
 dec:['2.9.verify','2.9.exec'],
 files:[{p:REC+'inception/delivery-planning/bolt-plan.md',b:()=>T(['Bolt','Units','Mode'],[dv('2.7.skel')===0?['B1','u0-walking-skeleton','serial, checkpoint']:null,['B2',unitList().filter(u=>u.id!=='u0-walking-skeleton').map(u=>u.id.split('-')[0]).join(', '),pk('2.9.exec',['unit-major, serial','<b>stage-major, swarm</b> (git worktrees)'])]])+P('Construction Verification Command: <code>'+pk('2.9.verify',['make e2e','npm run lint'])+'</code>')},
        {p:REC+'inception/delivery-planning/team-allocation.md',b:()=>L(['Sam: approves code units','Maya: infra & ops gates','Theo: security & CI gates','Priya: product gates'])},
        {p:REC+'verification/phase-check-inception.md',opt:1,b:()=>P('Phase check: every FR has a story, every story has a unit, and every unit has a bolt.')}],
 pre:[['DLV','Planning bolts: delivery slices over one or more dependency-linked Units. The verification command and the execution mode are human calls.']],
 post:[['DLV','Bolt plan written. Running the Inception phase check.']]
},
/* ===== 3 CONSTRUCTION ===== */
'3.1':{
 files:[{p:REC+U2+'functional-design/rules.md',b:()=>L(['R-1: count distinct <i>other</i> lenders per fingerprint in a 14-day sliding window','R-2: fire ID-VEL-02 at '+pk('2.3.rule',['≥ 3','≥ 1','≥ 5 (24 h)']),'R-3: never return lender identifiers','R-4: on timeout → '+pk('2.3.fail',['ID-VEL-00','wait','decline'])])},
        {p:REC+U2+'functional-design/functional-spec.md',b:()=>PRE('assess(app):\n  fp  = fingerprint(app.name, app.dob, app.addr)\n  n   = counter.record(fp, app.lender)\n  if n ≥ T: reasons += ID-VEL-02(n)')},
        {p:REC+U2+'functional-design/entities.md',opt:1,b:()=>L(['Fingerprint (opaque, 32 bytes)','LenderSighting { fp, lender, ts }','NetworkCount { fp, distinctLenders, window }'])}],
 pre:[['ARC','Functional design for <b>u2-network-velocity</b>. In a real run every Unit walks stages 3.1–3.5 in turn and is approved at its own checkpoint; this simulator follows u2 and builds the others in 3.5.']],
 post:[['ARC','Rules, spec and entities written.'],['ARV','Reviewing functional design…']]
},
'3.2':{
 dec:['3.2.slo','3.2.threat'],
 files:[{p:REC+U2+'nfr-requirements/performance-requirements.md',b:()=>L(['SLO: '+pk('3.2.slo',['99.9% monthly · network check p99 &lt; 150 ms','99.99% monthly','<span class="no">none</span>']),'Throughput: '+peakTxt()+', ×4 at quarter end'])},
        {p:REC+U2+'nfr-requirements/security-requirements.md',b:()=>L(['Fingerprints: '+pk('2.3.hash',['HMAC-SHA-256 (KMS)','<span class="no">unsalted SHA-256</span>']),'Threshold probing: '+pk('3.2.threat',['per-lender rate limit; threshold never echoed','<span class="no">unmitigated</span>']),'PII never logged'])},
        {p:REC+U2+'nfr-requirements/observability-requirements.md',opt:1,b:()=>L(['RED metrics per reason code','Trace id through /assess'])}],
 pre:[['ARC','NFR requirements for u2: performance, security, observability.'],['DSO','Contribution: threat model drafted. One open threat is <b>threshold probing</b>.'],['ARC','One open threat stands out: <b>threshold probing</b>.']],
 post:[['ARC','Writing performance, security and observability requirements.']],
 finds:()=>{const f=[];if(dv('3.2.slo')===2)f.push({by:'ARC',t:'No SLO means no error budget and no burn-rate alarms.',src:'performance-requirements.md:L1',fix:'3.2.slo',ch:'Set 99.9% / p99 < 150 ms'});if(dv('3.2.slo')===1)f.push({by:'ARC',t:'99.99% needs multi-region, which is out of scope and costs about 10×.',src:'performance-requirements.md:L1',fix:'3.2.slo',ch:'Set 99.9% / p99 < 150 ms'});if(dv('3.2.threat')===1)f.push({by:'DSO',t:'Threshold probing is unmitigated: a ring can learn the exact limit in about 40 calls.',src:'security-requirements.md:L2',fix:'3.2.threat',ch:'Add a per-lender rate limit'});return f}
},
'3.3':{
 dec:['3.3.res'],
 files:[{p:REC+U2+'nfr-design/performance-design.md',b:()=>L(['Counter store client: '+pk('3.3.res',['circuit breaker, 120 ms timeout → ID-VEL-00','<span class="wa">3 retries with backoff</span>','<span class="no">no timeout</span>']),'Counter key: '+storeTxt()])},
        {p:REC+U2+'nfr-design/security-design.md',opt:1,b:()=>L(['KMS GenerateMac for fingerprints','API GW usage plans per lender'])}],
 pre:[['ARC','Designing resilience for the counter store call.']],
 post:[['ARC','Writing NFR design.'],['ARV','Reviewing NFR design…']],
 finds:()=>dv('3.3.res')===1?[{by:'ARV',t:'Retries multiply load on a store that is already struggling, causing a retry storm.',src:'performance-design.md:L1',fix:'3.3.res',ch:'Use a circuit breaker with fallback'}]:dv('3.3.res')===2?[{by:'ARV',t:'With no timeout on the hot path, p99 has no upper bound (CQ-02 repeats).',src:'performance-design.md:L1',fix:'3.3.res',ch:'Add a 120 ms timeout and breaker'}]:[]
},
'3.4':{
 why:'Capacity for the surge is decided here, not on surge day.',
 dec:['3.4.cap'],
 files:[{p:REC+U2+'infrastructure-design/infrastructure-specification.md',b:()=>T(['Resource','Spec'],[['DynamoDB network-counter',pk('3.4.cap',['on-demand, TTL 14 d','<span class="wa">provisioned 1,500 WCU fixed</span>'])],['Lambda assess',pk('3.4.cap',['provisioned concurrency 50 → 400 (scheduled)','<span class="wa">reserved 120, fixed</span>'])],['KMS','HMAC key, symmetric, rotation yearly'],['AppConfig','feature flag vel02.enabled']])},
        {p:REC+U2+'infrastructure-design/monitoring-design.md',opt:1,b:()=>L(['CloudWatch dashboards per reason code','X-Ray traces on /assess'])},
        {p:REC+U2+'infrastructure-design/cicd-pipeline.md',opt:1,b:()=>L(['CDK pipeline, 3 stages: dev → staging → prod'])}],
 pre:[['AWS','Specifying infrastructure. Forecast: 4× normal traffic at quarter end.']],
 post:[['AWS','Writing the infrastructure specification.']],
 finds:()=>dv('3.4.cap')===1?[{by:'AWS',t:'Fixed capacity is sized for average traffic, so the 4× quarter-end surge will be throttled.',src:'infrastructure-specification.md:L2',fix:'3.4.cap',ch:'Use on-demand + scheduled scaling'}]:[]
},
'3.5':{
 dec:['3.5.addr'],
 files:[{p:REC+U2+'code-generation/code-generation-plan.md',b:()=>(zeroUnit()?P('This scope skips Units Generation, so there are no Units: one plan, written to <code>construction/code-generation/</code>.'):P('Every Unit has its own plan at <code>construction/&lt;unit&gt;/code-generation/code-generation-plan.md</code>, and each gets its own approval receipt.'))+L(unitList().map(u=>'<b>'+u.id+'</b>: '+u.plan))},
        {p:REC+U2+'code-generation/code-summary.md',b:()=>T(['Unit','Files','Tests'],unitList().map(u=>[u.id,u.files,u.tests]))+P('Address gaps: '+pk('3.5.addr',['postcode+DOB fallback, else ID-VEL-00','<span class="wa">silently skipped</span>','<span class="no">name+DOB only</span>'],0))},
        {p:REC+U2+'code-generation/unit-test-instructions.md',opt:1,b:()=>PRE('npm test -- --coverage\n'+pk('2.9.verify',['make e2e','npm run lint'])+'   # the authorized Construction Verification Command')}],
 pre:[['DEV','Drafting a code plan for each Unit. No code is written until its plan is approved.']],
 post:[['DEV','All units generated. Writing <code>code-summary.md</code>.'],['ARV','Reviewing generated code against the functional spec…']],
 sfail:()=>({s:'required-sections',t:'code-summary.md is missing a required H2 heading.',src:'code-summary.md',auto:'DEV',fixmsg:'Heading restored. Sensor re-run: pass.'}),
 finds:()=>dv('3.5.addr')===1?[{by:'QA',t:'Silent skips: 6% of applications get no network check and no reason code. Invisible to lenders.',src:'u2/src/matcher.ts:31',fix:'3.5.addr',ch:'Use postcode fallback + ID-VEL-00'}]:dv('3.5.addr')===2?[{by:'QA',t:'Name+DOB matching: projected false-positive rate is 11% in shared housing.',src:'u2/src/matcher.ts:31',fix:'3.5.addr',ch:'Use postcode fallback + ID-VEL-00'}]:[]
},
'3.6':{
 files:[{p:REC+'construction/build-and-test/test-results.md',b:()=>T(['Suite','Result'],[['unit','<span class="ok">412 passed</span>'],['integration','<span class="ok">38 passed</span>'],['contract (reasons[])','<span class="ok">12 passed</span>'],['coverage','84%']])},
        {p:REC+'construction/build-and-test/build-instructions.md',opt:1,b:()=>PRE('npm ci && npm run build && npm test && make e2e')}],
 pre:[['QA','Building every unit and running unit, integration and contract suites.']],
 post:[['QA','All green. Coverage is up from 71% to 84%.']]
},
'3.7':{
 dec:['3.7.gates'],
 files:[{p:REC+'construction/ci-pipeline/quality-gates.md',b:()=>T(['Gate','Mode'],[['SAST',pk('3.7.gates',['blocking','advisory'])],['Dependency scan',pk('3.7.gates',['blocking','advisory'])],['Secrets scan',pk('3.7.gates',['blocking','advisory'])],['Coverage ≥ 80%',pk('3.7.gates',['blocking','advisory'])]])},
        {p:REC+'construction/ci-pipeline/ci-config.md',opt:1,b:()=>PRE('on: pull_request\njobs: build · test · sast · deps · secrets · coverage')},
        {p:REC+'verification/phase-check-construction.md',opt:1,b:()=>P('Phase check: every unit is built and tested, and every FR has a passing test.')}],
 pre:[['PIP','Configuring CI and quality gates.']],
 post:[['PIP','Writing CI config and quality gates, plus the Construction phase check.']],
 finds:()=>dv('3.7.gates')===1?[{by:'DSO',t:'Advisory secrets scanning means a leaked KMS ARN or key could merge to main.',src:'quality-gates.md:L3',fix:'3.7.gates',ch:'Make security scans blocking'}]:[]
},
/* ===== 4 OPERATION ===== */
'4.1':{
 dec:['4.1.strategy'],
 files:[{p:REC+'operation/deployment-pipeline/deployment-strategy.md',b:()=>P(pk('4.1.strategy',['<b>Canary</b> 5% → 25% → 100%, 10 min bake each, auto-rollback on SLO burn','<b>Blue/green</b> switch with instant flip-back','<b>All at once</b>']))},
        {p:REC+'operation/deployment-pipeline/rollback-runbook.md',b:()=>L(['Trigger: '+pk('4.4.alarm',['burn-rate alarm','CPU alarm'],0),'Action: '+pk('4.1.strategy',['canary auto-rollback (~2 min)','flip to blue (~1 min)','redeploy previous (~8 min)']),'Also: AppConfig flag vel02.enabled=false'+(dv('2.2.flag')===0?' (team rule)':' <span class="wa">(no flag planned)</span>')])},
        {p:REC+'operation/deployment-pipeline/cd-config.md',opt:1,b:()=>PRE('pipeline: aegle-api-cd\nstages: staging → prod')}],
 pre:[['PIP','Designing the CD pipeline and rollback.']],
 post:[['PIP','Writing the deployment strategy and rollback runbook.']],
 finds:()=>dv('4.1.strategy')===2?[{by:'PIP',t:'All-at-once has no blast-radius control, and rollback takes about 8 minutes.',src:'deployment-strategy.md:L1',fix:'4.1.strategy',ch:'Use a canary with auto-rollback'}]:[]
},
'4.2':{
 dec:['4.2.kms'],
 files:[{p:REC+'operation/environment-provisioning/validation-report.md',b:()=>T(['Check','Result'],[['DynamoDB TTL','<span class="ok">pass</span>'],['KMS key policy',pk('4.2.kms',['<span class="ok">least privilege</span>','<span class="no">account-wide</span>'])],['AppConfig flag','<span class="ok">present</span>']])},
        {p:REC+'operation/environment-provisioning/environment-inventory.md',opt:1,b:()=>L(['dev (eu-west-1)','staging (eu-west-1)','prod (eu-west-1)'])}],
 pre:[['AWS','Provisioning staging and prod with CDK. Validating against the spec.']],
 post:[['AWS','Writing the inventory and validation report.']],
 finds:()=>dv('4.2.kms')===1?[{by:'CMP',t:'An account-wide KMS grant lets any compromised role compute fingerprints.',src:'validation-report.md:L2',fix:'4.2.kms',ch:'Restrict the key policy to fingerprint-svc'}]:[]
},
'4.3':{
 dec:['4.3.window'],
 files:[{p:REC+'operation/deployment-execution/deployment-log.md',b:()=>PRE(pk('4.1.strategy',['09:58 canary 5%  ✓ healthy\n10:08 canary 25% ✓ healthy\n10:18 100%       ✓ healthy','10:00 green up ✓\n10:05 flip ✓','10:00 deploy 100% ✓'],0))},
        {p:REC+'operation/deployment-execution/smoke-test-results.md',b:()=>L(['/assess returns ID-VEL-02 for seeded ring identity ✓','/assess returns ID-VEL-00 with the counter store blocked ✓','p99 142 ms ✓'])}],
 pre:[['PIP','Ready to deploy to prod. The deploy window is a human call.']],
 post:[['PIP','Writing the deployment log and smoke test results.']],
 finds:()=>dv('4.3.window')===1?[{by:'OPS',t:'A Friday 17:00 deploy with quarter end 9 days away and thin weekend on-call.',src:'deployment-log.md:L1',fix:'4.3.window',ch:'Move to Tuesday 10:00'}]:[]
},
'4.4':{
 dec:['4.4.alarm'],
 files:[{p:REC+'operation/observability-setup/slo-config.md',b:()=>PRE(dv('3.2.slo')===undefined||dv('3.2.slo')===0?'slo: network-check-availability  target: 99.9%  window: 30d\nslo: network-check-latency      p99 < 150ms':(dv('3.2.slo')===1?'slo: 99.99%  window: 30d   <span class="wa"># budget ≈ 4 min</span>':'<span class="no"># no SLO defined</span>'))},
        {p:REC+'operation/observability-setup/alarms.md',b:()=>L(pk('4.4.alarm',[['fast burn: 2% budget / 1 h → page','slow burn: 5% / 6 h → ticket'],['CPU &gt; 80% → page']]))},
        {p:REC+'operation/observability-setup/dashboards.md',opt:1,b:()=>L(['Network Velocity: hits/s, ID-VEL-00 rate, p99, throttles'])}],
 pre:[['OPS','Wiring dashboards, alarms and SLOs.']],
 post:[['OPS','Writing SLO config, alarms and dashboards.']],
 finds:()=>dv('4.4.alarm')===1?[{by:'OPS',t:'A CPU alarm will not page on latency or error-budget burn.',src:'alarms.md:L1',fix:'4.4.alarm',ch:'Use SLO burn-rate alarms'}]:[]
},
'4.5':{
 dec:['4.5.esc'],
 files:[{p:REC+'operation/incident-response/runbooks.md',b:()=>L(['RB-1 counter store hot / throttled → reshard or scale','RB-2 false-positive spike → disable per segment via flag','RB-3 threshold probing → tighten per-lender rate limit'])},
        {p:REC+'operation/incident-response/escalation-matrix.md',b:()=>P(pk('4.5.esc',['SEV-1: incident commander (Jordan) · SRE (Maya) · lender status page within 15 min','<span class="wa">Email aegle-api-team@</span>']))},
        {p:REC+'operation/incident-response/incident-plan.md',opt:1,b:()=>L(['Declare → Investigate → Mitigate → Communicate → Postmortem'])}],
 pre:[['OPS','Writing runbooks for the failure modes we already know about.']],
 post:[['OPS','Runbooks, incident plan and escalation matrix written.']],
 finds:()=>dv('4.5.esc')===1?[{by:'OPS',t:'With email-only escalation, lenders learn about an outage from their own dashboards.',src:'escalation-matrix.md:L1',fix:'4.5.esc',ch:'Add an IC and a status page'}]:[]
},
'4.6':{
 why:'This is the last chance to find the surge\'s weak spot before the surge does.',
 dec:['4.6.load'],
 files:[{p:REC+'operation/performance-validation/nfr-validation-matrix.md',b:()=>T(['NFR','Target','Measured'],[['NFR-1','p99 &lt; 300 ms',S.flags.loadP99||'—'],['NFR-2',peakTxt(),S.flags.loadPeak||'—'],['SLO','99.9%','—']])},
        {p:REC+'operation/performance-validation/load-test-plan.md',opt:1,b:()=>P(pk('4.6.load',['Production-shaped load at 2× peak, with 2% ring identities repeated 2,000×/min','Replay of October traffic at 1×']))}],
 pre:[['QA','Planning the load test.']],
 post:[['QA','Writing the NFR validation matrix.']],
 run:loadTest
},
'4.7':{
 dec:['4.7.next'],
 files:[{p:REC+'operation/feedback-optimization/slo-report.md',b:()=>L(['Quarter-end surge: '+(S.boss?(S.boss.won?'<span class="ok">SLO held</span>, '+Math.round(S.boss.budget)+'% budget left':'<span class="no">SLO breached</span>'):'—'),'ID-VEL-02 hits: 1,942 in the first week','Confirmed fraud among hits: 61%'])},
        {p:REC+'operation/feedback-optimization/feedback-loop.md',b:()=>P('Next intent → '+pk('4.7.next',['<b>ID-VEL-03</b>: lender feedback tunes thresholds','dashboard','<span class="no">none</span>']))},
        {p:REC+'operation/feedback-optimization/cost-analysis.md',opt:1,b:()=>L(['$0.00004 per assessment','KMS GenerateMac is 38% of cost → cache per request'])}],
 pre:[['OPS','Collecting SLO, cost and incident data from the first weeks in production.']],
 post:[['OPS','Writing the SLO report, cost analysis and feedback loop. Feeding back into <b>1.1 Intent Capture</b>.']]
},
};

/* ---------- the incident: what production does with everything you approved ---------- */
function incident(D){
  const cause=(D['2.6.store']===undefined||D['2.6.store']===1)?'hot':D['1.2.buy']===1?'vendor':D['3.4.cap']===1?'throttle':'surge';
  const CAUSES={
    hot:{n:'Latency spike',sev:100,sym:'p99 for the network check is at <b>2.4 s</b> and climbing. DynamoDB reports throttling on a single partition.',rc:`Hot partition: every assessment for a ring writes the same fingerprint item. ${D['2.6.store']===undefined?'Domain Design (2.6) was skipped, so nobody shaped the key.':'2.6 chose one item per fingerprint.'}`,best:'reshard'},
    vendor:{n:'Vendor feed timeouts',sev:90,sym:'Assessments are queueing behind an external call. Timeouts are cascading into lender queues.',rc:'The vendor identity feed is rate-limiting us: 1.2 chose to call it on every assessment.',best:'breaker'},
    throttle:{n:'Capacity throttling',sev:85,sym:'Lambda throttles, plus DynamoDB <code>ProvisionedThroughputExceeded</code>, at 4× normal traffic.',rc:'Fixed capacity sized for average traffic (3.4) cannot absorb a quarter-end peak.',best:'scale'},
    surge:{n:'Quarter-end surge',sev:60,sym:'Traffic is at 4× normal. Latency is rising, but nothing is throttling yet.',rc:'Pure load. Your design held: capacity just needs to follow demand.',best:'scale'},
  };
  const peakPen=S.flags.peakSourced?0:15;
  const fpSev=Math.max(20,(D['3.5.addr']===2?100:70)-(D['2.4.honest']===0?20:0));
  const waves=[
    {id:cause,...CAUSES[cause],sev:CAUSES[cause].sev+peakPen,chart:'p99'},
    {id:'fp',n:'False-positive storm',sev:fpSev,sym:'Lenders report honest applicants flagged by ID-VEL-02. Manual review queues are overflowing.',rc:D['3.5.addr']===2?'Matching on name + date of birth only (3.5) collides for common names.':'Quarter-end applications arrive with incomplete addresses, which produce loose matches.',best:'tune',chart:'err'},
    {id:'probe',n:'Enumeration probe',sev:60,sym:'One caller is sending thousands of near-identical requests, as if testing the threshold.',rc:'An attacker is reverse-engineering the velocity threshold.',best:'ratelimit',chart:'rps',auto:D['3.2.threat']===0,autoLog:'The per-lender rate limit from the 3.2 threat model is already blocking it.'},
  ];
  const abil=[
   {id:'investigate',n:'Investigate',ag:'OPS',role:'ops',cast:2,cd:0,util:1,d:'Read dashboards and traces to find the cause.',src:()=>'always available'},
   {id:'breaker',n:'Trip circuit breaker',ag:'DEV',role:'eng',cast:1.5,cd:12,d:'Fail open to ID-VEL-00. Lending continues.',dmg:{vendor:70,hot:40,_:30},req:()=>D['3.3.res']===0||D['2.3.fail']===0,src:()=>D['3.3.res']===0?'3.3 NFR Design: circuit breaker':D['2.3.fail']===0?'2.3 Requirements: fail open':'needs a fail-open design (2.3 or 3.3)'},
   {id:'scale',n:'Scale out',ag:'AWS',role:'ops',cast:()=>D['3.4.cap']===0?2:4,cd:10,d:'Raise capacity and concurrency.',dmg:{surge:60,throttle:70,hot:10,probe:15},src:()=>D['3.4.cap']===0?'3.4: on-demand (fast scale)':'always available'},
   {id:'reshard',n:'Hotfix: reshard key',ag:'DEV',role:'eng',cast:6,cd:15,d:'Spread hot fingerprints across 10 partitions.',dmg:{hot:100},src:()=>'always available (slow)'},
   {id:'tune',n:'Hotfix: tune matcher',ag:'QA',role:'eng',cast:()=>D['3.5.addr']===0?3.5:5,cd:12,d:'Tighten matching for incomplete addresses.',dmg:w=>w.id==='fp'?(D['3.5.addr']===0?100:70):0,src:()=>D['3.5.addr']===0?'3.5: postcode fallback exists (stronger)':'always available'},
   {id:'flag',n:'Flag off segment',ag:'PIP',role:'ops',cast:1,cd:0,once:1,util:1,d:'Turn ID-VEL-02 off for the affected segment only.',dmg:{_:50},req:()=>D['2.2.flag']===0,src:()=>D['2.2.flag']===0?'2.2 Practices: feature-flag practice confirmed':'needs the feature-flag practice (2.2)'},
   {id:'runbook',n:'Run runbook',ag:'OPS',role:'ops',cast:1,cd:20,util:1,d:'A known mitigation that reduces severity.',dmg:{_:20},req:()=>S.ran.has('4.5'),src:()=>S.ran.has('4.5')?'4.5 Incident Response: runbooks':'needs Incident Response (4.5)'},
   {id:'ratelimit',n:'Tighten rate limit',ag:'DSO',role:'sec',cast:3,cd:10,d:'Throttle abusive callers per lender.',dmg:{probe:80,surge:25},src:()=>'always available'},
   {id:'rollback',n:'Roll back',ag:'PIP',role:'ops',cast:()=>[3,2,8][D['4.1.strategy']??2],cd:0,once:1,util:1,d:'A blunt fix: ends the incident but turns the feature off.',src:()=>'4.1: '+(['canary (~3 s)','blue/green (~2 s)','all-at-once (~8 s)'][D['4.1.strategy']??2])},
   {id:'notify',n:'Notify lenders',ag:'PRD',role:'po',cast:()=>D['4.5.esc']===0?1:2,cd:0,once:1,util:1,d:'Post to the status page so lenders route to manual review.',src:()=>D['4.5.esc']===0?'4.5: status page ready (fast)':'always available'},
   {id:'escalate',n:'Page incident commander',ag:'DLV',role:'pm',cast:2,cd:0,once:1,util:1,d:'An IC coordinates the response, so all casts are 40% faster.',src:()=>D['4.5.esc']===0?'4.5: escalation matrix':'always available'},
  ];
  return {
    h:'Quarter-end surge',
    p:'It\'s the last business day of the quarter. Traffic is at 4× normal and ID-VEL-02 is live for every lender. Alarms are firing.',
    unshipped:`The ${scope().n} scope stops before deployment, so the team shipped ID-VEL-02 by hand to make quarter end. Nothing in Operation was ever designed. Traffic is at 4× normal, and alarms are firing.`,
    comms:'Lenders who know can route to manual review.',
    abil,waves,
    logs:{notify:'Status page posted. Lenders route flagged applications to manual review.',rollback:'Rolled back. ID-VEL-02 is off for every lender. The incident is over, and so is the feature.'},
    result:{won:'All three waves mitigated. The feature stayed on for every lender.',rollback:'The incident is over, but ID-VEL-02 is off and lenders lost the warning at quarter end.',breach:'The error budget ran out. Lenders saw failures at the worst possible moment.'},
    score:{notified:['Lenders notified','Lenders never notified'],rolled:'Feature rolled back'},
    why(){const items=[];
      items.push([`Wave 1 was <b>${CAUSES[cause].n.toLowerCase()}</b>`,cause==='surge'?'good':'bad',cause==='hot'?(D['2.6.store']===undefined?'Domain Design was skipped, so the counter key was never shaped.':'2.6 Domain Design chose one item per fingerprint.'):cause==='vendor'?'1.2 chose to call the vendor feed on every assessment.':cause==='throttle'?'3.4 sized fixed capacity for average traffic.':'Partitioned keys, on-demand capacity and your own data kept the cause simple.']);
      if(peakPen)items.push(['Severity +15: nobody had sourced the peak','bad','The quarter-end peak figure never got a source tag (the claim-sources sensor at 1.1 Intent Capture).']);
      items.push([`False-positive storm at severity ${fpSev}`,fpSev<=50?'good':'bad',`3.5 matching: ${['postcode fallback','skip silently','name + DOB only'][D['3.5.addr']??1]||'n/a'}. ${D['2.4.honest']===0?'2.4 honest-applicant story lowered it.':'No honest-applicant story at 2.4.'}`]);
      items.push([waves[2].auto?'The probe was blocked automatically':'The probe had to be fought by hand',waves[2].auto?'good':'bad',waves[2].auto?'3.2 threat model added per-lender rate limits.':'3.2 called enumeration an edge case, or NFR Requirements was skipped.']);
      return items},
  };
}

/* ---------- debrief: each outcome traced back to the decision that caused it ---------- */
function debrief(C2,D){
  if(D['1.1.success']!==undefined)C2('1.1',D['1.1.success']===0,D['1.1.success']===0?'An outcome measure (fraud losses −30%) gave every later stage a test to pass.':'An output target meant nobody could tell whether the feature worked.');
  if(D['1.3.legal']!==undefined)C2('1.3',D['1.3.legal']===0,D['1.3.legal']===0?'HMAC fingerprints under a data-sharing agreement kept personal data out of the network.':'The legal basis for sharing identities was weak.');
  if(D['2.2.flag']!==undefined)C2('2.2',D['2.2.flag']===0,D['2.2.flag']===0?'Confirming the feature-flag practice put “Flag off segment” in your incident loadout.':'Without the flag practice there was no way to switch off one segment.');
  if(D['2.9.verify']!==undefined)C2('2.9',D['2.9.verify']===0,D['2.9.verify']===0?'A real end-to-end verification command made every Unit checkpoint mean something.':'A lint-only verification command let an integration bug through to Build and Test.');
  C2(S.plan.includes('1.1')?'1.1':'—',!!S.flags.peakSourced,S.flags.peakSourced?'Sourcing the peak figure made the capacity plan real.':S.plan.includes('1.1')?'The unsourced peak figure added +15 severity to wave 1.':'This scope skipped Intent Capture and ran no sensors, so the peak figure was never sourced: +15 severity on wave 1.');
  C2('2.6',D['2.6.store']===0,D['2.6.store']===0?'Write-sharding the counter key prevented a hot partition.':D['2.6.store']===undefined?'Domain Design was skipped, so the hot partition hit production.':'The counter key design created a hot partition.');
  if(D['2.7.skel']!==undefined)C2('2.7',D['2.7.skel']===0,D['2.7.skel']===0?'A walking skeleton proved the units fit together early.':'Building units in isolation caused an integration failure at 3.6.');
  if(D['3.2.threat']!==undefined)C2('3.2',D['3.2.threat']===0,D['3.2.threat']===0?'The threat model blocked the enumeration probe automatically.':'Skipping enumeration left the probe for you to fight.');
  if(D['3.5.addr']!==undefined)C2('3.5',D['3.5.addr']===0,D['3.5.addr']===0?'The postcode fallback made the false-positive fix strong.':'Loose matching fed the false-positive storm.');
  if(D['4.5.esc']!==undefined)C2('4.5',D['4.5.esc']===0,D['4.5.esc']===0?'An escalation matrix made notifying lenders nearly instant.':'Email escalation slowed the response.');
}

return {
 id:'velocity',n:'Network Velocity',kind:'new capability',col:'var(--cyan)',
 tag:'Warn lenders when one identity is being used across many lenders.',
 d:'Fraud rings now spread one identity across many lenders, so each lender sees only one application. Lenders want a network-wide warning, ID-VEL-02, live before the quarter-end surge. It also has to stay up when the surge arrives.',
 ask:'Warn lenders when one identity appears across many lenders',
 intent:'network-velocity',REC,KB,U2,
 boot:{repo:'aegle-api',ws:'brownfield · TypeScript + Python · 14,212 LOC',note:'v1 shipped from this repo: ID-VEL-01 is live in production.'},
 scopes:['feature','enterprise','workshop','classic','express'],best:'feature',
 fit:{
  feature:{v:'best',t:'New behaviour on a production hot path, with personal data crossing lender boundaries. Every phase earns its place.'},
  enterprise:{v:'ok',t:'Defensible if a regulator will read the audit trail: support agents join every stage and Guard Policy is strict. Slower, and the score counts ×1.3.'},
  workshop:{v:'ok',t:'Works if the outcome and scope are already agreed. It skips Ideation, so nobody frames the success measure or sources the peak figure.'},
  classic:{v:'poor',t:'Stops at Build and Test. The deploy pipeline, alarms and runbooks this work needs are never designed.'},
  express:{v:'poor',t:'No design pass, reviewers or sensors for a new hot-path store. It is fast, and the surge finds what nobody checked.'},
 },
 composer:{E:[.42,.31,.58,.74,.47],why:'Risk is HIGH (0.74 ≥ 0.70): personal data shared across lenders, plus a new hot-path store. Express would drop Domain Design, the NFR stages, every reviewer and every sensor. Enterprise adds support agents on every stage and Guard Policy strict: the right call if a regulator will read the audit trail.'},
 DEC,stages,units:unitList,
 skel:'/assess → fingerprint → counter → reason stub',
 midBuild:{unit:'u2',dec:'3.5.addr'},
 verify:()=>({cmd:S.dec['2.9.verify']===1?'npm run lint':'make e2e',weak:S.dec['2.9.verify']===1}),
 loopBack:()=>!zeroUnit()&&(S.dec['2.7.skel']===1||S.dec['2.9.verify']===1)?{why:S.dec['2.7.skel']===1?'Integration failure: u2 returns <code>count</code> as a string, but u3 expects a number. Without a walking skeleton the Units were never run together before now.':'Integration failure: u2 returns <code>count</code> as a string, but u3 expects a number. Every checkpoint was "verified" by a lint pass, so nothing ever ran end to end.',fixed:'Second run: green. The contract mismatch is fixed.'}:null,
 deploy:{what:'ID-VEL-02',all:'No blast-radius control: 100% of lenders got it at once.'},
 addStage:{at:'2.3',add:'2.6',ask:'Domain Design is skipped in this scope, but the requirements add a new hot-path counter store. Add it?',sub:'The requirements add a new hot-path store that nobody has designed.'},
 phaseChecks:from=>({1:[['Every claim in the intent carries a source tag',!!S.flags.peakSourced],['RAID items have owners',S.dec['1.7.go']!==1]],2:[['Every FR has a story',S.dec['2.4.honest']!==1]],3:[['Security checks block a merge in CI',S.dec['3.7.gates']!==1]]})[from]||[],
 traceGap:()=>!S.flags.peakSourced&&S.ran.has('2.3'),
 humanSensor:'1.1',
 outcome:()=>S.dec['1.1.success']===0,
 badge:{ic:'🔐',n:'Privacy by Design',d:'HMAC fingerprints, no lender names, DSA basis.',test:()=>S.dec['2.3.hash']===0&&S.dec['1.3.legal']!==1&&S.dec['1.6.resp']!==1},
 incident,debrief,
};
})();
