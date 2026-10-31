// v0.35: ปีกแฟชั่นภาพพิกเซล 8 ทิศ (จาก PixelLab) — แผ่นป้ายหันหากล้อง วางซ้อนหลัง/หน้าตัวละครพิกเซลตามทิศที่หัน
// แผ่นภาพ assets/fashion/wings/<key>.png : 8 แถว (N·NE·E·SE·S·SW·W·NW) × F คอลัมน์ (เฟรมกระพือ) · ช่องละ cell px
// ค่าในชิ้นแฟชั่น p = { px: key, cell, frames, fps, lift, scale }
import { THREE } from './three.js?v=0.93.0-p4.84';
import { VERSION } from '../config.js?v=0.93.0-p4.84';
import { lerpAngle, damp } from '../core/util.js?v=0.93.0-p4.84';

const PXW = 3.55 / 96;   // หน่วยโลกต่อพิกเซล (เท่าตัวละครพิกเซล)
const ROW = { n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7 };
const DIR8 = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];   // ดัชนีทิศเทียบจอ (เหมือน SheetChars)
// fix36 จุดโคนปีกต่อทิศ [x,y] พิกเซลในช่อง (แถว N·NE·E·SE·S·SW·W·NW) — คำนวณจากช่องว่างระหว่างปีกสองข้างในภาพ PixelLab
const WING_ROOT = {
  feather: [[48,42],[48,38],[46,34],[50,47],[48,44],[46,46],[52,35],[48,42]],
  sylvan: [[48,47],[46,42],[45,31],[46,42],[50,44],[50,42],[50,33],[52,35]],
  angel: [[48,44],[50,44],[45,33],[46,47],[48,44],[50,45],[55,33],[48,45]],
  crystal: [[48,48],[46,48],[46,30],[48,46],[48,40],[50,42],[50,31],[50,46]],
  void: [[57,53],[60,54],[49,38],[54,58],[58,54],[58,58],[56,41],[56,54]],
  seraph: [[62,50],[60,45],[56,37],[58,54],[62,52],[64,42],[65,38],[62,48]],
  dragonking: Array(8).fill([64, 60]),   // fix42 ปีกมังกรราชันย์ (ภาพเดียวใช้ทั้งหน้า/หลัง · ข้อต่อกลางที่ y≈60)
  phoenix: [[48,42],[48,46],[46,35],[48,46],[48,42],[50,44],[52,33],[48,46]],
};
// ปรับขนาด/ความสูงต่อแบบ (ปีกใหญ่ → ย่อ · เซราฟ: วงรัศมีอยู่เหนือโคน → กดลงไม่ให้บังหัวตอนหันหลัง)
const WING_FIT = { seraph: { scale: 0.84, rootY: -7 }, void: { scale: 0.92 }, dragonking: { scale: 1.1, rootY: 6 } };   // backY = หันหลัง (ปีกทับหลัง) เลื่อนปีกลงให้เห็นหัว · under: true = บังคับวาดหลังตัวทุกทิศ
// โหลดแยกต่อตัว (offset ต่างกัน · เบราว์เซอร์แคชไฟล์ให้อยู่แล้ว — ห้าม clone ก่อนภาพโหลดเสร็จ)
function wingTexture(p) {
  const t = new THREE.TextureLoader().load(`assets/fashion/wings/${p.px}.png?v=${VERSION}`);
  t.encoding = THREE.sRGBEncoding; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

export class PixelWingSprite {
  constructor(scene, p) {
    this.p = p; p = this.q = { ...(WING_FIT[p.px] || {}), ...p };   // this.p = ชิ้นเดิม (Renderer เทียบตัวนี้)
    this.scene = scene; this.t = Math.random() * 10;
    const tex = wingTexture(p);
    tex.repeat.set(1 / (p.frames || 1), 1 / 8);
    this.tex = tex;
    this.root = p.root || WING_ROOT[p.px] || null;
    this.mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthWrite: true, toneMapped: false, side: THREE.DoubleSide });
    const w = (p.cell || 96) * PXW * (p.scale || 1);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w), this.mat); this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 38;
    scene.add(this.mesh);
    this._c = new THREE.Vector3(); this._d = new THREE.Vector3();
  }

  // fix42: ปีกกางแบบเดียวทุกทิศ (แบบเกม 2D ทั่วไป) — หันหน้า/ข้าง = ภาพมุมหน้า (แถว S) วาดหลังตัว · หันหลัง/เฉียงขึ้น = ภาพมุมหลัง (แถว N) วาดทับตัว
  // ยึดกึ่งกลางตัวละครที่ความสูงแผ่นหลังเสมอ → ไม่เลื่อน/ไม่หลุดจากหลังเวลาหัน
  update(dt, ent, dirIdx, camera, visible) {
    this.mesh.visible = !!visible && !ent.dead;
    if (!this.mesh.visible) { this.frontNow = false; return; }
    const p = this.q;
    const di = ((dirIdx | 0) % 8 + 8) % 8, d = DIR8[di];
    const back = d === 'n';   // fix42 หันหลังตรงเท่านั้นที่ปีกทับตัว · เฉียงขึ้น (NE/NW) วาดหลังตัวเหมือนหันข้าง (ทับแล้วรก)
    const row = back ? ROW.n : ROW.s;
    this.t += dt * (this.anim === 'walk' ? 1.5 : this.anim === 'attack' || this.anim === 'skill' ? 1.8 : 1);
    const F = p.frames || 1, f = (p.still ?? 0) % F;   // fix43 ปีกนิ่ง ไม่กระพือ
    this.tex.offset.set(f / F, 1 - (row + 1) / 8);
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._d.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    const front = back && !p.under;
    const push = front ? 0.7 : 0.3, k = (dist - push) / dist;   // ตัวสไปรต์ถูกดันเข้าหากล้อง 0.5
    this.mesh.renderOrder = front ? 42 : 38;
    this.frontNow = front;   // fix42 Renderer ใช้สั่งให้หัวตัวละครวาดทับปีก
    const sc = 0.88 * (this.kS || 1), C = p.cell || 96, s = (p.scale || 1) * sc, R = this.root && this.root[row], A = this.anc;
    const rx = R ? R[0] : C / 2, ry = R ? R[1] : C / 2;
    // fix42 หันข้าง/เฉียง: ล็อกโคนปีกที่จุดกลางแผ่นหลังของเฟรมนั้น (A[0]) · หน้า/หลังตรง = กลางตัว
    const sn = Math.sin(di * Math.PI / 4), bk = Math.abs(sn) > 0.9 ? 1 : Math.abs(sn) > 0.5 ? 0.6 : 0;   // ข้าง = 1 · เฉียงหน้า = 0.6 · เฉียงหลัง = กลาง (หลังอยู่กลางภาพแล้ว)
    const ox = -Math.sign(sn) * bk * (p.back ?? 0.32) - (rx - C / 2) * PXW * s;
    const oy = A ? A[1] * PXW * (this.kS || 1) - (C / 2 - ry) * PXW * s + ((p.rootY || 0) + (front && p.backY || 0)) * PXW
                 : (p.lift ?? 1.2) * (p.scale || 1) * (this.liftK || 1) + (this.ay || 0);
    this.mesh.position.copy(foot).addScaledVector(toCam, push);
    this.mesh.quaternion.copy(camera.quaternion);
    this.mesh.translateY(oy * k);
    this.oxs = this.oxs === undefined ? ox : this.oxs + (ox - this.oxs) * Math.min(1, dt * 14);   // fix42 เลื่อนตำแหน่งปีกนุ่ม ๆ ตอนเปลี่ยนทิศ (ไม่กระตุก)
    this.mesh.translateX(this.oxs * k);
    this.mesh.scale.set(k * sc, k * sc, 1);
  }

  dispose() { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); this.tex.dispose(); }
}

// fix43/44 ปีกแฟชั่นแบบสองชั้น 8 ทิศจริง — assets/fashion/wings/<key>_back.png / _front.png (+ _ground.png)
// แถว = ทิศ (ใต้·ตอ.ต้·ตอ.·ตอ.น.·เหนือ·ตต.น.·ตต.·ตต.ต้ = ลำดับเดียวกับ DIR8) · คอลัมน์ = เฟรม (cols) · ช่อง cell px · โคนปีกที่ root
// back วาดหลังตัวละคร · front วาดทับตัวละคร · ground = วงเวทใต้เท้า (1 แถว 8 เฟรม หมุนวน · จุดเท้าที่กลางช่อง)
// ปีกนิ่ง ไม่กระพือ (still = คอลัมน์ที่ใช้) · soft = มีออร่าโปร่งแสง (ผสมสีแทนตัดขอบ)
// fix46 wear = แผ่นแบบใส่จริง: ข้อต่อปีก (โคนแขนปีก + ขนคลุมชิ้นใน) อยู่ในชั้น front ทับไหล่/สะบัก เฉพาะตอนหันหลัง/หันข้าง (ปีกข้างใกล้)
// ส่วนที่เหลือของปีกอยู่ชั้น back หลังตัว · ไม่ต้องใช้ backOver · เปลี่ยนทิศแล้วภาพทิศเดิมจางหายนุ่ม ๆ · โคนปีกขยับตามจุดหลังทุกเฟรม
function layerTex(key, layer, cols, rows, wear) {
  const t = new THREE.TextureLoader().load(`assets/fashion/wings/${key}_${layer}.png?v=${VERSION}${wear ? '&w=47' : ''}`);
  t.encoding = THREE.sRGBEncoding; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  t.repeat.set(1 / cols, 1 / rows);
  return t;
}
export class LayeredWings {
  constructor(scene, p) {
    this.p = p; this.scene = scene; this.t = Math.random() * 10;
    const cols = p.cols || 8;
    const mk = (layer, order, push, rows, c) => {
      const tex = layerTex(p.layered, layer, c, rows, p.wear);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: p.soft ? 0.02 : 0.5, depthWrite: !p.soft, toneMapped: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); mesh.frustumCulled = false; mesh.renderOrder = order;
      scene.add(mesh);
      return { tex, mat, mesh, push, cols: c };
    };
    this.L = [mk('back', 38, 0.3, 8, cols), mk('front', 42, 0.7, 8, p.fcols || cols)];
    // fix46 ชั้นเงา: ภาพทิศก่อนหน้า วาดใต้ภาพทิศใหม่แล้วจางหาย (หันตัวไม่กระตุก)
    this.Gh = p.wear ? [mk('back', 37, 0.3, 8, cols), mk('front', 41, 0.7, 8, p.fcols || cols)] : null;
    this.G = p.ground ? mk('ground', 36, 0.15, 1, 8) : null;
    this._c = new THREE.Vector3(); this._d = new THREE.Vector3();
    this.frontNow = false;
    this.di = -1; this.prevDi = 0; this.fade = 0; this.fx = null; this.fy = 0;
  }

  update(dt, ent, dirIdx, camera, visible) {
    const vis = !!visible && !ent.dead;
    for (const l of this.L) l.mesh.visible = vis;
    if (this.G) this.G.mesh.visible = vis;
    if (this.Gh) for (const l of this.Gh) l.mesh.visible = vis && this.fade > 0;
    if (!vis) { this.frontNow = false; return; }
    this.t += dt;
    const p = this.p, di = ((dirIdx | 0) % 8 + 8) % 8;
    const C = p.cell || 128, R = p.root || [64, 60];
    const f = p.flick ? Math.floor(this.t * (p.fps || 10)) % (p.cols || 8) : (p.still ?? 0) % (p.cols || 8);   // fix45 flick = ปีกนิ่งแต่สายฟ้าแลบ (เฟรมต่างกันแค่สายฟ้า)
    const k = this.kS || 1, W = C * PXW * k;
    const A = this.anc, above = (p.above != null ? p.above : A ? A[1] - 2 : 31) * PXW * k;   // โคนปีกเหนือเท้า (หน่วยโลก)
    let cx = (C / 2 - R[0]) * PXW * k, cy = above + (R[1] - C / 2) * PXW * k;          // จุดกลางช่องเทียบโคนปีก
    if (p.wear) {
      // fix46 โคนปีกเกาะจุดหลังของเฟรมนี้ (ขยับขึ้นลงตามจังหวะเดิน/ท่าตี) · กรองนุ่ม ๆ กันสั่น
      const tx = this.ax || 0, ty = this.ay || 0, kf = Math.min(1, dt * 18);
      if (this.fx === null) { this.fx = tx; this.fy = ty; } else { this.fx += (tx - this.fx) * kf; this.fy += (ty - this.fy) * kf; }
      cx += this.fx; cy += this.fy;
      // fix46 เปลี่ยนทิศ: เก็บทิศเดิมไว้เป็นเงาแล้วจางหายใน ~0.16 วิ
      if (this.di < 0) this.di = di;
      if (di !== this.di) { this.prevDi = this.di; this.di = di; this.fade = 1; }
      else this.fade = Math.max(0, this.fade - dt / 0.16);
    }
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._d.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    const place = (l, col, row, rows, oy, ox) => {
      l.tex.offset.set(col / l.cols, 1 - (row + 1) / rows);
      const kk = (dist - l.push) / dist;
      l.mesh.position.copy(foot).addScaledVector(toCam, l.push);
      l.mesh.quaternion.copy(camera.quaternion);
      l.mesh.translateY(oy * kk); l.mesh.translateX(ox * kk);
      l.mesh.scale.set(W * kk, W * kk, 1);
    };
    if (p.wear) {
      // fix46 ข้อต่อปีกในชั้น front ทับไหล่ตอนหันหลัง/หันข้าง → ให้ Renderer วาดหัวทับอีกชั้น (หัวไม่โดนขนปีกบัง)
      this.frontNow = DIR8[di] !== 's' && DIR8[di] !== 'se' && DIR8[di] !== 'sw';
      this.L.forEach((l, i) => place(l, i ? f % l.cols : f, di, 8, cy, cx));
      if (this.fade > 0) this.Gh.forEach((l, i) => { l.mat.opacity = this.fade; place(l, i ? f % l.cols : f, this.prevDi, 8, cy, cx); });
    } else {
      // fix45 หันหลังตรง: ปีกต้องติดแผ่นหลัง → วาดชั้น back ทับตัวละคร แล้วให้ Renderer วาดหัวตัวละครซ้อนอีกชั้น (หัวไม่โดนบัง)
      const onBack = !!p.backOver && DIR8[di] === 'n', B = this.L[0];
      B.push = onBack ? 0.7 : 0.3; B.mesh.renderOrder = onBack ? 41 : 38; this.frontNow = onBack;
      this.L.forEach((l, i) => place(l, i ? f % l.cols : f, di, 8, cy, cx));
    }
    if (this.G) place(this.G, Math.floor(this.t * 8) % 8, 0, 1, 0, 0);   // กลางช่องวงเวท = จุดเท้า
  }

  dispose() { for (const l of [...this.L, ...(this.Gh || []), this.G].filter(Boolean)) { this.scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mat.dispose(); l.tex.dispose(); } }
}

// fix47 ปีกแฟชั่น 3 มิติ (ปีก Deluxe) — แผ่นปีกแบนซ้าย/ขวา มีบานพับที่สะบัก แบบเดียวกับ SeraphWings
// · หมุนตามองศาที่ตัวละครหันจริงแบบลื่น (ไม่กระโดด 8 ทิศ) · ความลึกจริงตัดสินหน้า/หลัง: หันหน้า = ปีกหลังตัว · หันหลัง = ปีกคลุมหลัง · หันข้าง = ปีกข้างใกล้ผ่านหน้า
// · กระพือเบา ๆ ตลอด (เดิน = เร็วขึ้น หุบเล็กน้อย) · โคนปีกขยับตามจุดหลังของเฟรม (ax/ay)
// ภาพ: assets/fashion/wings/<mesh>_wing.png (ปีกขวาวางราบ โคนปีกที่ pivot · cols เฟรมสายฟ้า) + <mesh>_glow.png (ออร่า ไม่เขียนความลึก) + <mesh>_ground.png (ถ้ามี)
// ค่าในชิ้นแฟชั่น p = { mesh, size: [w,h], pivot: [x,y], cols, flick, fps, above, spark, halo, ground }
const UP = new THREE.Vector3(0, 1, 0);
let SPARK_TEX = null;
const sparkTex = () => SPARK_TEX || (SPARK_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})());
function ringTex(color) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d');
  g.strokeStyle = color; g.lineWidth = 3; g.beginPath(); g.ellipse(32, 16, 26, 9, 0, 0, Math.PI * 2); g.stroke();
  g.fillStyle = color; g.fillRect(31, 2, 2, 6); g.fillRect(31, 24, 2, 6);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
}
export class MeshWings {
  constructor(scene, p) {
    this.p = p; this.scene = scene; this.t = Math.random() * 10; this.yaw = null; this.open = 1; this.frontNow = false;
    const cols = p.cols || 1;
    const load = (layer, c) => { const t = new THREE.TextureLoader().load(`assets/fashion/wings/${p.mesh}_${layer}.png?v=${VERSION}&w=47`); t.encoding = THREE.sRGBEncoding; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.repeat.set(1 / c, 1); return t; };
    this.tex = load('wing', cols); this.gtex = load('glow', cols);
    // ไม่เขียน depth: ตัวละครเป็นแผ่นแบน ถ้าปีกเขียน depth จะทะลุ/ตัดกับตัว → ใช้ลำดับวาดตัดสินแทน
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, alphaTest: 0.5, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false });   // fix48 ไม่ทดสอบความลึก: ปลายปีกล่างต่ำกว่าระดับเท้า เดิมจมพื้นโดนตัดเป็นเส้นตรง
    this.gmat = new THREE.MeshBasicMaterial({ map: this.gtex, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false });
    this.root = new THREE.Group(); scene.add(this.root);        // เอียงตามแผ่นตัวละคร (แกนตั้ง = แกนขึ้นของกล้อง)
    this.turn = new THREE.Group(); this.root.add(this.turn);     // หันตามทิศที่ตัวละครหัน
    this.back = new THREE.Group(); this.turn.add(this.back);     // จุดกลางแผ่นหลัง (สเกลพิกเซล → โลก)
    // fix54 res = จำนวนพิกเซลภาพต่อ 1 พิกเซลเกม (2 = ละเอียดขึ้น 2 เท่า ขนาดบนจอเท่าเดิม)
    const [w, h] = p.size || [116, 119], [px, py] = p.pivot || [28, 55], kr = PXW / (p.res || 1);
    this.geo = new THREE.PlaneGeometry(w * kr, h * kr); this.geo.translate((w / 2 - px) * kr, (py - h / 2) * kr, 0);   // โคนปีกที่จุดหมุน
    this.sides = [1, -1].map((s) => {
      const pivot = new THREE.Group(); pivot.position.set(s * 4.5 * PXW, 0, 0); this.back.add(pivot);   // สะบักซ้าย/ขวา
      const wing = new THREE.Mesh(this.geo, this.mat), glow = new THREE.Mesh(this.geo, this.gmat);
      wing.renderOrder = 37; glow.renderOrder = 35; wing.frustumCulled = glow.frustumCulled = false;
      if (s < 0) { wing.scale.x = -1; glow.scale.x = -1; }
      pivot.add(glow, wing);
      return { s, pivot, wing, glow, sw: null };
    });
    if (p.halo) {
      this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(p.halo), transparent: true, depthWrite: false, toneMapped: false }));
      this.halo.scale.set(22 * PXW, 11 * PXW, 1); this.halo.renderOrder = 43; this.back.add(this.halo);
    }
    if (p.ground) {
      const t = load('ground', 8); const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false });
      this.G = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); this.G.renderOrder = 34; this.G.frustumCulled = false; scene.add(this.G); this.G.tex = t;
    }
    // ประกายรอบปีก (จุดในพื้นที่โลก)
    this.N = 18; this.pos = new Float32Array(this.N * 3); this.vel = []; this.life = new Float32Array(this.N);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    // fix51 spark เป็นรายการสีได้ (สุ่มสีต่อเม็ด)
    const multi = Array.isArray(p.spark) && p.spark.length > 0;
    if (multi) { const cols = new Float32Array(this.N * 3), c = new THREE.Color(); for (let i = 0; i < this.N; i++) { c.set(p.spark[i % p.spark.length]); cols.set([c.r, c.g, c.b], i * 3); } geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); }
    this.pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: sparkTex(), color: multi ? '#ffffff' : (p.spark || '#ffffff'), vertexColors: multi, size: 0.32, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.pts.frustumCulled = false; this.pts.renderOrder = 39; scene.add(this.pts);
    for (let i = 0; i < this.N; i++) { this.vel.push(new THREE.Vector3()); this.pos[i * 3 + 1] = -99; }
    this._c = new THREE.Vector3(); this._d = new THREE.Vector3(); this._w = new THREE.Vector3(); this._f = new THREE.Vector3(); this.spawn = 0;
  }

  update(dt, ent, dirIdx, camera, visible) {
    const on = !!visible && !ent.dead;
    this.root.visible = on; this.pts.visible = on; if (this.G) this.G.visible = on;
    if (!on) { this.frontNow = false; return; }
    const p = this.p, kS = this.kS || 1;
    this.t += dt;
    // หันตามทิศที่ภาพตัวละคร "แสดงอยู่จริง" (8 ทิศ) ปีกจึงตรงกับลำตัวทุกเฟรม · ระหว่างเปลี่ยนทิศค่อย ๆ หมุนตาม
    let target = ent.angle || 0;
    if (dirIdx != null) {
      const r = this._r || (this._r = new THREE.Vector3()), b = this._b || (this._b = new THREE.Vector3());
      r.setFromMatrixColumn(camera.matrixWorld, 0); b.setFromMatrixColumn(camera.matrixWorld, 2); b.y = 0; b.normalize();
      const a = dirIdx * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      target = Math.atan2(c * b.x + s * r.x, c * b.z + s * r.z);
    }
    this.yaw = this.yaw == null ? target : lerpAngle(this.yaw, target, damp(14, dt));
    // ระนาบเดียวกับแผ่นตัวละคร (ดันเข้าหากล้อง 0.5 แบบ SheetSprite)
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._d.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    // ดันเข้าหากล้องมากกว่าตัวละคร (ขนาดบนจอเท่าเดิม) ปลายปีกล่างจึงไม่จมพื้นจนโดนตัดเป็นเส้นตรง
    const push = 1.6, k = (dist - push) / dist;
    this.root.position.copy(foot).addScaledVector(toCam, push);
    this.root.scale.setScalar(k);
    this.root.quaternion.setFromUnitVectors(UP, this._w.set(0, 1, 0).applyQuaternion(camera.quaternion));
    this.turn.rotation.set(0, this.yaw, 0);
    // จุดหลัง: สูงระดับสะบัก (above พิกเซลเหนือเท้า) + ขยับตามท่าของเฟรม · ลึกไปด้านหลัง 3 พิกเซล
    this.back.scale.setScalar(kS);
    this.back.position.set(0, (p.above ?? 40) * PXW * kS + (this.ay || 0), -3 * PXW * kS);
    if (this.ax) { this._w.set(this.ax, 0, 0).applyAxisAngle(UP, -this.yaw); this.back.position.x += this._w.x; this.back.position.z += this._w.z; }
    // หันไม่เข้าหากล้อง → ปีกอาจบังหัว ให้ Renderer วาดหัวทับ
    this._f.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const face = this._f.x * toCam.x + this._f.z * toCam.z;
    // หันหลังให้กล้อง → ปีกวาดทับหลัง (หัววาดทับปีก) · นอกนั้นตัวละครวาดทับปีกทั้งหมด ปีกจึงไม่ทะลุตัว
    const backView = face < -0.3; this.frontNow = false;   // fix47 ไม่วาดหัวทับปีก (เดิมหัวโผล่ทะลุปีกตอนหันหลัง)
    // ปีกนิ่ง (ไม่กระพือ ไม่หุบตอนเดิน)
    const f = 0;
    // มุมกล้องในแกนของตัว (0 = กล้องอยู่ด้านหน้า) · แต่ละข้างเลือกองศาลู่หลังที่ใกล้ท่าปกติที่สุด แต่ไม่หันสันเข้ากล้อง (กันปีกเหลือเป็นเส้นริ้ว)
    const phi = Math.atan2(Math.cos(this.yaw) * toCam.x - Math.sin(this.yaw) * toCam.z, Math.sin(this.yaw) * toCam.x + Math.cos(this.yaw) * toCam.z);
    const base = 38 + (1 - this.open) * 40, D = THREE.MathUtils.DEG2RAD, raise = (4 + f * 7) * D;
    for (const sd of this.sides) {
      let best = base, bs = -1e9;
      for (let a = 20; a <= 85; a += 2.5) {
        const fc = Math.abs(Math.cos(sd.s * a * D - phi));
        const sc = -Math.abs(a - base) / 60 - (fc < 0.55 ? (0.55 - fc) * 6 : 0);
        if (sc > bs) { bs = sc; best = a; }
      }
      sd.sw = sd.sw == null ? best : sd.sw + (best - sd.sw) * damp(6, dt);
      sd.pivot.rotation.set(0, 0, 0); sd.pivot.rotateY(sd.s * (sd.sw + f * 4) * D); sd.pivot.rotateZ(sd.s * raise);
      // ข้างไกลกล้องวาดก่อน · หันหลัง = วาดหลังตัวละคร (40) แต่ก่อนหัว (44)
      // หันหลังตรง ๆ = ทั้งสองข้างคลุมหลัง · หันหลังเฉียง = เฉพาะข้างใกล้กล้องทับตัว ข้างไกลอยู่หลังตัว
      const over = backView && sd.s * Math.sin(phi) > -0.25;
      sd.glow.renderOrder = over ? 41 : 35; sd.wing.renderOrder = over ? 42 : 36;
    }
    // สายฟ้าแลบ (เฟรมต่างกันแค่สายฟ้า)
    if (p.flick && p.cols > 1) { const col = Math.floor(this.t * (p.fps || 10)) % p.cols; this.tex.offset.x = this.gtex.offset.x = col / p.cols; }
    if (this.halo) this.halo.position.set(0, 26 * PXW, 0);
    if (this.G) {   // วงเวทใต้เท้า (แผ่นหันหากล้อง กลางช่อง = จุดเท้า)
      const C = 192 * PXW * kS, kk = (dist - 0.15) / dist; this.G.tex.offset.x = (Math.floor(this.t * 8) % 8) / 8;
      this.G.position.copy(foot).addScaledVector(toCam, 0.15); this.G.quaternion.copy(camera.quaternion); this.G.scale.set(C * kk, C * kk, 1);
    }
    // ประกายลอยจากปีก
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn = 0.14;
      const i = (Math.random() * this.N) | 0, sd = this.sides[(Math.random() * 2) | 0];
      this._w.set((10 + Math.random() * 60) * PXW, (Math.random() * 60 - 40) * PXW, 0); sd.wing.localToWorld(this._w);
      this.pos[i * 3] = this._w.x; this.pos[i * 3 + 1] = this._w.y; this.pos[i * 3 + 2] = this._w.z;
      this.vel[i].set((Math.random() - 0.5) * 0.2, (p.fall ? -1 : 1) * (0.15 + Math.random() * 0.25), (Math.random() - 0.5) * 0.2); this.life[i] = 1 + Math.random();
    }
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -99; continue; }
      this.life[i] -= dt; const v = this.vel[i];
      this.pos[i * 3] += v.x * dt; this.pos[i * 3 + 1] += v.y * dt; this.pos[i * 3 + 2] += v.z * dt;
    }
    this.pts.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.root); this.scene.remove(this.pts); if (this.G) { this.scene.remove(this.G); this.G.geometry.dispose(); this.G.material.dispose(); this.G.tex.dispose(); }
    this.geo.dispose(); this.mat.dispose(); this.gmat.dispose(); this.tex.dispose(); this.gtex.dispose();
    if (this.halo) { this.halo.material.map.dispose(); this.halo.material.dispose(); }
    this.pts.geometry.dispose(); this.pts.material.dispose();
  }
}

// fix46 ออร่าแฟชั่นภาพพิกเซล 2 ชั้น (ชุด 12 แบบ) — assets/fashion/aura/<key>_back.png / _front.png
// แผ่นละ 1 แถว × 8 เฟรมวนลูป · ช่อง 192 · จุดเท้าที่ (96, 150) · ไม่ขึ้นกับทิศ · back หลังตัวละคร · front ทับตัวละคร
export class LayeredAura {
  constructor(scene, p) {
    this.p = p; this.scene = scene; this.t = Math.random() * 10; this.name = p.laura;
    this.L = ['back', 'front'].map((layer, i) => {
      const tex = new THREE.TextureLoader().load(`assets/fashion/aura/${p.laura}_${layer}.png?v=${VERSION}`);
      tex.encoding = THREE.sRGBEncoding; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      tex.repeat.set(1 / 8, 1);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.01, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); mesh.frustumCulled = false; mesh.renderOrder = i ? 43 : 35;
      scene.add(mesh);
      return { tex, mat, mesh, push: i ? 0.75 : 0.2 };
    });
    this._c = new THREE.Vector3(); this._d = new THREE.Vector3();
  }

  update(dt, ent, camera, visible) {
    const vis = !!visible && !ent.dead;
    for (const l of this.L) l.mesh.visible = vis;
    if (!vis) return;
    this.t += dt;
    const f = Math.floor(this.t * (this.p.fps || 10)) % 8;
    const k = this.kS || 1, W = 192 * PXW * k, cy = (150 - 96) * PXW * k;   // กลางช่องอยู่เหนือเท้า 54 พิกเซล
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._d.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    for (const l of this.L) {
      l.tex.offset.set(f / 8, 0);
      const kk = (dist - l.push) / dist;
      l.mesh.position.copy(foot).addScaledVector(toCam, l.push);
      l.mesh.quaternion.copy(camera.quaternion);
      l.mesh.translateY(cy * kk);
      l.mesh.scale.set(W * kk, W * kk, 1);
    }
  }

  stop() { this.dispose(); }
  dispose() { for (const l of this.L) { this.scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mat.dispose(); l.tex.dispose(); } }
}
