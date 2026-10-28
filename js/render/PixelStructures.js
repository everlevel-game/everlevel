// fix36 สิ่งปลูกสร้างภาพพิกเซล 8 มุม (PixelLab) — แผ่นป้ายหันหากล้อง · เปลี่ยนภาพตามมุมกล้องที่หมุนได้ทีละ 45°
// แผ่นภาพ: 8 แถว (N·NE·E·SE·S·SW·W·NW = ทิศที่ "ตัวอาคารหัน") × 1 คอลัมน์ · ทุกภาพจัดฐานกลางล่างไว้ที่ (cell/2, foot)
import { THREE } from './three.js?v=0.93.0-p4.44';
import { VERSION } from '../config.js?v=0.93.0-p4.44';

const PXW = 3.55 / 96;   // หน่วยโลกต่อพิกเซล (เท่าตัวละครพิกเซล)
const ROW = { n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7 };
// กล้องหมุนตาม yaw (+45° ต่อขั้น) → อาคารที่หันใต้จะถูกมองเป็นภาพทิศไหน
const BY_YAW = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'];
const TURN = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];   // rot ของอาคาร (ทวนเข็ม 45° ต่อขั้น)

// แบบอาคาร: src · cell = ขนาดช่อง · foot = แถวพิกเซลฐาน · cw = ความกว้างตัวอาคารในภาพ (px) · deep = ครึ่งความลึกฐาน · ww = กว้างในโลก (ไม่ใส่ = w ช่องของวัตถุ)
const TOWN = { src: 'assets/structures/town.png', W: 1613, H: 1376 };   // รวมทุกแบบในไฟล์เดียว (แต่ละแบบ = คอลัมน์ 8 แถว เริ่มที่ x0)
export const STRUCTS = {
  house_a: { ...TOWN, x0: 0, cell: 172, foot: 166, cw: 92, deep: 1.3 },
  house_b: { ...TOWN, x0: 172, cell: 172, foot: 166, cw: 92, deep: 1.3 },
  house_c: { ...TOWN, x0: 344, cell: 172, foot: 166, cw: 92, deep: 1.3 },
  blacksmith: { ...TOWN, x0: 516, cell: 172, foot: 166, cw: 112, deep: 1.3 },
  store: { ...TOWN, x0: 688, cell: 172, foot: 166, cw: 116, deep: 1.3 },
  guildhall: { ...TOWN, x0: 860, cell: 172, foot: 166, cw: 116, deep: 1.3 },
  tower: { ...TOWN, x0: 1032, cell: 172, foot: 166, cw: 90, deep: 0.9, ww: 2.1 },
  fountain: { ...TOWN, x0: 1204, cell: 172, foot: 166, cw: 146, deep: 1.25, ww: 3.4 },
  stall: { ...TOWN, x0: 1376, cell: 138, foot: 132, cw: 95, deep: 0.45, ww: 2.9 },
  well: { ...TOWN, x0: 1514, cell: 99, foot: 93, cw: 65, deep: 0.5, ww: 1.5 },
};
// fix36 โหมดกล้อง 2D: อาคารภาพมุมหน้ามุมเดียว (วาดใหญ่ขึ้น → ขนาดพิกเซลเท่าตัวละคร และกว้างพอดีฐานในแผนที่)
// fw/fh = ขนาดช่องในภาพรวม · foot = แถวพิกเซลฐาน (ล่างสุดของตัวอาคาร)
const PROPS2D = { src: 'assets/structures/props2d.png', W: 1844, H: 104, rows: 1 };
const TOWN2D = { src: 'assets/structures/town2d.png', W: 1128, H: 224, rows: 1 };
export const STRUCTS_2D = {
  house_a: { ...TOWN2D, x0: 0, fw: 176, fh: 224, foot: 203, deep: 1.3 },
  house_b: { ...TOWN2D, x0: 176, fw: 176, fh: 224, foot: 215, deep: 1.3 },
  house_c: { ...TOWN2D, x0: 352, fw: 176, fh: 224, foot: 205, deep: 1.3 },
  blacksmith: { ...TOWN2D, x0: 528, fw: 176, fh: 224, foot: 213, deep: 1.3 },
  store: { ...TOWN2D, x0: 704, fw: 176, fh: 224, foot: 194, deep: 1.3 },
  guildhall: { ...TOWN2D, x0: 880, fw: 248, fh: 160, foot: 153, deep: 1.3 },
  // ของประกอบฉากทุกแผนที่ (โหมด 2D) · เต็นท์แยกตามธีมแผนที่ (tent_<แผนที่>)
  crate: { ...PROPS2D, x0: 0, fw: 48, fh: 48, foot: 46, deep: 0.4 },
  barrel: { ...PROPS2D, x0: 48, fw: 40, fh: 52, foot: 47, deep: 0.4 },
  chest: { ...PROPS2D, x0: 88, fw: 48, fh: 44, foot: 38, deep: 0.4 },
  bench: { ...PROPS2D, x0: 136, fw: 72, fh: 48, foot: 36, deep: 0.4 },
  sign: { ...PROPS2D, x0: 208, fw: 48, fh: 56, foot: 53, deep: 0.3 },
  lamp: { ...PROPS2D, x0: 256, fw: 40, fh: 100, foot: 97, deep: 0.3 },
  pillar: { ...PROPS2D, x0: 296, fw: 48, fh: 104, foot: 102, deep: 0.4 },
  boulder: { ...PROPS2D, x0: 344, fw: 64, fh: 56, foot: 52, deep: 0.5 },
  bush: { ...PROPS2D, x0: 408, fw: 56, fh: 48, foot: 46, deep: 0.4 },
  stump: { ...PROPS2D, x0: 464, fw: 44, fh: 40, foot: 38, deep: 0.4 },
  tent: { ...PROPS2D, x0: 508, fw: 112, fh: 96, foot: 87, deep: 0.9 },
  tent_frostveil: { ...PROPS2D, x0: 620, fw: 112, fh: 96, foot: 76, deep: 0.9 },
  tent_ember_caldera: { ...PROPS2D, x0: 732, fw: 112, fh: 96, foot: 90, deep: 0.9 },
  tent_haunted_forest: { ...PROPS2D, x0: 844, fw: 112, fh: 96, foot: 89, deep: 0.9 },
  tent_crystal_valley: { ...PROPS2D, x0: 956, fw: 112, fh: 96, foot: 89, deep: 0.9 },
  tent_sunken_coast: { ...PROPS2D, x0: 1068, fw: 112, fh: 96, foot: 78, deep: 0.9 },
  tent_sky_citadel: { ...PROPS2D, x0: 1180, fw: 112, fh: 96, foot: 93, deep: 0.9 },
  tent_ancient_ruins: { ...PROPS2D, x0: 1292, fw: 112, fh: 96, foot: 81, deep: 0.9 },
  campfire: { ...PROPS2D, x0: 1404, fw: 56, fh: 48, foot: 46, deep: 0.4 },
  bigshroom: { ...PROPS2D, x0: 1460, fw: 72, fh: 96, foot: 91, deep: 0.4 },
  icecrystal: { ...PROPS2D, x0: 1532, fw: 64, fh: 88, foot: 84, deep: 0.4 },
  snowman: { ...PROPS2D, x0: 1596, fw: 48, fh: 72, foot: 57, deep: 0.4 },
  obsidian: { ...PROPS2D, x0: 1644, fw: 56, fh: 88, foot: 80, deep: 0.4 },
  vent: { ...PROPS2D, x0: 1700, fw: 64, fh: 52, foot: 46, deep: 0.4 },
  bones: { ...PROPS2D, x0: 1764, fw: 80, fh: 96, foot: 90, deep: 1.3 },
};
// แผนที่ที่ใช้อาคารภาพพิกเซลแล้ว (แผนที่อื่นยังเป็นโมเดล 3 มิติ)
export const STRUCT_MAPS = { asteria_town: true };
const ROOF = { a: ['#b5473a', '#c9822f', '#7a3a2a', '#d8b45c'], b: ['#3a4f9e', '#4f6a9e', '#6a5a94', '#3f6fb5'], c: ['#5a8a3c', '#2f6a5a'] };
function houseKey(def) {
  const r = (def.roof || '').toLowerCase();
  if (ROOF.b.includes(r)) return 'house_b';
  if (ROOF.c.includes(r)) return 'house_c';
  if (ROOF.a.includes(r)) return 'house_a';
  return ['house_a', 'house_b', 'house_c'][Math.abs(def.seed | 0) % 3];
}

// ภาพรวมไฟล์เดียวใช้ร่วมกันทุกอาคาร (เลือกแถวด้วย UV ของแต่ละแผ่น → ไม่ต้องอัปโหลดภาพซ้ำ)
const TEX = {};
function atlasTex(src) {
  let t = TEX[src];
  if (!t) {
    t = TEX[src] = new THREE.TextureLoader().load(`${src}?v=${VERSION}`);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding;
  }
  return t;
}
const MAT = new Map();
function atlasMat(src, tint) {
  const k = src + (tint ? tint.uuid || '' : '');
  let m = MAT.get(k);
  if (!m || m.userData.dead) {
    m = new THREE.MeshBasicMaterial({ map: atlasTex(src), alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false });
    if (tint) m.color = tint;
    MAT.set(k, m);
  }
  return m;
}

export function structFor(def, mapId, flat = false) {
  // fix36 โหมด 2D: ทุกแผนที่ใช้ภาพพิกเซลมุมหน้า (มีภาพแล้วเท่านั้น · ไม่มีก็คงโมเดลเดิม)
  if (flat) {
    if (def.kind === 'tent') return STRUCTS_2D['tent_' + mapId] ? 'tent_' + mapId : 'tent';
    if (def.sprite && (STRUCTS_2D[def.sprite] || STRUCTS[def.sprite])) return def.sprite;
    if (def.kind === 'house') return houseKey(def);
    if (STRUCTS_2D[def.kind] || STRUCTS[def.kind]) return def.kind;
    return null;
  }
  if (!STRUCT_MAPS[mapId]) return null;
  if (def.sprite && STRUCTS[def.sprite]) return def.sprite;
  if (def.kind === 'house') return houseKey(def);
  return STRUCTS[def.kind] ? def.kind : null;
}

export class StructureSprite {
  constructor(key, def, tint, unit = 0) {
    // fix36 โหมด 2D (unit) ใช้ภาพมุมหน้าขนาดใหญ่ถ้ามี · ไม่มีก็ใช้แถวหน้า (S) ของแผ่น 8 มุม
    const S = this.S = (unit && STRUCTS_2D[key]) || STRUCTS[key] || STRUCTS_2D[key];
    this.fw = S.fw || S.cell; this.fh = S.fh || S.cell;
    this.def = def;
    this.mat = atlasMat(S.src, tint);
    // ขนาด: กว้างเท่าฐานอาคารในแผนที่ (w ช่อง × 0.92) · ไม่มี w ใช้ขนาดพิกเซลเท่าตัวละคร
    const ww = S.ww || (def.w ? def.w * 0.92 : 0);
    const px = this.px = unit || (ww && S.cw ? ww / S.cw : PXW);   // fix36 unit = โหมด 2D ใช้ขนาดพิกเซลเดียวกับตัวละคร
    this.k = px / PXW;
    const gw = this.fw * px, gh = this.fh * px;
    const geo = new THREE.PlaneGeometry(gw, gh).translate(0, gh / 2 - (this.fh - S.foot) * px, 0);
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = true;
    this.mesh.userData.dynamic = true;
    this.group = new THREE.Group(); this.group.add(this.mesh);
    if (def.kind === 'sign' && def.text && S.rows === 1) this.addSignText(def.text, px, S.foot);
    this.turn = ((Math.round((def.rot || 0) / (Math.PI / 4)) % 8) + 8) % 8;
    this.row = -1;
    this._v = new THREE.Vector3();
  }

  // เรียกทุกเฟรม: หันหากล้อง · เลือกภาพตามมุม · ดันฐานไปทางกล้องครึ่งความลึก (ภาพฐานล่าง = มุมหน้าอาคาร)
  update(camera, yaw, cx, cz) {
    const step = ((Math.round(yaw / (Math.PI / 4)) - this.turn) % 8 + 8) % 8;
    const row = this.S.rows === 1 ? 0 : ROW[BY_YAW[step]];
    if (row !== this.row) { this.row = row; this.setRow(row); }
    const d = this.S.deep;
    this.mesh.position.set(Math.sin(yaw) * d, 0, Math.cos(yaw) * d);
    this.mesh.quaternion.copy(camera.quaternion);
  }

  // UV ของแผ่น = ช่อง (x0, row·fh) ขนาด fw×fh ในภาพรวม
  setRow(row) {
    const S = this.S, uv = this.mesh.geometry.attributes.uv;
    const u0 = S.x0 / S.W, u1 = (S.x0 + this.fw) / S.W, v1 = 1 - (row * this.fh) / S.H, v0 = 1 - ((row + 1) * this.fh) / S.H;
    // PlaneGeometry: (0,1) (1,1) (0,0) (1,0)
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true;
  }

  // fix36 ป้ายภาพพิกเซล: เขียนข้อความลงแผ่นป้าย (แผ่นป้ายในภาพ กว้าง 36 × สูง 20 พิกเซล · กลางป้ายสูงจากฐาน 33.5 พิกเซล)
  addSignText(text, px, foot) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    let fs = 64; g.font = `bold ${fs}px Kanit, system-ui, sans-serif`;
    while (fs > 18 && g.measureText(text).width > 236) { fs -= 4; g.font = `bold ${fs}px Kanit, system-ui, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, fs / 9); g.strokeStyle = 'rgba(255,236,200,0.55)'; g.strokeText(text, 128, 66);
    g.fillStyle = '#3a2210'; g.fillText(text, 128, 66);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 1;
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false });
    if (this.mat.color) m.color = this.mat.color;
    const w = 34 * px, h = 17 * px;
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    q.position.set(0, (foot - 19.5) * px, 0.01); q.renderOrder = 2; q.userData.dynamic = true;
    this.mesh.add(q); this.text = q;
  }

  dispose() { this.mesh.geometry.dispose(); if (this.text) { this.text.geometry.dispose(); this.text.material.map.dispose(); this.text.material.dispose(); } }
}
export { TURN };
