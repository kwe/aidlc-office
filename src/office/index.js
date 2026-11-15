// The AI-DLC office: a three.js diorama the game drives through a small API (see `api` at the bottom).
// Layout comes from A_* anchors in the GLB (blender/build_assets.py); nothing here hard-codes room positions
// except the few constants in LAYOUT that mirror the Blender script.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Bot, Human, Drone, V, damp, tintMaterials } from './actors.js';
import { canvasTex, drawFloor, drawBoard, drawNoc, drawSign, drawStormFace } from './screens.js';

const LAYOUT = { FX: 17, FY: 13, ROOM_W: 8.6, ROOM_D: 7.0, MEZZ_X: 6.4, VAULT_ROWS: 5, VAULT_PITCH: .125, VAULT_LEN: 4.7 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function create(o) {
  const { agents, order, people, roles, phases } = o;
  const st = () => o.state();
  const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x060a13, 60, 130);
  const camera = new THREE.PerspectiveCamera(30, 1, .5, 300);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .55, .7, .9);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  // lights
  const hemi = new THREE.HemisphereLight(0x8fb0ff, 0x0b0f1a, .9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(14, 26, 16); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 22, bottom: -22, near: 1, far: 80 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; scene.add(sun, sun.target);
  const roomLights = [], hubLight = new THREE.PointLight(0x38e1ff, 30, 14, 2); hubLight.position.set(0, 2.2, 0); scene.add(hubLight);
  const gateLight = new THREE.PointLight(0xffb547, 0, 10, 2); scene.add(gateLight);
  const alarmLight = new THREE.SpotLight(0xff2a3f, 0, 30, .6, .5, 1.2); scene.add(alarmLight, alarmLight.target);

  // state
  const mezzLight = new THREE.PointLight(0xffe2b8, 34, 16, 2); mezzLight.position.set(0, 3.4, -9.6); scene.add(mezzLight);
  let hemiBase = 1.7, lastDpr = 0, lastPh = -1;
  let ready = false, mode = 'title', W = 1, H = 1, T = 0, last = performance.now(), lastRender = 0, dirty = true, light = false;
  const C = {}, anchors = {}, mats = {}, bots = {}, humans = {}, sensors = [], drones = [], packets = [], rings = [], beams = [], arcs = [], pods = [];
  let stage = null, cnd = null, storm = null, gateArm = null, gateS = 0, gateRole = null, gateT = 0, gateHuman = null, alertOn = false, hover = null, candidates = null;
  let binders = null, binderN = 0, vaultFlash = 0, confetti = null, roomba = null, beacon = null, hubMat = null, gateMat = null, ledMat = null, podMats = [];
  let boardS, nocS, vaultS, floorS, stormS, boardT = 0, nocT = 0, nocData = {}, idleT = 3, celebrateT = 0, shake = 0, bossHp = 100, stormDead = 0;
  const cam = { az: .42, pol: .93, dist: 48, tgt: V(0, .6, .6), d: { az: .42, pol: .93, dist: 48, tgt: V(0, .6, .6) }, userT: 0, fit: 1 };
  const tmp = V(), tmp2 = V();

  // overlay labels
  const layer = document.createElement('div'); layer.id = 'o3d'; (o.labelsHost || document.body).appendChild(layer);
  const mkLabel = (cls = '') => { const e = document.createElement('div'); e.className = 'o3l ' + cls; e.innerHTML = '<div class="bb"></div><span class="tg"></span><span class="nm"></span>'; layer.appendChild(e); return { e, bb: e.firstChild, tg: e.children[1], nm: e.children[2], bubT: 0, on: false }; };
  let bubbles = [];

  /* ------------------------------------------------------------------ theme */
  function colors() {
    ['bg', 'ink', 'muted', 'dim', 'cyan', 'mag', 'amber', 'good', 'bad', 'warn', 'violet', 'lime', 'red', 'po', 'eng', 'pm', 'ops', 'sec'].forEach(k => C[k] = o.cssVar(k));
    light = o.theme() === 'light';
    if (!ready) return;
    const bg = new THREE.Color(light ? '#C4D0E6' : '#070B14');
    scene.background = bg; scene.fog.color.copy(bg);
    hemiBase = light ? 2.3 : 1.7; hemi.intensity = hemiBase; hemi.color.set(light ? '#ffffff' : '#a9bcff'); hemi.groundColor.set(light ? '#b8c2d8' : '#1c2540');
    sun.intensity = light ? 2.6 : 1.9; sun.color.set(light ? '#fff4e2' : '#cfdcff');
    bloom.strength = light ? .18 : .42; bloom.threshold = 1.0; bloom.radius = .55;
    renderer.toneMappingExposure = light ? 1.0 : 1.18;
    const set = (n, dark, lt, extra) => { const m = mats[n]; if (!m) return; m.color.set(light ? lt : dark); if (extra) extra(m); };
    set('wall', '#2A3654', '#DCE3F0'); set('slab', '#111828', '#9AA7C0'); set('trim', '#3A4A70', '#A9B6D0'); set('plat', '#2E3A5C', '#C2CCE0');
    set('metal_dark', '#2A3040', '#4A546B');
    if (mats.window) { mats.window.color.set(light ? '#BFE3FF' : '#0E1E3C'); mats.window.emissive.set(light ? '#CFEAFF' : '#2B5BB8'); mats.window.emissiveIntensity = light ? .9 : 1.2; }
    roomLights.forEach(l => l.userData.base = light ? 10 : 46);
    hubLight.intensity = light ? 8 : 26; mezzLight.intensity = light ? 8 : 34;
    drawFloor(floorS, { fx: LAYOUT.FX, fy: LAYOUT.FY, roomW: LAYOUT.ROOM_W, roomD: LAYOUT.ROOM_D, phases, light, hubLabel: o.floorLabel || '', rooms: [1, 2, 3, 4].map(i => ({ x: anchors['room' + i + '_c'].p.x, z: anchors['room' + i + '_c'].p.z })) });
    Object.values(humans).forEach(h => { h.color.set(C[h.key]); });
    dirty = true;
  }

  /* ------------------------------------------------------------------ load */
  new GLTFLoader().parse(o.glb, '', gltf => {
    try { build(gltf.scene); ready = true; colors(); layout(); setMode(mode); if (stage) setStage(stage); o.onReady && o.onReady(); }
    catch (e) { console.error('[office] build failed', e); o.onError && o.onError(e); }
  }, e => { console.error('[office] glb parse failed', e); o.onError && o.onError(e); });

  function build(root) {
    root.updateMatrixWorld(true);
    const take = [];
    root.traverse(n => {
      if (n.isMesh) { n.receiveShadow = true; n.castShadow = true; const m = n.material; if (m && m.name && !mats[m.name]) mats[m.name] = m; if (m && m.transparent) { m.depthWrite = false; n.castShadow = false; } }
      if (n.name.startsWith('A_')) { const p = V(); n.getWorldPosition(p); const e = new THREE.Euler().setFromQuaternion(n.getWorldQuaternion(new THREE.Quaternion()), 'YXZ'); anchors[n.name.slice(2)] = { p, yaw: e.y }; }
      if (/^(bot_|hum_|proto_)/.test(n.name)) take.push(n);
    });
    take.forEach(n => n.removeFromParent());
    const named = {}; take.forEach(n => named[n.name] = n);
    scene.add(root);
    for (let i = 1; i <= 4; i++) anchors['room' + i + '_c'] = { p: anchors['room' + i + '_table'].p.clone(), yaw: 0 };
    // room centres for the floor drawing are the room rectangles, not the table spots
    anchors.room3_c.p.x += .4; anchors.room4_c.p.x -= .9;
    // surfaces
    const floor = root.getObjectByName('floor'); floorS = canvasTex(2048, 1566); floor.material = new THREE.MeshStandardMaterial({ map: floorS.t, roughness: .62, metalness: .12 }); floor.castShadow = false;
    const scr = (name, w, h) => { const m = root.getObjectByName(name), s = canvasTex(w, h); m.material = new THREE.MeshBasicMaterial({ map: s.t, toneMapped: false }); m.material.color.setScalar(1.25); m.castShadow = false; m.receiveShadow = false; return s; };
    boardS = scr('scr_board', 1280, 244); nocS = scr('scr_noc', 784, 320); vaultS = scr('scr_vault', 544, 80);
    hubMat = mats.m_hub; gateMat = mats.m_gate; ledMat = mats.led;
    gateArm = root.getObjectByName('gate_arm'); beacon = root.getObjectByName('beacon');
    for (let i = 0; i < 4; i++) { const p = root.getObjectByName('pod_' + i); pods.push(p); p.traverse(n => { if (n.isMesh) { podMats[i] = n.material; n.castShadow = false; } }); }
    ['rack_leds', 'hub_ring', 'gate_light', 'arcade_glow'].forEach(n => { const m = root.getObjectByName(n); m && m.traverse(x => { if (x.isMesh) x.castShadow = false; }); });
    // room lights
    for (let i = 1; i <= 4; i++) { const l = new THREE.PointLight(new THREE.Color(phases[i].c).lerp(new THREE.Color('#fff2d8'), .55), 34, 15, 2); l.position.copy(anchors['room' + i + '_table'].p).add(V(0, 3.0, 0)); l.userData.base = 34; scene.add(l); roomLights.push(l); }
    gateLight.position.copy(anchors.gate.p).add(V(0, .8, .6));
    alarmLight.position.copy(anchors.beacon.p);
    // bots
    order.forEach((k, i) => {
      const b = new Bot(k, named['bot_' + k], agents[k].c); b.home = anchors['dock_' + String(i).padStart(2, '0')];
      b.place(b.home.p, Math.atan2(-b.home.p.x, -b.home.p.z)); b.face(V(0, 0, 0)); b.setMood('sleep');
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .028, 8, 40), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(agents[k].c), emissiveIntensity: 1.5 }));
      ring.rotation.x = Math.PI / 2; ring.position.copy(b.home.p).add(V(0, .09, 0)); scene.add(ring); b.dockRing = ring;
      b.label = mkLabel(); b.label.nm.textContent = agents[k].n; b.label.e.style.setProperty('--c', agents[k].c);
      scene.add(b.g); bots[k] = b;
    });
    // conductor
    const cr = named.bot_CND; cnd = { g: new THREE.Group(), core: cr.getObjectByName('CND_core'), rings: [1, 2, 3].map(i => cr.getObjectByName('CND_ring' + i)), pulse: 0, label: mkLabel('cnd') };
    cr.getObjectByName('CND_face').visible = false;
    cnd.g.add(cr); cnd.g.position.set(0, 2.0, 0); scene.add(cnd.g); cnd.label.nm.textContent = 'Conductor';
    cnd.rings[0].rotation.x = .5; cnd.rings[1].rotation.z = 1.0; cnd.rings[2].rotation.x = -1.0;
    cr.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = false; } });
    const beamGeo = new THREE.CylinderGeometry(.05, .55, 1.7, 24, 1, true);
    cnd.beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0x38e1ff, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    cnd.beam.position.set(0, 1.2, 0); scene.add(cnd.beam);
    // humans
    roles.forEach(k => {
      const h = new Human(k, named['hum_' + k], C[k] || '#ffffff'); h.desk = anchors['desk_' + k]; h.out = anchors['desk_' + k + '_out'];
      h.ground = (x, z) => Math.abs(x) < LAYOUT.MEZZ_X ? (z < -(LAYOUT.FY - 3.4) ? .5 : z < -(LAYOUT.FY - 4.0) ? .25 : 0) : 0;
      h.place(h.desk.p, 0); h.setMood('work');
      h.label = mkLabel('hum'); h.label.nm.textContent = people[k].n; h.label.e.style.setProperty('--c', `var(--${k})`);
      scene.add(h.g); humans[k] = h;
    });
    // sensors around the hub
    const sp = named.proto_sensor, n = o.sensors.length;
    o.sensors.forEach((name, i) => {
      const g = sp.clone(true), a = -Math.PI / 2 + (i + .5) / n * Math.PI * 2, R = 3.35;
      g.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); g.rotation.y = -a;
      let lamp; g.traverse(x => { if (x.isMesh && x.material.name === 'm_sensor') { lamp = lamp || x.material.clone(); x.material = lamp; x.castShadow = false; } });
      scene.add(g); sensors.push({ g, lamp, s: 0, name, t: 0, label: mkLabel('sens') }); sensors[i].label.nm.textContent = name;
    });
    // vault binders
    binders = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, .42, .095), new THREE.MeshStandardMaterial({ roughness: .5, emissive: 0xffffff, emissiveIntensity: .0 }), LAYOUT.VAULT_ROWS * Math.floor(LAYOUT.VAULT_LEN / LAYOUT.VAULT_PITCH));
    binders.count = 0; binders.castShadow = true; binders.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(binders); binders.userData.born = [];
    // storm (boss)
    const sr = named.proto_storm; stormS = canvasTex(192, 128);
    const sf = sr.getObjectByName('storm_face'); sf.material = new THREE.MeshBasicMaterial({ map: stormS.t, toneMapped: false }); sf.material.color.setScalar(1.4);
    sr.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = false; } });
    storm = { g: new THREE.Group(), body: sr.getObjectByName('storm_body'), s: 0, hit: 0 }; storm.g.add(sr); storm.g.position.copy(anchors.storm.p); storm.g.visible = false; scene.add(storm.g);
    storm.light = new THREE.PointLight(0xff2a3f, 0, 22, 2); storm.g.add(storm.light);
    // roomba
    roomba = { g: named.proto_roomba, a: 0, tgt: V(2, 0, 9), wait: 0 }; roomba.g.position.set(2, 0, 9.5); scene.add(roomba.g);
    o.droneProto = named.proto_drone;
    // confetti
    const cg = new THREE.PlaneGeometry(.16, .1); confetti = new THREE.InstancedMesh(cg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), 420);
    confetti.count = 0; confetti.frustumCulled = false; confetti.userData.p = []; scene.add(confetti);
    drawSign(vaultS, 'aidlc/ · 0 artifacts', '#A98BFF');
  }

  /* ------------------------------------------------------------------ positions */
  function pos(k, out = V()) {
    if (k && k.isVector3) return out.copy(k);
    if (k === 'CND' || k === 'SYS') return out.set(0, 2.0, 0);
    if (k === 'VAULT') return out.copy(anchors.vault_in.p);
    if (k === 'GATE') return out.copy(anchors.gate.p);
    if (typeof k === 'string') {
      if (k.startsWith('SAT:')) { const d = drones[+k.slice(4)]; return d ? d.headPos(out) : pos('DEV', out); }
      if (k.startsWith('ROOM:')) return out.copy(anchors['room' + k.slice(5) + '_table'].p).add(tmp2.set(0, 1.4, 0));
      if (k[0] === '@' && humans[k.slice(1)]) return humans[k.slice(1)].headPos(out).add(tmp2.set(0, -.5, 0));
      if (bots[k]) return bots[k].headPos(out).add(tmp2.set(0, -.5 + bots[k].alt, 0));
    }
    return out.set(0, 2.0, 0);
  }
  const colOf = k => k === 'CND' ? C.cyan : k === 'VAULT' ? C.violet : k === 'GATE' ? C.amber : agents[k] ? agents[k].c : (k && k[0] === '@') ? C[k.slice(1)] : C.lime;

  /* ------------------------------------------------------------------ camera */
  const VIEWS = {
    title: { tgt: [0, .4, .5], az: .5, pol: .98, r: 17.5 },
    hub: { tgt: [0, .8, 0], az: .38, pol: .98, r: 9 }, docks: { tgt: [0, .7, .4], az: .4, pol: .86, r: 7.6 },
    all: { tgt: [0, .4, .8], az: .42, pol: .9, r: 18.5 },
    room1: { az: .5, pol: .97, r: 6.9 }, room2: { az: -.42, pol: .97, r: 6.9 }, room3: { az: -.5, pol: .9, r: 7.2 }, room4: { az: .55, pol: .9, r: 7.2 },
    gate: { az: .34, pol: .78, r: 7.4 }, ops: { az: .55, pol: 1.02, r: 7.4 },
  };
  let view = 'title';
  function focus(name, force) {
    view = name; const v = VIEWS[name] || VIEWS.all;
    if (cam.userT > 0 && !force) return;
    cam.d.az = v.az; cam.d.pol = v.pol; cam.d.r = v.r;
    if (v.tgt) cam.d.tgt.set(...v.tgt);
    else if (name.startsWith('room')) cam.d.tgt.copy(anchors[name + '_table'].p).add(V(0, .7, 0)).multiplyScalar(.82);
    else if (name === 'gate') cam.d.tgt.copy(anchors.gate.p).add(V(0, -.2, -2.2));
    else if (name === 'ops') cam.d.tgt.copy(anchors.room4_table.p).add(V(-.6, 1.9, 0));
    dirty = true;
  }
  function fitDist(r) {
    const z = zoneRect(), t = Math.tan(camera.fov * Math.PI / 360);
    const dh = r / (t * camera.aspect * (z.w / W)), dv = r * .78 / (t * (z.h / H));
    return clamp(Math.max(dh, dv), 12, 120);
  }
  function zoneRect() { const z = o.zone ? o.zone() : null; return z && z.w > 80 && z.h > 80 ? z : { x: 0, y: 0, w: W, h: H }; }
  function layout() {
    W = innerWidth; H = innerHeight;
    lastDpr = devicePixelRatio || 1; const dpr = Math.min(2, lastDpr);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); composer.setPixelRatio(dpr); composer.setSize(W, H);
    camera.aspect = W / H;
    const z = zoneRect();
    camera.setViewOffset(W, H, W / 2 - (z.x + z.w / 2), H / 2 - (z.y + z.h / 2), W, H);
    camera.updateProjectionMatrix(); dirty = true;
  }
  function camStep(dt, snap) {
    if (cam.userT > 0) { cam.userT -= dt; if (cam.userT <= 0) focus(view, true); }
    if (mode === 'title' && st().motion) cam.d.az = .5 + Math.sin(T * .09) * .55;
    cam.d.dist = fitDist(cam.d.r || 18) * (cam.zoom || 1);
    const k = snap ? 1e3 : 2.4;
    cam.az = damp(cam.az, cam.d.az, k, dt); cam.pol = damp(cam.pol, cam.d.pol, k, dt); cam.dist = damp(cam.dist, cam.d.dist, k, dt);
    cam.tgt.x = damp(cam.tgt.x, cam.d.tgt.x, k, dt); cam.tgt.y = damp(cam.tgt.y, cam.d.tgt.y, k, dt); cam.tgt.z = damp(cam.tgt.z, cam.d.tgt.z, k, dt);
    const sp = Math.sin(cam.pol), sh = shake > 0 ? shake * .25 : 0;
    camera.position.set(cam.tgt.x + cam.dist * sp * Math.sin(cam.az) + (Math.random() - .5) * sh, cam.tgt.y + cam.dist * Math.cos(cam.pol) + (Math.random() - .5) * sh, cam.tgt.z + cam.dist * sp * Math.cos(cam.az));
    camera.lookAt(cam.tgt);
  }
  function bindInput(el) {
    let drag = null;
    el.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button,a,.stagecard,.glass')) return; drag = { x: e.clientX, y: e.clientY, az: cam.d.az, pol: cam.d.pol, moved: false }; });
    addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true; if (!drag.moved) return; cam.d.az = clamp(drag.az - dx * .004, -1.25, 1.35); cam.d.pol = clamp(drag.pol - dy * .0035, .35, 1.32); cam.userT = 9; dirty = true; });
    addEventListener('pointerup', () => { if (drag && drag.moved) api.dragged = performance.now(); drag = null; });
    el.addEventListener('wheel', e => { if (e.target.closest('.stagecard')) return; e.preventDefault(); cam.zoom = clamp((cam.zoom || 1) * (e.deltaY > 0 ? 1.1 : .9), .35, 1.6); cam.userT = 9; dirty = true; }, { passive: false });
    el.addEventListener('dblclick', e => { if (e.target.closest('button,.stagecard')) return; cam.zoom = 1; cam.userT = 0; focus(view, true); });
  }

  /* ------------------------------------------------------------------ modes + stages */
  function sendHome(b, mood = 'sleep') {
    if (b.job === 'home' && !b.moving && b.pos.distanceTo(b.home.p) < .1) { b.setMood(mood); return; }
    b.job = 'home'; b.role = null; const far = b.pos.distanceTo(b.home.p) > 5;
    b.fly([b.home.p], () => { b.face(V(0, 0, 0)); b.setMood(mood); }, far);
    b.setMood('idle');
  }
  function sendTo(b, p, lookAt, mood, job) {
    b.job = job || 'work'; const far = b.pos.distanceTo(p) > 5;
    b.fly([p], () => { b.face(lookAt); b.setMood(mood); }, far); b.setMood('idle');
  }
  function setMode(m) {
    mode = m; stage = null; candidates = null;
    if (!ready) return;
    packets.length = 0; arcs.forEach(a => killArc(a)); arcs.length = 0; drones.forEach(d => { scene.remove(d.g); d.label && d.label.e.remove(); }); drones.length = 0;
    sensors.forEach(s => s.s = 0); gateS = 0; gateRole = null; alert(false);
    Object.values(bots).forEach(b => { b.role = null; b.job = 'home'; b.place(b.home.p, b.yaw); b.face(V(0, 0, 0)); b.setMood(m === 'title' ? 'idle' : 'sleep'); });
    Object.values(humans).forEach(h => { h.role = null; h.me = false; h.place(h.desk.p, 0); h.setMood('work'); });
    if (m === 'game') { binderN = 0; binders.count = 0; binders.userData.born = []; drawSign(vaultS, 'aidlc/ · 0 artifacts', C.violet || '#A98BFF'); const me = humans[st().role]; if (me) me.me = true;
      order.forEach((k, i) => setTimeout(() => { if (mode === 'game' && bots[k].job === 'home') { bots[k].setMood('boot', .9); bots[k].pulse = 1; } }, 150 + i * 90)); }
    cam.userT = 0; cam.zoom = 1; focus(m === 'title' ? 'title' : 'all', true); layout(); idleT = 1.5;
  }
  function setStage(s) {
    stage = s; if (!ready) return;
    const ph = s.ph, used = {};
    sensors.forEach((x, i) => x.s = s.sens && !s.sens.includes(i) ? -1 : 0);
    if (gateS !== 1) gateS = 0;
    if (ph >= 1 && ph <= 4) {
      const tbl = anchors['room' + ph + '_table'].p.clone().add(V(0, 1, 0));
      const seat = i => anchors[`room${ph}_seat${i}`].p;
      const put = (k, spot, role, mood) => { const b = bots[k]; if (!b || used[k]) return; used[k] = 1; b.role = role; b.ringCol.set(role === 'lead' ? C.cyan : role === 'col' ? C.mag : C.amber); if (b.job !== 'work' || b.pos.distanceTo(spot) > .3) sendTo(b, spot, tbl, mood); else { b.setMood(mood); } b.workMood = mood; };
      if (s.lead && s.lead !== 'CND') put(s.lead, seat(0), 'lead', 'work');
      (s.col || []).forEach((k, i) => put(k, seat(1 + i % 5), 'col', 'work'));
      if (s.rev) put(s.rev, anchors[`room${ph}_rev`].p, 'rev', 'review');
    }
    // While the player is still predicting the lead, nobody is tagged; the previous crew lingers if the room is the same.
    order.forEach(k => { const b = bots[k]; if (used[k] || !(b.role || b.job === 'work')) return; b.role = null; if (s.pending && ph === lastPh) b.setMood('idle'); else sendHome(b); });
    lastPh = ph;
    roomLights.forEach((l, i) => l.userData.on = (i + 1 === ph));
    const pc = new THREE.Color(phases[ph].c); hubMat.emissive.copy(pc); hubLight.color.copy(pc); cnd.pulse = 1;
    if (!alertOn) focus(ph === 0 ? 'hub' : s.pending ? 'docks' : 'room' + ph);
    dirty = true;
  }
  function roleMood(k, m, secs) { const b = bots[k]; if (b) b.setMood(m, secs); }

  /* ------------------------------------------------------------------ fx */
  const docTex = (() => { const s = canvasTex(64, 64), x = s.x; const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.35, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff'; x.fillRect(22, 16, 20, 28); x.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 0; i < 4; i++) x.fillRect(25, 21 + i * 5, i === 3 ? 8 : 14, 2); s.t.flipY = true; s.t.needsUpdate = true; return s.t; })();
  function packet(a, b, c, sp) {
    if (!ready || (!st().motion && mode === 'game')) { dirty = true; return; }
    if (packets.length > 70) { const p = packets.shift(); scene.remove(p.s); p.s.material.dispose(); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: docTex, color: new THREE.Color(c || colOf(a)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    s.scale.setScalar(.62); scene.add(s);
    packets.push({ a, b, s, t: 0, sp: (sp || 1) * (.8 + Math.random() * .3), side: (Math.random() - .5) * 2.4, c: c || colOf(a) });
  }
  function ringFx(p, c, big) {
    if (!ready || !st().motion) return;
    const m = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, Math.max(.05, p.y), p.z); scene.add(m); rings.push({ m, t: 0, life: big ? 1.3 : .8, big: big ? 5 : 1.6 });
  }
  function pulse(k, c) {
    if (!ready) return; dirty = true;
    if (k === 'CND') { cnd.pulse = 1; ringFx(V(0, .3, 0), c || C.cyan); return; }
    if (k === 'GATE') { ringFx(tmp.copy(anchors.gate.p).setY(.06), c || C.amber, true); return; }
    if (k === 'VAULT') { vaultFlash = 1; return; }
    const a = bots[k] || (k && k[0] === '@' && humans[k.slice(1)]); if (!a) return;
    a.pulse = 1; ringFx(tmp.copy(a.pos).setY(.06), c || colOf(k));
  }
  function speak(w, text, secs) {
    if (!ready) return; const a = w === 'CND' ? cnd : bots[w] || (w && w[0] === '@' && humans[w.slice(1)]); if (!a) return;
    const t = strip(text); const L = a.label; L.bb.textContent = t.length > 78 ? t.slice(0, 76) + '…' : t; L.bubT = Math.max(.35, (secs || clamp(1.6 + t.length * .028, 1.8, 4.2)) / (st().speed || 1));
    bubbles = bubbles.filter(x => x !== L && x.bubT > 0); bubbles.push(L); while (bubbles.length > 3) bubbles.shift().bubT = 0;
    if (a.setMood) a.setMood('talk', Math.min(L.bubT, 2.2)); a.talk = L.bubT; dirty = true;
  }
  function sensor(i, s) { if (!ready || !sensors[i]) return; sensors[i].s = s; sensors[i].t = 0; if (s === 3) shake = Math.max(shake, .25); if (s === 2 || s === 3) ringFx(tmp.copy(sensors[i].g.position).setY(.06), s === 2 ? C.good : C.bad); dirty = true; }
  function humanPath(h, toGate) {
    const edge = V(h.out.p.x, 0, -(LAYOUT.FY - 4.3)), stand = anchors.gate_stand.p;
    return toGate ? [h.out.p, edge, stand] : [edge, h.out.p, h.desk.p];
  }
  function gate(s, role) {
    if (!ready) return; dirty = true;
    if (s === 1) {
      gateS = 1; gateRole = role || gateRole; const h = humans[gateRole];
      if (gateHuman && gateHuman !== h) returnHuman(gateHuman);
      if (h) { gateHuman = h; h.role = 'gate'; h.setMood('read'); h.goTo(humanPath(h, true), () => { h.face(V(0, 1, 0)); }); }
      if (!alertOn) focus('gate');
    } else if (s === 2) {
      const h = gateHuman;
      const done = () => { gateS = 2; gateT = 1.7; ringFx(tmp.copy(anchors.gate.p).setY(.06), C.good, true); burst(anchors.gate.p, 26, [C.good, C.cyan, '#ffffff']); if (h) { h.setMood('cheer', .9); setTimeout(() => { if (gateHuman === h && gateS !== 1) returnHuman(h); }, 1100 / (st().speed || 1)); } };
      if (h && h.moving) { h.place(anchors.gate_stand.p, 0); }
      if (h && st().motion) { h.setMood('stamp', .9); setTimeout(done, 420 / (st().speed || 1)); } else done();
    } else { gateS = 0; if (gateHuman) returnHuman(gateHuman); }
  }
  function returnHuman(h) { h.role = null; if (gateHuman === h) gateHuman = null; h.setMood('work'); h.face(null); h.goTo(humanPath(h, false), () => { h.yawT = 0; }); }
  function humanMood(role, m, secs) { const h = humans[role]; if (h && ready) h.setMood(m, secs); }
  function vaultHit(color) {
    if (!ready) return; vaultFlash = 1; dirty = true;
    const per = Math.floor(LAYOUT.VAULT_LEN / LAYOUT.VAULT_PITCH); if (binderN >= binders.instanceMatrix.count) return;
    const i = binderN++, row = Math.floor(i / per) % LAYOUT.VAULT_ROWS, colI = i % per, a = anchors.vault.p;
    binders.userData.born[i] = { t: T, p: V(a.x, a.y + row * .6 + .21, a.z + 2.3 - colI * LAYOUT.VAULT_PITCH - .1), h: .85 + Math.random() * .3 };
    binders.setColorAt(i, new THREE.Color(color || (stage ? phases[stage.ph].c : C.violet))); binders.count = binderN; binders.instanceColor.needsUpdate = true;
    drawSign(vaultS, `aidlc/ · ${binderN} artifact${binderN === 1 ? '' : 's'}`, C.violet || '#A98BFF');
  }
  function swarm(names) {
    if (!ready) return; dirty = true;
    if (!names.length) { const dev = bots.DEV; drones.forEach(d => { d.target = dev.headPos(V()); d.label && d.label.e.remove(); d.label = null; }); pods.forEach((p, i) => podMats[i] && (podMats[i].emissiveIntensity = .6)); if (dev) setTimeout(() => { dev.pulse = 1; dev.setMood('happy', 1.5); }, 500); return; }
    names.forEach((n, i) => { const a = anchors['pod_' + (i % 4)], d = new Drone(o.droneProto, n, C.lime || '#8CFF6B'); d.home.copy(a.p); d.pos.copy(a.p).add(V(0, .3, 0)); d.label = mkLabel('sat'); d.label.nm.textContent = n.split('_').pop(); scene.add(d.g); drones.push(d); podMats[i % 4] && (podMats[i % 4].emissiveIntensity = 3.5); ringFx(tmp.copy(a.p).setY(.1), C.lime, true); });
  }
  function arc(a, b, c, label, life) {
    if (!ready) return; const A = pos(a).clone(), B = pos(b).clone(); A.y = B.y = .4;
    const mid = A.clone().add(B).multiplyScalar(.5); mid.y = 6.5; mid.multiplyScalar(.72); mid.y = 6.5;
    const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, .07, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    scene.add(m); const L = mkLabel('arc'); L.nm.textContent = label.toUpperCase(); L.e.style.setProperty('--c', c);
    arcs.push({ m, curve, c, t: 0, life: life / Math.min(2, st().speed || 1), L, next: 0 }); dirty = true;
    ringFx(tmp.copy(B).setY(.06), c, true);
  }
  function killArc(a) { scene.remove(a.m); a.m.geometry.dispose(); a.L.e.remove(); }
  function burst(p, n, cols, power = 1) {
    if (!ready || !st().motion) return; const P = confetti.userData.p;
    for (let i = 0; i < n; i++) { if (P.length >= 420) P.shift(); const a = Math.random() * 6.28, u = Math.random(); P.push({ p: V(p.x, p.y + .4, p.z), v: V(Math.cos(a) * (1 + u * 3) * power, (4 + Math.random() * 5) * power, Math.sin(a) * (1 + u * 3) * power), r: V(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: V(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4), c: new THREE.Color(cols[i % cols.length]), life: 2.6 + Math.random() }); }
  }
  function celebrate() {
    if (!ready) return; celebrateT = 4.5; dirty = true;
    const cols = [C.cyan, C.mag, C.amber, C.lime, C.violet, '#ffffff'];
    [[0, 0], [-8, 4], [8, 4], [-8, -5], [8, -5], [0, -8]].forEach(([x, z], i) => setTimeout(() => burst(V(x, 1, z), 60, cols, 1.25), i * 180));
    Object.values(bots).forEach(b => b.setMood('cheer', 4)); Object.values(humans).forEach(h => h.setMood('cheer', 4)); cnd.pulse = 1;
  }
  function alert(v) {
    alertOn = !!v; if (!ready) return; dirty = true;
    storm.g.visible = alertOn || storm.s > .02; if (alertOn) { storm.s = 0; stormDead = 0; bossHp = 100; }
    ledMat.emissive.set(alertOn ? '#FF2A3F' : '#5BF08F');
    nocData = alertOn ? { alert: true, budget: 100, hp: 100, p99: [], wave: 'Quarter-end surge' } : {};
    if (alertOn) {
      const c = anchors.room4_table.p, xs = order.filter(k => agents[k].k === 'x' || agents[k].k === 's'), n = xs.length;
      xs.forEach((k, i) => { const a = -Math.PI * .1 + i / (n - 1) * Math.PI * 1.15, b = bots[k]; b.role = null; sendTo(b, V(c.x + 1.2 + Math.cos(a) * 4.3, 0, c.z + Math.sin(a) * 3.6), anchors.storm.p, 'alarm', 'war'); });
      Object.values(humans).forEach(h => h.setMood('alarm')); focus('ops', true); cam.userT = 0;
    } else {
      Object.values(bots).forEach(b => { if (b.job === 'war') sendHome(b, 'idle'); }); Object.values(humans).forEach(h => h.setMood('work'));
      focus(stage ? (stage.ph ? 'room' + stage.ph : 'hub') : 'all', true);
    }
  }
  function boss(d) { if (!ready) return; Object.assign(nocData, d, { alert: true }); if (d.hp != null) { if (d.hp < bossHp - .5) storm.hit = Math.min(1, storm.hit + (bossHp - d.hp) / 60); bossHp = d.hp; } if (d.dead) { stormDead = 1; burst(storm.g.position, 120, [C.red, C.amber, '#ffffff'], 1.4); shake = .6; } if (d.reset) { stormDead = 0; storm.s = 0; bossHp = 100; } dirty = true; }
  function cast(k, c) {
    if (!ready) return; const b = bots[k]; if (!b) return; b.pulse = 1; b.setMood('happy', 1.2);
    if (!st().motion) return;
    const A = b.headPos(V()), B = storm.g.position.clone(), d = B.clone().sub(A), L = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, L, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(c || b.hex), transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.position.copy(A).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); scene.add(m); beams.push({ m, t: 0 });
  }
  function noc(d) { if (!alertOn) nocData = d || {}; nocT = 0; dirty = true; }
  function setCandidates(keys) { candidates = keys && keys.length ? keys : null; dirty = true; }

  /* ------------------------------------------------------------------ idle life */
  const POI = [['coffee', '☕'], ['arcade', '🎮'], ['cooler', '💧'], ['vault_in', '📚'], ['front', '🧹']];
  function idleLife(dt) {
    idleT -= dt; if (idleT > 0 || alertOn) return; idleT = mode === 'title' ? 2.2 + Math.random() * 2 : 5 + Math.random() * 6;
    const out = order.filter(k => bots[k].job === 'wander').length, max = mode === 'title' ? 5 : 2;
    const free = order.filter(k => bots[k].job === 'home' && !bots[k].moving && !bots[k].role && !(candidates && candidates.includes(k)));
    if (out >= max || !free.length) return;
    const k = free[Math.random() * free.length | 0], b = bots[k];
    if (Math.random() < .35 && free.length > 1) {                       // visit a colleague
      const o2 = bots[free.filter(x => x !== k)[Math.random() * (free.length - 1) | 0]];
      const p = o2.pos.clone().add(V().subVectors(b.pos, o2.pos).setY(0).normalize().multiplyScalar(1.3));
      b.job = 'wander'; b.fly([p], () => { b.face(o2.pos); b.setMood('talk', 3); o2.setMood('happy', 3); speakEmoji(b, ['💡', '🤝', '📎', '✅', '🧩'][Math.random() * 5 | 0]); packet(k, o2.key, b.hex, .8); setTimeout(() => { if (b.job === 'wander') sendHome(b, mode === 'title' ? 'idle' : 'sleep'); }, 3600); }, b.pos.distanceTo(p) > 5); b.setMood('idle');
    } else {
      const [name, emo] = POI[Math.random() * POI.length | 0], p = anchors[name].p.clone().add(V(Math.random() * 1.6 - .8, 0, Math.random() * 1.2 - .6)); p.y = 0;
      b.job = 'wander'; b.fly([p], () => { b.setMood('happy', 3.4); speakEmoji(b, emo); setTimeout(() => { if (b.job === 'wander') sendHome(b, mode === 'title' ? 'idle' : 'sleep'); }, 4200); }, true); b.setMood('idle');
    }
  }
  function speakEmoji(a, e) { a.label.bb.textContent = e; a.label.bubT = 2.6; }

  /* ------------------------------------------------------------------ frame */
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S3 = V(1, 1, 1);
  function project(p, L, show, dy = 0) {
    tmp.copy(p).project(camera);
    const ok = show && tmp.z < 1 && tmp.x > -1.1 && tmp.x < 1.1 && tmp.y > -1.1 && tmp.y < 1.1;
    if (ok !== L.on) { L.on = ok; L.e.classList.toggle('on', ok); }
    if (ok) L.e.style.transform = `translate(${((tmp.x * .5 + .5) * W).toFixed(1)}px,${((-tmp.y * .5 + .5) * H + dy).toFixed(1)}px)`;
  }
  function tick(dt, snap) {
    const s = st(), spd = clamp(s.speed || 1, 1, 3);
    T += dt;
    // conductor
    cnd.pulse = Math.max(0, cnd.pulse - dt * 1.4);
    cnd.g.position.y = 2.0 + Math.sin(T * 1.4) * .08; cnd.core.rotation.y += dt * .8; cnd.core.scale.setScalar(1 + cnd.pulse * .35 + Math.sin(T * 3) * .03);
    cnd.rings[0].rotation.y += dt * (1.1 + cnd.pulse * 5); cnd.rings[1].rotation.x += dt * (.8 + cnd.pulse * 4); cnd.rings[2].rotation.z += dt * (.6 + cnd.pulse * 3);
    cnd.beam.material.opacity = .1 + cnd.pulse * .25 + Math.sin(T * 5) * .02; cnd.beam.material.color.copy(hubMat.emissive);
    hubMat.emissiveIntensity = 1.5 + cnd.pulse * 2.5 + Math.sin(T * 2) * .25;
    // actors
    for (const k of order) { const b = bots[k]; b.speed = 3.6 * spd; b.step(dt, T, snap); b.dockRing.material.emissiveIntensity = b.job === 'home' && !b.moving ? 1.6 + Math.sin(T * 2 + b.seed) * .4 : .35; }
    for (const k of roles) { const h = humans[k]; h.speed = 3.1 * spd; h.step(dt, T, snap); }
    for (let i = drones.length - 1; i >= 0; i--) { const d = drones[i]; d.step(dt, T, snap); if (d.dead) { scene.remove(d.g); drones.splice(i, 1); } }
    if (!alertOn && !snap) idleLife(dt);
    // roomba
    if (!snap) { const r = roomba; if (r.wait > 0) r.wait -= dt; else { const d = tmp.subVectors(r.tgt, r.g.position); d.y = 0; const L = d.length(); if (L < .2) { r.tgt.set(Math.random() * 9 - 4.5, 0, 7 + Math.random() * 4.5); r.wait = .6; } else { r.g.position.addScaledVector(d, Math.min(1, 1.1 * dt / L)); r.g.rotation.y = damp(r.g.rotation.y, Math.atan2(d.x, d.z), 4, dt); } } }
    // room + alarm lights
    roomLights.forEach(l => l.intensity = damp(l.intensity, l.userData.base * (l.userData.on ? 1.5 : mode === 'title' ? 1 : .6) * (alertOn ? .35 : 1), 3, dt));
    const al = alertOn ? 1 : 0; alarmLight.intensity = damp(alarmLight.intensity, al * 900, 4, dt);
    alarmLight.target.position.set(alarmLight.position.x + Math.cos(T * 4) * 8, 0, alarmLight.position.z + Math.sin(T * 4) * 8);
    if (mats.m_beacon) mats.m_beacon.emissiveIntensity = alertOn ? 3 + Math.sin(T * 12) * 2.5 : .3;
    if (ledMat) ledMat.emissiveIntensity = alertOn ? 2.5 + Math.sin(T * 16) * 2 : 1.6 + Math.sin(T * 3) * .4;
    hemi.intensity = hemiBase * (alertOn ? .55 + .1 * Math.sin(T * 6) : 1);
    // sensors
    sensors.forEach((x, i) => { x.t += dt; const c = x.s === 1 ? C.cyan : x.s === 2 ? C.good : x.s === 3 ? C.bad : '#5A6784'; x.lamp.emissive.set(c); x.lamp.emissiveIntensity = x.s === -1 ? .08 : x.s === 0 ? .5 : x.s === 1 ? 3 + Math.sin(T * 22) * 2 : 3.2; x.g.position.y = damp(x.g.position.y, x.s === -1 ? -.55 : 0, 6, dt); x.g.rotation.z = x.s === 3 && x.t < .5 ? Math.sin(x.t * 60) * .12 : 0; });
    // gate
    if (gateS === 2) { gateT -= dt * spd; if (gateT <= 0) gateS = 0; }
    const gc = gateS === 1 ? (C[gateRole] || C.amber) : gateS === 2 ? C.good : '#55607A';
    gateMat.emissive.set(gc); gateMat.emissiveIntensity = gateS === 1 ? 2.2 + Math.sin(T * 6) * 1.3 : gateS === 2 ? 4.5 : .5;
    gateLight.color.set(gc); gateLight.intensity = damp(gateLight.intensity, gateS ? 40 : 0, 5, dt);
    gateArm.rotation.z = damp(gateArm.rotation.z, gateS === 2 ? 1.38 : 0, gateS === 2 ? 9 : 3, dt);
    // vault binders
    vaultFlash = Math.max(0, vaultFlash - dt * 1.5); if (mats.e_violet) mats.e_violet.emissiveIntensity = 3 + vaultFlash * 6;
    if (binders.count) { const born = binders.userData.born; let ch = false; for (let i = Math.max(0, binders.count - 14); i < binders.count; i++) { const b = born[i]; if (!b) continue; const a = snap ? 1 : clamp((T - b.t) * 3, 0, 1); if (b.done) continue; ch = true; const e = 1 - Math.pow(1 - a, 3); S3.set(1, b.h * (a < 1 ? e * (1 + .3 * Math.sin(a * Math.PI)) : 1), 1); M4.compose(tmp.copy(b.p).setX(b.p.x + (1 - e) * 1.0), Q.identity(), S3); binders.setMatrixAt(i, M4); if (a >= 1) b.done = true; } if (ch) binders.instanceMatrix.needsUpdate = true; }
    // packets
    for (let i = packets.length - 1; i >= 0; i--) { const p = packets[i]; p.t += dt * .85 * p.sp * spd; const A = pos(p.a, tmp), B = pos(p.b, tmp2), u = Math.min(1, p.t), e = u * u * (3 - 2 * u); const L = A.distanceTo(B);
      p.s.position.lerpVectors(A, B, e); p.s.position.y += Math.sin(u * Math.PI) * (1.2 + L * .16); p.s.position.x += Math.sin(u * Math.PI) * p.side * .3; p.s.material.opacity = Math.min(1, u * 6, (1 - u) * 5 + .15); p.s.material.rotation = Math.sin(T * 6 + i) * .35;
      if (p.t >= 1) { if (typeof p.b === 'string') { const tb = bots[p.b]; if (tb) tb.pulse = Math.max(tb.pulse, .6); else if (p.b === 'CND') cnd.pulse = Math.max(cnd.pulse, .5); else if (p.b === 'VAULT') vaultFlash = 1; } scene.remove(p.s); p.s.material.dispose(); packets.splice(i, 1); } }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const f = r.t / r.life; r.m.scale.setScalar(.5 + f * r.big); r.m.material.opacity = (1 - f) * .9; if (f >= 1) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); } }
    for (let i = beams.length - 1; i >= 0; i--) { const b = beams[i]; b.t += dt; b.m.material.opacity = Math.max(0, 1 - b.t * 2.2); b.m.scale.x = b.m.scale.z = 1 + b.t * 3; if (b.t > .45) { scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); beams.splice(i, 1); } }
    for (let i = arcs.length - 1; i >= 0; i--) { const a = arcs[i]; a.t += dt; a.m.material.opacity = Math.min(1, (a.life - a.t) / .6, a.t / .25 + .2) * (.7 + .3 * Math.sin(T * 9)); a.next -= dt; if (a.next <= 0 && s.motion) { a.next = .22; const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: docTex, color: new THREE.Color(a.c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp2.scale.setScalar(.7); scene.add(sp2); a.beads = a.beads || []; a.beads.push({ s: sp2, u: 0 }); }
      (a.beads || []).forEach(b => { b.u += dt * .7; a.curve.getPoint(Math.min(1, b.u), b.s.position); }); a.beads = (a.beads || []).filter(b => { if (b.u >= 1) { scene.remove(b.s); b.s.material.dispose(); return false; } return true; });
      project(a.curve.getPoint(.5, tmp2), a.L, true, -14);
      if (a.t >= a.life) { (a.beads || []).forEach(b => { scene.remove(b.s); b.s.material.dispose(); }); killArc(a); arcs.splice(i, 1); } }
    // confetti
    { const P = confetti.userData.p; for (let i = P.length - 1; i >= 0; i--) { const c = P[i]; c.life -= dt; c.v.y -= 9.8 * dt; c.v.multiplyScalar(1 - .9 * dt); c.p.addScaledVector(c.v, dt); c.r.addScaledVector(c.w, dt); if (c.p.y < .03) { c.p.y = .03; c.v.set(0, 0, 0); c.w.set(0, 0, 0); } if (c.life <= 0) P.splice(i, 1); }
      confetti.count = P.length; P.forEach((c, i) => { E.set(c.r.x, c.r.y, c.r.z); Q.setFromEuler(E); S3.setScalar(Math.min(1, c.life * 2)); M4.compose(c.p, Q, S3); confetti.setMatrixAt(i, M4); confetti.setColorAt(i, c.c); }); if (P.length) { confetti.instanceMatrix.needsUpdate = true; confetti.instanceColor && (confetti.instanceColor.needsUpdate = true); } }
    if (celebrateT > 0) { celebrateT -= dt; hubLight.color.setHSL((T * .6) % 1, 1, .6); if (celebrateT <= 0 && stage) hubLight.color.set(phases[stage.ph].c); }
    // storm
    storm.hit = Math.max(0, storm.hit - dt * 2.5);
    const sT = stormDead ? 0 : alertOn ? .8 + .95 * bossHp / 100 : 0; storm.s = damp(storm.s, sT, stormDead ? 5 : 2.5, dt);
    if (storm.s > .02 || alertOn) { storm.g.visible = true; storm.g.scale.setScalar(Math.max(.001, storm.s) * (1 + storm.hit * .2)); storm.body.rotation.y += dt * (1.2 + storm.hit * 8); storm.body.rotation.x = Math.sin(T * 1.7) * .25; storm.g.position.copy(anchors.storm.p).add(tmp.set((Math.random() - .5) * storm.hit * .4, Math.sin(T * 2.2) * .25, (Math.random() - .5) * storm.hit * .4)); storm.light.intensity = 260 * storm.s * (1 + .3 * Math.sin(T * 9)); mats.storm && (mats.storm.emissiveIntensity = 2 + Math.sin(T * 8) * .8 + storm.hit * 5);
      storm.g.lookAt(camera.position.x, storm.g.position.y, camera.position.z); if ((T * 10 | 0) % 2 === 0) drawStormFace(stormS, bossHp, T, stormDead); } else storm.g.visible = false;
    if (mats.m_arcade) mats.m_arcade.emissive.setHSL((T * .12) % 1, .8, .55);
    shake = Math.max(0, shake - dt * 1.6);
    // screens
    boardT -= dt; if (boardT <= 0) { boardT = .5; drawBoard(boardS, o.board ? o.board() : { mode }, T); }
    nocT -= dt; if (nocT <= 0) { nocT = alertOn ? .2 : .5; drawNoc(nocS, nocData, T); }
    camStep(dt, snap);
    // labels
    for (const k of order) { const b = bots[k], L = b.label; if (L.bubT > 0) L.bubT -= dt; const cand = candidates && candidates.includes(k);
      const show = !!b.role || hover === k || cand || L.bubT > 0 || (mode === 'title' && b.job === 'wander') || (alertOn && b.job === 'war' && b.pulse > 0);
      L.tg.textContent = cand ? 'PICK?' : b.role === 'lead' ? 'LEAD' : b.role === 'col' ? 'SUPPORT' : b.role === 'rev' ? 'REVIEW' : ''; L.e.classList.toggle('bub', L.bubT > 0); L.e.classList.toggle('cand', !!cand);
      if (cand) { b.ringCol.set('#ffffff'); b.ringA = Math.max(b.ringA, .8); if (b.mood === 'sleep') b.setMood('idle', .5); }
      project(b.headPos(tmp2), L, show); }
    for (const k of roles) { const h = humans[k], L = h.label; if (L.bubT > 0) L.bubT -= dt; L.tg.textContent = h.role === 'gate' ? 'GATE' : h.me ? 'YOU' : ''; L.e.classList.toggle('bub', L.bubT > 0); project(h.headPos(tmp2), L, mode === 'game' && (!!h.role || h.me || hover === '@' + k || L.bubT > 0)); }
    { const L = cnd.label; if (L.bubT > 0) L.bubT -= dt; L.e.classList.toggle('bub', L.bubT > 0); project(tmp2.set(0, 2.9, 0), L, hover === 'CND' || L.bubT > 0 || (stage && stage.ph === 0 && mode === 'game')); L.tg.textContent = stage && stage.ph === 0 ? 'ENGINE' : ''; }
    sensors.forEach((x, i) => project(tmp2.copy(x.g.position).setY(1.45), x.label, mode === 'game' && (hover === 'SENS:' + i || x.s === 1 || x.s === 3)));
    drones.forEach(d => d.label && project(d.headPos(tmp2), d.label, true));
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!ready || document.hidden) { last = now; return; }
    if (innerWidth !== W || innerHeight !== H || (devicePixelRatio || 1) !== lastDpr) layout();
    const mot = st().motion || mode === 'title';
    if (!mot) { if (!dirty && now - lastRender < 400) { last = now; return; } }
    const dt = Math.min(.05, (now - last) / 1000); last = now; lastRender = now; dirty = false;
    tick(mot ? dt : .4, !mot);
    composer.render();
  }

  /* ------------------------------------------------------------------ picking */
  function hit(x, y) {
    if (!ready) return null; let best = null, bd = 1e9;
    const test = (k, p, r) => { tmp.copy(p).project(camera); if (tmp.z > 1) return; const sx = (tmp.x * .5 + .5) * W, sy = (-tmp.y * .5 + .5) * H; const dist = camera.position.distanceTo(p), ppm = H / (2 * Math.tan(camera.fov * Math.PI / 360) * dist); const d = Math.hypot(sx - x, sy - y); if (d < r * ppm && d < bd) { bd = d; best = k; } };
    for (const k of order) test(k, tmp2.copy(bots[k].g.position).add(V(0, .85 + bots[k].alt, 0)), .75);
    for (const k of roles) test('@' + k, tmp2.copy(humans[k].g.position).add(V(0, .9, 0)), .7);
    test('CND', tmp2.set(0, 2.0, 0), .9); test('VAULT', tmp2.copy(anchors.vault.p).add(V(.2, 1.5, 0)), 2.0); test('GATE', tmp2.copy(anchors.gate.p).add(V(0, .3, 0)), 1.5);
    sensors.forEach((s, i) => test('SENS:' + i, tmp2.copy(s.g.position).setY(.8), .5));
    return best;
  }

  const api = {
    start() { colors(); layout(); addEventListener('resize', layout); requestAnimationFrame(frame); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { colors(); boardT = 0; }); },
    layout, colors, setMode, setStage, pulse, packet, sensor, gate, vaultHit, swarm, alert, celebrate, speak, humanMood, roleMood, boss, cast, noc, setCandidates, hit, bindInput, focus,
    loopback: (a, b, label) => arc(a, b, C.mag, label || 'backward jump', 3.4),
    feedback: () => { arc('ROOM:4', 'ROOM:1', C.lime, 'feedback → next intent', 6); if (st().motion) for (let i = 0; i < 6; i++) setTimeout(() => packet('OPS', 'PRD', C.lime, .7), i * 260); },
    setHover(k) { if (k !== hover) { hover = k; dirty = true; } },
    reset() { packets.forEach(p => scene.remove(p.s)); packets.length = 0; dirty = true; },
    dirty() { dirty = true; },
    info: () => ({ ready, gateS, gateRole, files: binderN, stage }),
    get ready() { return ready; }, dragged: 0,
    _debug: { scene, camera, cam, bots, humans, anchors, renderer },
  };
  return api;
}

window.Office3D = { create };
