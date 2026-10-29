// v0.35: ปีกแฟชั่นภาพพิกเซล 8 ทิศ (จาก PixelLab) — แผ่นป้ายหันหากล้อง วางซ้อนหลัง/หน้าตัวละครพิกเซลตามทิศที่หัน
// แผ่นภาพ assets/fashion/wings/<key>.png : 8 แถว (N·NE·E·SE·S·SW·W·NW) × F คอลัมน์ (เฟรมกระพือ) · ช่องละ cell px
// ค่าในชิ้นแฟชั่น p = { px: key, cell, frames, fps, lift, scale }
import { THREE } from './three.js?v=0.93.0-p4.61';
import { VERSION } from '../config.js?v=0.93.0-p4.61';

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
    const F = p.frames || 1, f = Math.floor(this.t * (p.fps || 8)) % F;
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
