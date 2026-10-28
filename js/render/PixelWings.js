// v0.35: ปีกแฟชั่นภาพพิกเซล 8 ทิศ (จาก PixelLab) — แผ่นป้ายหันหากล้อง วางซ้อนหลัง/หน้าตัวละครพิกเซลตามทิศที่หัน
// แผ่นภาพ assets/fashion/wings/<key>.png : 8 แถว (N·NE·E·SE·S·SW·W·NW) × F คอลัมน์ (เฟรมกระพือ) · ช่องละ cell px
// ค่าในชิ้นแฟชั่น p = { px: key, cell, frames, fps, lift, scale }
import { THREE } from './three.js?v=0.93.0-p4.37';
import { VERSION } from '../config.js?v=0.93.0-p4.37';

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
  phoenix: [[48,42],[48,46],[46,35],[48,46],[48,42],[50,44],[52,33],[48,46]],
};
// ปรับขนาด/ความสูงต่อแบบ (ปีกใหญ่ → ย่อ · เซราฟ: วงรัศมีอยู่เหนือโคน → กดลงไม่ให้บังหัวตอนหันหลัง)
const WING_FIT = { seraph: { scale: 0.84, rootY: -7 }, void: { scale: 0.92 } };
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

  // v0.40.1: ใช้ภาพปีกครบ 8 ทิศ เปลี่ยนทิศพร้อมตัวละคร (ทิศเดียวกับแผ่นตัวละคร → ไม่ลอย/ไม่บีบภาพ)
  update(dt, ent, dirIdx, camera, visible) {
    this.mesh.visible = !!visible && !ent.dead;
    if (!this.mesh.visible) return;
    const p = this.q;
    const di = ((dirIdx | 0) % 8 + 8) % 8, d = DIR8[di];
    const row = ROW[d];   // fix36: ใช้ทิศเดียวกับตัวละครทุกทิศ (ภาพ PixelLab = ปีกของตัวที่หันทิศนั้น) — เดิมสลับหน้า/หลัง ทำให้หันแล้วปีกกระตุกกลับด้าน
    const sn = Math.sin(di * Math.PI / 4);                  // +1 = หันขวา · -1 = หันซ้าย
    const behind = d !== 'n' && d !== 'ne' && d !== 'nw';   // หันหลังให้จอ → ปีกอยู่หน้าตัว
    this.t += dt * (this.anim === 'walk' ? 1.5 : this.anim === 'attack' || this.anim === 'skill' ? 1.8 : 1);   // fix36 กระพือเร็วขึ้นตอนเดิน/โจมตี ให้เข้าจังหวะตัวละคร
    const F = p.frames || 1, f = Math.floor(this.t * (p.fps || 8)) % F;
    this.tex.offset.set(f / F, 1 - (row + 1) / 8);
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._d.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    // ตัวสไปรต์ถูกดันเข้าหากล้อง 0.5 → ปีกหลังตัว 0.3 · ปีกหน้าตัว 0.7
    const push = behind ? 0.3 : 0.7, k = (dist - push) / dist;
    this.mesh.renderOrder = behind ? 38 : 42;
    const side = Math.abs(sn) > 0.9 ? 1 : 0;   // หันข้างเท่านั้นที่ขยับปีกไปทางหลัง (เฉียง/หน้า/หลัง = กลางตัว)
    const diag = !side && Math.abs(sn) > 0.5 ? 1 : 0;
    const sc = side ? 0.82 : diag ? 0.86 : 0.88;   // fix36 หันข้าง = ปีกอยู่หลังแผ่นหลังชัด ๆ (เดิมเล็ก+ชิดกลางจนจมหายหลังตัว)
    const C = p.cell || 96, s = (p.scale || 1) * sc, R = this.root && this.root[row], A = this.anc;
    let ox, oy;
    if (R && A) {   // fix36 โคนปีก = จุดหลังของเฟรมนี้ (ไม่ลอย/ไม่เบี้ยว · ขยับตามท่าเดิน/ฟันเอง)
      ox = A[0] * PXW - (R[0] - C / 2) * PXW * s;
      oy = A[1] * PXW - (C / 2 - R[1]) * PXW * s + ((p.rootY || 0) + side * 9) * PXW;   // หันข้าง: ยกปีกขึ้นพ้นเป้/แผ่นหลัง
    } else {
      ox = this.ax || 0;
      oy = (p.lift ?? 1.2) * (p.scale || 1) * (this.liftK || 1) * (side ? 0.86 : diag ? 0.94 : 1) + (this.ay || 0);
    }
    this.mesh.position.copy(foot).addScaledVector(toCam, push);
    this.mesh.quaternion.copy(camera.quaternion);
    this.mesh.translateY(oy * k);
    this.mesh.translateX((ox - Math.sign(sn) * side * (p.back ?? 0.55)) * k);   // หันข้าง = ดันไปทางแผ่นหลัง
    this.mesh.scale.set(k * sc, k * sc, 1);
  }

  dispose() { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); this.tex.dispose(); }
}
