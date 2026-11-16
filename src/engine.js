/* ================= DATA ================= */
/* The story being played (people aside) lives in src/scenarios/*.js, inlined below by build.mjs.
   The engine reads it only through SCN; useScenario() swaps it in. */
const MEM='aidlc/spaces/identity/memory/';   // team memory belongs to the space, so every scenario shares it
const SCENARIOS={};
let SCN=null,DEC={},REC='',KB='',U2='';

const PEOPLE={
  po:{n:'Priya',full:'Priya Nair',t:'Product Owner',ini:'PN',brief:'You own the <b>why</b>: the outcome, the scope and what customers see.',v1:true},
  eng:{n:'Sam',full:'Sam Okafor',t:'Engineering Lead',ini:'SO',brief:'You own the <b>how</b>: design, contracts, code and tests.',v1:true},
  pm:{n:'Jordan',full:'Jordan Reyes',t:'Delivery Manager',ini:'JR',brief:'You own the <b>flow</b>: team, plan, timing and escalation.',v1:true},
  ops:{n:'Maya',full:'Maya Lindqvist',t:'SRE / Ops Lead',ini:'ML',brief:'You own <b>production</b>: capacity, deploys, alarms and incidents.',v1:false},
  sec:{n:'Theo',full:'Theo Brandt',t:'Security & Compliance',ini:'TB',brief:'You own <b>trust</b>: privacy, threats and guardrails.',v1:false},
};
const ROLE_ORDER=['po','eng','pm','ops','sec'];

/* 14 agents: 11 domain experts, 2 reviewers, 1 composer. kind: x expert, s support-only (never leads), r reviewer, c composer */
const AGENTS={
  PRD:{n:'Product',c:'#FF7AB6',k:'x',d:'Frames intent, outcomes, requirements and user stories.'},
  ARC:{n:'Architect',c:'#38E1FF',k:'x',d:'Feasibility, domain design, units, contracts and NFR design.'},
  DSN:{n:'Design',c:'#FF9F5A',k:'x',d:'Mockups, user flows, interaction and accessibility.'},
  DEV:{n:'Developer',c:'#5B8CFF',k:'x',d:'Reverse engineering scans, code generation and unit tests.'},
  QA:{n:'Quality',c:'#8CFF6B',k:'x',d:'Test strategy, build and test, performance validation.'},
  DSO:{n:'DevSecOps',c:'#C084FC',k:'s',d:'Support only: threat models, security requirements and scanning. Never leads a stage.'},
  PIP:{n:'Pipeline & Deploy',c:'#2EE6C5',k:'x',d:'Practices discovery, CI, CD and deployment execution.'},
  AWS:{n:'AWS Platform',c:'#FFB547',k:'x',d:'Infrastructure design and environment provisioning.'},
  OPS:{n:'Operations',c:'#FFE066',k:'x',d:'Observability, incident response and the feedback loop.'},
  DLV:{n:'Delivery',c:'#7DD3FC',k:'x',d:'Team formation, handoff, bolts and delivery planning.'},
  CMP:{n:'Compliance',c:'#A5A8FF',k:'s',d:'Support only: regulatory and policy constraints. Never leads a stage.'},
  ARV:{n:'Architecture Reviewer',c:'#FF8F70',k:'r',d:'Reviews design and code stages (2.6–2.8, 3.1–3.5) and returns a READY / NOT-READY verdict with findings.'},
  PLR:{n:'Product Lead',c:'#F5D061',k:'r',d:'Reviews product stages (1.1, 1.6, 2.3, 2.4, 2.5) against the intent and outcomes.'},
  CPS:{n:'Composer',c:'#E879F9',k:'c',d:'Runs only on /aidlc compose: scores five kinds of uncertainty and proposes a tailored plan.'},
};
const AG_ORDER=['PRD','DSN','DLV','PLR','CMP','ARC','ARV','DEV','QA','DSO','PIP','AWS','OPS','CPS'];

const PHASES=[
  {n:'Initialization',k:'INIT',c:'#8E9BB8'},
  {n:'Ideation',k:'IDEATION',c:'#FF4FD8'},
  {n:'Inception',k:'INCEPTION',c:'#38E1FF'},
  {n:'Construction',k:'CONSTRUCTION',c:'#8CFF6B'},
  {n:'Operation',k:'OPERATION',c:'#FFB547'},
];

const SENSORS=['claim-sources','linter','required-sections','traceability','type-check','upstream-coverage'];
const SENSOR_INFO={
  'claim-sources':'Intent Capture only. At the gate: every claim carries a source tag that resolves to a confirmed source or answer.',
  'linter':'Wraps the project linter (eslint by default). Fires when TypeScript or JavaScript is written.',
  'required-sections':'At the gate: the stage output contains every required H2 heading.',
  'traceability':'At the gate: traceability.json covers every upstream element and has no orphans.',
  'type-check':'Wraps the project type-checker (tsc by default). Fires when TypeScript is written.',
  'upstream-coverage':'At the gate: the deliverables reference every upstream artifact the stage requires.',
};

const ALL=['0.1','0.2','0.3','1.1','1.2','1.3','1.4','1.5','1.6','1.7','2.1','2.2','2.3','2.4','2.5','2.6','2.7','2.8','2.9','3.1','3.2','3.3','3.4','3.5','3.6','3.7','4.1','4.2','4.3','4.4','4.5','4.6','4.7'];
const PROFILES={
  /* All 11 shipped scopes. Stage lists come from each stage's `scopes:` frontmatter and the switches from
     core/scopes/aidlc-<name>.md (awslabs/aidlc-workflows 2.11.4). rcap: the scope's review cap ('stage' = each stage's own class). */
  feature:{n:"Feature",cnt:33,play:true,cmd:'/aidlc feature',tag:"Full lifecycle for new features, practical depth",d:"Every phase and stage, with sensors, reviewers and plan approval. Each stage runs with its lead agent.",st:ALL,time:'~30 min',col:'var(--cyan)',rec:true,
    depth:'Standard',skeleton:true,review:true,rcap:'stage',guard:'off',sensors:true,learnings:true,summary:true,planApproval:true,collab:false},
  enterprise:{n:"Enterprise",cnt:33,play:true,cmd:'/aidlc enterprise',tag:"Regulated enterprise feature, full audit trail",d:"The full lifecycle at Comprehensive depth, with Guard Policy strict and collaborators on: support agents join every stage, so the office gets busy. Score ×1.3.",st:ALL,time:'~30 min',col:'var(--mag)',mult:1.3,strict:true,
    depth:'Comprehensive',skeleton:true,review:true,rcap:'stage',guard:'strict',sensors:true,learnings:true,summary:true,planApproval:true,collab:true},
  workshop:{n:"Workshop",cnt:26,play:true,cmd:'/aidlc workshop',tag:"Facilitated group session with mandatory gates",d:"Everything except Ideation, for a group working through it together. Reviews are capped at advisory.",st:['0.1', '0.2', '0.3', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7'],time:'~25 min',col:'var(--violet)',
    depth:'Standard',skeleton:true,review:true,rcap:'advisory',guard:'off',sensors:true,learnings:true,summary:true,planApproval:true,collab:false},
  mvp:{n:"MVP",cnt:23,play:true,cmd:'/aidlc mvp',tag:"Skip operations, ship the core",d:"A trimmed Ideation, then all of Inception and Construction. Nothing in Operation: no deploy pipeline, no alarms, no runbooks.",st:['0.1', '0.2', '0.3', '1.1', '1.3', '1.4', '1.6', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7'],time:'~20 min',col:'var(--amber)',
    depth:'Standard',skeleton:true,review:true,rcap:'stage',guard:'off',sensors:true,learnings:true,summary:true,planApproval:true,collab:false},
  classic:{n:"Classic",cnt:18,play:true,cmd:'/aidlc classic',tag:"V1-style ceremony through Inception and Construction - the implicit default",d:"The v1 shape: all of Inception and Construction, no Ideation, and it stops at Build and Test. No walking skeleton.",st:['0.1', '0.2', '0.3', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6'],time:'~15 min',col:'#7DD3FC',
    depth:'Standard',skeleton:false,review:true,rcap:'advisory',guard:'off',sensors:true,learnings:true,summary:false,planApproval:true,collab:false},
  infra:{n:"Infra",cnt:15,play:true,cmd:'/aidlc infra',tag:"Infrastructure changes",d:"Practices, requirements, the NFR and infrastructure design stages, then build, CI and a full deploy with observability. No code scan.",st:['0.1', '0.2', '0.3', '2.2', '2.3', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '4.1', '4.2', '4.3', '4.4'],time:'~15 min',col:'#FFB547',
    depth:'Standard',skeleton:true,review:true,rcap:'stage',guard:'off',sensors:true,learnings:true,summary:true,planApproval:true,collab:false},
  express:{n:"Express",cnt:10,play:true,cmd:'/aidlc express',tag:"Lightest run: requirements to deploy, no design pass, no reviewers",d:"The shortest path to production. No reviewers, no sensors, no plan approval, no design pass. The lead agent works alone.",st:['0.1', '0.2', '0.3', '2.1', '2.3', '3.5', '3.6', '4.1', '4.3', '4.4'],time:'~10 min',col:'var(--lime)',
    depth:'Minimal',skeleton:false,review:false,rcap:'none',guard:'off',sensors:false,learnings:false,summary:false,planApproval:false,collab:false},
  refactor:{n:"Refactor",cnt:10,play:true,cmd:'/aidlc refactor',tag:"Clean up existing code",d:"The bugfix path plus Functional Design, so behaviour is pinned down before the code moves.",st:['0.1', '0.2', '0.3', '2.1', '2.3', '3.1', '3.5', '3.6', '4.1', '4.3'],time:'~10 min',col:'#2EE6C5',
    depth:'Minimal',skeleton:false,review:true,rcap:'stage',guard:'off',sensors:true,learnings:true,summary:true,planApproval:true,collab:false},
  "security-patch":{n:"Security patch",cnt:10,play:true,cmd:'/aidlc security-patch',tag:"CVE response",d:"The bugfix path plus NFR Requirements, so the security requirement is written down before the patch.",st:['0.1', '0.2', '0.3', '2.1', '2.3', '3.2', '3.5', '3.6', '4.1', '4.3'],time:'~10 min',col:'var(--red)',
    depth:'Minimal',skeleton:false,review:true,rcap:'stage',guard:'off',sensors:true,learnings:true,summary:true,planApproval:true,collab:false},
  bugfix:{n:"Bugfix",cnt:9,play:true,cmd:'/aidlc bugfix',tag:"Fix a specific bug",d:"Understand the code, say what fixed means, change it, test it, ship it. Reviews are capped at advisory.",st:['0.1', '0.2', '0.3', '2.1', '2.3', '3.5', '3.6', '4.1', '4.3'],time:'~10 min',col:'#FF9F5A',
    depth:'Minimal',skeleton:false,review:true,rcap:'advisory',guard:'off',sensors:true,learnings:false,summary:false,planApproval:true,collab:false},
  poc:{n:"PoC",cnt:8,play:true,cmd:'/aidlc poc',tag:"Prove feasibility fast",d:"Intent, a code scan, requirements, then code and tests. No design, no plan approval, and it never deploys.",st:['0.1', '0.2', '0.3', '1.1', '2.1', '2.3', '3.5', '3.6'],time:'~5 min',col:'#F5D061',
    depth:'Minimal',skeleton:true,review:true,rcap:'advisory',guard:'off',sensors:true,learnings:true,summary:true,planApproval:false,collab:false},
};


/* ---------- tiny doc helpers ---------- */
const dv=id=>S.dec[id];
const H=t=>`<h4>${t}</h4>`, P=t=>`<p>${t}</p>`, L=a=>`<ul>${a.filter(Boolean).map(x=>`<li>${x}</li>`).join('')}</ul>`;
const T=(hd,rows)=>`<table><tr>${hd.map(x=>`<th>${x}</th>`).join('')}</tr>${rows.filter(Boolean).map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</table>`;
const PRE=t=>`<pre>${t}</pre>`, SRC=t=>`<span class="c">(source: ${t})</span>`, TAG=t=>`<span class="c">[${t}]</span>`;
const pk=(id,arr,dflt)=>{const v=dv(id);if(v===undefined&&dflt===undefined&&window.__pkLog)window.__pkLog.add(id);   // tools/playtest.mjs watches for silent fallbacks
  return arr[v===undefined?(dflt===undefined?0:dflt):v]};
/* A decision made in a stage this scope skipped has no value: say so instead of showing the best answer. */
const pkd=(id,arr,none)=>dv(id)===undefined?`<span class="wa">${none||'not decided: that stage is not in this scope'}</span>`:arr[dv(id)];
/* The three Initialization steps read the same in every scenario, apart from the request, the record folder and the workspace line. */
const initStages=(REC,o)=>({
 '0.1':{files:[{p:REC+'project-description.json',opt:1,b:()=>PRE(`<span class="s">"${o.ask}"</span>`)+P('Your request, stored as one JSON string exactly as you typed it.')}],
  pre:[['SYS',`<code>WORKSPACE_SCAFFOLDED</code>: record dir <code>intents/${REC.split('/').slice(-2,-1)[0]}/</code> created`]]},
 '0.2':{files:[],pre:[['SYS',`<code>WORKSPACE_SCANNED</code>: ${o.ws}`]]},
 '0.3':{files:[{p:REC+'aidlc-state.md',opt:1,b:()=>H('Workflow state')+T(['Field','Value'],[['Intent',o.intent],['Scope',S.prof],['Workspace','brownfield'],['Current stage',S.cur||'—'],['Depth',scope().depth],['Guard Policy',scope().guard],['Collaborators',scope().collab?'on':'off'],['Sensors',scope().sensors?'on':'off'],['Plan approval',scope().planApproval?'on':'off'],['Walking skeleton',scope().skeleton?'on':'off']])},
        {p:REC+'audit/devbox-a1f3.md',opt:1,b:()=>P('Append-only audit shard for this clone. '+TXT.auditWhere)}],
  pre:[['SYS','<code>WORKSPACE_INITIALISED</code> · <code>WORKFLOW_STARTED</code>']]},
});
/*__SCENARIOS__*/

/* ---------- stages ---------- */
const STAGES=[
/* ===== 0 INITIALIZATION ===== */
{id:'0.1',ph:0,n:'Workspace Scaffold',lead:'CND',pat:'Engine',hrs:0.05,auto:true,
 what:'Creates the intent record tree and the space knowledge folder.',why:'Every artifact, decision and audit event needs a home before work starts.'},
{id:'0.2',ph:0,n:'Workspace Detection',lead:'CND',pat:'Engine',hrs:0.05,auto:true,
 what:'Classifies the workspace and detects the stack.',why:'A brownfield repo means Reverse Engineering is needed before anyone designs.'},
{id:'0.3',ph:0,n:'State Initialization',lead:'CND',pat:'Engine',hrs:0.05,auto:true,
 what:'Populates workflow state and routing, and opens the audit shard.',why:'State plus audit means the workflow can resume and be reconstructed exactly.'},

/* ===== 1 IDEATION ===== */
{id:'1.1',ph:1,n:'Intent Capture & Framing',lead:'PRD',col:[],rev:'PLR',pat:'Solo',own:'po',hrs:2,alt:['DLV','CPS'],
 what:'Turns the raw request into a framed intent with a measurable outcome and a stakeholder map.',why:'If the intent is vague, every later stage builds the wrong thing quickly.'},

{id:'1.2',ph:1,n:'Market Research',lead:'PRD',col:[],pat:'Solo',own:'po',hrs:3,alt:['ARC','DLV'],cond:1,
 what:'Analyzes competitors and the build-vs-buy decision.',why:'Avoid building something you could buy, and avoid buying something that sits on your critical path.'},

{id:'1.3',ph:1,n:'Feasibility & Constraints',lead:'ARC',col:['CMP'],pat:'Solo + support',own:'sec',hrs:3,alt:['CMP','DSO'],cond:1,
 what:'Tests technical, legal and operational feasibility, and records constraints and RAID.',why:'Some intents fail on law or physics. It is cheaper to find out now.'},

{id:'1.4',ph:1,n:'Scope Definition',lead:'PRD',col:[],rev:'PLR',pat:'Solo',own:'po',hrs:2,alt:['DLV','ARC'],
 what:'Draws the in and out lines, and parks the rest in the intent backlog.',why:'Scope is the cheapest place to save weeks.'},

{id:'1.5',ph:1,n:'Team Formation',lead:'DLV',col:[],pat:'Solo',own:'pm',hrs:1,alt:['PRD','OPS'],cond:1,
 what:'Assesses the skills the intent needs and composes the mob.',why:'AI agents do the work, but humans own the decisions, so the right humans must be in the room.'},

{id:'1.6',ph:1,n:'Rough Mockups',lead:'DSN',col:[],pat:'Solo',own:'po',hrs:2,alt:['PRD','DEV'],cond:1,
 what:'Low-fidelity wireframes and user flows.',why:'Seeing the response early catches privacy and usability problems before any code exists.'},

{id:'1.7',ph:1,n:'Approval & Handoff',lead:'DLV',col:[],rev:'PLR',pat:'Solo',own:'pm',hrs:1,alt:['PRD','PLR'],
 what:'Packages Ideation into an initiative brief and decision log, then hands off to Inception.',why:'This is the formal go/no-go. It also writes the Ideation phase check.'},

/* ===== 2 INCEPTION ===== */
{id:'2.1',ph:2,n:'Reverse Engineering',lead:'DEV',col:['ARC'],pat:'Pipeline',own:'eng',hrs:3,alt:['ARC','QA'],
 what:'Scans the existing codebase into a 9-file knowledge base (codekb) at space level.',why:'Agents must understand the code as it is before they change it. The codekb is shared with every future intent.'},

{id:'2.2',ph:2,n:'Practices Discovery',lead:'PIP',col:['QA','DEV','DSO'],pat:'Hub & spoke',own:'eng',hrs:2,alt:['DEV','DLV'],cond:1,
 what:'The lead drafts the team\'s practices from the repo, support agents inspect that draft (mutually blind), then the humans are interviewed. Approving the stage promotes the result to team memory.',why:'Agents should follow how this team actually works, not generic best practice.'},

{id:'2.3',ph:2,n:'Requirements Analysis',lead:'PRD',col:[],rev:'PLR',pat:'Solo',own:'po',hrs:3,alt:['ARC','QA'],
 what:'Functional and non-functional requirements, with traceability back to the intent.',why:'Requirements are the contract every later stage is checked against.'},

{id:'2.4',ph:2,n:'User Stories',lead:'PRD',own:'po',hrs:2,alt:['DSN','QA'],
 what:'Personas and stories with acceptance criteria. As a mob the lead drafts, support agents write contributions in parallel without seeing each other, and the lead integrates.',why:'Stories make the requirements testable from the user\'s side.'},

{id:'2.5',ph:2,n:'Refined Mockups',lead:'DSN',col:[],pat:'Solo',own:'po',hrs:2,alt:['PRD','DEV'],cond:1,
 what:'High-fidelity mockups, interaction spec and an accessibility checklist.',why:'People act on the exact words and states they see, so the copy and semantics must be exact.'},

{id:'2.6',ph:2,n:'Domain Design',lead:'ARC',col:[],rev:'ARV',pat:'Solo',own:'eng',hrs:3,alt:['DEV','AWS'],cond:1,
 what:'Components and architecture decisions (ADRs) for the new domain.',why:'This is where hot paths and data shapes are decided, and they are expensive to change later.'},

{id:'2.7',ph:2,n:'Units Generation',lead:'ARC',col:[],pat:'Solo',own:'eng',hrs:2,alt:['DLV','DEV'],
 what:'Splits the work into units of work with a dependency graph (DAG) and a story map.',why:'Units are what Construction builds, verifies and can run in parallel.'},

{id:'2.8',ph:2,n:'Contract Design',lead:'ARC',col:[],rev:'ARV',pat:'Solo',own:'eng',hrs:2,alt:['DEV','PRD'],cond:1,
 what:'Inter-unit and public API contracts.',why:'Other teams and customers integrate against contracts, so contracts outlive code.'},

{id:'2.9',ph:2,n:'Delivery Planning',lead:'DLV',col:[],pat:'Solo',own:'pm',hrs:1,alt:['ARC','PIP'],
 what:'Bolt plan, team allocation and sequencing. Writes the Inception phase check.',why:'Decides how Construction will run: serial or swarm.'},

/* ===== 3 CONSTRUCTION ===== */
{id:'3.1',ph:3,n:'Functional Design',lead:'ARC',col:[],rev:'ARV',pat:'Solo',own:'eng',hrs:3,alt:['DEV','PRD'],
 what:'Entities, business rules and functional spec for each unit.',why:'Code generation follows this spec closely, so ambiguities here become bugs.'},

{id:'3.2',ph:3,n:'NFR Requirements',lead:'ARC',col:['DSO'],pat:'Solo + support',own:'sec',hrs:2,alt:['DSO','QA'],cond:1,
 what:'Security, performance and observability requirements per unit.',why:'This sets the SLO, and therefore the error budget you will defend in production.'},

{id:'3.3',ph:3,n:'NFR Design',lead:'ARC',col:[],rev:'ARV',pat:'Solo',own:'eng',hrs:2,alt:['DEV','AWS'],cond:1,
 what:'Turns NFR targets into design patterns: resilience, security and performance.',why:'This is where "what if the store is slow?" gets an answer.'},

{id:'3.4',ph:3,n:'Infrastructure Design',lead:'AWS',col:[],pat:'Solo',own:'ops',hrs:2,alt:['ARC','PIP'],cond:1,
 what:'Infrastructure specification, monitoring design and CI/CD pipeline design.',why:'Capacity and topology are decided here, not on the day the traffic arrives.'},

{id:'3.5',ph:3,n:'Code Generation',lead:'DEV',col:[],rev:'ARV',pat:'Solo',own:'eng',hrs:6,alt:['QA','ARC'],build:1,
 what:'Each Unit gets a code plan you approve, then code, then a verified Unit checkpoint. Code goes to the repo; the summary goes to the record.',why:'This is where the design becomes software. Checkpoints keep humans in control of what gets merged.'},

{id:'3.6',ph:3,n:'Build and Test',lead:'QA',col:[],pat:'Solo',own:'eng',hrs:2,alt:['DEV','PIP'],
 what:'Builds everything and runs unit, integration and contract tests after all units are done.',why:'This is the evidence that the units work together.'},

{id:'3.7',ph:3,n:'CI Pipeline',lead:'PIP',col:[],pat:'Solo',own:'sec',hrs:1,alt:['DSO','QA'],cond:1,
 what:'CI configuration and quality gates. Writes the Construction phase check.',why:'Keeps the guardrails running after the agents stop.'},

/* ===== 4 OPERATION ===== */
{id:'4.1',ph:4,n:'Deployment Pipeline',lead:'PIP',col:[],pat:'Solo',own:'ops',hrs:1,alt:['AWS','OPS'],cond:1,
 what:'CD configuration, deployment strategy and rollback runbook.',why:'How you deploy determines how fast you can undo a deploy.'},

{id:'4.2',ph:4,n:'Environment Provisioning',lead:'AWS',col:[],pat:'Solo',own:'ops',hrs:1,alt:['PIP','DSO'],cond:1,
 what:'Provisions environments from the infrastructure design and validates them.',why:'Environments are verified against the spec, not assumed.'},

{id:'4.3',ph:4,n:'Deployment Execution',lead:'PIP',col:[],pat:'Solo',own:'ops',hrs:1,alt:['OPS','AWS'],canary:1,cond:1,
 what:'Runs the deployment, smoke tests and health checks.',why:'Deploying is a stage with evidence, not just a button.'},

{id:'4.4',ph:4,n:'Observability Setup',lead:'OPS',col:[],pat:'Solo',own:'ops',hrs:1,alt:['AWS','QA'],cond:1,
 what:'Dashboards, alarms and SLO configuration.',why:'You can\'t defend an error budget you can\'t see.'},

{id:'4.5',ph:4,n:'Incident Response',lead:'OPS',col:[],pat:'Solo',own:'ops',hrs:1,alt:['DLV','PIP'],cond:1,
 what:'Runbooks, incident plan and escalation matrix.',why:'Decide how to respond to an incident before it happens.'},

{id:'4.6',ph:4,n:'Performance Validation',lead:'QA',col:[],pat:'Solo',own:'eng',hrs:3,alt:['OPS','AWS'],cond:1,
 what:'Load tests against the NFRs and fills in the NFR validation matrix.',why:'This is the last chance to find the weak spot before production traffic does.'},

{id:'4.7',ph:4,n:'Feedback & Optimization',lead:'OPS',col:[],pat:'Solo',own:'po',hrs:1,alt:['PRD','DLV'],cond:1,
 what:'SLO report, cost analysis and the feedback loop into the next intent.',why:'AI-DLC is a cycle: production evidence becomes the next intent.'},
];
/* Generated from awslabs/aidlc-workflows stage frontmatter (core/aidlc-common/stages/**), commit 8c4f79b, release 2.11.4.
   id: [slug, mode, lead, declared support agents, reviewer, review class, conditional?, imported sensors] */
const UPSTREAM={
 '0.1':["workspace-scaffold","inline","CND",[],null,null,0,[]],
 '0.2':["workspace-detection","inline","CND",[],null,null,0,[]],
 '0.3':["state-init","inline","CND",[],null,null,0,[]],
 '1.1':["intent-capture","inline","PRD",["ARC"],"PLR","advisory",0,["claim-sources","required-sections","upstream-coverage"]],
 '1.2':["market-research","inline","PRD",[],null,null,1,["required-sections","upstream-coverage"]],
 '1.3':["feasibility","inline","ARC",["AWS","CMP"],null,null,1,["required-sections","upstream-coverage"]],
 '1.4':["scope-definition","inline","PRD",["DLV"],null,null,0,["required-sections","upstream-coverage"]],
 '1.5':["team-formation","inline","DLV",[],null,null,1,["required-sections","upstream-coverage"]],
 '1.6':["rough-mockups","inline","DSN",["PRD"],"PLR","advisory",1,["required-sections","upstream-coverage"]],
 '1.7':["approval-handoff","inline","DLV",["PRD"],null,null,0,["required-sections","upstream-coverage"]],
 '2.1':["reverse-engineering","pipeline","DEV",["ARC"],null,null,1,["required-sections","upstream-coverage"]],
 '2.2':["practices-discovery","subagent","PIP",["QA","DEV","DSO"],null,null,1,["required-sections","upstream-coverage"]],
 '2.3':["requirements-analysis","inline","PRD",[],"PLR","advisory",0,["required-sections","upstream-coverage"]],
 '2.4':["user-stories","mob","PRD",["DSN","DEV","QA"],"PLR","advisory",1,["required-sections","upstream-coverage","traceability"]],
 '2.5':["refined-mockups","inline","DSN",["PRD"],"PLR","advisory",1,["required-sections","upstream-coverage"]],
 '2.6':["domain-design","inline","ARC",["AWS","DSN"],"ARV","advisory",1,["required-sections","upstream-coverage","traceability"]],
 '2.7':["units-generation","inline","ARC",["DLV"],"ARV","advisory",0,["required-sections","upstream-coverage","traceability"]],
 '2.8':["contract-design","inline","ARC",["AWS"],"ARV","advisory",1,["required-sections","upstream-coverage"]],
 '2.9':["delivery-planning","inline","DLV",["ARC"],null,null,0,["required-sections","upstream-coverage"]],
 '3.1':["functional-design","inline","ARC",["DEV"],"ARV","adversarial",1,["required-sections","upstream-coverage","linter","type-check","traceability"]],
 '3.2':["nfr-requirements","inline","ARC",["DSO","CMP","QA"],"ARV","adversarial",1,["required-sections","upstream-coverage","linter","type-check","traceability"]],
 '3.3':["nfr-design","inline","ARC",["AWS"],"ARV","adversarial",1,["required-sections","upstream-coverage","linter","type-check","traceability"]],
 '3.4':["infrastructure-design","inline","AWS",["DSO","CMP"],"ARV","adversarial",1,["required-sections","upstream-coverage","linter","type-check","traceability"]],
 '3.5':["code-generation","subagent","DEV",[],"ARV","adversarial",0,["required-sections","traceability"]],
 '3.6':["build-and-test","inline","QA",["DSO"],null,null,0,["required-sections","upstream-coverage","type-check"]],
 '3.7':["ci-pipeline","inline","PIP",[],null,null,1,["required-sections","upstream-coverage","linter","type-check"]],
 '4.1':["deployment-pipeline","inline","PIP",[],null,null,1,["required-sections","upstream-coverage"]],
 '4.2':["environment-provisioning","inline","AWS",["DSO","CMP"],null,null,1,["required-sections","upstream-coverage"]],
 '4.3':["deployment-execution","inline","PIP",["DEV"],null,null,1,["required-sections","upstream-coverage"]],
 '4.4':["observability-setup","inline","OPS",[],null,null,1,["required-sections","upstream-coverage"]],
 '4.5':["incident-response","inline","OPS",[],null,null,1,["required-sections","upstream-coverage"]],
 '4.6':["performance-validation","inline","QA",[],null,null,1,["required-sections","upstream-coverage"]],
 '4.7':["feedback-optimization","inline","OPS",["AWS"],null,null,1,["required-sections","upstream-coverage"]],
};

STAGES.forEach(s=>{const u=UPSTREAM[s.id];if(u[2]!==s.lead)console.warn('lead mismatch',s.id);
  s.slug=u[0];s.mode=u[1];s.sup=u[3];s.rev=u[4]||undefined;s.rclass=u[5];s.cond=u[6]?1:undefined;s.sens=u[7];delete s.col;
  s.pat=s.auto?'Engine':s.id==='2.2'?'Hub & spoke':s.mode==='mob'?'Mob':s.mode==='pipeline'?'Pipeline':s.mode==='subagent'?'Subagent':'Inline'});
const ST={};STAGES.forEach(s=>ST[s.id]=s);
/* The entries above are method data. A scenario adds each stage's content: questions, artifacts, chat lines and findings. */
const SHELL=STAGES.map(s=>({...s}));
function useScenario(k){
  SCN=SCENARIOS[k]||SCENARIOS.velocity;DEC=SCN.DEC;REC=SCN.REC;KB=SCN.KB;U2=SCN.U2||'construction/unit/';
  STAGES.forEach((s,i)=>{for(const key of Object.keys(s))delete s[key];Object.assign(s,SHELL[i],SCN.stages[SHELL[i].id]||{})});
  return SCN;
}
/* What actually takes part depends on the scope's switches. */
const scope=()=>PROFILES[S.prof]||PROFILES.feature;
const stageCols=st=>scope().collab?(st.sup||[]):[];
const stageRev=st=>scope().review?(st.rev||null):null;
const stageSens=st=>scope().sensors?(st.sens||[]):[];
const stageRclass=st=>scope().rcap==='advisory'?'advisory':st.rclass;   // bugfix, poc, classic and workshop cap every review at advisory
const stagePat=st=>st.build&&S.dec['2.9.exec']===1?'Swarm':(!scope().collab&&['Hub & spoke','Mob','Pipeline'].includes(st.pat))?(st.mode==='inline'?'Inline':'Subagent'):st.pat;
const active=(st,k)=>k===st.lead||k===stageRev(st)||stageCols(st).includes(k);
const zeroUnit=()=>!S.plan||!S.plan.includes('2.7');
const fixPath=p=>zeroUnit()?p.replace(U2,'construction/'):p;

const unitList=()=>SCN.units();

const BADGES=[
 {id:'stamp',ic:'🛡️',n:'No Rubber Stamps',d:'Read every key artifact before approving your gates.'},
 {id:'disp',ic:'🎯',n:'Dispatcher',d:'Predict 80%+ of lead agents.'},
 {id:'sensor',ic:'📡',n:'Sensor Whisperer',d:'Resolve a sensor failure that needs a human, at one of your own gates.',can:()=>scope().sensors&&S.plan.includes(SCN.humanSensor)},
 {id:'loop',ic:'🔁',n:'Loop Closer',d:'Feed production learning into the next intent.',can:()=>S.plan.includes('4.7')},
 {id:'ic',ic:'🚨',n:'Incident Commander',d:'Hold the SLO with 50%+ error budget left.'},
 {id:'mem',ic:'🧠',n:'Memory Keeper',d:'Promote a practice to team memory, or keep a learning for next time.',can:()=>S.plan.includes('2.2')||scope().learnings},
 {id:'outcome',ic:'📈',n:'Outcome over Output',d:'End with an outcome-based success measure.',can:()=>!!SCN.outcome&&S.plan.includes('1.1')},
 {id:'swarm',ic:'🐝',n:'Swarm Lord',d:'Run Construction as a swarm, verified by a real end-to-end command.',can:()=>S.plan.includes('2.9')&&S.plan.includes('3.5')},
 {id:'editor',ic:'✍️',n:'Editor, Not Author',d:'Request changes at 3 or more gates.'},
];
/* Badges this run can earn: the general ones the plan allows, plus the scenario's own. */
const badgeList=()=>BADGES.filter(b=>!b.can||b.can()).concat(SCN.badge?[{id:'sig',...SCN.badge}]:[]);

/* ================= ENGINE ================= */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const CANCEL=Symbol('cancel');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const LET='ABCDEFG';
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
const fname=p=>p.split('/').pop();
const RM=matchMedia('(prefers-reduced-motion: reduce)');
/* The page around the engine (the "shell") may set window.SKIN before this script runs, to take over the few places
   where the engine touches layout: tab(), files(), openFile(), reset(), net (a stand-in for the 3D office) and txt (wording). */
const SKIN=window.SKIN||{};
const TXT=Object.assign({
  predict:'Which agent leads this stage? Pick a card, press a number, or click the bot in the office.',
  pauseFiles:'What this stage wrote (the Artifacts tab keeps everything):',
  pauseOff:'Nothing moves until you continue. The ⏸ button in the top bar turns this pause off.',
  auditWhere:'See the Audit tab for the live view.'},SKIN.txt);
let PREFS={};try{PREFS=JSON.parse(localStorage.getItem('aidlc-v2-prefs')||'{}')}catch(e){}
const savePrefs=()=>{try{localStorage.setItem('aidlc-v2-prefs',JSON.stringify(PREFS))}catch(e){}};



let S={gen:0,speed:1,motion:true,files:{},dec:{},flags:{},ran:new Set()};
function freshState(role,prof,scen){
  return {role,prof,scen,score:0,possible:0,quality:70,risk:30,min:0,dec:{},files:{},ran:new Set(),flags:{},badges:new Set(),log:[],
    plan:PROFILES[prof].st.slice(),idx:0,cur:null,gen:S.gen+1,pred:{n:0,ok:0},own:{gates:0,clean:0},changeGates:0,fixed:0,ignored:[],loops:[],vg:{},boss:null,
    speed:PREFS.speed||1,motion:S.motion,auditN:0,done:new Set(),revs:{},mem:{team:[],project:[],practices:false,flag:false},unflagged:0,learnAsked:0};
}

/* ---------- waits (scaled by speed, skippable, cancellable) ---------- */
const skipFns=new Set();
function wait(ms){const g=S.gen;return new Promise((res,rej)=>{let done=false;const fin=()=>{if(done)return;done=true;clearTimeout(t);skipFns.delete(fin);g===S.gen?res():rej(CANCEL)};const t=setTimeout(fin,ms/(S.speed||1));skipFns.add(fin)})}
function skipWait(){[...skipFns].forEach(f=>f())}
function alive(g){if(g!==S.gen)throw CANCEL}

/* ---------- clock ---------- */
const clockStr=(m=S.min)=>{const d=Math.floor(m/540)+1,r=m%540,h=9+Math.floor(r/60),mi=Math.floor(r%60);return `D${d} ${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`};
function tick(hours){S.min+=Math.round(hours*60);renderMeters()}

/* ---------- scoring ---------- */
function pts(n,why,poss){
  if(poss)S.possible+=poss;
  if(!n){if(why)S.log.push({n:0,why,st:S.cur});return}
  S.score+=n;S.log.push({n,why,st:S.cur});
  toast(`<b class="${n>0?'p':'m'}">${n>0?'+':''}${n}</b> ${why}`,n>0?'':'bad');
  floater((n>0?'+':'')+n,n>0?'var(--good)':'var(--bad)');
  renderMeters('score');
}
function adj(q=0,r=0){if(!q&&!r)return;S.quality=clamp(S.quality+q,0,100);S.risk=clamp(S.risk+r,0,100);renderMeters()}
function trace(){if(!S.plan)return 0;const done=S.done.size,tot=S.plan.length;return clamp(Math.round(100*done/tot)-5*S.ignored.length-(SCN.traceGap&&SCN.traceGap()?5:0),0,100)}

/* ---------- toasts ---------- */
function toast(html,cls='',sub){const t=el('div','toast '+cls,html+(sub?`<span class="co">${sub}</span>`:''));$('#toasts').appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),320)},3600);while($('#toasts').children.length>4)$('#toasts').firstChild.remove()}
let lastPtr={x:innerWidth/2,y:innerHeight/2};
addEventListener('pointerdown',e=>{lastPtr={x:e.clientX,y:e.clientY}},true);
function floater(txt,color){if(!S.motion)return;const f=el('div','floater',txt);f.style.left=(lastPtr.x-10)+'px';f.style.top=(lastPtr.y-24)+'px';f.style.color=color;document.body.appendChild(f);setTimeout(()=>f.remove(),1300)}

/* ---------- meters / track ---------- */
function renderMeters(bump){
  const m=$('#meters');if(!m)return;
  const bar=(v,c)=>`<div class="bar"><i style="width:${v}%;--c:${c}"></i></div>`;
  m.innerHTML=`<div class="mt score${bump==='score'?' bump':''}"><span class="k">Score</span><b>${S.score}</b></div>
  <div class="mt"><span class="k">Quality</span><b>${S.quality}</b>${bar(S.quality,'var(--good)')}</div>
  <div class="mt"><span class="k">Risk</span><b style="color:${S.risk>60?'var(--bad)':S.risk>40?'var(--warn)':'var(--ink)'}">${S.risk}</b>${bar(S.risk,'var(--bad)')}</div>
  <div class="mt"><span class="k">Trace</span><b>${trace()}%</b>${bar(trace(),'var(--accent)')}</div>
  <div class="mt"><span class="k">Clock</span><b style="font-size:14px">${clockStr()}</b></div>
  <div class="mt"><span class="k">Badges</span><b>${S.badges.size}<small style="font-size:11px;color:var(--muted)">/10</small></b></div>`;
}
function renderTrack(){
  const t=$('#track');let h='';
  for(let p=0;p<5;p++){
    const ids=ALL.filter(i=>ST[i].ph===p);const cur=S.cur&&ST[S.cur].ph===p;
    h+=`<div class="ph${cur?' cur':''}" style="--pc:${PHASES[p].c}"><div class="pn"><i></i>${PHASES[p].n}</div><div class="pips">`;
    ids.forEach(i=>{const inP=S.plan.includes(i);const cls=S.cur===i?'now':S.done.has(i)?'done':inP?'in':'skip';
      h+=`<span class="pip ${cls}${S.loops.some(l=>l.to===i)?' loop':''}" title="${i} ${ST[i].n}${inP?'':' (not in this profile)'}">${i.split('.')[1]}</span>`});
    h+='</div></div>';
    if(p>=1&&p<4)h+=`<div class="vg ${S.vg[p]||''}" title="Phase check: ${PHASES[p].n} → ${PHASES[p+1].n}${S.vg[p]?'':' (written by the stage that ends the phase)'}"></div>`;
  }
  const n=S.plan.indexOf(S.cur)+1;
  h+=`<div class="trackmeta"><span class="k">${PROFILES[S.prof].n} scope</span><b>${n>0?`Stage ${n}/${S.plan.length}`:'—'}</b></div>`;
  t.innerHTML=h;
}

/* ---------- audit + ticker ---------- */
const EVC=e=>/FAILED|REJECTED|BREACH|JUMPED/.test(e)?'var(--bad)':/GATE_APPROVED|PASSED|VERIFIED|COMPLETED/.test(e)?'var(--good)':/QUESTION|HUMAN|DECISION|PLAN_APPROVAL|CHECKPOINT/.test(e)?'var(--role)':/SENSOR|REVIEW/.test(e)?'var(--warn)':/SWARM|WORKTREE|BOLT|UNIT/.test(e)?'var(--lime)':'var(--accent)';
function audit(e,d=''){
  S.auditN++;
  const a=$('#audit');if(!a)return;
  const r=el('div','ev',`<span class="t">${clockStr()}</span><span><span class="e" style="--ec:${EVC(e)}">${e}</span> <span class="d">${d}</span></span>`);
  a.appendChild(r);if(a.children.length>400)a.firstChild.remove();a.scrollTop=a.scrollHeight;
  const tk=$('#ticker');const s=el('span',null,`<b>${e}</b> ${d.replace(/<[^>]+>/g,'').slice(0,60)}`);tk.prepend(s);while(tk.children.length>8)tk.lastChild.remove();
}

/* ---------- comms ---------- */
function who(w){
  if(w==='SYS'||w==='CND')return{av:w==='SYS'?'⚙':'◎',nm:w==='SYS'?'AI-DLC engine':'Conductor',c:'var(--muted)',sys:w==='SYS'};
  if(w[0]==='@'){const p=PEOPLE[w.slice(1)];return{av:p.ini,nm:`${p.n} · ${p.t}${w.slice(1)===S.role?' (you)':''}`,c:`var(--${w.slice(1)})`,h:1}}
  const a=AGENTS[w];return{av:w,nm:`${a.n}${a.k==='r'?' (reviewer)':a.k==='s'?' (support)':' agent'}`,c:a.c};
}
async function say(w,text,opt={}){
  const f=$('#feed'),i=who(w);
  if(!i.sys&&!i.h&&S.motion){const ty=el('div','typing','<i></i><i></i><i></i>');f.appendChild(ty);f.scrollTop=f.scrollHeight;NET.pulse(w);
    try{await wait(Math.min(1100,280+text.length*7))}finally{ty.remove()}}
  const m=el('div','msg'+(i.sys?' sys':'')+(opt.ask?' ask':'')+(w==='@'+S.role?' me':''),`<div class="av${i.h?' h':''}" style="--ac:${i.c}">${i.av}</div><div class="bd"><span class="nm" style="--ac:${i.c}">${i.nm}</span><div class="tx">${text}</div></div>`);
  m.style.setProperty('--ac',i.c);
  f.appendChild(m);while(f.children.length>160)f.firstChild.remove();f.scrollTop=f.scrollHeight;
  if(!i.sys)NET.speak(w,text);
  if(!i.sys&&!i.h){NET.pulse(w);if(opt.to!==false)NET.packet(w,opt.to||'CND');AUD.blip(520+Math.random()*240,.05)}
  if(i.h){AUD.blip(380,.06,'triangle');NET.pulse(w)}
  await wait(opt.after??260);
}
/* A line spoken by an agent that is not taking part in this scope is either dropped (support chatter) or voiced by the lead. */
const speaker=(st,k)=>(!AGENTS[k]||active(st,k))?k:(st.sup||[]).includes(k)?null:st.lead;

/* ---------- team memory (the rules chain: org → team → project → phase → stage) ---------- */
function writeMemory(stId){
  const M=S.mem;
  addFile({p:MEM+'team.md',opt:1,st:stId,b:()=>H('Team practices')+(M.practices?T(['Section','Practice'],[['Way of Working','Trunk-based, short-lived branches; PRs need 1 approval + green CI'],['Walking Skeleton','On: the first Unit is the smallest working slice'],['Testing Posture','vitest; coverage target 80%'],['Deployment',M.flag?'<b>New endpoints ship behind a feature flag (AppConfig)</b>':'CDK pipeline, dev → staging → prod'],['Code Style','TypeScript strict; eslint + tsc in CI']]):P('No practices promoted yet.'))+(M.team.length?H('Learned')+L(M.team):'')},stId);
  addFile({p:MEM+'project.md',opt:1,st:stId,b:()=>H('Mandated')+L([M.practices?'ALWAYS make infrastructure changes through CDK':null,M.flag?'<b>ALWAYS ship a new endpoint behind a feature flag</b>':null].concat(M.project))+H('Forbidden')+L([M.practices?'NEVER log personal data':null])},stId);
}
async function learnPrompt(st,f){
  S.learnAsked++;
  await say(st.lead,`You asked me to ${f.ch.charAt(0).toLowerCase()+f.ch.slice(1)}. Keep that for next time?`,{to:false,ask:true});
  setTurn('me',S.role,'The learning loop: decide whether this correction becomes a standing rule.');
  const c=card('mine flash',`<div class="ck"><span>Learning · keep that for next time?</span><span class="mono">+5</span></div><div class="q">Should agents apply this on future work without being told?</div><span class="hint">A kept learning is written to the rules files agents read at the start of every stage.</span><div class="opts"><button class="opt" type="button" data-v="project"><b>A</b><span>Yes, for this project</span></button><button class="opt" type="button" data-v="team"><b>B</b><span>Yes, for the team</span></button><button class="opt" type="button" data-v=""><b>C</b><span>No, it was a one-off</span></button></div>`);
  const bs=[...c.querySelectorAll('.opt')];const v=await new Promise(res=>{ACTIVE={opts:bs};bs.forEach(b=>b.onclick=()=>res(b.dataset.v))});ACTIVE=null;
  bs.forEach(b=>{b.disabled=true;b.classList.add(b.dataset.v===v?'picked':'dim')});c.classList.remove('flash');
  if(v){S.mem[v].push(f.ch);S.flags.learned=true;writeMemory(st.id);audit('RULE_LEARNED',`${f.ch} → memory/${v}.md`);pts(5,'Kept a learning for next time',5);
    c.appendChild(el('div','finding ok',`<span class="fh">Rule learned</span>Written to <code>memory/${v}.md</code>. Every agent reads it from now on.`))}
  else pts(0,'',5);
  await wait(350);
}

/* ---------- files ---------- */
function addFile(f,stId){
  f={...f,p:fixPath(f.p)};
  const ex=S.files[f.p];
  if(ex){ex.rev++;ex.upd=true;if(f.b)ex.b=f.b;audit('ARTIFACT_UPDATED',`${fname(f.p)} → rev ${ex.rev}`);renderTree();if(S.viewing===f.p)openFile(f.p,true);return}
  S.files[f.p]={...f,st:stId||f.st||S.cur,rev:1,seen:false,isNew:true,ord:Object.keys(S.files).length};
  audit('ARTIFACT_CREATED',f.p.startsWith(REC)?fname(f.p):f.p.replace('aidlc/spaces/identity/',''));
  const cs=ST[S.cur],lead=cs?.lead;NET.packet(lead&&lead!=='CND'?lead:'CND','VAULT');NET.vaultHit(PHASES[cs?cs.ph:0].c);
  renderTree();
}
function reviseFiles(stId){Object.values(S.files).filter(f=>f.st===stId&&!f.opt).forEach(f=>{f.rev++;f.upd=true;audit('ARTIFACT_UPDATED',`${fname(f.p)} → rev ${f.rev}`)});renderTree();if(S.viewing&&S.files[S.viewing]?.st===stId)openFile(S.viewing,true)}
function dirLabel(p){let d=p.slice(0,p.lastIndexOf('/')+1);if(d.startsWith(REC))return'…/'+REC.split('/').slice(-2,-1)[0]+'/'+d.slice(REC.length);return d.replace('aidlc/spaces/identity/','aidlc/spaces/identity/')}
function renderTree(){
  if(SKIN.files){SKIN.files();return}
  const tr=$('#tree');if(!tr)return;
  const fs=Object.values(S.files).sort((a,b)=>a.ord-b.ord);const groups={};
  fs.forEach(f=>{const d=dirLabel(f.p);(groups[d]=groups[d]||[]).push(f)});
  let h='';Object.keys(groups).forEach(d=>{h+=`<div class="dir">${d}</div>`;groups[d].forEach(f=>{h+=`<button type="button" data-p="${f.p}" aria-current="${S.viewing===f.p}">${!f.seen&&!f.opt?'<span class="ud" title="unread"></span>':''}${fname(f.p)}${f.isNew&&!f.seen?' <span class="nw">NEW</span>':''}${f.rev>1?` <span class="doc"><span class="rev">rev ${f.rev}</span></span>`:''}</button>`})});
  tr.innerHTML=h||'<div class="dir">No artifacts yet.</div>';
  const n=fs.filter(f=>!f.seen&&!f.opt).length;const b=$('#fileN');b.hidden=!n;b.textContent=n;
}
function openFile(p,keepTab){
  const f=S.files[p];if(!f)return;
  f.seen=true;f.isNew=false;S.viewing=p;
  if(SKIN.openFile)SKIN.openFile(f,keepTab);
  else{if(!keepTab)tab('files');$('#viewer').innerHTML=`<div class="vp">${p}${f.rev>1?` · <span class="wa">rev ${f.rev}</span>`:''}</div><div class="doc">${f.b()}</div>`}
  renderTree();
  $$(`.fl[data-p="${CSS.escape(p)}"]`).forEach(b=>b.classList.add('seen'));
  AUD.blip(880,.03);
}

/* ---------- tabs ---------- */
function tab(n){if(SKIN.tab){SKIN.tab(n);return}['comms','files','audit','intel'].forEach(k=>{$('#t-'+k).setAttribute('aria-selected',k===n);$('#p-'+k).hidden=k!==n})}

/* ---------- console ---------- */
let ACTIVE=null; // {opts:[], approve, request}
function con(){return $('#con')}
function card(cls,html){const c=el('div','card '+(cls||''),html);con().appendChild(c);scrollCon(c);return c}
function scrollCon(c){requestAnimationFrame(()=>c.scrollIntoView({behavior:S.motion?'smooth':'auto',block:'nearest'}))}
function setTurn(kind,role,text){
  let t=$('#turn');if(!t){t=el('div','turn');t.id='turn';con().prepend(t)}
  const c=role?`var(--${role})`:'var(--accent)';t.style.setProperty('--tc',c);t.classList.toggle('me',kind==='me');
  const lbl=kind==='me'?'Your turn':kind==='team'?`${PEOPLE[role].n}'s turn`:kind==='agents'?'Agents working':kind==='engine'?'Engine':'Standby';
  t.innerHTML=`<span class="who">${lbl}</span><span class="tt">${text}</span>`;
}
const STEPS=['Lead','Work','Decide','Write','Sense','Review','Gate'];
function stepsCard(st){
  const c=card('',`<div class="ck"><span>Stage loop · ${st.id}</span><span>${PHASES[st.ph].n}</span></div><div class="steps" id="steps">${STEPS.map((s,i)=>`<div class="stp" data-i="${i}"><i></i>${s}</div>`).join('')}</div>`);
  if(!st.dec||!st.dec.length)if(!st.build)c.querySelector('[data-i="2"]').classList.add('skipd');
  return c;
}
function setStep(i,label){$$('#steps .stp').forEach(s=>{const k=+s.dataset.i;if(s.classList.contains('skipd'))return;s.classList.toggle('done',k<i);s.classList.toggle('now',k===i)});if(label){const s=$(`#steps .stp[data-i="${i}"]`);if(s)s.lastChild.textContent=label}}
/* After a teammate's gate the workflow holds until the player continues, so there is time to open what was just approved.
   Your own gate needs no pause (nothing moves until you approve), and the engine steps have no gate. */
let PAUSE=null;   // releases the pending pause, if there is one
const pausing=()=>PREFS.pause!==false;
function stagePause(st){
  const g=S.gen,p=PEOPLE[st.own],nx=S.plan[S.idx+1],files=Object.values(S.files).filter(f=>f.st===st.id);
  S.pauses=(S.pauses||0)+1;
  setTurn('me',S.role,`${p.n} approved. Open anything you want to read, then continue. <kbd>Enter</kbd>`);
  const c=card('mine',`<div class="ck"><span>Stage complete · ${st.id}</span><span class="owner" style="--oc:var(--${st.own})">${p.n} approved</span></div>
    <div class="q">${st.n} is done. Take a look before the team moves on.</div>
    ${files.length?`<span class="hint">${TXT.pauseFiles}</span><div class="unread">${files.map(f=>`<button class="fl${f.seen?' seen':''}" type="button" data-p="${f.p}">${fname(f.p)}${f.rev>1?' r'+f.rev:''}</button>`).join('')}</div>`:''}
    <div class="btns"><button class="btn primary" type="button" data-a="cont">Continue${nx?` to ${nx} ${ST[nx].n}`:''} → <kbd>Enter</kbd></button></div>
    <span class="hint">${TXT.pauseOff}</span>`);
  c.querySelectorAll('.fl').forEach(b=>b.onclick=()=>openFile(b.dataset.p));
  return new Promise((res,rej)=>{
    const b=c.querySelector('[data-a="cont"]');
    const go=()=>{if(PAUSE!==go)return;PAUSE=null;ACTIVE=null;b.disabled=true;b.onclick=null;if(g!==S.gen){rej(CANCEL);return}AUD.blip(660,.04);res()};
    PAUSE=go;ACTIVE={cont:b};b.onclick=go;
  });
}
function applyPause(v){PREFS.pause=v;$('#pauseBtn').setAttribute('aria-pressed',v);if(!v&&PAUSE)PAUSE()}
function skipBtn(){const b=el('button','btn small','Skip wait ⏭ <kbd>Space</kbd>');b.type='button';b.onclick=skipWait;return b}

/* ---------- stage card & intel ---------- */
const PAT={'Inline':'The conductor loads the lead agent\'s persona and runs the stage directly in the conversation. 29 of the 33 stages work this way.','Subagent':'The lead runs as a dispatched subagent with its own context.','Pipeline':'The lead and a support agent run in sequence, each consuming the previous output. Needs collaborators on.','Hub & spoke':'The lead drafts first. Support agents inspect that draft, mutually blind. Then the humans are interviewed and the lead integrates. Needs collaborators on.','Mob':'The lead drafts, support agents write contributions in parallel without seeing each other, and the lead integrates. Needs collaborators on.','Swarm':'Independent Units build side by side in git worktrees, after every plan is approved. The batch ends in one checkpoint.','Engine':'A deterministic engine step: no agent and no gate.'};
function chip(code,cls){if(code==='CND')return`<span class="tag">Engine</span>`;const a=AGENTS[code];return `<span class="tag" style="color:${a.c};border-color:${a.c}66">${cls?cls+' ':''}${a.n}</span>`}
function renderStageCard(st,known=true){
  const sc=$('#stagecard');sc.style.setProperty('--pc',PHASES[st.ph].c);
  const pat=stagePat(st),rv=known?stageRev(st):null,cols=known?stageCols(st):[];
  sc.innerHTML=`<div class="sid"><span class="tag ph">${PHASES[st.ph].n}</span><span class="tag">${st.id}</span>${pat?`<span class="tag pat">${pat}</span>`:''}${st.cond?'<span class="tag cond">conditional</span>':''}${st.auto?'<span class="tag">no gate</span>':''}</div>
  <h2>${st.n}</h2><p>${st.what}</p><p class="why">Why: ${st.why}</p>
  <div class="row">${!known?'<span class="tag">lead: ?</span>':st.lead!=='CND'?chip(st.lead,'lead'):''}${cols.map(c=>chip(c,'+')).join('')}${rv?chip(rv,'review'):''}${st.own?`<span class="tag" style="color:var(--${st.own});border-color:var(--${st.own})">gate: ${PEOPLE[st.own].n}${st.own===S.role?' (you)':''}</span>`:''}</div>
  ${!known?'':!st.auto&&st.sup&&st.sup.length&&!cols.length?`<p class="why">Declares ${st.sup.map(k=>AGENTS[k].n).join(', ')} as support, but collaborators are off in the ${scope().n} scope.</p>`:''}${known&&st.rev&&!rv?`<p class="why">${AGENTS[st.rev].n} would review this stage, but this scope runs with no reviewers.</p>`:''}`;
  NET.layout();
}
function renderIntel(){
  const st=ST[S.cur];const p=PEOPLE[S.role],sc=scope();
  const myGates=S.plan.filter(i=>ST[i].own===S.role);const myDec=Object.keys(DEC).filter(k=>DEC[k].own===S.role&&S.plan.includes(k.slice(0,3)));
  const h3=t=>`<h3 class="hint" style="font:600 10.5px var(--mono);letter-spacing:.14em;text-transform:uppercase">${t}</h3>`;
  const sw=(n,v)=>`<div><dt>${n}</dt><dd><b style="color:${v==='off'||v==='none'?'var(--warn)':'var(--good)'}">${v}</b></dd></div>`;
  $('#intel').innerHTML=`${st?`<section><div class="card"><div class="ck"><span>Now · ${st.id}</span><span>${PHASES[st.ph].n}</span></div><b>${st.n}</b><span class="hint">${st.what}</span><span class="hint"><b>Mode: ${stagePat(st)}</b>. ${PAT[stagePat(st)]||''}</span>${st.cond?'<span class="hint">Conditional: the scope or the project can skip this stage.</span>':''}${st.slug?`<span class="hint mono" style="font-size:11px">slug: ${st.slug}</span>`:''}</div></section>`:''}
  <section><div class="card"><div class="ck"><span>Your seat</span><span class="owner" style="--oc:var(--${S.role})">${p.t}</span></div><span class="hint">${p.brief}</span><span class="hint">In this scope you approve <b>${myGates.length}</b> gates (${myGates.join(', ')||'none'}) and answer up to <b>${myDec.length}</b> questions.</span></div></section>
  <section>${h3(`${sc.n} scope · ceremony`)}<dl>${sw('Depth',sc.depth)}${sw('Sensors',sc.sensors?'on':'off')}${sw('Reviewers',!sc.review?'none':sc.rcap==='advisory'?'advisory cap':'on')}${sw('Plan approval',sc.planApproval?'on':'off')}${sw('Walking skeleton',sc.skeleton?'on':'off')}${sw('Collaborators',sc.collab?'on':'off')}${sw('Learnings',sc.learnings?'on':'off')}${sw('Guard Policy',sc.guard)}</dl><p class="hint">A scope (the guide also calls it a workflow profile) is a stage list plus these switches. Fewer switches means faster, and fewer things checking the work.</p></section>
  <section>${h3('The six sensors')}<dl>${SENSORS.map(s=>`<div><dt class="mono" style="font-size:12px">${s}${st&&stageSens(st).includes(s)?' <span style="color:var(--good)">· this stage</span>':''}</dt><dd>${SENSOR_INFO[s]}</dd></div>`).join('')}</dl><p class="hint">Each stage imports only the sensors that apply to it. All six ship as advisory: they check evidence and structure, not whether a design is wise. That judgement is yours.</p></section>
  <section>${h3('Gate options')}<dl><div><dt>Approve · Continue to &lt;next&gt;</dt><dd>Advance the workflow.</dd></div><div><dt>Request Changes</dt><dd>The lead agent revises and the artifact gets a new revision. After 3 change requests a third option, <i>Accept as-is</i>, appears.</dd></div><div><dt>Approve, and add &lt;skipped stage&gt; next</dt><dd>In Ideation and Inception, pull a skipped stage back in when it turns out to matter.</dd></div><div><dt>“Approve, but let's stop there for today”</dt><dd>Not a button: a reply. It approves and parks the workflow; <code>/aidlc --resume</code> picks it up.</dd></div></dl></section>
  <section>${h3('14 agents')}<dl>${Object.entries(AGENTS).map(([k,a])=>`<div><dt><span class="mono" style="color:${a.c}">${k}</span> ${a.n}</dt><dd>${a.d}</dd></div>`).join('')}</dl></section>
  <p class="foot"><b>Simulator liberties.</b> Who approves each gate, and the score, are game rules: in AI-DLC every gate is simply a human approval. “Open risk” notes on stages without a reviewer are the game's way of surfacing a weak decision. The simulator follows one Unit through Construction; a real run walks every Unit and stops at each Unit checkpoint. Which scopes a scenario offers, how well each fits, and which skipped stage a gate offers to add are the game's choices: upstream's own stage files offer User Stories from Requirements Analysis, and Units Generation from Domain Design. The incident at the end is fiction.</p>`;
}

/* ---------- prediction ---------- */
async function predict(st){
  setStep(0);setTurn('me',S.role,TXT.predict);
  const opts=shuffle([st.lead,...st.alt]);
  const c=card('mine',`<div class="ck"><span>Who leads? · predict</span><span class="mono">+10</span></div><div class="q">Which agent leads <b>${st.n}</b>?</div><div class="apick">${opts.map((a,i)=>`<button class="ag" type="button" data-a="${a}" style="--ac:${AGENTS[a].c}"><span class="av">${a}</span><span>${AGENTS[a].n}<small>${AGENTS[a].d}</small></span><kbd style="margin-left:auto">${i+1}</kbd></button>`).join('')}</div>`);
  const btns=[...c.querySelectorAll('.ag')];
  const pick=await new Promise(res=>{ACTIVE={opts:btns};btns.forEach(b=>b.onclick=()=>res(b.dataset.a));NET.pick(opts,res)});
  ACTIVE=null;NET.pick(null);btns.forEach(b=>{b.disabled=true;b.onclick=null;if(b.dataset.a===st.lead)b.classList.add('right');else if(b.dataset.a===pick)b.classList.add('wrong')});
  S.pred.n++;
  if(pick===st.lead){S.pred.ok++;pts(10,'Correct lead prediction',10);AUD.chord([660,880],.08)}
  else{pts(0,'Missed lead prediction',10);AUD.buzz(.12);c.appendChild(el('p','hint',`It's <b>${AGENTS[st.lead].n}</b>. ${AGENTS[st.lead].d}${AGENTS[pick].k==='s'?` ${AGENTS[pick].n} only ever supports.`:AGENTS[pick].k==='r'?` ${AGENTS[pick].n} only ever reviews.`:''}`))}
  if(st.mode!=='inline')audit('SUBAGENT_DISPATCHED',`${st.lead} → ${st.slug}`);
  NET.packet('CND',st.lead,null,1.4);NET.roleMood(st.lead,'happy',1.2);
  stageCols(st).forEach((cl,i)=>setTimeout(()=>NET.packet('CND',cl),250+i*120));
  await wait(400);
}

/* ---------- decisions ---------- */
async function decide(id){
  const D=DEC[id];const own=D.own;const mine=own===S.role;const st=ST[S.cur];const by=st&&!active(st,D.by)?st.lead:D.by;
  audit('DECISION_RECORDED',`${id}: ${D.o.length} options shown to ${PEOPLE[own].n}`);
  NET.packet(by,'@'+own,null,1.1);NET.humanMood(own,'think');boardStatus(`QUESTION · ${PEOPLE[own].n.toUpperCase()}`,getComputedStyle(document.documentElement).getPropertyValue('--'+own).trim());
  await say(by,(mine?`<b>@${PEOPLE[own].n}</b> `:`@${PEOPLE[own].n} `)+D.q,{ask:mine,to:false,after:120});
  const order=shuffle(D.o.map((o,i)=>i));
  const c=card(mine?'mine flash':'',`<div class="ck"><span>Question · from ${AGENTS[by].n}</span><span class="owner" style="--oc:var(--${own})">${mine?'You':PEOPLE[own].n}</span></div><div class="q">${D.q}</div><span class="hint">${D.ctx}</span><div class="opts">${order.map((oi,k)=>`<button class="opt" type="button" data-i="${oi}"${mine?'':' disabled'}><b>${LET[k]}</b><span>${D.o[oi].t}</span></button>`).join('')}</div>`);
  const btns=[...c.querySelectorAll('.opt')];
  let pick;
  if(mine){
    setTurn('me',S.role,'A question needs your answer. Press 1–'+btns.length+' or click.');
    AUD.chord([440,554,659],.07);
    pick=await new Promise(res=>{ACTIVE={opts:btns};btns.forEach(b=>b.onclick=()=>res(+b.dataset.i))});
    ACTIVE=null;
    audit('HUMAN_TURN',`${PEOPLE[own].n} answered ${id}`);
  }else{
    setTurn('team',own,`${PEOPLE[own].n} is answering ${AGENTS[by].n}'s question…`);
    const th=el('p','hint',`<span class="typing" style="display:inline-flex;padding:0 6px 0 0"><i></i><i></i><i></i></span>${PEOPLE[own].n} is thinking… `);th.appendChild(skipBtn());c.appendChild(th);
    await wait(1900);th.remove();
    pick=D.auto?D.auto():0;
  }
  S.dec[id]=pick;
  btns.forEach(b=>{b.disabled=true;b.onclick=null;b.classList.add(+b.dataset.i===pick?'picked':'dim')});
  const o=D.o[pick];
  NET.humanMood(own,'work');boardStatus('');
  await say('@'+own,o.t,{after:100});
  audit('QUESTION_ANSWERED',`${id}: ${LET[order.indexOf(pick)]}`);
  const best=Math.max(...D.o.map(x=>x.s));
  const f=el('div','finding'+(o.s>=best?' ok':''),`<span class="fh">${o.s>=best?'Strong call':o.s>=5?'Workable':'Consequence'}</span>${o.fb}`);
  if(o.s<5)f.style.setProperty('--fc','var(--bad)');
  c.appendChild(f);c.classList.remove('flash');scrollCon(c);
  if(mine){pts(o.s,`Decision ${id}`,best);adj(o.q||0,o.r||0)}
  else adj(o.q||0,o.r||0);
  await wait(mine?500:700);
}

/* ---------- sensors ---------- */
async function sensors(st){
  setStep(4);
  const list=stageSens(st);
  if(!list.length){
    card('',`<div class="ck"><span>Sensors</span><span>off in this scope</span></div><span class="hint">The ${scope().n} scope ships with sensors off. Nothing checks these artifacts before the gate.</span>`);
    const s=$('#steps .stp[data-i="4"]');s&&s.classList.add('skipd');await wait(350);return null}
  setTurn('agents',null,'Sensors are checking the artifacts.');
  let fail=st.sfail?st.sfail():null;if(fail&&!list.includes(fail.s))fail=null;
  const c=card('',`<div class="ck"><span>Sensors · ${list.length} of 6 imported by this stage</span><span>advisory</span></div><div class="sensors">${SENSORS.map(s=>`<span class="sn${list.includes(s)?'':' off'}" data-s="${s}" title="${SENSOR_INFO[s]}"><i></i>${s}</span>`).join('')}</div>`);
  for(const s of list){const i=SENSORS.indexOf(s),e=c.querySelector(`[data-s="${s}"]`);e.classList.add('run');NET.sensor(i,1);audit('SENSOR_FIRED',`${s} · ${st.slug}`);await wait(180);e.classList.remove('run');
    const f=fail&&fail.s===s;e.classList.add(f?'fail':'pass');NET.sensor(i,f?3:2);audit(f?'SENSOR_FAILED':'SENSOR_PASSED',f?`${s}: ${fail.src}`:s);if(f)AUD.buzz(.1);else AUD.blip(880+i*50,.02)}
  if(fail){
    const fd=el('div','finding',`<span class="fh">sensor · ${fail.s}</span>${fail.t}<span class="src">${fail.src}</span>`);fd.style.setProperty('--fc','var(--bad)');c.appendChild(fd);scrollCon(c);
    if(fail.auto){const a=speaker(st,fail.auto)||st.lead;await say(a,`Sensor <code>${fail.s}</code> failed: ${fail.t} Repairing.`);await wait(500);
      const e=c.querySelector(`[data-s="${fail.s}"]`);e.classList.replace('fail','pass');NET.sensor(SENSORS.indexOf(fail.s),2);fd.classList.add('ok');fd.querySelector('.fh').textContent='sensor · repaired by agent';
      await say(a,fail.fixmsg);audit('SENSOR_PASSED',`${fail.s} after repair`);return null}
    await say('SYS',`Sensor <code>${fail.s}</code> needs a human: ${fail.t}`);
    return {sensor:true,kind:'sensor',by:'SENSOR',t:fail.t,src:fail.src,key:fail.key,ch:fail.ch,s:fail.s,fixmsg:fail.fixmsg};
  }
  return null;
}

/* ---------- review ---------- */
/* Review findings come only from the stage's reviewer (when the scope runs reviewers) and from sensors.
   Stages with no reviewer surface a weak decision as an "open risk" in the lead's summary: a game liberty. */
function collectFindings(st){
  const rv=stageRev(st),out=[];let hidden=0;
  for(const f of (st.finds?st.finds():[])){
    if(st.rev){if(rv)out.push({...f,by:rv,kind:'review'});else hidden++}
    else out.push({...f,by:st.lead,kind:'risk'});
  }
  if(hidden){S.unflagged+=hidden;S.hidden=(S.hidden||[]).concat(st.id)}
  return out;
}
const fLabel=f=>f.kind==='sensor'?`sensor · ${f.s}`:f.kind==='risk'?`${AGENTS[f.by].n} · open risk`:`${AGENTS[f.by].n} · finding`;
async function review(st,fs){
  setStep(5);
  const rv=stageRev(st),rf=fs.filter(f=>f.kind==='review');
  setTurn('agents',null,rv?`${AGENTS[rv].n} is reviewing.`:'Collecting open risks.');
  if(rv){audit('REVIEW_REQUESTED',`${rv} on ${st.slug} · ${stageRclass(st)}`);NET.roleMood(rv,'review');const line=(st.post||[]).find(l=>l[0]===rv);await say(rv,line?line[1]:`Reviewing ${st.n.toLowerCase()}…`,{to:'GATE'})}
  const c=card('',`<div class="ck"><span>${rv?`Review · ${AGENTS[rv].n} · ${stageRclass(st)}${st.rclass!==stageRclass(st)?' (capped)':''}`:'Stage summary'}</span><span>${fs.length} item${fs.length===1?'':'s'}</span></div>`);
  if(!fs.length)c.appendChild(el('div','finding ok',`<span class="fh">${rv?'Verdict: READY':'No open risks'}</span>The artifacts match the intent, inputs and rubric.`));
  for(const f of fs){
    const d=el('div','finding',`<span class="fh">${fLabel(f)}</span>${f.t}<span class="src">↳ ${f.src}</span>`);c.appendChild(d);
    if(f.kind!=='sensor'){NET.pulse(f.by);await say(f.by,`${f.kind==='risk'?'Open risk':'Finding'}: ${f.t} <code>${f.src}</code>`,{to:'GATE',after:120})}
    scrollCon(c);
  }
  if(rv){audit('REVIEW_COMPLETED',`${rv} · ${rf.length?'NOT-READY':'READY'} · ${rf.length} finding${rf.length===1?'':'s'}`);
    if(rf.length)c.appendChild(el('p','hint',`Verdict: <b>NOT-READY</b>. ${stageRclass(st)==='adversarial'?'On Construction stages the review is adversarial: the builder re-runs on NOT-READY, up to two iterations. ':st.rclass==='adversarial'?`This stage's review is adversarial by default, but the ${scope().n} scope caps reviews at advisory: one pass, no re-run. `:''}A review never blocks the workflow: the human always has the final say at the gate.`))}
  await wait(300);
}

/* ---------- gates ---------- */
function nextName(){const n=S.plan[S.idx+1];return n?`${n} ${ST[n].n}`:'workflow completion'}
async function revise(st,f){
  const lead=st.lead;
  audit('GATE_REJECTED',`request changes: ${f.ch}`);audit('STAGE_REVISING',st.slug);
  await say(lead,`Revising: ${f.ch.charAt(0).toLowerCase()+f.ch.slice(1)}.`);
  NET.packet(lead,'VAULT');await wait(700);
  if(f.fix){S.dec[f.fix]=0;const o=DEC[f.fix].o[0];adj(o.q||0,0)}
  if(f.key)S.flags[f.key]=true;
  f.done=true;reviseFiles(st.id);
  await say(lead,f.fixmsg||'Done. Updated artifacts are ready for another look.');
  audit('STAGE_AWAITING_APPROVAL',st.slug);
}
/* A gate can pull a skipped stage back in ("Approve, and add <stage> next"). Each scenario says where that offer makes sense. */
const addable=st=>{const a=SCN.addStage;return a&&a.at===st.id&&!S.plan.includes(a.add)&&SCN.stages[a.add]?a:null};
function insertStage(id){const i=S.plan.findIndex((x,k)=>k>S.idx&&x>id);S.plan.splice(i<0?S.plan.length:i,0,id)}
async function gate(st,fs){
  setStep(6);NET.gate(1,st.own);audit('STAGE_AWAITING_APPROVAL',`${st.slug} → ${PEOPLE[st.own].n}`);
  boardStatus(`GATE · ${PEOPLE[st.own].n.toUpperCase()}`,getComputedStyle(document.documentElement).getPropertyValue('--'+st.own).trim());
  if(st.own===S.role)await playerGate(st,fs);else await teamGate(st,fs);
  NET.gate(2);boardStatus('APPROVED','#5BF08F');setTimeout(()=>{if(BOARD.status==='APPROVED')boardStatus('')},1600/(S.speed||1));
  if(st.onApprove)st.onApprove();
}
async function teamGate(st,fs){
  const p=PEOPLE[st.own];
  setTurn('team',st.own,`${p.n} is reviewing at the gate. You can open the artifacts too.`);
  const req=Object.values(S.files).filter(f=>f.st===st.id&&!f.opt);
  const c=card('',`<div class="ck"><span>Approval gate</span><span class="owner" style="--oc:var(--${st.own})">${p.n}</span></div><span class="hint">${p.n} is reading ${req.length} artifact${req.length===1?'':'s'} and ${fs.length} item${fs.length===1?'':'s'}…</span><div class="unread">${req.map(f=>`<button class="fl${f.seen?' seen':''}" type="button" data-p="${f.p}">${fname(f.p)}</button>`).join('')}</div>`);
  c.querySelectorAll('.fl').forEach(b=>b.onclick=()=>openFile(b.dataset.p));
  const sb=skipBtn();c.appendChild(sb);
  await wait(1500+req.length*300);sb.remove();
  c.querySelector('.hint').textContent=`${p.n} read ${req.length} artifact${req.length===1?'':'s'}${fs.length?` and raised ${fs.length} item${fs.length===1?'':'s'}`:''}.`;
  for(const f of fs){await say('@'+st.own,`Request Changes: ${f.ch}.`);await revise(st,f)}
  const add=addable(st);
  if(add){
    await say('CND',add.ask);
    setTurn('me',S.role,`${p.n} asks the team before approving.`);
    const q=card('mine flash',`<div class="ck"><span>${p.n} asks you</span><span class="owner" style="--oc:var(--${S.role})">You</span></div><div class="q">Should the gate add ${ST[add.add].n} (${add.add}) next?</div><div class="opts"><button class="opt" type="button" data-v="1"><b>A</b><span>Yes: approve, and add ${ST[add.add].n} next</span></button><button class="opt" type="button" data-v="0"><b>B</b><span>No: keep ${scope().n} lean</span></button></div>`);
    const bs=[...q.querySelectorAll('.opt')];const v=await new Promise(res=>{ACTIVE={opts:bs};bs.forEach(b=>b.onclick=()=>res(+b.dataset.v))});ACTIVE=null;
    bs.forEach(b=>{b.disabled=true;b.classList.add(+b.dataset.v===v?'picked':'dim')});
    pts(v?10:0,v?'Pulled a skipped stage back in':`Kept ${ST[add.add].n} skipped`,10);
    if(v){await say('@'+st.own,`Approve, and add ${ST[add.add].n} next`);insertStage(add.add);audit('GATE_APPROVED',`${st.slug} by ${p.n}`);audit('RECOMPOSED',`stages added: ${ST[add.add].slug}`);renderTrack();AUD.arp([523,659,784],.06);return}
  }
  await say('@'+st.own,`Approve · Continue to ${nextName()}`);
  audit('GATE_APPROVED',`${st.slug} by ${p.n}`);AUD.arp([523,659,784],.06);
  c.appendChild(el('div','finding ok',`<span class="fh">Approved by ${p.n}</span>${fs.length?`After ${fs.length} change request${fs.length>1?'s':''}. Teammates fix what is flagged rather than ignore it.`:'Clean gate.'}`));
  await wait(300);
}
async function playerGate(st,fs){
  const strict=PROFILES[S.prof].strict;
  S.own.gates++;
  const req=Object.values(S.files).filter(f=>f.st===st.id&&!f.opt);
  let revs=0,changed=false;
  const addA=addable(st),addId=addA?addA.add:null;
  setTurn('me',S.role,`Your gate. Read, then approve or request changes. <kbd>A</kbd> approve · <kbd>R</kbd> changes`);
  AUD.chord([392,494,587,740],.08);
  const c=card('mine',``);
  pts(0,'',15+fs.length*15);
  const render=()=>{
    const open=fs.filter(f=>!f.done);
    c.innerHTML=`<div class="ck"><span>Approval gate · ${st.id}</span><span class="owner" style="--oc:var(--${S.role})">You</span></div>
    <div class="q">Approve ${st.n}?</div>
    <span class="hint">Open the key artifacts${req.length?` (${req.length})`:''} before you approve. Sensors and reviewers inform your call; they don't replace it.</span>
    <div class="unread">${req.map(f=>`<button class="fl${f.seen?' seen':''}" type="button" data-p="${f.p}">${fname(f.p)}${f.rev>1?' r'+f.rev:''}</button>`).join('')}</div>
    ${open.length?`<div class="ck" style="margin-top:4px"><span>Still open · ${open.length}</span><span>${strict?'game rule: ignoring costs ×2':'fix = +15'}</span></div>`+open.map(f=>`<div class="finding"${f.sensor?' style="--fc:var(--bad)"':''}><span class="fh">${fLabel(f)}</span>${f.t}<span class="src">↳ ${f.src}</span></div>`).join('')+`<span class="hint">Approving now accepts ${open.length===1?'this':'these'} as risk. You can ask for a fix first.</span>`:''}
    <div class="ck"><span>Request Changes</span><span>${revs?`round ${revs}`:''}</span></div>
    <div class="row">${open.map(f=>`<button class="chip fix" type="button" data-f="${fs.indexOf(f)}">✎ ${f.ch}</button>`).join('')}<button class="chip" type="button" data-g="detail">✎ Add more detail</button><button class="chip" type="button" data-g="concise">✎ Make it more concise</button></div>
    <div class="btns">
      <button class="btn primary" type="button" data-a="approve">Approve · Continue to ${nextName()} <kbd>A</kbd></button>
      ${revs>=3?`<button class="btn" type="button" data-a="accept">Accept as-is<span class="sub">Offered after three change requests.</span></button>`:''}
      ${addId?`<button class="btn" type="button" data-a="add">Approve, and add ${ST[addId].n} next<span class="sub">${addA.sub}</span></button>`:''}
      <button class="btn small" type="button" data-a="park">Reply: “Approve, but let's stop there for today”</button>
    </div>`;
    c.querySelectorAll('.fl').forEach(b=>b.onclick=()=>openFile(b.dataset.p));
    ACTIVE={approve:c.querySelector('[data-a="approve"]'),request:c.querySelector('.chip')};
  };
  while(true){
    render();scrollCon(c);
    const act=await new Promise(res=>{c.querySelectorAll('[data-a],[data-f],[data-g]').forEach(b=>b.onclick=()=>res(b.dataset))});
    ACTIVE=null;
    if(act.f!==undefined){const f=fs[+act.f];changed=true;revs++;c.innerHTML='<span class="hint">Revising…</span>';await revise(st,f);
      if(f.sensor){pts(15,'Resolved a sensor failure');S.flags.sensorWhisper=true;badge('sensor')}else pts(15,f.kind==='risk'?'Closed an open risk':'Fixed a reviewer finding');S.fixed++;tick(.5);
      if(scope().learnings&&S.learnAsked<2&&!f.sensor)await learnPrompt(st,f);
      setTurn('me',S.role,`Your gate. Read, then approve or request changes. <kbd>A</kbd> approve · <kbd>R</kbd> changes`);continue}
    if(act.g){changed=true;revs++;c.innerHTML='<span class="hint">Revising…</span>';audit('GATE_REJECTED',act.g==='detail'?'request changes: more detail':'request changes: more concise');audit('STAGE_REVISING',st.slug);
      await say(st.lead,act.g==='detail'?'Adding detail and examples.':'Tightening the wording.');await wait(500);reviseFiles(st.id);tick(.3);audit('STAGE_AWAITING_APPROVAL',st.slug);
      if(revs===2)await say('SYS','Two change requests so far. After a third, <b>Accept as-is</b> is offered beside Approve and Request Changes.');continue}
    // approve paths
    const unread=req.filter(f=>!f.seen);
    if(unread.length){pts(-10,`Rubber stamp: ${unread.length} unread artifact${unread.length>1?'s':''}`);adj(-5,0);S.rubber=(S.rubber||0)+1}
    else{pts(15,'Read before approving');S.own.clean++}
    for(const f of fs.filter(f=>!f.done)){const k=strict?2:1;pts(-10*k,`Accepted as risk: ${f.ch.toLowerCase()}`);adj(0,10*k);S.ignored.push({st:st.id,f})}
    if(changed)S.changeGates++;
    audit('GATE_APPROVED',`${st.slug} by ${PEOPLE[S.role].n} (you)${act.a==='accept'?' · accept as-is':''}`);AUD.arp([523,659,784,1046],.07);
    if(act.a==='add'){insertStage(addId);audit('RECOMPOSED',`stages added: ${ST[addId].slug}`);toast(`<b class="z">+</b> ${ST[addId].n} added to the plan`,'meh');renderTrack()}
    if(act.a==='park')await park();
    break;
  }
  c.innerHTML=`<div class="ck"><span>Approval gate · ${st.id}</span><span class="owner" style="--oc:var(--${S.role})">You</span></div><div class="finding ok"><span class="fh">Approved</span>${fs.filter(f=>!f.done).length?`<span class="no">${fs.filter(f=>!f.done).length} item(s) accepted as risk.</span>`:'Everything flagged was addressed.'}</div>`;
}
async function park(){
  audit('WORKFLOW_PARKED','approve, and stop for today');
  await cine({k:'Workflow parked',h:'See you tomorrow',p:'State is in <code>aidlc-state.md</code>, and the audit shard records exactly where you stopped. <code>/aidlc --resume</code> picks up at the next stage.',c:'var(--violet)',ms:2200});
  S.min=(Math.floor(S.min/540)+1)*540;renderMeters();audit('WORKFLOW_UNPARKED','/aidlc --resume');
}

/* ---------- plan approval + unit checkpoints (Construction) ---------- */
async function planApproval(st){
  const units=unitList(),p=fixPath(st.files[0].p);
  if(!scope().planApproval){audit('PLAN_APPROVAL_SKIPPED','plan approval is off in this scope');await say('SYS',`Plan approval is <b>off</b> in the ${scope().n} scope: Code Generation starts from a plan nobody was asked to approve.`);return}
  const rec=by=>units.forEach(u=>audit('PLAN_APPROVAL_RECORDED',`${u.id} · by ${by}`));
  if(st.own!==S.role){await say('@'+st.own,`Code plan${units.length>1?'s':''} approved for ${units.length} Unit${units.length>1?'s':''}. Go ahead and build.`);rec(PEOPLE[st.own].n);return}
  setTurn('me',S.role,'No code is written until each Unit\'s plan is approved.');
  const c=card('mine',`<div class="ck"><span>Plan approval · ${units.length} Unit${units.length>1?'s':''}</span><span class="owner" style="--oc:var(--${S.role})">You</span></div><div class="q">Approve the code plan${units.length>1?'s':''}?</div><span class="hint">Each Unit has its own plan. They are shown together here, but every Unit gets its own approval receipt.</span><div class="unread"><button class="fl" type="button" data-p="${p}">${fname(p)}</button></div><div class="btns"><button class="btn primary" type="button">Approve plan${units.length>1?'s':''} <kbd>A</kbd></button></div>`);
  c.querySelector('.fl').onclick=()=>openFile(p);
  await new Promise(res=>{const b=c.querySelector('.btn');ACTIVE={approve:b};b.onclick=res});ACTIVE=null;
  if(S.files[p].seen)pts(5,'Read the plan before approving it',5);else{pts(-5,'Approved a plan without reading it',5)}
  c.querySelector('.btns').innerHTML=`<div class="finding ok"><span class="fh">${units.length} plan approval receipt${units.length>1?'s':''}</span>PLAN_APPROVAL_RECORDED</div>`;
  rec('you');
}
const verification=()=>SCN.verify?SCN.verify():{cmd:'make test',weak:false};
const verifyCmd=()=>verification().cmd;
async function unitCheckpoint(st,u){
  const {cmd,weak}=verification();
  audit('CHECKPOINT_VERIFICATION_RECORDED',`${u.id} · Verified with ${cmd} (exit 0)`);
  const note=weak?'<span class="wa">The authorized command only lints. Nothing ran end to end, so this receipt proves very little.</span>':'The slice ran end to end before any other Unit builds on it.';
  if(st.own!==S.role){await say('@'+st.own,`Unit checkpoint for ${u.id}: Approve. Then continue automatically.`)}
  else{
    setTurn('me',S.role,'Unit checkpoint: the engine ran the authorized verification command.');
    const c=card('mine',`<div class="ck"><span>Unit checkpoint · ${u.id}</span><span class="owner" style="--oc:var(--${S.role})">You</span></div><div class="q">Approve the walking skeleton?</div><div class="finding ok"><span class="fh">Receipt</span>Verified with <code>${cmd}</code> (exit 0)</div><span class="hint">${note} A checkpoint can only be approved with this receipt.</span><div class="btns"><button class="btn primary" type="button">Approve checkpoint <kbd>A</kbd></button></div>`);
    await new Promise(res=>{const b=c.querySelector('.btn');ACTIVE={approve:b};b.onclick=res});ACTIVE=null;
    c.querySelector('.btns').innerHTML='<div class="finding ok"><span class="fh">Checkpoint approved</span>The remaining Units continue automatically and stop only if verification fails.</div>';
  }
  audit('GATE_APPROVED',`unit checkpoint ${u.id} by ${PEOPLE[st.own].n}`);
}

/* ---------- construction build ---------- */
async function buildFlow(st){
  setStep(2,'Plan & build');
  addFile(st.files[0],st.id);await wait(300);
  await planApproval(st);
  const units=unitList();const skel=units.find(u=>u.id.startsWith('u0'));const rest=units.filter(u=>u!==skel);
  const swarm=S.dec['2.9.exec']===1&&!zeroUnit();
  setTurn('agents',null,'The Developer agent is generating code.');
  const c=card('',`<div class="ck"><span>Build · ${zeroUnit()?'no Units':swarm?'stage-major · swarm':'unit-major · serial'}</span><span>${zeroUnit()?'one codebase':units.length+' Units'}</span></div><div class="ubar"></div>`);
  const box=c.querySelector('.ubar');
  if(skel){await buildUnits([skel],box,false);await say('DEV',`Walking skeleton built: the smallest working slice${SCN.skel?`, <code>${SCN.skel}</code>`:''}. Running the authorized verification command.`);await unitCheckpoint(st,skel);setTurn('agents',null,'The Developer agent is generating code.')}
  if(swarm){
    const id8=Math.random().toString(16).slice(2,10);
    audit('SWARM_STARTED',`batch 1 · ${rest.length} Units`);await say('DEV',`Swarm batch: ${rest.length} independent Units, each in its own git worktree.`);
    rest.forEach(u=>{u.br=`bolt-${id8}_${u.id}`;audit('BOLT_STARTED',u.id);audit('WORKTREE_CREATED',u.br)});
    NET.swarm(rest.map(u=>u.id));
    await buildUnits(rest,box,true);
    rest.forEach(u=>{audit('BOLT_COMPLETED',u.id);audit('WORKTREE_MERGED',u.br)});NET.swarm([]);audit('SWARM_COMPLETED',`batch 1 · ${rest.length} converged · 0 failed`);
    await say('DEV',`Batch checkpoint: all ${rest.length} Units re-verified green with <code>${verifyCmd()}</code> and merged.`);
  }else await buildUnits(rest,box,false);
  setStep(3);
}
async function buildUnits(list,box,parallel){
  const rows={};list.forEach(u=>{const r=el('div','ub',`<div class="l"><span>${u.id}${u.br?` <span class="muted">· ${u.br.slice(0,14)}…</span>`:''}</span><span class="pc">queued</span></div><div class="t"><i style="width:0"></i></div>`);box.appendChild(r);rows[u.id]=r});
  const prog={};list.forEach(u=>prog[u.id]=0);
  let queue=list.slice();let active2=parallel?queue.splice(0):[queue.shift()];
  const start=u=>{audit('UNIT_STARTED',u.id);rows[u.id].querySelector('.pc').textContent='building'};
  active2.forEach(start);
  while(active2.length){
    await wait(110);
    for(const u of active2.slice()){
      prog[u.id]=Math.min(100,prog[u.id]+100/(u.files*1.3));
      const r=rows[u.id];r.querySelector('i').style.width=prog[u.id]+'%';r.querySelector('.pc').textContent=Math.round(prog[u.id])+'%';
      if(Math.random()<.25)NET.packet(parallel?'SAT:'+list.indexOf(u):'DEV','VAULT');
      const mb=SCN.midBuild;   // the agent stops mid-build to ask, rather than guess
      if(mb&&(zeroUnit()||u.id.startsWith(mb.unit))&&prog[u.id]>=40&&S.dec[mb.dec]===undefined){
        r.querySelector('.pc').textContent='paused · question';await decide(mb.dec);setTurn('agents',null,'The Developer agent is generating code.');
      }
      if(prog[u.id]>=100){active2.splice(active2.indexOf(u),1);r.classList.add('done');r.querySelector('.pc').textContent=`✓ ${u.tests} tests`;audit('UNIT_COMPLETED',u.id);
        if(!u.id.startsWith('u0')&&!zeroUnit())audit('CHECKPOINT_VERIFICATION_RECORDED',`${u.id} · Verified with ${verifyCmd()} (exit 0)`);
        if(!parallel&&queue.length){const n=queue.shift();active2.push(n);start(n)}}
    }
  }
}

/* ---------- canary (4.3) ---------- */
async function canary(){
  const s=S.dec['4.1.strategy']??0;const fri=S.dec['4.3.window']===1;
  setTurn('agents',null,'Deploying to production.');
  const steps=s===0?[5,25,100]:s===1?[100]:[100];
  const c=card('',`<div class="ck"><span>Deployment · ${['canary','blue/green','all-at-once'][s]}</span><span>${(SCN.deploy.when||['Tue 10:00','Fri 17:00'])[fri?1:0]}</span></div><div class="ubar"><div class="ub"><div class="l"><span>Traffic on ${SCN.deploy.what}</span><span class="pc">0%</span></div><div class="t"><i style="width:0"></i></div></div></div><div class="blog"></div>`);
  const lg=c.querySelector('.blog'),bar=c.querySelector('.t i'),pc=c.querySelector('.pc');
  const log=(t,cls)=>{lg.appendChild(el('div',cls,t));lg.scrollTop=lg.scrollHeight};
  if(fri)log(SCN.deploy.late||'17:02 · half the team has already logged off','y');
  for(const p of steps){bar.style.width=p+'%';pc.textContent=p+'%';NET.packet('PIP','ROOM:4');NET.noc({title:`DEPLOY · ${p}% of traffic on ${SCN.deploy.what}`});await say('PIP',`Traffic at <b>${p}%</b>. Running health checks.`,{after:100});
    await wait(700);log(`${p}% · health ✓ · p99 ${130+Math.round(Math.random()*15)} ms`,'g')}
  if(s===2)log(SCN.deploy.all,'y');
  NET.noc({});
}

/* ---------- jumps, loop-back and phase checks ---------- */
/* A backward jump is human-directed: /aidlc --stage <slug> reopens that stage and every later stage in the plan. */
async function jumpBack(from,to,why,hrs,fix){
  audit('STAGE_JUMPED',`backward · ${ST[from].slug} → ${ST[to].slug}`);S.loops.push({from,to,why});
  NET.loopback('ROOM:'+ST[from].ph,'ROOM:'+ST[to].ph,'backward jump');AUD.sweep();
  $('#cmdline').textContent=`/aidlc --stage ${ST[to].slug}`;
  await cine({k:'Backward jump',h:`/aidlc --stage ${ST[to].slug}`,p:why+` A backward jump reopens ${ST[to].n} and every later stage in the plan, so downstream artifacts are re-checked, not assumed valid. <b>Clock +${hrs}h</b>.`,c:'var(--mag)',ms:2800});
  audit('STAGE_REVISING',ST[to].slug);fix();tick(hrs);adj(-3,0);
  $('#cmdline').textContent='/aidlc';renderTrack();
}
/* The only loop-back the method defines: Build and Test → Code Generation, at most three times per intent. */
async function buildLoopBack({why,fixed}){
  S.loops.push({from:'3.6',to:'3.5',why});
  await say('QA',why);
  await say('SYS','Build and Test failed. Options: <b>Retry with fix</b> · Accept failure · Abort.');
  await say('@eng','Retry with fix.');
  audit('STAGE_JUMPED','loop-back 1 of 3 · build-and-test → code-generation');AUD.sweep();NET.pulse('DEV');NET.packet('QA','DEV',null,1.2);
  await cine({k:'Loop-back · 1 of 3',h:'Build and Test → Code Generation',p:'The one loop-back the method defines. The Developer agent fixes the code, and Build and Test runs again. <b>Clock +4h</b>.',c:'var(--mag)',ms:2400});
  tick(4);adj(-3,0);
  await say('QA',fixed);
}
const PHASE_END={'1.7':1,'2.9':2,'3.7':3};
/* The phase check runs once, inside the stage that ends the phase, before that stage is approved. */
async function phaseCheck(from){
  const checks=[];
  const ign=S.ignored.filter(x=>ST[x.st].ph===from).length;
  checks.push(...{1:[['Every scope item traces to the intent',1]],2:[['Every story maps to a Unit',1],['Every Unit sits in a bolt',1]],3:[['Every Unit built and verified',1],['Every FR has a passing test',1]]}[from]);
  if(SCN.phaseChecks)checks.push(...SCN.phaseChecks(from));
  checks.push([`Nothing accepted as risk in ${PHASES[from].n}`,!ign]);
  const ok=checks.every(c=>c[1]);S.vg[from]=ok?'ok':'warn';
  AUD.chord(ok?[523,784,1046]:[440,415],.08);
  await cine({k:`Phase check · ${PHASES[from].n}`,h:ok?'Traceability verified':'Check raised warnings',p:`Written to <code>verification/phase-check-${PHASES[from].n.toLowerCase()}.md</code> before this stage is approved.`,checks,c:ok?'var(--good)':'var(--warn)',ms:2600});
  renderTrack();
}
async function phaseBoundary(from,to){
  audit('PHASE_COMPLETED',PHASES[from].n);
  if(from>=1)audit('PHASE_VERIFIED',`${PHASES[from].n} → ${PHASES[to].n}${S.vg[from]?(S.vg[from]==='ok'?'':' (warnings)'):' (no phase check: this scope skips the stage that writes it)'}`);
  audit('PHASE_STARTED',PHASES[to].n);
  await cine({k:`Phase ${to} of 4`,h:PHASES[to].n,p:['','From a raw request to an approved, scoped initiative.','From the initiative to requirements, Units and a delivery plan.','Each Unit is designed, built and verified.','Ship it, watch it, and learn from production.'][to],c:PHASES[to].c,ms:1700});
}
let cineRes=null;
function cine({k,h,p,checks,c,ms}){
  const ov=$('#cine'),b=$('#cinebox');
  $('#banner').classList.remove('on');clearTimeout(bannerT);
  b.style.setProperty('--cc',c||'var(--accent)');
  b.innerHTML=`<div class="diamond"></div><span class="k">${k}</span><h2>${h}</h2>${p?`<p>${p}</p>`:''}${checks?`<div class="checks">${checks.map(x=>`<div class="${x[1]?'ok':'wa'}">${x[0]}</div>`).join('')}</div>`:''}`;
  ov.hidden=false;
  return wait(ms||2400).finally(()=>{ov.hidden=true});
}

/* ---------- stage runner ---------- */
const officeStage=st=>({id:st.id,n:st.n,ph:st.ph,lead:st.lead,col:stageCols(st),rev:stageRev(st),sens:st.auto?[]:stageSens(st).map(s=>SENSORS.indexOf(s))});
async function autoStage(st){
  setTurn('engine',null,`${st.id} ${st.n}: the engine runs it, with no agent and no gate.`);
  for(const l of st.pre||[])await say(l[0],l[1],{after:150});
  for(const f of st.files||[]){addFile(f,st.id);await wait(120)}
  await wait(350);
}
async function runStage(st){
  S.cur=st.id;S.ran.add(st.id);
  renderTrack();renderStageCard(st,!!st.auto);renderIntel();NET.setStage(st.auto?officeStage(st):{...officeStage(st),lead:null,col:[],rev:null,pending:true});
  $('#cmdline').textContent='/aidlc';
  audit('STAGE_STARTED',`${st.id} ${st.slug}`);
  banner(`Stage ${st.id} · ${PHASES[st.ph].n}`,st.n,st.auto?'Engine step · no gate':`Gate: <b style="--gc:var(--${st.own})">${PEOPLE[st.own].n}${st.own===S.role?' (you)':''}</b>`,PHASES[st.ph].c);
  if(st.auto){if(!con().querySelector('.stepsauto')){con().innerHTML='';card('stepsauto','<div class="ck"><span>Initialization</span><span>engine</span></div><span class="hint">Three deterministic steps in one tool call: no agents, no gates. They create the record, detect the workspace and initialise state.</span>')}
    await autoStage(st);S.done.add(st.id);tick(st.hrs);audit('STAGE_COMPLETED',st.slug);return}
  con().innerHTML='';setTurn('agents',null,'Stage starting…');stepsCard(st);
  await wait(600);
  await predict(st);
  renderStageCard(st,true);NET.setStage(officeStage(st));
  setStep(1);setTurn('agents',null,`${AGENTS[st.lead].n} is working.`);
  const pre=(!scope().collab&&st.preSolo)?st.preSolo:(st.pre||[]);
  for(const l of pre){const w=speaker(st,l[0]);if(!w)continue;await say(w,l[1],{to:w===st.lead?'CND':st.lead})}
  if(st.build)await buildFlow(st);
  else{
    if(st.dec&&st.dec.length){setStep(2);for(const id of st.dec)if(!DEC[id].when||DEC[id].when())await decide(id)}
    if(st.canary)await canary();
    if(st.run)await st.run(st);
    setStep(3);setTurn('agents',null,`${AGENTS[st.lead].n} is writing artifacts.`);
  }
  for(const l of (st.post||[]).filter(l=>l[0]!==st.rev)){const w=speaker(st,l[0])||st.lead;await say(w,l[1],{to:'VAULT'})}
  for(const f of st.files){if(!S.files[fixPath(f.p)]){addFile(f,st.id);await wait(140)}}
  const lb=st.id==='3.6'&&SCN.loopBack&&SCN.loopBack();if(lb)await buildLoopBack(lb);
  if(st.after)st.after();
  const sf=await sensors(st);
  const fs=collectFindings(st);if(sf)fs.unshift(sf);
  if(stageRev(st)||fs.length)await review(st,fs);else{const s=$('#steps .stp[data-i="5"]');s&&s.classList.add('skipd')}
  if(PHASE_END[st.id])await phaseCheck(PHASE_END[st.id]);
  await gate(st,fs);
  tick(st.hrs);S.done.add(st.id);audit('STAGE_COMPLETED',st.slug);renderTrack();renderMeters();
  if(st.own!==S.role&&pausing())await stagePause(st);else await wait(350);
}
let bannerT;
function banner(k,h,p,c){if(!$('#cine').hidden)return;const b=$('#banner');b.style.setProperty('--cc',c||'var(--accent)');b.innerHTML=`<div class="k">${k}</div><h3>${h}</h3><p>${p}</p>`;b.classList.add('on');clearTimeout(bannerT);bannerT=setTimeout(()=>b.classList.remove('on'),1900/(S.speed||1))}

/* ---------- mission ---------- */
async function runMission(){
  try{
    audit('WORKFLOW_STARTED',`scope ${S.prof} · ${S.plan.length} stages (${S.plan.length-3} after Initialization)`);
    while(S.idx<S.plan.length){
      const id=S.plan[S.idx];
      if(id==='4.7'&&!S.boss)await bossFight();
      await runStage(ST[id]);checkBadges();
      if(id==='4.7'){S.flags.loop=S.dec['4.7.next']===0;if(S.flags.loop){NET.feedback();await say('OPS','Feedback loop: production evidence becomes the next intent → <b>1.1 Intent Capture</b>.')}}
      const next=S.plan[S.idx+1];
      if(next&&ST[next].ph!==ST[id].ph)await phaseBoundary(ST[id].ph,ST[next].ph);
      S.idx++;
    }
    if(!S.boss)await bossFight();
    {const fit=SCN.fit[S.prof],c0=S.cur;S.cur=null;pts(fit.v==='best'?15:fit.v==='ok'?8:0,`Scope fit: ${scope().n} was ${fit.v==='best'?'the best fit':fit.v==='ok'?'workable':'a poor fit'} for this work`,15);S.cur=c0}
    audit('WORKFLOW_COMPLETED',`${S.prof} · ${S.done.size} stages`);
    showDebrief();
  }catch(e){if(e!==CANCEL){console.error(e);window.__err=e}}
}

/* =====================================================================
   AUDIO: tiny WebAudio synth (created on first gesture)
   ===================================================================== */
const AUD=(()=>{
  let ctx=null,master=null,amb=null,wantAmb=false,alarmI=null,on=PREFS.sound!==false;
  function init(){
    if(ctx)return;
    try{ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=on?.55:0;
      const comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination);if(wantAmb)ambient(true)}catch(e){ctx=null}
  }
  function tone(f,d,type='sine',vol=.12,when=0){
    if(!ctx||!on)return;if(ctx.state==='suspended')ctx.resume();
    const t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d+.06);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.1);
  }
  const blip=(f,d,type)=>tone(f,Math.max(.03,d),type||'sine',.09);
  const chord=(fs,d)=>fs.forEach((f,i)=>tone(f,.38,'triangle',.07,i*(d||0)*.25));
  const arp=(fs,d)=>fs.forEach((f,i)=>tone(f,.2,'triangle',.08,i*(d||.06)));
  const buzz=d=>{tone(110,d||.12,'sawtooth',.06);tone(117,d||.12,'sawtooth',.05)};
  function sweep(){if(!ctx||!on)return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(1400,t+.55);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.06,t+.1);g.gain.exponentialRampToValueAtTime(.0001,t+.6);o.connect(g);g.connect(master);o.start(t);o.stop(t+.65)}
  function ambient(v){
    wantAmb=v;if(!ctx)return;
    if(SKIN.music){SKIN.music(v,ctx,master);return}      // a skin may bring its own background music
    if(v&&!amb){
      const g=ctx.createGain();g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(.045,ctx.currentTime+4);
      const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=520;f.Q.value=3;
      const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.06;lg.gain.value=260;lfo.connect(lg);lg.connect(f.frequency);lfo.start();
      const os=[55,82.41,110,164.81,220].map((fr,i)=>{const o=ctx.createOscillator();o.type=i%2?'sawtooth':'triangle';o.frequency.value=fr;o.detune.value=(i-2)*7;o.connect(f);o.start();return o});
      f.connect(g);g.connect(master);amb={g,os,lfo,f};
    }else if(!v&&amb){const a=amb;amb=null;a.g.gain.cancelScheduledValues(ctx.currentTime);a.g.gain.setTargetAtTime(0,ctx.currentTime,.5);setTimeout(()=>{try{a.os.forEach(o=>o.stop());a.lfo.stop()}catch(e){}},2500)}
  }
  function mood(m){if(SKIN.music){if(ctx&&SKIN.musicMood)SKIN.musicMood(m,ctx);return}if(amb&&ctx)amb.f.frequency.setTargetAtTime(m==='boss'?1400:520,ctx.currentTime,1.2)}
  function alarm(v){clearInterval(alarmI);alarmI=null;if(v){const ring=()=>{tone(880,.16,'square',.035);tone(660,.16,'square',.035,.2)};ring();alarmI=setInterval(ring,1600)}}
  function toggle(){on=!on;PREFS.sound=on;savePrefs();init();if(master)master.gain.setTargetAtTime(on?.55:0,ctx.currentTime,.05);return on}
  return{init,blip,chord,arp,buzz,sweep,ambient,mood,alarm,toggle,get on(){return on}};
})();

/* =====================================================================
   NET: bridge to the 3D office (src/office). The engine talks to the office only through this object.
   If WebGL is unavailable the game still runs: every call becomes a no-op.
   ===================================================================== */
const NET=(()=>{
  const noop=()=>{};
  const names=['layout','colors','setMode','setStage','pulse','packet','sensor','gate','vaultHit','swarm','loopback','feedback','alert','celebrate','reset','dirty','speak','humanMood','roleMood','boss','cast','setCandidates','setHover','focus','noc','spot','tourReset'];
  const stub={start:noop,hit:()=>null,ok:false};names.forEach(n=>stub[n]=noop);
  let off=null;
  function glb(){const t=$('#glbdata').textContent.trim();const bin=atob(t);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer}
  function zone(){
    if(!$('#tour').hidden){const c=$('#tourcard').offsetHeight||220;return{x:0,y:0,w:innerWidth,h:Math.max(240,innerHeight-c-30)}}
    if($('#app').hidden){const t=$('#title');return !t.hidden&&t.classList.contains('attract')&&innerWidth>900?{x:innerWidth*.43,y:0,w:innerWidth*.57,h:innerHeight}:null}
    if(document.body.classList.contains('bossing')){const g=$('#boss .bgrid');if(g&&g.children.length>1){const a=g.children[0].getBoundingClientRect(),b=g.children[1].getBoundingClientRect();if(b.left-a.right>200)return{x:a.right,y:60,w:b.left-a.right,h:innerHeight-60}}return null}
    const z=$('#netzone').getBoundingClientRect(),sc=$('#stagecard').getBoundingClientRect();
    let top=z.top;if(sc.height&&z.bottom-sc.bottom>260)top=sc.bottom-20;
    return{x:z.left,y:top,w:z.width,h:z.bottom-top};
  }
  function board(){
    if(BOARD.tour)return{mode:'title',sub:'OFFICE TOUR  ·  '+BOARD.tour};
    if($('#app').hidden||!S.plan)return{mode:'title'};
    const st=ST[S.cur];
    return{mode:'game',color:st?PHASES[st.ph].c:'#38E1FF',kicker:st?`${PHASES[st.ph].n} · stage ${st.id} · ${PROFILES[S.prof].n} scope`:'Starting…',title:st?st.n:'AI-DLC',
      clock:clockStr(),score:S.score,status:BOARD.status,statusColor:BOARD.color,
      phases:PHASES.map((p,i)=>({n:p.n,c:p.c,pips:ALL.filter(id=>ST[id].ph===i).map(id=>S.cur===id?'now':S.done.has(id)?'done':S.plan.includes(id)?'in':'skip')}))};
  }
  function start(){
    if(SKIN.net){names.forEach(n=>{if(SKIN.net[n])api[n]=SKIN.net[n]});return}   // a shell without the 3D office shows the same events its own way
    if(!window.Office3D){console.warn('office bundle missing');return}
    try{
      off=window.Office3D.create({canvas:$('#net'),glb:glb(),agents:AGENTS,order:AG_ORDER,people:PEOPLE,roles:ROLE_ORDER,phases:PHASES,sensors:SENSORS,
        cssVar:k=>getComputedStyle(document.documentElement).getPropertyValue('--'+k).trim(),theme:()=>document.documentElement.dataset.theme,
        state:()=>({motion:S.motion,speed:S.speed||1,role:S.role}),zone,board,floorLabel:'AI-DRIVEN DEVELOPMENT LIFE CYCLE',
        onReady:()=>{document.body.classList.add('o3ready');bindZone()},onError:()=>{off=null;document.body.classList.add('o3fail')}});
      names.forEach(n=>api[n]=(...a)=>off&&off[n]?off[n](...a):undefined);
      api.ok=true;off.start();off.bindInput($('#netzone'));off.bindInput($('#tour'));
      addEventListener('scroll',()=>off&&off.layout(),true);
      if(window.ResizeObserver){const ro=new ResizeObserver(()=>off&&off.layout());ro.observe($('#netzone'));ro.observe($('#stagecard'))}
    }catch(e){console.warn('3D office unavailable, running without it:',e);off=null;document.body.classList.add('o3fail')}
  }
  /* hover tooltips + click-to-inspect / click-to-predict */
  const tip=el('div','nettip');tip.hidden=true;document.body.appendChild(tip);
  let picker=null;
  function tipFor(k){
    if(k==='CND')return`<b>Conductor</b><span>The <code>/aidlc</code> session itself: a thin forwarding loop. The deterministic Engine decides the next stage; the Conductor loads that stage's lead-agent persona (most stages run inline) or dispatches a subagent, then stops at the gate.</span>`;
    if(k==='VAULT')return`<b>aidlc/ record</b><span>${Object.keys(S.files||{}).length} artifacts in the intent record. Click to browse.</span>`;
    if(k==='GATE'){const i=off.info();return`<b>Approval gate</b><span>${i.gateS===1?`Waiting on ${PEOPLE[i.gateRole].n}.`:'Every stage after Initialization stops here for a human decision.'}</span>`}
    if(k.startsWith('SENS:')){const n=SENSORS[+k.slice(5)];return`<b class="mono">${n}</b><span>${SENSOR_INFO[n]}</span>`}
    if(k[0]==='@'){const p=PEOPLE[k.slice(1)];return`<b style="color:var(--${k.slice(1)})">${p.full}${k.slice(1)===S.role?' (you)':''}</b><span>${p.t}. ${p.brief}</span>`}
    const a=AGENTS[k],st=picker?null:ST[S.cur],r=st&&(st.lead===k?'lead':stageCols(st).includes(k)?'col':stageRev(st)===k?'rev':null);
    return`<b style="color:${a.c}">${k} · ${a.n}</b><span>${a.d}</span>${r?`<em>${r==='lead'?'Leading':r==='col'?'Supporting':'Reviewing'} ${st.id} ${st.n}</em>`:picker&&picker.keys.includes(k)?'<em>Click to predict this agent</em>':''}`;
  }
  function bindZone(){
    const z=$('#netzone');
    z.addEventListener('pointermove',e=>{if(!off||$('#app').hidden)return;const k=e.target.closest('.stagecard')?null:off.hit(e.clientX,e.clientY);off.setHover(k);
      z.style.cursor=k&&k!=='GATE'?'pointer':'grab';
      if(k){tip.innerHTML=tipFor(k);tip.hidden=false;const tw=Math.min(280,innerWidth-20);tip.style.left=clamp(e.clientX+14,8,innerWidth-tw-8)+'px';tip.style.top=clamp(e.clientY+14,8,innerHeight-120)+'px'}else tip.hidden=true});
    z.addEventListener('pointerleave',()=>{off&&off.setHover(null);tip.hidden=true});
    z.addEventListener('click',e=>{if(!off||e.target.closest('.stagecard')||performance.now()-off.dragged<250)return;const k=off.hit(e.clientX,e.clientY);if(!k)return;
      if(picker&&picker.keys.includes(k)){picker.cb(k);return}
      if(k==='VAULT')tab('files');else if(AGENTS[k]){tab('intel');const dt=[...$$('#intel dt')].find(d=>d.textContent.trim().startsWith(k+' '));if(dt)dt.scrollIntoView({block:'center',behavior:S.motion?'smooth':'auto'})}});
  }
  const api={...stub,start,get off(){return off},
    hit:(x,y)=>off?off.hit(x,y):null,
    pick(keys,cb){picker=keys?{keys,cb}:null;off&&off.setCandidates(keys||null);SKIN.net&&SKIN.net.pick&&SKIN.net.pick(keys||null,cb)},
  };
  return api;
})();
const BOARD={status:'',color:'',tour:''};
const boardStatus=(t,c)=>{BOARD.status=t||'';BOARD.color=c||'#FFB547'};

/*__NET_BRIDGE_END__*/
/* =====================================================================
   BADGES
   ===================================================================== */
function badge(id){
  if(!S.badges||S.badges.has(id))return;
  const b=badgeList().find(x=>x.id===id);if(!b)return;
  S.badges.add(id);toast(`${b.ic} <b>Badge unlocked: ${b.n}</b>`,'badge',b.d);AUD.arp([784,988,1175,1568],.06);renderMeters();
}
function checkBadges(final){
  const D=S.dec;
  if(SCN.outcome&&SCN.outcome())badge('outcome');
  if((S.mem&&S.mem.practices&&S.mem.flag)||S.flags.learned)badge('mem');
  if(SCN.badge&&SCN.badge.test())badge('sig');
  if(S.changeGates>=3)badge('editor');
  if(D['2.9.exec']===1&&D['2.9.verify']===0&&S.done.has('3.5'))badge('swarm');
  if(S.flags.loop)badge('loop');
  if(S.boss&&S.boss.won&&!S.boss.rolledBack&&S.boss.budget>=50)badge('ic');
  if(final){
    if(S.own.gates>0&&!S.rubber)badge('stamp');
    if(S.pred.n&&S.pred.ok/S.pred.n>=.8)badge('disp');
  }
}

/* =====================================================================
   TITLE SCREEN
   ===================================================================== */
const SCEN_ORDER=['velocity','product','bug','secpatch','refactor','infra'].filter(k=>SCENARIOS[k]);
const PICK={role:PEOPLE[PREFS.role]?PREFS.role:'po',scen:SCENARIOS[PREFS.scen]?PREFS.scen:SCEN_ORDER[0],prof:PREFS.prof};
function radioKeys(group,onPick){
  group.addEventListener('keydown',e=>{
    const items=[...group.querySelectorAll('[role="radio"]')];const i=items.indexOf(document.activeElement);if(i<0)return;
    let j=null;if(e.key==='ArrowRight'||e.key==='ArrowDown')j=(i+1)%items.length;else if(e.key==='ArrowLeft'||e.key==='ArrowUp')j=(i-1+items.length)%items.length;
    if(j!==null){e.preventDefault();e.stopPropagation();onPick(items[j].dataset.k)}
  });
}
/* How well a scope suits a scenario. The verdicts are the game's reading of each scope's upstream description. */
const FIT={best:['best fit','var(--good)'],ok:['workable','var(--cyan)'],poor:['poor fit','var(--warn)']};
const GRP={scen:'scens',prof:'profs',role:'roles'};
const bestKey=()=>`${PICK.scen}:${PICK.role}:${PICK.prof}`;
function pickTitle(grp,k){
  PICK[grp]=k;if(grp==='scen')PICK.prof=SCENARIOS[k].best;
  AUD.blip(grp==='role'?660:grp==='scen'?440:520,.04);renderTitle();
  const b=$(`#${GRP[grp]} [data-k="${k}"]`);if(b)b.focus({preventScroll:true});
}
let titleBound=false;
function renderTitle(){
  const sc=useScenario(PICK.scen);
  if(!sc.scopes.includes(PICK.prof))PICK.prof=sc.best;
  const plan=PROFILES[PICK.prof].st;
  const gatesOf=k=>plan.filter(id=>ST[id].own===k).length,qOf=k=>plan.reduce((n,id)=>n+(ST[id].dec||[]).filter(d=>DEC[d].own===k).length,0);
  const rad=(k,cur)=>`role="radio" data-k="${k}" aria-checked="${cur===k}" tabindex="${cur===k?0:-1}"`;
  $('#scens').innerHTML=SCEN_ORDER.map(k=>{const s=SCENARIOS[k];return`<button class="pc" type="button" ${rad(k,PICK.scen)} style="--pc:${s.col}">
    <span class="pt"><b>${s.n}</b><span class="cnt">${s.kind}</span></span>
    <small class="ptag">${s.tag}</small><small>${s.d}</small><small class="mono" style="font-size:11px">scopes that could run it: ${s.scopes.map(x=>PROFILES[x].n).join(' · ')}</small></button>`}).join('');
  $('#profs').innerHTML=sc.scopes.map(k=>{const p=PROFILES[k],f=sc.fit[k],[fl,fc]=FIT[f.v];return`<button class="pc" type="button" ${rad(k,PICK.prof)} style="--pc:${p.col}">
    <span class="pt"><b>${p.n} <span class="tag" style="font-size:9.5px;color:${fc};border-color:${fc}">${fl}</span></b><span class="cnt">${p.cnt} stages</span></span>
    <small class="ptag">${p.tag}</small><small>${f.t}</small><small class="mono sw">${[['sensors',p.sensors],[p.rcap==='advisory'?'reviewers (advisory cap)':'reviewers',p.review],['plan approval',p.planApproval],['skeleton',p.skeleton],['collaborators',p.collab]].map(([n,v])=>`<i class="${v?'y':'n'}">${v?'✓':'×'} ${n}</i>`).join('')}</small><span class="mini" aria-hidden="true">${ALL.map(id=>`<i class="${p.st.includes(id)?'on':''}"></i>`).join('')}</span><code>${p.cmd}</code><small class="mono" style="font-size:11px">${p.time}${p.mult>1?` · score ×${p.mult}`:''}</small></button>`}).join('');
  $('#otherprof').innerHTML=`<span>AI-DLC ships 11 scopes. These ${sc.scopes.length} could plausibly run <b>${sc.n}</b>; the verdict on each card is the game's reading of how well it fits. A poor fit is allowed: what the scope skips comes back later. Counts include the 3 Initialization steps.</span>`;
  $('#roles').innerHTML=ROLE_ORDER.map(k=>{const p=PEOPLE[k];return`<button class="rc" type="button" ${rad(k,PICK.role)} style="--rc:var(--${k})">
    <span class="ava">${p.ini}</span><span class="rt">${p.v1?'v1 team':'new in v2'}</span><b>${p.full}</b><small>${p.t}. ${p.brief}</small><small class="mono" style="font-size:11px;color:var(--dim)">${gatesOf(k)} gates · ${qOf(k)} questions in this run</small></button>`}).join('');
  for(const g in GRP)$$(`#${GRP[g]} [role="radio"]`).forEach(b=>b.onclick=()=>pickTitle(g,b.dataset.k));
  if(!titleBound){titleBound=true;for(const g in GRP)radioKeys($('#'+GRP[g]),k=>pickTitle(g,k))}
  document.body.dataset.role=PICK.role;
  const best=loadBest(),b=best[bestKey()]||(PICK.scen==='velocity'&&best[`${PICK.role}:${PICK.prof}`]);
  $('#startHint').innerHTML=`${sc.n} · ${PROFILES[PICK.prof].n} scope · ${PEOPLE[PICK.role].full} · ${PROFILES[PICK.prof].time}${b?` · your best: <b>${b.score}</b> (${b.rank})`:''}`;
  $('#entropy').innerHTML='';
}
let composerBusy=false;
async function askComposer(){
  if(composerBusy)return;composerBusy=true;AUD.init();
  const sc=SCENARIOS[PICK.scen],rec=PROFILES[sc.best];
  const E=['Intent ambiguity','Codebase structural uncertainty','Verification entropy','Risk','Unresolved assumptions'].map((n,i)=>[n,sc.composer.E[i]]);
  const box=$('#entropy');
  box.innerHTML=`<div class="hint mono" style="color:var(--mag)">CPS · Composer is scoring the intent…</div>`+E.map(([n])=>`<div class="ent"><span>${n}</span><div class="t"><i></i></div><b>0.00</b></div>`).join('')+`<div id="cmpRec"></div>`;
  const rows=[...box.querySelectorAll('.ent')];
  for(let i=0;i<E.length;i++){
    await new Promise(r=>setTimeout(r,S.motion?220:0));
    const [,v]=E[i],row=rows[i];if(!row.isConnected){composerBusy=false;return}
    row.querySelector('i').style.width=v*100+'%';AUD.blip(400+v*600,.05);
    const b=row.querySelector('b');if(S.motion){const t0=performance.now();const step=now=>{const f=Math.min(1,(now-t0)/900);b.textContent=(v*f).toFixed(2);if(f<1)requestAnimationFrame(step)};requestAnimationFrame(step)}else b.textContent=v.toFixed(2);
    if(v>=.7)b.style.color='var(--warn)';
  }
  await new Promise(r=>setTimeout(r,S.motion?700:0));
  if(!$('#cmpRec')||sc!==SCENARIOS[PICK.scen]){composerBusy=false;return}
  $('#cmpRec').innerHTML=`<div class="card" style="--oc:var(--mag)"><span class="hint"><b style="color:var(--ink)">Recommendation: ${rec.n} (${rec.cnt} stages).</b> ${sc.composer.why}</span>
  <code class="mono" style="font-size:11.5px;color:var(--dim)">/aidlc compose "${sc.ask}"</code>
  <div class="row"><button class="btn small" type="button" id="useRec">Use ${rec.n}</button></div></div>`;
  $('#useRec').onclick=()=>pickTitle('prof',sc.best);
  AUD.arp([523,659,784],.07);composerBusy=false;
}

/* =====================================================================
   BOOT SEQUENCE
   ===================================================================== */
let bootFast=false;
async function boot(){
  const g=S.gen,p=PROFILES[S.prof];bootFast=!S.motion;
  $('#title').hidden=true;$('#boot').hidden=false;
  const L=[
    ['p','$ ',`cd ${SCN.boot.repo} && copilot`],
    ['p','> ',p.cmd],
    ['c','  ','What do you want to build?'],
    ['p','> ',SCN.ask],
    ['e','◎ ','Conductor · AI-DLC v2.11.4 · detecting workspace…'],
    ['c','  ',SCN.boot.ws],
    ['w','  ',SCN.boot.note],
    ['c','  ',`↳ ${KB}   code knowledge base`],
    ['c','  ',`↳ ${MEM}{org,team,project}.md   the rules chain agents read every stage`],
    ['e','◎ ',`Engine · scope ${p.n.toLowerCase()} · ${p.st.length} stages (${p.st.length-3} after Initialization) · depth ${p.depth}`],
    ['e','◎ ',`Sensors ${p.sensors?'on':'OFF'} · reviewers ${p.review?'on':'NONE'} · plan approval ${p.planApproval?'on':'OFF'} · collaborators ${p.collab?'on':'off'}`],
    ['e','◎ ','Agents · 14 personas loaded'],
    ['p','✓ ',`record ${REC}`],
    ['p','▶ ',`Handing control to ${PEOPLE[S.role].n} (${PEOPLE[S.role].t})…`],
  ];
  const pre=$('#termtext');pre.innerHTML='';
  const sleep=ms=>new Promise(r=>setTimeout(r,bootFast?0:ms));
  for(const [c,pfx,txt] of L){
    if(g!==S.gen)return false;
    const line=document.createElement('div');line.innerHTML=`<span class="${c}">${pfx}</span><span class="${c==='c'?'c':''}"></span><span class="cur"></span>`;pre.appendChild(line);
    const span=line.children[1];
    if(c==='p'&&pfx!=='✓ '&&pfx!=='▶ '){for(let i=0;i<txt.length;i+=2){if(bootFast){span.textContent=txt;break}span.textContent=txt.slice(0,i+2);if(i%6===0)AUD.blip(1200+Math.random()*300,.01,'square');await sleep(14)}}
    else{span.textContent=txt;AUD.blip(700,.02)}
    span.textContent=txt;line.querySelector('.cur').remove();await sleep(c==='p'?260:150);
  }
  await sleep(500);
  if(g!==S.gen)return false;
  $('#boot').hidden=true;return true;
}

/* =====================================================================
   MISSION START / RESTART
   ===================================================================== */
async function startMission(role,prof,skipBoot,scen=PICK.scen){
  AUD.init();skipWait();
  useScenario(scen);if(!SCN.scopes.includes(prof))prof=SCN.best;
  document.body.classList.remove('bossing');S=freshState(role,prof,SCN.id);S.motion=PREFS.motion??!RM.matches;
  ['#con','#feed','#tree','#viewer','#audit','#ticker','#stagecard','#toasts'].forEach(s=>$(s).innerHTML='');
  ['#boss','#debrief','#cine','#tour'].forEach(s=>$(s).hidden=true);SKIN.reset&&SKIN.reset();
  document.body.dataset.role=role;
  if(!skipBoot){if(!await boot())return}else{$('#title').hidden=true;$('#boot').hidden=true}
  $('#app').hidden=false;
  $('#conTitle').textContent=TXT.conTitle?TXT.conTitle(PEOPLE[role]):`${PEOPLE[role].n}'s console · ${PEOPLE[role].t}`;
  $('#cmdline').textContent=PROFILES[prof].cmd;$('#intentLine').textContent=`intent · ${SCN.intent} · ${PROFILES[prof].n.toLowerCase()} scope`;
  $('#speedBtn').textContent=S.speed+'×';tab('comms');
  NET.setMode('game');renderMeters();renderTrack();renderIntel();AUD.ambient(true);AUD.mood('calm');
  runMission();
}
function toTitle(){
  S.gen++;skipWait();ACTIVE=null;PAUSE=null;BOSS.stop();document.body.classList.remove('bossing');NET.pick(null);boardStatus('');AUD.alarm(false);AUD.ambient(false);NET.alert(false);
  ['#app','#boss','#debrief','#cine','#boot'].forEach(s=>$(s).hidden=true);$('#toasts').innerHTML='';SKIN.reset&&SKIN.reset();
  renderTitle();$('#title').classList.remove('attract');$('#title').hidden=false;$('#title').scrollTop=0;NET.setMode('title');
}

/* =====================================================================
   BOSS FIGHT: the SEV-1 incident. The scenario supplies the waves and abilities.
   ===================================================================== */
const BOSS={stop(){},rate:1};
const BKEYS=['1','2','3','4','5','6','7','8','9','0','-'];
async function bossFight(){
  const g=S.gen,D=S.dec,ov=$('#boss'),wrap=$('#bwrap');
  const I=SCN.incident(D),ABIL=I.abil,waves=I.waves;   // the scenario supplies the waves and the abilities; the fight itself is the same
  NET.alert(true);AUD.alarm(true);AUD.mood('boss');
  audit('SIM · INCIDENT_OPENED',`SEV-1 ${I.h.toLowerCase()} (simulator fiction, not an AI-DLC event)`);document.body.classList.add('bossing');NET.layout();
  const shipped=S.plan.includes('4.3');
  await cine({k:I.k||'PagerDuty · SEV-1',h:I.h,p:shipped?I.p:I.unshipped,c:'var(--red)',ms:shipped?2600:3600});
  alive(g);

  const castOf=a=>typeof a.cast==='function'?a.cast():a.cast;
  const avail=a=>!a.req||a.req();
  const dmg=(id,w)=>{const d=ABIL.find(a=>a.id===id).dmg;return d?(typeof d==='function'?d(w):(d[w.id]??d._??0)):0};

  // ---------- loadout screen ----------
  ov.hidden=false;ov.scrollTop=0;
  const relaxDefault=PREFS.relaxed??!S.motion;
  wrap.innerHTML=`<div class="glass bhead"><span class="tag" style="color:var(--red);border-color:var(--red)">SEV-1</span><div><h2 id="bossTitle">Incident: ${I.h.toLowerCase()}</h2><p>Three waves are coming. Hold the SLO by spending as little error budget as possible.</p></div></div>
  <div class="bgrid"><section class="glass bpanel"><h3>Your loadout · set by what you approved earlier</h3><div class="loadout">${ABIL.map((a,i)=>{const ok=avail(a);return`<div class="lo ${ok?'on':'off'}"><i>${ok?'READY':'LOCKED'}</i><span><b>${a.n}</b> <span class="mono" style="font-size:10.5px;color:var(--${a.role})">· ${PEOPLE[a.role].n}${a.role===S.role?' (you, 25% faster)':''}</span><small>${a.src()}</small></span></div>`}).join('')}</div></section>
  <section class="glass bpanel"><h3>Briefing</h3>
    <p class="wdesc"><b>1. Investigate first.</b> Symptoms aren't causes. Investigating reveals the root cause and marks the matching fix.</p>
    <p class="wdesc"><b>2. Match the fix to the cause.</b> The wrong tool wastes time while the error budget burns.</p>
    <p class="wdesc"><b>3. Communicate.</b> ${I.comms}</p>
    <p class="wdesc">Every ability belongs to a teammate. Those owned by your seat cast 25% faster. Keys <kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd> and <kbd>-</kbd> cast them.</p>
    <label class="relax"><input type="checkbox" id="relaxed" ${relaxDefault?'checked':''}> Relaxed pace: the budget drains half as fast</label>
    <button class="btn primary" type="button" id="bossGo">Take command → <kbd>A</kbd></button></section></div>`;
  await new Promise(res=>{const b=$('#bossGo');ACTIVE={approve:b};b.onclick=res;b.focus()});ACTIVE=null;alive(g);
  const relaxed=$('#relaxed').checked;PREFS.relaxed=relaxed;savePrefs();

  // ---------- fight ----------
  const st={budget:100,wi:0,phase:'wave',inter:0,cleared:0,notified:false,escalated:false,invFirst:null,rolledBack:false,mods:{rb:1,nt:1},acts:{},hist:{p99:[],err:[],rps:[]},t:0,logN:0};
  ABIL.forEach(a=>st.acts[a.id]={cast:0,dur:0,cd:0,used:false});
  let w=null;
  wrap.innerHTML=`<div class="glass bhead"><span class="tag" style="color:var(--red);border-color:var(--red)">SEV-1</span><div><h2 id="bossTitle">${I.h}</h2><p id="bsub">Incident commander: ${st.escalated?'paged':'none yet'} · ${relaxed?'relaxed pace':'real-time'}</p></div>
    <div class="budget"><div class="l"><span>Error budget</span><b id="bud">100%</b></div><div class="t"><i id="budi" style="width:100%"></i></div></div></div>
  <div class="bgrid"><section class="glass bpanel"><h3 id="wh">Wave 1 of 3</h3><div class="wave"><div class="wn"><b id="wn"></b><span id="ws"></span></div><div class="hp"><i id="hpi" style="width:100%"></i><em id="hpe">IMPACT 100%</em></div><p class="wdesc" id="wd"></p><div class="rc2" id="rc"></div></div>
    <div class="charts">${[['p99','p99 latency'],['err','Error / FP rate'],['rps','Requests / s']].map(([k,n])=>`<div class="chart"><div class="l"><span>${n}</span><b id="cv-${k}">–</b></div><canvas id="ch-${k}" width="300" height="60"></canvas></div>`).join('')}</div>
    <h3>Incident log</h3><div class="blog" id="blog" aria-live="polite"></div></section>
  <section class="glass bpanel"><h3>Response · click or press a key</h3><div class="acts" id="acts">${ABIL.map((a,i)=>{const ok=avail(a);return`<button class="act${ok?'':' locked'}" type="button" data-id="${a.id}" style="--ac:var(--${a.role})" ${ok?'':'aria-disabled="true"'}>
      <span class="ah"><span class="av">${a.ag}</span><b>${a.n}</b><kbd style="margin-left:auto">${BKEYS[i]}</kbd></span><small>${a.d}</small><span class="src">${ok?`${PEOPLE[a.role].n} · ${castOf(a)}s cast${a.cd?` · ${a.cd}s cooldown`:''}${a.once?' · once':''}`:a.src()}</span><span class="cd" style="transform:scaleX(0)"></span><span class="cp"></span></button>`}).join('')}</div></section></div>`;
  const blog=$('#blog');
  const log=(t,c)=>{const d=el('div',c||'',`<span class="mono" style="color:var(--dim)">T+${String(Math.floor(st.t/60)).padStart(2,'0')}:${String(Math.floor(st.t%60)).padStart(2,'0')}</span> ${t}`);blog.prepend(d)};
  const shake=()=>{if(!S.motion)return;ov.classList.remove('shake');void ov.offsetWidth;ov.classList.add('shake')};
  const bestFor=wv=>{const cands=ABIL.filter(a=>avail(a)&&!st.acts[a.id].used&&!a.util).map(a=>[a.id,dmg(a.id,wv)]).sort((x,y)=>y[1]-x[1]);return cands[0]&&cands[0][1]>0?cands[0][0]:null};
  function startWave(){
    w={...waves[st.wi],hp:100,known:false};st.mods={rb:1,nt:st.notified?.9:1};st.phase='wave';
    $('#wh').textContent=`Wave ${st.wi+1} of 3`;$('#wn').textContent=w.n;$('#ws').textContent=`severity ${w.sev}`;$('#wd').innerHTML=w.sym;
    $('#rc').className='rc2';$('#rc').innerHTML='Root cause: <b>unknown</b>. Investigate to find it.';
    $$('#acts .act').forEach(b=>b.classList.remove('rec'));
    log(`<b>Wave ${st.wi+1}:</b> ${w.n}`,'r');shake();AUD.buzz(.25);audit('SIM · INCIDENT_WAVE',w.n);NET.boss({reset:true,hp:100,wave:w.n,budget:st.budget});
    if(w.auto){log(w.autoLog,'g');w.autoT=1.6}
  }
  function clearWave(){
    st.cleared++;log(`Wave ${st.wi+1} mitigated: ${w.n}`,'g');AUD.arp([523,659,784,1046],.07);audit('SIM · MITIGATION_APPLIED',w.n);NET.boss({dead:true,hp:0});
    toast(`<b class="p">✓</b> Wave ${st.wi+1} mitigated`,'');
    st.wi++;if(st.wi>=waves.length){finish('won');return}
    st.phase='inter';st.inter=2.2;$('#wn').textContent='Stabilising…';$('#wd').textContent='Watching the dashboards for the next signal.';$('#hpi').style.width='0%';$('#hpe').textContent='MITIGATED';
  }
  let resolveFight,rejectFight,ended=false;
  const done=new Promise((res,rej)=>{resolveFight=res;rejectFight=rej});
  function finish(how){if(ended)return;ended=true;clearInterval(loopI);document.removeEventListener('keydown',keyH,true);resolveFight(how)}
  function cast(id){
    if(ended||st.phase==='end')return;const a=ABIL.find(x=>x.id===id),s=st.acts[id],b=$(`#acts [data-id="${id}"]`);
    if(!avail(a)){AUD.buzz(.1);log(`${a.n} is locked: ${a.src()}.`,'y');return}
    if(s.cast>0||s.cd>0||s.used){AUD.blip(200,.05,'square');return}
    if(st.phase!=='wave'&&!['notify','escalate'].includes(id)){AUD.blip(200,.05,'square');return}
    if(st.invFirst===null)st.invFirst=id==='investigate';
    let d=castOf(a);if(a.role===S.role)d*=.75;if(st.escalated)d*=.6;
    s.cast=d;s.dur=d;b.classList.add('casting');AUD.blip(520,.06,'triangle');NET.pulse(a.ag);NET.roleMood(a.ag,'work',d);NET.speak('@'+a.role,a.n+'!',1.2);
    log(`${PEOPLE[a.role].n} → ${a.n}…`,'c');
  }
  function apply(id){
    const a=ABIL.find(x=>x.id===id),s=st.acts[id];s.cd=a.cd;if(a.once)s.used=true;
    $(`#acts [data-id="${id}"]`).classList.remove('casting');NET.cast(a.ag);
    if(id==='escalate'){st.escalated=true;$('#bsub').textContent=`Incident commander: ${PEOPLE.pm.n} · all casts 40% faster`;log('IC paged. Roles assigned. All casts 40% faster.','g');AUD.arp([392,523],.06);return}
    if(id==='notify'){st.notified=true;st.mods.nt=.9;log(I.logs.notify,'g');AUD.arp([659,784],.06);return}
    if(id==='rollback'){st.rolledBack=true;log(I.logs.rollback,'y');finish('rollback');return}
    if(!w||st.phase!=='wave')return;
    if(id==='investigate'){if(w.known){log('Nothing new: the cause is already known.');return}
      w.known=true;$('#rc').className='rc2 known';$('#rc').innerHTML=`Root cause: ${w.rc}`;const bst=bestFor(w);if(bst)$(`#acts [data-id="${bst}"]`).classList.add('rec');
      log(`Root cause found: ${w.rc.replace(/<[^>]+>/g,'')}`,'c');AUD.chord([440,660],.06);return}
    if(id==='runbook'){st.mods.rb=.75;log('Runbook applied: known mitigation, severity −25%.','g')}
    const d=dmg(id,w);
    if(d<=0){log(`${a.n} had no effect on ${w.n.toLowerCase()}.`,'y');AUD.buzz(.12);return}
    w.hp=Math.max(0,w.hp-d);log(`${a.n}: impact −${d}%.`,d>=60?'g':'');AUD.blip(330+d*4,.08,'triangle');
    if(w.hp<=0)clearWave();
  }
  function keyH(e){if(e.metaKey||e.ctrlKey||e.altKey)return;const i=BKEYS.indexOf(e.key);if(i>=0&&ABIL[i]&&!ov.hidden){e.preventDefault();e.stopPropagation();cast(ABIL[i].id)}}
  document.addEventListener('keydown',keyH,true);
  $('#acts').onclick=e=>{const b=e.target.closest('.act');if(b)cast(b.dataset.id)};
  const charts={};['p99','err','rps'].forEach(k=>{const c=$('#ch-'+k);charts[k]={c,x:c.getContext('2d')}});
  function drawChart(k,vals,max,col){const {c,x}=charts[k];const w2=c.clientWidth||300,h=60;if(c.width!==w2*2){c.width=w2*2;c.height=h*2;x.setTransform(2,0,0,2,0,0)}
    x.clearRect(0,0,w2,h);if(vals.length<2)return;const n=60;x.beginPath();vals.forEach((v,i)=>{const px=(i+n-vals.length)/(n-1)*w2,py=h-4-Math.min(1,v/max)*(h-8);i?x.lineTo(px,py):x.moveTo(px,py)});
    x.strokeStyle=col;x.lineWidth=1.6;x.stroke();x.lineTo(w2,h);x.lineTo((n-vals.length)/(n-1)*w2,h);x.closePath();x.fillStyle=col.replace(/\)$/,',.15)').replace('rgb(','rgba(');x.fill()}
  const cs=getComputedStyle(document.documentElement),toRgb=v=>{v=v.trim();if(v[0]!=='#')return v;const n=parseInt(v.slice(1,7),16);return`rgb(${n>>16&255},${n>>8&255},${n&255})`};
  const RED=toRgb(cs.getPropertyValue('--red')),AMB=toRgb(cs.getPropertyValue('--amber')),CY=toRgb(cs.getPropertyValue('--cyan'));
  let lastT=performance.now(),sample=0,crossed={50:false,25:false};
  startWave();
  const loopI=setInterval(()=>{
    if(g!==S.gen){clearInterval(loopI);document.removeEventListener('keydown',keyH,true);if(!ended){ended=true;rejectFight(CANCEL)}return}
    const now=performance.now();let dt=(now-lastT)/1000;lastT=now;if(document.hidden&&BOSS.rate===1)return;dt=Math.min(dt,.3)*BOSS.rate;st.t+=dt;
    // casts and cooldowns
    for(const a of ABIL){const s=st.acts[a.id],b=$(`#acts [data-id="${a.id}"]`);
      if(s.cast>0){s.cast-=dt;b.querySelector('.cp').style.width=(100*(1-s.cast/s.dur))+'%';if(s.cast<=0){s.cast=0;b.querySelector('.cp').style.width='0';apply(a.id);if(ended)return}}
      else if(s.cd>0){s.cd=Math.max(0,s.cd-dt);b.querySelector('.cd').style.transform=`scaleX(${a.cd?s.cd/a.cd:0})`}
      if(s.used&&!b.classList.contains('locked')){b.classList.add('locked');b.querySelector('.src').textContent='used';b.querySelector('.cd').style.transform='scaleX(0)'}}
    let eff=0;
    if(st.phase==='inter'){st.inter-=dt;if(st.inter<=0)startWave()}
    else if(w){
      if(w.auto){w.autoT-=dt;w.hp=Math.max(0,w.hp-dt*70);if(w.hp<=0){clearWave();if(ended)return}}
      if(w&&st.phase==='wave'){eff=w.sev*(w.hp/100)*st.mods.rb*st.mods.nt;st.budget=Math.max(0,st.budget-eff/100*(100/45)*dt*(relaxed?.5:1))}
    }
    // charts
    sample+=dt;if(sample>.25){sample=0;const on=st.phase==='wave'&&w?w.chart:'';
      const n=()=>Math.random()*.1+.95;
      st.hist.p99.push((110+(on==='p99'?eff*23:eff*4))*n());st.hist.err.push((on==='err'?eff*.22:eff*.07)*n());st.hist.rps.push(((I.rps||3800)+(on==='rps'?eff*55:0))*n());
      for(const k in st.hist)if(st.hist[k].length>60)st.hist[k].shift();
      const L2=a=>a[a.length-1]||0;
      $('#cv-p99').textContent=Math.round(L2(st.hist.p99))+' ms';$('#cv-err').textContent=L2(st.hist.err).toFixed(1)+'%';$('#cv-rps').textContent=Math.round(L2(st.hist.rps)).toLocaleString();
      NET.boss({hp:w&&st.phase==='wave'?w.hp:0,budget:st.budget,p99:st.hist.p99.slice(),max:2600,wave:w?w.n:''});
      drawChart('p99',st.hist.p99,2600,L2(st.hist.p99)>150?RED:CY);drawChart('err',st.hist.err,25,L2(st.hist.err)>2?RED:AMB);drawChart('rps',st.hist.rps,9000,CY)}
    // hud
    $('#bud').textContent=Math.ceil(st.budget)+'%';$('#budi').style.width=st.budget+'%';$('#budi').style.backgroundPosition=`${-(100-st.budget)*2}px 0`;
    if(w&&st.phase==='wave'){$('#hpi').style.width=w.hp+'%';$('#hpe').textContent=`IMPACT ${Math.round(w.hp)}%`;$('#ws').textContent=`severity ${Math.round(eff)} / ${w.sev}`}
    for(const th of [50,25])if(!crossed[th]&&st.budget<th){crossed[th]=true;shake();AUD.buzz(.3);log(`Error budget below ${th}%.`,'r')}
    if(st.budget<=0)finish('breach');
  },100);
  BOSS.stop=()=>{if(!ended){ended=true;clearInterval(loopI);document.removeEventListener('keydown',keyH,true)}};
  const how=await done;BOSS.stop=()=>{};alive(g);
  AUD.alarm(false);NET.alert(false);AUD.mood('calm');

  // ---------- result ----------
  const budget=Math.round(st.budget);
  let total=Math.round(budget/2)+10*st.cleared+(st.notified?10:0)+(st.invFirst?10:0);
  if(how==='breach')total-=20;if(how==='rollback')total-=20;
  S.boss={won:how==='won',budget,cleared:st.cleared,notified:st.notified,invFirst:!!st.invFirst,rolledBack:how==='rollback',breach:how==='breach',cause:waves[0].id,relaxed,time:Math.round(st.t),pts:total};
  audit(how==='breach'?'SIM · SLO_BREACH':'SIM · INCIDENT_RESOLVED',how==='won'?`budget ${budget}% left`:how==='rollback'?'rolled back':'error budget exhausted');
  if(how==='won')adj(5,-15);else if(how==='breach')adj(-5,20);else adj(0,5);
  const H={won:['SLO held','var(--good)',I.result.won],rollback:['Rolled back','var(--warn)',I.result.rollback],breach:['SLO breached','var(--bad)',I.result.breach]}[how];
  const items=I.why();
  wrap.innerHTML=`<div class="glass bhead" style="border-color:${H[1]}"><span class="tag" style="color:${H[1]};border-color:${H[1]}">${how==='won'?'RESOLVED':how==='rollback'?'MITIGATED':'BREACH'}</span><div><h2 id="bossTitle" style="color:${H[1]}">${H[0]}</h2><p>${H[2]}</p></div>
    <div class="budget"><div class="l"><span>Error budget left</span><b>${budget}%</b></div><div class="t"><i style="width:${budget}%"></i></div></div></div>
  <div class="bgrid"><section class="glass bpanel"><h3>Why the fight went this way</h3><div class="chain">${items.map(([h,c,t])=>`<div><i style="color:var(--${c})">${c==='good'?'✓ GOOD':'✗ COST'}</i><span><b>${h}.</b> ${t}</span></div>`).join('')}</div></section>
  <section class="glass bpanel"><h3>Incident score</h3><div class="chain">
    <div><i>${Math.round(budget/2)}</i><span>Error budget left ÷ 2</span></div><div><i>${10*st.cleared}</i><span>${st.cleared} of 3 waves mitigated</span></div>
    <div><i>${st.notified?10:0}</i><span>${I.score.notified[st.notified?0:1]}</span></div><div><i>${st.invFirst?10:0}</i><span>${st.invFirst?'Investigated before acting':'Acted before investigating'}</span></div>
    ${how!=='won'?`<div><i style="color:var(--bad)">−20</i><span>${how==='breach'?'SLO breached':I.score.rolled}</span></div>`:''}
    <div><i style="color:var(--accent)">${total}</i><span><b>Total</b>, out of 100</span></div></div>
    <button class="btn primary" type="button" id="bossDone">Continue → <kbd>A</kbd></button></section></div>`;
  pts(total,`Incident response: ${H[0].toLowerCase()}`,100);
  AUD.arp(how==='won'?[523,659,784,1046,1318]:[440,392,330],.09);if(how==='won')NET.celebrate();
  checkBadges();
  await new Promise(res=>{const b=$('#bossDone');ACTIVE={approve:b};b.onclick=res;b.focus()});ACTIVE=null;alive(g);
  ov.hidden=true;document.body.classList.remove('bossing');NET.layout();
}

/* =====================================================================
   DEBRIEF
   ===================================================================== */
function loadBest(){try{return JSON.parse(localStorage.getItem('aidlc-v2-best')||'{}')}catch(e){return{}}}
function rankOf(r){return r>=.9?'Principal Pilot':r>=.75?'Mission Lead':r>=.6?'Flight Engineer':r>=.4?'Cadet':'Rubber Stamp Operator'}
function showDebrief(){
  checkBadges(true);NET.celebrate();AUD.ambient(false);AUD.arp([392,523,659,784,1046],.1);
  const prof=PROFILES[S.prof],mult=prof.mult||1,final=Math.round(S.score*mult);
  const ratio=clamp(S.score/Math.max(1,S.possible),0,1),rank=rankOf(ratio);
  const best=loadBest(),key=`${S.scen}:${S.role}:${S.prof}`,prev=best[key]||(S.scen==='velocity'?best[`${S.role}:${S.prof}`]:undefined);const isBest=!prev||final>prev.score;
  if(isBest){best[key]={score:final,rank,date:new Date().toISOString().slice(0,10)};try{localStorage.setItem('aidlc-v2-best',JSON.stringify(best))}catch(e){}}
  const D=S.dec,c=[];const C2=(id,good,txt)=>c.push([id,good,txt]);
  SCN.debrief(C2,D);
  if(S.unflagged)C2('REV',false,`${S.unflagged} weak decision${S.unflagged>1?'s were':' was'} never flagged (${[...new Set(S.hidden)].join(', ')}): the ${prof.n} scope runs with no reviewers.`);
  if(!S.plan.includes('4.3'))C2('OPS',false,SCN.unshippedRow?SCN.unshippedRow():`The ${prof.n} scope never ran Deployment Execution. The release went out by hand, with no rollback plan, alarms or runbooks designed.`);
  {const f=SCN.fit[S.prof];C2('SCOPE',f.v!=='poor',`${prof.n} was ${f.v==='best'?'the best fit':f.v==='ok'?'a workable fit':'a poor fit'} for ${SCN.n}. ${f.t}`)}
  if(S.boss)C2('SEV',S.boss.won,`Incident: ${S.boss.won?'SLO held':S.boss.rolledBack?'rolled back':'SLO breached'} with ${S.boss.budget}% budget left.`);
  const stat=(n,v)=>`<div><b>${v}</b><span>${n}</span></div>`;
  $('#dwrap').innerHTML=`<section class="glass dhero"><div><p class="kick" style="margin:0">Mission debrief · ${SCN.n} · ${prof.n} scope</p><div class="big">${final}</div></div>
    <div><div class="rk" id="dTitle">${rank}</div><p>${PEOPLE[S.role].full}, ${PEOPLE[S.role].t} · ${S.done.size} stages · finished ${clockStr()}${mult>1?` · ×${mult} enterprise multiplier (a game rule)`:''}</p>
    <p>${Math.round(ratio*100)}% of available points${isBest?(final>0?' · <b style="color:var(--good)">new personal best</b>':''):` · your best: <b>${prev.score}</b>`}</p></div>
    <div class="row" style="margin-left:auto"><button class="btn primary" type="button" id="dAgain">Fly again</button><button class="btn" type="button" id="dTitleBtn">Change work, scope or seat</button><button class="btn small" type="button" id="dCopy">Copy summary</button></div></section>
  <div class="dgrid">
    <section class="glass dpanel"><h3>Decision chain · cause and effect</h3><div class="chain">${c.map(([id,g2,t])=>`<div><i style="color:var(--${g2?'good':'bad'})">${id}</i><span>${t}</span></div>`).join('')}</div></section>
    <section class="glass dpanel"><h3>Badges · ${S.badges.size}/${badgeList().length}</h3><div class="badges">${badgeList().map(b=>`<div class="bdg${S.badges.has(b.id)?' on':''}"><span class="ic">${b.ic}</span><span><b>${b.n}</b><small>${b.d}</small></span></div>`).join('')}</div></section>
    <section class="glass dpanel"><h3>Mission stats</h3><div class="stat3">${stat('lead predictions',`${S.pred.ok}/${S.pred.n}`)}${stat('your gates',S.own.gates)}${stat('findings fixed',S.fixed)}${stat('accepted as risk',S.ignored.length)}${stat('jumps back',S.loops.length)}${stat('artifacts',Object.keys(S.files).length)}${stat('audit events',S.auditN)}${stat('incident budget',S.boss?S.boss.budget+'%':'–')}</div>
      <p class="hint">Quality ${S.quality} · Risk ${S.risk} · Trace ${trace()}%</p></section>
    <section class="glass dpanel"><h3>What changed from v1 to v2</h3><table class="v1v2"><tr><th></th><th>v1</th><th>v2</th></tr>
      <tr><td>Lifecycle</td><td>No Ideation; Operation was a placeholder</td><td>5 phases, 33 stages: Ideation and a real Operation phase</td></tr>
      <tr><td>AI</td><td>One assistant</td><td>14 agent personas: a deterministic engine picks the next stage, and the conductor runs it as that stage's lead</td></tr>
      <tr><td>Checks</td><td>Human review only</td><td>6 sensors, 2 reviewer agents and a traceability check at the end of each phase</td></tr>
      <tr><td>Gates</td><td>Approve or change</td><td>Approve, Request Changes, Accept as-is after three rounds, add a skipped stage, or approve and park</td></tr>
      <tr><td>Shape</td><td>One fixed flow</td><td>11 scopes with ceremony switches, plus the Composer's tailored plans</td></tr>
      <tr><td>Learning</td><td>Per-project docs</td><td>A rules chain (org → team → project), a learning loop, and a space-level code knowledge base</td></tr>
      <tr><td>Build</td><td>Sequential</td><td>Units, a walking skeleton, verified Unit checkpoints, and swarm in git worktrees</td></tr></table></section>
    <section class="glass dpanel" style="grid-column:1/-1"><h3>Your scoring log</h3><div class="plog">${S.log.map(l=>`<div><b style="color:var(--${l.n>0?'good':l.n<0?'bad':'dim'})">${l.n>0?'+':''}${l.n}</b><span>${l.st?`<span class="mono" style="color:var(--dim)">${l.st}</span> `:''}${l.why}</span></div>`).join('')}</div></section>
  </div>`;
  $('#debrief').hidden=false;$('#debrief').scrollTop=0;window.__done={scen:S.scen,prof:S.prof,score:final,rank,badges:[...S.badges],stages:S.done.size,missing:S.plan.filter(i=>!S.done.has(i)),plan:S.plan.length,audit:S.auditN,files:Object.keys(S.files).length,boss:S.boss,loops:S.loops.length,unflagged:S.unflagged,pauses:S.pauses||0,teamGates:S.plan.filter(i=>!ST[i].auto&&ST[i].own!==S.role).length};
  $('#dAgain').onclick=()=>startMission(S.role,S.prof,true,S.scen);
  $('#dTitleBtn').onclick=toTitle;
  $('#dCopy').onclick=async()=>{const txt=`AI-DLC v2 Mission Control: ${final} pts (${rank}) as ${PEOPLE[S.role].t}, ${SCN.n}, ${prof.n} scope. Badges ${S.badges.size}/${badgeList().length}. Incident: ${S.boss?(S.boss.won?'SLO held':S.boss.rolledBack?'rolled back':'SLO breached')+`, ${S.boss.budget}% budget`:'n/a'}.`;
    try{await navigator.clipboard.writeText(txt);toast('Summary copied','')}catch(e){toast('Copy failed: clipboard blocked','bad')}};
  ACTIVE={approve:$('#dAgain')};$('#dAgain').focus();
}

/* =====================================================================
   OFFICE TOUR: a replayable walkthrough of the office and who works in it.
   Runs on first visit (before the setup screen) and from the "Office tour" buttons.
   ===================================================================== */
const TOUR=(()=>{
  const KEY='aidlc-office-toured';
  const PROPS={PRD:'lightbulb',ARC:'hard hat',DSN:'beret',DEV:'headphones',QA:'magnifying glass',DSO:'shield',PIP:'rocket pack',AWS:'cloud',OPS:'siren',DLV:'cap and clipboard',CMP:'scales',ARV:'monocle',PLR:'star',CPS:'music note'};
  const chips=keys=>`<div class="row">${keys.map(k=>`<span class="tag" style="color:${AGENTS[k].c};border-color:${AGENTS[k].c}66">${AGENTS[k].n} · ${PROPS[k]}</span>`).join('')}</div>`;
  const experts=AG_ORDER.filter(k=>AGENTS[k].k==='x'||AGENTS[k].k==='s');
  let i=0,timers=[],on=false;
  const later=(ms,f)=>timers.push(setTimeout(()=>{if(on)f()},ms));
  const seen=()=>{try{return localStorage.getItem(KEY)==='1'}catch(e){return true}};
  const STEPS=[
   {h:'This office is the lifecycle',view:'floor',
    p:()=>`<p>AI-DLC v2 takes one piece of work, an <b>intent</b>, through five phases. The office lays them out as a floor plan. Initialization happens at the hub in the middle. The four rooms around it are <b style="color:${PHASES[1].c}">Ideation</b>, <b style="color:${PHASES[2].c}">Inception</b>, <b style="color:${PHASES[3].c}">Construction</b> and <b style="color:${PHASES[4].c}">Operation</b>, clockwise.</p><p>Work moves from room to room, and what production teaches you loops back to the first one.</p>`,
    enter(){[1,2,3,4].forEach((r,n)=>later(500+n*650,()=>NET.packet('ROOM:'+r,'ROOM:'+(r%4+1),PHASES[r].c,.7)))}},
   {h:'The Conductor',view:'core',spot:['CND'],
    p:()=>`<p>The glowing core is the <b>Conductor</b>: the <code>/aidlc</code> session itself. A deterministic engine decides which stage comes next. The Conductor then runs that stage as its lead agent, or dispatches a subagent, and stops at the gate.</p><p>The three Initialization steps happen right here, with no agent and no gate.</p>`,
    enter(){NET.pulse('CND');later(600,()=>NET.speak('CND','Next stage: Intent Capture. Product leads.',4))}},
   {h:'Eleven domain experts',view:'ring',spot:experts,
    p:()=>`<p>Agents rest on docks around the hub. Eleven are domain experts, and each carries something so you can tell them apart:</p>${chips(experts)}<p><b>Compliance</b> and <b>DevSecOps</b> only ever support. They never lead a stage.</p>`,
    enter(){experts.forEach((k,n)=>later(150+n*110,()=>{NET.pulse(k);NET.roleMood(k,'happy',1.6)}))}},
   {h:'Two reviewers and a composer',view:'ring',spot:['PLR','ARV','CPS'],
    p:()=>`<p><b>Product Lead</b> reviews product stages and <b>Architecture Reviewer</b> reviews design and code stages. Each returns a READY or NOT-READY verdict. A review never blocks you: the human always has the final say.</p><p>The <b>Composer</b> runs only when you ask it to tailor a plan to the work.</p>${chips(['PLR','ARV','CPS'])}`,
    enter(){['PLR','ARV','CPS'].forEach((k,n)=>later(200+n*250,()=>{NET.pulse(k);NET.roleMood(k,k==='CPS'?'happy':'review',2.5)}))}},
   {h:'A stage, in its room',view:'room1',
    p:()=>`<p>When a stage starts, its <b style="color:var(--cyan)">lead</b> flies to that phase's room. If the stage has a <b style="color:var(--amber)">reviewer</b>, it stands by.</p><p>This is Intent Capture in the Ideation lounge: Product leads, Product Lead reviews. Before each stage you guess who the lead will be, by picking a card or clicking the bot itself. A correct call is worth 10 points.</p>`,
    enter(){NET.setStage({id:'1.1',n:'Intent Capture & Framing',ph:1,lead:'PRD',col:[],rev:'PLR',sens:[]});later(2600,()=>NET.speak('PRD','I need one thing from a human: what does success mean?',5))}},
   {h:'Collaborators',view:'room2',
    p:()=>`<p>On the <b>Enterprise</b> scope, collaborators are on, so a stage's <b style="color:var(--mag)">support</b> agents join the table. This is User Stories: Product drafts, then Design, Developer and Quality each contribute without seeing the others.</p><p>On Feature and Express the lead works alone. The office is quieter, and fewer eyes check the work.</p>`,
    enter(){NET.setStage({id:'2.4',n:'User Stories',ph:2,lead:'PRD',col:['DSN','DEV','QA'],rev:'PLR',sens:[]});later(3000,()=>NET.speak('QA','Who speaks for the applicant who gets flagged wrongly?',5))}},
   {h:'The humans',view:'mezz',spot:ROLE_ORDER.map(k=>'@'+k),
    p:()=>`<p>Five people work from the gallery under the mission board: ${ROLE_ORDER.map(k=>`<b style="color:var(--${k})">${PEOPLE[k].n}</b> (${PEOPLE[k].t})`).join(', ')}.</p><p>Agents do the work; humans own the decisions. You play one of them. Agents send each question to the person who owns it, and your answers shape every artifact that follows.</p>`,
    enter(){ROLE_ORDER.forEach((k,n)=>later(300+n*350,()=>{NET.pulse('@'+k);NET.humanMood(k,'cheer',1.1)}))}},
   {h:'The approval gate',view:'gate',
    p:()=>`<p>Every stage after Initialization stops at the gate. Its owner walks down, reads the artifacts and decides: <b>Approve</b>, or <b>Request Changes</b> and the agent revises.</p><p>When the gate is yours, open the artifacts first. Approving without reading is a rubber stamp, and it costs you points.</p>`,
    enter(){NET.gate(1,'po');later(4200,()=>NET.gate(2))}},
   {h:'Six sensors',view:'hub',spot:['SENS'],
    p:()=>`<p>The pylons around the hub are the six <b>sensors</b>: automatic checks on what the agents wrote. Each stage imports only the ones that apply to it.</p><p><b style="color:var(--good)">Green</b> passed, <b style="color:var(--bad)">red</b> found something. They are advisory. They check evidence and structure, not whether a design is wise. That judgement stays with you.</p>`,
    enter(){SENSORS.forEach((s,n)=>{later(500+n*420,()=>NET.sensor(n,1));later(820+n*420,()=>NET.sensor(n,n===0?3:2))})}},
   {h:'The record wall and the mission board',view:'vault',
    p:()=>`<p>Every artifact the agents write lands in the <code>aidlc/</code> record on this wall: one binder each, coloured by phase. In the game the same files are in the <b>Artifacts</b> tab.</p><p>The board on the back wall always shows the current stage, the clock and your score.</p>`,
    enter(){for(let n=0;n<14;n++)later(400+n*190,()=>{const ph=1+Math.floor(n/4)%4;NET.packet('ROOM:'+ph,'VAULT',PHASES[ph].c,1.3);NET.vaultHit(PHASES[ph].c)})}},
   {h:'Construction: Units and the swarm',view:'pods',
    p:()=>`<p>Inception splits the work into <b>Units</b>. In Construction the Developer builds them, starting with a walking skeleton: the smallest slice that works end to end.</p><p>Once that is verified, independent Units can build side by side as a <b>swarm</b>. Each one gets a drone in its own git worktree pod.</p>`,
    enter(){NET.setStage({id:'3.5',n:'Code Generation',ph:3,lead:'DEV',col:[],rev:'ARV',sens:[]});later(1500,()=>NET.swarm(['u1-core','u2-rules','u3-api']))}},
   {h:'Operation, and the incident',view:'ops',
    p:()=>`<p>The Operations room ships the work and watches production. At the end of every run, production pushes back: the incident arrives as a storm over the server racks.</p><p>Your response abilities are whatever you approved earlier. A skipped design stage or a risk you accepted comes back here.</p>`,
    enter(){later(300,()=>{NET.alert(true);NET.boss({reset:true,hp:100,budget:100,wave:'SEV-1 incident'})})}},
   {h:'You are ready',view:'floor',last:1,
    p:()=>`<p>Choose a seat and a scope, then run the lifecycle. In the office you can <b>drag</b> to orbit, <b>scroll</b> to zoom, <b>double-click</b> to reset the view, and <b>hover</b> anyone to see who they are. Try it now.</p><p>You can replay this tour from the title screen at any time.</p>`,
    enter(){later(250,()=>NET.celebrate())}},
  ];
  function show(n){
    i=clamp(n,0,STEPS.length-1);timers.forEach(clearTimeout);timers=[];
    const s=STEPS[i];
    $('#tourK').textContent=`Office tour · ${i+1} of ${STEPS.length}`;
    $('#tourDots').innerHTML=STEPS.map((_,k)=>`<i class="${k===i?'on':k<i?'done':''}"></i>`).join('');
    $('#tourH').textContent=s.h;$('#tourB').innerHTML=s.p();
    $('#tourBack').disabled=i===0;$('#tourNext').innerHTML=s.last?'Choose your seat →':'Next →';$('#tourSkip').hidden=!!s.last;
    BOARD.tour=s.h.toUpperCase();
    NET.tourReset();NET.layout();NET.focus(s.view,true);NET.spot(s.spot||null);
    if(s.enter)s.enter();
    AUD.blip(560+i*28,.05);$('#tourNext').focus({preventScroll:true});
  }
  function start(n=0){
    if(!NET.ok)return;
    if(!NET.off.ready){setTimeout(()=>start(n),120);return}   // the office is still loading
    AUD.init();on=true;S.gen++;skipWait();ACTIVE=null;PAUSE=null;
    ['#title','#app','#boot','#boss','#debrief','#cine'].forEach(s=>$(s).hidden=true);
    $('#tour').hidden=false;NET.setMode('tour');show(n);
  }
  function end(){
    if(!on)return;on=false;timers.forEach(clearTimeout);timers=[];BOARD.tour='';
    try{localStorage.setItem(KEY,'1')}catch(e){}
    $('#tour').hidden=true;NET.tourReset();NET.setMode('title');
    $('#title').classList.remove('attract');$('#title').hidden=false;$('#title').scrollTop=0;NET.layout();AUD.arp([523,659,784],.06);
  }
  const next=()=>{if(!on)return;if(i>=STEPS.length-1)end();else show(i+1)},back=()=>{if(on&&i>0)show(i-1)};
  function bind(){$('#tourNext').onclick=next;$('#tourBack').onclick=back;$('#tourSkip').onclick=end}
  return{start,end,next,back,bind,seen,get active(){return on},get steps(){return STEPS.length}};
})();

/* =====================================================================
   CONTROLS, KEYBOARD, INIT
   ===================================================================== */
function applyMotion(v){S.motion=v;document.body.classList.toggle('rm',!v);$('#motBtn').setAttribute('aria-pressed',v);NET.dirty()}
function sndUI(){$$('.sndT').forEach(b=>{b.setAttribute('aria-pressed',AUD.on);b.textContent=AUD.on?'🔊 Sound on':'🔇 Sound off'})}
function applyTheme(t){document.documentElement.dataset.theme=t;NET.colors()}
function initControls(){
  $('#speedBtn').onclick=()=>{const v=[1,2,4];S.speed=v[(v.indexOf(S.speed)+1)%v.length];PREFS.speed=S.speed;savePrefs();$('#speedBtn').textContent=S.speed+'×'};
  const snd=()=>{const on=AUD.toggle();sndUI();toast(on?'Sound on':'Sound off','')};
  $$('.sndT').forEach(b=>b.onclick=snd);
  $('#pauseBtn').onclick=()=>{applyPause(!pausing());savePrefs();toast(pausing()?'Pausing after each teammate\'s stage':'Auto-advance on: teammates\' stages run on without a pause','')};
  $('#motBtn').onclick=()=>{applyMotion(!S.motion);PREFS.motion=S.motion;savePrefs();toast(S.motion?'Motion effects on':'Reduced motion on','')};
  $('#thmBtn').onclick=$('#tThm').onclick=()=>{const t=document.documentElement.dataset.theme==='light'?'dark':'light';applyTheme(t);PREFS.theme=t;savePrefs()};
  let armed=0;
  $('#exitBtn').onclick=()=>{if(Date.now()-armed<3000){armed=0;$('#exitBtn').textContent='⟲';toTitle();return}
    armed=Date.now();$('#exitBtn').textContent='?';toast('Press ⟲ again to abandon this mission','meh');setTimeout(()=>{if(armed&&Date.now()-armed>=2900){armed=0;$('#exitBtn').textContent='⟲'}},3000)};
  $$('.tab').forEach(t=>{t.onclick=()=>{tab(t.id.slice(2));if(t.id==='t-intel'&&S.plan)renderIntel()}});
  $('.tabs').addEventListener('keydown',e=>{const ts=$$('.tab'),i=ts.indexOf(document.activeElement);if(i<0)return;let j=null;if(e.key==='ArrowRight')j=(i+1)%ts.length;if(e.key==='ArrowLeft')j=(i-1+ts.length)%ts.length;if(j!==null){e.preventDefault();ts[j].focus();ts[j].click()}});
  $('#tree').addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(b)openFile(b.dataset.p,true)});
  $('#cine').addEventListener('click',()=>skipWait());
  $('#askComposer').onclick=askComposer;
  $('#attractBtn').onclick=()=>{AUD.init();if(NET.ok&&!TOUR.seen()){TOUR.start();return}$('#title').classList.remove('attract');$('#title').scrollTop=0;NET.layout();AUD.arp([523,659,784],.06)};
  TOUR.bind();$('#tourBtn').onclick=$('#tourBtn2').onclick=()=>TOUR.start();
  if(!NET.ok){$('#tourBtn').hidden=$('#tourBtn2').hidden=true}
  $('#startBtn').onclick=()=>{PREFS.role=PICK.role;PREFS.prof=PICK.prof;PREFS.scen=PICK.scen;savePrefs();startMission(PICK.role,PICK.prof)};
  $('#bootSkip').onclick=()=>{bootFast=true};
  addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    const tg=e.target,tn=tg.tagName;if(/INPUT|TEXTAREA|SELECT/.test(tn)&&tg.type!=='checkbox')return;
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    if(k==='m'){snd();return}
    if(TOUR.active){if(k==='Escape'){e.preventDefault();TOUR.end()}else if(k==='ArrowRight'){e.preventDefault();TOUR.next()}else if(k==='ArrowLeft'){e.preventDefault();TOUR.back()}return}
    if(!$('#boot').hidden&&(k===' '||k==='Enter'||k==='Escape')){bootFast=true;e.preventDefault();return}
    if(ACTIVE){
      if(k==='Enter'&&ACTIVE.cont&&tn!=='A'&&(tn!=='BUTTON'||tg.closest('#con,#p-files,.enterok'))){e.preventDefault();if(!e.repeat)ACTIVE.cont.click();return}
      if(/^[1-7]$/.test(k)&&ACTIVE.opts&&ACTIVE.opts[+k-1]){e.preventDefault();ACTIVE.opts[+k-1].click();return}
      if(k==='a'&&ACTIVE.approve){e.preventDefault();ACTIVE.approve.click();return}
      if(k==='r'&&ACTIVE.request){e.preventDefault();ACTIVE.request.focus();return}
    }
    if(k===' '&&tn!=='BUTTON'&&tn!=='A'&&tn!=='INPUT'&&!$('#app').hidden){e.preventDefault();skipWait()}
  });
  let gest=false;const g1=()=>{if(gest)return;gest=true;AUD.init()};addEventListener('pointerdown',g1,true);addEventListener('keydown',g1,true);
  RM.addEventListener?.('change',()=>{if(PREFS.motion===undefined)applyMotion(!RM.matches)});
}
function init(){
  applyTheme(PREFS.theme||'dark');   // dark unless the player has switched; the choice is remembered
  S.speed=PREFS.speed||1;sndUI();$('#pauseBtn').setAttribute('aria-pressed',pausing());
  NET.start();applyMotion(PREFS.motion??!RM.matches);
  initControls();renderTitle();NET.setMode('title');
}
/* Autoplay harness, for testing only: ?auto=1|bad|fix&scen=velocity&role=po&prof=feature&speed=30
   1 = best answers, bad = worst answers and rubber stamps, fix = worst answers then request every fix,
   hot = best answers except a hot-partition counter store that is never fixed (reaches the backward jump), parking once. */
function autoplay(){
  const Q=new URLSearchParams(location.search),m=Q.get('auto');if(!m)return;
  PREFS.speed=+Q.get('speed')||30;PREFS.sound=false;BOSS.rate=+Q.get('rate')||12;window.__auto=m;
  if(Q.get('motion')==='0')PREFS.motion=false;
  $('#title').classList.remove('attract');
  const scen=SCENARIOS[Q.get('scen')]?Q.get('scen'):'velocity';PICK.scen=scen;
  startMission(PEOPLE[Q.get('role')]?Q.get('role'):'po',PROFILES[Q.get('prof')]?Q.get('prof'):SCENARIOS[scen].best,true,scen);
  /* .click() works on a button the player could never reach (covered by a window, in a closed one, off screen).
     So wait briefly for the prompt to be clickable where it sits, and record it if it never is.
     The scroll is repeated here because the engine's own runs on an animation frame, which a background test page never gets. */
  let hidN=0;const blocked=window.__blocked=[];
  const hit=b=>{const r=b.getBoundingClientRect(),e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!e&&(e===b||b.contains(e))};
  const ready=b=>{if(hit(b)){hidN=0;return true}b.scrollIntoView({block:'nearest'});if(++hidN<=25)return false;hidN=0;blocked.push(`${S.cur||'-'}: ${b.textContent.trim().replace(/\s+/g,' ').slice(0,40)}`);return true};
  const iv=setInterval(()=>{
    if(window.__done){clearInterval(iv);return}
    if(window.__pauseIf&&window.__pauseIf()){clearInterval(iv);S.speed=.02;window.__paused=true;return}   // tools/screenshots.mjs freezes a moment this way
    const slow=Q.get('slow')&&S.cur&&S.cur.startsWith(Q.get('slow'));S.speed=slow?1:PREFS.speed;
    if(!Q.get('noskip')&&!slow)skipWait();
    if(!$('#boss').hidden){if(Q.get('hold')==='boss'&&($('#bossGo')||$('#acts'))){BOSS.rate=1;if($('#bossGo')&&Q.get('holdat')!=='loadout')$('#bossGo').click();if($('#acts')||Q.get('holdat')==='loadout'){clearInterval(iv);S.speed=1;$('#speedBtn').textContent='1×'}return}
      const go=$('#bossGo')||$('#bossDone');if(go){go.click();return}
      $$('#acts .act:not(.locked):not(.casting)').forEach(b=>{if(b.dataset.id!=='rollback'||m==='bad')b.click()});return}
    if(!ACTIVE)return;
    if(ACTIVE.cont){if(ready(ACTIVE.cont))ACTIVE.cont.click();return}
    if(ACTIVE.opts){const o=ACTIVE.opts.filter(b=>!b.disabled);if(!o.length)return;
      const dec=o.filter(b=>b.dataset.i!==undefined);
      let t;if(dec.length){const want=m==='1'?0:m==='hot'?(S.cur==='2.6'?1:0):Math.max(...dec.map(b=>+b.dataset.i));t=dec.find(b=>+b.dataset.i===want)||dec[0]}else t=o[m==='bad'?o.length-1:0];
      if(ready(t))t.click();return}
    if(ACTIVE.approve){if(!ready(ACTIVE.approve))return;const c=ACTIVE.approve.closest('.card');
      if(c){if(m!=='bad')c.querySelectorAll('.fl:not(.seen)').forEach(b=>b.click());const fx=c.querySelector('.chip.fix');if(fx&&m==='fix'){fx.click();return}
        const pk=c.querySelector('[data-a="park"]');if(pk&&m==='hot'&&!window.__parked){window.__parked=1;pk.click();return}}
      ACTIVE.approve.click()}
  },40);
}
function boot0(){init();autoplay();const Q=new URLSearchParams(location.search);if(Q.get('tour'))TOUR.start(+Q.get('tourstep')||0)}   // ?tour=1&tourstep=4 opens the tour directly
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot0);else boot0();
