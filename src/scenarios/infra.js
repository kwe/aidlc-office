/* Scenario: the second region. An infrastructure change under a live fraud signal.
   Written for the stages that infra and express run. Everything here is story. */
SCENARIOS.infra=(()=>{
const REC='aidlc/spaces/identity/intents/270112-second-region/';
const KB='aidlc/spaces/identity/codekb/aegle-api/';
const ASK='Run /assess in a second region so it survives a regional outage: back in 15 minutes, at most 1 minute of data lost';
const NOT=()=>`not designed: that stage is not in the ${scope().n} scope`;
const driftOk=()=>dv('2.2.cdk')===0||dv('2.1.state')===0;                 // the hand-made console change is known and handled
const keyOk=()=>dv('3.4.key')===0||!!S.flags.keyFix;                      // both regions compute the same fingerprint
const counterOk=()=>dv('3.3.counter')===0||!!S.flags.counterFix;          // two regions can never overwrite each other's sightings
const capOk=()=>dv('3.4.cap')===0&&driftOk();                             // one region can carry everything
const autoFo=()=>dv('3.2.fo')===0;

const DEC={
 '2.1.state':{own:'ops',by:'DEV',q:'The CDK code says what should be deployed. Do I check it against what is actually running?',ctx:'Reverse Engineering reads the repository. Infrastructure also has a second source of truth: the account.',o:[
  {t:'Yes: run a drift check against the live stacks first',s:10,q:5,fb:'One difference: the counter table\'s capacity mode was changed by hand, in the console, during the quarter-end incident.'},
  {t:'No. Infrastructure is code here, so the code is the truth.',s:2,r:10,fb:'It was, until somebody clicked in the console at 02:00 during an incident.'}]},
 '2.2.cdk':{own:'ops',by:'PIP',q:'Every infrastructure change in the last 90 days went through CDK, except one: the counter table was switched to on-demand capacity in the console during the quarter-end incident. Is "infrastructure changes go through CDK only" how this team works?',ctx:'Practices you confirm are promoted to team memory when you approve this stage. Agents then apply them on every future intent.',o:[
  {t:'Yes, and bring the table back under CDK before this work starts',s:10,q:5,fb:'The rule and the account agree again, so the next deploy changes only what the plan says.'},
  {t:'Yes, but leave the table alone. It works.',s:4,r:5,fb:'The rule is on paper and the exception is in production. The next deploy of that stack will quietly undo the manual change.'},
  {t:'No. Sometimes the console is faster.',s:0,r:10,fb:'Then no plan the agents write can be trusted to describe what is running.'}]},
 '2.3.target':{own:'po',by:'PRD',q:'The contract draft says /assess must "survive a regional outage". What do we commit to?',ctx:'Requirements for infrastructure are numbers somebody else will hold you to.',o:[
  {t:'Back within 15 minutes, with at most 1 minute of data lost: the figures in clause 9.3 of the draft',s:10,q:5,fb:'Sourced, testable, and exactly what the lenders asked for.'},
  {t:'Zero downtime and zero data loss',s:3,r:5,fb:'A different architecture at several times the cost, and more than the contract asks for.'},
  {t:'"High availability". Leave the numbers to engineering.',s:0,r:10,fb:'A requirement nobody can test, for a clause a lender\'s lawyer certainly will.'}]},
 '2.3.where':{own:'sec',by:'PRD',q:'Which region is the second one?',ctx:'Fingerprints and counters are derived from applicants\' personal data.',o:[
  {t:'eu-central-1 (Frankfurt): inside the EU, as the data-sharing agreement requires',s:10,r:-5,fb:'No change to the agreement or the DPIA.'},
  {t:'eu-west-2 (London): close and cheap',s:5,fb:'It is outside the EU, so the DPIA needs amending before any data can land there. That is weeks, not days.'},
  {t:'us-east-1: the cheapest, with every service available',s:0,r:20,fb:'Data derived from EU applicants would be stored in the US. The agreement and the DPIA both say EU only.'}]},
 '3.2.mode':{own:'ops',by:'ARC',q:'How do the two regions share the work?',ctx:'NFR Requirements turns "survive an outage" into a shape the design has to meet.',o:[
  {t:'Active-active: both regions serve lenders all the time, so a failover is ordinary traffic',s:10,fb:'The second region is exercised by every request, every day.'},
  {t:'Active-passive: the second region waits and is switched on in an outage',s:5,fb:'Cheaper. The standby is only ever tested for real on the worst day.'},
  {t:'Backup and restore into the second region',s:0,r:15,fb:'A restore takes hours. The requirement is 15 minutes.'}]},
 '3.2.fo':{own:'ops',by:'ARC',q:'Who decides to fail over?',ctx:'The 15 minutes start when the region degrades, not when somebody notices.',o:[
  {t:'Route 53 health checks, automatically, with a manual override',s:10,fb:'Traffic moves in about a minute, whoever is or is not awake.'},
  {t:'The on-call engineer, following a runbook',s:3,r:10,fb:'At 03:00, being paged, finding the runbook and deciding uses most of the 15 minutes before anything has moved.'}]},
 '3.3.counter':{own:'eng',by:'ARC',q:'Both regions will write to the same counters. A DynamoDB global table settles two writes to one item by keeping the later one. How are the counters stored?',ctx:'NFR Design. This is the question the whole change turns on.',o:[
  {t:'One item per identity per region, merged when read',s:10,q:5,fb:'No two regions ever write the same item, so nothing can be overwritten.'},
  {t:'Send every write to eu-west-1 and replicate outwards',s:3,r:10,fb:'Then Frankfurt cannot record a sighting when eu-west-1 is the region that is down.'},
  {t:'One item per identity, replicated. Accept that the later write wins.',s:2,r:15,fb:'A ring hitting both regions in the same second loses sightings, which is exactly when ID-VEL-02 matters.'}]},
 '3.4.key':{own:'sec',by:'AWS',q:'Fingerprints are HMACs made with a KMS key in eu-west-1. What does the second region use?',ctx:'Infrastructure Design. The counters are keyed by fingerprint.',o:[
  {t:'A multi-Region replica of the same key, so both regions compute the same fingerprint',s:10,r:-5,fb:'One identity, one fingerprint, wherever the lender\'s request lands.'},
  {t:'Call KMS in eu-west-1 from both regions',s:2,r:10,fb:'Now Frankfurt needs eu-west-1 for every assessment, which defeats the purpose of having it.'},
  {t:'A new key in the second region',s:0,r:20,fb:'The same person gets a different fingerprint in each region. Their counters never meet, and a ring split across regions disappears.'}]},
 '3.4.cap':{own:'ops',by:'AWS',q:'After a failover, one region carries all the traffic. How is each region sized?',ctx:'AWS Platform is drafting the infrastructure specification.',o:[
  {t:'Each region can carry 100% alone: on-demand tables, and concurrency limits set for the full load',s:10,fb:'The surviving region was built for the day it is the only one.'},
  {t:'Each region is sized for its half',s:0,r:15,fb:'The region that survives gets double its capacity at the moment it is the only one left.'}]},
 '3.5.replace':{own:'ops',by:'DEV',q:'<code>cdk diff</code> says that turning the counter table into a global table will <b>replace</b> it. A replacement is a new, empty table. What do I do?',ctx:'A question raised mid-build. The agent stops to ask before it does something that cannot be undone.',o:[
  {t:'Stop. Add the replica to the existing table in place, in two deploys, and keep the retain policy on',s:10,q:5,fb:'Fourteen days of counters stay exactly where they are.'},
  {t:'Create a new global table beside the old one, and write to both during a cutover',s:7,fb:'Safe, and slower: two tables to keep in step for a fortnight.'},
  {t:'Let it replace. The counters rebuild in 14 days.',s:0,r:20,fb:'Every counter in the network is gone, and ID-VEL-02 is blind for two weeks.'}]},
 '3.6.gameday':{own:'ops',by:'QA',q:'How do we test a second region?',ctx:'Build and Test is the evidence. The thing being built is a response to a failure.',o:[
  {t:'A game day in staging: cut eu-west-1 off, and time the failover against the 15 minutes',s:10,q:5,fb:'The only test that exercises what was actually built.'},
  {t:'cdk synth, unit tests on the templates and a clean deploy to staging',s:2,r:10,fb:'That proves the second region exists. It does not prove that anything moves to it.'}]},
 '3.7.gates':{own:'sec',by:'PIP',q:'Which checks stop an infrastructure change from merging?',ctx:'Quality gates are recorded in quality-gates.md.',o:[
  {t:'cdk diff on every pull request; policy checks and any replacement of a stateful resource block the merge',s:10,fb:'Nobody can replace a table by accident again.'},
  {t:'Report them, and let the author decide',s:2,r:10,fb:'The replacement of a table full of data would be one line in a report nobody has to read.'}]},
 '4.1.strategy':{own:'ops',by:'PIP',q:'How does traffic move onto the two-region setup?',ctx:'This decides how quickly and safely you can undo it.',o:[
  {t:'Weighted routing: 5% → 25% → 100%, rolling back automatically on errors',s:10,fb:'A small share of real traffic finds the problems first.'},
  {t:'Blue/green: one DNS switch',s:6,fb:'Fast to flip back, but every lender moves in the same minute.'},
  {t:'All at once',s:0,r:10,fb:'No way to limit the damage, and DNS takes its time to come back.'}]},
 '4.2.order':{own:'ops',by:'AWS',q:'The second region needs the 14 days of counters that already exist. When does it start taking traffic?',ctx:'Environment Provisioning validates what was built before anything depends on it.',o:[
  {t:'After replication reports the table in sync, and a sample of counters matches in both regions',s:10,fb:'Frankfurt answers its first request knowing everything eu-west-1 knows.'},
  {t:'Straight away. It will catch up.',s:0,r:15,fb:'For the first hours Frankfurt answers from half-empty counters, and misses rings that eu-west-1 can see.'}]},
 '4.3.window':{own:'pm',by:'PIP',q:'When does the second region go live?',ctx:'The contract review is on Monday.',o:[
  {t:'Tuesday 10:00, with the whole team online',s:10,fb:'If routing misbehaves, everyone who understands it is there.'},
  {t:'Friday 17:00, so it is done before Monday\'s review',s:0,r:10,fb:'A new region taking live traffic for its first weekend, with nobody watching.'}]},
 '4.4.alarm':{own:'ops',by:'OPS',q:'What do we alarm on, now that there are two regions?',ctx:'Observability Setup.',o:[
  {t:'SLO burn for each region separately, plus replication lag against the 1-minute limit',s:10,q:5,fb:'A failing region cannot hide behind a healthy one, and the data-loss limit is watched.'},
  {t:'The same global alarms as before',s:2,r:10,fb:'A global average of one healthy region and one failing region looks fine for a long time.'}]},
};

const units=()=>[{id:'aegle-infra',kind:'infrastructure',st:'(no Units in this scope)',plan:'second region: stacks, routing, key and table replication',files:18,tests:46}];
const keyTxt=()=>pkd('3.4.key',['multi-Region replica of the fingerprint key','<span class="wa">KMS in eu-west-1, called from both regions</span>',S.flags.keyFix?'multi-Region replica (after the game day failed)':'<span class="no">a new, separate key</span>'],S.flags.keyFix?'multi-Region replica (after the game day failed)':'<span class="wa">a new key per regional stack (the CDK default). '+NOT()+'</span>');
const counterTxt=()=>pkd('3.3.counter',['one item per identity per region, merged on read','<span class="wa">all writes go to eu-west-1</span>',S.flags.counterFix?'one item per identity per region (after the game day failed)':'<span class="no">one replicated item; the later write wins</span>'],S.flags.counterFix?'one item per identity per region (after the game day failed)':'<span class="wa">one replicated item; the later write wins. '+NOT()+'</span>');
const regionTxt=()=>pk('2.3.where',['eu-central-1','eu-west-2','us-east-1']);

const stages={
...initStages(REC,{ask:ASK,intent:'second-region (contract clause 9.3)',ws:'brownfield · AWS CDK v2 · 3 stacks · 1 region (eu-west-1) · repo <code>aegle-api</code>'}),

'2.1':{
 why:'For infrastructure the repository is only half the picture. The other half is what is running.',
 dec:['2.1.state'],
 files:[
  {p:KB+'architecture.md',b:()=>PRE(`eu-west-1 only
lender ─▶ Route 53 ─▶ API GW ─▶ λ assess ─▶ network-counter (DynamoDB)
                                   └─▶ KMS alias/aegle-fp-hmac`)+P(pk('2.1.state',['Drift check: <b class="wa">network-counter is on-demand in the account and provisioned in the code</b> (changed by hand during the quarter-end incident).','<span class="wa">No drift check run.</span> The diagram shows what the code says.']))},
  {p:KB+'technology-stack.md',b:()=>L(['AWS CDK v2, 3 stacks: api, data, ops','DynamoDB: network-counter, identity-events','KMS: fingerprint HMAC key, single-Region','Route 53: one record, no health checks'])},
  {p:KB+'reverse-engineering-timestamp.md',opt:1,b:()=>P('Diff scan at 2027-01-12T09:20Z: infra/ and cdk.json.')}],
 pre:[['DEV','Scanning <code>infra/</code>: three stacks, one region, one hand-drawn diagram from 2025.']],
 post:[['DEV','Architecture and stack inventory written to the space-level codekb.']],
 finds:()=>dv('2.1.state')===1?[{by:'DEV',t:'The scan describes the code. Nobody has compared it with the running account.',src:'architecture.md:L5',fix:'2.1.state',ch:'Run a drift check against the live stacks'}]:[]},

'2.2':{
 dec:['2.2.cdk'],
 files:[{p:REC+'inception/practices-discovery/discovered-rules.md',b:()=>T(['Rule','Evidence','Status'],[['ALWAYS change infrastructure through CDK','41 of 42 changes in 90 d',pk('2.2.cdk',['<span class="ok">confirmed; exception repaired</span>','<span class="wa">confirmed; exception left in place</span>','<span class="no">rejected</span>'])],['PRs need 1 approval + green CI','branch protection','affirmed'],['Stateful resources keep <code>RemovalPolicy.RETAIN</code>','all 4 tables','affirmed']])},
        {p:REC+'inception/practices-discovery/team-practices.md',b:()=>L(['Trunk-based, short-lived branches','CDK pipeline: dev → staging → prod','One console change in 90 days: network-counter capacity mode, 30 September, 02:14'])},
        {p:REC+'inception/practices-discovery/evidence.md',opt:1,b:()=>P('CloudTrail: UpdateTable on network-counter by a console session during the quarter-end incident. No matching commit.')}],
 pre:[['PIP','Drafting the team\'s infrastructure practices from the repository and 90 days of CloudTrail.'],['PIP','Almost everything goes through CDK. I found one change that did not.']],
 post:[['PIP','<code>PRACTICES_DISCOVERED</code>. The drafts are promoted to team memory only when this stage is approved.']],
 onApprove:()=>{S.mem.practices=true;writeMemory('2.2');audit('PRACTICES_AFFIRMED','5 sections → memory/team.md · 1 rule → memory/project.md')},
 finds:()=>dv('2.2.cdk')===1?[{by:'PIP',t:'The account and the code disagree about the counter table. The next deploy of the data stack will set it back to provisioned capacity.',src:'discovered-rules.md:L1',fix:'2.2.cdk',ch:'Bring the table back under CDK first'}]:dv('2.2.cdk')===2?[{by:'PIP',t:'Without the rule, a plan generated from the code cannot be trusted to describe what is running.',src:'discovered-rules.md:L1',fix:'2.2.cdk',ch:'Affirm CDK-only and repair the exception'}]:[]},

'2.3':{
 dec:['2.3.target','2.3.where'],
 files:[{p:REC+'inception/requirements-analysis/requirements.md',b:()=>H('Functional')+L(['FR-1: /assess keeps answering when one AWS region is lost','FR-2: ID-VEL-02 gives the same answer whichever region takes the request'])+H('Non-functional')+L(['NFR-1 (RTO): '+pk('2.3.target',['back within 15 minutes '+SRC('contract draft, clause 9.3'),'<span class="wa">zero downtime</span>','<span class="no">"high availability"</span>']),'NFR-2 (RPO): '+pk('2.3.target',['at most 1 minute of sightings lost '+SRC('clause 9.3'),'<span class="wa">zero data loss</span>','<span class="no">not stated</span>']),'NFR-3 (residency): second region is '+pk('2.3.where',['eu-central-1, inside the EU '+SRC('DSA §4.5, DPIA'),'<span class="wa">eu-west-2: needs a DPIA amendment</span>','<span class="no">us-east-1: outside the EU</span>'])])},
        {p:REC+'inception/requirements-analysis/traceability.json',opt:1,b:()=>PRE('{ "FR-1": ["clause 9.3"], "NFR-1": ["clause 9.3"], "NFR-2": ["clause 9.3"], "NFR-3": ["DSA §4.5"] }')}],
 pre:[['PRD','Requirements for an infrastructure change are mostly numbers. I need two decisions from humans: what we promise, and where.']],
 post:[['PRD','Writing <code>requirements.md</code> and <code>traceability.json</code>.'],['PLR','Reviewing the requirements against the contract draft…']],
 finds:()=>{const f=[];
  if(dv('2.3.target')===1)f.push({by:'PLR',t:'Zero downtime and zero loss is not what clause 9.3 asks for, and nothing in scope can deliver it.',src:'requirements.md:NFR-1',fix:'2.3.target',ch:'Commit to 15 minutes and 1 minute'});
  if(dv('2.3.target')===2)f.push({by:'PLR',t:'"High availability" cannot be tested, and the contract clause has numbers in it.',src:'requirements.md:NFR-1',fix:'2.3.target',ch:'Commit to 15 minutes and 1 minute'});
  if(dv('2.3.where')===2)f.push({by:'PLR',t:'us-east-1 puts data derived from EU applicants outside the EU, against DSA §4.5.',src:'requirements.md:NFR-3',fix:'2.3.where',ch:'Use eu-central-1'});
  if(dv('2.3.where')===1)f.push({by:'PLR',t:'eu-west-2 is outside the EU. The DPIA would need amending before go-live, and the contract renews in eight weeks.',src:'requirements.md:NFR-3',fix:'2.3.where',ch:'Use eu-central-1'});
  return f}},

'3.2':{
 dec:['3.2.mode','3.2.fo'],
 files:[{p:REC+'construction/nfr-requirements/performance-requirements.md',b:()=>L(['Topology: '+pk('3.2.mode',['active-active; both regions serve all the time','<span class="wa">active-passive; the standby is switched on in an outage</span>','<span class="no">backup and restore</span>']),'Failover decision: '+pk('3.2.fo',['Route 53 health checks, automatic, manual override','<span class="wa">on-call engineer, by runbook</span>']),'RTO 15 min · RPO 1 min '+SRC('NFR-1, NFR-2')])},
        {p:REC+'construction/nfr-requirements/security-requirements.md',b:()=>L(['Data stays in: eu-west-1 and '+regionTxt(),'The fingerprint key never leaves KMS','PII never logged, in either region'])},
        {p:REC+'construction/nfr-requirements/observability-requirements.md',opt:1,b:()=>L(['Every metric is tagged by region','Replication lag is a first-class metric'])}],
 pre:[['ARC','NFR requirements for the second region: how the regions share work, and who decides to fail over.']],
 post:[['ARC','Writing the performance, security and observability requirements.'],['ARV','Reviewing the NFR requirements…']],
 finds:()=>{const f=[];
  if(dv('3.2.mode')===2)f.push({by:'ARV',t:'Backup and restore cannot meet a 15-minute RTO: restoring the counter table alone takes over an hour.',src:'performance-requirements.md:L1',fix:'3.2.mode',ch:'Run both regions active-active'});
  if(dv('3.2.fo')===1)f.push({by:'ARV',t:'A manual failover spends most of the RTO on a person waking up and deciding.',src:'performance-requirements.md:L2',fix:'3.2.fo',ch:'Fail over on health checks, automatically'});
  return f}},

'3.3':{
 dec:['3.3.counter'],
 files:[{p:REC+'construction/nfr-design/performance-design.md',b:()=>L(['Counter storage: '+counterTxt(),'Failover: '+pkd('3.2.fo',['Route 53 failover records on per-region health checks','<span class="wa">manual DNS change, by runbook</span>'],NOT()),'Replication lag: '+(S.flags.lag?'<b>bounded: writers back off above 30 s of lag, and lag is alarmed against the 1-minute RPO</b>':'<span class="wa">not addressed</span>')])},
        {p:REC+'construction/nfr-design/security-design.md',opt:1,b:()=>L(['Both regions use the same key policy','No cross-region calls on the assessment path'])}],
 pre:[['ARC','Designing how two regions write the same counters without undoing each other\'s work.']],
 post:[['ARC','Writing the NFR design.'],['ARV','Reviewing the NFR design…']],
 sfail:()=>S.flags.lag?null:{s:'traceability',t:'NFR-2 (at most 1 minute of data lost) maps to no design element. Nothing here says how replication lag is bounded or watched.',src:'traceability.json: NFR-2',key:'lag',ch:'Bound replication lag and alarm on it',fixmsg:'Design added: writers back off above 30 s of lag, and lag is alarmed against the 1-minute RPO. Sensor re-run: pass.'},
 finds:()=>dv('3.3.counter')===2&&!S.flags.counterFix?[{by:'ARV',t:'With one replicated item, two regions that record a sighting in the same second leave only one of them.',src:'performance-design.md:L1',fix:'3.3.counter',ch:'Store one counter item per region'}]:dv('3.3.counter')===1?[{by:'ARV',t:'If all writes go to eu-west-1, Frankfurt cannot record anything during the outage it exists for.',src:'performance-design.md:L1',fix:'3.3.counter',ch:'Store one counter item per region'}]:[]},

'3.4':{
 dec:['3.4.key','3.4.cap'],
 files:[{p:REC+'construction/infrastructure-design/infrastructure-specification.md',b:()=>T(['Resource','Spec'],[['Regions','eu-west-1 + '+regionTxt()],['KMS fingerprint key',keyTxt()],['DynamoDB network-counter','global table, '+pk('3.4.cap',['on-demand in both regions','<span class="wa">provisioned for half the load in each region</span>'])],['Lambda assess',pk('3.4.cap',['concurrency limit set for 100% of traffic in each region','<span class="wa">concurrency limit set for 50% in each region</span>'])],['Route 53',pkd('3.2.fo',['failover records + health checks','single weighted record, changed by hand'],'not decided')]])},
        {p:REC+'construction/infrastructure-design/monitoring-design.md',opt:1,b:()=>L(['One dashboard per region, one combined','Replication lag per table'])},
        {p:REC+'construction/infrastructure-design/cicd-pipeline.md',opt:1,b:()=>L(['CDK pipeline deploys region by region, never both at once'])}],
 pre:[['AWS','Specifying the second region: key, tables, compute and routing.']],
 post:[['AWS','Writing the infrastructure specification.'],['ARV','Reviewing the infrastructure design…']],
 finds:()=>{const f=[];
  if(dv('3.4.key')===2&&!S.flags.keyFix)f.push({by:'ARV',t:'Two keys give one person two fingerprints. Counters in the two regions can never match.',src:'infrastructure-specification.md:L2',fix:'3.4.key',ch:'Use a multi-Region replica of the key'});
  if(dv('3.4.key')===1)f.push({by:'ARV',t:'Calling KMS in eu-west-1 from Frankfurt makes the second region depend on the first.',src:'infrastructure-specification.md:L2',fix:'3.4.key',ch:'Use a multi-Region replica of the key'});
  if(dv('3.4.cap')===1)f.push({by:'ARV',t:'After a failover one region takes all the traffic. Sized for half, it throttles.',src:'infrastructure-specification.md:L3',fix:'3.4.cap',ch:'Size each region for 100%'});
  return f}},

'3.5':{
 files:[{p:REC+'construction/code-generation/code-generation-plan.md',b:()=>P('This scope has no Units Generation, so there are no Units: one plan for the one change.')+L(['<code>infra/region-stack.ts</code>: the api and data stacks, instantiated once per region','<code>infra/kms.ts</code>: '+keyTxt(),'<code>infra/data-stack.ts</code>: network-counter becomes a global table: '+pk('3.5.replace',['replica added in place, in two deploys; RETAIN kept','new global table beside the old one; dual writes during cutover','<span class="no">replaced with a new, empty table</span>'],0),'<code>src/network/counter.ts</code>: '+counterTxt(),driftOk()?'Capacity mode: on-demand, now in code':'<span class="wa">Capacity mode: the code still says provisioned. Nobody has compared it with the account.</span>'])},
        {p:REC+'construction/code-generation/code-summary.md',b:()=>T(['Change','Files','Tests'],[['region stacks and routing',7,18],['key replication',3,6],['global table',4,11],['counter read/write',4,11]])+P('Counter table: '+pk('3.5.replace',['existing data kept','existing data kept; two tables until cutover','<span class="no">existing data destroyed</span>'],0)+'.')},
        {p:REC+'construction/code-generation/unit-test-instructions.md',opt:1,b:()=>PRE('npm test -- --coverage\nnpx cdk diff --all   # read it: look for "replace"')}],
 pre:[['DEV','Drafting the code plan for the CDK change. No code is written until the plan is approved.']],
 post:[['DEV','Stacks generated. Writing <code>code-summary.md</code>.'],['ARV','Reviewing the diff against the infrastructure design…']],
 sfail:()=>({s:'required-sections',t:'code-summary.md is missing a required H2 heading.',src:'code-summary.md',auto:'DEV',fixmsg:'Heading restored. Sensor re-run: pass.'}),
 finds:()=>dv('3.5.replace')===2?[{by:'ARV',t:'The diff replaces network-counter. Fourteen days of sightings for every lender would be deleted.',src:'infra/data-stack.ts:58',fix:'3.5.replace',ch:'Add the replica in place and keep RETAIN'}]:[]},

'3.6':{
 dec:['3.6.gameday'],
 files:[{p:REC+'construction/build-and-test/test-results.md',b:()=>T(['Suite','Result'],[['unit + template assertions','<span class="ok">212 passed</span>'],['cdk synth, both regions','<span class="ok">clean</span>'],['game day: eu-west-1 cut off',pk('3.6.gameday',[autoFo()?'<span class="ok">traffic in Frankfurt after 70 s</span>':'<span class="wa">traffic in Frankfurt after 23 min (manual)</span>','<span class="wa">not run</span>'])],['game day: seeded ring split across regions',pk('3.6.gameday',[keyOk()&&counterOk()?'<span class="ok">ID-VEL-02 fires in both regions</span>':'<span class="no">no flag in Frankfurt</span>','<span class="wa">not run</span>'])]])},
        {p:REC+'construction/build-and-test/build-instructions.md',opt:1,b:()=>PRE('npm ci && npm test && npx cdk synth --all'+(dv('3.6.gameday')===0?'\nmake gameday REGION=eu-west-1   # staging only':''))}],
 pre:[['QA','Synthesising both regions and running the template tests.'],['QA','One question first: what would convince us that this works?']],
 post:[['QA','Writing <code>test-results.md</code>.']],
 finds:()=>dv('3.6.gameday')===1?[{by:'QA',t:'Nothing has ever sent traffic to the second region or taken the first one away.',src:'test-results.md:L3',fix:'3.6.gameday',ch:'Run a game day in staging'}]:[]},

'3.7':{
 dec:['3.7.gates'],
 files:[{p:REC+'construction/ci-pipeline/quality-gates.md',b:()=>T(['Gate','Mode'],[['cdk diff posted on the PR','always'],['Replacement of a stateful resource',pk('3.7.gates',['blocking','advisory'])],['Policy checks (cdk-nag)',pk('3.7.gates',['blocking','advisory'])],['Template tests','blocking']])},
        {p:REC+'construction/ci-pipeline/ci-config.md',opt:1,b:()=>PRE('on: pull_request\njobs: build · test · synth · diff · policy')},
        {p:REC+'verification/phase-check-construction.md',opt:1,b:()=>P('Phase check: the change is built and tested, and every requirement has a passing test.')}],
 pre:[['PIP','Configuring CI for infrastructure changes.']],
 post:[['PIP','Writing CI config and quality gates, plus the Construction phase check.']],
 finds:()=>dv('3.7.gates')===1?[{by:'PIP',t:'With advisory gates, a diff that replaces a table can be merged by anyone in a hurry.',src:'quality-gates.md:L2',fix:'3.7.gates',ch:'Block replacements and policy failures'}]:[]},

'4.1':{
 dec:['4.1.strategy'],
 files:[{p:REC+'operation/deployment-pipeline/deployment-strategy.md',b:()=>P(pk('4.1.strategy',['<b>Weighted routing</b> 5% → 25% → 100% onto the two-region setup, 10 min bake each, automatic rollback on errors','<b>Blue/green</b>: one DNS switch, with flip-back','<b>All at once</b>']))},
        {p:REC+'operation/deployment-pipeline/rollback-runbook.md',b:()=>L(['Trigger: error rate in either region, or counters that disagree between regions','Action: '+pk('4.1.strategy',['weights back to eu-west-1 only (~2 min)','flip DNS back (~1 min, plus TTL)','<span class="wa">redeploy the single-region records (~8 min, plus TTL)</span>']),'The replica can stay: removing traffic does not remove data'])},
        {p:REC+'operation/deployment-pipeline/cd-config.md',opt:1,b:()=>PRE('pipeline: aegle-infra-cd\nstages: staging → prod (eu-west-1) → prod ('+regionTxt()+')')}],
 pre:[['PIP','Planning how live traffic moves onto two regions, and how it moves back.']],
 post:[['PIP','Writing the deployment strategy and rollback runbook.']],
 finds:()=>dv('4.1.strategy')===2?[{by:'PIP',t:'All-at-once puts every lender on untried routing, and DNS caching slows any way back.',src:'deployment-strategy.md:L1',fix:'4.1.strategy',ch:'Shift traffic by weight, with auto-rollback'}]:[]},

'4.2':{
 dec:['4.2.order'],
 files:[{p:REC+'operation/environment-provisioning/validation-report.md',b:()=>T(['Check','Result'],[['Region stacks deployed','<span class="ok">pass</span>'],['Same fingerprint in both regions for 1,000 test identities',keyOk()?'<span class="ok">1,000 of 1,000</span>':'<span class="no">0 of 1,000</span>'],['Counter table in sync before traffic',pk('4.2.order',['<span class="ok">in sync; 5,000 sampled counters match</span>','<span class="no">not checked</span>'])],['Capacity mode matches the code',driftOk()?'<span class="ok">pass</span>':'<span class="wa">not checked</span>']])},
        {p:REC+'operation/environment-provisioning/environment-inventory.md',opt:1,b:()=>L(['staging (eu-west-1, '+regionTxt()+')','prod (eu-west-1, '+regionTxt()+')'])}],
 pre:[['AWS','Provisioning the second region with CDK and validating it against the specification.']],
 post:[['AWS','Writing the inventory and validation report.']],
 finds:()=>dv('4.2.order')===1?[{by:'AWS',t:'Until replication catches up, the second region answers from counters that are missing days of sightings.',src:'validation-report.md:L3',fix:'4.2.order',ch:'Wait for the table to be in sync'}]:[]},

'4.3':{
 dec:['4.3.window'],
 files:[{p:REC+'operation/deployment-execution/deployment-log.md',b:()=>PRE(pk('4.1.strategy',['09:58 weight 5%  ✓ healthy in both regions\n10:08 weight 25% ✓ healthy\n10:18 100%       ✓','10:00 two-region records live ✓\n10:05 flip ✓','10:00 two-region records live ✓']))},
        {p:REC+'operation/deployment-execution/smoke-test-results.md',b:()=>L(['/assess answers from both regions ✓',keyOk()&&counterOk()?'seeded ring split across regions → ID-VEL-02 in both ✓':'<span class="no">seeded ring split across regions → no flag ✗</span>',capOk()?'each region holds a 100% load test for 10 min ✓':'<span class="wa">single-region load test: not run</span>'])}],
 pre:[['PIP','Ready to put live traffic on two regions. The window is a human call.']],
 post:[['PIP','Writing the deployment log and smoke test results.']],
 finds:()=>dv('4.3.window')===1?[{by:'PIP',t:'A Friday 17:00 go-live gives a new region its first weekend of live traffic with nobody watching.',src:'deployment-log.md:L1',fix:'4.3.window',ch:'Move to Tuesday 10:00'}]:[]},

'4.4':{
 dec:['4.4.alarm'],
 files:[{p:REC+'operation/observability-setup/alarms.md',b:()=>L(pk('4.4.alarm',[['fast and slow SLO burn, <b>per region</b> → page','<b>replication lag above 30 s → page</b> (RPO is 1 minute)','health-check state change → page'],['global SLO burn → page (unchanged)']]))},
        {p:REC+'operation/observability-setup/slo-config.md',b:()=>PRE(dv('4.4.alarm')===0?'slo: assess-availability  target: 99.9%  window: 30d  group_by: region\nslo: replication-lag      p99 < 30s':'slo: assess-availability  target: 99.9%  window: 30d   # global, unchanged')},
        {p:REC+'operation/observability-setup/dashboards.md',opt:1,b:()=>L(['One dashboard per region, one combined','Counter agreement between regions (sampled)'])}],
 pre:[['OPS','Rewiring the dashboards and alarms for two regions.']],
 post:[['OPS','Writing SLO config, alarms and dashboards.']],
 finds:()=>dv('4.4.alarm')===1?[{by:'OPS',t:'A global alarm averages a failing region with a healthy one, and nothing watches the 1-minute data-loss limit.',src:'alarms.md:L1',fix:'4.4.alarm',ch:'Alarm per region and on replication lag'}]:[]},
};

/* ---------- the incident: the day the second region was built for ---------- */
function incident(D){
  const fo=autoFo(),key=keyOk(),ctr=counterOk(),cap=capOk(),lag=!!S.flags.lag,drift=driftOk();
  const no=id=>D[id]===undefined;
  const data=!key?{id:'key',n:'Fingerprints do not match',sev:95,chart:'err',sym:'Frankfurt is returning no ID-VEL-02 flags at all, for identities that were flagged an hour ago.',rc:no('3.4.key')?`Infrastructure Design is not in the ${scope().n} scope, so each regional stack made its own key. One person now has two fingerprints.`:'3.4 gave the second region its own key. One person now has two fingerprints.'}
    :!ctr?{id:'lww',n:'Sightings overwritten',sev:80,chart:'err',sym:'Counts in Frankfurt are lower than they were in eu-west-1 for the same identities.',rc:no('3.3.counter')?`NFR Design is not in the ${scope().n} scope, so the counter was replicated as it stood: one item, and the later write wins.`:D['3.3.counter']===1?'3.3 sent every write to eu-west-1, which is the region that is down. Frankfurt is recording nothing.':'3.3 kept one replicated item per identity, so writes from two regions overwrote each other.'}
    :{id:'data',n:'Counters in Frankfurt',sev:40,chart:'err',sym:'Fraud ops is checking whether Frankfurt knows what eu-west-1 knew.',rc:'It does.',auto:true,autoLog:'The same key in both regions, and one counter item per region: Frankfurt has every sighting eu-west-1 had.'};
  const third=!cap?{id:'cap',n:'Frankfurt is throttling',sev:85,chart:'p99',sym:'p99 in Frankfurt is at <b>1.9 s</b>. DynamoDB and Lambda are both throttling.',rc:!drift?'The deploy set the counter table back to provisioned capacity, because nobody had put the hand-made change into code. Frankfurt inherited it.':no('3.4.cap')?`Infrastructure Design is not in the ${scope().n} scope, so nobody sized a region to carry everything.`:'3.4 sized each region for half the traffic.'}
    :!lag?{id:'lag',n:'Replication lag',sev:65,chart:'err',sym:'Frankfurt\'s counters are 9 minutes behind. Nobody knew until a lender asked.',rc:no('3.3.counter')?`NFR Design is not in the ${scope().n} scope, so nothing bounds or watches replication lag.`:scope().sensors?'The traceability sensor at 3.3 flagged that the 1-minute limit had no design, and it was accepted as risk.':'Nothing bounds or watches replication lag.'}
    :{id:'load',n:'One region, all the traffic',sev:40,chart:'rps',sym:'Frankfurt is carrying 100% of assessments.',rc:'It was sized to. It only needs watching.'};
  const waves=[
    {id:'fo',n:'Traffic is still going to eu-west-1',sev:85,chart:'err',sym:'Half of all assessments are failing. Requests are still being routed to the degraded region.',
     rc:no('3.2.fo')?`NFR Requirements is not in the ${scope().n} scope, so nobody decided who fails over. It is a person, and they are still reading.`:'3.2 left the failover decision to a person with a runbook.',
     auto:fo,autoLog:'Route 53 health checks took eu-west-1 out after 70 seconds. Lenders are being served from Frankfurt.'},
    data,third,
  ];
  const abil=[
   {id:'investigate',n:'Investigate',ag:'OPS',role:'ops',cast:()=>D['4.4.alarm']===0?1:2,cd:0,util:1,d:'Read the per-region dashboards and traces to find the cause.',src:()=>D['4.4.alarm']===0?'4.4: per-region dashboards and lag alarms (fast)':'always available'},
   {id:'failover',n:'Fail over by hand',ag:'PIP',role:'ops',cast:5,cd:10,d:'Change the routing so lenders are served from Frankfurt.',dmg:{fo:100},src:()=>'always available (slow)'},
   {id:'rekey',n:'Replicate the key',ag:'AWS',role:'sec',cast:6,cd:15,d:'Create a multi-Region replica of the fingerprint key in Frankfurt.',dmg:{key:100},src:()=>'always available (slow)'},
   {id:'merge',n:'Hotfix: per-region counters',ag:'DEV',role:'eng',cast:6,cd:15,d:'Write one counter item per region and merge them on read.',dmg:{lww:100},src:()=>'always available (slow)'},
   {id:'scale',n:'Raise capacity',ag:'AWS',role:'ops',cast:()=>D['3.4.cap']===0?2:4,cd:10,d:'Switch tables to on-demand and raise the concurrency limits.',dmg:{cap:100,load:80,lag:20},src:()=>D['3.4.cap']===0?'3.4: limits are already set for full load (fast)':'always available'},
   {id:'shed',n:'Pause batch writers',ag:'OPS',role:'ops',cast:2,cd:8,d:'Stop the nightly jobs so replication can catch up.',dmg:{lag:100,cap:30,load:30},src:()=>'always available'},
   {id:'rollback',n:'Give up on Frankfurt',ag:'PIP',role:'ops',cast:()=>[3,2,8][D['4.1.strategy']??2],cd:0,once:1,util:1,d:'A blunt fix: route everything back to eu-west-1 and wait for AWS.',src:()=>'4.1: '+(['weights (~3 s)','DNS flip (~2 s)','redeploy (~8 s)'][D['4.1.strategy']??2])},
   {id:'notify',n:'Notify lenders',ag:'PRD',role:'po',cast:2,cd:0,once:1,util:1,d:'Post to the status page so lenders retry and route to manual review.',src:()=>'always available'},
   {id:'escalate',n:'Page incident commander',ag:'DLV',role:'pm',cast:2,cd:0,once:1,util:1,d:'An IC coordinates the response, so all casts are 40% faster.',src:()=>'always available'},
  ];
  return {
    h:'eu-west-1 brown-out',k:'AWS Health · eu-west-1',
    p:'Thursday 14:20. eu-west-1 is degraded: error rates are up across DynamoDB and Lambda. This is the day the second region was built for.',
    unshipped:'Thursday 14:20. eu-west-1 is degraded: error rates are up across DynamoDB and Lambda.',
    comms:'Lenders who know can retry, and route what fails to manual review.',
    abil,waves,
    logs:{notify:'Status page posted: regional incident, assessments served from Frankfurt, retry on failure.',rollback:'Routing is back on eu-west-1 alone. The incident now ends when AWS says it does.'},
    result:{won:'All three waves handled. A region went down and lenders kept getting answers.',rollback:'The incident ends when AWS fixes eu-west-1. Lenders waited with you, which is what the second region was meant to prevent.',breach:'The error budget ran out. The second region existed, and the outage happened anyway.'},
    score:{notified:['Lenders notified','Lenders never notified'],rolled:'Second region abandoned'},
    why(){const it=[];
      it.push([fo?'Failover took 70 seconds':'Failover waited for a person',fo?'good':'bad',fo?'3.2 put the decision in Route 53 health checks.':no('3.2.fo')?`The ${scope().n} scope has no NFR Requirements stage, so the question was never asked.`:'3.2 chose a manual failover.']);
      it.push([key&&ctr?'Frankfurt knew everything eu-west-1 knew':!key?'Each region had its own fingerprints':'Regions overwrote each other\'s sightings',key&&ctr?'good':'bad',key&&ctr?(S.flags.keyFix||S.flags.counterFix?'The game day in 3.6 found the mismatch in staging and sent it back before go-live.':'3.4 replicated the key and 3.3 gave each region its own counter items.'):(D['3.6.gameday']===1?'Nothing was ever tested with a region taken away (3.6).':'The design stages that settle this were not in the plan, and no game day ran.')]);
      it.push([cap?(lag?'One region carried everything, in sync':'Replication fell 9 minutes behind'):'The surviving region throttled',cap&&lag?'good':'bad',!cap?(!drift?'A console change from an old incident was never put into code, and the deploy undid it.':'Nobody sized a single region for the whole load.'):lag?'The traceability sensor at 3.3 caught that the 1-minute limit had no design, and someone asked for one.':'Nothing bounded or watched replication lag.']);
      return it},
  };
}

function debrief(C2,D){
  if(D['2.2.cdk']!==undefined)C2('2.2',D['2.2.cdk']===0,D['2.2.cdk']===0?'Affirming CDK-only, and repairing the one exception, meant the plan described what was really running.':'A hand-made change stayed outside the code, and the next deploy undid it.');
  if(D['2.1.state']!==undefined)C2('2.1',D['2.1.state']===0,D['2.1.state']===0?'A drift check found the one place where the account and the code disagreed.':'The scan described the code and never looked at the account.');
  C2('2.3',D['2.3.target']===0,D['2.3.target']===0?'15 minutes and 1 minute, from the contract clause, gave every later stage a number to meet.':'The resilience target was not one anybody could test against the contract.');
  C2('2.3',D['2.3.where']===0,D['2.3.where']===0?'Frankfurt kept applicants\' data inside the EU, with no change to the agreement.':'The choice of region put the data-sharing agreement or the DPIA in question.');
  C2('3.2',autoFo(),D['3.2.fo']===undefined?`The ${scope().n} scope has no NFR Requirements stage: nobody decided how failover happens.`:autoFo()?'Automatic failover on health checks moved traffic in about a minute.':'A manual failover used up the recovery time on a person deciding.');
  C2('3.3',counterOk(),D['3.3.counter']===undefined?(S.flags.counterFix?`The ${scope().n} scope has no NFR Design stage. The counter clash was caught late, by the game day.`:`The ${scope().n} scope has no NFR Design stage, so two regions wrote over each other's counters.`):D['3.3.counter']===0?'One counter item per region meant no write could overwrite another.':'The counter design let regions lose each other\'s sightings.');
  if(D['3.3.counter']!==undefined)C2('SENS',!!S.flags.lag,S.flags.lag?'The traceability sensor caught a requirement with no design behind it: the 1-minute data-loss limit.':'The 1-minute data-loss limit never got a design element.');
  C2('3.4',keyOk(),D['3.4.key']===undefined?(S.flags.keyFix?`The ${scope().n} scope has no Infrastructure Design stage. The key mismatch was caught late, by the game day.`:`The ${scope().n} scope has no Infrastructure Design stage, so each region made its own key.`):D['3.4.key']===0?'A multi-Region key gave one identity one fingerprint everywhere.':'The key design split or chained the two regions.');
  if(D['3.5.replace']!==undefined)C2('3.5',D['3.5.replace']!==2,D['3.5.replace']===2?'The table was replaced, and 14 days of counters went with it.':'The agent stopped at "replace" in the diff, and the data stayed where it was.');
  if(D['3.6.gameday']!==undefined)C2('3.6',D['3.6.gameday']===0,D['3.6.gameday']===0?'A game day tested the only thing that mattered: taking a region away.':'The second region was deployed and never once failed over to.');
  if(D['4.2.order']!==undefined)C2('4.2',D['4.2.order']===0,D['4.2.order']===0?'Frankfurt took no traffic until its counters matched.':'Frankfurt answered its first requests from half-empty counters.');
}

return {
 id:'infra',n:'The Second Region',kind:'infrastructure',col:'#FFB547',
 tag:'Make /assess survive the loss of an AWS region before the contract says it must.',
 d:'Lender contracts renew in eight weeks with a new clause: /assess must survive a regional outage, back within 15 minutes and missing at most a minute of data. Today everything runs in eu-west-1. Maya has to add a second region underneath a live fraud signal.',
 ask:ASK,intent:'second-region',REC,KB,
 boot:{repo:'aegle-api',ws:'brownfield · AWS CDK v2 · 3 stacks · 1 region (eu-west-1)',note:'Lender contracts renew in 8 weeks with a regional-resilience clause (9.3).'},
 scopes:['infra','express'],best:'infra',
 fit:{
  infra:{v:'best',t:'Made for this: practices, requirements, both NFR stages and Infrastructure Design, then build, CI, provisioning, deployment and observability.'},
  express:{v:'poor',t:'Requirements straight to code and deploy. No stage decides how two regions share a key, a counter or the load.'},
 },
 composer:{E:[.31,.36,.71,.79,.58],why:'Risk is HIGH (0.79 ≥ 0.70) and verification is hard (0.71): the failure this protects against cannot be shown by unit tests. Infra runs both NFR stages and Infrastructure Design, then CI, provisioning and observability. Express would go from requirements to code with none of them.'},
 DEC,stages,units,
 midBuild:{unit:'aegle',dec:'3.5.replace'},
 loopBack(){
  if(dv('3.6.gameday')!==0)return null;
  const k=!keyOk(),c=!counterOk();if(!k&&!c)return null;
  if(k)S.flags.keyFix=true;if(c)S.flags.counterFix=true;
  return {why:'Game day failure: a seeded ring split across the two regions never fires in Frankfurt. '+[k?'Each region computes a different fingerprint for the same person':null,c?'sightings written in one region are overwritten by the other':null].filter(Boolean).join(', and ')+'.',
          fixed:'Second run: green. '+[k?'Both regions use a replica of one key':null,c?'each region writes its own counter item':null].filter(Boolean).join(', and ')+'.'}},
 deploy:{what:'the two-region setup',all:'No blast-radius control: every lender moved onto untried routing at once.'},
 addStage:{at:'2.3',add:'3.2',ask:'NFR Requirements is not in this scope, but this whole change exists to meet a recovery target. Add it?',sub:'Nobody has decided how the regions share the work, or who fails over.'},
 phaseChecks:from=>from===3?[['Replacements and policy failures block a merge in CI',S.dec['3.7.gates']!==1],['Every NFR maps to a design element',!!S.flags.lag]]:[],
 traceGap:()=>S.ran.has('3.3')&&!S.flags.lag,
 humanSensor:'3.3',
 badge:{ic:'🌍',n:'Two Regions, One Truth',d:'One key in both regions, counters that cannot overwrite each other, and a game day to prove it.',test:()=>S.dec['3.4.key']===0&&S.dec['3.3.counter']===0&&S.dec['3.6.gameday']===0},
 incident,debrief,
};
})();
