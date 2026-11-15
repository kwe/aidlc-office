/* Scenario: Aegle Starter, a self-serve tier for small lenders. A brand-new product that is a bet, not yet a certainty.
   Written for the stages that mvp, poc and classic run. None of them deploys, so the ending is the day it meets real users anyway.
   Everything here is story. */
SCENARIOS.product=(()=>{
const REC='aidlc/spaces/identity/intents/270203-aegle-starter/';
const KB='aidlc/spaces/identity/codekb/aegle-api/';
const U2='construction/u2-sandbox/';
const ASK='Let a small lender sign up, get sandbox keys and make a first test assessment in under an hour';
const NOT=()=>`not decided: that stage is not in the ${scope().n} scope`;
const dataOk=()=>dv('1.3.data')===0;                    // the sandbox holds no real person
const tenantOk=()=>dv('2.6.tenant')===0;                // nothing in the sandbox can reach the production network
const isoOk=()=>dv('3.3.iso')===0;                      // sandbox load cannot take capacity from production
const noSkel=()=>!scope().skeleton||dv('2.7.skel')===1;

const DEC={
 '1.1.success':{own:'po',by:'PRD',q:'How will we know Starter worked?',ctx:'This is a bet that small lenders will integrate by themselves if they can try the product first. The success measure is how the bet gets settled.',o:[
  {t:'Three of the five pilot credit unions make a live assessment within a week of signing up, with no help from us',s:10,q:5,r:-5,fb:'An outcome that tests the bet itself: do they get there alone?'},
  {t:'Starter is launched at the lending conference in five weeks',s:3,fb:'That is an output. A launch says nothing about whether anyone could use it.'},
  {t:'A thousand sign-ups',s:0,q:-5,fb:'Sign-ups cost nothing to make. A thousand accounts that never send an assessment prove nothing.'}]},
 '1.3.data':{own:'sec',by:'ARC',q:'A sandbox needs something to assess. What data does it run on?',ctx:'Anyone on the internet will be able to sign up and send it queries.',o:[
  {t:'Synthetic identities only, generated to behave like real ones, with a few rings planted in them',s:10,q:5,r:-10,fb:'Nothing in the sandbox is about a real person, so nothing in it can leak.'},
  {t:'A masked copy of last month\'s production assessments',s:2,r:15,fb:'Masked data can often be unmasked, and a stranger with an email address would be able to query it.'},
  {t:'Production, read-only',s:0,r:25,fb:'Anyone who signs up could ask whether a real person has been applying for credit.'}]},
 '1.4.scope':{own:'po',by:'PRD',q:'What is in the MVP?',ctx:'An MVP is the least you can build that settles the bet.',o:[
  {t:'Sign-up, sandbox keys and a quickstart. Billing, dashboards and single sign-on wait for evidence.',s:10,fb:'Everything in scope serves the one question: can they get to a first assessment alone?'},
  {t:'All of that, plus billing and plans, so we can charge from day one',s:0,q:-5,r:5,fb:'A whole extra Unit, to charge for something nobody has yet shown they want.'}]},
 '1.6.first':{own:'po',by:'DSN',q:'What is the first thing a developer sees after signing up?',ctx:'Design is sketching the first screen. The bet is won or lost in the first ten minutes.',o:[
  {t:'A working curl command with their own sandbox key already in it, and the response it will return',s:10,fb:'Time to first call: about a minute.'},
  {t:'The full API reference',s:4,fb:'Accurate and complete. They still have to work out where to start.'},
  {t:'A form: company details, expected volumes and use case',s:2,r:5,fb:'Most developers leave at a form that stands between them and trying the thing.'}]},
 '2.2.flag':{own:'eng',by:'PIP',q:'"New endpoints ship behind a feature flag" is already in team memory, from Network Velocity. Starter is a new service. Does the rule cover it?',ctx:'Practices you confirm are promoted to team memory when you approve this stage. Agents then apply them on every future intent.',o:[
  {t:'Yes: sign-up sits behind a flag, so it can be closed without a deploy',s:10,fb:'Recorded. If the sign-up page ever needs shutting in a hurry, it is one switch.'},
  {t:'Decide later',s:4,fb:'The rule is not extended, so nothing is planned.'},
  {t:'No. It is a new product, not a new endpoint.',s:2,fb:'Then closing sign-up in a hurry means building and shipping a release.'}]},
 '2.3.who':{own:'sec',by:'PRD',q:'Who is allowed to sign up for a sandbox?',ctx:'A sandbox for a fraud check is also a place to learn how the fraud check behaves.',o:[
  {t:'Anyone with a verified business email. Going live needs a licence check by a person.',s:10,r:-5,fb:'Easy to try, and nobody reaches real data without being a real lender.'},
  {t:'Only lenders we have already vetted by hand',s:3,fb:'Safe. It is also the six-week process again, with a nicer front page.'},
  {t:'Anyone with any email address',s:2,r:10,fb:'Fraudsters are the people who most want to learn how these checks respond.'}]},
 '2.3.limit':{own:'eng',by:'PRD',q:'What stops one sandbox user from affecting another?',ctx:'The pilot has five invited credit unions.',o:[
  {t:'A rate limit and a daily quota on every sandbox key',s:10,fb:'One developer\'s loop cannot become everyone\'s outage.'},
  {t:'Nothing for the pilot. There are only five users.',s:0,r:15,fb:'Five is the number you invited. The sign-up page is public.'}]},
 '2.4.stuck':{own:'po',by:'PRD',q:'Every story so far is about a developer who succeeds. Do we need one for a developer who gets stuck?',ctx:'The success measure says "with no help from us".',o:[
  {t:'Yes: "As a developer whose first call fails, I am told what was wrong with my request and how to fix it"',s:10,q:5,fb:'Now failure has an owner, a test and a design.'},
  {t:'No. The documentation covers errors.',s:0,fb:'Then a failed first call ends in a support email, or in silence.'}]},
 '2.5.golive':{own:'po',by:'DSN',q:'A sandbox user wants to go live. What does that button do?',ctx:'Refined Mockups. This is where self-serve meets the licence check.',o:[
  {t:'Starts the licence check, and shows what happens next and how long it takes',s:10,fb:'The one human step is visible, with a date on it.'},
  {t:'Opens an email to sales',s:3,r:5,fb:'The self-serve product ends in the same inbox the old process started from.'}]},
 '2.6.tenant':{own:'eng',by:'ARC',q:'The existing system has no idea of a tenant: every API key reads and writes the one shared network. Where do sandbox tenants live?',ctx:'Domain Design. This decides what a stranger\'s test request can touch.',o:[
  {t:'A separate sandbox stack with its own tables and its own fingerprint key. Nothing in it can reach the production network.',s:10,q:5,r:-10,fb:'The worst a sandbox user can do is confined to the sandbox.'},
  {t:'A separate table in production, using the production fingerprint key',s:5,r:5,fb:'Better. A sandbox user can still compute real fingerprints.'},
  {t:'The production tables, with a "sandbox" flag on each row',s:2,r:20,fb:'One missing filter in one query, and test sightings are in real lenders\' counters.'}]},
 '2.7.skel':{when:()=>scope().skeleton,own:'eng',by:'ARC',q:'This scope ships with the walking skeleton on, so the first Unit is the smallest slice that works end to end. Keep it?',ctx:'The stance comes from the Walking Skeleton practice (org → team → project), with the scope setting as fallback. A human can still switch it off for one piece of work.',o:[
  {t:'Keep it: u0 is the thinnest slice through sign up → sandbox key → first assessment',s:10,fb:'The whole bet, working badly end to end, before any part of it is finished.'},
  {t:'Switch it off. Build each Unit in full and join them at the end.',s:2,r:5,fb:'Integration problems surface at the end, when they cost the most.'}]},
 '2.8.env':{own:'eng',by:'ARC',q:'How does a developer\'s code tell sandbox from live?',ctx:'Contract Design covers the public API.',o:[
  {t:'The same /assess contract on a separate host, with keys that say what they are: sk_test_… and sk_live_…',s:10,fb:'Going live is a change of key and host, and nothing else.'},
  {t:'One host, with a "mode" field in the request',s:3,r:10,fb:'One forgotten field, and a test request is a live assessment.'},
  {t:'A separate, simpler sandbox API',s:2,r:5,fb:'Developers integrate once against the sandbox, and then again against the real thing.'}]},
 '2.9.verify':{own:'eng',by:'DLV',q:'Which Construction Verification Command should prove each Unit works?',ctx:'The engine runs the authorized command at every Unit checkpoint. A checkpoint can only be approved with that receipt; a hand-written note cannot verify a Unit.',o:[
  {t:'make e2e: sign up, fetch a key and call /assess on a local sandbox',s:10,fb:'Every checkpoint is backed by the whole journey running for real.'},
  {t:'npm run lint: it is fast',s:0,q:-5,r:5,fb:'A lint pass proves the code parses, not that the Units work together.'}]},
 '2.9.exec':{own:'pm',by:'DLV',q:'How should Construction run?',ctx:'Unit-major is the default: one Unit walks its design stages and Code Generation, then the next. Building side by side needs stage-major plus swarm.',o:[
  {t:'Unit-major, serial: one Unit at a time, each approved at its own checkpoint',s:10,fb:'Safe and steady.'},
  {t:'Stage-major with swarm: design every Unit first, then build the independent Units side by side in git worktrees',s:10,fb:'Faster. Every plan is approved before the batch starts, and the batch ends in one checkpoint.'}],auto:()=>S.dec['2.7.skel']===0?1:0},
 '3.2.abuse':{own:'sec',by:'ARC',q:'Threat model: a public sign-up page will be found by bots within days. Mitigate now?',ctx:'NFR Requirements for the sandbox Unit.',o:[
  {t:'Yes: no key until the email is verified, and limits on sign-ups per domain and per address',s:10,r:-10,fb:'Mass account creation gets slow and noisy.'},
  {t:'Not for a pilot of five',s:0,r:10,fb:'The pilot has five users. The internet has rather more.'}]},
 '3.3.iso':{own:'eng',by:'ARC',q:'What happens to everything else when one sandbox tenant sends a flood?',ctx:'NFR Design turns targets into patterns.',o:[
  {t:'Per-key throttling at the gateway, and the sandbox has its own concurrency pool, apart from production',s:10,fb:'A stranger\'s load test stays the stranger\'s problem.'},
  {t:'It shares the production pool, and we throttle if it comes to that',s:0,r:15,fb:'A stranger\'s load test can now take capacity from real lenders\' assessments.'}]},
 '3.4.cap':{own:'ops',by:'AWS',q:'How is the sandbox sized?',ctx:'AWS Platform is drafting the infrastructure specification.',o:[
  {t:'On demand, with a hard ceiling and a budget alarm',s:10,fb:'It grows if people come, and cannot run away with the bill.'},
  {t:'Fixed and small: enough for five pilot users',s:0,r:10,fb:'Sized for the guest list, on a public page.'}]},
 '3.5.err':{own:'eng',by:'DEV',q:'While building the sandbox: when a test request is malformed, how much do I tell the developer?',ctx:'A question raised mid-build. The agent stops to ask instead of guessing.',o:[
  {t:'Which field is wrong and what was expected, and never anything about how risk is scored',s:10,fb:'Enough to fix the request, and nothing that teaches anyone to beat the checks.'},
  {t:'"400 Bad Request", and nothing more',s:3,fb:'Safe. The developer has no idea what to fix.'},
  {t:'Pass through the validation error from the production code',s:2,r:10,fb:'Production errors name internal rules and thresholds. That is a manual for fraudsters.'}]},
 '3.6.outside':{own:'po',by:'QA',q:'Who tests the onboarding?',ctx:'Build and Test. The success measure is about people who have never seen the product.',o:[
  {t:'A developer from one of the pilot credit unions, cold, with a stopwatch running',s:10,q:5,fb:'Fourteen minutes, and two places where they got stuck. Both are fixed before anyone else arrives.'},
  {t:'We do. We know the product best.',s:2,fb:'You also know where everything is. The test passes in four minutes and finds nothing.'}]},
 '3.7.gates':{own:'sec',by:'PIP',q:'Which CI checks block a merge?',ctx:'Quality gates are recorded in quality-gates.md.',o:[
  {t:'Security scans, coverage below 80%, and a test proving that a sandbox key cannot reach production',s:10,fb:'The one property that must never break is checked on every change.'},
  {t:'Make them all advisory and just report',s:2,r:10,fb:'Advisory checks get ignored once a conference date is close.'}]},
};

function units(){
  if(zeroUnit())return[{id:'aegle-starter',kind:'service',st:'(no Units in this scope)',plan:'sign-up, sandbox keys and a quickstart, in one piece',files:24,tests:70}];
  const u=[];
  if(S.dec['2.7.skel']===0)u.push({id:'u0-walking-skeleton',kind:'service',st:'US-01 (thin)',plan:'smallest working slice: sign up → sandbox key → first /assess call',files:8,tests:11});
  u.push({id:'u1-signup',kind:'service',st:'US-01, US-05',plan:'sign-up, email verification and the tenant record',files:9,tests:44});
  u.push({id:'u2-sandbox',kind:'service',st:'US-02, US-03'+(S.dec['2.4.stuck']===0?', US-06':''),plan:'the sandbox: data, isolation, limits and errors',files:15,tests:96});
  u.push({id:'u3-quickstart',kind:'ui',st:'US-04',plan:'first screen, key console and quickstart',files:8,tests:38});
  if(S.dec['1.4.scope']===1)u.push({id:'u4-billing',kind:'service',st:'(scope creep)',plan:'plans, metering and invoices',files:36,tests:72});
  return u;
}
const dataTxt=()=>pkd('1.3.data',['synthetic identities, with planted rings','<span class="wa">masked copy of production</span>','<span class="no">production, read-only</span>'],'<span class="wa">a masked copy of production (nobody ruled on it: Feasibility is not in the '+scope().n+' scope)</span>');
const tenantTxt=()=>pkd('2.6.tenant',['separate sandbox stack, own tables, own fingerprint key','<span class="wa">separate table in production, production key</span>','<span class="no">production tables with a sandbox flag</span>'],'<span class="wa">production tables with a sandbox flag (nobody designed it: Domain Design is not in the '+scope().n+' scope)</span>');

const stages={
...initStages(REC,{ask:ASK,intent:'aegle-starter',ws:'brownfield · TypeScript 5 · Node 20 · AWS CDK · repo <code>aegle-api</code> (codekb found)'}),

/* ===== 1 IDEATION ===== */
'1.1':{
 dec:['1.1.success'],
 files:[{p:REC+'ideation/intent-capture/intent-statement.md',b:()=>H('Intent: Aegle Starter')+P('Small lenders cannot try Aegle before they sign an enterprise contract and wait for an integration project. The bet: if they can sign up and try it, they will integrate by themselves.')+H('Success measure')+P(pk('1.1.success',['<b>Three of five pilot credit unions make a live assessment within a week of signing up, unaided.</b>','<b>Launched at the lending conference in five weeks.</b> <span class="wa">(output, not outcome)</span>','<b>A thousand sign-ups.</b> <span class="no">(does not test the bet)</span>']))+P(TAG('Q1'))+H('Claims and assumptions')+L(['Five credit unions have agreed to pilot '+TAG('desc'),'Small lenders will integrate without an engineer from us '+TAG('assumption'),'Onboarding a lender today takes '+(S.flags.onboardSourced?'a median of 41 days, 30 of them waiting for a signed data-sharing agreement '+TAG('Q3')+' <span class="muted">last five lender integrations</span>':'six weeks <span class="no">← no source tag</span>')])},
        {p:REC+'ideation/intent-capture/stakeholder-map.md',b:()=>T(['Stakeholder','Interest','Influence'],[['5 pilot credit unions','try before they commit','high'],['Their developers','a first call that works','high'],['Existing 40 lenders','no risk to the network they share','high'],['Sales','something to show at the conference','medium'],['Regulator','who gets access to a fraud check','high']])}],
 pre:[['PRD','Framing the request. This is a new product, and nobody yet knows whether small lenders want it.'],['PRD','So the first question is not what to build. It is what would settle the bet.']],
 post:[['PRD','Writing <code>intent-statement.md</code> and <code>stakeholder-map.md</code>. Every claim should carry a source tag: <code>[desc]</code>, <code>[Q&lt;n&gt;]</code>, <code>[memory:&lt;id&gt;]</code> or <code>[assumption]</code>.'],['PLR','Reviewing the intent against the outcome rubric…']],
 sfail:()=>S.flags.onboardSourced?null:{s:'claim-sources',t:'The intent statement claims "onboarding a lender today takes six weeks" with no source tag.',src:'intent-statement.md:L9',key:'onboardSourced',ch:'Source the onboarding figure from recent integrations',fixmsg:'The claim now reads <b>median 41 days, 30 of them waiting for a signed agreement</b> <code>[Q3]</code>. Most of the delay is paperwork, not code. Sensor re-run: pass.'},
 finds:()=>dv('1.1.success')!==0?[{by:'PLR',t:'The success measure does not test the bet. "'+(dv('1.1.success')===1?'Launched at the conference':'A thousand sign-ups')+'" can be true while no small lender ever integrates.',src:'intent-statement.md:L6',fix:'1.1.success',ch:'Measure unaided first assessments in the pilot'}]:[]},

'1.3':{
 dec:['1.3.data'],
 files:[{p:REC+'ideation/feasibility/feasibility-assessment.md',b:()=>T(['Dimension','Verdict'],[['Technical','feasible: /assess already exists; self-serve keys and tenants do not'],['Legal / privacy',pk('1.3.data',['<span class="ok">feasible</span>: the sandbox holds no personal data','<span class="no">blocked</span>: masked production data open to public sign-up','<span class="no">blocked</span>: production data open to public sign-up'])],['Operational','a public endpoint the team has never run before']])},
        {p:REC+'ideation/feasibility/constraint-register.md',b:()=>L(['C-1: nothing a sandbox user does may reach the production network '+SRC('network DSA §4.2'),'C-2: no personal data outside production '+SRC('DPIA'),'C-3: going live requires a lending-licence check '+SRC('regulator guidance')])},
        {p:REC+'ideation/feasibility/raid-log.md',opt:1,b:()=>T(['ID','Type','Item'],[['R-1','Risk','sandbox used to probe how the checks behave'],['R-2','Risk','sandbox load affects production'],['A-1','Assumption','credit unions have a developer who can call an API'],['D-1','Dependency','self-serve key issuance']])}],
 pre:[['ARC','Checking feasibility. The API exists. What does not exist is any way for a stranger to be near it safely.'],['ARC','The first thing to settle is what a sandbox is allowed to contain.']],
 post:[['ARC','Recording constraints C-1 to C-3 and the RAID log.']],
 finds:()=>dv('1.3.data')!==0?[{by:'ARC',t:(dv('1.3.data')===1?'Masked production data':'Production data')+' behind a public sign-up page breaks constraint C-2. Anyone could test whether a known person has applied for credit.',src:'feasibility-assessment.md:L2',fix:'1.3.data',ch:'Use synthetic identities only'}]:[]},

'1.4':{
 dec:['1.4.scope'],
 files:[{p:REC+'ideation/scope-definition/scope-document.md',b:()=>H('In scope')+L(pk('1.4.scope',[['Sign-up with email verification','Sandbox keys and a sandbox to call','Quickstart and first screen'],['Sign-up with email verification','Sandbox keys and a sandbox to call','Quickstart and first screen','<span class="wa">Billing, plans and invoices</span>']]))+H('Out of scope')+L(pk('1.4.scope',[['Billing and plans → backlog','Usage dashboards → backlog','Single sign-on → backlog'],['Usage dashboards → backlog','Single sign-on → backlog']]))+(S.flags.onboardSourced?P('Note: 30 of the 41 days in today\'s onboarding are spent waiting for a signed agreement. The licence check at go-live is the step to watch.'):'')},
        {p:REC+'ideation/scope-definition/intent-backlog.md',b:()=>L(['Billing and plans','Usage dashboard for sandbox tenants','Single sign-on','Click-through data-sharing agreement for go-live'])}],
 pre:[['PRD','Proposing scope. An MVP is the least we can build that settles the bet, so everything else goes to the backlog.']],
 post:[['PRD','Writing <code>scope-document.md</code> and <code>intent-backlog.md</code>.']],
 finds:()=>dv('1.4.scope')===1?[{by:'PRD',t:'Billing adds a whole Unit and does nothing to show whether small lenders can onboard by themselves.',src:'scope-document.md:L4',fix:'1.4.scope',ch:'Cut billing; move it to the backlog'}]:[]},

'1.6':{
 dec:['1.6.first'],
 files:[{p:REC+'ideation/rough-mockups/wireframes.md',b:()=>PRE(pk('1.6.first',[`┌─ Welcome to Aegle Starter ──────────┐
│ Sandbox key: <span class="s">sk_test_4f9a…</span> [copy]   │
│                                     │
│ $ curl sandbox.aegle.example/assess │
│    -H "Authorization: Bearer $KEY"  │
│    -d @sample-application.json      │
│ <span class="k">→ 200</span>  reasons: [ ID-VEL-02 … ]     │
└─────────────────────────────────────┘`,`┌─ API reference ─────────────────────┐
│ Authentication · Errors · /assess … │
│ <span class="wa">42 pages. "Getting started" is p. 7</span> │
└─────────────────────────────────────┘`,`┌─ Tell us about your company ────────┐
│ Legal name ______  Volume ______    │
│ Use case   ______                   │
│ <span class="wa">11 fields, all required</span>             │
│                       [ Continue ]  │
└─────────────────────────────────────┘`]))},
        {p:REC+'ideation/rough-mockups/user-flow.md',opt:1,b:()=>L(['Sign up with a business email','Verify the email','First screen','First call to the sandbox','Request go-live → licence check'])}],
 pre:[['DSN','Sketching the first screen a developer sees after signing up.']],
 post:[['DSN','Wireframes and user flow written.'],['PLR','Reviewing the mockups against the success measure…']],
 finds:()=>dv('1.6.first')===2?[{by:'PLR',t:'An eleven-field form before the first call. The success measure is about developers getting there unaided, and most will not get past this.',src:'wireframes.md:L1',fix:'1.6.first',ch:'Open with a working call and their own key'}]:dv('1.6.first')===1?[{by:'PLR',t:'The reference is complete, and gives a new developer no first step.',src:'wireframes.md:L1',fix:'1.6.first',ch:'Open with a working call and their own key'}]:[]},

/* ===== 2 INCEPTION ===== */
'2.1':{
 why:'Starter is new, but it plugs into code that is not. Agents need to know how keys and the network work today.',
 files:[
  {p:KB+'code-quality-assessment.md',b:()=>T(['ID','Finding','Where'],[['<b class="wa">CQ-21</b>','<b>API keys are created by a script an engineer runs by hand; every key has network-wide access</b>','scripts/issue-key.ts'],['<b class="wa">CQ-22</b>','<b>there is no tenant: every key reads and writes the one shared network</b>','src/network/'],['CQ-23','validation errors include internal rule names','src/validate.ts:77']])},
  {p:KB+'architecture.md',b:()=>PRE(`lender ─▶ API GW ─▶ λ assess ─┬▶ signals (pipeline)
   ▲                          └▶ network-counter  <span class="wa">← one, shared by all 40 lenders</span>
   └── key issued by hand (scripts/issue-key.ts)`)},
  {p:KB+'api-documentation.md',opt:1,b:()=>PRE('POST /assess → { decisionHint, reasons: [{code, detail}] }')},
  {p:KB+'reverse-engineering-timestamp.md',opt:1,b:()=>P('Diff scan at 2027-02-03T10:05Z: scripts/, src/network/, src/validate.ts and infra/.')}],
 pre:[['DEV','Scanning the parts of <code>aegle-api</code> that Starter has to plug into: key issuance, the network tables and validation.'],['DEV','Two findings matter. Keys are made by hand with access to everything, and the system has no idea what a tenant is.']],
 post:[['DEV','Findings written to the <b>space-level</b> codekb.']]},

'2.2':{
 dec:['2.2.flag'],
 files:[{p:REC+'inception/practices-discovery/discovered-rules.md',b:()=>T(['Rule','Evidence','Status'],[['ALWAYS ship a new endpoint behind a feature flag','team memory, from Network Velocity',pk('2.2.flag',['<span class="ok">extended to new services</span>','<span class="wa">deferred</span>','<span class="no">not applied to Starter</span>'])],['PRs need 1 approval + green CI','branch protection','affirmed'],['Infra changes via CDK only','no console drift in 90 d','affirmed']])},
        {p:REC+'inception/practices-discovery/team-practices.md',b:()=>L(['Trunk-based, short-lived branches','Feature flags via AppConfig','Unit tests with vitest; coverage target 80%'])},
        {p:REC+'inception/practices-discovery/evidence.md',opt:1,b:()=>P('Existing team memory read from <code>memory/team.md</code>. No public-facing service has been built by this team before.')}],
 pre:[['PIP','Reading the team\'s existing practices from memory and checking them against the repository.'],['PIP','One of them needs a human: it was written for endpoints, and this is a new service.']],
 post:[['PIP','<code>PRACTICES_DISCOVERED</code>. The drafts are promoted to team memory only when this stage is approved.']],
 onApprove:()=>{S.mem.practices=true;S.mem.flag=dv('2.2.flag')===0;writeMemory('2.2');audit('PRACTICES_AFFIRMED',`5 sections → memory/team.md · ${S.mem.flag?2:1} rule${S.mem.flag?'s':''} → memory/project.md`)}},

'2.3':{
 dec:['2.3.who','2.3.limit'],
 files:[{p:REC+'inception/requirements-analysis/requirements.md',b:()=>H('Functional')+L(['FR-1: a developer signs up and receives a sandbox key','FR-2: sign-up is open to '+pk('2.3.who',['anyone with a verified business email; go-live needs a licence check by a person','<span class="wa">lenders vetted by hand in advance</span>','<span class="no">anyone with any email address</span>']),'FR-3: the sandbox answers /assess with the same contract as production','FR-4: the sandbox runs on '+dataTxt()+' '+SRC('C-2')])+H('Non-functional')+L(['NFR-1: nothing a sandbox key does can reach the production network '+SRC('C-1, CQ-22'),'NFR-2: per-key limits: '+pk('2.3.limit',['rate limit and daily quota on every sandbox key','<span class="no">none for the pilot</span>']),'NFR-3: time from sign-up to first successful call under 10 minutes'])},
        {p:REC+'inception/requirements-analysis/traceability.json',opt:1,b:()=>PRE('{ "FR-1": ["intent#success"], "FR-4": ["C-2"], "NFR-1": ["C-1", "CQ-22"], "NFR-3": ["intent#success"] }')}],
 pre:[['PRD','Drafting requirements from the intent, the constraints and the code scan. Two questions need humans.']],
 post:[['PRD','Writing <code>requirements.md</code> and <code>traceability.json</code>.'],['PLR','Reviewing requirements…']],
 finds:()=>{const f=[];
  if(dv('2.3.who')===2)f.push({by:'PLR',t:'Open sign-up with any email gives anonymous users a place to study how the fraud checks respond.',src:'requirements.md:FR-2',fix:'2.3.who',ch:'Require a verified business email'});
  if(dv('2.3.who')===1)f.push({by:'PLR',t:'Vetting every lender by hand first is today\'s process. Nothing self-serve is left to test.',src:'requirements.md:FR-2',fix:'2.3.who',ch:'Require a verified business email'});
  if(dv('2.3.limit')===1)f.push({by:'PLR',t:'With no per-key limits, one user\'s test loop is everybody\'s outage. The sign-up page is public.',src:'requirements.md:NFR-2',fix:'2.3.limit',ch:'Add a rate limit and quota per key'});
  return f}},

'2.4':{
 dec:['2.4.stuck'],
 files:[{p:REC+'inception/user-stories/stories.md',b:()=>L(['US-01 As a developer, I sign up and get a sandbox key','US-02 As a developer, I make a first call that returns a realistic response','US-03 As a developer, I can trigger each reason code with sample data','US-04 As a developer, I can see my keys and my usage','US-05 As a compliance officer, I can request go-live and see the licence check progress',dv('2.4.stuck')===0?'<b>US-06 As a developer whose first call fails, I am told what was wrong with my request and how to fix it</b>':null])},
        {p:REC+'inception/user-stories/personas.md',opt:1,b:()=>L(['Noor, the only developer at a 30-person credit union','Ife, its compliance officer',dv('2.4.stuck')===0?'Noor again, at 17:40 on a Friday, with a 400 and no idea why':null])}],
 pre:[['PRD','Drafting stories from the requirements.'],['PRD','There is a gap I can see myself: every story so far ends well.']],
 post:[['PRD','Writing <code>stories.md</code> and <code>personas.md</code>.'],['PLR','Reviewing the stories…']],
 finds:()=>dv('2.4.stuck')!==0?[{by:'PLR',t:'No story covers a first call that fails. The success measure says "with no help from us", and failure is where help gets asked for.',src:'stories.md:L6',fix:'2.4.stuck',ch:'Add the failed-first-call story'}]:[]},

'2.5':{
 dec:['2.5.golive'],
 files:[{p:REC+'inception/refined-mockups/mockups.md',b:()=>PRE(`Go live
${pk('2.5.golive',[`[ Start licence check ]
  1. We verify your lending licence      (1–2 working days)
  2. You accept the data-sharing terms   (online)
  3. Your live key appears here`,`[ Contact sales ]   <span class="wa">→ opens an email</span>`])}`)},
        {p:REC+'inception/refined-mockups/interaction-spec.md',b:()=>L(['First screen: '+pkd('1.6.first',['a working call with the developer\'s own key','the API reference','<span class="wa">a company-details form</span>'],'not designed: Rough Mockups is not in this scope'),'Keys are shown once, with a copy button','Test and live keys never look alike: sk_test_… and sk_live_…'])},
        {p:REC+'inception/refined-mockups/accessibility-checklist.md',opt:1,b:()=>L(['Every step works with a keyboard alone','Code samples can be copied as text'])}],
 pre:[['DSN','Refining the screens. The interesting one is the step where self-serve meets the licence check.']],
 post:[['DSN','Mockups, interaction spec and accessibility checklist written.'],['PLR','Reviewing the mockups…']],
 finds:()=>dv('2.5.golive')===1?[{by:'PLR',t:'Go-live hands the user back to the email inbox the old process ran through. The one human step should be visible and dated.',src:'mockups.md:L2',fix:'2.5.golive',ch:'Start the licence check from the page'}]:[]},

'2.6':{
 dec:['2.6.tenant'],
 files:[{p:REC+'inception/domain-design/components.md',b:()=>T(['Component','Responsibility'],[['signup-svc','sign-up, email verification, tenant record'],['key-svc','issues sk_test_ keys; never a network-wide key '+SRC('CQ-21')],['sandbox','answers /assess for sandbox tenants: '+tenantTxt()],['quickstart-ui','first screen, key console, docs']])},
        {p:REC+'inception/domain-design/decisions.md',b:()=>H('ADR-011 Where sandbox tenants live')+P(tenantTxt())+P('Constraint C-1: nothing a sandbox user does may reach the production network.')}],
 pre:[['ARC','Designing components. The system has never had tenants, and Starter makes strangers into tenants.']],
 post:[['ARC','Writing <code>components.md</code> and ADRs.'],['ARV','Reviewing domain design…']],
 finds:()=>dv('2.6.tenant')===2?[{by:'ARV',t:'A flag on shared rows is one missing filter away from sandbox sightings in real lenders\' counters. That breaks constraint C-1.',src:'decisions.md:ADR-011',fix:'2.6.tenant',ch:'Give the sandbox its own stack and key'}]:dv('2.6.tenant')===1?[{by:'ARV',t:'Sharing the production fingerprint key lets a sandbox user compute real fingerprints.',src:'decisions.md:ADR-011',fix:'2.6.tenant',ch:'Give the sandbox its own stack and key'}]:[]},

'2.7':{
 dec:['2.7.skel'],
 files:[{p:REC+'inception/units-generation/unit-of-work.md',b:()=>T(['Unit','Kind','Stories'],units().map(u=>[u.id,u.kind,u.st]))},
        {p:REC+'inception/units-generation/unit-of-work-dependency.md',b:()=>PRE(dv('2.7.skel')===0?'u0-walking-skeleton\n  ├─▶ u1-signup\n  ├─▶ u2-sandbox\n  └─▶ u3-quickstart'+(dv('1.4.scope')===1?'\n  └─▶ u4-billing':''):'u1-signup ─▶ u2-sandbox ─▶ u3-quickstart'+(dv('1.4.scope')===1?' ─▶ u4-billing':''))},
        {p:REC+'inception/units-generation/unit-of-work-story-map.md',opt:1,b:()=>P('Every story US-01 to US-0'+(dv('2.4.stuck')===0?'6':'5')+' maps to at least one Unit.')}],
 pre:[['ARC','Splitting the work into Units and drawing the dependency graph.']],
 post:[['ARC','Writing units, DAG and story map.'],['ARV','Reviewing the Units…']],
 sfail:()=>({s:'traceability',t:'US-05 (request go-live) has no downstream Unit in traceability.json.',src:'traceability.json: US-05',auto:'ARC',fixmsg:'US-05 mapped to u1-signup. Sensor re-run: pass.'}),
 finds:()=>dv('2.7.skel')===1?[{by:'ARV',t:'Without a walking skeleton, sign-up, sandbox and quickstart first meet each other at the end.',src:'unit-of-work-dependency.md:L1',fix:'2.7.skel',ch:'Restore u0-walking-skeleton as the first Unit'}]:[]},

'2.8':{
 why:'Developers will write code against this contract on day one, and keep it when they go live.',
 dec:['2.8.env'],
 files:[{p:REC+'inception/contract-design/contract-summary.md',b:()=>PRE(pk('2.8.env',[`POST https://sandbox.aegle.example/assess     Authorization: Bearer <span class="s">sk_test_…</span>
POST https://api.aegle.example/assess         Authorization: Bearer <span class="s">sk_live_…</span>
  (same request, same response)`,`POST https://api.aegle.example/assess
  { <span class="wa">"mode": "sandbox"</span>, ...application }`,`POST https://sandbox.aegle.example/<span class="wa">v0/check</span>     (a different, simpler contract)`]))}],
 pre:[['ARC','Designing the public contract for the sandbox.']],
 post:[['ARC','Writing <code>contract-summary.md</code>.'],['ARV','Reviewing the contract…']],
 finds:()=>dv('2.8.env')===1?[{by:'ARV',t:'A "mode" field on the production host means a missing field turns a test into a live assessment.',src:'contract-summary.md:L2',fix:'2.8.env',ch:'Separate host, with sk_test_ and sk_live_ keys'}]:dv('2.8.env')===2?[{by:'ARV',t:'A different sandbox contract makes every developer integrate twice.',src:'contract-summary.md:L1',fix:'2.8.env',ch:'Separate host, with sk_test_ and sk_live_ keys'}]:[]},

'2.9':{
 dec:['2.9.verify','2.9.exec'],
 files:[{p:REC+'inception/delivery-planning/bolt-plan.md',b:()=>T(['Bolt','Units','Mode'],[dv('2.7.skel')===0?['B1','u0-walking-skeleton','serial, checkpoint']:null,['B2',units().filter(u=>u.id!=='u0-walking-skeleton').map(u=>u.id.split('-')[0]).join(', '),pk('2.9.exec',['unit-major, serial','<b>stage-major, swarm</b> (git worktrees)'])]])+P('Construction Verification Command: <code>'+pk('2.9.verify',['make e2e','npm run lint'])+'</code>')},
        {p:REC+'inception/delivery-planning/team-allocation.md',b:()=>L(['Sam: approves code units','Maya: infrastructure gates','Theo: security and CI gates','Priya: product gates'])},
        {p:REC+'verification/phase-check-inception.md',opt:1,b:()=>P('Phase check: every FR has a story, every story has a Unit, and every Unit has a bolt.')}],
 pre:[['DLV','Planning bolts: delivery slices over one or more dependency-linked Units. The verification command and the execution mode are human calls.']],
 post:[['DLV','Bolt plan written. Running the Inception phase check.']]},

/* ===== 3 CONSTRUCTION ===== */
'3.1':{
 files:[{p:REC+U2+'functional-design/rules.md',b:()=>L(['R-1: a sandbox key can only ever call the sandbox','R-2: the sandbox answers from '+dataTxt(),'R-3: every reason code can be triggered by a documented sample identity','R-4: the sandbox never returns how a score was reached'])},
        {p:REC+U2+'functional-design/functional-spec.md',b:()=>PRE('assess(request, key):\n  require key.startsWith("sk_test_")\n  tenant = tenants[key]\n  throttle(tenant)\n  return pipeline.run(request, network = sandboxNetwork(tenant))')},
        {p:REC+U2+'functional-design/entities.md',opt:1,b:()=>L(['Tenant { id, email, verifiedAt, status: sandbox | live }','SandboxKey { id, tenant, prefix: sk_test_ }','SyntheticIdentity { fingerprint, ring? }'])}],
 pre:[['ARC','Functional design for <b>u2-sandbox</b>. In a real run every Unit walks stages 3.1–3.5 in turn and is approved at its own checkpoint; this simulator follows u2 and builds the others in 3.5.']],
 post:[['ARC','Rules, spec and entities written.'],['ARV','Reviewing functional design…']]},

'3.2':{
 dec:['3.2.abuse'],
 files:[{p:REC+U2+'nfr-requirements/security-requirements.md',b:()=>L(['Sign-up abuse: '+pk('3.2.abuse',['no key until the email is verified; limits per domain and per address','<span class="no">unmitigated</span>']),'Isolation: a sandbox key is rejected by every production endpoint','Errors never reveal rule names or thresholds '+SRC('CQ-23')])},
        {p:REC+U2+'nfr-requirements/performance-requirements.md',b:()=>L(['Sandbox /assess p99 &lt; 500 ms','Sandbox load must not move production p99','Per-key limits: '+pkd('2.3.limit',['rate limit and daily quota','<span class="no">none</span>'],NOT())])},
        {p:REC+U2+'nfr-requirements/observability-requirements.md',opt:1,b:()=>L(['Sign-ups, verified sign-ups and first successful calls, per day','Sandbox and production metrics on separate dashboards'])}],
 pre:[['ARC','NFR requirements for u2: security, performance and observability.'],['ARC','One open threat stands out: <b>a public sign-up page</b>.']],
 post:[['ARC','Writing the security, performance and observability requirements.'],['ARV','Reviewing the NFR requirements…']],
 finds:()=>dv('3.2.abuse')===1?[{by:'ARV',t:'Unverified, unlimited sign-up lets one script create thousands of sandbox tenants.',src:'security-requirements.md:L1',fix:'3.2.abuse',ch:'Verify email and limit sign-ups'}]:[]},

'3.3':{
 dec:['3.3.iso'],
 files:[{p:REC+U2+'nfr-design/performance-design.md',b:()=>L(['Throttling: per sandbox key at the gateway','Concurrency: '+pk('3.3.iso',['the sandbox has its own pool; production capacity is reserved','<span class="no">shared with production</span>']),'Data: '+tenantTxt()])},
        {p:REC+U2+'nfr-design/security-design.md',opt:1,b:()=>L(['Separate API Gateway stage and usage plan for the sandbox','Production authorizer rejects any key starting sk_test_'])}],
 pre:[['ARC','Designing what happens when a sandbox tenant misbehaves.']],
 post:[['ARC','Writing NFR design.'],['ARV','Reviewing NFR design…']],
 finds:()=>dv('3.3.iso')===1?[{by:'ARV',t:'With a shared concurrency pool, load on the free sandbox takes capacity from paying lenders\' assessments.',src:'performance-design.md:L2',fix:'3.3.iso',ch:'Give the sandbox its own concurrency pool'}]:[]},

'3.4':{
 dec:['3.4.cap'],
 files:[{p:REC+U2+'infrastructure-design/infrastructure-specification.md',b:()=>T(['Resource','Spec'],[['Sandbox tables',pk('3.4.cap',['on-demand, with a hard ceiling','<span class="wa">provisioned for 5 users</span>'])],['Sandbox Lambda',pk('3.4.cap',['own concurrency pool, ceiling 200','<span class="wa">reserved 10, fixed</span>'])],['Budget alarm',pk('3.4.cap',['$50 a day → page','<span class="no">none</span>'])],['AppConfig','flag starter.signup.enabled'+(dv('2.2.flag')===0?'':' <span class="wa">(not planned)</span>')]])},
        {p:REC+U2+'infrastructure-design/monitoring-design.md',opt:1,b:()=>L(['Sandbox dashboard: sign-ups, first calls, throttles'])},
        {p:REC+U2+'infrastructure-design/cicd-pipeline.md',opt:1,b:()=>L(['CDK pipeline: dev → staging. There is no production stage in this scope.'])}],
 pre:[['AWS','Specifying infrastructure for the sandbox. The pilot is five credit unions; the page is public.']],
 post:[['AWS','Writing the infrastructure specification.'],['ARV','Reviewing the infrastructure design…']],
 finds:()=>dv('3.4.cap')===1?[{by:'ARV',t:'Fixed capacity for five users, on a page anyone can reach. One mention anywhere and it is full.',src:'infrastructure-specification.md:L1',fix:'3.4.cap',ch:'Use on-demand capacity with a ceiling'}]:[]},

'3.5':{
 files:[{p:REC+U2+'code-generation/code-generation-plan.md',b:()=>(zeroUnit()?P('This scope skips Units Generation, so there are no Units: one plan, written to <code>construction/code-generation/</code>.'):P('Every Unit has its own plan at <code>construction/&lt;unit&gt;/code-generation/code-generation-plan.md</code>, and each gets its own approval receipt.'))+L(units().map(u=>'<b>'+u.id+'</b>: '+u.plan))+P('Sandbox data: '+dataTxt()+'. Tenants: '+tenantTxt()+'.')},
        {p:REC+U2+'code-generation/code-summary.md',b:()=>T(['Unit','Files','Tests'],units().map(u=>[u.id,u.files,u.tests]))+P('Errors on a malformed request: '+pk('3.5.err',['the field and what was expected; nothing about scoring','<span class="wa">"400 Bad Request" only</span>','<span class="no">production validation errors, passed through</span>'],0))},
        {p:REC+U2+'code-generation/unit-test-instructions.md',opt:1,b:()=>PRE('npm test -- --coverage'+(zeroUnit()?'':'\n'+pkd('2.9.verify',['make e2e','npm run lint'],'make e2e')+'   # the authorized Construction Verification Command'))}],
 pre:[['DEV','Drafting a code plan for each Unit. No code is written until its plan is approved.']],
 post:[['DEV','Everything generated. Writing <code>code-summary.md</code>.'],['ARV','Reviewing generated code against the functional spec…']],
 sfail:()=>({s:'required-sections',t:'code-summary.md is missing a required H2 heading.',src:'code-summary.md',auto:'DEV',fixmsg:'Heading restored. Sensor re-run: pass.'}),
 finds:()=>dv('3.5.err')===2?[{by:'ARV',t:'Sandbox errors name internal rules and thresholds (CQ-23). A public sandbox would publish them.',src:'u2/src/errors.ts:18',fix:'3.5.err',ch:'Say which field is wrong, and nothing about scoring'}]:dv('3.5.err')===1?[{by:'ARV',t:'A bare 400 gives a developer nothing to act on.',src:'u2/src/errors.ts:18',fix:'3.5.err',ch:'Say which field is wrong, and nothing about scoring'}]:[]},

'3.6':{
 dec:['3.6.outside'],
 files:[{p:REC+'construction/build-and-test/test-results.md',b:()=>T(['Suite','Result'],[['unit','<span class="ok">248 passed</span>'],['integration','<span class="ok">31 passed</span>'],['isolation: sk_test_ key against production',tenantOk()?'<span class="ok">rejected</span>':'<span class="wa">not applicable: sandbox and production share tables</span>'],['onboarding, timed',pk('3.6.outside',['<span class="ok">14 min by an outside developer; 2 sticking points found and fixed</span>','<span class="wa">4 min by the team; nothing found</span>'])]])},
        {p:REC+'construction/build-and-test/build-instructions.md',opt:1,b:()=>PRE('npm ci && npm run build && npm test'+(zeroUnit()?'':' && make e2e'))}],
 pre:[['QA','Building everything and running the unit and integration suites.'],['QA','One question first: who should try the onboarding?']],
 post:[['QA','Writing <code>test-results.md</code>.']],
 finds:()=>dv('3.6.outside')===1?[{by:'QA',t:'The onboarding has only been tried by people who built it. The success measure is about people who have never seen it.',src:'test-results.md:L4',fix:'3.6.outside',ch:'Have an outside developer onboard cold'}]:[]},

'3.7':{
 dec:['3.7.gates'],
 files:[{p:REC+'construction/ci-pipeline/quality-gates.md',b:()=>T(['Gate','Mode'],[['SAST, dependency and secrets scans',pk('3.7.gates',['blocking','advisory'])],['Coverage ≥ 80%',pk('3.7.gates',['blocking','advisory'])],['Isolation test: a sandbox key cannot reach production',pk('3.7.gates',['blocking','advisory'])]])},
        {p:REC+'construction/ci-pipeline/ci-config.md',opt:1,b:()=>PRE('on: pull_request\njobs: build · test · sast · deps · secrets · coverage · isolation')},
        {p:REC+'verification/phase-check-construction.md',opt:1,b:()=>P('Phase check: every Unit is built and tested, and every FR has a passing test.')}],
 pre:[['PIP','Configuring CI and quality gates. This scope ends here: nothing after this stage puts Starter in front of a user.']],
 post:[['PIP','Writing CI config and quality gates, plus the Construction phase check.']],
 finds:()=>dv('3.7.gates')===1?[{by:'PIP',t:'An advisory isolation test means a change that lets sandbox keys reach production could still merge.',src:'quality-gates.md:L3',fix:'3.7.gates',ch:'Make the scans and the isolation test blocking'}]:[]},
};

const HOW=()=>S.prof==='poc'?'The PoC was never meant to ship. Sales demonstrated it at the lending conference anyway, and handed out the address. It is now the product.'
  :`The ${scope().n} scope ends before deployment, so the team put Starter live by hand for the five pilot credit unions. Nothing in Operation was ever designed.`;

/* ---------- the incident: the day Starter meets people who did not build it ---------- */
function incident(D){
  const no=id=>D[id]===undefined,sc=scope().n;
  const first=!isoOk()?{id:'starve',n:'Production is being starved',sev:95,chart:'p99',sym:'p99 on the <b>production</b> /assess is at 1.8 s. Sandbox traffic is using the concurrency that real lenders\' assessments need.',rc:no('3.3.iso')?`NFR Design is not in the ${sc} scope, so the sandbox was simply deployed beside production, on the same pool.`:'3.3 let the sandbox share the production concurrency pool.'}
    :D['3.4.cap']!==0?{id:'cap',n:'The sandbox is full',sev:75,chart:'p99',sym:'Sign-ups are queuing and first calls are timing out. The sandbox has 900 tenants.',rc:no('3.4.cap')?`Infrastructure Design is not in the ${sc} scope, so nobody sized the sandbox at all.`:'3.4 sized the sandbox for the five users who were invited.'}
    :{id:'surge',n:'Sign-up surge',sev:45,chart:'rps',sym:'900 sign-ups in an hour. The sandbox is scaling inside its ceiling.',rc:'Pure interest. The sandbox has its own pool and on-demand capacity, so production has not noticed.'};
  const botsOk=D['3.2.abuse']===0&&D['2.3.who']!==2;
  const second=!dataOk()?{id:'leak',n:'Real people in the sandbox',sev:95,chart:'err',sym:'A security researcher has written in. By sending the sandbox names from a public breach, they can tell which of those people applied for credit last month.',rc:no('1.3.data')?`Feasibility is not in the ${sc} scope, so nobody ruled on what a sandbox may contain. It was loaded with a masked copy of production.`:D['1.3.data']===1?'1.3 put a masked copy of production in the sandbox. Masking did not survive a determined stranger.':'1.3 pointed the sandbox at production data.'}
    :!tenantOk()?{id:'cross',n:'Sandbox sightings in the live network',sev:90,chart:'err',sym:'Production lenders are seeing ID-VEL-02 flags for identities that exist only in somebody\'s test script.',rc:no('2.6.tenant')?`Domain Design is not in the ${sc} scope, so tenants were added as a flag on the production tables. One query forgot the flag.`:D['2.6.tenant']===2?'2.6 kept sandbox tenants in the production tables behind a flag. One query forgot the flag.':'2.6 shared the production fingerprint key with the sandbox, so test identities collide with real ones.'}
    :{id:'bots',n:'Sign-up bots',sev:70,chart:'rps',sym:'Four hundred of the new accounts came from eleven addresses, and they are stepping through variations of the same identity.',rc:no('3.2.abuse')?`NFR Requirements is not in the ${sc} scope, so sign-up has no abuse controls.`:D['2.3.who']===2?'2.3 opened sign-up to any email address.':'3.2 left sign-up abuse for later.',
      auto:botsOk,autoLog:'Email verification and per-domain limits (3.2) are turning the bots away at the door.'};
  const gaps=[D['1.6.first']!==0?'the first screen is not a working call (1.6)':null,D['2.4.stuck']!==0?'no story covered a failed first call (2.4)':null,D['3.6.outside']!==0?'nobody outside the team had tried it (3.6)':null,D['3.5.err']!==0?'errors do not say what to fix (3.5)':null,!S.flags.onboardSourced?'nobody had looked at where onboarding time really goes (1.1)':null].filter(Boolean);
  const third={id:'stuck',n:'Developers are stuck',sev:30+gaps.length*13,chart:'err',sym:'Support has 140 emails. Two of the five pilot credit unions have not managed a first call.',rc:gaps.length?'Onboarding has gaps: '+gaps.slice(0,3).join('; ')+(gaps.length>3?'; and more':'')+'.':'',
    auto:!gaps.length,autoLog:'Four of the five pilot credit unions made a first call within ten minutes. Support has six emails.'};
  const waves=[first,second,third];
  const abil=[
   {id:'investigate',n:'Investigate',ag:'OPS',role:'ops',cast:2,cd:0,util:1,d:'Read the dashboards, the logs and the support inbox to find the cause.',src:()=>'always available'},
   {id:'scale',n:'Raise sandbox capacity',ag:'AWS',role:'ops',cast:()=>D['3.4.cap']===0?2:4,cd:10,d:'Give the sandbox more room.',dmg:{surge:75,cap:100,starve:15},src:()=>D['3.4.cap']===0?'3.4: on-demand, inside a ceiling (fast)':'always available'},
   {id:'isolate',n:'Separate the sandbox pool',ag:'DEV',role:'eng',cast:5,cd:12,d:'Move the sandbox onto its own concurrency pool.',dmg:{starve:100},src:()=>'always available (slow)'},
   {id:'purge',n:'Swap in synthetic data',ag:'DSO',role:'sec',cast:6,cd:15,d:'Empty the sandbox and reload it with synthetic identities.',dmg:{leak:100},src:()=>'always available (slow)'},
   {id:'split',n:'Cut the sandbox off',ag:'DEV',role:'eng',cast:6,cd:15,d:'Move sandbox tenants onto their own tables and key.',dmg:{cross:100},src:()=>'always available (slow)'},
   {id:'verify',n:'Require verified email',ag:'DSO',role:'sec',cast:3,cd:10,d:'Suspend unverified accounts and limit sign-ups per domain.',dmg:{bots:85,surge:20,cap:20},src:()=>'always available'},
   {id:'docs',n:'Fix the quickstart',ag:'DSN',role:'po',cast:4,cd:9,d:'Rewrite the first screen and the error messages where people are stuck.',dmg:{stuck:75},src:()=>'always available'},
   {id:'flag',n:'Close sign-ups',ag:'PIP',role:'ops',cast:1,cd:0,once:1,util:1,d:'Switch the sign-up page off. Existing tenants keep working.',dmg:{_:50},req:()=>D['2.2.flag']===0,src:()=>D['2.2.flag']===0?'2.2 Practices: sign-up sits behind a feature flag':'needs the feature-flag practice (2.2)'},
   {id:'rollback',n:'Take Starter offline',ag:'PIP',role:'ops',cast:8,cd:0,once:1,util:1,d:'A blunt fix: ends the incident, and the pilot with it.',src:()=>'by hand: there is no deployment pipeline (~8 s)'},
   {id:'notify',n:'Notify the pilot',ag:'PRD',role:'po',cast:2,cd:0,once:1,util:1,d:'Tell the five credit unions what is happening and what still works.',src:()=>'always available'},
   {id:'escalate',n:'Page incident commander',ag:'DLV',role:'pm',cast:2,cd:0,once:1,util:1,d:'An IC coordinates the response, so all casts are 40% faster.',src:()=>'always available'},
  ];
  return {
    h:'Pilot day',
    p:HOW()+' This morning a fintech newsletter linked to the sign-up page. Alarms are firing.',
    unshipped:HOW()+' This morning a fintech newsletter linked to the sign-up page. Alarms are firing.',
    comms:'Pilot users who know what is happening will wait an hour. Silent ones leave.',
    abil,waves,rps:900,
    logs:{notify:'The five pilot credit unions told what is happening, what still works and when to try again.',rollback:'Starter is offline. The incident is over, and so is the pilot.'},
    result:{won:'All three waves handled. Starter stayed up, and the pilot can still settle the bet.',rollback:'The incident is over, but Starter is offline and the pilot has nothing to try.',breach:'The error budget ran out on the first day anyone outside the team used the product.'},
    score:{notified:['Pilot users notified','Pilot users never notified'],rolled:'Starter taken offline'},
    why(){const it=[];
      it.push([first.id==='surge'?'The surge stayed inside the sandbox':first.id==='cap'?'The sandbox was sized for the guest list':'Sandbox load reached production',first.id==='surge'?'good':'bad',first.id==='surge'?'3.3 gave the sandbox its own pool and 3.4 gave it on-demand capacity under a ceiling.':first.rc]);
      it.push([second.id==='bots'?(botsOk?'Bots were stopped at sign-up':'Bots signed up by the hundred'):second.n,second.id==='bots'&&botsOk?'good':'bad',second.id==='bots'&&botsOk?'1.3 chose synthetic data, 2.6 kept tenants away from production, and 3.2 verified email before issuing a key.':second.rc]);
      it.push([gaps.length?`Onboarding had ${gaps.length} gap${gaps.length>1?'s':''}`:'People onboarded without help',gaps.length?'bad':'good',gaps.length?gaps.join('; ')+'.':'A working first call, a story for failure, useful errors and an outsider with a stopwatch.']);
      return it},
  };
}

function debrief(C2,D){
  const sc=scope().n;
  if(D['1.1.success']!==undefined)C2('1.1',D['1.1.success']===0,D['1.1.success']===0?'Three of five pilots, unaided, within a week: a measure that settles the bet either way.':'The success measure could be met without one small lender integrating.');
  else C2('1.1',false,`The ${sc} scope has no Ideation, so Starter was built without anyone writing down what would show that small lenders want it.`);
  if(S.plan.includes('1.1'))C2('SENS',!!S.flags.onboardSourced,S.flags.onboardSourced?'Sourcing "six weeks" showed that 30 of the 41 days are paperwork, which changed what the go-live step had to do.':'Nobody checked where today\'s six weeks actually go.');
  C2('1.3',dataOk(),D['1.3.data']===undefined?`Feasibility is not in the ${sc} scope, so nobody ruled on what a public sandbox may contain.`:dataOk()?'Synthetic identities meant the sandbox had nothing real in it to leak.':'The sandbox was given data about real people.');
  if(D['1.4.scope']!==undefined)C2('1.4',D['1.4.scope']===0,D['1.4.scope']===0?'The MVP held only what was needed to settle the bet.':'Billing was built before anyone had shown they would pay.');
  if(D['2.2.flag']!==undefined)C2('2.2',D['2.2.flag']===0,D['2.2.flag']===0?'Extending the feature-flag practice put "Close sign-ups" in your incident loadout.':'Without the flag, closing sign-up meant shipping a release.');
  C2('2.6',tenantOk(),D['2.6.tenant']===undefined?`Domain Design is not in the ${sc} scope, so tenants arrived as a flag on the production tables.`:tenantOk()?'A separate sandbox stack meant nothing a stranger did could reach the live network.':'Sandbox tenants shared something with production that they should not have.');
  if(D['2.7.skel']!==undefined||S.plan.includes('2.7'))C2('2.7',!noSkel(),noSkel()?(scope().skeleton?'Building the Units apart caused an integration failure at 3.6.':`The ${sc} scope ships with the walking skeleton off, and the Units first met at Build and Test.`):'A walking skeleton ran the whole journey before any part was finished.');
  if(D['3.2.abuse']!==undefined)C2('3.2',D['3.2.abuse']===0,D['3.2.abuse']===0?'Verified email and sign-up limits stopped the bots without anyone lifting a finger.':'Sign-up abuse was left for later, and later arrived.');
  C2('3.3',isoOk(),D['3.3.iso']===undefined?`NFR Design is not in the ${sc} scope, so the sandbox shared production's capacity by default.`:isoOk()?'The sandbox had its own concurrency pool, so its load was its own problem.':'The sandbox shared production\'s concurrency pool.');
  if(D['3.6.outside']!==undefined)C2('3.6',D['3.6.outside']===0,D['3.6.outside']===0?'An outside developer with a stopwatch found the two places people get stuck.':'The onboarding was only ever tried by the people who built it.');
}

return {
 id:'product',n:'Aegle Starter',kind:'new product',col:'var(--amber)',
 tag:'Let a small lender sign up and try Aegle, without a contract or an integration project.',
 d:'Today a lender signs an enterprise contract and waits six weeks for an integration. Priya has five credit unions willing to pilot a self-serve tier: sign up, get a sandbox key, make a first assessment within the hour. Nobody knows yet whether small lenders will get there alone.',
 ask:ASK,intent:'aegle-starter',REC,KB,U2,
 boot:{repo:'aegle-api',ws:'brownfield · TypeScript + Python · 18,300 LOC · codekb found',note:'Five credit unions have agreed to pilot. The lending conference is in five weeks.'},
 scopes:['mvp','poc','classic'],best:'mvp',
 fit:{
  mvp:{v:'best',t:'A trimmed Ideation to frame the bet, then all of Inception and Construction. It stops at CI, so putting it in front of the pilot is on you.'},
  classic:{v:'ok',t:'All of Inception and Construction, with no Ideation: built properly, without first asking what would show that small lenders want it. No walking skeleton.'},
  poc:{v:'poor',t:'Shows that it can be built, which nobody doubted. No design, no plan approval, and it never deploys.'},
 },
 composer:{E:[.63,.34,.49,.57,.71],why:'The largest unknowns are the intent itself (0.63) and its unresolved assumptions (0.71): nobody knows whether small lenders will onboard by themselves. MVP keeps a trimmed Ideation to frame that question, then builds properly as far as CI. A PoC would only show that it can be built. Classic would build it well without asking whether anyone wants it.'},
 DEC,stages,units,
 skel:'sign up → sandbox key → first /assess call',
 midBuild:{unit:'u2',dec:'3.5.err'},
 verify:()=>({cmd:S.dec['2.9.verify']===1?'npm run lint':'make e2e',weak:S.dec['2.9.verify']===1}),
 loopBack:()=>!zeroUnit()&&(noSkel()||S.dec['2.9.verify']===1)?{why:'Integration failure: u1 issues keys that start <code>sk_test_</code>, and u2 looks for the old lender-ID header. '+(noSkel()?(scope().skeleton?'Without a walking skeleton':`The ${scope().n} scope ships with the walking skeleton off, so`)+' the Units were never run together before now.':'Every checkpoint was "verified" by a lint pass, so nothing ever ran end to end.'),fixed:'Second run: green. Sign-up, sandbox and quickstart agree on what a key looks like.'}:null,
 deploy:{what:'Starter',all:'No blast-radius control.'},
 addStage:{at:'2.3',add:'2.6',ask:'Domain Design is not in this scope, but Starter brings tenants into a system that has never had them. Add it?',sub:'Nobody has designed where a sandbox tenant\'s data lives.'},
 phaseChecks:from=>({2:[['Every FR has a story',S.dec['2.4.stuck']!==1]],3:[['Security checks and the isolation test block a merge in CI',S.dec['3.7.gates']!==1]]})[from]||[],
 traceGap:()=>S.ran.has('1.1')&&!S.flags.onboardSourced,
 humanSensor:'1.1',
 outcome:()=>S.dec['1.1.success']===0,
 unshippedRow:()=>S.prof==='poc'?'A PoC never deploys. This one reached users anyway, with no design behind it and nothing in Operation.':`The ${scope().n} scope never ran Deployment Execution. Starter went live by hand, with no rollback plan, alarms or runbooks designed.`,
 badge:{ic:'🚪',n:'Open Door, Locked Vault',d:'Synthetic data, a sandbox that cannot reach production, and an outsider who onboarded with a stopwatch running.',test:()=>S.dec['1.3.data']===0&&S.dec['2.6.tenant']===0&&S.dec['3.6.outside']===0},
 incident,debrief,
};
})();
