// Characters: rigid-part bots, humans, swarm drones. All animation is procedural.
import * as THREE from 'three';
import { canvasTex, drawFace } from './screens.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDamp = (a, b, k, dt) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * (1 - Math.exp(-k * dt)); };

// Clone a named material once per owner so each character can be tinted independently.
export function tintMaterials(root, map) {
  const cache = {};
  root.traverse(o => {
    if (!o.isMesh) return;
    const n = o.material && o.material.name;
    if (map[n]) { cache[n] = cache[n] || map[n](o.material.clone()); o.material = cache[n]; }
  });
  return cache;
}

class Actor {
  constructor(key, root) {
    this.key = key;
    this.g = new THREE.Group();
    this.inner = new THREE.Group();
    this.g.add(this.inner); this.inner.add(root);
    root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
    this.pos = V(); this.yaw = 0; this.yawT = 0;
    this.path = []; this.speed = 3.4; this.moving = false; this.onArrive = null;
    this.lookAt = null;            // world point to face when idle
    this.mood = 'idle'; this.moodT = 0; this.baseMood = 'idle';
    this.pulse = 0; this.cheer = 0; this.talk = 0;
    this.seed = Math.random() * 100;
    this.role = null; this.visible = true; this.height = 1.4;
    this.part = n => root.getObjectByName(key + '_' + n);
  }
  place(p, yaw) { this.pos.copy(p); this.path.length = 0; this.moving = false; if (yaw != null) this.yaw = this.yawT = yaw; this.g.position.copy(this.pos); }
  goTo(points, onArrive) { this.path = points.map(p => p.clone()); this.onArrive = onArrive || null; this.moving = this.path.length > 0; }
  setMood(m, secs) { if (secs) { this.mood = m; this.moodT = secs; } else { this.baseMood = m; if (this.moodT <= 0) this.mood = m; } }
  headPos(out) { return out.copy(this.g.position).add(V(0, this.height, 0)); }
  face(p) { this.lookAt = p ? p.clone() : null; }
  step(dt, t, snap) {
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood = this.baseMood; }
    this.pulse = Math.max(0, this.pulse - dt * 2.2);
    this.talk = Math.max(0, this.talk - dt);
    let v = 0;
    if (this.path.length) {
      const tgt = this.path[0];
      const d = V().subVectors(tgt, this.pos); const flat = Math.hypot(d.x, d.z), L = d.length();
      const stepLen = snap ? Infinity : this.speed * dt;
      if (L <= stepLen) { this.pos.copy(tgt); this.path.shift(); if (!this.path.length) { this.moving = false; const f = this.onArrive; this.onArrive = null; f && f(); } }
      else { this.pos.addScaledVector(d, stepLen / L); v = this.speed; }
      if (flat > .05) this.yawT = Math.atan2(d.x, d.z);
    } else if (this.lookAt) {
      const d = V().subVectors(this.lookAt, this.pos);
      if (Math.hypot(d.x, d.z) > .2) this.yawT = Math.atan2(d.x, d.z);
    }
    this.yaw = snap ? this.yawT : angDamp(this.yaw, this.yawT, 9, dt);
    this.vel = v;
    this.g.position.copy(this.pos);
    this.g.rotation.y = this.yaw;
    this.g.visible = this.visible;
  }
}

/* ------------------------------------------------------------------ bots */
export class Bot extends Actor {
  constructor(key, root, color) {
    super(key, root);
    this.color = new THREE.Color(color); this.hex = color;
    this.hover = .26; this.alt = 0; this.altT = 0; this.height = 1.5;
    this.body = this.part('body'); this.head = this.part('head'); this.armL = this.part('armL'); this.armR = this.part('armR');
    this.headY = this.head.position.y;
    const mats = tintMaterials(root, {
      accent: m => { m.color.copy(this.color); return m; },
      accent_glow: m => { m.color.copy(this.color).multiplyScalar(.25); m.emissive.copy(this.color); m.emissiveIntensity = 2.2; return m; },
    });
    this.glow = mats.accent_glow;
    const fm = this.part('face');
    this.faceS = canvasTex(128, 76);
    fm.material = new THREE.MeshBasicMaterial({ map: this.faceS.t, toneMapped: false });
    fm.material.color.setScalar(1.5);
    this.faceT = 0; this.lastMood = '';
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    fm.castShadow = false;
    // role ring on the floor
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.5, .6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = .03;
    this.g.add(this.ring);
    this.ringCol = new THREE.Color('#ffffff'); this.ringA = 0;
  }
  fly(points, onArrive, far) {
    // long trips: lift off, cruise high, land
    this.altT = far ? 2.3 : 0; this.landing = far;
    this.goTo(points, () => { this.altT = 0; onArrive && onArrive(); });
  }
  step(dt, t, snap) {
    super.step(dt, t, snap);
    if (this.moving && this.landing && this.path.length === 1) { const d = Math.hypot(this.path[0].x - this.pos.x, this.path[0].z - this.pos.z); if (d < 3.2) this.altT = 0; }
    this.alt = snap ? this.altT : damp(this.alt, this.altT, 3.2, dt);
    const m = this.mood, s = this.seed;
    const sleeping = m === 'sleep';
    const bob = Math.sin(t * (sleeping ? 1.1 : 2.1) + s) * (sleeping ? .025 : .05);
    const hop = this.pulse > 0 ? Math.sin((1 - this.pulse) * Math.PI) * .22 : 0;
    const cheer = m === 'cheer' ? Math.abs(Math.sin(t * 7 + s)) * .35 : 0;
    this.inner.position.y = this.hover * (sleeping ? .35 : 1) + this.alt + bob + hop + cheer;
    const lean = Math.min(.32, (this.vel || 0) * .075);
    this.inner.rotation.x = damp(this.inner.rotation.x, lean, 8, dt);
    this.inner.rotation.z = Math.sin(t * 1.3 + s) * .03 + (m === 'cheer' ? Math.sin(t * 9 + s) * .18 : 0);
    if (m === 'cheer') this.inner.rotation.y += dt * 6; else this.inner.rotation.y = damp(this.inner.rotation.y % (Math.PI * 2), 0, 6, dt);
    // head
    const h = this.head.rotation;
    let hy = Math.sin(t * .6 + s * 2) * .22, hx = 0, hz = 0;
    if (m === 'talk') { hx = Math.sin(t * 9 + s) * .08; hy *= .4; }
    else if (m === 'think') { hz = .22; hy = .3; }
    else if (m === 'work') { hx = .2; hy = Math.sin(t * 2.4 + s) * .1; }
    else if (m === 'review') { hx = .12; hy = Math.sin(t * 1.6 + s) * .3; }
    else if (sleeping) { hx = .34; hy = 0; }
    else if (m === 'alarm') { hy = Math.sin(t * 13 + s) * .25; }
    h.x = damp(h.x, hx, 8, dt); h.y = damp(h.y, hy, 6, dt); h.z = damp(h.z, hz, 6, dt);
    this.head.position.y = this.headY + (m === 'talk' ? Math.abs(Math.sin(t * 9 + s)) * .02 : 0);
    // arms: rotation.x negative = forward
    let ax = Math.sin(t * 1.7 + s) * .12, bx = -ax, az = .1;
    if (this.vel > .5) { ax = bx = .75; }
    else if (m === 'work') { ax = -1.25 + Math.sin(t * 16 + s) * .22; bx = -1.25 + Math.cos(t * 14 + s) * .22; }
    else if (m === 'talk') { ax = -.5 + Math.sin(t * 6 + s) * .5; bx = -.3; }
    else if (m === 'think') { bx = -2.0; }
    else if (m === 'review') { bx = -1.5 + Math.sin(t * 3 + s) * .15; }
    else if (m === 'cheer' || m === 'happy' && this.moodT > 0) { ax = bx = 0; az = 2.6 + Math.sin(t * 10 + s) * .25; }
    else if (m === 'alarm') { ax = bx = -2.6 + Math.sin(t * 20 + s) * .3; az = .5; }
    else if (sleeping) { ax = bx = .1; az = .05; }
    this.armL.rotation.x = damp(this.armL.rotation.x, ax, 10, dt); this.armR.rotation.x = damp(this.armR.rotation.x, bx, 10, dt);
    this.armL.rotation.z = damp(this.armL.rotation.z, -az, 10, dt); this.armR.rotation.z = damp(this.armR.rotation.z, az, 10, dt);
    // thruster + ring
    this.glow.emissiveIntensity = (sleeping ? .5 : 2) + this.alt * 1.6 + this.pulse * 5 + Math.sin(t * 20 + s) * .25;
    this.ringA = damp(this.ringA, this.role ? .95 : 0, 6, dt);
    this.ring.material.opacity = this.ringA * (.7 + .3 * Math.sin(t * 4 + s));
    this.ring.material.color.copy(this.ringCol);
    this.ring.scale.setScalar(1 + this.pulse * .5);
    // face (redraw at a low rate; moods with motion redraw faster)
    this.faceT -= dt;
    if (this.faceT <= 0 || m !== this.lastMood) {
      this.faceT = (m === 'talk' || m === 'work' || m === 'alarm' || m === 'boot') ? .09 : .22;
      this.lastMood = m; drawFace(this.faceS, m, t, this.hex, s);
    }
  }
}

/* ------------------------------------------------------------------ humans */
export class Human extends Actor {
  constructor(key, root, color) {
    super(key, root);
    this.hex = color; this.color = new THREE.Color(color); this.height = 1.85; this.speed = 3.0;
    this.torso = this.part('torso'); this.head = this.part('head');
    this.armL = this.part('armL'); this.armR = this.part('armR'); this.legL = this.part('legL'); this.legR = this.part('legR');
    tintMaterials(root, { ['role_' + key]: m => { m.color.copy(this.color).multiplyScalar(.9); return m; } });
    root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.walk = 0; this.ground = () => 0; this.stamp = 0;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.42, .5, 40), new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = .03; this.g.add(this.ring); this.ringA = 0; this.me = false;
  }
  step(dt, t, snap) {
    super.step(dt, t, snap);
    this.pos.y = this.ground(this.pos.x, this.pos.z); this.g.position.y = this.pos.y;
    const m = this.mood, s = this.seed, walking = this.vel > .5;
    this.walk += dt * (walking ? 11 : 0);
    const sw = walking ? Math.sin(this.walk) * .75 : 0;
    this.legL.rotation.x = damp(this.legL.rotation.x, sw, 14, dt); this.legR.rotation.x = damp(this.legR.rotation.x, -sw, 14, dt);
    const cheer = m === 'cheer' ? Math.abs(Math.sin(t * 8 + s)) * .22 : 0;
    this.inner.position.y = (walking ? Math.abs(Math.cos(this.walk)) * .05 : Math.sin(t * 1.6 + s) * .008) + cheer;
    let ax = -sw * .8, bx = sw * .8, az = .08, hx = 0, hy = Math.sin(t * .5 + s) * .2, hz = 0;
    if (!walking) {
      if (m === 'work') { ax = -1.05 + Math.sin(t * 13 + s) * .12; bx = -1.05 + Math.cos(t * 12 + s) * .12; hx = .15; hy *= .3; }
      else if (m === 'think') { bx = -2.35; hz = .14; hy = .25; hx = -.1; }
      else if (m === 'talk') { ax = -.6 + Math.sin(t * 6 + s) * .4; bx = -.9 + Math.cos(t * 5 + s) * .5; hx = Math.sin(t * 8) * .05; }
      else if (m === 'read') { ax = bx = -1.35; hx = .32; hy = Math.sin(t * 1.2 + s) * .12; }
      else if (m === 'stamp') { const k = Math.max(0, this.moodT); bx = -2.9 + Math.max(0, 1 - Math.abs(k - .45) * 3.2) * 1.9; hx = .2; }
      else if (m === 'cheer') { ax = bx = 0; az = 2.7 + Math.sin(t * 11 + s) * .2; }
      else if (m === 'alarm') { ax = -2.2; bx = -2.2; az = .5; hy = Math.sin(t * 9 + s) * .3; }
      else { ax = Math.sin(t * 1.2 + s) * .06; bx = -ax; }
    }
    this.armL.rotation.x = damp(this.armL.rotation.x, ax, 12, dt); this.armR.rotation.x = damp(this.armR.rotation.x, bx, 12, dt);
    this.armL.rotation.z = damp(this.armL.rotation.z, -az, 12, dt); this.armR.rotation.z = damp(this.armR.rotation.z, az, 12, dt);
    const h = this.head.rotation; h.x = damp(h.x, hx, 8, dt); h.y = damp(h.y, hy, 5, dt); h.z = damp(h.z, hz, 6, dt);
    this.ringA = damp(this.ringA, this.role || this.me ? .9 : 0, 6, dt);
    this.ring.material.opacity = this.ringA * (this.role ? .65 + .35 * Math.sin(t * 5) : .45);
  }
}

/* ------------------------------------------------------------------ swarm drones */
export class Drone {
  constructor(proto, label, color) {
    this.g = proto.clone(true); this.label = label; this.pos = V(); this.t0 = Math.random() * 10; this.life = 0; this.dying = 0; this.home = V(); this.target = null;
    this.color = new THREE.Color(color);
    this.g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    const mats = tintMaterials(this.g, {
      accent: m => { m.color.copy(this.color); return m; },
      accent_glow: m => { m.color.copy(this.color).multiplyScalar(.25); m.emissive.copy(this.color); m.emissiveIntensity = 2.5; return m; },
    });
    const f = this.g.getObjectByName('drone_face');
    this.faceS = canvasTex(96, 48);
    f.material = new THREE.MeshBasicMaterial({ map: this.faceS.t, toneMapped: false }); f.material.color.setScalar(1.5); f.castShadow = false;
    this.faceT = 0;
  }
  headPos(out) { return out.copy(this.g.position).add(V(0, .45, 0)); }
  step(dt, t, snap) {
    this.life += dt;
    const grow = snap ? 1 : Math.min(1, this.life * 2.5);
    if (this.target) { const d = V().subVectors(this.target, this.pos), L = d.length(); if (L < .3 || snap) { this.dead = true; } else this.pos.addScaledVector(d, Math.min(1, 7 * dt / L)); }
    else { this.pos.set(this.home.x + Math.sin(t * 1.3 + this.t0) * .12, this.home.y + 1.25 + Math.sin(t * 2.2 + this.t0) * .1, this.home.z + Math.cos(t * 1.1 + this.t0) * .12); }
    this.g.position.copy(this.pos); this.g.scale.setScalar(grow * (this.target ? .8 : 1.15));
    this.g.rotation.y = Math.sin(t * .8 + this.t0) * .5 - Math.PI / 2;
    this.faceT -= dt; if (this.faceT <= 0) { this.faceT = .1; drawFace(this.faceS, 'work', t, '#' + this.color.getHexString(), this.t0); }
  }
}

export { V, damp, angDamp };
