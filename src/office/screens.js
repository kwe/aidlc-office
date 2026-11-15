// Canvas-drawn surfaces: floor markings, bot faces, mission board, NOC wall, vault sign.
import * as THREE from 'three';

export function canvasTex(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;                      // match glTF UV convention
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { c, x: c.getContext('2d'), t };
}
const FONT_D = "'Space Grotesk',system-ui,sans-serif";
const FONT_M = "'JetBrains Mono',ui-monospace,Menlo,monospace";
const rgba = (hex, a) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};
function rr(x, X, Y, W, H, R) {
  x.beginPath();
  if (x.roundRect) x.roundRect(X, Y, W, H, R); else x.rect(X, Y, W, H);
}

/* ---------- floor: zones, labels and the lifecycle loop painted on the ground ---------- */
// Canvas maps the floor top-down: left = -x, top = back of the office.
export function drawFloor(S, { fx, fy, rooms, roomW, roomD, phases, light, hubLabel }) {
  const { c, x } = S, W = c.width, H = c.height;
  const px = v => (v + fx) / (2 * fx) * W, pz = v => (v + fy) / (2 * fy) * H, k = W / (2 * fx);
  x.fillStyle = light ? '#C9D3E6' : '#19223A';
  x.fillRect(0, 0, W, H);
  // tiles
  x.strokeStyle = light ? 'rgba(40,60,110,.10)' : 'rgba(130,170,255,.055)';
  x.lineWidth = 1.5;
  for (let i = -fx; i <= fx; i += 1) { x.beginPath(); x.moveTo(px(i), 0); x.lineTo(px(i), H); x.stroke(); }
  for (let j = -fy; j <= fy; j += 1) { x.beginPath(); x.moveTo(0, pz(j)); x.lineTo(W, pz(j)); x.stroke(); }
  // hub rings
  x.save(); x.translate(px(0), pz(0));
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 7.5 * k);
  g.addColorStop(0, light ? 'rgba(0,144,184,.16)' : 'rgba(56,225,255,.13)'); g.addColorStop(1, 'rgba(56,225,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, 7.5 * k, 0, 7); x.fill();
  x.strokeStyle = light ? 'rgba(20,60,120,.28)' : 'rgba(130,190,255,.22)'; x.lineWidth = 3; x.setLineDash([10, 14]);
  x.beginPath(); x.arc(0, 0, 3.6 * k, 0, 7); x.stroke();
  x.setLineDash([]); x.lineWidth = 2;
  x.beginPath(); x.arc(0, 0, 5.9 * k, 0, 7); x.stroke();
  x.restore();
  // rooms
  rooms.forEach((r, i) => {
    const ph = phases[i + 1], X = px(r.x - roomW / 2), Y = pz(r.z - roomD / 2), w = roomW * k, h = roomD * k;
    x.fillStyle = rgba(ph.c, light ? .10 : .06);
    rr(x, X, Y, w, h, 26); x.fill();
    x.strokeStyle = rgba(ph.c, light ? .75 : .55); x.lineWidth = 5;
    x.setLineDash([26, 14]); rr(x, X, Y, w, h, 26); x.stroke(); x.setLineDash([]);
    // corner ticks
    x.lineWidth = 9; x.strokeStyle = rgba(ph.c, .95);
    [[X, Y, 1, 1], [X + w, Y, -1, 1], [X, Y + h, 1, -1], [X + w, Y + h, -1, -1]].forEach(([cx, cy, sx, sy]) => {
      x.beginPath(); x.moveTo(cx + sx * 46, cy); x.lineTo(cx, cy); x.lineTo(cx, cy + sy * 46); x.stroke();
    });
    // label along the edge that faces the hub
    const front = r.z > 0;                                    // front rooms: label on their top edge
    x.fillStyle = rgba(ph.c, light ? .95 : .9);
    x.font = `700 ${Math.round(.62 * k)}px ${FONT_D}`; x.textAlign = r.x < 0 ? 'left' : 'right'; x.textBaseline = 'middle';
    const tx = r.x < 0 ? X + 30 : X + w - 30, ty = front ? Y - .55 * k : Y + h + .55 * k;
    x.fillText(`${i + 1} · ${ph.n.toUpperCase()}`, tx, ty);
  });
  // lifecycle arrows between rooms, clockwise: 1 -> 2 -> 3 -> 4 -> 1
  const arrow = (ax, az, bx, bz, col, dash) => {
    x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 7; x.lineCap = 'round';
    if (dash) x.setLineDash([18, 16]);
    x.beginPath(); x.moveTo(px(ax), pz(az)); x.lineTo(px(bx), pz(bz)); x.stroke(); x.setLineDash([]);
    const a = Math.atan2(pz(bz) - pz(az), px(bx) - px(ax));
    x.translate(px(bx), pz(bz)); x.rotate(a);
    x.beginPath(); x.moveTo(16, 0); x.lineTo(-18, -17); x.lineTo(-18, 17); x.closePath(); x.fill(); x.restore();
  };
  const dim = light ? 'rgba(30,50,100,.42)' : 'rgba(170,200,255,.34)';
  const [r1, r2, r3, r4] = rooms;
  arrow(r1.x + roomW / 2 + .5, r1.z + 1.2, r2.x - roomW / 2 - .5, r2.z + 1.2, dim);
  arrow(r2.x + 1.5, r2.z + roomD / 2 + .5, r3.x + 1.5, r3.z - roomD / 2 - .5, dim);
  arrow(r3.x - roomW / 2 - .5, r3.z + 2.2, r4.x + roomW / 2 + .5, r4.z + 2.2, dim);
  arrow(r4.x - 1.5, r4.z - roomD / 2 - .5, r1.x - 1.5, r1.z + roomD / 2 + .5, rgba(phases[1].c, .6), true);
  x.fillStyle = dim; x.font = `600 ${Math.round(.3 * k)}px ${FONT_M}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.save(); x.translate(px(r4.x - 2.05), pz(0)); x.rotate(-Math.PI / 2); x.fillText('FEEDBACK → NEXT INTENT', 0, 0); x.restore();
  // front-of-house lettering
  x.fillStyle = light ? 'rgba(20,40,90,.22)' : 'rgba(150,185,255,.16)';
  x.font = `700 ${Math.round(1.15 * k)}px ${FONT_D}`; x.textAlign = 'center';
  x.fillText('AI-DLC', px(0), pz(fy - 2.5));
  x.font = `600 ${Math.round(.3 * k)}px ${FONT_M}`;
  x.fillText(hubLabel || '', px(0), pz(fy - 1.35));
  x.fillStyle = light ? 'rgba(20,40,90,.5)' : 'rgba(170,200,255,.42)';
  x.fillText('APPROVAL GATE', px(0), pz(-4.9));
  S.t.needsUpdate = true;
}

/* ---------- bot faces ---------- */
export function drawFace(S, mood, t, color, seed = 0) {
  const { c, x } = S, W = c.width, H = c.height;
  x.fillStyle = '#04070C'; x.fillRect(0, 0, W, H);
  x.fillStyle = color; x.strokeStyle = color; x.lineCap = 'round'; x.lineJoin = 'round';
  x.shadowColor = color; x.shadowBlur = 10;
  const ex = W * .29, ey = H * .42, ew = W * .13, eh = H * .34;
  const blink = (Math.sin(t * .9 + seed * 7) > .985) ? 1 : 0;
  const eye = (cx, cy, w, h) => { rr(x, cx - w / 2, cy - h / 2, w, h, Math.min(w, h) / 2); x.fill(); };
  const both = (dx, dy, w, h) => { eye(ex + dx, ey + dy, w, h); eye(W - ex + dx, ey + dy, w, h); };
  const arcEyes = up => {
    x.lineWidth = H * .09;
    [ex, W - ex].forEach(cx => { x.beginPath(); x.arc(cx, ey + (up ? H * .1 : -H * .06), ew * .9, up ? Math.PI * 1.15 : Math.PI * .15, up ? Math.PI * 1.85 : Math.PI * .85); x.stroke(); });
  };
  const mouth = (w, h, y = H * .78) => { rr(x, W / 2 - w / 2, y - h / 2, w, h, h / 2); x.fill(); };
  switch (mood) {
    case 'sleep':
      x.lineWidth = H * .07;
      [ex, W - ex].forEach(cx => { x.beginPath(); x.moveTo(cx - ew * .8, ey + 4); x.lineTo(cx + ew * .8, ey + 4); x.stroke(); });
      x.font = `700 ${H * .3}px ${FONT_M}`; x.globalAlpha = .5 + .5 * Math.sin(t * 2); x.fillText('z', W * .78, H * .3); x.globalAlpha = 1;
      break;
    case 'happy': arcEyes(true); mouth(W * .2, H * .09); break;
    case 'cheer': {
      arcEyes(true); x.lineWidth = H * .08; x.beginPath(); x.arc(W / 2, H * .68, W * .12, .1, Math.PI - .1); x.stroke(); break;
    }
    case 'talk': {
      both(0, 0, ew, blink ? 4 : eh);
      const o = .5 + .5 * Math.sin(t * 17 + seed);
      mouth(W * (.14 + .1 * o), H * (.06 + .12 * o)); break;
    }
    case 'think': {
      both(-W * .03, -H * .07, ew, eh * .8);
      const n = 1 + (Math.floor(t * 3) % 3);
      for (let i = 0; i < n; i++) { x.beginPath(); x.arc(W * .42 + i * W * .08, H * .8, H * .045, 0, 7); x.fill(); }
      break;
    }
    case 'work': {
      const dx = Math.sin(t * 3 + seed) * W * .05;
      both(dx, H * .04, ew, blink ? 4 : eh * .62);
      x.globalAlpha = .7;
      for (let i = 0; i < 4; i++) { const w = W * (.08 + .1 * ((Math.sin(t * 6 + i * 2.1 + seed) + 1) / 2)); x.fillRect(W * .3 + i * W * .1, H * .8, w * .5, H * .05); }
      x.globalAlpha = 1; break;
    }
    case 'review': {
      both(Math.sin(t * 2.2) * W * .06, 0, ew, blink ? 4 : eh * .5);
      x.lineWidth = H * .06; x.beginPath(); x.moveTo(ex - ew, ey - eh * .62); x.lineTo(ex + ew, ey - eh * .42); x.stroke();
      x.beginPath(); x.moveTo(W - ex - ew, ey - eh * .42); x.lineTo(W - ex + ew, ey - eh * .62); x.stroke();
      mouth(W * .12, H * .05); break;
    }
    case 'alarm': {
      const p = .5 + .5 * Math.sin(t * 14);
      x.beginPath(); x.arc(ex, ey, ew * (.9 + .15 * p), 0, 7); x.fill(); x.beginPath(); x.arc(W - ex, ey, ew * (.9 + .15 * p), 0, 7); x.fill();
      x.fillStyle = '#04070C'; x.shadowBlur = 0;
      x.beginPath(); x.arc(ex, ey, ew * .35, 0, 7); x.fill(); x.beginPath(); x.arc(W - ex, ey, ew * .35, 0, 7); x.fill();
      x.fillStyle = color; x.beginPath(); x.ellipse(W / 2, H * .8, W * .06, H * .09, 0, 0, 7); x.fill(); break;
    }
    case 'boot': {
      const n = Math.floor(t * 8) % 12;
      x.font = `700 ${H * .26}px ${FONT_M}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('▮'.repeat(1 + n % 6), W / 2, H / 2); break;
    }
    default:
      both(0, 0, ew, blink ? 4 : eh); mouth(W * .1, H * .045);
  }
  x.shadowBlur = 0;
  // scanlines
  x.fillStyle = 'rgba(0,0,0,.22)';
  for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 1.5);
  S.t.needsUpdate = true;
}

export function drawStormFace(S, hp, t, dead) {
  const { c, x } = S, W = c.width, H = c.height;
  x.fillStyle = '#12050A'; x.fillRect(0, 0, W, H);
  const col = dead ? '#8E9BB8' : hp > 50 ? '#FF3B4F' : '#FFB547';
  x.strokeStyle = col; x.fillStyle = col; x.lineWidth = H * .08; x.lineCap = 'round'; x.shadowColor = col; x.shadowBlur = 18;
  const ex = W * .28, ey = H * .4, r = H * .16;
  if (dead) {
    [ex, W - ex].forEach(cx => { x.beginPath(); x.moveTo(cx - r, ey - r); x.lineTo(cx + r, ey + r); x.moveTo(cx + r, ey - r); x.lineTo(cx - r, ey + r); x.stroke(); });
    x.beginPath(); x.moveTo(W * .36, H * .8); x.lineTo(W * .64, H * .8); x.stroke();
  } else {
    const a = hp > 50 ? .35 : -.2;                              // angry brows, then worried
    [[ex, 1], [W - ex, -1]].forEach(([cx, s]) => {
      x.beginPath(); x.arc(cx, ey + r * .3, r * (.8 + .1 * Math.sin(t * 9)), 0, 7); x.fill();
      x.beginPath(); x.moveTo(cx - s * r * 1.3, ey - r * (1.1 + a)); x.lineTo(cx + s * r * 1.3, ey - r * (1.1 - a)); x.stroke();
    });
    x.beginPath();
    const n = 7, y0 = H * .8, amp = H * (hp > 50 ? .09 : .04);
    for (let i = 0; i <= n; i++) { const X = W * .3 + i * W * .4 / n, Y = y0 + (i % 2 ? -amp : amp) * (1 + .3 * Math.sin(t * 12 + i)); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }
    x.stroke();
  }
  x.shadowBlur = 0; S.t.needsUpdate = true;
}

/* ---------- mission board (back wall) ---------- */
export function drawBoard(S, d, t) {
  const { c, x } = S, W = c.width, H = c.height;
  x.fillStyle = '#060A14'; x.fillRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, rgba(d.color || '#38E1FF', .16)); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(d.color || '#38E1FF', .1));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.textBaseline = 'middle';
  if (d.mode !== 'game') {
    x.textAlign = 'center';
    x.fillStyle = '#E7EEFF'; x.font = `700 ${H * .34}px ${FONT_D}`; x.fillText('AI-DLC  ·  THE  OFFICE', W / 2, H * .4);
    x.fillStyle = '#38E1FF'; x.font = `600 ${H * .13}px ${FONT_M}`;
    const msg = d.sub || 'INTENT  →  IDEATION  →  INCEPTION  →  CONSTRUCTION  →  OPERATION  →  LEARN';
    x.fillText(msg, W / 2, H * .76);
  } else {
    // left: stage
    x.textAlign = 'left';
    x.fillStyle = d.color || '#38E1FF'; x.font = `700 ${H * .12}px ${FONT_M}`;
    x.fillText((d.kicker || '').toUpperCase(), 40, H * .2);
    x.fillStyle = '#F2F6FF'; x.font = `700 ${H * .27}px ${FONT_D}`;
    let title = d.title || ''; while (x.measureText(title).width > W * .5 && title.length > 8) title = title.slice(0, -2);
    x.fillText(title === (d.title || '') ? title : title + '…', 40, H * .47);
    // pips
    let px0 = 40; const py = H * .8, ps = H * .1;
    (d.phases || []).forEach(p => {
      x.fillStyle = rgba(p.c, .9); x.font = `700 ${H * .075}px ${FONT_M}`; x.textAlign = 'left';
      x.fillText(p.n.slice(0, 5).toUpperCase(), px0, py - ps * 1.15);
      p.pips.forEach((cls, i) => {
        const X = px0 + i * (ps + 5);
        x.fillStyle = cls === 'done' ? p.c : cls === 'now' ? '#FFFFFF' : cls === 'in' ? rgba(p.c, .28) : 'rgba(140,160,200,.1)';
        if (cls === 'now') { x.shadowColor = p.c; x.shadowBlur = 16 + 10 * Math.sin(t * 5); }
        rr(x, X, py - ps / 2, ps, ps, 5); x.fill(); x.shadowBlur = 0;
      });
      px0 += p.pips.length * (ps + 5) + 26;
    });
    // right: clock, score, gate
    x.textAlign = 'right';
    x.fillStyle = '#8E9BB8'; x.font = `600 ${H * .09}px ${FONT_M}`; x.fillText('CLOCK', W - 40, H * .16);
    x.fillStyle = '#E7EEFF'; x.font = `700 ${H * .24}px ${FONT_M}`; x.fillText(d.clock || '', W - 40, H * .38);
    x.fillStyle = '#8E9BB8'; x.font = `600 ${H * .09}px ${FONT_M}`; x.fillText('SCORE', W - 40, H * .62);
    x.fillStyle = '#5BF08F'; x.font = `700 ${H * .24}px ${FONT_M}`; x.fillText(String(d.score ?? ''), W - 40, H * .83);
    if (d.status) {
      x.textAlign = 'center'; x.font = `700 ${H * .12}px ${FONT_M}`;
      const w = x.measureText(d.status).width + 44, X = W * .7 - w / 2;
      x.fillStyle = rgba(d.statusColor || '#FFB547', .18); rr(x, X, H * .14, w, H * .2, 10); x.fill();
      x.strokeStyle = d.statusColor || '#FFB547'; x.lineWidth = 3; rr(x, X, H * .14, w, H * .2, 10); x.stroke();
      x.fillStyle = d.statusColor || '#FFB547'; x.fillText(d.status, W * .7, H * .245);
    }
  }
  S.t.needsUpdate = true;
}

/* ---------- NOC wall (Operations) ---------- */
export function drawNoc(S, d, t) {
  const { c, x } = S, W = c.width, H = c.height;
  x.fillStyle = d.alert ? '#14060A' : '#060B12'; x.fillRect(0, 0, W, H);
  const col = d.alert ? '#FF4D5E' : '#5BF08F';
  x.textBaseline = 'middle'; x.textAlign = 'left';
  x.fillStyle = col; x.font = `700 ${H * .085}px ${FONT_M}`;
  x.fillText(d.alert ? `SEV-1 · ${(d.wave || 'INCIDENT').toUpperCase()}` : (d.title || 'PRODUCTION · ALL SYSTEMS NOMINAL'), 26, H * .1);
  // main chart
  const cx0 = 26, cy0 = H * .2, cw = W * .62, ch = H * .5;
  x.strokeStyle = 'rgba(140,170,220,.18)'; x.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(cx0, cy0 + i * ch / 4); x.lineTo(cx0 + cw, cy0 + i * ch / 4); x.stroke(); }
  const vals = d.p99 && d.p99.length > 1 ? d.p99 : Array.from({ length: 60 }, (_, i) => 120 + 14 * Math.sin(i * .5 + t * 1.5) + 8 * Math.sin(i * 1.3 + t));
  const max = d.max || 2600, shown = d.p99 && d.p99.length > 1 ? max : 320;
  x.beginPath();
  vals.forEach((v, i) => { const X = cx0 + i / (vals.length - 1) * cw, Y = cy0 + ch - Math.min(1, v / shown) * ch; i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
  x.strokeStyle = col; x.lineWidth = 4; x.shadowColor = col; x.shadowBlur = 12; x.stroke(); x.shadowBlur = 0;
  x.lineTo(cx0 + cw, cy0 + ch); x.lineTo(cx0, cy0 + ch); x.closePath(); x.fillStyle = rgba(col, .14); x.fill();
  x.fillStyle = '#8E9BB8'; x.font = `600 ${H * .055}px ${FONT_M}`; x.fillText('p99 latency · /assess', cx0, cy0 + ch + H * .06);
  // right column
  const rx = W * .7;
  x.fillStyle = '#8E9BB8'; x.fillText('ERROR BUDGET', rx, H * .25);
  const b = d.budget ?? 100;
  x.fillStyle = 'rgba(140,170,220,.15)'; rr(x, rx, H * .31, W * .26, H * .09, 8); x.fill();
  x.fillStyle = b > 50 ? '#5BF08F' : b > 25 ? '#FFC24D' : '#FF4D5E'; rr(x, rx, H * .31, W * .26 * b / 100, H * .09, 8); x.fill();
  x.fillStyle = '#E7EEFF'; x.font = `700 ${H * .16}px ${FONT_M}`; x.fillText(Math.ceil(b) + '%', rx, H * .54);
  x.fillStyle = '#8E9BB8'; x.font = `600 ${H * .055}px ${FONT_M}`; x.fillText(d.alert ? 'IMPACT' : 'SLO 99.9%', rx, H * .7);
  if (d.alert) { x.fillStyle = '#FF4D5E'; x.font = `700 ${H * .12}px ${FONT_M}`; x.fillText(Math.round(d.hp ?? 100) + '%', rx, H * .82); }
  else { x.fillStyle = '#5BF08F'; x.font = `700 ${H * .1}px ${FONT_M}`; x.fillText('HEALTHY', rx, H * .82); }
  // ticker
  x.fillStyle = rgba(col, .8); x.font = `600 ${H * .05}px ${FONT_M}`;
  const s = d.alert ? '▲ ALARM  ▲ BURN RATE  ▲ PAGE ON-CALL  ' : 'canary ✓  smoke ✓  slo ✓  alarms armed  ';
  const off = (t * 60) % (x.measureText(s).width);
  for (let X = -off; X < W; X += x.measureText(s).width) x.fillText(s, X, H * .94);
  S.t.needsUpdate = true;
}

export function drawSign(S, text, color) {
  const { c, x } = S, W = c.width, H = c.height;
  x.fillStyle = '#070B14'; x.fillRect(0, 0, W, H);
  x.fillStyle = color; x.shadowColor = color; x.shadowBlur = 14;
  x.font = `700 ${H * .5}px ${FONT_M}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, W / 2, H * .54);
  x.shadowBlur = 0; S.t.needsUpdate = true;
}
